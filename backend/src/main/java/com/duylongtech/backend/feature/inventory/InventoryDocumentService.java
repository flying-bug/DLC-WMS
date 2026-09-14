package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.SerialNumberStatus;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.ScanResolveRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.ScanResolveResponse;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryCostLayer;
import com.duylongtech.backend.feature.assembly.AssemblyBom;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerial;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryLedger;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderLine;
import java.util.Map;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
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

import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.assembly.AssemblyBom;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerial;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.DependencyCheckResponse;
import com.duylongtech.backend.feature.inventory.DocumentDependencyService;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayer;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.InventoryLedger;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.inventory.InventoryPostingService;
import com.duylongtech.backend.feature.inventory.InventoryValidationService;
import com.duylongtech.backend.feature.inventory.ScanResolveRequest;
import com.duylongtech.backend.feature.inventory.ScanResolveResponse;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderLine;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderService;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warranty.WarrantyLifecycleService;
import com.duylongtech.backend.feature.warranty.WarrantyLineRequest;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;

@Service
@RequiredArgsConstructor
public class InventoryDocumentService {

    private final CodeGeneratorService codeGeneratorService;
    private final InventoryDocumentMapper inventoryDocumentMapper;

    private static final String EXPORT_DOC_TYPE = "EX_SO";
    private static final String IMPORT_DOC_TYPE = "IN_PO";
    private static final String DEFAULT_STATUS = DocumentStatus.DRAFT.name();
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(),
            DocumentStatus.APPROVED.name(), DocumentStatus.POSTED.name(), DocumentStatus.CANCELLED.name(), DocumentStatus.UNPOSTED.name());
    private static final Set<String> EDITABLE_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), DocumentStatus.UNPOSTED.name());

    // Phân loại phiếu xuất kho thủ công (do người dùng tạo)
    public static final String ISSUE_PURPOSE_SALES = "SALES"; // Xuất kho bán hàng — tự sinh bảo hành
    public static final String ISSUE_PURPOSE_USAGE = "USAGE"; // Xuất kho sử dụng nội bộ — không sinh bảo hành
    public static final String ISSUE_PURPOSE_ASSEMBLY = "ASSEMBLY"; // Xuất kho lắp ráp/tháo dỡ

    // Phân loại phiếu xuất/nhập kho tự động từ module Chuyển kho
    public static final String ISSUE_PURPOSE_TRANSFER_OUT = "TRANSFER_EXPORT"; // Xuất kho chuyển đi
    public static final String ISSUE_PURPOSE_TRANSFER_IN = "TRANSFER_IMPORT"; // Nhập kho từ chuyển về
    public static final String ISSUE_PURPOSE_INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT"; // Xử lý chênh lệch kiểm kê

    // Tập hợp các mục đích hợp lệ khi người dùng tạo phiếu xuất thủ công
    private static final Set<String> VALID_MANUAL_EXPORT_PURPOSES = Set.of(ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE,
            ISSUE_PURPOSE_ASSEMBLY);

    // Tập hợp các mục đích hợp lệ toàn bộ (bắt cả nội bộ và người dùng)
    private static final Set<String> VALID_ALL_EXPORT_PURPOSES = Set.of(
            ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE, ISSUE_PURPOSE_ASSEMBLY, ISSUE_PURPOSE_TRANSFER_OUT,
            ISSUE_PURPOSE_INVENTORY_ADJUSTMENT);

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryCostLayerRepository inventoryCostLayerRepository;
    private final InventoryValidationService inventoryValidationService;
    private final InventoryPostingService inventoryPostingService;
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
    private final com.duylongtech.backend.feature.inventory.StockReservationRepository stockReservationRepository;
    private final com.duylongtech.backend.feature.warehouse.WarehouseRepository warehouseRepository;
    private final UnitRepository unitRepository;
    private final AppNotificationService appNotificationService;
    private final DocumentDependencyService documentDependencyService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public ScanResolveResponse resolveExportScan(ScanResolveRequest req) {
        String code = trimToNull(req != null ? req.getCode() : null);
        if (code == null) {
            throw new BusinessException(SystemMessage.INV_ERR_035.getMessage());
        }
        if (req.getWarehouseId() == null) {
            throw new BusinessException(SystemMessage.INV_ERR_018.getMessage());
        }

        List<SerialNumber> serials = serialNumberRepository.findBySerialNumber(code);
        if (req.getVariantId() != null) {
            serials = serials.stream().filter(s -> s.getVariantId().equals(req.getVariantId()))
                    .collect(Collectors.toList());
        }
        if (serials.size() > 1) {
            throw new BusinessException(SystemMessage.INV_ERR_049.getMessage());
        }
        if (serials.size() == 1) {
            return resolveSerialScan(serials.get(0), req.getWarehouseId(), code);
        }
        return resolveVariantScan(code);
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getExportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId) {
        return getExportHistory(keyword, fromDate, toDate, status, warehouseId, issuePurpose, referenceType,
                referenceId, null, null);
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getExportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId,
            Long partnerId, Long salespersonId) {
        String normalizedKeyword = trimToNull(keyword);
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedIssuePurpose = normalizeOptionalReference(issuePurpose);
        String normalizedReferenceType = normalizeOptionalReference(referenceType);
        boolean noFilters = normalizedKeyword == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null && normalizedIssuePurpose == null && normalizedReferenceType == null
                && referenceId == null && partnerId == null && salespersonId == null;
        List<InventoryDocument> docs = noFilters
                ? inventoryDocumentRepository.findAllExports()
                : inventoryDocumentRepository.searchExports(normalizedKeyword, fromDate, toDate, normalizedStatus,
                        warehouseId, normalizedIssuePurpose, normalizedReferenceType, referenceId, partnerId,
                        salespersonId);
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getExportDetail(Long id) {
        return toResponse(findExportOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getImportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId) {
        return getImportHistory(keyword, fromDate, toDate, status, warehouseId, issuePurpose, referenceType,
                referenceId, null, null);
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getImportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId,
            Long partnerId, Long salespersonId) {
        String normalizedKeyword = trimToNull(keyword);
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedIssuePurpose = normalizeOptionalReference(issuePurpose);
        String normalizedReferenceType = normalizeOptionalReference(referenceType);
        boolean noFilters = normalizedKeyword == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null && normalizedIssuePurpose == null && normalizedReferenceType == null
                && referenceId == null && partnerId == null && salespersonId == null;
        List<InventoryDocument> docs = noFilters
                ? inventoryDocumentRepository.findAllImports()
                : inventoryDocumentRepository.searchImports(normalizedKeyword, fromDate, toDate, normalizedStatus,
                        warehouseId, normalizedIssuePurpose, normalizedReferenceType, referenceId, partnerId,
                        salespersonId);
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getImportDetail(Long id) {
        return toResponse(findImportOrThrow(id));
    }

    @Transactional
    public InventoryDocumentResponse createExport(InventoryDocumentRequest req) {
        validateCreateRequest(req);
        inventoryValidationService.validateOrderLineQuantities(req, null);
        inventoryValidationService.validateExportInventoryBalance(req.getWarehouseId(), req.getSalesOrderId(), req.getReferenceType(),
                req.getReferenceId(), req.getLines());
        InventoryDocument doc = buildBaseDocument(req, EXPORT_DOC_TYPE, resolveCreateDocCode(req.getDocCode()));
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.addExportLine(toExportLineEntity(doc, req.getLines().get(i), i));
        }
        InventoryDocument saved = inventoryDocumentRepository.save(doc);
        syncStocktakeReference(saved);
        return toResponse(saved);
    }

    @Transactional
    public InventoryDocumentResponse createImport(InventoryDocumentRequest req) {
        validateCreateImportRequest(req);
        inventoryValidationService.validateOrderLineQuantities(req, null);
        InventoryDocument doc = buildBaseDocument(req, IMPORT_DOC_TYPE, resolveCreateImportDocCode(req.getDocCode()));
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.addImportLine(toImportLineEntity(doc, req.getLines().get(i), i));
        }
        InventoryDocument saved = inventoryDocumentRepository.save(doc);
        syncStocktakeReference(saved);
        return toResponse(saved);
    }

    private void syncStocktakeReference(InventoryDocument doc) {
        if ("STOCKTAKE".equals(doc.getReferenceType()) && doc.getReferenceId() != null) {
            stocktakeRepository.findById(doc.getReferenceId()).ifPresent(stocktake -> {
                if (IMPORT_DOC_TYPE.equals(doc.getDocType())) {
                    stocktake.setReferenceImportId(doc.getId());
                } else if (EXPORT_DOC_TYPE.equals(doc.getDocType())) {
                    stocktake.setReferenceExportId(doc.getId());
                }

                if (DocumentStatus.POSTED.name().equals(doc.getStatus())) {
                    boolean hasSurplus = stocktake.getLines().stream()
                            .anyMatch(l -> l.getDiffQty() != null && l.getDiffQty().compareTo(BigDecimal.ZERO) > 0);
                    boolean hasShortage = stocktake.getLines().stream()
                            .anyMatch(l -> l.getDiffQty() != null && l.getDiffQty().compareTo(BigDecimal.ZERO) < 0);

                    boolean importDone = !hasSurplus || stocktake.getReferenceImportId() != null;
                    boolean exportDone = !hasShortage || stocktake.getReferenceExportId() != null;

                    if (importDone && exportDone) {
                        stocktake.markAsPosted();
                    }
                }
                stocktakeRepository.save(stocktake);
            });
        }
    }

    @Transactional
    public InventoryDocumentResponse updateExport(Long id, InventoryDocumentRequest req) {
        validateUpdateRequest(req);
        inventoryValidationService.validateOrderLineQuantities(req, id);
        inventoryValidationService.validateExportInventoryBalance(req.getWarehouseId(), req.getSalesOrderId(), req.getReferenceType(),
                req.getReferenceId(), req.getLines());
        InventoryDocument doc = findExportOrThrow(id);
        ensureEditable(doc);
        updateBaseDocument(id, doc, req, "Mã phiếu xuất kho đã tồn tại", false);
        doc.clearLines();
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.addExportLine(toExportLineEntity(doc, req.getLines().get(i), i));
        }
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional
    public InventoryDocumentResponse updateImport(Long id, InventoryDocumentRequest req) {
        inventoryValidationService.validateUpdateImportRequest(req);
        inventoryValidationService.validateOrderLineQuantities(req, id);
        InventoryDocument doc = findImportOrThrow(id);
        ensureEditable(doc);
        updateBaseDocument(id, doc, req, "Mã phiếu nhập kho đã tồn tại", true);
        doc.clearLines();
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.addImportLine(toImportLineEntity(doc, req.getLines().get(i), i));
        }
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse postExport(Long id) {
        return inventoryPostingService.postExport(id);
    }

    public InventoryDocumentResponse postImport(Long id) {
        return inventoryPostingService.postImport(id);
    }

    private InventoryDocument buildBaseDocument(InventoryDocumentRequest req, String docType, String docCode) {
        String issuePurpose = normalizeOptionalReference(req.getIssuePurpose());
        if (issuePurpose != null && EXPORT_DOC_TYPE.equals(docType)) {
            // Kiểm tra issuePurpose có thuộc danh sách hợp lệ toàn bộ không
            // (bao gồm cả TRANSFER_EXPORT được dùng nội bộ bởi module Chuyển kho)
            if (!VALID_ALL_EXPORT_PURPOSES.contains(issuePurpose)) {
                throw new BusinessException(SystemMessage.INV_ERR_039.getMessage());
            }
        }

        Long soId = req.getSalesOrderId();
        if (soId == null && ("SALES_ORDER".equalsIgnoreCase(trimToNull(req.getReferenceType()))
                || "SO".equalsIgnoreCase(trimToNull(req.getReferenceType())))) {
            soId = req.getReferenceId();
        }
        Long poId = req.getPurchaseOrderId();
        if (poId == null && ("PURCHASE_ORDER".equalsIgnoreCase(trimToNull(req.getReferenceType()))
                || "PO".equalsIgnoreCase(trimToNull(req.getReferenceType())))) {
            poId = req.getReferenceId();
        }

        InventoryDocument doc = new InventoryDocument();
        if (EXPORT_DOC_TYPE.equals(docType)) {
            doc.initExportDocument(docCode);
        } else {
            doc.initImportDocument(docCode);
        }
        doc.setIssuePurpose(normalizeOptionalReference(req.getIssuePurpose()));
        doc.setReferenceType(normalizeOptionalReference(req.getReferenceType()));
        doc.setReferenceId(req.getReferenceId());
        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(poId);
        doc.setSalesOrderId(soId);
        doc.setPartnerId(req.getPartnerId());
        doc.setDocDate(req.getDocDate());
        doc.updateStatus(normalizeEditableStatus(req.getStatus(), DEFAULT_STATUS));
        doc.setNote(req.getNote());
        doc.assignCreator(req.getCreatedBy());
        doc.setRecipientName(req.getRecipientName());
        doc.setRecipientAddress(req.getRecipientAddress());
        doc.setSalespersonId(req.getSalespersonId());
        doc.setCreatedAt(LocalDateTime.now());
        doc.setUpdatedAt(LocalDateTime.now());
        return doc;
    }

    private void updateBaseDocument(Long id, InventoryDocument doc, InventoryDocumentRequest req,
            String duplicateMessage,
            boolean importDocument) {
        String issuePurpose = normalizeOptionalReference(req.getIssuePurpose());
        if (issuePurpose != null && !importDocument) {
            // Khi cập nhật phiếu, cũng chỉ cho phép 2 mục đích thủ công
            if (!VALID_MANUAL_EXPORT_PURPOSES.contains(issuePurpose)) {
                throw new BusinessException(SystemMessage.INV_ERR_039.getMessage());
            }
        }

        String requestedCode = trimToNull(req.getDocCode());
        if (requestedCode != null && !requestedCode.equals(doc.getDocCode())) {
            if (inventoryDocumentRepository.existsByDocCodeAndIdNot(requestedCode, id)) {
                throw new BusinessException(duplicateMessage);
            }
            doc.updateCode(requestedCode);
        }
        Long soId = req.getSalesOrderId();
        if (soId == null && ("SALES_ORDER".equalsIgnoreCase(trimToNull(req.getReferenceType()))
                || "SO".equalsIgnoreCase(trimToNull(req.getReferenceType())))) {
            soId = req.getReferenceId();
        }
        Long poId = req.getPurchaseOrderId();
        if (poId == null && ("PURCHASE_ORDER".equalsIgnoreCase(trimToNull(req.getReferenceType()))
                || "PO".equalsIgnoreCase(trimToNull(req.getReferenceType())))) {
            poId = req.getReferenceId();
        }

        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(poId);
        doc.setSalesOrderId(soId);
        doc.setPartnerId(req.getPartnerId());
        doc.setIssuePurpose(normalizeOptionalReference(req.getIssuePurpose()));
        doc.setReferenceType(normalizeOptionalReference(req.getReferenceType()));
        doc.setReferenceId(req.getReferenceId());
        doc.setDocDate(req.getDocDate());
        doc.updateStatus(importDocument
                ? normalizeEditableImportStatus(req.getStatus(), doc.getStatus())
                : normalizeEditableStatus(req.getStatus(), doc.getStatus()));
        doc.setNote(req.getNote());
        doc.setRecipientName(req.getRecipientName());
        doc.setRecipientAddress(req.getRecipientAddress());
        doc.setSalespersonId(req.getSalespersonId());
        doc.setUpdatedAt(LocalDateTime.now());
    }

    private ScanResolveResponse resolveSerialScan(SerialNumber serial, Long warehouseId, String code) {
        if (!SerialNumberStatus.AVAILABLE.name().equalsIgnoreCase(serial.getStatus())) {
            throw new BusinessException(String.format(SystemMessage.INV_ERR_038.getMessage(), code));
        }
        if (!warehouseId.equals(serial.getWarehouseId())) {
            throw new BusinessException(SystemMessage.INV_ERR_037.getMessage());
        }
        inventoryValidationService.ensureSerialNotInstalledInPc(serial);
        ProductVariant variant = serial.getVariant();
        if (variant == null) {
            throw new BusinessException(SystemMessage.INV_ERR_033.getMessage());
        }
        return buildScanResponse("SERIAL", code, variant, serial);
    }

    @Transactional(readOnly = true)
    public ScanResolveResponse resolveGenericScan(ScanResolveRequest req) {
        String code = trimToNull(req != null ? req.getCode() : null);
        if (code == null) {
            throw new BusinessException(SystemMessage.INV_ERR_035.getMessage());
        }
        List<SerialNumber> serials = serialNumberRepository.findBySerialNumber(code);
        if (req != null && req.getVariantId() != null) {
            serials = serials.stream().filter(s -> s.getVariantId().equals(req.getVariantId()))
                    .collect(Collectors.toList());
        }
        if (serials.size() > 1) {
            throw new BusinessException(SystemMessage.INV_ERR_034.getMessage());
        }
        if (serials.size() == 1) {
            SerialNumber serial = serials.get(0);
            ProductVariant variant = serial.getVariant();
            if (variant == null) {
                throw new BusinessException(SystemMessage.INV_ERR_033.getMessage());
            }
            return buildScanResponse("SERIAL", code, variant, serial);
        }
        return resolveVariantScan(code);
    }

    private ScanResolveResponse resolveVariantScan(String code) {
        ProductVariant variant = productVariantRepository.findByBarcode(code)
                .or(() -> productVariantRepository.findBySku(code))
                .orElseThrow(() -> new BusinessException("Không tìm thấy SKU hoặc serial cho mã: " + code));
        Product product = variant.getProduct();
        if (Boolean.TRUE.equals(product != null ? product.getTrackSerial() : null)) {
            throw new BusinessException(SystemMessage.INV_ERR_032.getMessage());
        }
        return buildScanResponse("BARCODE", code, variant, null);
    }

    private ScanResolveResponse buildScanResponse(String type, String code, ProductVariant variant,
            SerialNumber serial) {
        Product product = variant.getProduct();
        return ScanResolveResponse.builder()
                .type(type)
                .code(code)
                .productId(product != null ? product.getId() : null)
                .variantId(variant.getId())
                .serialNumberId(serial != null ? serial.getId() : null)
                .productCode(product != null ? product.getProductCode() : null)
                .productName(product != null ? product.getProductName() : variant.getVariantName())
                .productType(product != null ? product.getProductType() : null)
                .sku(variant.getSku())
                .barcode(variant.getBarcode())
                .serialNumber(serial != null ? serial.getSerialNumber() : null)
                .unitName(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                .trackSerial(product != null ? product.getTrackSerial() : false)
                .salePrice(variant.getSalePrice())
                .costPrice(variant.getCostPrice())
                .warrantyMonths(
                        (variant.getWarrantyMonths() == null || variant.getWarrantyMonths() <= 0) && product != null
                                ? product.getWarrantyPeriodMonths()
                                : variant.getWarrantyMonths())
                .build();
    }

    private void validateExportSerial(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial,
            BigDecimal quantityOut) {
        if (quantityOut.compareTo(BigDecimal.ONE) != 0) {
            throw new BusinessException(SystemMessage.INV_ERR_031.getMessage());
        }
        if (!line.getVariantId().equals(serial.getVariantId())) {
            throw new BusinessException(SystemMessage.INV_ERR_030.getMessage());
        }
        Long whId = line.getWarehouseId() != null ? line.getWarehouseId() : doc.getWarehouseId();
        if (whId != null && !whId.equals(serial.getWarehouseId())) {
            throw new BusinessException(SystemMessage.INV_ERR_029.getMessage());
        }
        if (!SerialNumberStatus.AVAILABLE.name().equalsIgnoreCase(serial.getStatus())) {
            throw new BusinessException(SystemMessage.INV_ERR_028.getMessage());
        }
    }
    private int requireWholeNumber(BigDecimal value, String fieldName) {
        try {
            return value.stripTrailingZeros().intValueExact();
        } catch (ArithmeticException ex) {
            throw new BusinessException(fieldName + " phải là số nguyên");
        }
    }

    private InventoryDocument findExportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.INV_ERR_022.getMessage());
        }
        return inventoryDocumentRepository.findExportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu xuất kho"));
    }

    private InventoryDocument findImportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.INV_ERR_021.getMessage());
        }
        return inventoryDocumentRepository.findImportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu nhập kho"));
    }

    private void validateCreateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException(SystemMessage.INV_ERR_020.getMessage());
        }
    }

    private void validateUpdateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
    }

    private void validateCreateImportRequest(InventoryDocumentRequest req) {
        validateRequiredImportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException(SystemMessage.INV_ERR_020.getMessage());
        }
    }

    private void validateRequiredExportFields(InventoryDocumentRequest req) {
        inventoryValidationService.validateCommonRequiredFields(req, "xuat", true);
    }

    private void validateRequiredImportFields(InventoryDocumentRequest req) {
        inventoryValidationService.validateCommonRequiredFields(req, "nhap", false);
    }

    private void ensureEditable(InventoryDocument doc) {
        String status = normalizeStatusValue(doc.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException(SystemMessage.INV_ERR_014.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public String generateNextExportCode() {
        java.util.List<String> allCodes = inventoryDocumentRepository.findAllExportDocCodes();
        // Tìm cuối dãy liên tục: XK00001, XK00002, ... XK00013 → trả về XK00014
        // Bỏ qua các mã nhảy cóc do người dùng nhập thủ công (vd: XK01200)
        int expected = 1;
        for (String code : allCodes) {
            try {
                int num = Integer.parseInt(code.substring(2));
                if (num != expected)
                    break; // phát hiện khoảng trống, dừng
                expected++;
            } catch (NumberFormatException ignored) {
                // bỏ qua mã không hợp lệ
            }
        }
        String candidate = String.format("XK%05d", expected);
        // Đảm bảo mã chưa tồn tại (dự phòng trường hợp race condition)
        while (inventoryDocumentRepository.existsByDocCode(candidate)) {
            candidate = String.format("XK%05d", ++expected);
        }
        return candidate;
    }

    @Transactional(readOnly = true)
    public String generateNextImportCode() {
        java.util.List<String> allCodes = inventoryDocumentRepository.findAllImportDocCodes();
        int expected = 1;
        for (String code : allCodes) {
            try {
                int num = Integer.parseInt(code.substring(2));
                if (num != expected)
                    break;
                expected++;
            } catch (NumberFormatException ignored) {
                // bỏ qua mã không hợp lệ
            }
        }
        String candidate = String.format("NK%05d", expected);
        while (inventoryDocumentRepository.existsByDocCode(candidate)) {
            candidate = String.format("NK%05d", ++expected);
        }
        return candidate;
    }

    private String resolveCreateDocCode(String requestedCode) {
        String docCode = trimToNull(requestedCode);
        if (docCode == null) {
            docCode = generateNextExportCode();
            while (inventoryDocumentRepository.existsByDocCode(docCode)) {
                try {
                    String digits = docCode.substring(2);
                    int nextNum = Integer.parseInt(digits) + 1;
                    docCode = String.format("XK%05d", nextNum);
                } catch (Exception e) {
                    docCode = docCode + "-1";
                }
            }
        } else {
            if (inventoryDocumentRepository.existsByDocCode(docCode)) {
                throw new BusinessException(SystemMessage.INV_ERR_012.getMessage());
            }
        }
        return docCode;
    }

    private String resolveCreateImportDocCode(String requestedCode) {
        String docCode = trimToNull(requestedCode);
        if (docCode == null) {
            docCode = generateNextImportCode();
            while (inventoryDocumentRepository.existsByDocCode(docCode)) {
                try {
                    String digits = docCode.substring(2);
                    int nextNum = Integer.parseInt(digits) + 1;
                    docCode = String.format("NK%05d", nextNum);
                } catch (Exception e) {
                    docCode = docCode + "-1";
                }
            }
        } else {
            if (inventoryDocumentRepository.existsByDocCode(docCode)) {
                throw new BusinessException(SystemMessage.INV_ERR_011.getMessage());
            }
        }
        return docCode;
    }

    private InventoryDocumentLine toExportLineEntity(InventoryDocument doc, InventoryDocumentLineRequest lr,
            int index) {
        if (lr.getQuantityIn() != null && lr.getQuantityIn().compareTo(ZERO) > 0) {
            throw new BusinessException(SystemMessage.INV_ERR_010.getMessage());
        }
        BigDecimal quantityOut = requirePositive(lr.getQuantityOut(), "lines[" + index + "].quantityOut");
        BigDecimal unitCost = nonNegativeOrZero(lr.getUnitCost(), "lines[" + index + "].unitCost");
        BigDecimal unitPrice = nonNegativeOrZero(lr.getUnitPrice(), "lines[" + index + "].unitPrice");
        BigDecimal rawVat = lr.getVatRate() != null ? lr.getVatRate() : lr.getVatPercent();
        BigDecimal vatRate = validateVatRate(rawVat, "lines[" + index + "].vatRate");
        BigDecimal subtotal = quantityOut.multiply(unitPrice);
        BigDecimal vatAmount = subtotal.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal lineAmount = subtotal.add(vatAmount).setScale(2, RoundingMode.HALF_UP);

        Long lineWarehouseId = lr.getWarehouseId() != null ? lr.getWarehouseId() : doc.getWarehouseId();
        if (lineWarehouseId == null) {
            throw new BusinessException("Vui lòng chọn kho xuất cho từng dòng sản phẩm");
        }

        Integer warrantyMonths = lr.getWarrantyMonths();
        if (warrantyMonths == null) {
            ProductVariant variant = productVariantRepository.findById(lr.getVariantId()).orElse(null);
            if (variant != null) {
                warrantyMonths = variant.getWarrantyMonths();
                if (warrantyMonths == null && variant.getProduct() != null) {
                    warrantyMonths = variant.getProduct().getWarrantyPeriodMonths();
                }
            }
        }

        Long serialNumberId = lr.getSerialNumberId();
        if (serialNumberId == null && lr.getSerialNumbers() != null && !lr.getSerialNumbers().isEmpty()) {
            String firstSerial = lr.getSerialNumbers().get(0);
            if (firstSerial != null && !firstSerial.trim().isEmpty()) {
                serialNumberId = serialNumberRepository
                        .findByVariantIdAndSerialNumber(lr.getVariantId(), firstSerial.trim())
                        .map(SerialNumber::getId)
                        .orElse(null);
            }
        }

        if (lr.getSerialNumbers() != null && !lr.getSerialNumbers().isEmpty()) {
            for (String snValue : lr.getSerialNumbers()) {
                if (snValue == null || snValue.trim().isEmpty())
                    continue;
                SerialNumber snObj = serialNumberRepository
                        .findByVariantIdAndSerialNumber(lr.getVariantId(), snValue.trim()).orElse(null);
                if (snObj != null) {
                    if (!lineWarehouseId.equals(snObj.getWarehouseId())) {
                        throw new BusinessException(String.format("Serial %s không thuộc kho đã chọn", snValue));
                    }
                    if (!SerialNumberStatus.AVAILABLE.name().equals(snObj.getStatus())) {
                        throw new BusinessException(
                                String.format(SystemMessage.INV_ERR_009.getMessage(), snValue, snObj.getStatus()));
                    }
                    inventoryValidationService.ensureSerialNotInstalledInPc(snObj, doc);
                    boolean isLocked = inventoryDocumentLineRepository.isSerialLockedInDrafts(snObj.getId(),
                            doc.getId());
                    if (isLocked) {
                        throw new BusinessException(String.format(SystemMessage.INV_ERR_008.getMessage(), snValue));
                    }
                }
            }
        } else if (serialNumberId != null) {
            SerialNumber snObj = serialNumberRepository.findById(serialNumberId).orElse(null);
            if (snObj != null) {
                if (!lineWarehouseId.equals(snObj.getWarehouseId())) {
                    throw new BusinessException(
                            String.format("Serial %s không thuộc kho đã chọn", snObj.getSerialNumber()));
                }
                if (!SerialNumberStatus.AVAILABLE.name().equals(snObj.getStatus())) {
                    throw new BusinessException(String.format(SystemMessage.INV_ERR_009.getMessage(),
                            snObj.getSerialNumber(), snObj.getStatus()));
                }
                inventoryValidationService.ensureSerialNotInstalledInPc(snObj, doc);
                boolean isLocked = inventoryDocumentLineRepository.isSerialLockedInDrafts(serialNumberId, doc.getId());
                if (isLocked) {
                    throw new BusinessException(
                            String.format(SystemMessage.INV_ERR_008.getMessage(), snObj.getSerialNumber()));
                }
            }
        }

        BigDecimal ratio = lr.getConversionRatio() != null && lr.getConversionRatio().compareTo(ZERO) > 0
                ? lr.getConversionRatio()
                : BigDecimal.ONE;
        String op = lr.getConversionOperator() != null && !lr.getConversionOperator().isBlank()
                ? lr.getConversionOperator().trim().toUpperCase()
                : "MULTIPLY";
        BigDecimal baseQty;
        if ("DIVIDE".equals(op) || "/".equals(op)) {
            baseQty = quantityOut.divide(ratio, 4, RoundingMode.HALF_UP);
        } else {
            baseQty = quantityOut.multiply(ratio);
        }

        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setInventoryDocument(doc);
        line.setVariantId(lr.getVariantId());
        line.setWarehouseId(lineWarehouseId);
        line.setTargetWarehouseId(lr.getTargetWarehouseId());
        line.setQuantityIn(ZERO);
        line.setQuantityOut(quantityOut);
        line.setUnitCost(unitCost);
        line.setUnitPrice(unitPrice);
        line.setVatRate(vatRate);
        line.setVatPercent(vatRate);
        line.setLineAmount(lineAmount);
        line.setLotBatchId(lr.getLotBatchId());
        line.setSerialNumberId(serialNumberId);
        line.setSerialNumbersText(formatSerialNumbers(lr.getSerialNumbers()));
        line.setWarrantyMonths(warrantyMonths);
        line.setNote(lr.getNote());
        line.setUnitId(lr.getUnitId());
        line.setBaseUnitId(lr.getBaseUnitId());
        line.setConversionOperator(op);
        line.setConversionRatio(ratio);
        line.setBaseQuantity(baseQty);
        return line;
    }

    private InventoryDocumentLine toImportLineEntity(InventoryDocument doc, InventoryDocumentLineRequest lr,
            int index) {
        if (lr.getQuantityOut() != null && lr.getQuantityOut().compareTo(ZERO) > 0) {
            throw new BusinessException(SystemMessage.INV_ERR_007.getMessage());
        }
        BigDecimal quantityIn = requirePositive(lr.getQuantityIn(), "lines[" + index + "].quantityIn");
        BigDecimal unitCost = nonNegativeOrZero(lr.getUnitCost(), "lines[" + index + "].unitCost");
        BigDecimal rawVat = lr.getVatPercent() != null ? lr.getVatPercent() : lr.getVatRate();
        BigDecimal vatRate = validateVatRate(rawVat, "lines[" + index + "].vatPercent");
        BigDecimal subtotal = quantityIn.multiply(unitCost);
        BigDecimal vatAmount = subtotal.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal lineAmount = subtotal.add(vatAmount).setScale(2, RoundingMode.HALF_UP);

        Long lineWarehouseId = lr.getWarehouseId() != null ? lr.getWarehouseId() : doc.getWarehouseId();
        if (lineWarehouseId == null) {
            throw new BusinessException("Vui lòng chọn kho nhập cho từng dòng sản phẩm");
        }

        BigDecimal expectedQty = lr.getExpectedQuantity() != null && lr.getExpectedQuantity().compareTo(ZERO) > 0
                ? lr.getExpectedQuantity()
                : quantityIn;
        BigDecimal rejectedQty = lr.getRejectedQuantity() != null ? lr.getRejectedQuantity() : ZERO;
        String reason = trimToNull(lr.getDiscrepancyReason());

        BigDecimal ratio = lr.getConversionRatio() != null && lr.getConversionRatio().compareTo(ZERO) > 0
                ? lr.getConversionRatio()
                : BigDecimal.ONE;
        String op = lr.getConversionOperator() != null && !lr.getConversionOperator().isBlank()
                ? lr.getConversionOperator().trim().toUpperCase()
                : "MULTIPLY";
        BigDecimal baseQty;
        if ("DIVIDE".equals(op) || "/".equals(op)) {
            baseQty = quantityIn.divide(ratio, 4, RoundingMode.HALF_UP);
        } else {
            baseQty = quantityIn.multiply(ratio);
        }

        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setInventoryDocument(doc);
        line.setVariantId(lr.getVariantId());
        line.setWarehouseId(lineWarehouseId);
        line.setTargetWarehouseId(lr.getTargetWarehouseId());
        line.setQuantityIn(quantityIn);
        line.setQuantityOut(ZERO);
        line.setUnitCost(unitCost);
        line.setUnitPrice(unitCost);
        line.setVatRate(vatRate);
        line.setLineAmount(lineAmount);
        line.setLotBatchId(lr.getLotBatchId());
        line.setSerialNumberId(lr.getSerialNumberId());
        line.setSerialNumbersText(formatSerialNumbers(lr.getSerialNumbers()));
        line.setWarrantyMonths(lr.getWarrantyMonths());
        line.setNote(lr.getNote());
        line.setVatPercent(vatRate);
        line.setExpectedQuantity(expectedQty);
        line.setRejectedQuantity(rejectedQty);
        line.setDiscrepancyReason(reason);
        line.setUnitId(lr.getUnitId());
        line.setBaseUnitId(lr.getBaseUnitId());
        line.setConversionOperator(op);
        line.setConversionRatio(ratio);
        line.setBaseQuantity(baseQty);
        return line;
    }

    private BigDecimal validateVatRate(BigDecimal value, String fieldName) {
        if (value == null) {
            return ZERO;
        }
        if (value.compareTo(ZERO) < 0 || value.compareTo(new BigDecimal("10")) > 0) {
            throw new BusinessException(SystemMessage.INV_ERR_006.getMessage());
        }
        return value;
    }

    private BigDecimal requirePositive(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(ZERO) <= 0) {
            throw new BusinessException(fieldName + " phải lớn hơn 0");
        }
        return value;
    }

    private BigDecimal nonNegativeOrZero(BigDecimal value, String fieldName) {
        if (value == null) {
            return ZERO;
        }
        if (value.compareTo(ZERO) < 0) {
            throw new BusinessException(fieldName + " phải lớn hơn hoặc bằng 0");
        }
        return value;
    }

    private String normalizeOptionalStatus(String status) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            return null;
        }
        return normalizeStatusValue(normalized, null);
    }

    private String normalizeEditableStatus(String status, String fallback) {
        String normalized = normalizeStatusValue(status, fallback);
        if (!EDITABLE_STATUSES.contains(normalized)) {
            throw new BusinessException(SystemMessage.INV_ERR_005.getMessage());
        }
        return normalized;
    }

    private String normalizeOptionalReference(String value) {
        String normalized = trimToNull(value);
        return normalized != null ? normalized.toUpperCase(Locale.ROOT) : null;
    }

    private String normalizeEditableImportStatus(String status, String fallback) {
        String normalized = normalizeStatusValue(status, fallback);
        if (!EDITABLE_STATUSES.contains(normalized)) {
            throw new BusinessException(SystemMessage.INV_ERR_004.getMessage());
        }
        return normalized;
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String formatSerialNumbers(List<String> serialNumbers) {
        if (serialNumbers == null || serialNumbers.isEmpty()) {
            return null;
        }
        List<String> normalized = serialNumbers.stream()
                .map(this::trimToNull)
                .filter(value -> value != null)
                .distinct()
                .toList();
        return normalized.isEmpty() ? null : String.join("\n", normalized);
    }

    private List<String> parseSerialNumbers(String serialNumbersText) {
        String normalized = trimToNull(serialNumbersText);
        if (normalized == null) {
            return List.of();
        }
        return List.of(normalized.split("\\R"))
                .stream()
                .map(this::trimToNull)
                .filter(value -> value != null)
                .distinct()
                .toList();
    }

    private InventoryDocumentResponse toResponse(InventoryDocument doc) {
        return toResponse(doc, false);
    }

    @Transactional
    public InventoryDocumentResponse createExportFromSalesOrder(Long soId, Long actorUserId) {
        SalesOrder so = salesOrderRepository.findById(soId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn hàng SO " + soId));
        if (!DocumentStatus.APPROVED.name().equals(so.getStatus())) {
            throw new BusinessException(SystemMessage.INV_ERR_002.getMessage());
        }

        InventoryDocument doc = new InventoryDocument();
        doc.initExportDocument(resolveCreateDocCode(null));
        doc.setDocDate(LocalDate.now());
        doc.setPartnerId(so.getPartnerId());
        doc.setWarehouseId(so.getWarehouseId());
        doc.setReferenceType("SALES_ORDER");
        doc.setReferenceId(so.getId());
        doc.setSalesOrderId(so.getId());
        doc.assignCreator(actorUserId);
        doc.updateStatus(DEFAULT_STATUS);
        doc.setIssuePurpose(ISSUE_PURPOSE_SALES);

        for (SalesOrderLine soLine : so.getLines()) {
            BigDecimal exported = inventoryDocumentLineRepository
                    .sumExportedQuantityBySalesOrderIdAndVariantId(so.getId(), soLine.getVariantId());
            if (exported == null)
                exported = ZERO;
            BigDecimal remaining = soLine.getQuantity().subtract(exported);
            if (remaining.compareTo(ZERO) <= 0) {
                continue;
            }

            InventoryDocumentLine line = new InventoryDocumentLine();
            line.setInventoryDocument(doc);
            line.setVariantId(soLine.getVariantId());
            line.setQuantityOut(remaining);
            line.setQuantityIn(ZERO);
            line.setUnitCost(ZERO);
            line.setUnitPrice(soLine.getUnitPrice());
            line.setVatRate(soLine.getVatRate());
            line.setVatPercent(soLine.getVatRate());
            line.setWarrantyMonths(soLine.getWarrantyMonths());
            line.setNote(soLine.getNote());
            doc.addExportLine(line);
        }

        if (doc.getLines().isEmpty()) {
            throw new BusinessException(SystemMessage.INV_ERR_001.getMessage());
        }

        return toResponse(inventoryDocumentRepository.save(doc));
    }

    /**
     * Tạo (và để caller POST) phiếu xuất kho linh kiện cho 1 lệnh sửa chữa.
     * Trả về null nếu phiếu đã tồn tại (idempotent - repair có thể retry bước DONE)
     * hoặc không có dòng nào hợp lệ.
     */
    @Transactional
    public Long createExportForRepair(Long repairId, String repairCode, Long warehouseId, Long partnerId,
            Long createdBy, Long salespersonId, String recipientName, List<RepairStockOutLineRequest> lines) {
        String docCode = "REP-EX-" + repairCode;
        if (inventoryDocumentRepository.existsByDocCode(docCode)) {
            return null;
        }

        InventoryDocument exportDoc = new InventoryDocument();
        exportDoc.initExportDocument(docCode);
        exportDoc.setIssuePurpose("REPAIR");
        exportDoc.setReferenceType("REPAIR");
        exportDoc.setReferenceId(repairId);
        exportDoc.setWarehouseId(warehouseId);
        exportDoc.setPartnerId(partnerId);
        exportDoc.setDocDate(LocalDate.now());
        exportDoc.updateStatus(DocumentStatus.DRAFT.name());
        exportDoc.setNote("Phiếu xuất linh kiện sửa chữa - Lệnh " + repairCode);
        exportDoc.assignCreator(createdBy);
        exportDoc.setSalespersonId(salespersonId);
        exportDoc.setRecipientName(recipientName);

        for (RepairStockOutLineRequest lr : lines) {
            if (lr.quantity() == null || lr.quantity().compareTo(ZERO) <= 0) {
                continue;
            }
            InventoryDocumentLine docLine = new InventoryDocumentLine();
            docLine.setInventoryDocument(exportDoc);
            docLine.setVariantId(lr.componentVariantId());
            docLine.setQuantityIn(ZERO);
            docLine.setQuantityOut(lr.quantity());
            docLine.setUnitCost(ZERO);
            docLine.setUnitPrice(lr.unitPrice());
            docLine.setLineAmount(lr.unitPrice().multiply(lr.quantity()));
            docLine.setSerialNumberId(lr.serialNumberId());
            docLine.setSerialNumbersText(lr.serialNumberText());
            docLine.setNote(lr.note());
            exportDoc.getLines().add(docLine);
        }

        if (exportDoc.getLines().isEmpty()) {
            return null;
        }

        return inventoryDocumentRepository.save(exportDoc).getId();
    }

    /**
     * Tạo (và để caller POST) phiếu nhập kho phế liệu cho linh kiện tháo ra của 1 lệnh
     * sửa chữa. Trả về null nếu phiếu đã tồn tại hoặc không có dòng nào hợp lệ.
     */
    @Transactional
    public Long createScrapImportForRepair(Long repairId, String repairCode, Long scrapWarehouseId, Long partnerId,
            Long createdBy, Long salespersonId, String recipientName, List<RepairScrapLineRequest> lines) {
        String scrapDocCode = "REP-SCRAP-" + repairCode;
        if (inventoryDocumentRepository.existsByDocCode(scrapDocCode)) {
            return null;
        }

        InventoryDocument scrapDoc = new InventoryDocument();
        scrapDoc.initImportDocument(scrapDocCode);
        scrapDoc.setIssuePurpose("SCRAP");
        scrapDoc.setReferenceType("REPAIR");
        scrapDoc.setReferenceId(repairId);
        scrapDoc.setWarehouseId(scrapWarehouseId);
        scrapDoc.setPartnerId(partnerId);
        scrapDoc.setDocDate(LocalDate.now());
        scrapDoc.updateStatus(DocumentStatus.DRAFT.name());
        scrapDoc.setNote("Phiếu nhập kho phế liệu - Lệnh sửa chữa " + repairCode);
        scrapDoc.assignCreator(createdBy);
        scrapDoc.setSalespersonId(salespersonId);
        scrapDoc.setRecipientName(recipientName);

        for (RepairScrapLineRequest lr : lines) {
            InventoryDocumentLine scrapLine = new InventoryDocumentLine();
            scrapLine.setInventoryDocument(scrapDoc);
            scrapLine.setVariantId(lr.componentVariantId());
            scrapLine.setQuantityIn(lr.quantity());
            scrapLine.setQuantityOut(ZERO);
            scrapLine.setUnitCost(ZERO);
            scrapLine.setUnitPrice(ZERO);
            scrapLine.setLineAmount(ZERO);
            scrapLine.setSerialNumberId(lr.serialNumberId());
            scrapLine.setSerialNumbersText(lr.serialNumberText());
            scrapLine.setNote("Linh kiện tháo ra từ lệnh sửa " + repairCode);
            scrapDoc.getLines().add(scrapLine);
        }

        if (scrapDoc.getLines().isEmpty()) {
            return null;
        }

        return inventoryDocumentRepository.save(scrapDoc).getId();
    }

    private InventoryDocumentResponse toResponse(InventoryDocument doc, boolean includeLines) {
        InventoryDocumentResponse r = inventoryDocumentMapper.toResponse(doc);
        if (doc.getCreatedBy() != null) {
            userRepository.findById(doc.getCreatedBy()).ifPresent(u -> r.setCreatedByName(u.getFullName()));
        }
        if (doc.getApprovedBy() != null) {
            userRepository.findById(doc.getApprovedBy()).ifPresent(u -> r.setApprovedByName(u.getFullName()));
        }
        if (doc.getUnpostedBy() != null) {
            userRepository.findById(doc.getUnpostedBy()).ifPresent(u -> r.setUnpostedByName(u.getFullName()));
        }

        if (doc.getPartnerId() != null) {

            Partner partner = partnerRepository.findById(doc.getPartnerId()).orElse(null);
            if (partner != null) {
                r.setPartnerCode(partner.getCode());
                r.setPartnerName(partner.getName());
            }
        }

        if (doc.getSalespersonId() != null) {
            User salesperson = userRepository.findById(doc.getSalespersonId()).orElse(null);
            if (salesperson != null) {
                r.setSalespersonName(salesperson.getFullName());
            }
        }

        if (doc.getReferenceType() != null && doc.getReferenceId() != null) {
            String refType = doc.getReferenceType().trim().toUpperCase();
            if ("ASSEMBLY_ORDER".equals(refType)) {
                assemblyOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(order -> r.setReferenceCode(order.getOrderCode()));
            } else if ("BOM".equals(refType)) {
                assemblyBomRepository.findById(doc.getReferenceId())
                        .ifPresent(bom -> r.setReferenceCode(bom.getBomCode()));
            } else if ("SALES_ORDER".equals(refType) || "SO".equals(refType)) {
                salesOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(so -> r.setReferenceCode(so.getSoCode()));
            } else if ("REPAIR".equals(refType)) {
                repairRepository.findById(doc.getReferenceId())
                        .ifPresent(repair -> r.setReferenceCode(repair.getRepairCode()));
            } else if ("STOCKTAKE".equals(refType) || "STOCK_TAKE".equals(refType)
                    || "STOCKTAKE_ADJUSTMENT".equals(refType)) {
                stocktakeRepository.findById(doc.getReferenceId())
                        .ifPresent(st -> r.setReferenceCode(st.getStocktakeCode()));
            } else if ("PURCHASE_ORDER".equals(refType) || "PO".equals(refType)) {
                purchaseOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(po -> r.setReferenceCode(po.getPoCode()));
            }
        }

        if (r.getReferenceCode() == null && doc.getSalesOrderId() != null) {
            salesOrderRepository.findById(doc.getSalesOrderId())
                    .ifPresent(so -> {
                        r.setReferenceCode(so.getSoCode());
                        if (r.getReferenceType() == null) {
                            r.setReferenceType("SALES_ORDER");
                        }
                        if (r.getReferenceId() == null) {
                            r.setReferenceId(so.getId());
                        }
                    });
        }

        if (r.getReferenceCode() == null && doc.getPurchaseOrderId() != null) {
            purchaseOrderRepository.findById(doc.getPurchaseOrderId())
                    .ifPresent(po -> {
                        r.setReferenceCode(po.getPoCode());
                        if (r.getReferenceType() == null) {
                            r.setReferenceType("PURCHASE_ORDER");
                        }
                        if (r.getReferenceId() == null) {
                            r.setReferenceId(po.getId());
                        }
                    });
        }

        if (doc.getLines() != null) {
            List<InventoryDocumentLineResponse> lines = doc.getLines().stream().map(l -> {
                InventoryDocumentLineResponse lr = inventoryDocumentMapper.toLineResponse(l);
                if (l.getVariantId() != null) {
                    productVariantRepository.findById(l.getVariantId()).ifPresent(v -> {
                        lr.setSku(v.getSku());
                        lr.setVariantName(v.getVariantName());
                        lr.setBarcode(v.getBarcode());
                        if (v.getProduct() != null) {
                            lr.setProductName(v.getProduct().getProductName());
                            lr.setTrackSerial(Boolean.TRUE.equals(v.getProduct().getTrackSerial()));
                        } else {
                            lr.setProductName(v.getVariantName());
                        }
                    });
                }
                lr.setSerialNumbers(parseSerialNumbers(l.getSerialNumbersText()));
                lr.setExpectedQuantity(l.getExpectedQuantity() != null ? l.getExpectedQuantity() : l.getQuantityIn());
                lr.setRejectedQuantity(l.getRejectedQuantity() != null ? l.getRejectedQuantity() : ZERO);
                lr.setConversionRatio(l.getConversionRatio() != null ? l.getConversionRatio() : BigDecimal.ONE);
                lr.setBaseQuantity(l.getBaseQuantity() != null ? l.getBaseQuantity()
                        : (l.getQuantityIn() != null && l.getQuantityIn().compareTo(ZERO) > 0 ? l.getQuantityIn()
                                : l.getQuantityOut()));
                if (l.getUnitId() != null) {
                    unitRepository.findById(l.getUnitId()).ifPresent(u -> lr.setUnitName(u.getName()));
                }
                if (l.getBaseUnitId() != null) {
                    unitRepository.findById(l.getBaseUnitId()).ifPresent(u -> lr.setBaseUnitName(u.getName()));
                }
                if (l.getWarehouseId() != null) {
                    warehouseRepository.findById(l.getWarehouseId()).ifPresent(wh -> {
                        lr.setWarehouseName(wh.getName());
                        lr.setWarehouseCode(wh.getCode());
                    });
                }
                if (l.getTargetWarehouseId() != null) {
                    warehouseRepository.findById(l.getTargetWarehouseId()).ifPresent(wh -> {
                        lr.setTargetWarehouseName(wh.getName());
                    });
                }
                return lr;
            }).collect(Collectors.toList());
            r.setLines(lines);
        }
        return r;
    }

    @Transactional(readOnly = true)
    public com.duylongtech.backend.feature.inventory.DependencyCheckResponse checkImportUnpostable(Long id) {
        return documentDependencyService.checkImportSlipUnpostable(id);
    }

    @Transactional(readOnly = true)
    public com.duylongtech.backend.feature.inventory.DependencyCheckResponse checkExportUnpostable(Long id) {
        return documentDependencyService.checkExportSlipUnpostable(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId) {
        return inventoryPostingService.unpostImport(id, reason, currentUserId);
    }

    public InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId) {
        return inventoryPostingService.unpostExport(id, reason, currentUserId);
    }

    public List<InventoryDocumentResponse> getAssemblyDocuments(Long orderId) {
        return inventoryDocumentRepository.findByReferenceWithLines("ASSEMBLY_ORDER", orderId).stream()
                .map(this::toResponse)
                .toList();
    }

    private boolean isPostedDocument(Long documentId) {
        return documentId != null && inventoryDocumentRepository.findById(documentId)
                .map(document -> DocumentStatus.POSTED.name().equals(document.getStatus()))
                .orElse(false);
    }

    private void validateAssemblyExportUnpost(InventoryDocument doc) {
        if (!"ASSEMBLY_ORDER".equalsIgnoreCase(trimToNull(doc.getReferenceType())) || doc.getReferenceId() == null) {
            return;
        }
        AssemblyOrder order = assemblyOrderRepository.findById(doc.getReferenceId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh của phiếu kho"));
        if (!DocumentStatus.CANCELLED.name().equals(order.getStatus())
                || !com.duylongtech.backend.enums.SettlementStatus.PENDING.name().equals(order.getCancellationSettlementStatus())) {
            throw new BusinessException(SystemMessage.ASM_ERR_046.getMessage());
        }
        if (inventoryDocumentRepository.findByReferenceWithLines("ASSEMBLY_ORDER", order.getId()).stream()
                .anyMatch(d -> IMPORT_DOC_TYPE.equals(d.getDocType()) && DocumentStatus.POSTED.name().equals(d.getStatus()))) {
            throw new BusinessException(SystemMessage.ASM_ERR_044.getMessage());
        }
    }

    private void synchronizeAssemblyOrder(InventoryDocument document) {
        if (!"ASSEMBLY_ORDER".equalsIgnoreCase(trimToNull(document.getReferenceType()))
                || document.getReferenceId() == null) {
            return;
        }
        AssemblyOrder order = assemblyOrderRepository.findById(document.getReferenceId()).orElse(null);
        if (order == null) {
            return;
        }
        List<InventoryDocument> pair = inventoryDocumentRepository
                .findByReferenceWithLines("ASSEMBLY_ORDER", order.getId());
        boolean exportPosted = pair.stream()
                .anyMatch(d -> EXPORT_DOC_TYPE.equals(d.getDocType()) && DocumentStatus.POSTED.name().equals(d.getStatus()));
        boolean importPosted = pair.stream()
                .anyMatch(d -> IMPORT_DOC_TYPE.equals(d.getDocType()) && DocumentStatus.POSTED.name().equals(d.getStatus()));
        if (DocumentStatus.CANCELLED.name().equals(order.getStatus()) && DocumentStatus.UNPOSTED.name().equals(document.getStatus())) {
            // order.setCancellationSettlementStatus("SETTLED"); // Handled in domain if needed
        } else if (exportPosted && importPosted) {
            order.markAsPosted();
            order.updateProducedQuantity(order.getQuantity());
        } else if (exportPosted) {
            order.markAsInProgress();
        }
        assemblyOrderRepository.save(order);
    }

    private void markUnposted(InventoryDocument doc, String reason, Long currentUserId) {
        doc.unpost(currentUserId, trimToNull(reason));
        doc.setUpdatedAt(LocalDateTime.now());
    }

    private void auditUnpost(InventoryDocument doc, String action, Long currentUserId) {
        String username = currentUserId == null ? "system" : userRepository.findById(currentUserId)
                .map(User::getUsername)
                .orElse("system");
        auditLogService.logEvent(username, action, "InventoryDocument", doc.getId(), "SUCCESS",
                "Bß╗Å ghi sß╗ò phiß║┐u " + (IMPORT_DOC_TYPE.equals(doc.getDocType()) ? "nhß║¡p" : "xuß║Ñt")
                        + " kho " + doc.getDocCode(), null, null);
    }

    private boolean isDisassemblyImport(InventoryDocument doc) {
        if (!"ASSEMBLY_ORDER".equalsIgnoreCase(trimToNull(doc.getReferenceType())) || doc.getReferenceId() == null) {
            return false;
        }
        return assemblyOrderRepository.findById(doc.getReferenceId())
                .map(order -> "DISASSEMBLY".equals(order.getOrderType()))
                .orElse(false);
    }

    private void createAssemblyGenealogy(InventoryDocument importDocument) {
        if (!IMPORT_DOC_TYPE.equals(importDocument.getDocType())
                || !"ASSEMBLY_ORDER".equalsIgnoreCase(trimToNull(importDocument.getReferenceType()))
                || importDocument.getReferenceId() == null) {
            return;
        }
        AssemblyOrder order = assemblyOrderRepository.findByIdWithLines(importDocument.getReferenceId()).orElse(null);
        if (order == null || order.getTargetVariant() == null || !order.getTargetVariant().isSerialTracked()) {
            return;
        }
        List<InventoryDocument> pair = inventoryDocumentRepository
                .findByReferenceWithLines("ASSEMBLY_ORDER", order.getId());
        InventoryDocument exportDocument = pair.stream()
                .filter(document -> EXPORT_DOC_TYPE.equals(document.getDocType()))
                .findFirst().orElse(null);
        if (exportDocument == null) {
            return;
        }
        boolean assembly = "ASSEMBLY".equals(order.getOrderType());
        InventoryDocument targetDocument = assembly ? importDocument : exportDocument;
        InventoryDocument componentDocument = assembly ? exportDocument : importDocument;
        List<String> targetSerials = targetDocument.getLines().stream()
                .filter(line -> order.getTargetVariant().getId().equals(line.getVariantId()))
                .flatMap(line -> parseSerialNumbers(line.getSerialNumbersText()).stream())
                .toList();
        if (targetSerials.isEmpty()) {
            return;
        }
        if (!assembly) {
            List<AssemblyOrderSerial> active = assemblyOrderSerialRepository
                    .findByTargetVariantIdAndTargetSerialsIn(order.getTargetVariant().getId(), targetSerials);
            active.forEach(mapping -> {
                mapping.markAsRemoved(null, "Hủy nhập/xuất kho");
            });
            assemblyOrderSerialRepository.saveAll(active);
        }
        for (var orderLine : order.getLines()) {
            List<String> componentSerials = componentDocument.getLines().stream()
                    .filter(line -> orderLine.getComponentVariant().getId().equals(line.getVariantId()))
                    .flatMap(line -> parseSerialNumbers(line.getSerialNumbersText()).stream())
                    .toList();
            if (componentSerials.isEmpty()) {
                continue;
            }
            int perTarget;
            try {
                perTarget = orderLine.getQuantityRequired().divide(order.getQuantity())
                        .stripTrailingZeros().intValueExact();
            } catch (ArithmeticException ex) {
                throw new BusinessException("Kh├┤ng thß╗â chia serial linh kiß╗çn theo tß╗½ng th├ánh phß║⌐m");
            }
            if (componentSerials.size() != targetSerials.size() * perTarget) {
                throw new BusinessException(SystemMessage.ASM_ERR_036.getMessage());
            }
            if (!assembly) {
                continue;
            }
            for (int targetIndex = 0; targetIndex < targetSerials.size(); targetIndex++) {
                for (int componentIndex = 0; componentIndex < perTarget; componentIndex++) {
                    String componentSerial = componentSerials.get(targetIndex * perTarget + componentIndex);
                    AssemblyOrderSerial aos = new AssemblyOrderSerial();
                    aos.initSerial(order, order.getTargetVariant(), targetSerials.get(targetIndex), orderLine.getComponentVariant(), componentSerial, order.getCreatedBy());
                    assemblyOrderSerialRepository.save(aos);
                }
            }
        }
    }

    private void ensureUniqueSerials(List<String> serials) {
        long uniqueCount = serials.stream()
                .map(value -> value.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .count();
        if (uniqueCount != serials.size()) {
            throw new BusinessException("Danh sách serial không được chứa mã trùng lặp");
        }
    }

}
