package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.brand.BrandRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderLineRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.StockTransferLineRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductServiceReadTest {

    @Test
    void getProductsBatchLoadsUnitConversionsWithoutTouchingLazyCollection() {
        ProductRepository productRepository = mock(ProductRepository.class);
        ProductUnitConversionRepository conversionRepository = mock(ProductUnitConversionRepository.class);
        InventoryBalanceRepository balanceRepository = mock(InventoryBalanceRepository.class);
        ProductMapper productMapper = mock(ProductMapper.class);
        Product product = mock(Product.class);
        ProductUnitConversion conversion = mock(ProductUnitConversion.class);
        Unit conversionUnit = mock(Unit.class);
        ProductResponse mappedResponse = ProductResponse.builder().id(224L).build();

        when(product.getId()).thenReturn(224L);
        when(product.getVatRate()).thenReturn(BigDecimal.valueOf(8));
        when(conversion.getProduct()).thenReturn(product);
        when(conversion.getUnit()).thenReturn(conversionUnit);
        when(conversion.getId()).thenReturn(91L);
        when(conversion.getOperator()).thenReturn("MULTIPLY");
        when(conversion.getRatio()).thenReturn(new BigDecimal("12"));
        when(conversionUnit.getId()).thenReturn(7L);
        when(conversionUnit.getName()).thenReturn("Thùng");
        when(productRepository.searchProducts(isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(product), PageRequest.of(0, 20), 1));
        when(balanceRepository.sumSellableQuantityByProductIds(List.of(224L)))
                .thenReturn(Collections.singletonList(new Object[]{224L, new BigDecimal("5")}));
        when(conversionRepository.findAllWithUnitByProductIdIn(List.of(224L)))
                .thenReturn(List.of(conversion));
        when(productMapper.toResponse(product)).thenReturn(mappedResponse);

        Page<ProductResponse> result = service(productRepository, conversionRepository, balanceRepository, productMapper)
                .getProducts(0, 20, null, null, null, null, null);

        ProductResponse response = result.getContent().get(0);
        assertEquals(new BigDecimal("5"), response.getStockQty());
        assertNotNull(response.getUnitConversions());
        assertEquals(1, response.getUnitConversions().size());
        assertEquals(7L, response.getUnitConversions().get(0).getUnitId());
        assertEquals("Thùng", response.getUnitConversions().get(0).getUnitName());
        verify(conversionRepository).findAllWithUnitByProductIdIn(List.of(224L));
        verify(product, never()).getUnitConversions();
    }

    private static ProductService service(ProductRepository productRepository,
            ProductUnitConversionRepository conversionRepository,
            InventoryBalanceRepository balanceRepository,
            ProductMapper productMapper) {
        return new ProductService(
                productRepository,
                mock(BrandRepository.class),
                mock(ProductCategoryRepository.class),
                mock(UnitRepository.class),
                mock(ProductVariantRepository.class),
                conversionRepository,
                balanceRepository,
                mock(InventoryCostLayerRepository.class),
                mock(InventoryDocumentLineRepository.class),
                mock(InventoryLedgerRepository.class),
                mock(StockTransferLineRepository.class),
                mock(SalesOrderLineRepository.class),
                mock(SerialNumberRepository.class),
                mock(AssemblyBomRepository.class),
                mock(AssemblyOrderRepository.class),
                mock(CodeGeneratorService.class),
                productMapper);
    }
}
