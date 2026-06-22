package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.entity.Brand;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductCategory;
import com.duylongtech.backend.entity.Unit;
import com.duylongtech.backend.repository.BrandRepository;
import com.duylongtech.backend.repository.ProductCategoryRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.UnitRepository;
import com.duylongtech.backend.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final ProductCategoryRepository categoryRepository;
    private final UnitRepository unitRepository;

    public Page<ProductResponse> getProducts(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return productRepository.searchProducts(search, pageable).map(this::convertToDto);
    }

    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hàng hóa với ID: " + id));
        return convertToDto(product);
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest dto) {
        if (productRepository.findByProductCode(dto.getProductCode()).isPresent()) {
            throw new BusinessException("Mã hàng hóa '" + dto.getProductCode() + "' đã tồn tại.");
        }

        Product product = convertToEntity(dto);
        Product saved = productRepository.save(product);
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

        product.setProductCode(dto.getProductCode());
        product.setProductName(dto.getProductName());
        product.setProductType(dto.getProductType());
        product.setTrackSerial(dto.getTrackSerial());
        product.setTrackLot(dto.getTrackLot());
        product.setIsAssembly(dto.getIsAssembly());
        product.setDescription(dto.getDescription());
        product.setActive(dto.getActive());
        product.setTaxReductionStatus(dto.getTaxReductionStatus());
        product.setImageUrl(dto.getImageUrl());

        if (dto.getStockQty() != null) {
            product.setStockQty(dto.getStockQty());
        }
        if (dto.getStockValue() != null) {
            product.setStockValue(dto.getStockValue());
        }

        // Cập nhật quan hệ
        updateRelations(product, dto);

        Product updated = productRepository.save(product);
        return convertToDto(updated);
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new BusinessException("Không tìm thấy hàng hóa để xóa.");
        }
        productRepository.deleteById(id);
    }

    private void updateRelations(Product product, ProductRequest dto) {
        if (dto.getBrandId() != null) {
            Brand brand = brandRepository.findById(dto.getBrandId()).orElse(null);
            product.setBrand(brand);
        } else {
            product.setBrand(null);
        }

        if (dto.getCategoryId() != null) {
            ProductCategory category = categoryRepository.findById(dto.getCategoryId()).orElse(null);
            product.setCategory(category);
        } else {
            product.setCategory(null);
        }

        if (dto.getUnitId() != null) {
            Unit unit = unitRepository.findById(dto.getUnitId()).orElse(null);
            product.setUnit(unit);
        } else {
            product.setUnit(null);
        }
    }

    private Product convertToEntity(ProductRequest dto) {
        Product product = Product.builder()
                .productCode(dto.getProductCode())
                .productName(dto.getProductName())
                .productType(dto.getProductType())
                .trackSerial(dto.getTrackSerial() != null ? dto.getTrackSerial() : false)
                .trackLot(dto.getTrackLot() != null ? dto.getTrackLot() : false)
                .isAssembly(dto.getIsAssembly() != null ? dto.getIsAssembly() : false)
                .description(dto.getDescription())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .taxReductionStatus(dto.getTaxReductionStatus() != null ? dto.getTaxReductionStatus() : "Chưa xác định")
                .stockQty(dto.getStockQty() != null ? dto.getStockQty() : BigDecimal.ZERO)
                .stockValue(dto.getStockValue() != null ? dto.getStockValue() : BigDecimal.ZERO)
                .imageUrl(dto.getImageUrl())
                .build();

        updateRelations(product, dto);
        return product;
    }

    private ProductResponse convertToDto(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .productCode(product.getProductCode())
                .productName(product.getProductName())
                .productType(product.getProductType())
                .trackSerial(product.getTrackSerial())
                .trackLot(product.getTrackLot())
                .isAssembly(product.getIsAssembly())
                .description(product.getDescription())
                .active(product.getActive())
                .taxReductionStatus(product.getTaxReductionStatus())
                .stockQty(product.getStockQty())
                .stockValue(product.getStockValue())
                .imageUrl(product.getImageUrl())
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
