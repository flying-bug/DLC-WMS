package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.dto.request.ProductVariantRequest;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductCategory;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.Unit;
import com.duylongtech.backend.exception.BusinessException;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductServiceVariantCreationTest {

    @Mock private ProductRepository productRepository;
    @Mock private BrandRepository brandRepository;
    @Mock private ProductCategoryRepository categoryRepository;
    @Mock private UnitRepository unitRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private ProductUnitConversionRepository productUnitConversionRepository;
    @Mock private InventoryBalanceRepository inventoryBalanceRepository;
    @Mock private InventoryCostLayerRepository inventoryCostLayerRepository;
    @Mock private InventoryDocumentLineRepository inventoryDocumentLineRepository;
    @Mock private InventoryLedgerRepository inventoryLedgerRepository;
    @Mock private StockTransferLineRepository stockTransferLineRepository;
    @Mock private SalesOrderLineRepository salesOrderLineRepository;
    @Mock private SerialNumberRepository serialNumberRepository;
    @Mock private AssemblyBomRepository assemblyBomRepository;
    @Mock private AssemblyOrderRepository assemblyOrderRepository;
    @Mock private CodeGeneratorService codeGeneratorService;

    private final List<ProductVariant> savedVariants = new ArrayList<>();
    private ProductService service;

    @BeforeEach
    void setUp() {
        service = new ProductService(
                productRepository,
                brandRepository,
                categoryRepository,
                unitRepository,
                productVariantRepository,
                productUnitConversionRepository,
                inventoryBalanceRepository,
                inventoryCostLayerRepository,
                inventoryDocumentLineRepository,
                inventoryLedgerRepository,
                stockTransferLineRepository,
                salesOrderLineRepository,
                serialNumberRepository,
                assemblyBomRepository,
                assemblyOrderRepository,
                codeGeneratorService);

        when(categoryRepository.findById(10L)).thenReturn(Optional.of(ProductCategory.builder().id(10L).name("Laptop").build()));
        when(unitRepository.findById(20L)).thenReturn(Optional.of(Unit.builder().id(20L).name("Cai").build()));
        when(productRepository.findByProductCode(any())).thenReturn(Optional.empty());
        when(inventoryBalanceRepository.sumQuantityOnHandByProductIds(anyList())).thenReturn(List.of());
        when(productVariantRepository.findByProductIdOrderByIdAsc(1L)).thenAnswer(invocation -> savedVariants);
        when(productRepository.save(any())).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0, Product.class);
            product.setId(1L);
            return product;
        });
        when(productVariantRepository.save(any())).thenAnswer(invocation -> {
            ProductVariant variant = invocation.getArgument(0, ProductVariant.class);
            variant.setId((long) savedVariants.size() + 1);
            savedVariants.add(variant);
            return variant;
        });
        when(productVariantRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<ProductVariant> variants = invocation.getArgument(0);
            for (ProductVariant variant : new ArrayList<>(variants)) {
                variant.setId((long) savedVariants.size() + 1);
                if (!savedVariants.contains(variant)) {
                    savedVariants.add(variant);
                }
            }
            return variants;
        });
    }

    @Test
    void createProduct_legacyPayload_createsDefaultVariant() {
        when(codeGeneratorService.generateCode("product_variants", "barcode", "BC", 8)).thenReturn("BC00000001");

        ProductResponse response = service.createProduct(baseRequest());

        assertEquals(1, savedVariants.size());
        assertEquals("DELL-I15", savedVariants.get(0).getSku());
        assertEquals(new BigDecimal("15000000"), savedVariants.get(0).getSalePrice());
        assertEquals(36, savedVariants.get(0).getWarrantyMonths());
        assertEquals(36, response.getWarrantyPeriodMonths());
        assertEquals(1, response.getVariants().size());
        verify(inventoryLedgerRepository, never()).save(any());
        verify(serialNumberRepository, never()).save(any());
    }

    @Test
    void createProduct_hasVariantsFalseAndEmptyRows_createsDefaultVariant() {
        ProductRequest request = baseRequest();
        request.setHasVariants(false);
        request.setVariants(List.of());
        when(codeGeneratorService.generateCode("product_variants", "barcode", "BC", 8)).thenReturn("BC00000001");

        service.createProduct(request);

        assertEquals(1, savedVariants.size());
        assertEquals("DELL-I15", savedVariants.get(0).getSku());
    }

    @Test
    void createProduct_multiPayload_createsOnlyExplicitVariants() {
        ProductRequest request = baseRequest();
        request.setHasVariants(true);
        request.setVariants(List.of(
                variant("dell-i15-blk", "{\"Mau sac\":\"Den\"}"),
                variant("dell-i15-wht", "{\"Mau sac\":\"Trang\"}")));
        when(productVariantRepository.findByNormalizedSkuIn(anyList())).thenReturn(List.of());
        when(productVariantRepository.findByNormalizedBarcodeIn(anyList())).thenReturn(List.of());
        when(codeGeneratorService.generateCode("product_variants", "barcode", "BC", 8))
                .thenReturn("BC00000001", "BC00000002");

        ProductResponse response = service.createProduct(request);

        assertEquals(2, savedVariants.size());
        assertEquals("DELL-I15-BLK", savedVariants.get(0).getSku());
        assertEquals("DELL-I15-WHT", savedVariants.get(1).getSku());
        assertEquals("BC00000001", response.getVariants().get(0).getBarcode());
        assertEquals("SERIAL", response.getVariants().get(0).getTrackingMode());
        assertEquals(12, response.getVariants().get(0).getWarrantyMonths());
        assertEquals(36, response.getWarrantyPeriodMonths());
        assertEquals(2, response.getVariants().size());
        verify(productVariantRepository, never()).findBySku("DELL-I15");
    }

    @Test
    void createProduct_multiPayloadWithoutVariantWarranty_usesProductWarrantyDefault() {
        ProductRequest request = baseRequest();
        ProductVariantRequest variant = variant("dell-i15-blk", "{\"Mau sac\":\"Den\"}");
        variant.setWarrantyMonths(null);
        request.setHasVariants(true);
        request.setVariants(List.of(variant));
        when(productVariantRepository.findByNormalizedSkuIn(anyList())).thenReturn(List.of());
        when(productVariantRepository.findByNormalizedBarcodeIn(anyList())).thenReturn(List.of());
        when(codeGeneratorService.generateCode("product_variants", "barcode", "BC", 8)).thenReturn("BC00000001");

        service.createProduct(request);

        assertEquals(36, savedVariants.get(0).getWarrantyMonths());
    }

    @Test
    void updateProduct_applyWarrantyToVariants_updatesAllSkuWarrantyForFutureDocuments() {
        Product product = Product.builder()
                .id(1L)
                .productCode("DELL-I15")
                .productName("Dell Inspiron 15")
                .productType("Hang hoa")
                .warrantyPeriodMonths(12)
                .build();
        savedVariants.add(ProductVariant.builder().id(1L).product(product).sku("DELL-I15-BLK").warrantyMonths(12).build());
        savedVariants.add(ProductVariant.builder().id(2L).product(product).sku("DELL-I15-WHT").warrantyMonths(24).build());
        ProductRequest request = baseRequest();
        request.setProductCode("DELL-I15");
        request.setWarrantyPeriodMonths(36);
        request.setWarrantyPeriod("36 tháng");
        request.setApplyWarrantyToVariants(true);
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        service.updateProduct(1L, request);

        assertEquals(36, savedVariants.get(0).getWarrantyMonths());
        assertEquals(36, savedVariants.get(1).getWarrantyMonths());
    }

    @Test
    void createProduct_hasVariantsFalseWithRows_rejectsPayload() {
        ProductRequest request = baseRequest();
        request.setHasVariants(false);
        request.setVariants(List.of(variant("dell-i15-blk", "{\"Mau sac\":\"Den\"}")));

        assertThrows(BusinessException.class, () -> service.createProduct(request));
        verify(productRepository, never()).save(any());
    }

    @Test
    void createProduct_duplicateSpecs_rejectsBeforeSave() {
        ProductRequest request = baseRequest();
        request.setHasVariants(true);
        request.setVariants(List.of(
                variant("dell-i15-blk", "{\"Mau sac\":\"Den\",\"RAM\":\"16GB\"}"),
                variant("dell-i15-blk-2", "{\"RAM\":\"16GB\",\"Mau sac\":\"Den\"}")));

        BusinessException exception = assertThrows(BusinessException.class, () -> service.createProduct(request));

        assertTrue(exception.getMessage().contains("To hop"));
        verify(productRepository, never()).save(any());
    }

    private ProductRequest baseRequest() {
        return ProductRequest.builder()
                .categoryId(10L)
                .unitId(20L)
                .productCode("dell-i15")
                .productName("Dell Inspiron 15")
                .productType("Hang hoa")
                .salePrice(new BigDecimal("15000000"))
                .minStockQty(BigDecimal.ONE)
                .warrantyPeriodMonths(36)
                .warrantyPeriod("36 tháng")
                .active(true)
                .build();
    }

    private ProductVariantRequest variant(String sku, String specsJson) {
        return ProductVariantRequest.builder()
                .sku(sku)
                .variantName("Den")
                .salePrice(new BigDecimal("15000000"))
                .costPrice(BigDecimal.ZERO)
                .trackingMode("SERIAL")
                .minStockQty(BigDecimal.ONE)
                .warrantyMonths(12)
                .active(true)
                .specsJson(specsJson)
                .build();
    }
}
