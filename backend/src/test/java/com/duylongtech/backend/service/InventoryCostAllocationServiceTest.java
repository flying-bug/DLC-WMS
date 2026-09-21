package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.inventory.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class InventoryCostAllocationServiceTest {
    private final InventoryCostLayerRepository layerRepository = mock(InventoryCostLayerRepository.class);
    private final InventoryCostAllocationRepository allocationRepository = mock(InventoryCostAllocationRepository.class);
    private final InventoryBalanceRepository balanceRepository = mock(InventoryBalanceRepository.class);
    private final InventoryDocumentLineRepository lineRepository = mock(InventoryDocumentLineRepository.class);
    private final InventoryCostAllocationService service = new InventoryCostAllocationService(
            layerRepository, allocationRepository, balanceRepository, lineRepository);

    @Test
    void reserveDocumentLocksQuantityAndExactFifoLayers() {
        InventoryDocument document = documentWithLine("15");
        InventoryDocumentLine line = document.getLines().get(0);
        InventoryBalance balance = balance("20", "0");
        InventoryCostLayer first = layer(1L, "10", "100000");
        InventoryCostLayer second = layer(2L, "10", "200000");

        when(balanceRepository.findByWarehouseAndVariantForUpdate(1L, 10L, "GOOD"))
                .thenReturn(Optional.of(balance));
        when(layerRepository.findAvailableLayersForUpdate(1L, 10L))
                .thenReturn(List.of(first, second));

        service.reserveDocument(document);

        assertEquals(new BigDecimal("15"), balance.getQuantityReserved());
        assertEquals(new BigDecimal("10"), first.getQuantityReserved());
        assertEquals(new BigDecimal("5"), second.getQuantityReserved());
        assertEquals(new BigDecimal("133333.3333"), line.getUnitCost());
        verify(allocationRepository).saveAll(anyList());
    }

    @Test
    void postingConsumesThePreviouslyHeldCostWithoutRecalculation() {
        InventoryDocument document = documentWithLine("15");
        InventoryDocumentLine line = document.getLines().get(0);
        InventoryBalance balance = balance("20", "15");
        InventoryCostLayer first = layer(1L, "10", "100000");
        InventoryCostLayer second = layer(2L, "10", "200000");
        first.setQuantityReserved(new BigDecimal("10"));
        second.setQuantityReserved(new BigDecimal("5"));
        InventoryCostAllocation a1 = allocation(line.getId(), first, "10");
        InventoryCostAllocation a2 = allocation(line.getId(), second, "5");

        when(allocationRepository.findByLineAndStatusForUpdate(line.getId(), "HOLDING"))
                .thenReturn(List.of(a1, a2));
        when(layerRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(first));
        when(layerRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(second));
        when(balanceRepository.findByWarehouseAndVariantForUpdate(1L, 10L, "GOOD"))
                .thenReturn(Optional.of(balance));

        BigDecimal total = service.consumeForPosting(document, line, new BigDecimal("15"), true);

        assertEquals(new BigDecimal("2000000"), total);
        assertEquals(BigDecimal.ZERO, balance.getQuantityReserved());
        assertEquals(BigDecimal.ZERO, first.getQuantityLayered());
        assertEquals(new BigDecimal("5"), second.getQuantityLayered());
        assertEquals("CONSUMED", a1.getStatus());
        assertEquals("CONSUMED", a2.getStatus());
    }

    @Test
    void cancellingAnApprovedOrderReleasesQuantityAndCostLayers() {
        InventoryDocument document = documentWithLine("15");
        InventoryDocumentLine line = document.getLines().get(0);
        InventoryBalance balance = balance("20", "15");
        InventoryCostLayer first = layer(1L, "10", "100000");
        InventoryCostLayer second = layer(2L, "10", "200000");
        first.setQuantityReserved(new BigDecimal("10"));
        second.setQuantityReserved(new BigDecimal("5"));
        InventoryCostAllocation a1 = allocation(line.getId(), first, "10");
        InventoryCostAllocation a2 = allocation(line.getId(), second, "5");

        when(allocationRepository.findByLinesAndStatusForUpdate(List.of(line.getId()), "HOLDING"))
                .thenReturn(List.of(a1, a2));
        when(layerRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(first));
        when(layerRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(second));
        when(balanceRepository.findByWarehouseAndVariantForUpdate(1L, 10L, "GOOD"))
                .thenReturn(Optional.of(balance));

        service.releaseDocument(document);

        assertEquals(BigDecimal.ZERO, balance.getQuantityReserved());
        assertEquals(BigDecimal.ZERO, first.getQuantityReserved());
        assertEquals(BigDecimal.ZERO, second.getQuantityReserved());
        assertEquals("RELEASED", a1.getStatus());
        assertEquals("RELEASED", a2.getStatus());
    }

    private InventoryDocument documentWithLine(String quantity) {
        InventoryDocument document = new InventoryDocument();
        document.setId(50L);
        document.setWarehouseId(1L);
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setId(100L);
        line.setVariantId(10L);
        line.setQuantityOut(new BigDecimal(quantity));
        line.setBaseQuantity(new BigDecimal(quantity));
        line.setInventoryDocument(document);
        document.getLines().add(line);
        return document;
    }

    private InventoryBalance balance(String onHand, String reserved) {
        InventoryBalance balance = new InventoryBalance();
        balance.initBalance(1L, 10L, null, "GOOD", new BigDecimal(onHand),
                new BigDecimal(reserved), BigDecimal.ZERO);
        return balance;
    }

    private InventoryCostLayer layer(Long id, String quantity, String cost) {
        InventoryCostLayer layer = new InventoryCostLayer();
        layer.setId(id);
        layer.initCostLayer(1L, 10L, 999L, new BigDecimal(quantity),
                new BigDecimal(quantity), new BigDecimal(cost));
        layer.setCreatedAt(LocalDateTime.now());
        return layer;
    }

    private InventoryCostAllocation allocation(Long lineId, InventoryCostLayer layer, String quantity) {
        InventoryCostAllocation allocation = new InventoryCostAllocation();
        allocation.init(lineId, layer, new BigDecimal(quantity), "HOLDING");
        return allocation;
    }
}
