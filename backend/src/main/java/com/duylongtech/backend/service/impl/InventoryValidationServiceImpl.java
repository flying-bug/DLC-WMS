package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.service.*;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.ScanResolveRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.ScanResolveResponse;
import com.duylongtech.backend.entity.InventoryBalance;
import com.duylongtech.backend.entity.InventoryCostLayer;
import com.duylongtech.backend.entity.AssemblyBom;
import com.duylongtech.backend.entity.AssemblyOrder;
import com.duylongtech.backend.entity.AssemblyOrderSerial;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.InventoryDocumentLine;
import com.duylongtech.backend.entity.InventoryLedger;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.InventoryCostLayerRepository;
import com.duylongtech.backend.repository.InventoryDocumentLineRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.InventoryLedgerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.entity.SalesOrderLine;
import com.duylongtech.backend.entity.PurchaseOrder;
import com.duylongtech.backend.entity.PurchaseOrderLine;
import java.util.Map;
import com.duylongtech.backend.repository.UnitRepository;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.DeviceComponentSerialRepository;
import com.duylongtech.backend.repository.StocktakeRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.PurchaseOrderRepository;
import com.duylongtech.backend.repository.AssemblyOrderSerialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Optional;
import java.util.stream.Collectors;

import com.duylongtech.backend.mapper.InventoryDocumentMapper;

@Service
@RequiredArgsConstructor
public class InventoryValidationServiceImpl implements com.duylongtech.backend.service.InventoryValidationService {

    private final CodeGeneratorService codeGeneratorService;
    private final InventoryDocumentMapper inventoryDocumentMapper;

