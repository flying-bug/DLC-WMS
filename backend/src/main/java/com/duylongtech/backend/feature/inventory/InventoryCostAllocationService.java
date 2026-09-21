package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryCostAllocationService {
    public static final String HOLDING = "HOLDING";
    public static final String CONSUMED = "CONSUMED";
    public static final String RELEASED = "RELEASED";
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final InventoryCostLayerRepository costLayerRepository;
    private final InventoryCostAllocationRepository allocationRepository;
    private final InventoryBalanceRepository balanceRepository;
    private final InventoryDocumentLineRepository lineRepository;

    public boolean hasActiveAllocations(InventoryDocument document) {
        List<Long> lineIds = document.getLines().stream().map(InventoryDocumentLine::getId).toList();
        return !lineIds.isEmpty() && allocationRepository.existsActiveByLineIds(lineIds);
    }

    /** Reserves both available stock and the exact FIFO layers for an approved order. */
    public void reserveDocument(InventoryDocument document) {
        List<InventoryDocumentLine> orderedLines = document.getLines().stream()
                .sorted(java.util.Comparator
                        .comparing((InventoryDocumentLine line) -> effectiveWarehouse(document, line))
                        .thenComparing(InventoryDocumentLine::getVariantId)
                        .thenComparing(InventoryDocumentLine::getId))
                .toList();
        for (InventoryDocumentLine line : orderedLines) {
            BigDecimal quantity = exportQuantity(line);
            Long warehouseId = effectiveWarehouse(document, line);
            InventoryBalance balance = balanceRepository
                    .findByWarehouseAndVariantForUpdate(warehouseId, line.getVariantId(), "GOOD")
                    .orElseThrow(() -> insufficientStock(line.getVariantId()));
            BigDecimal reserved = value(balance.getQuantityReserved());
            if (value(balance.getQuantityOnHand()).subtract(reserved).compareTo(quantity) < 0) {
                throw insufficientStock(line.getVariantId());
            }

            BigDecimal totalCost = allocate(line, warehouseId, quantity, HOLDING, true);
            balance.setQuantityReserved(reserved.add(quantity));
            balance.setUpdatedAt(LocalDateTime.now());
            balanceRepository.save(balance);
            setLineCost(line, totalCost, quantity);
        }
        lineRepository.saveAll(document.getLines());
    }

    /** Uses a held FIFO snapshot, or allocates current FIFO for ordinary exports. */
    public BigDecimal consumeForPosting(InventoryDocument document, InventoryDocumentLine line,
                                        BigDecimal quantity, boolean reservationRequired) {
        List<InventoryCostAllocation> held = allocationRepository
                .findByLineAndStatusForUpdate(line.getId(), HOLDING);
        if (held.isEmpty()) {
            if (reservationRequired) {
                throw new BusinessException("Phiếu xuất của lệnh chưa có lớp giá FIFO được giữ chỗ");
            }
            return allocate(line, effectiveWarehouse(document, line), quantity, CONSUMED, false);
        }

        BigDecimal allocated = held.stream().map(InventoryCostAllocation::getQuantity)
                .reduce(ZERO, BigDecimal::add);
        if (allocated.compareTo(quantity) != 0) {
            throw new BusinessException("Số lượng lớp giá FIFO giữ chỗ không khớp với phiếu xuất");
        }

        BigDecimal totalCost = ZERO;
        for (InventoryCostAllocation allocation : held) {
            InventoryCostLayer layer = lockedLayer(allocation.getCostLayerId());
            if (value(layer.getQuantityLayered()).compareTo(allocation.getQuantity()) < 0
                    || value(layer.getQuantityReserved()).compareTo(allocation.getQuantity()) < 0) {
                throw new BusinessException("Lớp giá FIFO giữ chỗ không còn hợp lệ");
            }
            layer.setQuantityLayered(layer.getQuantityLayered().subtract(allocation.getQuantity()));
            layer.setQuantityReserved(layer.getQuantityReserved().subtract(allocation.getQuantity()));
            costLayerRepository.save(layer);
            allocation.changeStatus(CONSUMED);
            totalCost = totalCost.add(allocation.getQuantity().multiply(allocation.getUnitCost()));
        }
        allocationRepository.saveAll(held);

        InventoryBalance balance = lockedBalance(document, line);
        balance.setQuantityReserved(value(balance.getQuantityReserved()).subtract(quantity).max(ZERO));
        balance.setUpdatedAt(LocalDateTime.now());
        balanceRepository.save(balance);
        return totalCost;
    }

    public void releaseDocument(InventoryDocument document) {
        List<Long> lineIds = document.getLines().stream().map(InventoryDocumentLine::getId).toList();
        if (lineIds.isEmpty()) return;
        List<InventoryCostAllocation> held = allocationRepository
                .findByLinesAndStatusForUpdate(lineIds, HOLDING);
        for (InventoryDocumentLine line : document.getLines()) {
            BigDecimal released = held.stream()
                    .filter(a -> a.getInventoryDocumentLineId().equals(line.getId()))
                    .map(InventoryCostAllocation::getQuantity).reduce(ZERO, BigDecimal::add);
            if (released.compareTo(ZERO) > 0) {
                InventoryBalance balance = lockedBalance(document, line);
                balance.setQuantityReserved(value(balance.getQuantityReserved()).subtract(released).max(ZERO));
                balance.setUpdatedAt(LocalDateTime.now());
                balanceRepository.save(balance);
            }
        }
        for (InventoryCostAllocation allocation : held) {
            InventoryCostLayer layer = lockedLayer(allocation.getCostLayerId());
            layer.setQuantityReserved(value(layer.getQuantityReserved()).subtract(allocation.getQuantity()).max(ZERO));
            costLayerRepository.save(layer);
            allocation.changeStatus(RELEASED);
        }
        allocationRepository.saveAll(held);
    }

    /** Restores the exact consumed layers. Assembly exports remain reserved for repost. */
    public void restoreAfterUnpost(InventoryDocument document, InventoryDocumentLine line, boolean keepReserved) {
        List<InventoryCostAllocation> consumed = allocationRepository
                .findByLineAndStatusForUpdate(line.getId(), CONSUMED);
        BigDecimal restored = ZERO;
        for (InventoryCostAllocation allocation : consumed) {
            InventoryCostLayer layer = lockedLayer(allocation.getCostLayerId());
            layer.setQuantityLayered(value(layer.getQuantityLayered()).add(allocation.getQuantity()));
            if (keepReserved) {
                layer.setQuantityReserved(value(layer.getQuantityReserved()).add(allocation.getQuantity()));
                allocation.changeStatus(HOLDING);
            } else {
                allocation.changeStatus(RELEASED);
            }
            costLayerRepository.save(layer);
            restored = restored.add(allocation.getQuantity());
        }
        allocationRepository.saveAll(consumed);
        if (keepReserved && restored.compareTo(ZERO) > 0) {
            InventoryBalance balance = lockedBalance(document, line);
            balance.setQuantityReserved(value(balance.getQuantityReserved()).add(restored));
            balance.setUpdatedAt(LocalDateTime.now());
            balanceRepository.save(balance);
        }
    }

    private BigDecimal allocate(InventoryDocumentLine line, Long warehouseId, BigDecimal quantity,
                                String status, boolean reserveLayer) {
        BigDecimal remaining = quantity;
        BigDecimal totalCost = ZERO;
        List<InventoryCostAllocation> allocations = new ArrayList<>();
        for (InventoryCostLayer layer : costLayerRepository
                .findAvailableLayersForUpdate(warehouseId, line.getVariantId())) {
            if (remaining.compareTo(ZERO) <= 0) break;
            BigDecimal available = value(layer.getQuantityLayered()).subtract(value(layer.getQuantityReserved()));
            if (available.compareTo(ZERO) <= 0) continue;
            BigDecimal taken = remaining.min(available);
            InventoryCostAllocation allocation = new InventoryCostAllocation();
            allocation.init(line.getId(), layer, taken, status);
            allocations.add(allocation);
            totalCost = totalCost.add(taken.multiply(layer.getUnitCost()));
            if (reserveLayer) {
                layer.setQuantityReserved(value(layer.getQuantityReserved()).add(taken));
            } else {
                layer.setQuantityLayered(layer.getQuantityLayered().subtract(taken));
            }
            costLayerRepository.save(layer);
            remaining = remaining.subtract(taken);
        }
        if (remaining.compareTo(ZERO) > 0) {
            throw insufficientStock(line.getVariantId());
        }
        allocationRepository.saveAll(allocations);
        return totalCost;
    }

    private InventoryCostLayer lockedLayer(Long id) {
        return costLayerRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lớp giá FIFO " + id));
    }

    private InventoryBalance lockedBalance(InventoryDocument document, InventoryDocumentLine line) {
        return balanceRepository.findByWarehouseAndVariantForUpdate(
                        effectiveWarehouse(document, line), line.getVariantId(), "GOOD")
                .orElseThrow(() -> insufficientStock(line.getVariantId()));
    }

    private Long effectiveWarehouse(InventoryDocument document, InventoryDocumentLine line) {
        Long id = line.getWarehouseId() != null ? line.getWarehouseId() : document.getWarehouseId();
        if (id == null) throw new BusinessException("Dòng sản phẩm chưa có kho xuất");
        return id;
    }

    private BigDecimal exportQuantity(InventoryDocumentLine line) {
        BigDecimal quantity = line.getBaseQuantity() != null && line.getBaseQuantity().compareTo(ZERO) > 0
                ? line.getBaseQuantity() : line.getQuantityOut();
        if (quantity == null || quantity.compareTo(ZERO) <= 0) {
            throw new BusinessException("Số lượng xuất phải lớn hơn 0");
        }
        return quantity;
    }

    private void setLineCost(InventoryDocumentLine line, BigDecimal totalCost, BigDecimal quantity) {
        BigDecimal unitCost = totalCost.divide(quantity, 4, RoundingMode.HALF_UP);
        line.setUnitCost(unitCost);
        line.setUnitPrice(unitCost);
        line.calculateExportAmounts();
    }

    private BigDecimal value(BigDecimal value) {
        return value != null ? value : ZERO;
    }

    private BusinessException insufficientStock(Long variantId) {
        return new BusinessException("Không đủ tồn khả dụng hoặc lớp giá FIFO cho sản phẩm " + variantId);
    }
}
