package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.brand.Brand;
import com.duylongtech.backend.feature.brand.BrandRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderLineRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.StockTransferLineRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {
    private static final SecureRandom SERIAL_RANDOM = new SecureRandom();
    private static final long SERIAL_MIN = 100_000_000_000L;
    private static final long SERIAL_RANGE = 900_000_000_000L;
    private static final int MAX_SERIAL_ATTEMPTS_PER_CODE = 20;

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final ProductCategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductUnitConversionRepository productUnitConversionRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryCostLayerRepository inventoryCostLayerRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final StockTransferLineRepository stockTransferLineRepository;
    private final SalesOrderLineRepository salesOrderLineRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final AssemblyBomRepository assemblyBomRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final ProductMapper productMapper;

    public Page<ProductResponse> getProducts(int page, int size, String search, Long categoryId, String productType, Long brandId, Long unitId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<Product> productPage = productRepository.searchProducts(search, categoryId, productType, brandId, unitId, pageable);
        List<Long> productIds = productPage.getContent().stream().map(Product::getId).toList();
        java.util.Map<Long, BigDecimal> stockMap = new java.util.HashMap<>();
        if (!productIds.isEmpty()) {
            List<Object[]> stockResults = inventoryBalanceRepository.sumQuantityOnHandByProductIds(productIds);
            for (Object[] result : stockResults) {
                stockMap.put((Long) result[0], (BigDecimal) result[1]);
            }
        }
        return productPage.map(product -> convertToDtoWithStock(product, stockMap.getOrDefault(product.getId(), BigDecimal.ZERO)));
    }

    public StockAlertSummaryResponse getStockAlertSummary() {
        ProductRepository.StockAlertSummaryProjection summary = productRepository.getStockAlertSummary();
        int lowStockCount = summary != null && summary.getLowStockCount() != null
                ? summary.getLowStockCount()
                : 0;
        int outOfStockCount = summary != null && summary.getOutOfStockCount() != null
                ? summary.getOutOfStockCount()
                : 0;

        return StockAlertSummaryResponse.builder()
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .build();
    }

    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hàng hóa với ID: " + id));
        return convertToDtoWithStock(product, getActualStock(id));
    }

    private BigDecimal getActualStock(Long productId) {
        List<Object[]> stockResults = inventoryBalanceRepository.sumQuantityOnHandByProductIds(List.of(productId));
        return stockResults.isEmpty() ? BigDecimal.ZERO : (BigDecimal) stockResults.get(0)[1];
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest dto) {
        if (dto.getProductCode() == null || dto.getProductCode().isBlank()) {
            dto.setProductCode(codeGeneratorService.generateCode("products", "product_code", "SP", 5));
        }
        if (productRepository.findByProductCode(dto.getProductCode()).isPresent()) {
            throw new BusinessException(String.format(SystemMessage.PROD_ERR_020.getMessage(), dto.getProductCode()));
        }

        validateProductRequest(dto);

        Product product = convertToEntity(dto);
        updateUnitConversions(product, dto.getUnitConversions());
        Product saved = productRepository.save(product);
        createDefaultVariant(saved, dto);
        return convertToDto(saved);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hàng hóa với ID: " + id));

        // Kiểm tra trùng mã khi cập nhật mã khác
        if (!product.getProductCode().equals(dto.getProductCode())) {
            if (productRepository.findByProductCode(dto.getProductCode()).isPresent()) {
                throw new BusinessException(String.format(SystemMessage.PROD_ERR_019.getMessage(), dto.getProductCode()));
            }
        }

        validateProductRequest(dto);

        product.updateDetails(dto.getProductName(), null, null, null, dto.getDescription());
        product.updatePricing(resolveMoney(dto.getSalePrice()), dto.getVatRate(), dto.getTaxReductionStatus());
        product.updateTracking(dto.getTrackSerial(), dto.getTrackLot(), dto.getIsAssembly());
        product.updateStock(dto.getStockQty(), dto.getStockValue());
        product.setImageUrl(dto.getImageUrl());
        if (dto.getActive() != null) {
            if (dto.getActive()) product.activate();
            else product.deactivate();
        }

        // Cập nhật quan hệ
        updateRelations(product, dto);
        updateUnitConversions(product, dto.getUnitConversions());

        Product updated = productRepository.save(product);
        syncVariantDefaultsAfterProductUpdate(updated, dto);
        return convertToDtoWithStock(updated, getActualStock(updated.getId()));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hàng hóa để xóa."));

        List<ProductVariant> variants = productVariantRepository.findByProductIdOrderByIdAsc(id);
        List<Long> variantIds = variants.stream().map(ProductVariant::getId).toList();

        if (!variantIds.isEmpty()) {
            boolean hasTransactions = hasOperationalReferences(variantIds)
                    || assemblyBomRepository.existsByProductId(id);

            if (hasTransactions) {
                throw new BusinessException(String.format(SystemMessage.PROD_ERR_018.getMessage(), product.getProductName()));
            }

            // Cleanup non-transaction inventory balances & cost layers for these variants
            inventoryBalanceRepository.deleteByVariantIdIn(variantIds);
            inventoryCostLayerRepository.deleteByVariantIdIn(variantIds);

            // Delete variants
            productVariantRepository.deleteAll(variants);
        }

        productRepository.delete(product);
    }

    @Transactional(readOnly = true)
    public byte[] exportProductsToExcel(String search, Long categoryId, String productType, Long brandId, Long unitId, String exporterName) {
        List<Product> products = productRepository.searchProducts(search, categoryId, productType, brandId, unitId, Pageable.unpaged()).getContent();
        List<Long> productIds = products.stream().map(Product::getId).toList();
        java.util.Map<Long, BigDecimal> stockMap = new java.util.HashMap<>();
        if (!productIds.isEmpty()) {
            List<Object[]> stockResults = inventoryBalanceRepository.sumQuantityOnHandByProductIds(productIds);
            for (Object[] result : stockResults) {
                stockMap.put((Long) result[0], (BigDecimal) result[1]);
            }
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Danh Sach San Pham");

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("BAO CAO DANH SACH SAN PHAM");
            titleCell.setCellStyle(titleStyle);

            Row exporterRow = sheet.createRow(1);
            exporterRow.createCell(0).setCellValue("Nguoi xuat:");
            exporterRow.createCell(1).setCellValue(exporterName);

            Row timeRow = sheet.createRow(2);
            timeRow.createCell(0).setCellValue("Thoi gian xuat:");
            timeRow.createCell(1).setCellValue(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));

            Row filterRow = sheet.createRow(3);
            filterRow.createCell(0).setCellValue("Tu khoa:");
            filterRow.createCell(1).setCellValue(search != null && !search.trim().isEmpty() ? search.trim() : "Tat ca");

            sheet.createFreezePane(0, 6);

            Row headerRow = sheet.createRow(5);
            String[] columns = {
                    "STT",
                    "Ma san pham",
                    "Ten san pham",
                    "Danh muc",
                    "Thuong hieu",
                    "Don vi tinh",
                    "Gia ban",
                    "Ton kho",
                    "Trang thai",
                    "Mo ta"
            };
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 6;
            int index = 1;
            for (Product product : products) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(index++);
                row.createCell(1).setCellValue(product.getProductCode());
                row.createCell(2).setCellValue(product.getProductName());
                row.createCell(3).setCellValue(product.getCategory() != null ? product.getCategory().getName() : "");
                row.createCell(4).setCellValue(product.getBrand() != null ? product.getBrand().getName() : "");
                row.createCell(5).setCellValue(product.getUnit() != null ? product.getUnit().getName() : "");
                row.createCell(6).setCellValue(toDouble(product.getSalePrice()));
                row.createCell(7).setCellValue(toDouble(stockMap.getOrDefault(product.getId(), BigDecimal.ZERO)));
                row.createCell(8).setCellValue(Boolean.FALSE.equals(product.getActive()) ? "Ngung su dung" : "Dang su dung");
                row.createCell(9).setCellValue(product.getDescription() != null ? product.getDescription() : "");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BusinessException(SystemMessage.PROD_ERR_017.getMessage());
        }
    }

    private double toDouble(BigDecimal value) {
        return value != null ? value.doubleValue() : 0D;
    }

    public Page<ProductVariantResponse> getVariants(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return productVariantRepository.searchVariants(search, pageable).map(this::convertVariantToDto);
    }

    public List<ProductVariantResponse> getVariantsByProduct(Long productId) {
        ensureProductExists(productId);
        return productVariantRepository.findByProductIdOrderByIdAsc(productId)
                .stream()
                .map(this::convertVariantToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> generateSerialCodes(Long productId, Long variantId, int quantity) {
        if (quantity < 1 || quantity > 1000) {
            throw new BusinessException(SystemMessage.PROD_ERR_016.getMessage());
        }
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new BusinessException("SKU khong ton tai."));
        if (variant.getProduct() == null || !variant.getProduct().getId().equals(productId)) {
            throw new BusinessException(SystemMessage.PROD_ERR_013.getMessage());
        }
        if (!Boolean.TRUE.equals(variant.getProduct().getTrackSerial())) {
            throw new BusinessException(SystemMessage.PROD_ERR_015.getMessage());
        }

        Set<String> codes = new LinkedHashSet<>(quantity);
        int maxAttempts = quantity * MAX_SERIAL_ATTEMPTS_PER_CODE;
        for (int attempts = 0; codes.size() < quantity && attempts < maxAttempts; attempts++) {
            String code = generateRandomSerialCode();
            if (!codes.contains(code) && !serialNumberRepository.existsBySerialNumber(code)) {
                codes.add(code);
            }
        }
        if (codes.size() < quantity) {
            throw new BusinessException(SystemMessage.PROD_ERR_014.getMessage());
        }
        return List.copyOf(codes);
    }

    static String generateRandomSerialCode() {
        return String.valueOf(SERIAL_MIN + Math.floorMod(SERIAL_RANDOM.nextLong(), SERIAL_RANGE));
    }

    @Transactional
    public ProductVariantResponse createVariant(Long productId, ProductVariantRequest request) {
        Product product = getProductEntity(productId);
        validateVariantRequest(request);
        String sku = normalizeCode(request.getSku());
        if (productVariantRepository.findBySku(sku).isPresent()) {
            throw new BusinessException(SystemMessage.PROD_ERR_012.getMessage());
        }
        String barcode = trimToNull(request.getBarcode());
        if (barcode == null) {
            barcode = generateBarcode();
        }
        if (barcode != null && productVariantRepository.findByBarcode(barcode).isPresent()) {
            throw new BusinessException(SystemMessage.PROD_ERR_011.getMessage());
        }

        ProductVariant variant = new ProductVariant();
        variant.initVariant(product, sku, barcode, request.getVariantName().trim());
        variant.updatePricing(resolveMoney(request.getCostPrice()), resolveMoney(request.getSalePrice()));
        variant.setManufacturerPartNumber(trimToNull(request.getManufacturerPartNumber()));
        variant.setSpecsJson(trimToNull(request.getSpecsJson()));
        variant.setActive(request.getActive() != null ? request.getActive() : true);
        variant.setWarrantyMonths(request.getWarrantyMonths());
        return convertVariantToDto(productVariantRepository.save(variant));
    }

    @Transactional
    public ProductVariantResponse updateVariant(Long productId, Long variantId, ProductVariantRequest request) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new BusinessException("SKU khong ton tai."));
        if (variant.getProduct() == null || !variant.getProduct().getId().equals(productId)) {
            throw new BusinessException(SystemMessage.PROD_ERR_013.getMessage());
        }
        validateVariantRequest(request);

        String sku = normalizeCode(request.getSku());
        productVariantRepository.findBySku(sku)
                .filter(existing -> !existing.getId().equals(variantId))
                .ifPresent(existing -> {
                    throw new BusinessException(SystemMessage.PROD_ERR_012.getMessage());
                });
        String barcode = trimToNull(request.getBarcode());
        if (barcode == null) {
            barcode = variant.getBarcode();
        }
        if (barcode != null) {
            productVariantRepository.findByBarcode(barcode)
                    .filter(existing -> !existing.getId().equals(variantId))
                    .ifPresent(existing -> {
                        throw new BusinessException(SystemMessage.PROD_ERR_011.getMessage());
                    });
        }

        variant.setSku(sku);
        variant.updateDetails(request.getVariantName().trim(), barcode, trimToNull(request.getManufacturerPartNumber()), trimToNull(request.getSpecsJson()));
        variant.updatePricing(resolveMoney(request.getCostPrice()), resolveMoney(request.getSalePrice()));
        if (request.getActive() != null && !request.getActive()) variant.deactivate(); else variant.activate();
        variant.setWarrantyMonths(request.getWarrantyMonths());
        return convertVariantToDto(productVariantRepository.save(variant));
    }

    @Transactional
    public void deleteVariant(Long productId, Long variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new BusinessException("SKU không tồn tại."));
        if (variant.getProduct() == null || !variant.getProduct().getId().equals(productId)) {
            throw new BusinessException(SystemMessage.PROD_ERR_010.getMessage());
        }
        if (productVariantRepository.countByProductId(productId) <= 1) {
            throw new BusinessException(SystemMessage.PROD_ERR_009.getMessage());
        }

        List<Long> variantIds = List.of(variantId);
        if (hasOperationalReferences(variantIds)) {
            throw new BusinessException(String.format(SystemMessage.PROD_ERR_008.getMessage(), variant.getSku()));
        }

        inventoryBalanceRepository.deleteByVariantIdIn(variantIds);
        inventoryCostLayerRepository.deleteByVariantIdIn(variantIds);
        productVariantRepository.delete(variant);
    }

    private void createDefaultVariant(Product product, ProductRequest dto) {
        String sku = normalizeCode(dto.getProductCode());
        if (productVariantRepository.findBySku(sku).isPresent()) {
            return;
        }
        ProductVariant variant = new ProductVariant();
        variant.initVariant(product, sku, generateBarcode(), dto.getProductName().trim());
        variant.updatePricing(BigDecimal.ZERO, resolveMoney(dto.getSalePrice()));
        variant.setActive(dto.getActive() != null ? dto.getActive() : true);
        variant.setWarrantyMonths(dto.getWarrantyPeriodMonths());
        productVariantRepository.save(variant);
    }

    private String generateBarcode() {
        return codeGeneratorService.generateCode("product_variants", "barcode", "BC", 8);
    }

    private Product getProductEntity(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException("San pham khong ton tai."));
    }

    private void ensureProductExists(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new BusinessException(SystemMessage.PROD_ERR_007.getMessage());
        }
    }

    private void validateVariantRequest(ProductVariantRequest request) {
        if (request.getSalePrice() != null && request.getSalePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(SystemMessage.PROD_ERR_003.getMessage());
        }
        if (request.getCostPrice() != null && request.getCostPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(SystemMessage.PROD_ERR_006.getMessage());
        }
    }

    private ProductVariantResponse convertVariantToDto(ProductVariant variant) {
        Product product = variant.getProduct();
        List<ProductUnitConversionResponse> conversions = null;
        if (product != null) {
            conversions = productUnitConversionRepository.findByProductId(product.getId())
                    .stream()
                    .map(conv -> ProductUnitConversionResponse.builder()
                            .id(conv.getId())
                            .unitId(conv.getUnit().getId())
                            .unitName(conv.getUnit().getName())
                            .operator(conv.getOperator())
                            .ratio(conv.getRatio())
                            .note(conv.getNote())
                            .build())
                    .collect(Collectors.toList());
        }

        return ProductVariantResponse.builder()
                .id(variant.getId())
                .productId(product != null ? product.getId() : null)
                .productCode(product != null ? product.getProductCode() : null)
                .productName(product != null ? product.getProductName() : null)
                .productType(product != null ? product.getProductType() : null)
                .trackSerial(product != null ? product.getTrackSerial() : false)
                .brandId(product != null && product.getBrand() != null ? product.getBrand().getId() : null)
                .brandName(product != null && product.getBrand() != null ? product.getBrand().getName() : null)
                .categoryId(product != null && product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product != null && product.getCategory() != null ? product.getCategory().getName() : null)
                .categoryDescription(product != null && product.getCategory() != null ? product.getCategory().getDescription() : null)
                .unitId(product != null && product.getUnit() != null ? product.getUnit().getId() : null)
                .unitName(product != null && product.getUnit() != null ? product.getUnit().getName() : null)
                .sku(variant.getSku())
                .barcode(variant.getBarcode())
                .variantName(variant.getVariantName())
                .costPrice(variant.getCostPrice())
                .salePrice((variant.getSalePrice() == null || variant.getSalePrice().compareTo(BigDecimal.ZERO) == 0) && product != null ? product.getSalePrice() : variant.getSalePrice())
                .vatRate(product != null && product.getVatRate() != null ? product.getVatRate() : BigDecimal.valueOf(8))
                .manufacturerPartNumber(variant.getManufacturerPartNumber())
                .specsJson(variant.getSpecsJson())
                .active(variant.getActive())
                .warrantyMonths((variant.getWarrantyMonths() == null || variant.getWarrantyMonths() <= 0) && product != null ? product.getWarrantyPeriodMonths() : variant.getWarrantyMonths())
                .unitConversions(conversions)
                .createdAt(variant.getCreatedAt())
                .updatedAt(variant.getUpdatedAt())
                .build();
    }

    private void updateRelations(Product product, ProductRequest dto) {
        boolean isDichVu = "Dịch vụ".equals(dto.getProductType()) || "Dich vu".equals(dto.getProductType());

        if (dto.getBrandId() != null) {
            Brand brand = brandRepository.findById(dto.getBrandId())
                    .orElseThrow(() -> new BusinessException("Thuong hieu khong ton tai."));
            product.setBrand(brand);
        } else if (!isDichVu) {
            // Hàng hóa / Thành phẩm: thương hiệu bắt buộc (có thể bỏ nếu muốn linh hoạt)
            product.setBrand(null);
        }

        if (dto.getCategoryId() != null) {
            ProductCategory category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new BusinessException("Danh muc khong ton tai."));
            product.setCategory(category);
        } else if (!isDichVu) {
            throw new BusinessException(SystemMessage.PROD_ERR_005.getMessage());
        } else {
            product.setCategory(null);
        }

        if (dto.getUnitId() != null) {
            Unit unit = unitRepository.findById(dto.getUnitId())
                    .orElseThrow(() -> new BusinessException("Don vi tinh khong ton tai."));
            product.setUnit(unit);
        } else if (!isDichVu) {
            throw new BusinessException(SystemMessage.PROD_ERR_004.getMessage());
        } else {
            product.setUnit(null);
        }
    }

    private Product convertToEntity(ProductRequest dto) {
        Product product = new Product();
        product.initProduct(
            dto.getProductCode(),
            dto.getProductName(),
            resolveProductType(dto.getProductType()),
            null, null, null,
            dto.getDescription()
        );
        product.updatePricing(
            resolveMoney(dto.getSalePrice()),
            dto.getVatRate() == null ? java.math.BigDecimal.valueOf(8) : dto.getVatRate(),
            dto.getTaxReductionStatus() == null ? "Chưa xác định" : dto.getTaxReductionStatus()
        );
        product.updateTracking(
            dto.getTrackSerial() == null ? false : dto.getTrackSerial(),
            dto.getTrackLot() == null ? false : dto.getTrackLot(),
            dto.getIsAssembly() == null ? false : dto.getIsAssembly()
        );
        product.updateStock(
            dto.getStockQty() == null ? java.math.BigDecimal.ZERO : dto.getStockQty(),
            dto.getStockValue() == null ? java.math.BigDecimal.ZERO : dto.getStockValue()
        );
        product.setImageUrl(dto.getImageUrl());

        if (dto.getActive() == null || dto.getActive()) {
            product.activate();
        } else {
            product.deactivate();
        }

        updateRelations(product, dto);
        return product;
    }

    private void validateProductRequest(ProductRequest dto) {
        if (dto.getSalePrice() != null && dto.getSalePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(SystemMessage.PROD_ERR_003.getMessage());
        }
        if (dto.getStockQty() != null && dto.getStockQty().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(SystemMessage.PROD_ERR_002.getMessage());
        }
        if (dto.getStockValue() != null && dto.getStockValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(SystemMessage.PROD_ERR_001.getMessage());
        }
    }

    private String resolveProductType(String productType) {
        return productType != null && !productType.trim().isEmpty() ? productType.trim() : "Hang hoa";
    }

    private BigDecimal resolveMoney(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String normalizeCode(String value) {
        return value != null ? value.trim().toUpperCase() : "";
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private void updateUnitConversions(Product product, List<ProductUnitConversionRequest> conversionRequests) {
        if (product.getUnitConversions() == null) {
            product.setUnitConversions(new java.util.ArrayList<>());
        } else {
            product.getUnitConversions().clear();
        }
        if (conversionRequests != null && !conversionRequests.isEmpty()) {
            for (ProductUnitConversionRequest req : conversionRequests) {
                if (req.getUnitId() == null || req.getRatio() == null || req.getRatio().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                Unit unit = unitRepository.findById(req.getUnitId())
                        .orElseThrow(() -> new BusinessException("Đơn vị chuyển đổi không tồn tại: ID " + req.getUnitId()));
                String op = "DIVIDE".equalsIgnoreCase(req.getOperator()) || "/".equals(req.getOperator()) ? "DIVIDE" : "MULTIPLY";
                ProductUnitConversion conv = new ProductUnitConversion();
                conv.initConversion(product, unit, op, req.getRatio(), req.getNote());
                product.getUnitConversions().add(conv);
            }
        }
    }

    private ProductResponse convertToDto(Product product) {
        return convertToDtoWithStock(product, product.getStockQty());
    }

    private ProductResponse convertToDtoWithStock(Product product, BigDecimal stockQty) {
        List<ProductUnitConversionResponse> convList = new java.util.ArrayList<>();
        if (product.getUnitConversions() != null) {
            for (ProductUnitConversion c : product.getUnitConversions()) {
                convList.add(ProductUnitConversionResponse.builder()
                        .id(c.getId())
                        .unitId(c.getUnit() != null ? c.getUnit().getId() : null)
                        .unitName(c.getUnit() != null ? c.getUnit().getName() : null)
                        .operator(c.getOperator())
                        .ratio(c.getRatio())
                        .note(c.getNote())
                        .build());
            }
        }

        ProductResponse response = productMapper.toResponse(product);
        response.setStockQty(stockQty);

        if (product.getVatRate() == null) {
            response.setVatRate(BigDecimal.valueOf(8));
        }
        response.setUnitConversions(convList);
        return response;
    }

    /**
     * Kiểm tra variant có đang bị tham chiếu bởi các nghiệp vụ khác (nhập/xuất kho,
     * chuyển kho, đơn bán, serial, lắp ráp) hay không — dùng chung cho cả xóa Product
     * (deleteProduct) và xóa Variant (deleteVariant) để tránh lặp code.
     */
    private boolean hasOperationalReferences(List<Long> variantIds) {
        return inventoryDocumentLineRepository.existsByVariantIdIn(variantIds)
                || inventoryLedgerRepository.existsByVariantIdIn(variantIds)
                || stockTransferLineRepository.existsByVariantIdIn(variantIds)
                || salesOrderLineRepository.existsByVariantIdIn(variantIds)
                || serialNumberRepository.existsByVariantIdIn(variantIds)
                || assemblyBomRepository.existsByComponentVariantIdIn(variantIds)
                || assemblyOrderRepository.existsByTargetVariantIdIn(variantIds)
                || assemblyOrderRepository.existsByComponentVariantIdIn(variantIds);
    }

    private String resolveTrackingMode(String requestedMode, Product product) {
        String mode = trimToNull(requestedMode);
        if (mode == null) {
            boolean serial = product != null && Boolean.TRUE.equals(product.getTrackSerial());
            boolean lot = product != null && Boolean.TRUE.equals(product.getTrackLot());
            if (serial && lot) return "SERIAL_LOT";
            if (serial) return "SERIAL";
            if (lot) return "LOT";
            return "NONE";
        }
        mode = mode.toUpperCase(Locale.ROOT);
        if (!Set.of("NONE", "LOT", "SERIAL", "SERIAL_LOT").contains(mode)) {
            throw new BusinessException("trackingMode khong hop le.");
        }
        return mode;
    }

    /**
     * Khi Product chỉ có đúng 1 variant, đồng bộ lại giá bán / tồn kho tối thiểu /
     * bảo hành của variant đó theo giá trị mới của Product sau khi update.
     */
    private void syncVariantDefaultsAfterProductUpdate(Product product, ProductRequest dto) {
        List<ProductVariant> variants = productVariantRepository.findByProductIdOrderByIdAsc(product.getId());
        if (variants.size() == 1) {
            ProductVariant variant = variants.get(0);
            variant.setSalePrice(resolveMoney(dto.getSalePrice()));
            variant.setTrackingMode(resolveTrackingMode(null, product));
            variant.setMinStockQty(resolveMoney(dto.getMinStockQty()));
            variant.setWarrantyMonths(defaultWarrantyMonths(product));
            productVariantRepository.save(variant);
            return;
        }
        if (Boolean.TRUE.equals(dto.getApplyWarrantyToVariants())) {
            variants.forEach(variant -> variant.setWarrantyMonths(defaultWarrantyMonths(product)));
            productVariantRepository.saveAll(variants);
        }
    }

    private Integer defaultWarrantyMonths(Product product) {
        return product.getWarrantyPeriodMonths() != null ? product.getWarrantyPeriodMonths() : 0;
    }

}
