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
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.User;
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

    private static final String EXPORT_DOC_TYPE = "EX_SO";
    private static final String IMPORT_DOC_TYPE = "IN_PO";
    private static final String DEFAULT_STATUS = "DRAFT";
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_STATUSES = Set.of("DRAFT", "SUBMITTED", "APPROVED", "POSTED", "CANCELLED");
    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "SUBMITTED");

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryCostLayerRepository inventoryCostLayerRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final ProductVariantRepository productVariantRepository;
    private final WarrantyRepository warrantyRepository;
    private final PartnerRepository partnerRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ScanResolveResponse resolveExportScan(ScanResolveRequest req) {
        String code = trimToNull(req != null ? req.getCode() : null);
        if (code == null) {
            throw new BusinessException("Ma quet la bat buoc");
        }
        if (req.getWarehouseId() == null) {
            throw new BusinessException("warehouseId la bat buoc");
        }

        return serialNumberRepository.findBySerialNumber(code)
                .map(serial -> resolveSerialScan(serial, req.getWarehouseId(), code))
                .orElseGet(() -> resolveVariantScan(code));
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
            String status, Long warehouseId) {
        String normalizedDocCode = trimToNull(docCode);
        String normalizedStatus = normalizeOptionalStatus(status);
        boolean noFilters = normalizedDocCode == null && fromDate == null && toDate == null && normalizedStatus == null
                && warehouseId == null;
        List<InventoryDocument> docs = noFilters
                ? inventoryDocumentRepository.findAllImports()
                : inventoryDocumentRepository.searchImports(normalizedDocCode, fromDate, toDate, normalizedStatus, warehouseId);
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryDocumentResponse getImportDetail(Long id) {
        return toResponse(findImportOrThrow(id));
    }

    @Transactional
    public InventoryDocumentResponse createExport(InventoryDocumentRequest req) {
        validateCreateRequest(req);
        validateExportInventoryBalance(req.getWarehouseId(), req.getLines());
        InventoryDocument doc = buildBaseDocument(req, EXPORT_DOC_TYPE, resolveCreateDocCode(req.getDocCode()));
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toExportLineEntity(doc, req.getLines().get(i), i));
        }
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional
    public InventoryDocumentResponse createImport(InventoryDocumentRequest req) {
        validateCreateImportRequest(req);
        InventoryDocument doc = buildBaseDocument(req, IMPORT_DOC_TYPE, resolveCreateImportDocCode(req.getDocCode()));
        for (int i = 0; i < req.getLines().size(); i++) {
            doc.getLines().add(toImportLineEntity(doc, req.getLines().get(i), i));
        }
        return toResponse(inventoryDocumentRepository.save(doc));
    }

    @Transactional
    public InventoryDocumentResponse updateExport(Long id, InventoryDocumentRequest req) {
        validateUpdateRequest(req);
        validateExportInventoryBalance(req.getWarehouseId(), req.getLines());
        InventoryDocument doc = findExportOrThrow(id);
        ensureEditable(doc);
        updateBaseDocument(id, doc, req, "Ma phieu xuat kho da ton tai", false);
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
        updateBaseDocument(id, doc, req, "Ma phieu nhap kho da ton tai", true);
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
            throw new BusinessException("Chi phieu xuat kho DRAFT hoac SUBMITTED moi co the ghi so");
        }

        for (InventoryDocumentLine line : doc.getLines()) {
            BigDecimal qtyToExport = line.getQuantityOut();
            SerialNumber serialNumber = null;
            if (line.getSerialNumberId() != null) {
                serialNumber = serialNumberRepository.findById(line.getSerialNumberId())
                        .orElseThrow(() -> new BusinessException("Khong tim thay serial can xuat"));
                validateExportSerial(doc, line, serialNumber, qtyToExport);
            }
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(doc.getWarehouseId(), line.getVariantId(), "GOOD")
                    .orElseThrow(() -> new BusinessException("Khong tim thay ton kho GOOD cho san pham " + line.getVariantId()));

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

            if (remainingQty.compareTo(ZERO) > 0) {
                throw new BusinessException("Khong du cost layer FIFO cho san pham " + line.getVariantId());
            }

            BigDecimal avgUnitCost = totalCost.divide(qtyToExport, 4, RoundingMode.HALF_UP);
            line.setUnitCost(avgUnitCost);
            inventoryLedgerRepository.save(buildLedger(doc, line, "OUT", ZERO, qtyToExport, avgUnitCost, balance.getQuantityOnHand()));

            if (serialNumber != null) {
                updateExportedSerialBalance(doc, line, serialNumber, avgUnitCost);
                // Tự động tạo phiếu bảo hành nếu line có khai báo warrantyMonths > 0
                generateWarrantyIfNeeded(doc, line, serialNumber);
            }
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
            throw new BusinessException("Chi phieu nhap kho DRAFT hoac SUBMITTED moi co the ghi so");
        }

        InventoryDocument savedDoc = inventoryDocumentRepository.saveAndFlush(doc);
        for (InventoryDocumentLine line : savedDoc.getLines()) {
            BigDecimal qtyToImport = line.getQuantityIn();
            BigDecimal unitCost = nonNegativeOrZero(line.getUnitCost(), "unitCost");
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(savedDoc.getWarehouseId(), line.getVariantId(), "GOOD")
                    .orElseGet(() -> InventoryBalance.builder()
                            .warehouseId(savedDoc.getWarehouseId())
                            .variantId(line.getVariantId())
                            .stockStatus("GOOD")
                            .quantityOnHand(ZERO)
                            .quantityReserved(ZERO)
                            .averageCost(ZERO)
                            .updatedAt(LocalDateTime.now())
                            .build());

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

            inventoryLedgerRepository.save(buildLedger(savedDoc, line, "IN", qtyToImport, ZERO, unitCost, balance.getQuantityOnHand()));
            createImportedSerialsIfNeeded(savedDoc, line, unitCost);
        }

        savedDoc.setStatus("POSTED");
        savedDoc.setPostedAt(LocalDateTime.now());
        savedDoc.setUpdatedAt(LocalDateTime.now());
        return toResponse(inventoryDocumentRepository.save(savedDoc));
    }

    private InventoryDocument buildBaseDocument(InventoryDocumentRequest req, String docType, String docCode) {
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

    private void updateBaseDocument(Long id, InventoryDocument doc, InventoryDocumentRequest req, String duplicateMessage,
            boolean importDocument) {
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
            throw new BusinessException("Serial khong kha dung de xuat kho: " + code);
        }
        if (!warehouseId.equals(serial.getWarehouseId())) {
            throw new BusinessException("Serial khong nam trong kho dang chon");
        }
        ProductVariant variant = serial.getVariant();
        if (variant == null) {
            throw new BusinessException("Serial chua gan SKU san pham");
        }
        return buildScanResponse("SERIAL", code, variant, serial);
    }

    private ScanResolveResponse resolveVariantScan(String code) {
        ProductVariant variant = productVariantRepository.findByBarcode(code)
                .or(() -> productVariantRepository.findBySku(code))
                .orElseThrow(() -> new BusinessException("Khong tim thay SKU hoac serial cho ma: " + code));
        Product product = variant.getProduct();
        if (Boolean.TRUE.equals(product != null ? product.getTrackSerial() : null)) {
            throw new BusinessException("San pham quan ly serial, vui long quet serial cua tung san pham");
        }
        return buildScanResponse("BARCODE", code, variant, null);
    }

    private ScanResolveResponse buildScanResponse(String type, String code, ProductVariant variant, SerialNumber serial) {
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
                .build();
    }

    private void validateExportSerial(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial,
            BigDecimal quantityOut) {
        if (quantityOut.compareTo(BigDecimal.ONE) != 0) {
            throw new BusinessException("Moi dong xuat serial phai co so luong bang 1");
        }
        if (!line.getVariantId().equals(serial.getVariantId())) {
            throw new BusinessException("Serial khong thuoc SKU tren dong xuat");
        }
        if (!doc.getWarehouseId().equals(serial.getWarehouseId())) {
            throw new BusinessException("Serial khong nam trong kho xuat");
        }
        if (!"AVAILABLE".equalsIgnoreCase(serial.getStatus())) {
            throw new BusinessException("Serial khong kha dung de xuat kho");
        }
    }

    private void updateExportedSerialBalance(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial,
            BigDecimal unitCost) {
        InventoryBalance serialBalance = inventoryBalanceRepository
                .findByWarehouseVariantSerialForUpdate(doc.getWarehouseId(), line.getVariantId(), serial.getId(), "GOOD")
                .orElseThrow(() -> new BusinessException("Khong tim thay ton kho cho serial " + serial.getSerialNumber()));
        if (serialBalance.getQuantityOnHand().compareTo(BigDecimal.ONE) < 0) {
            throw new BusinessException("Serial " + serial.getSerialNumber() + " khong con ton kho");
        }
        serialBalance.setQuantityOnHand(ZERO);
        serialBalance.setUpdatedAt(LocalDateTime.now());
        inventoryBalanceRepository.save(serialBalance);

        serial.setStatus("SOLD");
        serial.setSoldAt(LocalDateTime.now());
        serial.setUpdatedAt(LocalDateTime.now());
        serialNumberRepository.save(serial);
    }

    /**
     * Tự động tạo phiếu bảo hành (WARRANTY) cho serial number vừa được xuất bán,
     * nếu dòng sản phẩm có khai báo warrantyMonths > 0.
     * Điều kiện:
     *   - line.warrantyMonths phải được lưu trước trong entity (xem InventoryDocumentLine.warrantyMonths)
     *   - doc phải có partnerId (khách hàng mua)
     * Phiếu bảo hành sẽ không được tạo nếu serial đó đã có warranty tồn tại
     * (tránh duplicate khi gọi lại postExport do lỗi retry).
     */
    private void generateWarrantyIfNeeded(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial) {
        Integer warrantyMonths = line.getWarrantyMonths();
        if (warrantyMonths == null || warrantyMonths <= 0) {
            return; // Sản phẩm này không có chính sách bảo hành
        }
        if (doc.getPartnerId() == null) {
            return; // Không có khách hàng — không tạo bảo hành
        }
        // Kiểm tra idempotency: tránh tạo trùng nếu có retry
        boolean alreadyExists = warrantyRepository.existsBySerialNumberId(serial.getId());
        if (alreadyExists) {
            return;
        }

        LocalDate startDate = doc.getDocDate();
        LocalDate endDate = startDate.plusMonths(warrantyMonths);
        String warrantyCode = "BH-" + doc.getDocCode() + "-" + serial.getSerialNumber();
        // Đảm bảo warrantyCode không vượt quá 50 ký tự (giới hạn schema)
        if (warrantyCode.length() > 50) {
            warrantyCode = "BH-" + System.currentTimeMillis() + "-" + serial.getId();
        }

        Warranty warranty = Warranty.builder()
                .warrantyCode(warrantyCode)
                .serialNumberId(serial.getId())
                .partnerId(doc.getPartnerId())
                .salesOrderId(doc.getSalesOrderId())
                .startDate(startDate)
                .endDate(endDate)
                .warrantyStatus("APPROVED")
                .note("Phieu bao hanh tu dong tao tu phieu xuat kho " + doc.getDocCode())
                .build();
        warrantyRepository.save(warranty);
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
            throw new BusinessException("San pham quan ly serial phai co dung " + expectedQuantity + " serial");
        }

        for (String serialValue : serialValues) {
            if (serialNumberRepository.findBySerialNumber(serialValue).isPresent()) {
                throw new BusinessException("Serial da ton tai: " + serialValue);
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
            throw new BusinessException(fieldName + " phai la so nguyen");
        }
    }

    private InventoryDocument findExportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException("ID phieu xuat kho la bat buoc");
        }
        return inventoryDocumentRepository.findExportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Khong tim thay phieu xuat kho"));
    }

    private InventoryDocument findImportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException("ID phieu nhap kho la bat buoc");
        }
        return inventoryDocumentRepository.findImportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Khong tim thay phieu nhap kho"));
    }

    private void validateCreateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException("Nguoi tao phieu (createdBy) la bat buoc");
        }
    }

    private void validateUpdateRequest(InventoryDocumentRequest req) {
        validateRequiredExportFields(req);
    }

    private void validateCreateImportRequest(InventoryDocumentRequest req) {
        validateRequiredImportFields(req);
        if (req.getCreatedBy() == null) {
            throw new BusinessException("Nguoi tao phieu (createdBy) la bat buoc");
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
            throw new BusinessException("Du lieu yeu cau phieu " + label + " kho la bat buoc");
        }
        if (req.getWarehouseId() == null) {
            throw new BusinessException("warehouseId la bat buoc");
        }
        if (req.getDocDate() == null) {
            throw new BusinessException("docDate la bat buoc");
        }
        if (req.getLines() == null || req.getLines().isEmpty()) {
            throw new BusinessException("Phieu " + label + " kho phai co it nhat mot dong chi tiet");
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
            throw new BusinessException("Chi co the cap nhat phieu DRAFT hoac SUBMITTED");
        }
    }

    private void validateExportInventoryBalance(Long warehouseId, List<InventoryDocumentLineRequest> lines) {
        if (warehouseId == null || lines == null) return;
        for (int i = 0; i < lines.size(); i++) {
            InventoryDocumentLineRequest line = lines.get(i);
            if (line.getVariantId() == null || line.getQuantityOut() == null) continue;
            
            BigDecimal qtyToExport = line.getQuantityOut();
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(warehouseId, line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null || balance.getQuantityOnHand().compareTo(qtyToExport) < 0) {
                throw new BusinessException("Số lượng xuất lớn hơn số lượng tồn kho, vui lòng điều chỉnh");
            }
        }
    }

    private String resolveCreateDocCode(String requestedCode) {
        String docCode = trimToNull(requestedCode);
        if (docCode == null) {
            Optional<InventoryDocument> lastDoc = inventoryDocumentRepository.findTopByDocCodeStartingWithOrderByDocCodeDesc("XK-");
            if (lastDoc.isPresent()) {
                String lastCode = lastDoc.get().getDocCode();
                try {
                    int lastNum = Integer.parseInt(lastCode.substring(3));
                    docCode = String.format("XK-%05d", lastNum + 1);
                } catch (NumberFormatException e) {
                    docCode = "XK-" + System.currentTimeMillis();
                }
            } else {
                docCode = "XK-00001";
            }
        }
        if (inventoryDocumentRepository.existsByDocCode(docCode)) {
            throw new BusinessException("Ma phieu xuat kho da ton tai");
        }
        return docCode;
    }

    private String resolveCreateImportDocCode(String requestedCode) {
        String docCode = trimToNull(requestedCode);
        if (docCode == null) {
            docCode = "IMP-" + System.currentTimeMillis();
        }
        if (inventoryDocumentRepository.existsByDocCode(docCode)) {
            throw new BusinessException("Ma phieu nhap kho da ton tai");
        }
        return docCode;
    }

    private InventoryDocumentLine toExportLineEntity(InventoryDocument doc, InventoryDocumentLineRequest lr, int index) {
        if (lr.getQuantityIn() != null && lr.getQuantityIn().compareTo(ZERO) > 0) {
            throw new BusinessException("Phieu xuat kho khong duoc co quantityIn");
        }
        BigDecimal quantityOut = requirePositive(lr.getQuantityOut(), "lines[" + index + "].quantityOut");
        BigDecimal unitCost = nonNegativeOrZero(lr.getUnitCost(), "lines[" + index + "].unitCost");
        BigDecimal unitPrice = nonNegativeOrZero(lr.getUnitPrice(), "lines[" + index + "].unitPrice");
        BigDecimal lineAmount = quantityOut.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
        return InventoryDocumentLine.builder()
                .inventoryDocument(doc)
                .variantId(lr.getVariantId())
                .quantityIn(ZERO)
                .quantityOut(quantityOut)
                .unitCost(unitCost)
                .unitPrice(unitPrice)
                .lineAmount(lineAmount)
                .lotBatchId(lr.getLotBatchId())
                .serialNumberId(lr.getSerialNumberId())
                .warrantyMonths(lr.getWarrantyMonths())
                .note(lr.getNote())
                .build();
    }

    private InventoryDocumentLine toImportLineEntity(InventoryDocument doc, InventoryDocumentLineRequest lr, int index) {
        if (lr.getQuantityOut() != null && lr.getQuantityOut().compareTo(ZERO) > 0) {
            throw new BusinessException("Phieu nhap kho khong duoc co quantityOut");
        }
        BigDecimal quantityIn = requirePositive(lr.getQuantityIn(), "lines[" + index + "].quantityIn");
        BigDecimal unitCost = nonNegativeOrZero(lr.getUnitCost(), "lines[" + index + "].unitCost");
        BigDecimal lineAmount = quantityIn.multiply(unitCost).setScale(2, RoundingMode.HALF_UP);
        return InventoryDocumentLine.builder()
                .inventoryDocument(doc)
                .variantId(lr.getVariantId())
                .quantityIn(quantityIn)
                .quantityOut(ZERO)
                .unitCost(unitCost)
                .unitPrice(unitCost)
                .lineAmount(lineAmount)
                .lotBatchId(lr.getLotBatchId())
                .serialNumberId(lr.getSerialNumberId())
                .serialNumbersText(formatSerialNumbers(lr.getSerialNumbers()))
                .note(lr.getNote())
                .build();
    }

    private BigDecimal requirePositive(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(ZERO) <= 0) {
            throw new BusinessException(fieldName + " phai lon hon 0");
        }
        return value;
    }

    private BigDecimal nonNegativeOrZero(BigDecimal value, String fieldName) {
        if (value == null) {
            return ZERO;
        }
        if (value.compareTo(ZERO) < 0) {
            throw new BusinessException(fieldName + " phai lon hon hoac bang 0");
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
            throw new BusinessException("Trang thai phieu xuat kho phai la DRAFT hoac SUBMITTED");
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
            throw new BusinessException("Trang thai phieu nhap kho phai la DRAFT hoac SUBMITTED");
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
            throw new BusinessException("Trang thai phieu kho khong hop le");
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
        if (doc.getLines() != null) {
            List<InventoryDocumentLineResponse> lines = doc.getLines().stream().map(l -> {
                InventoryDocumentLineResponse lr = new InventoryDocumentLineResponse();
                lr.setId(l.getId());
                lr.setVariantId(l.getVariantId());
                lr.setQuantityIn(l.getQuantityIn());
                lr.setQuantityOut(l.getQuantityOut());
                lr.setUnitCost(l.getUnitCost());
                lr.setUnitPrice(l.getUnitPrice());
                lr.setLineAmount(l.getLineAmount());
                lr.setLotBatchId(l.getLotBatchId());
                lr.setSerialNumberId(l.getSerialNumberId());
                lr.setNote(l.getNote());
                return lr;
            }).collect(Collectors.toList());
            r.setLines(lines);
        }
        return r;
    }
}
