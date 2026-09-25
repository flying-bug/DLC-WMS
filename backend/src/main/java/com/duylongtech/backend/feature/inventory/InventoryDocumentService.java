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
import com.duylongtech.backend.feature.sales_order.SalesOrderFulfillment;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderLine;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderReceiving;
import java.util.Map;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
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
    public static final String ISSUE_PURPOSE_REPAIR = "REPAIR"; // Xuất kho sửa chữa

    // Phân loại phiếu xuất/nhập kho tự động từ module Chuyển kho
    public static final String ISSUE_PURPOSE_TRANSFER_OUT = "TRANSFER_EXPORT"; // Xuất kho chuyển đi
    public static final String ISSUE_PURPOSE_TRANSFER_IN = "TRANSFER_IMPORT"; // Nhập kho từ chuyển về
    public static final String ISSUE_PURPOSE_INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT"; // Xử lý chênh lệch kiểm kê
    public static final String ISSUE_PURPOSE_PURCHASE = "PURCHASE"; // Nhập hàng từ nhà cung cấp / đơn mua hàng

    // Các trạng thái coi là "còn mở" khi chống tạo trùng phiếu nhập bù
    private static final List<String> OPEN_DOCUMENT_STATUSES = List.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name());

    // Tập hợp các mục đích hợp lệ khi người dùng tạo phiếu xuất thủ công
    private static final Set<String> VALID_MANUAL_EXPORT_PURPOSES = Set.of(ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE,
            ISSUE_PURPOSE_ASSEMBLY, ISSUE_PURPOSE_REPAIR);

    // Tập hợp các mục đích hợp lệ toàn bộ (bắt cả nội bộ và người dùng)
    private static final Set<String> VALID_ALL_EXPORT_PURPOSES = Set.of(
            ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE, ISSUE_PURPOSE_ASSEMBLY, ISSUE_PURPOSE_TRANSFER_OUT,
            ISSUE_PURPOSE_INVENTORY_ADJUSTMENT, ISSUE_PURPOSE_REPAIR);

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryCostLayerRepository inventoryCostLayerRepository;
    private final InventoryValidationService inventoryValidationService;
    private final InventoryPostingService inventoryPostingService;
    private final com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard warehouseAccessGuard;
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
    private final InventoryDocumentReferenceRepository inventoryDocumentReferenceRepository;

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
        
        boolean hasFullView = hasAnyAuthority("ROLE_SUPER_ADMIN", "ROLE_MANAGER", "ROLE_ACCOUNTANT", "ROLE_WAREHOUSE_CONTROLLER");

        if (!hasFullView) {
            boolean canRepair = hasAnyAuthority("repair:view");
            boolean canAssembly = hasAnyAuthority("assembly:view");
            
            if (!canRepair && !canAssembly) {
                return List.of();
            }
            
            if (referenceType != null && !referenceType.trim().isEmpty()) {
                if ("REPAIR".equals(referenceType) && !canRepair) {
                    return List.of();
                }
                if ("ASSEMBLY_ORDER".equals(referenceType) && !canAssembly) {
                    return List.of();
                }
                if (!"REPAIR".equals(referenceType) && !"ASSEMBLY_ORDER".equals(referenceType)) {
                    return List.of();
                }
            } else {
                if (canRepair && canAssembly) {
                    issuePurpose = null;
                    referenceType = "MULTI_TECH";
                } else if (canRepair) {
                    issuePurpose = null;
                    referenceType = "REPAIR";
                } else {
                    issuePurpose = "ASSEMBLY";
                    referenceType = "ASSEMBLY_ORDER";
                }
            }
        }

        // Thủ kho chỉ được thấy chứng từ của kho mình phụ trách (USER_WAREHOUSE_ROLES);
        // null = không giới hạn (Manager/Kế toán), rỗng = có giới hạn nhưng chưa được gán kho nào.
        List<Long> allowedWarehouseIds = warehouseAccessGuard.resolveAllowedWarehouseIds();
        if (allowedWarehouseIds != null && allowedWarehouseIds.isEmpty()) {
            return List.of();
        }
        if (allowedWarehouseIds != null && warehouseId != null && !allowedWarehouseIds.contains(warehouseId)) {
            return List.of();
        }

        String normalizedKeyword = trimToNull(keyword);
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedIssuePurpose = normalizeOptionalReference(issuePurpose);
        String normalizedReferenceType = normalizeOptionalReference(referenceType);
        boolean noFilters = normalizedKeyword == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null && normalizedIssuePurpose == null && normalizedReferenceType == null
                && referenceId == null && partnerId == null && salespersonId == null
                && allowedWarehouseIds == null;
        List<InventoryDocument> docs = noFilters
                ? inventoryDocumentRepository.findAllExports()
                : inventoryDocumentRepository.searchExports(normalizedKeyword, fromDate, toDate, normalizedStatus,
                        warehouseId, normalizedIssuePurpose, normalizedReferenceType, referenceId, partnerId,
                        salespersonId, allowedWarehouseIds);
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getExportDetail(Long id) {
        InventoryDocument doc = findExportOrThrow(id);
        assertCanViewDocument(doc);
        return toResponse(doc);
    }

    /**
     * export:view/import:view (hoặc Manager/Admin) thấy mọi chứng từ. Người chỉ có
     * assembly:view hoặc repair:view chỉ được xem chứng từ đúng loại tham chiếu của
     * họ (ASSEMBLY_ORDER / REPAIR) - tránh lộ toàn bộ lịch sử xuất/nhập kho.
     */
    private void assertCanViewDocument(InventoryDocument doc) {
        if (hasAnyAuthority("export:view", "import:view", "ROLE_SUPER_ADMIN", "ROLE_MANAGER")) {
            return;
        }
        String refType = doc.getReferenceType();
        if (hasAnyAuthority("assembly:view") && "ASSEMBLY_ORDER".equals(refType)) {
            return;
        }
        if (hasAnyAuthority("repair:view") && "REPAIR".equals(refType)) {
            return;
        }
        throw new BusinessException("Bạn không có quyền xem chứng từ này.");
    }

    private boolean hasAnyAuthority(String... authorities) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        Set<String> wanted = Set.of(authorities);
        return auth.getAuthorities().stream().anyMatch(a -> wanted.contains(a.getAuthority()));
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
        
        boolean hasFullView = hasAnyAuthority("ROLE_SUPER_ADMIN", "ROLE_MANAGER", "ROLE_ACCOUNTANT", "ROLE_WAREHOUSE_CONTROLLER");

        if (!hasFullView) {
            boolean canRepair = hasAnyAuthority("repair:view");
            boolean canAssembly = hasAnyAuthority("assembly:view");
            
            if (!canRepair && !canAssembly) {
                return List.of();
            }
            
            if (referenceType != null && !referenceType.trim().isEmpty()) {
                if ("REPAIR".equals(referenceType) && !canRepair) {
                    return List.of();
                }
                if ("ASSEMBLY_ORDER".equals(referenceType) && !canAssembly) {
                    return List.of();
                }
                if (!"REPAIR".equals(referenceType) && !"ASSEMBLY_ORDER".equals(referenceType)) {
                    return List.of();
                }
            } else {
                if (canRepair && canAssembly) {
                    issuePurpose = null;
                    referenceType = "MULTI_TECH";
                } else if (canRepair) {
                    issuePurpose = null;
                    referenceType = "REPAIR";
                } else {
                    issuePurpose = "ASSEMBLY";
                    referenceType = "ASSEMBLY_ORDER";
                }
            }
        }

        // Thủ kho chỉ được thấy chứng từ của kho mình phụ trách (USER_WAREHOUSE_ROLES);
        // null = không giới hạn (Manager/Kế toán), rỗng = có giới hạn nhưng chưa được gán kho nào.
        List<Long> allowedWarehouseIds = warehouseAccessGuard.resolveAllowedWarehouseIds();
        if (allowedWarehouseIds != null && allowedWarehouseIds.isEmpty()) {
            return List.of();
        }
        if (allowedWarehouseIds != null && warehouseId != null && !allowedWarehouseIds.contains(warehouseId)) {
            return List.of();
        }

        String normalizedKeyword = trimToNull(keyword);
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedIssuePurpose = normalizeOptionalReference(issuePurpose);
        String normalizedReferenceType = normalizeOptionalReference(referenceType);
        boolean noFilters = normalizedKeyword == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null && normalizedIssuePurpose == null && normalizedReferenceType == null
                && referenceId == null && partnerId == null && salespersonId == null
                && allowedWarehouseIds == null;
        List<InventoryDocument> docs = noFilters
                ? inventoryDocumentRepository.findAllImports()
                : inventoryDocumentRepository.searchImports(normalizedKeyword, fromDate, toDate, normalizedStatus,
                        warehouseId, normalizedIssuePurpose, normalizedReferenceType, referenceId, partnerId,
                        salespersonId, allowedWarehouseIds);
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getImportDetail(Long id) {
        InventoryDocument doc = findImportOrThrow(id);
        assertCanViewDocument(doc);
        InventoryDocumentResponse response = toResponse(doc);
        response.setWarehouseLocked(doc.getPurchaseOrderId() != null);
        return response;
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
        notifyWarehouseOfNewDocument(saved, EXPORT_DOC_TYPE);
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
        notifyWarehouseOfNewDocument(saved, IMPORT_DOC_TYPE);
        return toResponse(saved);
    }

    /**
     * Báo cho Thủ kho khi Kế toán tạo đề nghị nhập/xuất kho mới, để họ biết
     * chứng từ đang chờ xử lý mà không cần chủ động vào kiểm tra danh sách.
     */
    private void notifyWarehouseOfNewDocument(InventoryDocument doc, String docType) {
        try {
            boolean isImport = IMPORT_DOC_TYPE.equals(docType);
            String partnerName = "";
            if (doc.getPartnerId() != null) {
                partnerName = partnerRepository.findById(doc.getPartnerId()).map(Partner::getName).orElse("");
            }
            String docLabel = isImport ? "nhập kho" : "xuất kho";
            String title = (isImport ? "Đề nghị nhập kho mới: " : "Đề nghị xuất kho mới: ") + doc.getDocCode();
            String message = String.format("Kế toán vừa tạo đề nghị %s %s%s. Vui lòng kiểm tra và xử lý.",
                    docLabel, doc.getDocCode(), partnerName.isBlank() ? "" : " (Đối tác: " + partnerName + ")");
            String refType = isImport ? "IMPORT_DOCUMENT" : "EXPORT_DOCUMENT";
            String link = (isImport ? "/import-slips/" : "/export-slips/") + doc.getId() + "/edit";
            appNotificationService.createNotification("ROLE_WAREHOUSE_CONTROLLER", null, title, message,
                    "INVENTORY", "INVENTORY_SLIP", doc.getId(), link, doc.getWarehouseId());
        } catch (Exception e) {
            // Log warning but do not fail document creation
        }
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
                    // Dòng "Không xử lý" không cần phiếu điều chỉnh; nhưng phải được Manager/Kế toán xác nhận trước khi hoàn thành.
                    boolean importDone = !stocktake.requiresImportAdjustment() || stocktake.getReferenceImportId() != null;
                    boolean exportDone = !stocktake.requiresExportAdjustment() || stocktake.getReferenceExportId() != null;

                    if (importDone && exportDone && !stocktake.hasUnconfirmedWaivers() && stocktake.hasEnoughParticipants()) {
                        stocktake.markAsPosted();
                        auditLogService.logEvent(null, "COMPLETE_STOCKTAKE", "Stocktake", stocktake.getId(), "SUCCESS",
                                "Hoàn thành kiểm kê " + stocktake.getStocktakeCode() + " - các phiếu điều chỉnh đã ghi sổ, kho được mở khóa", null, null);
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
        InventoryDocument doc = findExportOrThrow(id);
        // Phiếu xuất tự sinh của lệnh sửa chữa / lắp ráp: thủ kho chỉ được chọn serial (phiếu lắp ráp được tạo không
        // kèm serial nên bắt buộc phải chọn), mã hàng / số lượng / kho giữ theo lệnh.
        if (isManagedInventoryDocument(doc)) {
            return updateManagedExportSerials(doc, req);
        }
        inventoryValidationService.validateExportInventoryBalance(req.getWarehouseId(), req.getSalesOrderId(), req.getReferenceType(),
                req.getReferenceId(), req.getLines());
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
        if (isRepairInventoryDocument(doc)) {
            return updateRepairImportReceipt(doc, req);
        }
        // Phiếu nhập tự sinh của lệnh lắp ráp / tháo dỡ được tạo không kèm serial: thủ kho nhập serial thành phẩm
        // (hoặc linh kiện thu hồi) trước khi ghi sổ; mã hàng, số lượng, kho và giá vốn giữ theo lệnh.
        if (isManagedInventoryDocument(doc)) {
            return updateManagedImportSerials(doc, req);
        }
        ensureEditable(doc);
        if (req.getWarehouseId() != null && !req.getWarehouseId().equals(doc.getWarehouseId())
                && doc.getPurchaseOrderId() != null) {
            throw new BusinessException("Không thể thay đổi kho nhận hàng của phiếu nhập được tạo từ đơn mua hàng");
        }
        updateBaseDocument(id, doc, req, "Mã phiếu nhập kho đã tồn tại", true);
        doc.clearLines();
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.addImportLine(toImportLineEntity(doc, req.getLines().get(i), i));
        }
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse postExport(Long id) {
        InventoryDocumentResponse response = inventoryPostingService.postExport(id);
        inventoryDocumentRepository.findById(id).ifPresent(this::synchronizeAssemblyOrder);
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse postImport(Long id) {
        InventoryDocumentResponse response = inventoryPostingService.postImport(id);
        inventoryDocumentRepository.findById(id).ifPresent(this::synchronizeAssemblyOrder);
        return response;
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

        Long soId = com.duylongtech.backend.enums.ReferenceType.resolveEffectiveSalesOrderId(
                req.getSalesOrderId(), req.getReferenceType(), req.getReferenceId());
        Long poId = com.duylongtech.backend.enums.ReferenceType.resolveEffectivePurchaseOrderId(
                req.getPurchaseOrderId(), req.getReferenceType(), req.getReferenceId());

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
        // Phiếu xuất do hệ thống sinh (chuyển kho, xử lý kiểm kê): thủ kho vẫn sửa số lượng/serial trước khi ghi
        // sổ, nhưng mục đích và chứng từ gốc giữ nguyên - luồng chuyển kho dựa vào chúng để sinh phiếu nhập kho đích.
        boolean systemExport = !importDocument && doc.getIssuePurpose() != null
                && !VALID_MANUAL_EXPORT_PURPOSES.contains(doc.getIssuePurpose());
        if (systemExport) {
            if (issuePurpose != null && !issuePurpose.equals(doc.getIssuePurpose())) {
                throw new BusinessException(SystemMessage.INV_ERR_039.getMessage());
            }
        } else if (issuePurpose != null && !importDocument) {
            // Khi cập nhật phiếu, cũng chỉ cho phép các mục đích thủ công
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
        Long soId = com.duylongtech.backend.enums.ReferenceType.resolveEffectiveSalesOrderId(
                req.getSalesOrderId(), req.getReferenceType(), req.getReferenceId());
        Long poId = com.duylongtech.backend.enums.ReferenceType.resolveEffectivePurchaseOrderId(
                req.getPurchaseOrderId(), req.getReferenceType(), req.getReferenceId());

        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(poId);
        doc.setSalesOrderId(soId);
        doc.setPartnerId(req.getPartnerId());
        if (!systemExport) {
            doc.setIssuePurpose(normalizeOptionalReference(req.getIssuePurpose()));
            doc.setReferenceType(normalizeOptionalReference(req.getReferenceType()));
            doc.setReferenceId(req.getReferenceId());
        }
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
        if (isManagedInventoryDocument(doc)) {
            throw new BusinessException("Phiếu kho tự động của lệnh kỹ thuật không được sửa trực tiếp");
        }
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

        // Mirrors toImportLineEntity() below - without this, expectedQuantity/
        // rejectedQuantity/discrepancyReason from the request were silently
        // dropped, so detectAndRecordDiscrepancy() never had anything to compare
        // quantityOut against for manually created/edited export slips.
        BigDecimal expectedQty = lr.getExpectedQuantity() != null && lr.getExpectedQuantity().compareTo(ZERO) > 0
                ? lr.getExpectedQuantity()
                : quantityOut;
        BigDecimal rejectedQty = lr.getRejectedQuantity() != null ? lr.getRejectedQuantity() : ZERO;
        String discrepancyReason = trimToNull(lr.getDiscrepancyReason());

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
        line.setExpectedQuantity(expectedQty);
        line.setRejectedQuantity(rejectedQty);
        line.setDiscrepancyReason(discrepancyReason);
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

    // Kept in sync with InventoryPostingService.parseSerialNumbers() - serials are
    // commonly comma-separated on one line, not just one per line.
    private List<String> parseSerialNumbers(String serialNumbersText) {
        String normalized = trimToNull(serialNumbersText);
        if (normalized == null) {
            return List.of();
        }
        return List.of(normalized.split("[,;\\s\\n]+"))
                .stream()
                .map(this::trimToNull)
                .filter(value -> value != null)
                .distinct()
                .toList();
    }

    private InventoryDocumentResponse toResponse(InventoryDocument doc) {
        return toResponse(doc, false);
    }

    private record SoLineRemaining(SalesOrderLine line, BigDecimal remaining) {
    }

    // Một SO có thể có các dòng xuất từ nhiều kho khác nhau (SalesOrderLine.warehouseId) -
    // sinh riêng 1 phiếu xuất DRAFT cho mỗi kho thay vì gộp chung vào 1 phiếu như trước, để
    // thủ kho mỗi kho chỉ thấy và ghi sổ đúng phần việc của kho mình.
    @Transactional
    public List<InventoryDocumentResponse> createExportFromSalesOrder(Long soId, Long actorUserId) {
        SalesOrder so = salesOrderRepository.findById(soId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn hàng SO " + soId));
        if (!DocumentStatus.APPROVED.name().equals(so.getStatus())) {
            throw new BusinessException(SystemMessage.INV_ERR_002.getMessage());
        }

        // Phần còn thiếu tính theo (sản phẩm, kho) và trừ cả phiếu nháp đã tạo, để bấm nút 2 lần không sinh
        // ra hai phiếu cùng xuất một phần hàng.
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(so.getLines(), so.getWarehouseId(),
                inventoryDocumentLineRepository.sumExportedBySalesOrder(so.getId(), null));
        Map<SalesOrderFulfillment.Group, BigDecimal> leftByGroup = new java.util.IdentityHashMap<>();

        Map<Long, List<SoLineRemaining>> linesByWarehouse = new java.util.LinkedHashMap<>();
        for (SalesOrderLine soLine : so.getLines()) {
            SalesOrderFulfillment.Group progress = fulfillment.forLine(soLine);
            if (progress == null) {
                continue;
            }
            // Nhiều dòng SO có thể rơi vào cùng một nhóm (cùng sản phẩm, cùng kho): chia dần phần còn lại
            // cho từng dòng thay vì cho mỗi dòng nhận trọn phần còn lại của nhóm.
            BigDecimal groupLeft = leftByGroup.computeIfAbsent(progress, SalesOrderFulfillment.Group::remainingToAllocate);
            BigDecimal remaining = soLine.getQuantity().min(groupLeft);
            if (remaining.compareTo(ZERO) <= 0) {
                continue;
            }
            leftByGroup.put(progress, groupLeft.subtract(remaining));
            Long lineWarehouseId = soLine.getWarehouseId() != null ? soLine.getWarehouseId() : so.getWarehouseId();
            linesByWarehouse.computeIfAbsent(lineWarehouseId, k -> new java.util.ArrayList<>())
                    .add(new SoLineRemaining(soLine, remaining));
        }

        if (linesByWarehouse.isEmpty()) {
            throw new BusinessException(SystemMessage.INV_ERR_001.getMessage());
        }

        List<InventoryDocumentResponse> results = new java.util.ArrayList<>();
        for (Map.Entry<Long, List<SoLineRemaining>> entry : linesByWarehouse.entrySet()) {
            InventoryDocument doc = new InventoryDocument();
            doc.initExportDocument(resolveCreateDocCode(null));
            doc.setDocDate(LocalDate.now());
            doc.setPartnerId(so.getPartnerId());
            doc.setWarehouseId(entry.getKey());
            doc.setReferenceType("SALES_ORDER");
            doc.setReferenceId(so.getId());
            doc.setSalesOrderId(so.getId());
            doc.assignCreator(actorUserId);
            doc.updateStatus(DEFAULT_STATUS);
            doc.setIssuePurpose(ISSUE_PURPOSE_SALES);

            for (SoLineRemaining lr : entry.getValue()) {
                SalesOrderLine soLine = lr.line();
                InventoryDocumentLine line = new InventoryDocumentLine();
                line.setInventoryDocument(doc);
                line.setVariantId(soLine.getVariantId());
                line.setQuantityOut(lr.remaining());
                line.setQuantityIn(ZERO);
                line.setUnitCost(ZERO);
                line.setUnitPrice(soLine.getUnitPrice());
                line.setVatRate(soLine.getVatRate());
                line.setVatPercent(soLine.getVatRate());
                line.setWarrantyMonths(soLine.getWarrantyMonths());
                line.setNote(soLine.getNote());
                doc.addExportLine(line);
            }

            // saveAndFlush ngay trong vòng lặp: resolveCreateDocCode() sinh mã kế tiếp bằng
            // cách query lại DB (findAllExportDocCodes) - không flush trước thì phiếu tiếp
            // theo trong cùng vòng lặp này có thể sinh trùng docCode với phiếu vừa tạo.
            InventoryDocument saved = inventoryDocumentRepository.saveAndFlush(doc);
            notifyWarehouseOfNewDocument(saved, EXPORT_DOC_TYPE);
            results.add(toResponse(saved));
        }

        return results;
    }

    /**
     * Nhập đa kho từ 1 PO: tạo phiếu nhập kho DRAFT cho ĐÚNG 1 kho đích, chỉ gồm các dòng PO
     * thuộc kho đó (dòng PO chưa gán kho được tính cho mọi kho). Số lượng gợi ý dùng đúng công
     * thức "PO line qty - sum(đã nhập ở mọi phiếu/mọi kho)" mà postImport() dùng để tính
     * fullyImported. quantityIn được set bằng luôn remaining (không để trống) vì createImport()
     * bắt buộc quantityIn > 0 - thủ kho tự điều chỉnh lại theo hàng thực nhận trước khi ghi sổ.
     */
    @Transactional
    public InventoryDocumentResponse createBackorderForPO(Long poId, Long warehouseId, Long currentUserId) {
        if (currentUserId == null) {
            throw new BusinessException("Không xác định được người tạo phiếu");
        }
        warehouseAccessGuard.checkAccess(warehouseId);
        PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(poId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đơn mua hàng ID: " + poId));

        if (inventoryDocumentRepository.existsByPurchaseOrderIdAndWarehouseIdAndIssuePurposeAndStatusIn(
                poId, warehouseId, ISSUE_PURPOSE_PURCHASE, OPEN_DOCUMENT_STATUSES)) {
            throw new BusinessException("Đơn mua hàng " + po.getPoCode() + " đã có phiếu nhập kho đang chờ xử lý cho kho này.");
        }

        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(po.getLines(),
                inventoryDocumentLineRepository.sumReceivedByPurchaseOrder(poId, null));
        List<InventoryDocumentLineRequest> lineRequests = new java.util.ArrayList<>();
        java.util.Set<PurchaseOrderReceiving.Group> handledGroups = new java.util.HashSet<>();
        for (PurchaseOrderLine poLine : po.getLines()) {
            if (poLine.getWarehouseId() != null && !poLine.getWarehouseId().equals(warehouseId)) {
                continue;
            }
            PurchaseOrderReceiving.Group progress = receiving.forLine(poLine);
            // Nhiều dòng PO cùng (sản phẩm, kho) dùng chung 1 nhóm: chỉ tạo 1 dòng phiếu cho cả nhóm.
            if (!handledGroups.add(progress)) {
                continue;
            }
            BigDecimal remaining = progress.remainingToAllocate();
            if (remaining.compareTo(ZERO) <= 0) {
                continue;
            }

            InventoryDocumentLineRequest lr = new InventoryDocumentLineRequest();
            lr.setVariantId(poLine.getVariantId());
            lr.setQuantityIn(remaining);
            lr.setExpectedQuantity(remaining);
            lr.setUnitCost(poLine.getUnitPrice());
            lr.setVatRate(poLine.getVatRate());
            lr.setVatPercent(poLine.getVatRate());
            lr.setWarehouseId(warehouseId);
            lineRequests.add(lr);
        }

        if (lineRequests.isEmpty()) {
            throw new BusinessException("Đơn mua hàng " + po.getPoCode() + " không còn số lượng cần nhập cho kho này.");
        }

        InventoryDocumentRequest req = new InventoryDocumentRequest();
        req.setPurchaseOrderId(poId);
        req.setPartnerId(po.getPartnerId());
        req.setWarehouseId(warehouseId);
        req.setIssuePurpose(ISSUE_PURPOSE_PURCHASE);
        req.setReferenceType("PURCHASE_ORDER");
        req.setReferenceId(poId);
        req.setDocDate(LocalDate.now());
        req.setCreatedBy(currentUserId);
        req.setNote("Nhập hàng cho Đơn mua hàng " + po.getPoCode());
        req.setLines(lineRequests);

        InventoryDocumentResponse created = createImport(req);
        log.info("Đã tạo phiếu nhập kho {} (kho {}) cho đơn mua hàng {}", created.getDocCode(), warehouseId, po.getPoCode());
        return created;
    }

    /**
     * Tạo (và để caller POST) phiếu xuất kho linh kiện cho 1 lệnh sửa chữa.
     * Trả về null nếu phiếu đã tồn tại (idempotent - repair có thể retry bước DONE)
     * hoặc không có dòng nào hợp lệ.
     */
    @Transactional
    public Long createExportForRepair(Long repairId, String repairCode, Long warehouseId, Long partnerId,
            Long createdBy, Long salespersonId, String recipientName, List<RepairStockOutLineRequest> lines) {
        if (inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("REPAIR", repairId, EXPORT_DOC_TYPE)) {
            return null;
        }

        InventoryDocument exportDoc = new InventoryDocument();
        exportDoc.initExportDocument(resolveCreateDocCode(null));
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
            if (lr.serialNumberId() != null
                    && inventoryDocumentLineRepository.isSerialLockedInDrafts(lr.serialNumberId(), null)) {
                throw new BusinessException("Serial đã được giữ cho một phiếu xuất kho khác");
            }
            InventoryDocumentLine docLine = new InventoryDocumentLine();
            docLine.setInventoryDocument(exportDoc);
            docLine.setVariantId(lr.componentVariantId());
            docLine.setQuantityIn(ZERO);
            docLine.setQuantityOut(lr.quantity());
            docLine.setUnitCost(ZERO);
            docLine.setUnitPrice(ZERO);
            docLine.setLineAmount(ZERO);
            docLine.setSerialNumberId(lr.serialNumberId());
            docLine.setSerialNumbersText(lr.serialNumberText());
            docLine.setRepairLineId(lr.repairLineId());
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
        if (inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("REPAIR", repairId, IMPORT_DOC_TYPE)) {
            return null;
        }

        InventoryDocument scrapDoc = new InventoryDocument();
        scrapDoc.initImportDocument(resolveCreateImportDocCode(null));
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
            scrapLine.setRepairLineId(lr.repairLineId());
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
        boolean hideAssemblyCost = "ASSEMBLY_ORDER".equalsIgnoreCase(trimToNull(doc.getReferenceType()))
                && !hasAnyAuthority("ROLE_ACCOUNTANT", "ROLE_MANAGER", "ROLE_SUPER_ADMIN");
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
                if (hideAssemblyCost) {
                    lr.setUnitCost(null);
                    lr.setUnitPrice(null);
                    lr.setLineAmount(null);
                }
                return lr;
            }).collect(Collectors.toList());
            r.setLines(lines);
        }

        List<InventoryDocumentReference> refs = inventoryDocumentReferenceRepository.findByInventoryDocumentId(doc.getId());
        if (!refs.isEmpty()) {
            List<InventoryDocumentReferenceResponse> refResponses = refs.stream().map(ref -> {
                InventoryDocumentReferenceResponse rr = new InventoryDocumentReferenceResponse();
                rr.setId(ref.getId());
                rr.setReferenceDocId(ref.getReferenceDocId());
                rr.setReferenceType(ref.getReferenceType());
                rr.setCreatedAt(ref.getCreatedAt());
                inventoryDocumentRepository.findById(ref.getReferenceDocId())
                        .ifPresent(refDoc -> rr.setReferenceDocCode(refDoc.getDocCode()));
                return rr;
            }).collect(Collectors.toList());
            r.setReferences(refResponses);
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

    // Unposting used to just flip the same document back to DRAFT/UNPOSTED and
    // let the user edit and re-post it in place, losing any record of what the
    // document looked like before. It now cancels the old document for good and
    // returns a fresh DRAFT clone referencing it, so the old row stays as history.
    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId) {
        InventoryDocument source = inventoryDocumentRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu nhập kho"));
        rejectRepairUnpost(source);
        inventoryPostingService.unpostImport(id, reason, currentUserId);
        inventoryDocumentRepository.findById(id).ifPresent(this::synchronizeAssemblyOrder);

        InventoryDocument old = inventoryDocumentRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu nhập kho"));
        if ("ASSEMBLY_ORDER".equalsIgnoreCase(trimToNull(old.getReferenceType()))) {
            return toResponse(old, true);
        }
        old.cancelAfterUnpost();
        inventoryDocumentRepository.save(old);

        InventoryDocument reissued = cloneAsDraft(old, IMPORT_DOC_TYPE, currentUserId);
        reissued = inventoryDocumentRepository.save(reissued);
        linkReissuedDocument(reissued, old);

        logReissueAudit(currentUserId, reissued, old);
        return toResponse(reissued, true);
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId) {
        InventoryDocument source = inventoryDocumentRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu xuất kho"));
        rejectRepairUnpost(source);
        inventoryPostingService.unpostExport(id, reason, currentUserId);
        inventoryDocumentRepository.findById(id).ifPresent(this::synchronizeAssemblyOrder);

        InventoryDocument old = inventoryDocumentRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu xuất kho"));
        if ("ASSEMBLY_ORDER".equalsIgnoreCase(trimToNull(old.getReferenceType()))) {
            return toResponse(old, true);
        }
        old.cancelAfterUnpost();
        inventoryDocumentRepository.save(old);

        InventoryDocument reissued = cloneAsDraft(old, EXPORT_DOC_TYPE, currentUserId);
        reissued = inventoryDocumentRepository.save(reissued);
        linkReissuedDocument(reissued, old);

        logReissueAudit(currentUserId, reissued, old);
        return toResponse(reissued, true);
    }

    // Copies the header fields and every line from `original` into a brand-new
    // DRAFT document (fresh id/docCode). purchaseOrderId/salesOrderId/referenceId/
    // referenceType are copied forward on purpose - they describe where the
    // document originally came from (a 1:1 provenance fact), which unposting and
    // reissuing doesn't change, unlike the 1:N reference row added separately in
    // linkReissuedDocument() that records *this specific reissue*.
    private InventoryDocument cloneAsDraft(InventoryDocument original, String docType, Long currentUserId) {
        InventoryDocument clone = new InventoryDocument();
        if (EXPORT_DOC_TYPE.equals(docType)) {
            clone.initExportDocument(resolveCreateDocCode(null));
        } else {
            clone.initImportDocument(resolveCreateImportDocCode(null));
        }
        clone.setIssuePurpose(original.getIssuePurpose());
        clone.setReferenceType(original.getReferenceType());
        clone.setReferenceId(original.getReferenceId());
        clone.setWarehouseId(original.getWarehouseId());
        clone.setSourceWarehouseId(original.getSourceWarehouseId());
        clone.setPurchaseOrderId(original.getPurchaseOrderId());
        clone.setSalesOrderId(original.getSalesOrderId());
        clone.setPartnerId(original.getPartnerId());
        clone.setDocDate(original.getDocDate());
        clone.setNote(original.getNote());
        clone.setRecipientName(original.getRecipientName());
        clone.setRecipientAddress(original.getRecipientAddress());
        clone.setSalespersonId(original.getSalespersonId());
        clone.updateStatus(DocumentStatus.DRAFT.name());
        clone.assignCreator(currentUserId);

        for (InventoryDocumentLine sourceLine : original.getLines()) {
            InventoryDocumentLine line = new InventoryDocumentLine();
            line.setVariantId(sourceLine.getVariantId());
            line.setQuantityIn(sourceLine.getQuantityIn());
            line.setQuantityOut(sourceLine.getQuantityOut());
            line.setUnitCost(sourceLine.getUnitCost());
            line.setUnitPrice(sourceLine.getUnitPrice());
            line.setVatRate(sourceLine.getVatRate());
            line.setVatPercent(sourceLine.getVatPercent());
            line.setLotBatchId(sourceLine.getLotBatchId());
            // Not sourceLine.getSerialNumberId(): unpostImport already deletes the
            // SerialNumber rows generated for import lines, so that FK would dangle.
            // The raw text is kept as a reference for whoever edits this draft.
            line.setSerialNumbersText(sourceLine.getSerialNumbersText());
            line.setRepairLineId(sourceLine.getRepairLineId());
            line.setNote(sourceLine.getNote());
            line.setWarrantyMonths(sourceLine.getWarrantyMonths());
            line.setWarehouseId(sourceLine.getWarehouseId());
            line.setTargetWarehouseId(sourceLine.getTargetWarehouseId());
            line.setExpectedQuantity(sourceLine.getExpectedQuantity());
            line.setRejectedQuantity(sourceLine.getRejectedQuantity());
            line.setDiscrepancyReason(sourceLine.getDiscrepancyReason());
            line.setUnitId(sourceLine.getUnitId());
            line.setBaseUnitId(sourceLine.getBaseUnitId());
            line.setConversionOperator(sourceLine.getConversionOperator());
            line.setConversionRatio(sourceLine.getConversionRatio());
            line.setBaseQuantity(sourceLine.getBaseQuantity());

            if (EXPORT_DOC_TYPE.equals(docType)) {
                clone.addExportLine(line);
            } else {
                clone.addImportLine(line);
            }
        }
        return clone;
    }

    private void linkReissuedDocument(InventoryDocument reissued, InventoryDocument old) {
        InventoryDocumentReference ref = new InventoryDocumentReference();
        ref.setInventoryDocument(reissued);
        ref.setReferenceDocId(old.getId());
        ref.setReferenceType("UNPOST_SOURCE");
        inventoryDocumentReferenceRepository.save(ref);
    }

    private void logReissueAudit(Long currentUserId, InventoryDocument reissued, InventoryDocument old) {
        try {
            String username = currentUserId != null
                    ? userRepository.findById(currentUserId).map(User::getUsername).orElse(null)
                    : null;
            auditLogService.logEvent(username, "REISSUE_AFTER_UNPOST", "InventoryDocument", reissued.getId(),
                    "SUCCESS",
                    "Tạo phiếu " + reissued.getDocCode() + " thay thế phiếu " + old.getDocCode() + " sau khi bỏ ghi sổ",
                    null, null);
        } catch (Exception ignored) {
        }
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

    private boolean isManagedInventoryDocument(InventoryDocument document) {
        String referenceType = trimToNull(document.getReferenceType());
        return "ASSEMBLY_ORDER".equalsIgnoreCase(referenceType)
                || "REPAIR".equalsIgnoreCase(referenceType);
    }

    private boolean isRepairInventoryDocument(InventoryDocument document) {
        return "REPAIR".equalsIgnoreCase(trimToNull(document.getReferenceType()));
    }

    /**
     * Repair exports already own held FIFO allocations. Warehouse staff may attach
     * physical serials, but replacing the lines would cascade-delete those holds.
     */
    private InventoryDocumentResponse updateManagedExportSerials(InventoryDocument doc, InventoryDocumentRequest req) {
        String status = normalizeStatusValue(doc.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException(SystemMessage.INV_ERR_014.getMessage());
        }
        String orderLabel = isRepairInventoryDocument(doc) ? "sửa chữa" : "lắp ráp";
        if (!java.util.Objects.equals(doc.getWarehouseId(), req.getWarehouseId())) {
            throw new BusinessException("Không được thay đổi kho của phiếu xuất " + orderLabel);
        }
        if (req.getLines() == null || req.getLines().size() != doc.getLines().size()) {
            throw new BusinessException("Không được thêm hoặc xóa dòng trên phiếu xuất " + orderLabel);
        }

        for (int i = 0; i < doc.getLines().size(); i++) {
            InventoryDocumentLine existing = doc.getLines().get(i);
            InventoryDocumentLineRequest requested = req.getLines().get(i);
            BigDecimal requestedQuantity = requested.getBaseQuantity() != null
                    && requested.getBaseQuantity().compareTo(ZERO) > 0
                    ? requested.getBaseQuantity()
                    : requested.getQuantityOut();
            if (!java.util.Objects.equals(existing.getVariantId(), requested.getVariantId())
                    || requestedQuantity == null
                    || existing.getQuantityOut() == null
                    || existing.getQuantityOut().compareTo(requestedQuantity) != 0) {
                throw new BusinessException("Không được thay đổi mã hàng hoặc số lượng đã giữ FIFO");
            }

            InventoryDocumentLine validated = toExportLineEntity(doc, requested, i);
            existing.setSerialNumberId(validated.getSerialNumberId());
            existing.setSerialNumbersText(validated.getSerialNumbersText());
            existing.setNote(requested.getNote());
        }

        doc.setDocDate(req.getDocDate());
        doc.setNote(req.getNote());
        doc.setRecipientName(req.getRecipientName());
        doc.setRecipientAddress(req.getRecipientAddress());
        doc.setSalespersonId(req.getSalespersonId());
        doc.setUpdatedAt(LocalDateTime.now());
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    /**
     * Phiếu nhập tự sinh của lệnh lắp ráp / tháo dỡ: giá vốn thành phẩm đã được tính theo phiếu xuất linh kiện của cùng
     * lệnh (AssemblyOrderWorkflowService.synchronizeReservedCosts), nên chỉ cho ghi serial, ngày, ghi chú; không đổi
     * mã hàng, số lượng, kho hay đơn giá, không thêm/xóa dòng.
     */
    private InventoryDocumentResponse updateManagedImportSerials(InventoryDocument doc, InventoryDocumentRequest req) {
        String status = normalizeStatusValue(doc.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException(SystemMessage.INV_ERR_014.getMessage());
        }
        if (!java.util.Objects.equals(doc.getWarehouseId(), req.getWarehouseId())) {
            throw new BusinessException("Không được thay đổi kho của phiếu nhập lắp ráp");
        }
        if (req.getLines() == null || req.getLines().size() != doc.getLines().size()) {
            throw new BusinessException("Không được thêm hoặc xóa dòng trên phiếu nhập lắp ráp");
        }

        for (int i = 0; i < doc.getLines().size(); i++) {
            InventoryDocumentLine existing = doc.getLines().get(i);
            InventoryDocumentLineRequest requested = req.getLines().get(i);
            BigDecimal requestedQuantity = requested.getBaseQuantity() != null
                    && requested.getBaseQuantity().compareTo(ZERO) > 0
                    ? requested.getBaseQuantity()
                    : requested.getQuantityIn();
            BigDecimal existingQuantity = existing.getBaseQuantity() != null
                    && existing.getBaseQuantity().compareTo(ZERO) > 0
                    ? existing.getBaseQuantity()
                    : existing.getQuantityIn();
            Long requestedWarehouseId = requested.getWarehouseId() != null ? requested.getWarehouseId() : req.getWarehouseId();
            Long existingWarehouseId = existing.getWarehouseId() != null ? existing.getWarehouseId() : doc.getWarehouseId();
            if (!java.util.Objects.equals(existing.getVariantId(), requested.getVariantId())
                    || !java.util.Objects.equals(existingWarehouseId, requestedWarehouseId)
                    || requestedQuantity == null
                    || existingQuantity == null
                    || existingQuantity.compareTo(requestedQuantity) != 0) {
                throw new BusinessException("Không được thay đổi mã hàng, kho hoặc số lượng của phiếu nhập lắp ráp");
            }

            existing.setSerialNumberId(requested.getSerialNumberId());
            existing.setSerialNumbersText(formatSerialNumbers(requested.getSerialNumbers()));
            existing.setNote(requested.getNote());
        }

        doc.setDocDate(req.getDocDate());
        doc.setNote(req.getNote());
        doc.setRecipientName(req.getRecipientName());
        doc.setRecipientAddress(req.getRecipientAddress());
        doc.setUpdatedAt(LocalDateTime.now());
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    /** Keeps the generated repair/import lines intact while recording actual scrap receipt. */
    private InventoryDocumentResponse updateRepairImportReceipt(InventoryDocument doc, InventoryDocumentRequest req) {
        String status = normalizeStatusValue(doc.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException(SystemMessage.INV_ERR_014.getMessage());
        }
        if (!java.util.Objects.equals(doc.getWarehouseId(), req.getWarehouseId())) {
            throw new BusinessException("Không được thay đổi kho phế liệu của lệnh sửa chữa");
        }
        if (req.getLines() == null || req.getLines().size() != doc.getLines().size()) {
            throw new BusinessException("Không được thêm hoặc xóa dòng trên phiếu nhập phế liệu");
        }

        for (int i = 0; i < doc.getLines().size(); i++) {
            InventoryDocumentLine existing = doc.getLines().get(i);
            InventoryDocumentLineRequest requested = req.getLines().get(i);
            Long requestedWarehouseId = requested.getWarehouseId() != null
                    ? requested.getWarehouseId() : req.getWarehouseId();
            Long existingWarehouseId = existing.getWarehouseId() != null
                    ? existing.getWarehouseId() : doc.getWarehouseId();
            if (!java.util.Objects.equals(existing.getVariantId(), requested.getVariantId())
                    || !java.util.Objects.equals(existingWarehouseId, requestedWarehouseId)) {
                throw new BusinessException("Không được thay đổi mã hàng hoặc kho của phiếu nhập phế liệu");
            }

            InventoryDocumentLine validated = toImportLineEntity(doc, requested, i);
            existing.setQuantityIn(validated.getQuantityIn());
            existing.setBaseQuantity(validated.getBaseQuantity());
            existing.setSerialNumberId(validated.getSerialNumberId());
            existing.setSerialNumbersText(validated.getSerialNumbersText());
            existing.setNote(requested.getNote());
        }

        doc.setDocDate(req.getDocDate());
        doc.setNote(req.getNote());
        doc.setRecipientName(req.getRecipientName());
        doc.setRecipientAddress(req.getRecipientAddress());
        doc.setUpdatedAt(LocalDateTime.now());
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    private void rejectRepairUnpost(InventoryDocument document) {
        if ("REPAIR".equalsIgnoreCase(trimToNull(document.getReferenceType()))) {
            throw new BusinessException("Phiếu kho sửa chữa đã ghi sổ không được phép bỏ ghi sổ");
        }
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
        InventoryDocument exportDoc = pair.stream().filter(d -> EXPORT_DOC_TYPE.equals(d.getDocType())).findFirst().orElse(null);
        InventoryDocument importDoc = pair.stream().filter(d -> IMPORT_DOC_TYPE.equals(d.getDocType())).findFirst().orElse(null);
        
        boolean exportPosted = exportDoc != null && DocumentStatus.POSTED.name().equals(exportDoc.getStatus());
        boolean importPosted = importDoc != null && DocumentStatus.POSTED.name().equals(importDoc.getStatus());
        
        if (exportPosted && importDoc != null && !importPosted && EXPORT_DOC_TYPE.equals(document.getDocType())) {
            // Tự động tính toán và cập nhật giá nhập kho dựa trên tổng giá trị đã xuất kho
            BigDecimal totalExportCost = BigDecimal.ZERO;
            for (InventoryDocumentLine expLine : exportDoc.getLines()) {
                BigDecimal qty = expLine.getQuantityOut() != null ? expLine.getQuantityOut() : BigDecimal.ZERO;
                BigDecimal cost = expLine.getUnitCost() != null ? expLine.getUnitCost() : BigDecimal.ZERO;
                totalExportCost = totalExportCost.add(qty.multiply(cost));
            }
            if ("ASSEMBLY".equals(order.getOrderType()) && importDoc.getLines().size() == 1) {
                InventoryDocumentLine impLine = importDoc.getLines().get(0);
                BigDecimal impQty = impLine.getBaseQuantity() != null && impLine.getBaseQuantity().compareTo(BigDecimal.ZERO) > 0 ? impLine.getBaseQuantity() : (impLine.getQuantityIn() != null ? impLine.getQuantityIn() : BigDecimal.ONE);
                if (impQty.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal unitCost = totalExportCost.divide(impQty, 4, RoundingMode.HALF_UP);
                    impLine.setUnitCost(unitCost);
                    impLine.setUnitPrice(unitCost);
                }
            } else if ("DISASSEMBLY".equals(order.getOrderType()) && !importDoc.getLines().isEmpty()) {
                // Tháo dỡ: Chia đều giá trị hoặc lấy theo tỷ trọng (ở đây tạm chia theo số lượng linh kiện để đơn giản)
                BigDecimal totalImportQty = importDoc.getLines().stream()
                        .map(l -> l.getBaseQuantity() != null && l.getBaseQuantity().compareTo(BigDecimal.ZERO) > 0 ? l.getBaseQuantity() : (l.getQuantityIn() != null ? l.getQuantityIn() : BigDecimal.ONE))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                if (totalImportQty.compareTo(BigDecimal.ZERO) > 0) {
                    for (InventoryDocumentLine impLine : importDoc.getLines()) {
                        BigDecimal qty = impLine.getBaseQuantity() != null && impLine.getBaseQuantity().compareTo(BigDecimal.ZERO) > 0 ? impLine.getBaseQuantity() : (impLine.getQuantityIn() != null ? impLine.getQuantityIn() : BigDecimal.ONE);
                        BigDecimal allocatedCost = totalExportCost.multiply(qty).divide(totalImportQty, 4, RoundingMode.HALF_UP);
                        BigDecimal unitCost = allocatedCost.divide(qty, 4, RoundingMode.HALF_UP);
                        impLine.setUnitCost(unitCost);
                        impLine.setUnitPrice(unitCost);
                    }
                }
            }
            inventoryDocumentRepository.save(importDoc);
        }

        order.synchronizeInventoryState(exportPosted, importPosted);
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
