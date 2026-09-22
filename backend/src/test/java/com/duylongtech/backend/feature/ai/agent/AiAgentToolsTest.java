package com.duylongtech.backend.feature.ai.agent;

import com.duylongtech.backend.feature.ai.agent.tool.AiToolSupport;
import com.duylongtech.backend.feature.ai.agent.tool.PartnerTools;
import com.duylongtech.backend.feature.ai.agent.tool.ProductTools;
import com.duylongtech.backend.feature.ai.agent.tool.StockTools;
import com.duylongtech.backend.feature.ai.service.AiAccessPolicy;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseStockAiRow;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Các công cụ được gọi qua chính cơ chế của Spring AI (ToolCallbacks + JSON), như khi mô hình gọi thật:
 * kiểm tra quyền theo người đăng nhập, phạm vi kho, ẩn giá và các giới hạn.
 */
class AiAgentToolsTest {

    private ProductVariantRepository variantRepository;
    private InventoryBalanceRepository balanceRepository;
    private PartnerRepository partnerRepository;
    private WarehouseRepository warehouseRepository;
    private WarehouseAccessGuard warehouseGuard;
    private AiAgentProperties properties;
    private ToolCallback[] tools;

    @BeforeEach
    void setUp() {
        variantRepository = mock(ProductVariantRepository.class);
        balanceRepository = mock(InventoryBalanceRepository.class);
        partnerRepository = mock(PartnerRepository.class);
        warehouseRepository = mock(WarehouseRepository.class);
        warehouseGuard = mock(WarehouseAccessGuard.class);
        properties = new AiAgentProperties();

        AiToolSupport support = new AiToolSupport(new AiAccessPolicy(warehouseGuard), properties, warehouseRepository);
        tools = ToolCallbacks.from(
                new ProductTools(variantRepository, support),
                new StockTools(balanceRepository, support),
                new PartnerTools(partnerRepository, support));

        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(null); // mặc định không giới hạn kho
        Warehouse hanoi = warehouse(1L, "KA", "Kho Hà Nội");
        Warehouse danang = warehouse(2L, "KB", "Kho Đà Nẵng");
        when(warehouseRepository.findAll()).thenReturn(List.of(hanoi, danang));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        AiAgentRun.end();
    }

    private static void loginAs(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("tester", "x",
                Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }

    private static Warehouse warehouse(long id, String code, String name) {
        Warehouse w = mock(Warehouse.class);
        when(w.getId()).thenReturn(id);
        when(w.getCode()).thenReturn(code);
        when(w.getName()).thenReturn(name);
        return w;
    }

    /** Dòng tồn kho thật (không dùng mock) để có thể dựng ngay trong đối số của when(...). */
    private record StockRow(String warehouseCode, String sku, String productName, String variantName, BigDecimal onHand)
            implements WarehouseStockAiRow {
        @Override public Long getVariantId() { return 1L; }
        @Override public String getWarehouseCode() { return warehouseCode; }
        @Override public String getWarehouseName() { return "Kho " + warehouseCode; }
        @Override public String getProductCode() { return "P-" + sku; }
        @Override public String getProductName() { return productName; }
        @Override public String getSku() { return sku; }
        @Override public String getVariantName() { return variantName; }
        @Override public BigDecimal getQuantityOnHand() { return onHand; }
        @Override public BigDecimal getQuantityReserved() { return BigDecimal.ZERO; }
        @Override public BigDecimal getAvailableQuantity() { return onHand; }
        @Override public BigDecimal getInventoryValue() { return new BigDecimal("1234567"); }
    }

    private static WarehouseStockAiRow stockRow(String warehouseCode, String sku, String product, String variant, String onHand) {
        return new StockRow(warehouseCode, sku, product, variant, new BigDecimal(onHand));
    }

    private String call(String toolName, String json) {
        for (ToolCallback tool : tools) {
            if (tool.getToolDefinition().name().equals(toolName)) {
                return tool.call(json);
            }
        }
        throw new AssertionError("Không có công cụ " + toolName);
    }

    private ProductVariant variant(String sku, String name, String price) {
        ProductVariant v = mock(ProductVariant.class);
        Product p = mock(Product.class);
        when(p.getProductCode()).thenReturn("SP01");
        when(p.getProductName()).thenReturn("RAM Kingston");
        when(v.getProduct()).thenReturn(p);
        when(v.getSku()).thenReturn(sku);
        when(v.getVariantName()).thenReturn(name);
        when(v.getSalePrice()).thenReturn(new BigDecimal(price));
        return v;
    }

    // ---------------- đăng ký công cụ ----------------

    @Test
    void allReadOnlyToolsAreRegisteredWithDescriptions() {
        List<String> names = Arrays.stream(tools).map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.containsAll(List.of("searchProducts", "getStock", "listWarehouses", "listLowStock", "searchPartners")), names.toString());
        for (ToolCallback tool : tools) {
            assertFalse(tool.getToolDefinition().description().isBlank(), tool.getToolDefinition().name());
        }
    }

