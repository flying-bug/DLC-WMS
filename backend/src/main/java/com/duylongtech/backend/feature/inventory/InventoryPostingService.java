package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.SerialNumberStatus;
import com.duylongtech.backend.enums.WarrantyStatus;
import com.duylongtech.backend.exception.BusinessException;
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
import com.duylongtech.backend.feature.inventory.InventoryLedger;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
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
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderReceiving;
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
import com.duylongtech.backend.feature.stocktake.StocktakeLockGuard;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warranty.WarrantyLifecycleService;
import com.duylongtech.backend.feature.warranty.WarrantyLine;
import com.duylongtech.backend.feature.warranty.WarrantyLineRequest;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;

@Service
@RequiredArgsConstructor
public class InventoryPostingService {

    private final CodeGeneratorService codeGeneratorService;
    private final InventoryDocumentMapper inventoryDocumentMapper;

    private static final String EXPORT_DOC_TYPE = "EX_SO";
    private static final String IMPORT_DOC_TYPE = "IN_PO";
    private static final String DEFAULT_STATUS = DocumentStatus.DRAFT.name();
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), DocumentStatus.APPROVED.name(), DocumentStatus.POSTED.name(), DocumentStatus.CANCELLED.name(),
            DocumentStatus.UNPOSTED.name());
    private static final Set<String> EDITABLE_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), DocumentStatus.UNPOSTED.name());

    // Phân loại phiếu xuất kho thủ công (do người dùng tạo)
    public static final String ISSUE_PURPOSE_SALES = "SALES"; // Xuất kho bán hàng – tự sinh bảo hành
    public static final String ISSUE_PURPOSE_USAGE = "USAGE"; // Xuất kho sử dụng nội bộ – không sinh bảo hành
    public static final String ISSUE_PURPOSE_ASSEMBLY = "ASSEMBLY"; // Xuất kho lắp ráp/tháo dỡ
    public static final String ISSUE_PURPOSE_REPAIR = "REPAIR"; // Xuất kho sửa chữa

    // Phân loại phiếu xuất/nhập kho tự động từ module Chuyển kho
    public static final String ISSUE_PURPOSE_TRANSFER_OUT = "TRANSFER_EXPORT"; // Xuất kho chuyển đi
    public static final String ISSUE_PURPOSE_TRANSFER_IN = "TRANSFER_IMPORT"; // Nhập kho từ chuyển về
    public static final String ISSUE_PURPOSE_INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT"; // Xử lý chênh lệch kiểm kê

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
    private final InventoryCostAllocationService inventoryCostAllocationService;
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
    private final com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard warehouseAccessGuard;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final StocktakeLockGuard stocktakeLockGuard;

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse postExport(Long id) {
        InventoryDocument doc = findExportOrThrow(id);
        exportWarehouseIds(doc).forEach(warehouseAccessGuard::checkAccess);
        if (!doc.isPostable()) {
            throw new BusinessException(SystemMessage.INV_ERR_046.getMessage());
        }
        new StocktakeAdjustmentGuard(inventoryDocumentRepository, stocktakeRepository).assertCanPost(doc);

        List<com.duylongtech.backend.feature.warranty.WarrantyLineRequest> warrantyLines = new java.util.ArrayList<>();

        for (InventoryDocumentLine line : doc.getLines()) {
            Long effectiveWarehouseId = line.getWarehouseId() != null ? line.getWarehouseId() : doc.getWarehouseId();
            if (effectiveWarehouseId == null) {
                throw new BusinessException("Dòng sản phẩm chưa được chọn kho xuất");
            }
            stocktakeLockGuard.assertWarehouseNotLocked(effectiveWarehouseId, doc.getReferenceType(), doc.getReferenceId());
            BigDecimal qtyToExport = line.getBaseQuantity() != null && line.getBaseQuantity().compareTo(ZERO) > 0
                    ? line.getBaseQuantity()
                    : line.getQuantityOut();
            List<SerialNumber> serialsToExport = new java.util.ArrayList<>();
            ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);

            Long targetSerialId = line.getSerialNumberId();
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                List<String> serials = parseSerialNumbers(line.getSerialNumbersText());
                List<String> notFoundSerials = new java.util.ArrayList<>();
                for (String sn : serials) {
                    Optional<SerialNumber> found = serialNumberRepository
                            .findByVariantIdAndSerialNumberForUpdate(line.getVariantId(), sn);
                    if (found.isPresent()) {
                        serialsToExport.add(found.get());
                    } else {
                        notFoundSerials.add(sn);
                    }
                }
                if (!notFoundSerials.isEmpty()) {
                    String skuLabel = variant != null ? variant.getSku() : String.valueOf(line.getVariantId());
                    throw new BusinessException(String.format(
                            "Serial %s không tồn tại hoặc không thuộc sản phẩm SKU: %s. Vui lòng kiểm tra lại.",
                            String.join(", ", notFoundSerials), skuLabel));
                }
                if (!serialsToExport.isEmpty() && targetSerialId == null) {
                    line.setSerialNumberId(serialsToExport.get(0).getId());
                }
            } else if (targetSerialId != null) {
                SerialNumber snObj = serialNumberRepository.findByIdForUpdate(targetSerialId)
                        .orElseThrow(() -> new BusinessException("Không tìm thấy serial cần xuất"));
                serialsToExport.add(snObj);
            }

            for (SerialNumber snObj : serialsToExport) {
                if (!SerialNumberStatus.AVAILABLE.name().equals(snObj.getStatus())) {
                    throw new BusinessException(String.format(SystemMessage.INV_ERR_045.getMessage(),
                            snObj.getSerialNumber(), snObj.getStatus()));
                }
                if (!effectiveWarehouseId.equals(snObj.getWarehouseId())) {
                    throw new BusinessException(
                            String.format(SystemMessage.INV_ERR_044.getMessage(), snObj.getSerialNumber()));
                }
                if (!line.getVariantId().equals(snObj.getVariantId())) {
                    throw new BusinessException(
                            String.format(SystemMessage.INV_ERR_043.getMessage(), snObj.getSerialNumber()));
                }
                ensureSerialNotInstalledInPc(snObj, doc);
            }

            if (variant != null && variant.getProduct() != null
                    && Boolean.TRUE.equals(variant.getProduct().getTrackSerial())) {
                int expected = line.getQuantityOut().stripTrailingZeros().intValueExact();
                if (serialsToExport.size() != expected) {
                    throw new BusinessException(
                            String.format(SystemMessage.INV_ERR_042.getMessage(), variant.getSku(), expected));
                }
            }

            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null || balance.getQuantityOnHand().compareTo(ZERO) <= 0) {
                List<InventoryBalance> balances = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId());
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null || balance.getQuantityOnHand().compareTo(qtyToExport) < 0) {
                String productDisplayName = variant != null && variant.getProduct() != null
                        ? variant.getProduct().getProductName()
                        : variant != null ? variant.getVariantName() : null;
                if (productDisplayName == null || productDisplayName.isBlank()) {
                    productDisplayName = variant != null && variant.getSku() != null
                            ? variant.getSku()
                            : String.valueOf(line.getVariantId());
                }
                throw new BusinessException(String.format(SystemMessage.INV_ERR_041.getMessage(), productDisplayName));
            }

            balance.setQuantityOnHand(balance.getQuantityOnHand().subtract(qtyToExport));
            balance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);

            boolean reservationRequired = doc.getReferenceId() != null
                    && ("ASSEMBLY_ORDER".equalsIgnoreCase(doc.getReferenceType())
                            || "REPAIR".equalsIgnoreCase(doc.getReferenceType()));
            BigDecimal totalCost = inventoryCostAllocationService.consumeForPosting(
                    doc, line, qtyToExport, reservationRequired);

            BigDecimal avgUnitCost = totalCost.divide(qtyToExport, 4, RoundingMode.HALF_UP);
            line.setUnitCost(avgUnitCost);
            if (!ISSUE_PURPOSE_SALES.equals(doc.getIssuePurpose())) {
                line.setUnitPrice(avgUnitCost);
                line.calculateExportAmounts();
            }
            BigDecimal currentOnHand = balance != null ? balance.getQuantityOnHand() : ZERO;
            inventoryLedgerRepository
                    .save(buildLedger(doc, line, "OUT", ZERO, qtyToExport, avgUnitCost, currentOnHand,
                            effectiveWarehouseId));

            for (SerialNumber snObj : serialsToExport) {
                updateExportedSerialBalance(doc, line, snObj, avgUnitCost, effectiveWarehouseId);
                com.duylongtech.backend.feature.warranty.WarrantyLineRequest wl = generateWarrantyLineIfNeeded(doc, line,
                        snObj);
                if (wl != null)
                    warrantyLines.add(wl);
            }
            if (serialsToExport.isEmpty()) {
                com.duylongtech.backend.feature.warranty.WarrantyLineRequest wl = generateWarrantyLineIfNeeded(doc, line,
                        null);
                if (wl != null)
                    warrantyLines.add(wl);
            }

            Long soId = com.duylongtech.backend.enums.ReferenceType.resolveEffectiveSalesOrderId(
                    doc.getSalesOrderId(), doc.getReferenceType(), doc.getReferenceId());
            if (soId != null) {
                salesOrderService.fulfillReservation(soId, line.getVariantId(), effectiveWarehouseId,
                        qtyToExport, totalCost);
            }
        }

        if (!warrantyLines.isEmpty()) {
            Warranty w = new Warranty();
            w.setWarrantyCode(codeGeneratorService.generateCode("WARRANTIES", "warranty_code", "BH", 5));
            w.setPartnerId(doc.getPartnerId());
            w.setSalesOrderId(doc.getSalesOrderId());
            w.setExportSlipId(doc.getId());
            w.setStartDate(LocalDate.now());
            LocalDate maxEndDate = warrantyLines.stream()
                    .map(com.duylongtech.backend.feature.warranty.WarrantyLineRequest::getEndDate).max(LocalDate::compareTo)
                    .orElse(LocalDate.now());
            w.setEndDate(maxEndDate);
            w.setWarrantyStatus(WarrantyStatus.ACTIVE.name());
            w.setNote("Tự động sinh từ phiếu xuất " + doc.getDocCode());
            for (com.duylongtech.backend.feature.warranty.WarrantyLineRequest reqLine : warrantyLines) {
                com.duylongtech.backend.feature.warranty.WarrantyLine wLine = new com.duylongtech.backend.feature.warranty.WarrantyLine();
                wLine.setWarranty(w);
                wLine.setProductVariantId(reqLine.getProductVariantId());
                wLine.setSerialNumberId(reqLine.getSerialNumberId());
                wLine.setQuantity(reqLine.getQuantity());
                wLine.setStartDate(reqLine.getStartDate());
                wLine.setEndDate(reqLine.getEndDate());
                wLine.setWarrantyStatus(reqLine.getWarrantyStatus());
                w.getLines().add(wLine);
            }
            warrantyRepository.save(w);
        }

        if (doc.getSalesOrderId() != null && doc.getPartnerId() != null) {
            SalesOrder so = salesOrderRepository.findById(doc.getSalesOrderId()).orElse(null);
            if (so != null) {
                BigDecimal totalDebt = BigDecimal.ZERO;
                for (InventoryDocumentLine line : doc.getLines()) {
                    // SO bán đa kho có thể có cùng một sản phẩm ở 2 kho với giá khác nhau: ưu tiên dòng đúng kho
                    // của phiếu, không lấy đại dòng đầu tiên.
                    Long lineWarehouseId = line.getWarehouseId() != null ? line.getWarehouseId() : doc.getWarehouseId();
                    SalesOrderLine soLine = so.getLines().stream()
                            .filter(l -> l.getVariantId().equals(line.getVariantId()))
                            .filter(l -> {
                                Long soLineWh = l.getWarehouseId() != null ? l.getWarehouseId() : so.getWarehouseId();
                                return java.util.Objects.equals(soLineWh, lineWarehouseId);
                            })
                            .findFirst()
                            .orElseGet(() -> so.getLines().stream()
                                    .filter(l -> l.getVariantId().equals(line.getVariantId()))
                                    .findFirst().orElse(null));

                    if (soLine != null) {
                        BigDecimal qtyToExport = line.getQuantityOut();
                        BigDecimal unitPrice = soLine.getUnitPrice();
                        BigDecimal lineAmount = qtyToExport.multiply(unitPrice);
                        BigDecimal vatRate = soLine.getVatRate() != null ? soLine.getVatRate() : BigDecimal.ZERO;
                        BigDecimal vatAmount = lineAmount.multiply(vatRate).divide(BigDecimal.valueOf(100), 2,
                                RoundingMode.HALF_UP);

                        totalDebt = totalDebt.add(lineAmount).add(vatAmount);
                    }
                }

                if (totalDebt.compareTo(BigDecimal.ZERO) > 0) {
                    partnerLedgerService.recordLedger(
                            doc.getPartnerId(),
                            "INVENTORY_EXPORT_SO",
                            doc.getId(),
                            doc.getDocCode(),
                            totalDebt,
                            BigDecimal.ZERO,
                            "Ghi nhận công nợ xuất kho bán hàng " + doc.getDocCode());
                }
            }
        }

        // Tự động cập nhật lại giá vốn cho phiếu nhập kho (thành phẩm) đang nháp của lệnh lắp ráp
        // dựa trên tổng chi phí FIFO thực tế vừa tính toán xong của các linh kiện xuất kho
        if (ISSUE_PURPOSE_ASSEMBLY.equals(doc.getIssuePurpose()) && "ASSEMBLY_ORDER".equals(doc.getReferenceType()) && doc.getReferenceId() != null) {
            AssemblyOrder order = assemblyOrderRepository.findByIdWithLines(doc.getReferenceId()).orElse(null);
            if (order != null && "ASSEMBLY".equals(order.getOrderType())) {
                BigDecimal totalExportCost = doc.getLines().stream()
                        .map(l -> (l.getUnitCost() != null ? l.getUnitCost() : BigDecimal.ZERO)
                                .multiply(l.getQuantityOut() != null ? l.getQuantityOut() : BigDecimal.ZERO))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                List<InventoryDocument> relatedDocs = inventoryDocumentRepository.findByReferenceWithLines(doc.getReferenceType(), doc.getReferenceId());
                relatedDocs.stream()
                        .filter(d -> "IN_PO".equals(d.getDocType()) && DocumentStatus.DRAFT.name().equals(d.getStatus()))
                        .findFirst()
                        .ifPresent(draftImport -> {
                            for (InventoryDocumentLine impLine : draftImport.getLines()) {
                                BigDecimal qtyIn = impLine.getQuantityIn() != null ? impLine.getQuantityIn() : BigDecimal.ZERO;
                                if (qtyIn.compareTo(BigDecimal.ZERO) > 0) {
                                    BigDecimal newUnitCost = totalExportCost.divide(qtyIn, 4, RoundingMode.HALF_UP);
                                    impLine.setUnitCost(newUnitCost);
                                    impLine.setUnitPrice(newUnitCost);
                                    impLine.calculateImportAmounts();
                                }
                            }
                            inventoryDocumentRepository.save(draftImport);
                        });
            }
        }

        String actor = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        Long currentUserId = userRepository.findByUsername(actor)
                .map(com.duylongtech.backend.feature.auth.User::getId).orElse(null);
        doc.post(currentUserId);
        doc.setUpdatedAt(LocalDateTime.now());

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        // Kiểm tra chênh lệch giữa số lượng dự kiến và thực xuất
        detectAndRecordDiscrepancy(saved, false);

        try {
            auditLogService.logEvent(null, "POST_EXPORT", "InventoryDocument", saved.getId(), "SUCCESS",
                    "Ghi sổ phiếu xuất kho " + saved.getDocCode() + " ("
                            + (saved.getIssuePurpose() != null ? saved.getIssuePurpose() : "EX_SO") + ")",
                    null, null);
        } catch (Exception ignored) {
        }

        applicationEventPublisher.publishEvent(new InventoryDocumentPostedEvent(
                this, saved.getId(), saved.getReferenceType(), saved.getReferenceId()
        ));

        return toResponse(saved);
    }

    /**
     * Kiểm tra chênh lệch giữa số lượng dự kiến và số lượng thực tế (nhập hoặc
     * xuất) trên chứng từ đã ghi sổ, ghi nhận vào chứng từ và thông báo cho
     * Kế toán + Quản lý nếu có chênh lệch.
     */
    private boolean detectAndRecordDiscrepancy(InventoryDocument savedDoc, boolean isImport) {
        boolean hasDiscrepancy = false;
        StringBuilder discrepancyDetails = new StringBuilder();
        for (InventoryDocumentLine line : savedDoc.getLines()) {
            BigDecimal act = isImport
                    ? (line.getQuantityIn() != null ? line.getQuantityIn() : BigDecimal.ZERO)
                    : (line.getQuantityOut() != null ? line.getQuantityOut() : BigDecimal.ZERO);
            BigDecimal exp = line.getExpectedQuantity() != null
                    && line.getExpectedQuantity().compareTo(BigDecimal.ZERO) > 0
                            ? line.getExpectedQuantity()
                            : act;
            BigDecimal rej = line.getRejectedQuantity() != null ? line.getRejectedQuantity() : BigDecimal.ZERO;

            if (act.compareTo(exp) < 0 || rej.compareTo(BigDecimal.ZERO) > 0
                    || (line.getDiscrepancyReason() != null && !line.getDiscrepancyReason().isBlank())) {
                hasDiscrepancy = true;
                ProductVariant pv = productVariantRepository.findById(line.getVariantId()).orElse(null);
                String sku = pv != null ? pv.getSku() : String.valueOf(line.getVariantId());
                BigDecimal diff = exp.subtract(act);
                discrepancyDetails.append(
                        String.format("• %s: Dự kiến %s, Thực tế %s (Thiếu: %s, Lỗi: %s). Chi tiết lệch: %s\n",
                                sku, exp.stripTrailingZeros().toPlainString(), act.stripTrailingZeros().toPlainString(),
                                diff.stripTrailingZeros().toPlainString(), rej.stripTrailingZeros().toPlainString(),
                                line.getDiscrepancyReason() != null ? line.getDiscrepancyReason() : "Chưa nhập lý do"));
            }
        }

        if (hasDiscrepancy) {
            savedDoc.setHasDiscrepancy(true);
            savedDoc.setDiscrepancyNote(discrepancyDetails.toString().trim());
            inventoryDocumentRepository.save(savedDoc);

            try {
                String partnerName = "";
                if (savedDoc.getPartnerId() != null) {
                    partnerName = partnerRepository.findById(savedDoc.getPartnerId()).map(Partner::getName)
                            .orElse("");
                }
                String docTypeLabel = isImport ? "nhập kho" : "xuất kho";
                String notifTitle = (isImport ? "⚠️ Cảnh báo nhập kho thiếu: " : "⚠️ Cảnh báo xuất kho thiếu/thừa: ")
                        + savedDoc.getDocCode();
                String notifMsg = String.format(
                        "Thủ kho đã kiểm nhận phiếu %s %s nhưng phát hiện chênh lệch %s:\n%s\nVui lòng đối soát lại hóa đơn và công nợ với đối tác.",
                        savedDoc.getDocCode(), partnerName.isBlank() ? "" : "(Đối tác: " + partnerName + ")",
                        docTypeLabel, discrepancyDetails.toString().trim());

                String refType = isImport ? "IMPORT_DOCUMENT" : "EXPORT_DOCUMENT";
                String linkPath = (isImport ? "/import-slips/" : "/export-slips/") + savedDoc.getId() + "/edit";

                appNotificationService.createNotification("ROLE_ACCOUNTANT", null, notifTitle, notifMsg,
                        "DISCREPANCY", refType, savedDoc.getId(), linkPath, savedDoc.getWarehouseId());
                appNotificationService.createNotification("ROLE_MANAGER", null, notifTitle, notifMsg,
                        "DISCREPANCY", refType, savedDoc.getId(), linkPath, savedDoc.getWarehouseId());
            } catch (Exception e) {
                // Log warning but do not fail the transaction
            }
        }
        return hasDiscrepancy;
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse postImport(Long id) {
        InventoryDocument doc = findImportOrThrow(id);
        warehouseAccessGuard.checkAccess(doc.getWarehouseId());
        if (!doc.isPostable()) {
            throw new BusinessException(SystemMessage.INV_ERR_040.getMessage());
        }
        new StocktakeAdjustmentGuard(inventoryDocumentRepository, stocktakeRepository).assertCanPost(doc);

        if ("ASSEMBLY_ORDER".equals(doc.getReferenceType()) && doc.getReferenceId() != null) {
            List<InventoryDocument> relatedDocs = inventoryDocumentRepository.findByReferenceWithLines("ASSEMBLY_ORDER", doc.getReferenceId());
            boolean exportPosted = relatedDocs.stream()
                    .anyMatch(d -> "EX_SO".equals(d.getDocType()) && DocumentStatus.POSTED.name().equals(d.getStatus()));
            if (!exportPosted) {
                throw new BusinessException("Chưa thể ghi sổ Phiếu Nhập kho. Bạn cần phải hoàn tất xuất kho (Ghi sổ Phiếu Xuất giao cho kỹ thuật viên) trước khi có thể ghi sổ Phiếu Nhập!");
            }
        }

        InventoryDocument savedDoc = inventoryDocumentRepository.saveAndFlush(doc);
        for (InventoryDocumentLine line : savedDoc.getLines()) {
            Long effectiveWarehouseId = line.getWarehouseId() != null ? line.getWarehouseId()
                    : savedDoc.getWarehouseId();
            if (effectiveWarehouseId == null) {
                throw new BusinessException("Dòng sản phẩm chưa được chọn kho nhập");
            }
            stocktakeLockGuard.assertWarehouseNotLocked(effectiveWarehouseId, savedDoc.getReferenceType(), savedDoc.getReferenceId());
            BigDecimal qtyToImport = line.getBaseQuantity() != null && line.getBaseQuantity().compareTo(ZERO) > 0
                    ? line.getBaseQuantity()
                    : line.getQuantityIn();
            BigDecimal unitCost = nonNegativeOrZero(line.getUnitCost(), "unitCost");
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId());
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null) {
                balance = new InventoryBalance();
                balance.initBalance(effectiveWarehouseId, line.getVariantId(), null, "GOOD", ZERO, ZERO, ZERO);
            }

            BigDecimal oldQty = balance.getQuantityOnHand();
            BigDecimal oldValue = oldQty.multiply(balance.getAverageCost());
            BigDecimal importValue = qtyToImport.multiply(unitCost);
            BigDecimal newQty = oldQty.add(qtyToImport);
            BigDecimal newAverageCost = newQty.compareTo(ZERO) > 0
                    ? oldValue.add(importValue).divide(newQty, 4, RoundingMode.HALF_UP)
                    : ZERO;

            balance.setQuantityOnHand(newQty);
            balance.setAverageCost(newAverageCost);
            balance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);

            InventoryCostLayer costLayer = new InventoryCostLayer();
            costLayer.initCostLayer(effectiveWarehouseId, line.getVariantId(), line.getId(), qtyToImport, qtyToImport, unitCost);
            inventoryCostLayerRepository.save(costLayer);

            inventoryLedgerRepository
                    .save(buildLedger(savedDoc, line, "IN", qtyToImport, ZERO, unitCost, balance.getQuantityOnHand(),
                            effectiveWarehouseId));
            createImportedSerialsIfNeeded(savedDoc, line, unitCost, effectiveWarehouseId);
        }

        String actor = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        Long currentUserId = userRepository.findByUsername(actor)
                .map(com.duylongtech.backend.feature.auth.User::getId).orElse(null);
        savedDoc.post(currentUserId);
        savedDoc.setUpdatedAt(LocalDateTime.now());
        InventoryDocument savedImport = inventoryDocumentRepository.save(savedDoc);
        syncStocktakeReference(savedImport);

        // Ghi nhận tăng công nợ nhà cung cấp khi nhập kho (luôn luôn ghi nhận nếu có
        // partnerId)
        if (savedImport.getPartnerId() != null) {
            BigDecimal totalImportValue = savedImport.getLines().stream()
                    .map(l -> {
                        if (l.getLineAmount() != null && l.getLineAmount().compareTo(BigDecimal.ZERO) > 0) {
                            return l.getLineAmount();
                        }
                        BigDecimal qty = l.getQuantityIn() != null ? l.getQuantityIn() : BigDecimal.ZERO;
                        BigDecimal cost = l.getUnitCost() != null ? l.getUnitCost() : BigDecimal.ZERO;
                        BigDecimal subtotal = qty.multiply(cost);
                        BigDecimal vatRate = l.getVatRate() != null ? l.getVatRate()
                                : (l.getVatPercent() != null ? l.getVatPercent() : BigDecimal.ZERO);
                        BigDecimal vatAmount = subtotal.multiply(vatRate).divide(BigDecimal.valueOf(100), 2,
                                RoundingMode.HALF_UP);
                        return subtotal.add(vatAmount);
                    })
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            partnerLedgerService.recordLedger(
                    savedImport.getPartnerId(),
                    "INVENTORY_IMPORT",
                    savedImport.getId(),
                    savedImport.getDocCode(),
                    totalImportValue,
                    BigDecimal.ZERO,
                    "Ghi nhận công nợ phiếu nhập kho " + savedImport.getDocCode());
        }

        if (savedImport.getPurchaseOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(savedImport.getPurchaseOrderId())
                    .orElse(null);
            if (po != null && !DocumentStatus.POSTED.name().equals(po.getStatus()) && !DocumentStatus.CANCELLED.name().equals(po.getStatus())
                    && !Boolean.TRUE.equals(po.getIsShortClosed())) {
                boolean fullyImported = PurchaseOrderReceiving.of(po.getLines(),
                        inventoryDocumentLineRepository.sumReceivedByPurchaseOrder(po.getId(), null)).isFullyPosted();
                if (fullyImported) {
                    // Cập nhật trạng thái POSTED
                    po.markAsPosted();
                    purchaseOrderRepository.save(po);
                }
            }
        }

        // Tự động kiểm tra và chuyển BACKORDERED thành HOLDING cho các đơn hàng bị
        // thiếu hàng trước đây
        savedImport.getLines().stream()
                .map(InventoryDocumentLine::getVariantId)
                .distinct()
                .forEach(variantId -> salesOrderService.reEvaluateBackorders(savedImport.getWarehouseId(), variantId));

        // Kiểm tra chênh lệch giữa số lượng dự kiến và thực nhận
        detectAndRecordDiscrepancy(savedImport, true);

        try {
            String postDesc = "Ghi sổ phiếu nhập kho " + savedImport.getDocCode();
            if (Boolean.TRUE.equals(savedImport.getHasDiscrepancy())) {
                postDesc += " (Có chênh lệch: " + savedImport.getDiscrepancyNote() + ")";
            }
            auditLogService.logEvent(null, "POST_IMPORT", "InventoryDocument", savedImport.getId(), "SUCCESS", postDesc,
                    null, null);
        } catch (Exception ignored) {
        }

        applicationEventPublisher.publishEvent(new InventoryDocumentPostedEvent(
                this, savedImport.getId(), savedImport.getReferenceType(), savedImport.getReferenceId()
        ));

        return toResponse(savedImport);
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId) {
        InventoryDocument doc = findImportOrThrow(id);
        warehouseAccessGuard.checkAccess(doc.getWarehouseId());
        if (!DocumentStatus.POSTED.name().equalsIgnoreCase(doc.getStatus())) {
            throw new BusinessException("Chỉ có thể bỏ ghi sổ chứng từ đang ở trạng thái ĐÃ GHI SỔ (POSTED).");
        }

        com.duylongtech.backend.feature.inventory.DependencyCheckResponse check = documentDependencyService
                .checkImportSlipUnpostable(id);
        if (!check.isCanUnpost()) {
            throw new BusinessException(check.getMessage() + " Chi tiết: " + String.join("; ", check.getDetails()));
        }

        Long warehouseId = doc.getWarehouseId();
        stocktakeLockGuard.assertWarehouseNotLocked(warehouseId, doc.getReferenceType(), doc.getReferenceId());

        // 1. Hoàn tác tồn kho (giảm số lượng đã nhập)
        for (InventoryDocumentLine line : doc.getLines()) {
            if (line.getVariantId() == null)
                continue;
            BigDecimal qtyIn = line.getBaseQuantity() != null ? line.getBaseQuantity() : line.getQuantityIn();
            if (qtyIn == null || qtyIn.compareTo(ZERO) <= 0)
                continue;

            Long effectiveWarehouseId = line.getWarehouseId() != null ? line.getWarehouseId() : warehouseId;
            Optional<InventoryBalance> balanceOpt = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId(), "GOOD");
            if (balanceOpt.isPresent()) {
                InventoryBalance balance = balanceOpt.get();
                BigDecimal oldQty = balance.getQuantityOnHand();
                BigDecimal newQty = oldQty.subtract(qtyIn);
                if (newQty.compareTo(ZERO) < 0) {
                    throw new BusinessException("Không thể bỏ ghi sổ vì tồn kho đã được sử dụng");
                }
                BigDecimal remainingValue = oldQty.multiply(balance.getAverageCost())
                        .subtract(qtyIn.multiply(nonNegativeOrZero(line.getUnitCost(), "unitCost")));
                balance.setQuantityOnHand(newQty);
                balance.setAverageCost(newQty.compareTo(ZERO) > 0
                        ? remainingValue.max(ZERO).divide(newQty, 4, RoundingMode.HALF_UP) : ZERO);
                balance.setUpdatedAt(LocalDateTime.now());
                inventoryBalanceRepository.save(balance);

                InventoryLedger ledger = buildLedger(doc, line, "UNPOST_IMPORT", ZERO, qtyIn, line.getUnitCost(),
                        balance.getQuantityOnHand(), effectiveWarehouseId);
                inventoryLedgerRepository.save(ledger);
            }

            List<InventoryCostLayer> importedLayers = inventoryCostLayerRepository
                    .findByInventoryDocumentLineId(line.getId());
            for (InventoryCostLayer layer : importedLayers) {
                if (layer.getQuantityLayered().compareTo(layer.getQuantityReceived()) != 0
                        || layer.getQuantityReserved().compareTo(ZERO) > 0) {
                    throw new BusinessException("Không thể bỏ ghi sổ vì lớp giá FIFO của phiếu nhập đã được sử dụng hoặc giữ chỗ");
                }
            }
            inventoryCostLayerRepository.deleteAll(importedLayers);

            // Xóa Serial Numbers đã sinh nếu có
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                String[] rawSerials = line.getSerialNumbersText().split("[,;\\s\\n]+");
                for (String sn : rawSerials) {
                    String clean = sn.trim();
                    if (!clean.isEmpty()) {
                        serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), clean)
                                .ifPresent(serialNumberRepository::delete);
                    }
                }
            }
        }

        // 2. Chuyển trạng thái PO nếu có
        if (doc.getPurchaseOrderId() != null) {
            purchaseOrderRepository.findById(doc.getPurchaseOrderId()).ifPresent(po -> {
                if (DocumentStatus.POSTED.name().equals(po.getStatus())) {
                    po.revertToApproved();
                    purchaseOrderRepository.save(po);
                }
            });
        }

        // 2b. Hoàn tác công nợ nhà cung cấp đã ghi lúc post (trước đây bị bỏ sót, khiến
        // "Dư nợ hiện tại" của NCC bị treo sai sau khi bỏ ghi sổ phiếu nhập)
        partnerLedgerService.reverseLedger("INVENTORY_IMPORT", doc.getId(), "UNPOST_IMPORT", doc.getDocCode(),
                "Hoàn tác công nợ do bỏ ghi sổ phiếu nhập " + doc.getDocCode());

        // 3. Cập nhật trạng thứng từ
        doc.unpost(currentUserId, reason != null && !reason.isBlank() ? reason.trim() : "Bỏ ghi sổ phiếu nhập");
        doc.setUpdatedAt(LocalDateTime.now());

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        try {
            String username = currentUserId != null
                    ? userRepository.findById(currentUserId).map(User::getUsername).orElse(null)
                    : null;
            auditLogService.logEvent(username, "UNPOST_IMPORT", "InventoryDocument", doc.getId(), "SUCCESS",
                    "Bỏ ghi sổ phiếu nhập kho " + doc.getDocCode() + ". Lý do: " + doc.getUnpostReason(), null, null);
        } catch (Exception ignored) {
        }

        return toResponse(saved, true);
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId) {
        InventoryDocument doc = findExportOrThrow(id);
        java.util.Set<Long> touchedWarehouseIds = exportWarehouseIds(doc);
        touchedWarehouseIds.forEach(warehouseAccessGuard::checkAccess);
        if (!DocumentStatus.POSTED.name().equalsIgnoreCase(doc.getStatus())) {
            throw new BusinessException("Chỉ có thể bỏ ghi sổ chứng từ đang ở trạng thái ĐÃ GHI SỔ (POSTED).");
        }

        com.duylongtech.backend.feature.inventory.DependencyCheckResponse check = documentDependencyService
                .checkExportSlipUnpostable(id);
        if (!check.isCanUnpost()) {
            throw new BusinessException(check.getMessage());
        }

        Long warehouseId = doc.getWarehouseId();
        for (Long touchedWarehouseId : touchedWarehouseIds) {
            stocktakeLockGuard.assertWarehouseNotLocked(touchedWarehouseId, doc.getReferenceType(), doc.getReferenceId());
        }

        // 1. Hoàn tác tồn kho (cộng lại số lượng đã xuất)
        for (InventoryDocumentLine line : doc.getLines()) {
            if (line.getVariantId() == null)
                continue;
            BigDecimal qtyOut = line.getBaseQuantity() != null ? line.getBaseQuantity() : line.getQuantityOut();
            if (qtyOut == null || qtyOut.compareTo(ZERO) <= 0)
                continue;

            Long effectiveWarehouseId = line.getWarehouseId() != null ? line.getWarehouseId() : warehouseId;
            Optional<InventoryBalance> balanceOpt = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId(), "GOOD");
            if (balanceOpt.isPresent()) {
                InventoryBalance balance = balanceOpt.get();
                balance.setQuantityOnHand(balance.getQuantityOnHand().add(qtyOut));
                balance.setUpdatedAt(LocalDateTime.now());
                inventoryBalanceRepository.save(balance);

                InventoryLedger ledger = buildLedger(doc, line, "UNPOST_EXPORT", qtyOut, ZERO, line.getUnitCost(),
                        balance.getQuantityOnHand(), effectiveWarehouseId);
                inventoryLedgerRepository.save(ledger);
            }

            boolean keepReserved = "ASSEMBLY_ORDER".equalsIgnoreCase(doc.getReferenceType())
                    && doc.getReferenceId() != null;
            inventoryCostAllocationService.restoreAfterUnpost(doc, line, keepReserved);

            // Trừ lại giá vốn đã cộng vào dòng SO lúc ghi sổ (fulfillReservation), đúng SO và kho như lúc ghi sổ.
            Long soId = com.duylongtech.backend.enums.ReferenceType.resolveEffectiveSalesOrderId(
                    doc.getSalesOrderId(), doc.getReferenceType(), doc.getReferenceId());
            if (soId != null && line.getUnitCost() != null) {
                salesOrderService.reverseFulfilledCost(soId, line.getVariantId(), effectiveWarehouseId,
                        line.getUnitCost().multiply(qtyOut));
            }

            // Trả lại trạng thái Serial = AVAILABLE
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                String[] rawSerials = line.getSerialNumbersText().split("[,;\\s\\n]+");
                for (String sn : rawSerials) {
                    String clean = sn.trim();
                    if (!clean.isEmpty()) {
                        serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), clean)
                                .ifPresent(s -> {
                                    s.updateStatus(SerialNumberStatus.AVAILABLE.name());
                                    s.setSoldAt(null);
                                    s.setSalesOrderLineId(null);
                                    serialNumberRepository.save(s);
                                });
                    }
                }
            }
        }

        // 2. Chuyển trạng thếi SO nếu có
        if (doc.getSalesOrderId() != null) {
            salesOrderRepository.findById(doc.getSalesOrderId()).ifPresent(so -> {
                if (DocumentStatus.POSTED.name().equals(so.getStatus())) {
                    so.revertToApproved();
                    salesOrderRepository.save(so);
                }
            });
        }

        // 2a. Hủy bảo hành tự sinh lúc ghi sổ phiếu này (checkExportSlipUnpostable đã chặn nếu có lệnh sửa chữa).
        // Ghi sổ lại phiếu thay thế sẽ sinh bảo hành mới gắn với phiếu mới; không hủy thì khách có 2 bảo hành.
        List<Warranty> ownWarranties = warrantyRepository
                .findByExportSlipIdAndWarrantyStatusNot(doc.getId(), WarrantyStatus.VOIDED.name());
        for (Warranty warranty : ownWarranties) {
            warranty.setWarrantyStatus(WarrantyStatus.VOIDED.name());
            warranty.getLines().forEach(line -> line.setWarrantyStatus(WarrantyStatus.VOIDED.name()));
            warranty.setNote((warranty.getNote() != null ? warranty.getNote() + ". " : "")
                    + "Đã hủy do bỏ ghi sổ phiếu xuất " + doc.getDocCode());
            warrantyRepository.save(warranty);
        }

        // 2b. Hoàn tác công nợ khách hàng đã ghi lúc post (trước đây bị bỏ sót, khiến
        // "Dư nợ hiện tại" của khách hàng bị treo sai sau khi bỏ ghi sổ phiếu xuất)
        partnerLedgerService.reverseLedger("INVENTORY_EXPORT_SO", doc.getId(), "UNPOST_EXPORT_SO", doc.getDocCode(),
                "Hoàn tác công nợ do bỏ ghi sổ phiếu xuất " + doc.getDocCode());

        // 3. Cập nhật trạng thứng từ
        doc.unpost(currentUserId, reason != null && !reason.isBlank() ? reason.trim() : "Bỏ ghi sổ phiếu xuất");
        doc.setUpdatedAt(LocalDateTime.now());

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        try {
            String username = currentUserId != null
                    ? userRepository.findById(currentUserId).map(User::getUsername).orElse(null)
                    : null;
            auditLogService.logEvent(username, "UNPOST_EXPORT", "InventoryDocument", doc.getId(), "SUCCESS",
                    "Bỏ ghi sổ phiếu xuất kho " + doc.getDocCode() + ". Lý do: " + doc.getUnpostReason(), null, null);
        } catch (Exception ignored) {
        }

        return toResponse(saved, true);
    }

    public void syncStocktakeReference(InventoryDocument doc) {
        if ("STOCKTAKE".equals(doc.getReferenceType()) && doc.getReferenceId() != null) {
            stocktakeRepository.findById(doc.getReferenceId()).ifPresent(stocktake -> {
                if (IMPORT_DOC_TYPE.equals(doc.getDocType())) {
                    stocktake.setReferenceImportId(doc.getId());
                } else if (EXPORT_DOC_TYPE.equals(doc.getDocType())) {
                    stocktake.setReferenceExportId(doc.getId());
                }

                if (DocumentStatus.POSTED.name().equals(doc.getStatus())) {
                    // Dòng "Không xử lý" không cần phiếu điều chỉnh; nhưng phải được Manager/Kế toán xác nhận trước khi hoàn thành.
                    // Hoàn thành chỉ khi phiếu điều chỉnh ĐÃ GHI SỔ (trước đây chỉ cần có id phiếu, kể cả phiếu nháp)
                    StocktakeAdjustmentGuard adjustments = new StocktakeAdjustmentGuard(inventoryDocumentRepository, stocktakeRepository);
                    boolean importDone = !stocktake.requiresImportAdjustment()
                            || adjustments.hasPostedAdjustment(stocktake.getId(), IMPORT_DOC_TYPE);
                    boolean exportDone = !stocktake.requiresExportAdjustment()
                            || adjustments.hasPostedAdjustment(stocktake.getId(), EXPORT_DOC_TYPE);

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

    public InventoryLedger buildLedger(InventoryDocument doc, InventoryDocumentLine line, String movementType,
            BigDecimal quantityIn, BigDecimal quantityOut, BigDecimal unitCost, BigDecimal balanceAfter,
            Long warehouseId) {
        InventoryLedger ledger = new InventoryLedger();
        ledger.initEntry(doc.getId(), line.getId(), warehouseId != null ? warehouseId : doc.getWarehouseId(),
                line.getVariantId(), line.getSerialNumberId(), movementType, quantityIn, quantityOut, unitCost, balanceAfter);
        return ledger;
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

    public void updateExportedSerialBalance(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial,
            BigDecimal unitCost, Long warehouseId) {
        Long effectiveWh = warehouseId != null ? warehouseId : doc.getWarehouseId();
        InventoryBalance serialBalance = inventoryBalanceRepository
                .findByWarehouseVariantSerialForUpdate(effectiveWh, line.getVariantId(), serial.getId(),
                        "GOOD")
                .orElse(null);
        if (serialBalance != null) {
            if (serialBalance.getQuantityOnHand().compareTo(BigDecimal.ONE) < 0) {
                throw new BusinessException(
                        String.format(SystemMessage.INV_ERR_027.getMessage(), serial.getSerialNumber()));
            }
            serialBalance.setQuantityOnHand(ZERO);
            serialBalance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(serialBalance);
        }

        if (ISSUE_PURPOSE_TRANSFER_OUT.equals(doc.getIssuePurpose())) {
            serial.updateStatus(SerialNumberStatus.IN_TRANSIT.name());
        } else {
            serial.updateStatus(SerialNumberStatus.SOLD.name());
            serial.setSoldAt(LocalDateTime.now());
        }
        serialNumberRepository.save(serial);
    }

    private com.duylongtech.backend.feature.warranty.WarrantyLineRequest generateWarrantyLineIfNeeded(InventoryDocument doc,
            InventoryDocumentLine line, SerialNumber serial) {
        // Chỉ tự động sinh phiếu bảo hành khi mục đích là SALES (Xuất kho bán hàng)
        // USAGE (Xuất sử dụng nội bộ) và TRANSFER_EXPORT (Chuyển kho) đều KHÔNG sinh
        // bảo hành
        if (doc.getIssuePurpose() == null || !ISSUE_PURPOSE_SALES.equalsIgnoreCase(doc.getIssuePurpose().trim())) {
            return null;
        }

        Integer warrantyMonths = line.getWarrantyMonths();
        if (warrantyMonths == null || warrantyMonths <= 0) {
            ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
            if (variant != null) {
                warrantyMonths = variant.getWarrantyMonths();
                if ((warrantyMonths == null || warrantyMonths <= 0) && variant.getProduct() != null) {
                    warrantyMonths = variant.getProduct().getWarrantyPeriodMonths();
                }
            }
        }

        if (warrantyMonths == null || warrantyMonths <= 0) {
            return null;
        }

        if (doc.getPartnerId() == null) {
            return null;
        }

        LocalDate startDate = doc.getDocDate() != null ? doc.getDocDate() : LocalDate.now();
        LocalDate endDate = startDate.plusMonths(warrantyMonths);

        com.duylongtech.backend.feature.warranty.WarrantyLineRequest wLine = new com.duylongtech.backend.feature.warranty.WarrantyLineRequest();
        wLine.setSerialNumberId(serial != null ? serial.getId() : null);
        wLine.setProductVariantId(line.getVariantId());
        wLine.setQuantity(serial != null ? BigDecimal.ONE : line.getQuantityOut());
        wLine.setStartDate(startDate);
        wLine.setEndDate(endDate);
        wLine.setWarrantyStatus(WarrantyStatus.ACTIVE.name());
        return wLine;
    }

    public void createImportedSerialsIfNeeded(InventoryDocument doc, InventoryDocumentLine line, BigDecimal unitCost,
            Long warehouseId) {
        ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
        Product product = variant != null ? variant.getProduct() : null;
        if (product == null || !Boolean.TRUE.equals(product.getTrackSerial())) {
            return;
        }

        Long effectiveWh = warehouseId != null ? warehouseId : doc.getWarehouseId();

        List<String> serialValues = parseSerialNumbers(line.getSerialNumbersText());
        int expectedQuantity = requireWholeNumber(line.getQuantityIn(), "So luong nhap serial");
        if (serialValues.size() != expectedQuantity) {
            throw new BusinessException(String.format(SystemMessage.INV_ERR_026.getMessage(), expectedQuantity));
        }

        for (String serialValue : serialValues) {
            if (serialNumberRepository.findBySerialNumber(serialValue).stream()
                    .anyMatch(existing -> !existing.getVariantId().equals(line.getVariantId()))) {
                throw new BusinessException(String.format(SystemMessage.INV_ERR_025.getMessage(), serialValue));
            }
            Optional<SerialNumber> existingOpt = serialNumberRepository
                    .findByVariantIdAndSerialNumber(line.getVariantId(), serialValue);
            if (existingOpt.isPresent()) {
                if ("SCRAP".equals(doc.getIssuePurpose())) {
                    SerialNumber serial = existingOpt.get();
                    serial.updateStatus(SerialNumberStatus.SCRAP.name());
                    serial.updateWarehouse(effectiveWh);
                    SerialNumber savedSerial = serialNumberRepository.save(serial);
                    line.setSerialNumberId(savedSerial.getId());
                    InventoryBalance scrapBalance = new InventoryBalance();
                    scrapBalance.initBalance(effectiveWh, line.getVariantId(), savedSerial.getId(), "GOOD", BigDecimal.ONE, ZERO, unitCost);
                    inventoryBalanceRepository.save(scrapBalance);
                    continue;
                } else if (ISSUE_PURPOSE_TRANSFER_IN.equals(doc.getIssuePurpose())) {
                    SerialNumber serial = existingOpt.get();
                    if (!SerialNumberStatus.IN_TRANSIT.name().equals(serial.getStatus())) {
                        throw new BusinessException(String.format(SystemMessage.INV_ERR_024.getMessage(), serialValue));
                    }
                    serial.updateStatus(SerialNumberStatus.AVAILABLE.name());
                    serial.updateWarehouse(effectiveWh);
                    SerialNumber savedSerial = serialNumberRepository.save(serial);
                    line.setSerialNumberId(savedSerial.getId());
                    InventoryBalance transferBalance = new InventoryBalance();
                    transferBalance.initBalance(effectiveWh, line.getVariantId(), savedSerial.getId(), "GOOD", BigDecimal.ONE, ZERO, unitCost);
                    inventoryBalanceRepository.save(transferBalance);
                    continue;
                } else {
                    throw new BusinessException(String.format(SystemMessage.INV_ERR_023.getMessage(), serialValue));
                }
            }
            SerialNumber serial = new SerialNumber();
            serial.initSerialNumber(line.getVariantId(), effectiveWh, serialValue, SerialNumberStatus.AVAILABLE.name(), LocalDateTime.now());
            SerialNumber savedSerial = serialNumberRepository.save(serial);
            line.setSerialNumberId(savedSerial.getId());
            InventoryBalance newSerialBalance = new InventoryBalance();
            newSerialBalance.initBalance(effectiveWh, line.getVariantId(), savedSerial.getId(), "GOOD", BigDecimal.ONE, ZERO, unitCost);
            inventoryBalanceRepository.save(newSerialBalance);
        }
    }

    public int requireWholeNumber(BigDecimal value, String fieldName) {
        try {
            return value.stripTrailingZeros().intValueExact();
        } catch (ArithmeticException ex) {
            throw new BusinessException(fieldName + " phải là số nguyên");
        }
    }

    public InventoryDocument findExportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.INV_ERR_022.getMessage());
        }
        return inventoryDocumentRepository.findExportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu xuất kho"));
    }

    /**
     * Mọi kho mà phiếu xuất làm thay đổi tồn: kho đầu phiếu và kho riêng của từng dòng. Ghi sổ/bỏ ghi sổ
     * trừ/cộng tồn theo kho của dòng, nên chỉ kiểm tra kho đầu phiếu sẽ cho thủ kho kho A động vào tồn kho B.
     */
    private java.util.Set<Long> exportWarehouseIds(InventoryDocument doc) {
        java.util.Set<Long> ids = new java.util.LinkedHashSet<>();
        ids.add(doc.getWarehouseId());
        for (InventoryDocumentLine line : doc.getLines()) {
            if (line.getWarehouseId() != null) {
                ids.add(line.getWarehouseId());
            }
        }
        return ids;
    }

    public InventoryDocument findImportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.INV_ERR_021.getMessage());
        }
        return inventoryDocumentRepository.findImportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu nhập kho"));
    }

    public BigDecimal nonNegativeOrZero(BigDecimal value, String fieldName) {
        if (value == null) {
            return ZERO;
        }
        if (value.compareTo(ZERO) < 0) {
            throw new BusinessException(fieldName + " phải lớn hơn hoặc bằng 0");
        }
        return value;
    }

    // Split on comma/semicolon/whitespace/newline, not just newline - users paste
    // scanned or copy-pasted serials comma-separated on one line, and the
    // unpost-time deletion logic a few lines up already expects that (see the
    // split("[,;\\s\\n]+") calls above). A newline-only split let a whole
    // comma-joined line through as a single "serial" when posting, which then
    // failed to insert once it was longer than serial_numbers.normalized_serial_number
    // (VARCHAR(100)) instead of failing the (correct) expected-quantity check first.
    public List<String> parseSerialNumbers(String serialNumbersText) {
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

    public InventoryDocumentResponse toResponse(InventoryDocument doc) {
        return toResponse(doc, false);
    }

    public InventoryDocumentResponse toResponse(InventoryDocument doc, boolean includeLines) {
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

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public boolean isAssemblyDocument(com.duylongtech.backend.feature.inventory.InventoryDocument doc) {
        if (doc == null) {
            return false;
        }
        return "ASSEMBLY".equals(doc.getIssuePurpose())
                || com.duylongtech.backend.enums.ReferenceType.ASSEMBLY_ORDER.name().equalsIgnoreCase(trimToNull(doc.getReferenceType()));
    }
}
