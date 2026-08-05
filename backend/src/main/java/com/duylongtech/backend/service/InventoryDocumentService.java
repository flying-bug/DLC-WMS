package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.ScanResolveRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.ScanResolveResponse;
import com.duylongtech.backend.entity.InventoryBalance;
import com.duylongtech.backend.entity.InventoryCostLayer;
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
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.StocktakeRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.entity.Stocktake;
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

@Service
@RequiredArgsConstructor
public class InventoryDocumentService {

    private final CodeGeneratorService codeGeneratorService;

    private static final String EXPORT_DOC_TYPE = "EX_SO";
    private static final String IMPORT_DOC_TYPE = "IN_PO";
    private static final String DEFAULT_STATUS = "DRAFT";
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "SUBMITTED", "APPROVED", "POSTED", "CANCELLED");
    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "SUBMITTED");

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
    private final com.duylongtech.backend.repository.InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryCostLayerRepository inventoryCostLayerRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final ProductVariantRepository productVariantRepository;
    private final WarrantyRepository warrantyRepository;
    private final WarrantyLifecycleService warrantyLifecycleService;
    private final PartnerRepository partnerRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final AssemblyBomRepository assemblyBomRepository;
    private final StocktakeRepository stocktakeRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final RepairRepository repairRepository;
    private final SalesOrderService salesOrderService;

    @Transactional(readOnly = true)
    public ScanResolveResponse resolveExportScan(ScanResolveRequest req) {
        String code = trimToNull(req != null ? req.getCode() : null);
        if (code == null) {
            throw new BusinessException("Mã quét là bắt buộc");
        }
        if (req.getWarehouseId() == null) {
            throw new BusinessException("warehouseId là bắt buộc");
        }

        List<SerialNumber> serials = serialNumberRepository.findBySerialNumber(code);
        if (serials.size() > 1) {
            throw new BusinessException("Mã serial tồn tại trên nhiều sản phẩm, vui lòng chọn mẫu sản phẩm trước");
        }
        if (serials.size() == 1) {
            return resolveSerialScan(serials.get(0), req.getWarehouseId(), code);
        }
        return resolveVariantScan(code);
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getExportHistory(String docCode, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId) {
        String normalizedDocCode = trimToNull(docCode);
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedIssuePurpose = normalizeOptionalReference(issuePurpose);
        String normalizedReferenceType = normalizeOptionalReference(referenceType);
        boolean noFilters = normalizedDocCode == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null && normalizedIssuePurpose == null && normalizedReferenceType == null
                && referenceId == null;
        List<InventoryDocument> docs = noFilters
                ? inventoryDocumentRepository.findAllExports()
                : inventoryDocumentRepository.searchExports(normalizedDocCode, fromDate, toDate, normalizedStatus,
                        warehouseId, normalizedIssuePurpose, normalizedReferenceType, referenceId);
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getExportDetail(Long id) {
        return toResponse(findExportOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getImportHistory(String docCode, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId) {
        String normalizedDocCode = trimToNull(docCode);
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedIssuePurpose = normalizeOptionalReference(issuePurpose);
        String normalizedReferenceType = normalizeOptionalReference(referenceType);
        boolean noFilters = normalizedDocCode == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null && normalizedIssuePurpose == null && normalizedReferenceType == null && referenceId == null;
        List<InventoryDocument> docs = noFilters
                ? inventoryDocumentRepository.findAllImports()
                : inventoryDocumentRepository.searchImports(normalizedDocCode, fromDate, toDate, normalizedStatus,
                        warehouseId, normalizedIssuePurpose, normalizedReferenceType, referenceId);
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getImportDetail(Long id) {
        return toResponse(findImportOrThrow(id));
    }

    @Transactional
    public InventoryDocumentResponse createExport(InventoryDocumentRequest req) {
        validateCreateRequest(req);
        InventoryDocument doc = buildBaseDocument(req, EXPORT_DOC_TYPE, resolveCreateDocCode(req.getDocCode()));
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toExportLineEntity(doc, req.getLines().get(i), i));
        }
        InventoryDocument saved = inventoryDocumentRepository.save(doc);
        syncStocktakeReference(saved);
        return toResponse(saved);
    }

    @Transactional
    public InventoryDocumentResponse createImport(InventoryDocumentRequest req) {
        validateCreateImportRequest(req);
        InventoryDocument doc = buildBaseDocument(req, IMPORT_DOC_TYPE, resolveCreateImportDocCode(req.getDocCode()));
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toImportLineEntity(doc, req.getLines().get(i), i));
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

                if ("POSTED".equals(doc.getStatus())) {
                    boolean hasSurplus = stocktake.getLines().stream()
                            .anyMatch(l -> l.getDiffQty() != null && l.getDiffQty().compareTo(BigDecimal.ZERO) > 0);
                    boolean hasShortage = stocktake.getLines().stream()
                            .anyMatch(l -> l.getDiffQty() != null && l.getDiffQty().compareTo(BigDecimal.ZERO) < 0);

                    boolean importDone = !hasSurplus || stocktake.getReferenceImportId() != null;
                    boolean exportDone = !hasShortage || stocktake.getReferenceExportId() != null;

                    if (importDone && exportDone) {
                        stocktake.setStatus("POSTED");
                    }
                }
                stocktakeRepository.save(stocktake);
            });
        }
    }

    @Transactional
    public InventoryDocumentResponse updateExport(Long id, InventoryDocumentRequest req) {
        validateUpdateRequest(req);
        InventoryDocument doc = findExportOrThrow(id);
        ensureEditable(doc);
        updateBaseDocument(id, doc, req, "Mã phiếu xuất kho đã tồn tại", false);
        doc.getLines().clear();
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toExportLineEntity(doc, req.getLines().get(i), i));
        }
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional
    public InventoryDocumentResponse updateImport(Long id, InventoryDocumentRequest req) {
        validateUpdateImportRequest(req);
        InventoryDocument doc = findImportOrThrow(id);
        ensureEditable(doc);
        updateBaseDocument(id, doc, req, "Mã phiếu nhập kho đã tồn tại", true);
        doc.getLines().clear();
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toImportLineEntity(doc, req.getLines().get(i), i));
        }
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse postExport(Long id) {
        InventoryDocument doc = findExportOrThrow(id);
        if (!"DRAFT".equals(doc.getStatus()) && !"SUBMITTED".equals(doc.getStatus())) {
            throw new BusinessException("Chỉ phiếu xuất kho lưu tạm mới có thể ghi sổ");
        }

        List<com.duylongtech.backend.dto.request.WarrantyLineRequest> warrantyLines = new java.util.ArrayList<>();

        for (InventoryDocumentLine line : doc.getLines()) {
            BigDecimal qtyToExport = line.getQuantityOut();
            List<SerialNumber> serialsToExport = new java.util.ArrayList<>();
            ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);

            Long targetSerialId = line.getSerialNumberId();
            if (targetSerialId == null && line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                List<String> serials = parseSerialNumbers(line.getSerialNumbersText());
                for (String sn : serials) {
                    serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), sn)
                        .ifPresent(serialsToExport::add);
                }
                if (!serialsToExport.isEmpty() && targetSerialId == null) {
                    line.setSerialNumberId(serialsToExport.get(0).getId());
                }
            } else if (targetSerialId != null) {
                SerialNumber snObj = serialNumberRepository.findById(targetSerialId)
                        .orElseThrow(() -> new BusinessException("Không tìm thấy serial cần xuất"));
                serialsToExport.add(snObj);
            }

            for (SerialNumber snObj : serialsToExport) {
                if (!"AVAILABLE".equals(snObj.getStatus())) {
                    throw new BusinessException("Serial " + snObj.getSerialNumber() + " không có sẵn trong kho (trạng thái hiện tại: " + snObj.getStatus() + ")");
                }
                if (!doc.getWarehouseId().equals(snObj.getWarehouseId())) {
                    throw new BusinessException("Serial " + snObj.getSerialNumber() + " không nằm trong kho xuất");
                }
                if (!line.getVariantId().equals(snObj.getVariantId())) {
                    throw new BusinessException("Serial " + snObj.getSerialNumber() + " không thuộc SKU này");
                }
                snObj.setStatus("SOLD"); // HOẶC "EXPORTED" tùy logic của dự án
                serialNumberRepository.save(snObj);
            }
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(doc.getWarehouseId(), line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(doc.getWarehouseId(), line.getVariantId());
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null) {
                throw new BusinessException("Không tìm thấy tồn kho cho sản phẩm " + line.getVariantId());
            }

            if (balance.getQuantityOnHand().compareTo(qtyToExport) < 0) {
                throw new BusinessException("Số lượng xuất lớn hơn số lượng tồn kho, vui lòng điều chỉnh");
            }

            balance.setQuantityOnHand(balance.getQuantityOnHand().subtract(qtyToExport));
            balance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);

            List<InventoryCostLayer> layers = inventoryCostLayerRepository
                    .findAvailableLayersForUpdate(doc.getWarehouseId(), line.getVariantId());
            BigDecimal remainingQty = qtyToExport;
            BigDecimal totalCost = ZERO;

            for (InventoryCostLayer layer : layers) {
                if (remainingQty.compareTo(ZERO) <= 0) {
                    break;
                }
                BigDecimal qtyFromLayer = remainingQty.min(layer.getQuantityLayered());
                layer.setQuantityLayered(layer.getQuantityLayered().subtract(qtyFromLayer));
                inventoryCostLayerRepository.save(layer);
                totalCost = totalCost.add(qtyFromLayer.multiply(layer.getUnitCost()));
                remainingQty = remainingQty.subtract(qtyFromLayer);
            }

            if (remainingQty.compareTo(ZERO) > 0 || totalCost.compareTo(ZERO) <= 0) {
                BigDecimal fallbackCost = (line.getUnitCost() != null && line.getUnitCost().compareTo(ZERO) > 0)
                        ? line.getUnitCost()
                        : ((balance != null && balance.getAverageCost() != null
                                && balance.getAverageCost().compareTo(ZERO) > 0)
                                        ? balance.getAverageCost()
                                        : (variant != null && variant.getCostPrice() != null
                                                && variant.getCostPrice().compareTo(ZERO) > 0
                                                        ? variant.getCostPrice()
                                                        : (variant != null && variant.getSalePrice() != null
                                                                ? variant.getSalePrice()
                                                                : ZERO)));
                if (totalCost.compareTo(ZERO) <= 0) {
                    totalCost = qtyToExport.multiply(fallbackCost);
                } else if (remainingQty.compareTo(ZERO) > 0) {
                    totalCost = totalCost.add(remainingQty.multiply(fallbackCost));
                }
                remainingQty = ZERO;
            }

            BigDecimal avgUnitCost = totalCost.divide(qtyToExport, 4, RoundingMode.HALF_UP);
            line.setUnitCost(avgUnitCost);
            inventoryLedgerRepository
                    .save(buildLedger(doc, line, "OUT", ZERO, qtyToExport, avgUnitCost, balance.getQuantityOnHand()));

            for (SerialNumber snObj : serialsToExport) {
                updateExportedSerialBalance(doc, line, snObj, avgUnitCost);
                com.duylongtech.backend.dto.request.WarrantyLineRequest wl = generateWarrantyLineIfNeeded(doc, line, snObj);
                if (wl != null) warrantyLines.add(wl);
            }
            if (serialsToExport.isEmpty()) {
                com.duylongtech.backend.dto.request.WarrantyLineRequest wl = generateWarrantyLineIfNeeded(doc, line, null);
                if (wl != null) warrantyLines.add(wl);
            }

            if (doc.getSalesOrderId() != null) {
                salesOrderService.fulfillReservation(doc.getSalesOrderId(), line.getVariantId(), doc.getWarehouseId(), qtyToExport);
            }
        }

        if (!warrantyLines.isEmpty()) {
            Warranty w = new Warranty();
            w.setWarrantyCode(codeGeneratorService.generateCode("WARRANTIES", "warranty_code", "WAR", 5));
            w.setPartnerId(doc.getPartnerId());
            w.setSalesOrderId(doc.getSalesOrderId());
            w.setStartDate(LocalDate.now());
            LocalDate maxEndDate = warrantyLines.stream().map(com.duylongtech.backend.dto.request.WarrantyLineRequest::getEndDate).max(LocalDate::compareTo).orElse(LocalDate.now());
            w.setEndDate(maxEndDate);
            w.setWarrantyStatus("ACTIVE");
            w.setNote("Tự động sinh từ phiếu xuất " + doc.getDocCode());
            for (com.duylongtech.backend.dto.request.WarrantyLineRequest reqLine : warrantyLines) {
                com.duylongtech.backend.entity.WarrantyLine wLine = new com.duylongtech.backend.entity.WarrantyLine();
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

        doc.setStatus("POSTED");
        doc.setPostedAt(LocalDateTime.now());
        doc.setUpdatedAt(LocalDateTime.now());
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional(rollbackFor = Exception.class)
    public InventoryDocumentResponse postImport(Long id) {
        InventoryDocument doc = findImportOrThrow(id);
        if (!"DRAFT".equals(doc.getStatus()) && !"SUBMITTED".equals(doc.getStatus())) {
            throw new BusinessException("Chỉ phiếu nhập kho lưu tạm mới có thể ghi sổ");
        }

        InventoryDocument savedDoc = inventoryDocumentRepository.saveAndFlush(doc);
        for (InventoryDocumentLine line : savedDoc.getLines()) {
            BigDecimal qtyToImport = line.getQuantityIn();
            BigDecimal unitCost = nonNegativeOrZero(line.getUnitCost(), "unitCost");
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(savedDoc.getWarehouseId(), line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(savedDoc.getWarehouseId(), line.getVariantId());
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null) {
                balance = InventoryBalance.builder()
                        .warehouseId(savedDoc.getWarehouseId())
                        .variantId(line.getVariantId())
                        .stockStatus("GOOD")
                        .quantityOnHand(ZERO)
                        .quantityReserved(ZERO)
                        .averageCost(ZERO)
                        .updatedAt(LocalDateTime.now())
                        .build();
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

            inventoryCostLayerRepository.save(InventoryCostLayer.builder()
                    .warehouseId(savedDoc.getWarehouseId())
                    .variantId(line.getVariantId())
                    .inventoryDocumentLineId(line.getId())
                    .quantityReceived(qtyToImport)
                    .quantityLayered(qtyToImport)
                    .unitCost(unitCost)
                    .createdAt(LocalDateTime.now())
                    .build());

            inventoryLedgerRepository
                    .save(buildLedger(savedDoc, line, "IN", qtyToImport, ZERO, unitCost, balance.getQuantityOnHand()));
            createImportedSerialsIfNeeded(savedDoc, line, unitCost);
        }

        savedDoc.setStatus("POSTED");
        savedDoc.setPostedAt(LocalDateTime.now());
        savedDoc.setUpdatedAt(LocalDateTime.now());
        InventoryDocument savedImport = inventoryDocumentRepository.save(savedDoc);
        syncStocktakeReference(savedImport);
        return toResponse(savedImport);
    }

    private InventoryDocument buildBaseDocument(InventoryDocumentRequest req, String docType, String docCode) {
        String issuePurpose = normalizeOptionalReference(req.getIssuePurpose());
        if (issuePurpose != null && EXPORT_DOC_TYPE.equals(docType)) {
            // Kiểm tra issuePurpose có thuộc danh sách hợp lệ toàn bộ không
            // (bao gồm cả TRANSFER_EXPORT được dùng nội bộ bởi module Chuyển kho)
            if (!VALID_ALL_EXPORT_PURPOSES.contains(issuePurpose)) {
                throw new BusinessException(
                        "Mục đích xuất kho không hợp lệ. Chỉ chấp nhận: SALES (Bán hàng), USAGE (Xuất sử dụng) hoặc ASSEMBLY (Xuất lắp ráp)");
            }
        }

        InventoryDocument doc = new InventoryDocument();
        doc.setDocCode(docCode);
        doc.setDocType(docType);
        doc.setIssuePurpose(normalizeOptionalReference(req.getIssuePurpose()));
        doc.setReferenceType(normalizeOptionalReference(req.getReferenceType()));
        doc.setReferenceId(req.getReferenceId());
        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(req.getPurchaseOrderId());
        doc.setSalesOrderId(req.getSalesOrderId());
        doc.setPartnerId(req.getPartnerId());
        doc.setIssuePurpose(normalizeOptionalReference(req.getIssuePurpose()));
        doc.setReferenceType(normalizeOptionalReference(req.getReferenceType()));
        doc.setReferenceId(req.getReferenceId());
        doc.setDocDate(req.getDocDate());
        doc.setStatus(normalizeEditableStatus(req.getStatus(), DEFAULT_STATUS));
        doc.setNote(req.getNote());
        doc.setCreatedBy(req.getCreatedBy());
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
                throw new BusinessException(
                        "Mục đích xuất kho không hợp lệ. Chỉ chấp nhận: SALES (Bán hàng), USAGE (Xuất sử dụng) hoặc ASSEMBLY (Xuất lắp ráp)");
            }
        }

        String requestedCode = trimToNull(req.getDocCode());
        if (requestedCode != null && !requestedCode.equals(doc.getDocCode())) {
            if (inventoryDocumentRepository.existsByDocCodeAndIdNot(requestedCode, id)) {
                throw new BusinessException(duplicateMessage);
            }
            doc.setDocCode(requestedCode);
        }
        doc.setWarehouseId(req.getWarehouseId());
        doc.setSourceWarehouseId(req.getSourceWarehouseId());
        doc.setPurchaseOrderId(req.getPurchaseOrderId());
        doc.setSalesOrderId(req.getSalesOrderId());
        doc.setPartnerId(req.getPartnerId());
        doc.setIssuePurpose(normalizeOptionalReference(req.getIssuePurpose()));
        doc.setReferenceType(normalizeOptionalReference(req.getReferenceType()));
        doc.setReferenceId(req.getReferenceId());
        doc.setDocDate(req.getDocDate());
        doc.setStatus(importDocument
                ? normalizeEditableImportStatus(req.getStatus(), doc.getStatus())
                : normalizeEditableStatus(req.getStatus(), doc.getStatus()));
        doc.setNote(req.getNote());
        doc.setRecipientName(req.getRecipientName());
        doc.setRecipientAddress(req.getRecipientAddress());
        doc.setSalespersonId(req.getSalespersonId());
        doc.setUpdatedAt(LocalDateTime.now());
    }

    private InventoryLedger buildLedger(InventoryDocument doc, InventoryDocumentLine line, String movementType,
            BigDecimal quantityIn, BigDecimal quantityOut, BigDecimal unitCost, BigDecimal balanceAfter) {
        return InventoryLedger.builder()
                .inventoryDocumentId(doc.getId())
                .inventoryDocumentLineId(line.getId())
                .warehouseId(doc.getWarehouseId())
                .variantId(line.getVariantId())
                .serialNumberId(line.getSerialNumberId())
                .movementType(movementType)
                .quantityIn(quantityIn)
                .quantityOut(quantityOut)
                .unitCost(unitCost)
                .balanceAfter(balanceAfter)
                .movementAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
    }

    private ScanResolveResponse resolveSerialScan(SerialNumber serial, Long warehouseId, String code) {
        if (!"AVAILABLE".equalsIgnoreCase(serial.getStatus())) {
            throw new BusinessException("Serial không khả dụng để xuất kho: " + code);
        }
        if (!warehouseId.equals(serial.getWarehouseId())) {
            throw new BusinessException("Serial không nằm trong kho đang chọn");
        }
        ProductVariant variant = serial.getVariant();
        if (variant == null) {
            throw new BusinessException("Serial chưa gắn SKU sản phẩm");
        }
        return buildScanResponse("SERIAL", code, variant, serial);
    }

    private ScanResolveResponse resolveVariantScan(String code) {
        ProductVariant variant = productVariantRepository.findByBarcode(code)
                .or(() -> productVariantRepository.findBySku(code))
                .orElseThrow(() -> new BusinessException("Không tìm thấy SKU hoặc serial cho mã: " + code));
        Product product = variant.getProduct();
        if (Boolean.TRUE.equals(product != null ? product.getTrackSerial() : null)) {
            throw new BusinessException("Sản phẩm quản lý serial, vui lòng quét serial của từng sản phẩm");
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
                .sku(variant.getSku())
                .barcode(variant.getBarcode())
                .serialNumber(serial != null ? serial.getSerialNumber() : null)
                .unitName(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                .trackSerial(product != null ? product.getTrackSerial() : false)
                .salePrice(variant.getSalePrice())
                .costPrice(variant.getCostPrice())
                .warrantyMonths((variant.getWarrantyMonths() == null || variant.getWarrantyMonths() <= 0) && product != null ? product.getWarrantyPeriodMonths() : variant.getWarrantyMonths())
                .build();
    }

    private void validateExportSerial(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial,
            BigDecimal quantityOut) {
        if (quantityOut.compareTo(BigDecimal.ONE) != 0) {
            throw new BusinessException("Mỗi dòng xuất serial phải có số lượng bằng 1");
        }
        if (!line.getVariantId().equals(serial.getVariantId())) {
            throw new BusinessException("Serial không thuộc SKU trên dòng xuất");
        }
        if (!doc.getWarehouseId().equals(serial.getWarehouseId())) {
            throw new BusinessException("Serial không nằm trong kho xuất");
        }
        if (!"AVAILABLE".equalsIgnoreCase(serial.getStatus())) {
            throw new BusinessException("Serial không khả dụng để xuất kho");
        }
    }

    private void updateExportedSerialBalance(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial,
            BigDecimal unitCost) {
        InventoryBalance serialBalance = inventoryBalanceRepository
                .findByWarehouseVariantSerialForUpdate(doc.getWarehouseId(), line.getVariantId(), serial.getId(),
                        "GOOD")
                .orElseThrow(
                        () -> new BusinessException("Không tìm thấy tồn kho cho serial " + serial.getSerialNumber()));
        if (serialBalance.getQuantityOnHand().compareTo(BigDecimal.ONE) < 0) {
            throw new BusinessException("Serial " + serial.getSerialNumber() + " không còn tồn kho");
        }
        serialBalance.setQuantityOnHand(ZERO);
        serialBalance.setUpdatedAt(LocalDateTime.now());
        inventoryBalanceRepository.save(serialBalance);

        if (ISSUE_PURPOSE_TRANSFER_OUT.equals(doc.getIssuePurpose())) {
            serial.setStatus("IN_TRANSIT");
        } else {
            serial.setStatus("SOLD");
            serial.setSoldAt(LocalDateTime.now());
        }
        serial.setUpdatedAt(LocalDateTime.now());
        serialNumberRepository.save(serial);
    }

    /**
     * Tự động tạo phiếu bảo hành (WARRANTY) cho serial number vừa được xuất bán,
     * nếu dòng sản phẩm có khai báo warrantyMonths > 0.
     * Điều kiện:
     * - line.warrantyMonths phải được lưu trước trong entity (xem
     * InventoryDocumentLine.warrantyMonths)
     * - doc phải có partnerId (khách hàng mua)
     * Phiếu bảo hành sẽ không được tạo nếu serial đó đã có warranty tồn tại
     * (tránh duplicate khi gọi lại postExport do lỗi retry).
     */
    private com.duylongtech.backend.dto.request.WarrantyLineRequest generateWarrantyLineIfNeeded(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial) {
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

        com.duylongtech.backend.dto.request.WarrantyLineRequest wLine = new com.duylongtech.backend.dto.request.WarrantyLineRequest();
        wLine.setSerialNumberId(serial != null ? serial.getId() : null);
        wLine.setProductVariantId(line.getVariantId());
        wLine.setQuantity(serial != null ? BigDecimal.ONE : line.getQuantityOut());
        wLine.setStartDate(startDate);
        wLine.setEndDate(endDate);
        wLine.setWarrantyStatus("APPROVED");
        return wLine;
    }

    private void createImportedSerialsIfNeeded(InventoryDocument doc, InventoryDocumentLine line, BigDecimal unitCost) {
        ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
        Product product = variant != null ? variant.getProduct() : null;
        if (product == null || !Boolean.TRUE.equals(product.getTrackSerial())) {
            return;
        }

        List<String> serialValues = parseSerialNumbers(line.getSerialNumbersText());
        int expectedQuantity = requireWholeNumber(line.getQuantityIn(), "So luong nhap serial");
        if (serialValues.size() != expectedQuantity) {
            throw new BusinessException("Sản phẩm quản lý serial phải có đúng " + expectedQuantity + " serial");
        }

        for (String serialValue : serialValues) {
            Optional<SerialNumber> existingOpt = serialNumberRepository
                    .findByVariantIdAndSerialNumber(line.getVariantId(), serialValue);
            if (existingOpt.isPresent()) {
                if (ISSUE_PURPOSE_TRANSFER_IN.equals(doc.getIssuePurpose())) {
                    SerialNumber serial = existingOpt.get();
                    if (!"IN_TRANSIT".equals(serial.getStatus())) {
                        throw new BusinessException("Serial " + serialValue + " không ở trạng thái IN_TRANSIT");
                    }
                    serial.setStatus("AVAILABLE");
                    serial.setWarehouseId(doc.getWarehouseId());
                    serial.setUpdatedAt(LocalDateTime.now());
                    SerialNumber savedSerial = serialNumberRepository.save(serial);
                    inventoryBalanceRepository.save(InventoryBalance.builder()
                            .warehouseId(doc.getWarehouseId())
                            .variantId(line.getVariantId())
                            .serialNumberId(savedSerial.getId())
                            .stockStatus("GOOD")
                            .quantityOnHand(BigDecimal.ONE)
                            .quantityReserved(ZERO)
                            .averageCost(unitCost)
                            .updatedAt(LocalDateTime.now())
                            .build());
                    continue;
                } else {
                    throw new BusinessException("Serial đã tồn tại: " + serialValue);
                }
            }
            SerialNumber serial = SerialNumber.builder()
                    .variantId(line.getVariantId())
                    .warehouseId(doc.getWarehouseId())
                    .serialNumber(serialValue)
                    .status("AVAILABLE")
                    .importedAt(LocalDateTime.now())
                    .build();
            SerialNumber savedSerial = serialNumberRepository.save(serial);
            inventoryBalanceRepository.save(InventoryBalance.builder()
                    .warehouseId(doc.getWarehouseId())
                    .variantId(line.getVariantId())
                    .serialNumberId(savedSerial.getId())
                    .stockStatus("GOOD")
                    .quantityOnHand(BigDecimal.ONE)
                    .quantityReserved(ZERO)
                    .averageCost(unitCost)
                    .updatedAt(LocalDateTime.now())
                    .build());
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
            throw new BusinessException("ID phiếu xuất kho là bắt buộc");
        }
        return inventoryDocumentRepository.findExportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu xuất kho"));
    }

    private InventoryDocument findImportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException("ID phiếu nhập kho là bắt buộc");
        }
        return inventoryDocumentRepository.findImportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu nhập kho"));
    }

    private void validateCreateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException("Người tạo phiếu (createdBy) là bắt buộc");
        }
    }

    private void validateUpdateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
    }

    private void validateCreateImportRequest(InventoryDocumentRequest req) {
        validateRequiredImportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException("Người tạo phiếu (createdBy) là bắt buộc");
        }
    }

    private void validateUpdateImportRequest(InventoryDocumentRequest req) {
        validateRequiredImportFields(req);
    }

    private void validateRequiredExportFields(InventoryDocumentRequest req) {
        validateCommonRequiredFields(req, "xuat", true);
    }

    private void validateRequiredImportFields(InventoryDocumentRequest req) {
        validateCommonRequiredFields(req, "nhap", false);
    }

    private void validateCommonRequiredFields(InventoryDocumentRequest req, String label, boolean exportDocument) {
        if (req == null) {
            throw new BusinessException("Dữ liệu yêu cầu phiếu " + label + " kho là bắt buộc");
        }
        if (req.getWarehouseId() == null) {
            throw new BusinessException("warehouseId là bắt buộc");
        }
        if (req.getDocDate() == null) {
            throw new BusinessException("docDate là bắt buộc");
        }
        if (req.getLines() == null || req.getLines().isEmpty()) {
            throw new BusinessException("Phiếu " + label + " kho phải có ít nhất một dòng chi tiết");
        }
        for (int i = 0; i < req.getLines().size(); i++) {
            InventoryDocumentLineRequest line = req.getLines().get(i);
            if (line == null || line.getVariantId() == null) {
                throw new BusinessException("lines[" + i + "].variantId la bat buoc");
            }
            if (exportDocument) {
                requirePositive(line.getQuantityOut(), "lines[" + i + "].quantityOut");
            } else {
                requirePositive(line.getQuantityIn(), "lines[" + i + "].quantityIn");
            }
        }
    }

    private void ensureEditable(InventoryDocument doc) {
        String status = normalizeStatusValue(doc.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException("Chỉ có thể cập nhật phiếu lưu tạm");
        }
    }

    private void validateExportInventoryBalance(Long warehouseId, List<InventoryDocumentLineRequest> lines) {
        if (warehouseId == null || lines == null)
            return;
        for (int i = 0; i < lines.size(); i++) {
            InventoryDocumentLineRequest line = lines.get(i);
            if (line.getVariantId() == null || line.getQuantityOut() == null)
                continue;

            BigDecimal qtyToExport = line.getQuantityOut();
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(warehouseId, line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(warehouseId, line.getVariantId());
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null || balance.getQuantityOnHand().compareTo(qtyToExport) < 0) {
                throw new BusinessException("Số lượng xuất lớn hơn số lượng tồn kho, vui lòng điều chỉnh");
            }
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
                if (num != expected) break; // phát hiện khoảng trống, dừng
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
                if (num != expected) break;
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
                throw new BusinessException("Mã phiếu xuất kho đã tồn tại");
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
                throw new BusinessException("Mã phiếu nhập kho đã tồn tại");
            }
        }
        return docCode;
    }

    private InventoryDocumentLine toExportLineEntity(InventoryDocument doc, InventoryDocumentLineRequest lr,
            int index) {
        if (lr.getQuantityIn() != null && lr.getQuantityIn().compareTo(ZERO) > 0) {
            throw new BusinessException("Phiếu xuất kho không được có quantityIn");
        }
        BigDecimal quantityOut = requirePositive(lr.getQuantityOut(), "lines[" + index + "].quantityOut");
        BigDecimal unitCost = nonNegativeOrZero(lr.getUnitCost(), "lines[" + index + "].unitCost");
        BigDecimal unitPrice = nonNegativeOrZero(lr.getUnitPrice(), "lines[" + index + "].unitPrice");
        BigDecimal rawVat = lr.getVatRate() != null ? lr.getVatRate() : lr.getVatPercent();
        BigDecimal vatRate = validateVatRate(rawVat, "lines[" + index + "].vatRate");
        BigDecimal subtotal = quantityOut.multiply(unitPrice);
        BigDecimal vatAmount = subtotal.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal lineAmount = subtotal.add(vatAmount).setScale(2, RoundingMode.HALF_UP);

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
                if (snValue == null || snValue.trim().isEmpty()) continue;
                SerialNumber snObj = serialNumberRepository.findByVariantIdAndSerialNumber(lr.getVariantId(), snValue.trim()).orElse(null);
                if (snObj != null) {
                    if (!"AVAILABLE".equals(snObj.getStatus())) {
                        throw new BusinessException("Serial " + snValue + " không có sẵn trong kho (trạng thái: " + snObj.getStatus() + ")");
                    }
                    boolean isLocked = inventoryDocumentLineRepository.isSerialLockedInDrafts(snObj.getId(), doc.getId());
                    if (isLocked) {
                        throw new BusinessException("Serial " + snValue + " đang nằm trong một phiếu xuất nháp khác, vui lòng kiểm tra lại");
                    }
                }
            }
        } else if (serialNumberId != null) {
            SerialNumber snObj = serialNumberRepository.findById(serialNumberId).orElse(null);
            if (snObj != null) {
                if (!"AVAILABLE".equals(snObj.getStatus())) {
                    throw new BusinessException("Serial " + snObj.getSerialNumber() + " không có sẵn trong kho (trạng thái: " + snObj.getStatus() + ")");
                }
                boolean isLocked = inventoryDocumentLineRepository.isSerialLockedInDrafts(serialNumberId, doc.getId());
                if (isLocked) {
                    throw new BusinessException("Serial " + snObj.getSerialNumber() + " đang nằm trong một phiếu xuất nháp khác, vui lòng kiểm tra lại");
                }
            }
        }

        return InventoryDocumentLine.builder()
                .inventoryDocument(doc)
                .variantId(lr.getVariantId())
                .quantityIn(ZERO)
                .quantityOut(quantityOut)
                .unitCost(unitCost)
                .unitPrice(unitPrice)
                .vatRate(vatRate)
                .vatPercent(vatRate)
                .lineAmount(lineAmount)
                .lotBatchId(lr.getLotBatchId())
                .serialNumberId(serialNumberId)
                .serialNumbersText(formatSerialNumbers(lr.getSerialNumbers()))
                .warrantyMonths(warrantyMonths)
                .note(lr.getNote())
                .build();
    }

    private InventoryDocumentLine toImportLineEntity(InventoryDocument doc, InventoryDocumentLineRequest lr,
            int index) {
        if (lr.getQuantityOut() != null && lr.getQuantityOut().compareTo(ZERO) > 0) {
            throw new BusinessException("Phiếu nhập kho không được có quantityOut");
        }
        BigDecimal quantityIn = requirePositive(lr.getQuantityIn(), "lines[" + index + "].quantityIn");
        BigDecimal unitCost = nonNegativeOrZero(lr.getUnitCost(), "lines[" + index + "].unitCost");
        BigDecimal rawVat = lr.getVatPercent() != null ? lr.getVatPercent() : lr.getVatRate();
        BigDecimal vatRate = validateVatRate(rawVat, "lines[" + index + "].vatPercent");
        BigDecimal subtotal = quantityIn.multiply(unitCost);
        BigDecimal vatAmount = subtotal.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal lineAmount = subtotal.add(vatAmount).setScale(2, RoundingMode.HALF_UP);
        return InventoryDocumentLine.builder()
                .inventoryDocument(doc)
                .variantId(lr.getVariantId())
                .quantityIn(quantityIn)
                .quantityOut(ZERO)
                .unitCost(unitCost)
                .unitPrice(unitCost)
                .vatRate(vatRate)
                .lineAmount(lineAmount)
                .lotBatchId(lr.getLotBatchId())
                .serialNumberId(lr.getSerialNumberId())
                .serialNumbersText(formatSerialNumbers(lr.getSerialNumbers()))
                .warrantyMonths(lr.getWarrantyMonths())
                .note(lr.getNote())
                .vatPercent(vatRate)
                .build();
    }

    private BigDecimal validateVatRate(BigDecimal value, String fieldName) {
        if (value == null) {
            return ZERO;
        }
        if (value.compareTo(ZERO) < 0 || value.compareTo(new BigDecimal("10")) > 0) {
            throw new BusinessException("Thuế VAT phải nằm trong khoảng từ 0% đến 10%");
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
            throw new BusinessException("Trạng thái phiếu xuất kho phải là lưu tạm");
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
            throw new BusinessException("Trạng thái phiếu nhập kho phải là lưu tạm");
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
            throw new BusinessException("Trạng thái phiếu kho không hợp lệ");
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
        if (!"APPROVED".equals(so.getStatus())) {
            throw new BusinessException("Chỉ có thể tạo phiếu xuất kho cho đơn hàng ĐÃ DUYỆT");
        }

        InventoryDocument doc = new InventoryDocument();
        doc.setDocCode(resolveCreateDocCode(null));
        doc.setDocType(EXPORT_DOC_TYPE);
        doc.setDocDate(LocalDate.now());
        doc.setPartnerId(so.getPartnerId());
        doc.setWarehouseId(so.getWarehouseId());
        doc.setReferenceType("SALES_ORDER");
        doc.setReferenceId(so.getId());
        doc.setSalesOrderId(so.getId());
        doc.setCreatedBy(actorUserId);
        doc.setStatus(DEFAULT_STATUS);
        doc.setIssuePurpose(ISSUE_PURPOSE_SALES);

        for (SalesOrderLine soLine : so.getLines()) {
            InventoryDocumentLine line = new InventoryDocumentLine();
            line.setInventoryDocument(doc);
            line.setVariantId(soLine.getVariantId());
            line.setQuantityOut(soLine.getQuantity());
            line.setQuantityIn(ZERO);
            line.setUnitCost(ZERO);
            line.setUnitPrice(soLine.getUnitPrice());
            line.setVatRate(soLine.getVatRate());
            line.setVatPercent(soLine.getVatRate());
            line.setWarrantyMonths(soLine.getWarrantyMonths());
            line.setLineAmount(soLine.getLineAmount());
            line.setNote(soLine.getNote());
            doc.getLines().add(line);
        }

        return toResponse(inventoryDocumentRepository.save(doc));
    }

    private InventoryDocumentResponse toResponse(InventoryDocument doc, boolean includeLines) {
        InventoryDocumentResponse r = new InventoryDocumentResponse();
        r.setId(doc.getId());
        r.setDocCode(doc.getDocCode());
        r.setDocType(doc.getDocType());
        r.setIssuePurpose(doc.getIssuePurpose());
        r.setReferenceType(doc.getReferenceType());
        r.setReferenceId(doc.getReferenceId());
        r.setWarehouseId(doc.getWarehouseId());
        r.setSourceWarehouseId(doc.getSourceWarehouseId());
        r.setPurchaseOrderId(doc.getPurchaseOrderId());
        r.setSalesOrderId(doc.getSalesOrderId());
        r.setPartnerId(doc.getPartnerId());
        r.setDocDate(doc.getDocDate());
        r.setPostedAt(doc.getPostedAt());
        r.setStatus(doc.getStatus());
        r.setNote(doc.getNote());
        r.setCreatedBy(doc.getCreatedBy());
        r.setApprovedBy(doc.getApprovedBy());
        r.setCreatedAt(doc.getCreatedAt());
        r.setUpdatedAt(doc.getUpdatedAt());
        r.setRecipientName(doc.getRecipientName());
        r.setRecipientAddress(doc.getRecipientAddress());
        r.setSalespersonId(doc.getSalespersonId());

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
            if ("ASSEMBLY_ORDER".equals(doc.getReferenceType())) {
                assemblyOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(order -> r.setReferenceCode(order.getOrderCode()));
            } else if ("BOM".equals(doc.getReferenceType())) {
                assemblyBomRepository.findById(doc.getReferenceId())
                        .ifPresent(bom -> r.setReferenceCode(bom.getBomCode()));
            } else if ("SALES_ORDER".equals(doc.getReferenceType())) {
                salesOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(so -> r.setReferenceCode(so.getSoCode()));
            } else if ("REPAIR".equals(doc.getReferenceType())) {
                repairRepository.findById(doc.getReferenceId())
                        .ifPresent(repair -> r.setReferenceCode(repair.getRepairCode()));
            }
        }

        if (r.getReferenceCode() == null && doc.getSalesOrderId() != null) {
             salesOrderRepository.findById(doc.getSalesOrderId())
                        .ifPresent(so -> {
                            r.setReferenceCode(so.getSoCode());
                            if (r.getReferenceType() == null) {
                                r.setReferenceType("SALES_ORDER");
                            }
                        });
        }

        if (doc.getLines() != null) {
            List<InventoryDocumentLineResponse> lines = doc.getLines().stream().map(l -> {
                InventoryDocumentLineResponse lr = new InventoryDocumentLineResponse();
                lr.setId(l.getId());
                lr.setVariantId(l.getVariantId());
                lr.setQuantityIn(l.getQuantityIn());
                lr.setQuantityOut(l.getQuantityOut());
                lr.setUnitCost(l.getUnitCost());
                lr.setUnitPrice(l.getUnitPrice());
                lr.setVatRate(l.getVatRate());
                lr.setLineAmount(l.getLineAmount());
                lr.setLotBatchId(l.getLotBatchId());
                lr.setSerialNumberId(l.getSerialNumberId());
                lr.setSerialNumbers(parseSerialNumbers(l.getSerialNumbersText()));
                lr.setWarrantyMonths(l.getWarrantyMonths());
                lr.setNote(l.getNote());
                lr.setVatPercent(l.getVatPercent());
                return lr;
            }).collect(Collectors.toList());
            r.setLines(lines);
        }
        return r;
    }
}