    // ---------------- sản phẩm ----------------

    @Test
    void productSearchIsDeniedWithoutProductViewAndNeverTouchesTheDatabase() {
        loginAs("customer:view");

        String result = call("searchProducts", "{\"keyword\":\"ram\"}");

        assertTrue(result.contains("\"ok\":false"), result);
        assertTrue(result.contains("không có quyền"), result);
        verify(variantRepository, never()).searchVariants(anyString(), anyBoolean(), any(Pageable.class));
    }

    @Test
    void productSearchHidesPriceFromRolesThatMayNotSeePricing() {
        loginAs("product:view", "ROLE_TECHNICIAN");
        Page<ProductVariant> page = new PageImpl<>(List.of(variant("SKU-1", "16GB DDR4", "950000")));
        when(variantRepository.searchVariants(eq("ram"), eq(false), any(Pageable.class))).thenReturn(page);

        String technician = call("searchProducts", "{\"keyword\":\"ram\"}");
        assertTrue(technician.contains("SKU-1"), technician);
        assertFalse(technician.contains("salePrice"), "kỹ thuật viên không được xem giá");

        loginAs("product:view", "ROLE_ACCOUNTANT");
        String accountant = call("searchProducts", "{\"keyword\":\"ram\"}");
        assertTrue(accountant.contains("salePrice"), "kế toán được xem giá");
    }

