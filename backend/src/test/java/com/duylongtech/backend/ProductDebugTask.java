package com.duylongtech.backend;

import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
class ProductDebugTask {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Test
    void debugProducts() {
        System.out.println("DEBUGGING PRODUCTS AND VARIANTS:");
        List<Product> products = productRepository.findAll();
        System.out.println("Total products: " + products.size());
        
        int createdCount = 0;
        for (Product p : products) {
            long variantCount = productVariantRepository.countByProductId(p.getId());
            if (variantCount == 0) {
                System.out.println("Product " + p.getProductCode() + " has NO variants. Creating default variant...");
                
                String sku = p.getProductCode() != null ? p.getProductCode().trim().toUpperCase() : "SKU-" + p.getId();
                
                ProductVariant variant = ProductVariant.builder()
                        .product(p)
                        .sku(sku)
                        .barcode(sku)
                        .variantName(p.getProductName() != null ? p.getProductName().trim() : "Default")
                        .costPrice(java.math.BigDecimal.ZERO)
                        .salePrice(p.getSalePrice() != null ? p.getSalePrice() : java.math.BigDecimal.ZERO)
                        .active(p.getActive() != null ? p.getActive() : true)
                        .build();
                        
                productVariantRepository.save(variant);
                createdCount++;
            }
        }
        
        System.out.println("Created " + createdCount + " missing variants!");
    }
}
