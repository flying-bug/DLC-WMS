package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.service.*;

import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.ProductUnitConversionRequest;
import com.duylongtech.backend.dto.request.ProductVariantRequest;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.dto.response.ProductUnitConversionResponse;
import com.duylongtech.backend.dto.response.ProductVariantResponse;
import com.duylongtech.backend.dto.response.StockAlertSummaryResponse;
import com.duylongtech.backend.entity.Brand;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductCategory;
import com.duylongtech.backend.entity.ProductUnitConversion;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.Unit;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.BrandRepository;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.InventoryCostLayerRepository;
import com.duylongtech.backend.repository.InventoryDocumentLineRepository;
import com.duylongtech.backend.repository.InventoryLedgerRepository;
import com.duylongtech.backend.repository.ProductCategoryRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductUnitConversionRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SalesOrderLineRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.StockTransferLineRepository;
import com.duylongtech.backend.repository.UnitRepository;
import com.duylongtech.backend.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.duylongtech.backend.exception.BusinessException;
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
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductServiceImpl  implements ProductService {
    private static final SecureRandom SERIAL_RANDOM = new SecureRandom();
    private static final long SERIAL_MIN = 100_000_000_000L;
    private static final String DEFAULT_UNIT_CODE = "CAI";
    private static final long SERIAL_RANGE = 900_000_000_000L;
    private static final int MAX_SERIAL_ATTEMPTS_PER_CODE = 20;
    private static final int MAX_VARIANTS_PER_CREATE = 100;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private enum ProductCreateMode {
        SINGLE,
        MULTI
    }

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
    private final com.duylongtech.backend.mapper.ProductMapper productMapper;

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

        productMapper.updateEntity(product, dto);
        product.setProductType(resolveProductType(dto.getProductType()));
        product.setSalePrice(resolveMoney(dto.getSalePrice()));

        // Cập nhật quan hệ
        updateRelations(product, dto);
        updateUnitConversions(product, dto.getUnitConversions());

        Product updated = productRepository.save(product);
        return convertToDtoWithStock(updated, getActualStock(updated.getId()));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hàng hóa để xóa."));

        List<ProductVariant> variants = productVariantRepository.findByProductIdOrderByIdAsc(id);
        List<Long> variantIds = variants.stream().map(ProductVariant::getId).toList();

        if (!variantIds.isEmpty()) {
            boolean hasTransactions = inventoryDocumentLineRepository.existsByVariantIdIn(variantIds)
                    || inventoryLedgerRepository.existsByVariantIdIn(variantIds)
                    || stockTransferLineRepository.existsByVariantIdIn(variantIds)
                    || salesOrderLineRepository.existsByVariantIdIn(variantIds)
                    || serialNumberRepository.existsByVariantIdIn(variantIds)
                    || assemblyBomRepository.existsByProductId(id)
                    || assemblyBomRepository.existsByComponentVariantIdIn(variantIds)
                    || assemblyOrderRepository.existsByTargetVariantIdIn(variantIds)
                    || assemblyOrderRepository.existsByComponentVariantIdIn(variantIds);

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

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(sku)
                .barcode(barcode)
                .variantName(request.getVariantName().trim())
                .costPrice(resolveMoney(request.getCostPrice()))
                .salePrice(resolveMoney(request.getSalePrice()))
                .manufacturerPartNumber(trimToNull(request.getManufacturerPartNumber()))
                .specsJson(trimToNull(request.getSpecsJson()))
                .active(request.getActive() != null ? request.getActive() : true)
                .warrantyMonths(request.getWarrantyMonths())
                .build();
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
        variant.setBarcode(barcode);
        variant.setVariantName(request.getVariantName().trim());
        variant.setCostPrice(resolveMoney(request.getCostPrice()));
        variant.setSalePrice(resolveMoney(request.getSalePrice()));
        variant.setManufacturerPartNumber(trimToNull(request.getManufacturerPartNumber()));
        variant.setSpecsJson(trimToNull(request.getSpecsJson()));
        variant.setActive(request.getActive() != null ? request.getActive() : true);
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
        boolean hasTransactions = inventoryDocumentLineRepository.existsByVariantIdIn(variantIds)
                || inventoryLedgerRepository.existsByVariantIdIn(variantIds)
                || stockTransferLineRepository.existsByVariantIdIn(variantIds)
                || salesOrderLineRepository.existsByVariantIdIn(variantIds)
                || serialNumberRepository.existsByVariantIdIn(variantIds)
                || assemblyBomRepository.existsByComponentVariantIdIn(variantIds)
                || assemblyOrderRepository.existsByTargetVariantIdIn(variantIds)
                || assemblyOrderRepository.existsByComponentVariantIdIn(variantIds);

        if (hasTransactions) {
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
        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(sku)
                .barcode(generateBarcode())
                .variantName(dto.getProductName().trim())
                .costPrice(BigDecimal.ZERO)
                .salePrice(resolveMoney(dto.getSalePrice()))
                .active(dto.getActive() != null ? dto.getActive() : true)
                .warrantyMonths(dto.getWarrantyPeriodMonths())
                .build();
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
        Product product = productMapper.toEntity(dto);
        product.setProductType(resolveProductType(dto.getProductType()));
        product.setSalePrice(resolveMoney(dto.getSalePrice()));
        if (product.getVatRate() == null) product.setVatRate(BigDecimal.valueOf(8));
        if (product.getTrackSerial() == null) product.setTrackSerial(false);
        if (product.getTrackLot() == null) product.setTrackLot(false);
        if (product.getIsAssembly() == null) product.setIsAssembly(false);
        if (product.getActive() == null) product.setActive(true);
        if (product.getTaxReductionStatus() == null) product.setTaxReductionStatus("Chưa xác định");
        if (product.getStockQty() == null) product.setStockQty(BigDecimal.ZERO);
        if (product.getMinStockQty() == null) product.setMinStockQty(BigDecimal.ZERO);
        if (product.getStockValue() == null) product.setStockValue(BigDecimal.ZERO);

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
                ProductUnitConversion conv = ProductUnitConversion.builder()
                        .product(product)
                        .unit(unit)
                        .operator(op)
                        .ratio(req.getRatio())
                        .note(req.getNote())
                        .build();
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



    private ProductVariant buildVariant(Product product, ProductVariantRequest request) {
        String barcode = trimToNull(request.getBarcode());
        if (barcode == null) {
            barcode = generateBarcode();
        }
        return ProductVariant.builder()
                .product(product)
                .sku(normalizeCode(request.getSku()))
                .barcode(barcode)
                .variantName(request.getVariantName().trim())
                .costPrice(resolveMoney(request.getCostPrice()))
                .salePrice(resolveMoney(request.getSalePrice()))
                .manufacturerPartNumber(trimToNull(request.getManufacturerPartNumber()))
                .specsJson(trimToNull(request.getSpecsJson()))
                .trackingMode(resolveTrackingMode(request.getTrackingMode(), product))
                .minStockQty(resolveMoney(request.getMinStockQty()))
                .active(request.getActive() != null ? request.getActive() : true)
                .warrantyMonths(request.getWarrantyMonths() != null ? request.getWarrantyMonths() : defaultWarrantyMonths(product))
                .build();
    }


    private ProductCreateMode resolveCreateMode(ProductRequest dto) {
        boolean hasVariantRows = dto.getVariants() != null && !dto.getVariants().isEmpty();
        if (Boolean.TRUE.equals(dto.getHasVariants())) {
            if (!hasVariantRows) {
                throw new BusinessException(SystemMessage.PROD_ERR_022.getMessage());
            }
            return ProductCreateMode.MULTI;
        }
        if (hasVariantRows) {
            throw new BusinessException(SystemMessage.PROD_ERR_021.getMessage());
        }
        return ProductCreateMode.SINGLE;
    }


    private List<ProductVariantRequest> validateExplicitVariants(ProductRequest dto) {
        List<ProductVariantRequest> variants = dto.getVariants() != null ? dto.getVariants() : List.of();
        if (variants.isEmpty() || variants.size() > MAX_VARIANTS_PER_CREATE) {
            throw new BusinessException(SystemMessage.PROD_ERR_022.getMessage());
        }

        Set<String> requestSkus = new HashSet<>();
        Set<String> requestBarcodes = new HashSet<>();
        Set<String> requestSpecs = new HashSet<>();
        List<String> skuBatch = new ArrayList<>();
        List<String> barcodeBatch = new ArrayList<>();
        boolean hasActive = false;

        for (int i = 0; i < variants.size(); i++) {
            ProductVariantRequest variant = variants.get(i);
            int row = i + 1;
            validateExplicitVariantRow(variant, row);
            String sku = normalizeCode(variant.getSku());
            String barcode = trimToNull(variant.getBarcode());
            String normalizedBarcode = normalizeLookup(barcode);
            String trackingMode = resolveTrackingMode(variant.getTrackingMode(), null);

            if (!requestSkus.add(sku)) {
                throw rowError(row, SystemMessage.PROD_ERR_012.getMessage());
            }
            if (normalizedBarcode != null && !requestBarcodes.add(normalizedBarcode)) {
                throw rowError(row, SystemMessage.PROD_ERR_011.getMessage());
            }

            String specsKey = canonicalSpecsKey(variant.getSpecsJson(), true);
            if (!requestSpecs.add(specsKey)) {
                throw rowError(row, SystemMessage.PROD_ERR_026.getMessage());
            }

            if (isServiceProductType(dto.getProductType()) && !"NONE".equals(trackingMode)) {
                throw rowError(row, SystemMessage.PROD_ERR_030.getMessage());
            }
            if (requiresSerialTracking(dto) && !isSerialTrackingMode(trackingMode)) {
                throw rowError(row, SystemMessage.PROD_ERR_031.getMessage());
            }

            variant.setSku(sku);
            variant.setBarcode(barcode);
            variant.setTrackingMode(trackingMode);
            skuBatch.add(sku);
            if (normalizedBarcode != null) {
                barcodeBatch.add(normalizedBarcode);
            }
            hasActive = hasActive || !Boolean.FALSE.equals(variant.getActive());
        }

        if (!hasActive) {
            throw new BusinessException(SystemMessage.PROD_ERR_024.getMessage());
        }
        if (!skuBatch.isEmpty() && !productVariantRepository.findByNormalizedSkuIn(skuBatch).isEmpty()) {
            throw new BusinessException(SystemMessage.PROD_ERR_012.getMessage());
        }
        if (!barcodeBatch.isEmpty() && !productVariantRepository.findByNormalizedBarcodeIn(barcodeBatch).isEmpty()) {
            throw new BusinessException(SystemMessage.PROD_ERR_011.getMessage());
        }
        return variants;
    }


    private void validateExplicitVariantRow(ProductVariantRequest variant, int row) {
        if (variant == null) {
            throw rowError(row, SystemMessage.FIELD_REQUIRED.getMessage());
        }
        if (trimToNull(variant.getSku()) == null) {
            throw rowError(row, "SKU la bat buoc");
        }
        if (normalizeCode(variant.getSku()).length() > 50) {
            throw rowError(row, "SKU khong duoc vuot qua 50 ky tu");
        }
        if (trimToNull(variant.getBarcode()) != null && trimToNull(variant.getBarcode()).length() > 100) {
            throw rowError(row, "Barcode khong duoc vuot qua 100 ky tu");
        }
        if (trimToNull(variant.getVariantName()) == null) {
            throw rowError(row, "Ten phien ban la bat buoc");
        }
        if (variant.getSalePrice() == null) {
            throw rowError(row, SystemMessage.FIELD_REQUIRED.getMessage());
        }
        validateVariantRequest(variant);
    }


    private BusinessException rowError(int row, String message) {
        return new BusinessException(String.format(SystemMessage.PROD_ERR_025.getMessage(), row, message));
    }


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


    private String canonicalSpecsKey(String specsJson, boolean requireNonEmpty) {
        String raw = trimToNull(specsJson);
        if (raw == null) {
            if (requireNonEmpty) {
                throw new BusinessException(SystemMessage.PROD_ERR_027.getMessage());
            }
            return "";
        }
        try {
            JsonNode node = objectMapper.readTree(raw);
            if (!node.isObject() || (requireNonEmpty && node.isEmpty())) {
                throw new BusinessException(SystemMessage.PROD_ERR_027.getMessage());
            }
            List<String> parts = new ArrayList<>();
            node.fields().forEachRemaining(entry -> {
                JsonNode value = entry.getValue();
                if (value == null || value.isNull() || value.isContainerNode()) {
                    throw new BusinessException(SystemMessage.PROD_ERR_027.getMessage());
                }
                String key = normalizeAttribute(entry.getKey());
                String text = normalizeAttribute(value.asText());
                if (key.isEmpty() || text.isEmpty()) {
                    throw new BusinessException(SystemMessage.PROD_ERR_027.getMessage());
                }
                parts.add(key + "=" + text);
            });
            if (requireNonEmpty && parts.isEmpty()) {
                throw new BusinessException(SystemMessage.PROD_ERR_027.getMessage());
            }
            parts.sort(String::compareTo);
            return String.join("|", parts);
        } catch (JsonProcessingException e) {
            throw new BusinessException(SystemMessage.PROD_ERR_027.getMessage());
        }
    }


    private String normalizeAttribute(String value) {
        return Normalizer.normalize(value != null ? value : "", Normalizer.Form.NFC)
                .trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }


    private boolean isServiceProductType(String productType) {
        String value = normalizeVietnameseLookup(productType);
        return "dich vu".equals(value) || "service".equals(value);
    }


    private boolean requiresSerialTracking(ProductRequest dto) {
        String value = normalizeVietnameseLookup(dto.getProductType());
        return Boolean.TRUE.equals(dto.getIsAssembly())
                || "thanh pham".equals(value)
                || "finished product".equals(value)
                || "finished_product".equals(value);
    }


    private boolean isSerialTrackingMode(String trackingMode) {
        return "SERIAL".equals(trackingMode) || "SERIAL_LOT".equals(trackingMode);
    }


    private String normalizeVietnameseLookup(String value) {
        String normalized = Normalizer.normalize(value != null ? value : "", Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
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


    private String normalizeLookup(String value) {
        return value != null ? value.trim().toLowerCase(Locale.ROOT) : null;
    }


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


    private ProductVariant getPrimaryVariant(Long productId) {
        return getPrimaryVariant(productVariantRepository.findByProductIdOrderByIdAsc(productId));
    }


    private ProductVariant getPrimaryVariant(List<ProductVariant> variants) {
        return variants.stream()
                .filter(variant -> !Boolean.FALSE.equals(variant.getActive()))
                .findFirst()
                .orElse(variants.isEmpty() ? null : variants.get(0));
    }

}