    private static final String EXPORT_DOC_TYPE = "EX_SO";
    private static final String IMPORT_DOC_TYPE = "IN_PO";
    private static final String DEFAULT_STATUS = DocumentStatus.DRAFT.name();
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), DocumentStatus.APPROVED.name(), DocumentStatus.POSTED.name(), DocumentStatus.CANCELLED.name(),
            "UNPOSTED");
    private static final Set<String> EDITABLE_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), "UNPOSTED");

    // PhÃƒÆ’Ã‚Â¢n loÃƒÂ¡Ã‚ÂºÃ‚Â¡i phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho thÃƒÂ¡Ã‚Â»Ã‚Â§ cÃƒÆ’Ã‚Â´ng (do ngÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âi dÃƒÆ’Ã‚Â¹ng tÃƒÂ¡Ã‚ÂºÃ‚Â¡o)
    public static final String ISSUE_PURPOSE_SALES = "SALES"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho bÃƒÆ’Ã‚Â¡n hÃƒÆ’Ã‚Â ng ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tÃƒÂ¡Ã‚Â»Ã‚Â± sinh bÃƒÂ¡Ã‚ÂºÃ‚Â£o hÃƒÆ’Ã‚Â nh
    public static final String ISSUE_PURPOSE_USAGE = "USAGE"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho sÃƒÂ¡Ã‚Â»Ã‚Â­ dÃƒÂ¡Ã‚Â»Ã‚Â¥ng nÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢i bÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â khÃƒÆ’Ã‚Â´ng sinh bÃƒÂ¡Ã‚ÂºÃ‚Â£o hÃƒÆ’Ã‚Â nh
    public static final String ISSUE_PURPOSE_ASSEMBLY = "ASSEMBLY"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho lÃƒÂ¡Ã‚ÂºÃ‚Â¯p rÃƒÆ’Ã‚Â¡p/thÃƒÆ’Ã‚Â¡o dÃƒÂ¡Ã‚Â»Ã‚Â¡

    // PhÃƒÆ’Ã‚Â¢n loÃƒÂ¡Ã‚ÂºÃ‚Â¡i phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t/nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho tÃƒÂ¡Ã‚Â»Ã‚Â± Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ng tÃƒÂ¡Ã‚Â»Ã‚Â« module ChuyÃƒÂ¡Ã‚Â»Ã†â€™n kho
    public static final String ISSUE_PURPOSE_TRANSFER_OUT = "TRANSFER_EXPORT"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho chuyÃƒÂ¡Ã‚Â»Ã†â€™n Ãƒâ€žÃ¢â‚¬Ëœi
    public static final String ISSUE_PURPOSE_TRANSFER_IN = "TRANSFER_IMPORT"; // NhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho tÃƒÂ¡Ã‚Â»Ã‚Â« chuyÃƒÂ¡Ã‚Â»Ã†â€™n vÃƒÂ¡Ã‚Â»Ã‚Â
    public static final String ISSUE_PURPOSE_INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT"; // XÃƒÂ¡Ã‚Â»Ã‚Â­ lÃƒÆ’Ã‚Â½ chÃƒÆ’Ã‚Âªnh lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ch kiÃƒÂ¡Ã‚Â»Ã†â€™m kÃƒÆ’Ã‚Âª

    // TÃƒÂ¡Ã‚ÂºÃ‚Â­p hÃƒÂ¡Ã‚Â»Ã‚Â£p cÃƒÆ’Ã‚Â¡c mÃƒÂ¡Ã‚Â»Ã‚Â¥c Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â­ch hÃƒÂ¡Ã‚Â»Ã‚Â£p lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ khi ngÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âi dÃƒÆ’Ã‚Â¹ng tÃƒÂ¡Ã‚ÂºÃ‚Â¡o phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t thÃƒÂ¡Ã‚Â»Ã‚Â§ cÃƒÆ’Ã‚Â´ng
    private static final Set<String> VALID_MANUAL_EXPORT_PURPOSES = Set.of(ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE,
            ISSUE_PURPOSE_ASSEMBLY);

    // TÃƒÂ¡Ã‚ÂºÃ‚Â­p hÃƒÂ¡Ã‚Â»Ã‚Â£p cÃƒÆ’Ã‚Â¡c mÃƒÂ¡Ã‚Â»Ã‚Â¥c Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â­ch hÃƒÂ¡Ã‚Â»Ã‚Â£p lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ toÃƒÆ’Ã‚Â n bÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ (bÃƒÂ¡Ã‚ÂºÃ‚Â¯t cÃƒÂ¡Ã‚ÂºÃ‚Â£ nÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢i bÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ vÃƒÆ’Ã‚Â  ngÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âi dÃƒÆ’Ã‚Â¹ng)
    private static final Set<String> VALID_ALL_EXPORT_PURPOSES = Set.of(
            ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE, ISSUE_PURPOSE_ASSEMBLY, ISSUE_PURPOSE_TRANSFER_OUT,
            ISSUE_PURPOSE_INVENTORY_ADJUSTMENT);

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryCostLayerRepository inventoryCostLayerRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final PartnerLedgerService partnerLedgerService;
    private final ProductVariantRepository productVariantRepository;
    private final WarrantyRepository warrantyRepository;
    private final WarrantyLifecycleService warrantyLifecycleService;
    private final PartnerRepository partnerRepository;
    private final AssemblyOrderSerialRepository assemblyOrderSerialRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final AssemblyBomRepository assemblyBomRepository;
    private final DeviceComponentSerialRepository deviceComponentSerialRepository;
    private final StocktakeRepository stocktakeRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final RepairRepository repairRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SalesOrderService salesOrderService;
    private final com.duylongtech.backend.repository.StockReservationRepository stockReservationRepository;
    private final com.duylongtech.backend.repository.WarehouseRepository warehouseRepository;
    private final UnitRepository unitRepository;
    private final AppNotificationService appNotificationService;
    private final DocumentDependencyService documentDependencyService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public void validateOrderLineQuantities(InventoryDocumentRequest req, Long excludeDocId) {
        Long soId = req.getSalesOrderId();
        if (soId == null && com.duylongtech.backend.enums.ReferenceType.SALES_ORDER.name().equalsIgnoreCase(trimToNull(req.getReferenceType()))) {
            soId = req.getReferenceId();
        }
        if (soId != null) {
            SalesOrder so = salesOrderRepository.findByIdWithDetails(soId).orElse(null);
            if (so != null && so.getLines() != null && req.getLines() != null) {
                Map<Long, BigDecimal> orderedMap = so.getLines().stream()
                        .collect(Collectors.toMap(SalesOrderLine::getVariantId, SalesOrderLine::getQuantity,
                                (a, b) -> a));
                for (InventoryDocumentLineRequest lineReq : req.getLines()) {
                    if (lineReq.getVariantId() == null)
                        continue;
                    BigDecimal orderedQty = orderedMap.get(lineReq.getVariantId());
                    if (orderedQty != null) {
                        BigDecimal exportedAlready = inventoryDocumentLineRepository
                                .sumExportedQuantityBySalesOrderIdAndVariantIdExcludingDoc(so.getId(),
                                        lineReq.getVariantId(), excludeDocId);
                        if (exportedAlready == null)
                            exportedAlready = ZERO;
                        BigDecimal remaining = orderedQty.subtract(exportedAlready);
                        if (remaining.compareTo(ZERO) < 0)
                            remaining = ZERO;

                        BigDecimal qtyOut = lineReq.getQuantityOut() != null ? lineReq.getQuantityOut() : ZERO;
                        if (qtyOut.compareTo(remaining) > 0) {
                            ProductVariant pv = productVariantRepository.findById(lineReq.getVariantId()).orElse(null);
                            String skuName = pv != null ? pv.getSku() : String.valueOf(lineReq.getVariantId());
                            throw new BusinessException(String.format(SystemMessage.INV_ERR_048.getMessage(), qtyOut,
                                    so.getSoCode(), remaining, skuName));
                        }
                    }
                }
            }
        }

        Long poId = req.getPurchaseOrderId();
        if (poId == null && com.duylongtech.backend.enums.ReferenceType.PURCHASE_ORDER.name().equalsIgnoreCase(trimToNull(req.getReferenceType()))) {
            poId = req.getReferenceId();
        }
        if (poId != null) {
            PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(poId).orElse(null);
            if (po != null && po.getLines() != null && req.getLines() != null) {
                Map<Long, BigDecimal> orderedMap = po.getLines().stream()
                        .collect(Collectors.toMap(PurchaseOrderLine::getVariantId, PurchaseOrderLine::getQuantity,
                                (a, b) -> a));
                for (InventoryDocumentLineRequest lineReq : req.getLines()) {
                    if (lineReq.getVariantId() == null)
                        continue;
                    BigDecimal orderedQty = orderedMap.get(lineReq.getVariantId());
                    if (orderedQty != null) {
                        BigDecimal importedAlready = inventoryDocumentLineRepository
                                .sumImportedQuantityByPurchaseOrderIdAndVariantIdExcludingDoc(po.getId(),
                                        lineReq.getVariantId(), excludeDocId);
                        if (importedAlready == null)
                            importedAlready = ZERO;
                        BigDecimal remaining = orderedQty.subtract(importedAlready);
                        if (remaining.compareTo(ZERO) < 0)
                            remaining = ZERO;

                        BigDecimal qtyIn = lineReq.getQuantityIn() != null ? lineReq.getQuantityIn() : ZERO;
                        if (qtyIn.compareTo(remaining) > 0) {
                            ProductVariant pv = productVariantRepository.findById(lineReq.getVariantId()).orElse(null);
                            String skuName = pv != null ? pv.getSku() : String.valueOf(lineReq.getVariantId());
                            throw new BusinessException(String.format(SystemMessage.INV_ERR_047.getMessage(), qtyIn,
                                    po.getPoCode(), remaining, skuName));
                        }
                    }
                }
            }
        }
    }

    public void ensureSerialNotInstalledInPc(SerialNumber serial) {
        if (serial == null || serial.getVariantId() == null || trimToNull(serial.getSerialNumber()) == null) {
            return;
        }
        boolean installedInPc = deviceComponentSerialRepository.existsActiveComponentSerial(
                serial.getVariantId(), serial.getSerialNumber().trim());
        if (installedInPc) {
            throw new BusinessException(
                    String.format(SystemMessage.INV_ERR_036.getMessage(), serial.getSerialNumber()));
        }
    }

    public void ensureSerialNotInstalledInPc(SerialNumber serial, InventoryDocument doc) {
        if (isAssemblyDocument(doc)) {
            return;
        }
        ensureSerialNotInstalledInPc(serial);
    }

    public boolean isAssemblyDocument(InventoryDocument doc) {
        if (doc == null) {
            return false;
        }
        return ISSUE_PURPOSE_ASSEMBLY.equals(doc.getIssuePurpose())
                || com.duylongtech.backend.enums.ReferenceType.ASSEMBLY_ORDER.name().equalsIgnoreCase(trimToNull(doc.getReferenceType()));
    }

    public void validateCreateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException(SystemMessage.INV_ERR_020.getMessage());
        }
    }

    public void validateUpdateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
    }

    public void validateCreateImportRequest(InventoryDocumentRequest req) {
        validateRequiredImportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException(SystemMessage.INV_ERR_020.getMessage());
        }
    }

    public void validateUpdateImportRequest(InventoryDocumentRequest req) {
        validateRequiredImportFields(req);
    }

    public void validateRequiredExportFields(InventoryDocumentRequest req) {
        validateCommonRequiredFields(req, "xuat", true);
    }

    public void validateRequiredImportFields(InventoryDocumentRequest req) {
        validateCommonRequiredFields(req, "nhap", false);
    }

    public void validateCommonRequiredFields(InventoryDocumentRequest req, String label, boolean exportDocument) {
        if (req == null) {
            throw new BusinessException(String.format(SystemMessage.INV_ERR_019.getMessage(), label));
        }
        if (req.getDocDate() == null) {
            throw new BusinessException(SystemMessage.INV_ERR_017.getMessage());
        }
        if (req.getLines() == null || req.getLines().isEmpty()) {
            throw new BusinessException(String.format(SystemMessage.INV_ERR_016.getMessage(), label));
        }
        if (req.getWarehouseId() == null) {
            Long firstWh = req.getLines().stream()
                    .map(InventoryDocumentLineRequest::getWarehouseId)
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            if (firstWh != null) {
                req.setWarehouseId(firstWh);
            }
        }
        for (int i = 0; i < req.getLines().size(); i++) {
            InventoryDocumentLineRequest line = req.getLines().get(i);
            if (line == null || line.getVariantId() == null) {
                throw new BusinessException(String.format(SystemMessage.INV_ERR_015.getMessage(), i));
            }
            if (line.getWarehouseId() == null && req.getWarehouseId() == null) {
                throw new BusinessException(
                        String.format("DÃƒÆ’Ã‚Â²ng %d: Vui lÃƒÆ’Ã‚Â²ng chÃƒÂ¡Ã‚Â»Ã‚Ân kho %s", (i + 1), exportDocument ? "xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t" : "nhÃƒÂ¡Ã‚ÂºÃ‚Â­p"));
            }
            if (exportDocument) {
                requirePositive(line.getQuantityOut(), "lines[" + i + "].quantityOut");
            } else {
                requirePositive(line.getQuantityIn(), "lines[" + i + "].quantityIn");
            }
        }
    }

    public void ensureEditable(InventoryDocument doc) {
        String status = normalizeStatusValue(doc.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException(SystemMessage.INV_ERR_014.getMessage());
        }
    }

    public void validateExportInventoryBalance(Long warehouseId, Long salesOrderId, String referenceType,
            Long referenceId, List<InventoryDocumentLineRequest> lines) {
        if (lines == null || lines.isEmpty())
            return;

        Long effectiveSalesOrderId = salesOrderId;
        if (effectiveSalesOrderId == null && (com.duylongtech.backend.enums.ReferenceType.SALES_ORDER.name().equalsIgnoreCase(trimToNull(referenceType))
                || com.duylongtech.backend.enums.ReferenceType.SALES_ORDER.name().equalsIgnoreCase(trimToNull(referenceType)))) {
            effectiveSalesOrderId = referenceId;
        }

        for (int i = 0; i < lines.size(); i++) {
            InventoryDocumentLineRequest line = lines.get(i);
            if (line.getVariantId() == null || line.getQuantityOut() == null)
                continue;

            Long effectiveWh = line.getWarehouseId() != null ? line.getWarehouseId() : warehouseId;
            if (effectiveWh == null)
                continue;

            BigDecimal qtyToExport = line.getQuantityOut();
            BigDecimal totalAvailable = inventoryBalanceRepository
                    .sumAvailableQuantityByWarehouseAndVariant(effectiveWh, line.getVariantId(), "GOOD");
            if (totalAvailable == null) {
                totalAvailable = BigDecimal.ZERO;
            }

            if (effectiveSalesOrderId != null) {
                BigDecimal reservedForThisOrder = stockReservationRepository
                        .sumHoldingQuantityBySalesOrderIdAndVariantAndWarehouse(effectiveSalesOrderId,
                                line.getVariantId(), effectiveWh);
                if (reservedForThisOrder != null) {
                    totalAvailable = totalAvailable.add(reservedForThisOrder);
                }
            }

            if (totalAvailable.compareTo(qtyToExport) < 0) {
                throw new BusinessException(SystemMessage.INV_ERR_013.getMessage());
            }
        }
    }

    private BigDecimal requirePositive(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(ZERO) <= 0) {
            throw new BusinessException(fieldName + " phÃƒÂ¡Ã‚ÂºÃ‚Â£i lÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºn hÃƒâ€ Ã‚Â¡n 0");
        }
        return value;
    }

    private String normalizeStatusValue(String status, String fallback) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            normalized = fallback;
        }
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_STATUSES.contains(normalized)) {
            throw new BusinessException(SystemMessage.INV_ERR_003.getMessage());
        }
        return normalized;
    }

    public com.duylongtech.backend.dto.response.DependencyCheckResponse checkImportUnpostable(Long id) {
        return documentDependencyService.checkImportSlipUnpostable(id);
    }

    public com.duylongtech.backend.dto.response.DependencyCheckResponse checkExportUnpostable(Long id) {
        return documentDependencyService.checkExportSlipUnpostable(id);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}