    @Test
    void rowLimitIsClampedToTheConfiguredCeiling() {
        loginAs("product:view");
        when(variantRepository.searchVariants(anyString(), anyBoolean(), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        call("searchProducts", "{\"keyword\":\"ram\",\"limit\":500}");

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(variantRepository).searchVariants(eq("ram"), eq(false), pageable.capture());
        assertEquals(properties.getMaxRows(), pageable.getValue().getPageSize());
    }

    @Test
    void blankKeywordIsRefusedSoTheModelAsksTheUser() {
        loginAs("product:view");

        String result = call("searchProducts", "{\"keyword\":\"   \"}");

        assertTrue(result.contains("\"ok\":false"), result);
    }

    // ---------------- tồn kho ----------------

    @Test
    void stockLookupMatchesByKeywordTokensAndHidesValueFromNonPricingRoles() {
        loginAs("report_balance:view", "ROLE_TECHNICIAN");
        when(balanceRepository.findStockRowsForAiByWarehouseId(1L)).thenReturn(List.of(
                stockRow("KA", "SKU-1", "RAM Kingston", "16GB DDR4", "12"),
                stockRow("KA", "SKU-2", "Chuột Logitech", "G102", "40")));
        when(balanceRepository.findStockRowsForAiByWarehouseId(2L)).thenReturn(List.of());

        String result = call("getStock", "{\"query\":\"ram ddr4\"}");

        assertTrue(result.contains("SKU-1"), result);
        assertFalse(result.contains("SKU-2"), result);
        assertFalse(result.contains("inventoryValue"), "giá trị tồn chỉ dành cho vai trò được xem giá");

        loginAs("report_balance:view", "ROLE_MANAGER");
        assertTrue(call("getStock", "{\"query\":\"SKU-1\"}").contains("inventoryValue"));
    }

    @Test
    void keeperOnlySeesAssignedWarehouseAndCannotAskForAnotherOne() {
        loginAs("warehouse_master:view", "ROLE_WAREHOUSE_CONTROLLER");
        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(1L));
        when(balanceRepository.findStockRowsForAiByWarehouseId(1L)).thenReturn(List.of(
                stockRow("KA", "SKU-1", "RAM Kingston", "16GB DDR4", "12")));

        String own = call("getStock", "{\"query\":\"ram\"}");
        assertTrue(own.contains("SKU-1"), own);
        verify(balanceRepository, never()).findStockRowsForAiByWarehouseId(2L);

        String other = call("getStock", "{\"query\":\"ram\",\"warehouse\":\"Kho Đà Nẵng\"}");
        assertTrue(other.contains("\"ok\":false"), other);
        assertTrue(other.contains("không được xem"), other);
        verify(balanceRepository, never()).findStockRowsForAiByWarehouseId(2L);
    }

    @Test
    void unknownWarehouseGetsAHelpfulErrorInsteadOfAGuess() {
        loginAs("warehouse_master:view", "ROLE_MANAGER");

        String result = call("getStock", "{\"query\":\"ram\",\"warehouse\":\"Kho Mặt Trăng\"}");

        assertTrue(result.contains("Không tìm thấy kho"), result);
    }

    @Test
    void stockToolsNeedAtLeastOneStockPermission() {
        loginAs("customer:view");

        assertTrue(call("getStock", "{\"query\":\"ram\"}").contains("không có quyền"));
        assertTrue(call("listWarehouses", "{}").contains("không có quyền"));
        assertTrue(call("listLowStock", "{}").contains("không có quyền"));
        verify(balanceRepository, never()).findStockRowsForAiByWarehouseId(any());
    }

    @Test
    void lowStockForAKeeperIsFilteredByAssignedWarehouses() {
        loginAs("report_balance:view", "ROLE_WAREHOUSE_CONTROLLER");
        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(1L));
        when(balanceRepository.findLowStockRowsForAi(any(Pageable.class))).thenReturn(List.of(
                stockRow("KA", "SKU-1", "RAM Kingston", "16GB", "1"),
                stockRow("KB", "SKU-9", "Bàn phím", "K1", "0")));

        String result = call("listLowStock", "{}");

        assertTrue(result.contains("SKU-1"), result);
        assertFalse(result.contains("SKU-9"), "SKU thuộc kho không được giao không được lộ ra");
    }

    // ---------------- đối tác ----------------

    @Test
    void partnerSearchFollowsTheCustomerAndSupplierPermissionsSeparately() {
        loginAs("supplier:view");
        Partner supplier = mock(Partner.class);
        when(supplier.getCode()).thenReturn("NCC01");
        when(supplier.getName()).thenReturn("Công ty Alpha");
        when(supplier.getPhone()).thenReturn("0900000000");
        when(supplier.getStatus()).thenReturn("APPROVED");
        when(partnerRepository.searchPartnersForAi(anyString(), anyBoolean(), anyBoolean(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(supplier)));

        String customer = call("searchPartners", "{\"keyword\":\"alpha\",\"type\":\"customer\"}");
        assertTrue(customer.contains("không có quyền"), customer);

        String any = call("searchPartners", "{\"keyword\":\"alpha\",\"type\":\"any\"}");
        assertTrue(any.contains("NCC01"), any);
        // chỉ có quyền nhà cung cấp -> tìm trong nhóm nhà cung cấp, không lộ khách hàng
        verify(partnerRepository).searchPartnersForAi(eq("alpha"), eq(false), eq(true), any(Pageable.class));
    }

    // ---------------- ngân sách gọi công cụ ----------------

    @Test
    void toolCallsBeyondTheBudgetAreRefusedSoTheModelCannotLoopForever() {
        loginAs("warehouse_master:view", "ROLE_MANAGER");
        AiAgentRun run = AiAgentRun.start(2);

        assertTrue(call("listWarehouses", "{}").contains("\"ok\":true"));
        assertTrue(call("listWarehouses", "{}").contains("\"ok\":true"));
        String third = call("listWarehouses", "{}");

        assertTrue(third.contains("vượt số lần gọi công cụ"), third);
        assertEquals(2, run.toolCalls().size());
    }
}
