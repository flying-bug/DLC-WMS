package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.dto.request.ProductVariantRequest;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.dto.response.ProductVariantResponse;
import com.duylongtech.backend.entity.Brand;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductCategory;
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
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SalesOrderLineRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.StockTransferLineRepository;
import com.duylongtech.backend.repository.UnitRepository;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final ProductCategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final ProductVariantRepository productVariantRepository;
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
            throw new BusinessException("Mã hàng hóa '" + dto.getProductCode() + "' đã tồn tại.");
        }

        validateProductRequest(dto);

        Product product = convertToEntity(dto);
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
                throw new BusinessException("Mã hàng hóa '" + dto.getProductCode() + "' đã tồn tại trên hệ thống.");
            }
        }

        validateProductRequest(dto);

        product.setProductCode(dto.getProductCode());
        product.setProductName(dto.getProductName());
        product.setProductType(resolveProductType(dto.getProductType()));
        product.setSalePrice(resolveMoney(dto.getSalePrice()));
        product.setTrackSerial(dto.getTrackSerial());
        product.setTrackLot(dto.getTrackLot());
        product.setIsAssembly(dto.getIsAssembly());
        product.setDescription(dto.getDescription());
        product.setActive(dto.getActive());
        product.setTaxReductionStatus(dto.getTaxReductionStatus());
        product.setImageUrl(dto.getImageUrl());
        product.setBomTemplate(dto.getBomTemplate());

        if (dto.getMinStockQty() != null) {
            product.setMinStockQty(dto.getMinStockQty());
        }

        if (dto.getStockQty() != null) {
            product.setStockQty(dto.getStockQty());
        }
        if (dto.getStockValue() != null) {
            product.setStockValue(dto.getStockValue());
        }

        product.setWarrantyPeriod(dto.getWarrantyPeriod());
        product.setWarrantyPeriodMonths(dto.getWarrantyPeriodMonths());

        // Cập nhật quan hệ
        updateRelations(product, dto);

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
                throw new BusinessException("Không thể xóa hàng hóa '" + product.getProductName() + "' vì đã có dữ liệu giao dịch phát sinh trong hệ thống. Bạn có thể chọn 'Ngừng sử dụng' để ẩn hàng hóa.");
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
            throw new BusinessException("Khong the xuat Excel san pham.");
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

    @Transactional
    public ProductVariantResponse createVariant(Long productId, ProductVariantRequest request) {
        Product product = getProductEntity(productId);
        validateVariantRequest(request);
        String sku = normalizeCode(request.getSku());
        if (productVariantRepository.findBySku(sku).isPresent()) {
            throw new BusinessException("SKU da ton tai.");
        }
        String barcode = trimToNull(request.getBarcode());
        if (barcode == null) {
            barcode = sku;
        }
        if (barcode != null && productVariantRepository.findByBarcode(barcode).isPresent()) {
            throw new BusinessException("Barcode da ton tai.");
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
            throw new BusinessException("SKU khong thuoc san pham nay.");
        }
        validateVariantRequest(request);

        String sku = normalizeCode(request.getSku());
        productVariantRepository.findBySku(sku)
                .filter(existing -> !existing.getId().equals(variantId))
                .ifPresent(existing -> {
                    throw new BusinessException("SKU da ton tai.");
                });
        String barcode = trimToNull(request.getBarcode());
        if (barcode == null) {
            barcode = sku;
        }
        if (barcode != null) {
            productVariantRepository.findByBarcode(barcode)
                    .filter(existing -> !existing.getId().equals(variantId))
                    .ifPresent(existing -> {
                        throw new BusinessException("Barcode da ton tai.");
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
            throw new BusinessException("SKU không thuộc sản phẩm này.");
        }
        if (productVariantRepository.countByProductId(productId) <= 1) {
            throw new BusinessException("Sản phẩm phải có ít nhất một SKU.");
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
            throw new BusinessException("Không thể xóa SKU '" + variant.getSku() + "' vì đã có dữ liệu giao dịch phát sinh. Bạn có thể chọn 'Ngừng sử dụng' SKU.");
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
                .barcode(sku)
                .variantName(dto.getProductName().trim())
                .costPrice(BigDecimal.ZERO)
                .salePrice(resolveMoney(dto.getSalePrice()))
                .active(dto.getActive() != null ? dto.getActive() : true)
                .warrantyMonths(dto.getWarrantyPeriodMonths())
                .build();
        productVariantRepository.save(variant);
    }

    private Product getProductEntity(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException("San pham khong ton tai."));
    }

    private void ensureProductExists(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new BusinessException("San pham khong ton tai.");
        }
    }

    private void validateVariantRequest(ProductVariantRequest request) {
        if (request.getSalePrice() != null && request.getSalePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Gia ban khong duoc am.");
        }
        if (request.getCostPrice() != null && request.getCostPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Gia von khong duoc am.");
        }
    }

    private ProductVariantResponse convertVariantToDto(ProductVariant variant) {
        Product product = variant.getProduct();
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
                .manufacturerPartNumber(variant.getManufacturerPartNumber())
                .specsJson(variant.getSpecsJson())
                .active(variant.getActive())
                .warrantyMonths((variant.getWarrantyMonths() == null || variant.getWarrantyMonths() <= 0) && product != null ? product.getWarrantyPeriodMonths() : variant.getWarrantyMonths())
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
            throw new BusinessException("Danh muc la bat buoc.");
        } else {
            product.setCategory(null);
        }

        if (dto.getUnitId() != null) {
            Unit unit = unitRepository.findById(dto.getUnitId())
                    .orElseThrow(() -> new BusinessException("Don vi tinh khong ton tai."));
            product.setUnit(unit);
        } else if (!isDichVu) {
            throw new BusinessException("Don vi tinh la bat buoc.");
        } else {
            product.setUnit(null);
        }
    }

    private Product convertToEntity(ProductRequest dto) {
        Product product = Product.builder()
                .productCode(dto.getProductCode())
                .productName(dto.getProductName())
                .productType(resolveProductType(dto.getProductType()))
                .salePrice(resolveMoney(dto.getSalePrice()))
                .trackSerial(dto.getTrackSerial() != null ? dto.getTrackSerial() : false)
                .trackLot(dto.getTrackLot() != null ? dto.getTrackLot() : false)
                .isAssembly(dto.getIsAssembly() != null ? dto.getIsAssembly() : false)
                .description(dto.getDescription())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .taxReductionStatus(dto.getTaxReductionStatus() != null ? dto.getTaxReductionStatus() : "Chưa xác định")
                .stockQty(dto.getStockQty() != null ? dto.getStockQty() : BigDecimal.ZERO)
                .minStockQty(dto.getMinStockQty() != null ? dto.getMinStockQty() : BigDecimal.ZERO)
                .stockValue(dto.getStockValue() != null ? dto.getStockValue() : BigDecimal.ZERO)
                .imageUrl(dto.getImageUrl())
                .bomTemplate(dto.getBomTemplate())
                .warrantyPeriod(dto.getWarrantyPeriod())
                .warrantyPeriodMonths(dto.getWarrantyPeriodMonths())
                .build();

        updateRelations(product, dto);
        return product;
    }

    private void validateProductRequest(ProductRequest dto) {
        if (dto.getSalePrice() != null && dto.getSalePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Gia ban khong duoc am.");
        }
        if (dto.getStockQty() != null && dto.getStockQty().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("So luong ton khong duoc am.");
        }
        if (dto.getStockValue() != null && dto.getStockValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Gia tri ton khong duoc am.");
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

    private ProductResponse convertToDto(Product product) {
        return convertToDtoWithStock(product, product.getStockQty());
    }

    private ProductResponse convertToDtoWithStock(Product product, BigDecimal stockQty) {
        return ProductResponse.builder()
                .id(product.getId())
                .productCode(product.getProductCode())
                .productName(product.getProductName())
                .productType(product.getProductType())
                .salePrice(product.getSalePrice())
                .trackSerial(product.getTrackSerial())
                .trackLot(product.getTrackLot())
                .isAssembly(product.getIsAssembly())
                .description(product.getDescription())
                .active(product.getActive())
                .taxReductionStatus(product.getTaxReductionStatus())
                .stockQty(stockQty)
                .minStockQty(product.getMinStockQty())
                .stockValue(product.getStockValue())
                .imageUrl(product.getImageUrl())
                .bomTemplate(product.getBomTemplate())
                .warrantyPeriod(product.getWarrantyPeriod())
                .warrantyPeriodMonths(product.getWarrantyPeriodMonths())
                .brandId(product.getBrand() != null ? product.getBrand().getId() : null)
                .brandName(product.getBrand() != null ? product.getBrand().getName() : null)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .unitId(product.getUnit() != null ? product.getUnit().getId() : null)
                .unitName(product.getUnit() != null ? product.getUnit().getName() : null)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
