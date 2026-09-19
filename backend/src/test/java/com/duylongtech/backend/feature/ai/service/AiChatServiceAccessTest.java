package com.duylongtech.backend.feature.ai.service;

import com.duylongtech.backend.feature.ai.client.AiModelClient;
import com.duylongtech.backend.feature.ai.dto.AiChatMessageDto;
import com.duylongtech.backend.feature.ai.dto.AiChatResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.warehouse.StockTransferRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Chatbot không được trả dữ liệu vượt quá quyền của người hỏi (vd Thủ quỹ hỏi về đơn bán/đơn mua). */
class AiChatServiceAccessTest {

    private InventoryBalanceRepository inventoryBalanceRepository;
    private ProductRepository productRepository;
    private ProductVariantRepository productVariantRepository;
    private PartnerRepository partnerRepository;
    private PurchaseOrderRepository purchaseOrderRepository;
    private SalesOrderRepository salesOrderRepository;
    private InventoryDocumentRepository inventoryDocumentRepository;
    private AiModelClient aiModelClient;
    private WarehouseAccessGuard warehouseAccessGuard;
    private AiChatService service;

    @BeforeEach
    void setUp() {
        inventoryBalanceRepository = mock(InventoryBalanceRepository.class);
        productRepository = mock(ProductRepository.class);
        productVariantRepository = mock(ProductVariantRepository.class);
        partnerRepository = mock(PartnerRepository.class);
        purchaseOrderRepository = mock(PurchaseOrderRepository.class);
        salesOrderRepository = mock(SalesOrderRepository.class);
        inventoryDocumentRepository = mock(InventoryDocumentRepository.class);
        aiModelClient = mock(AiModelClient.class);
        warehouseAccessGuard = mock(WarehouseAccessGuard.class);
        when(aiModelClient.enhanceAnswer(any(), any(), any())).thenAnswer(invocation -> invocation.getArgument(2));

        service = new AiChatService(mock(WarehouseRepository.class), inventoryBalanceRepository, productRepository,
                productVariantRepository, partnerRepository, mock(WarrantyRepository.class),
                mock(RepairRepository.class), mock(StockTransferRepository.class), mock(AssemblyOrderRepository.class),
                purchaseOrderRepository, salesOrderRepository, inventoryDocumentRepository, aiModelClient,
                new AiAccessPolicy(warehouseAccessGuard));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static void loginWith(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "tester", null, Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }

    private static void loginAsCashier() {
        loginWith("ROLE_CASHIER_CONTROLLER", "ai_chat:view", "payment:view", "customer:view", "report_debt:view");
    }

    @Test
    void cashierCannotReadSalesOrPurchaseOrders() {
        loginAsCashier();

        assertEquals("ACCESS_DENIED", service.chat("Đơn bán hàng gần đây", List.of()).getIntent());
        assertEquals("ACCESS_DENIED", service.chat("Số lượng đơn mua hàng", List.of()).getIntent());

        verifyNoInteractions(salesOrderRepository, purchaseOrderRepository);
        verify(aiModelClient, never()).enhanceAnswer(any(), any(), any());
    }

    @Test
    void cashierCannotReadSuppliersButCanReadCustomers() {
        loginAsCashier();
        when(partnerRepository.countCustomersForAi()).thenReturn(5L);

        assertEquals("ACCESS_DENIED", service.chat("Có bao nhiêu nhà cung cấp?", List.of()).getIntent());

        AiChatResponse customers = service.chat("Có bao nhiêu khách hàng?", List.of());
        assertEquals("CUSTOMER_COUNT", customers.getIntent());
        assertTrue(customers.getAnswer().contains("5"));
        verify(partnerRepository, never()).countSuppliersForAi();
    }

    @Test
    void cashierCannotReadStockOrDocuments() {
        loginAsCashier();

        assertEquals("ACCESS_DENIED", service.chat("Tồn kho của kho A", List.of()).getIntent());
        assertEquals("ACCESS_DENIED", service.chat("Phiếu nhập kho gần nhất", List.of()).getIntent());
        verifyNoInteractions(inventoryBalanceRepository, inventoryDocumentRepository);
    }

    @Test
    void overviewOnlyCountsWhatTheUserMayView() {
        loginAsCashier();
        when(partnerRepository.countCustomersForAi()).thenReturn(7L);

        AiChatResponse overview = service.chat("Tổng quan hệ thống", List.of());

        assertTrue(overview.getAnswer().contains("Khách hàng: 7"));
        assertFalse(overview.getAnswer().contains("Đơn bán"));
        assertFalse(overview.getAnswer().contains("Đơn mua"));
        verifyNoInteractions(salesOrderRepository, purchaseOrderRepository);
    }

    @Test
    void guidesStayAvailableToEveryone() {
        loginAsCashier();

        AiChatResponse guide = service.chat("Hướng dẫn tạo phiếu nhập kho", List.of());

        assertEquals("IMPORT_GUIDE", guide.getIntent());
    }

    @Test
    void warehouseKeeperOnlySeesDocumentsOfAssignedWarehouses() {
        loginWith("ROLE_WAREHOUSE_CONTROLLER", "ai_chat:view", "import:view");
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(1L));
        when(inventoryDocumentRepository.searchImports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());

        AiChatResponse response = service.chat("Phiếu nhập kho gần nhất", List.of());

        assertEquals("IMPORT_SEARCH", response.getIntent());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> allowed = ArgumentCaptor.forClass(List.class);
        verify(inventoryDocumentRepository).searchImports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), allowed.capture());
        assertEquals(List.of(1L), allowed.getValue());
    }

    @Test
    void keeperWithNoAssignedWarehouseSeesNoDocuments() {
        loginWith("ROLE_WAREHOUSE_CONTROLLER", "ai_chat:view", "import:view");
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of());

        AiChatResponse response = service.chat("Phiếu nhập kho gần nhất", List.of());

        assertTrue(response.getAnswer().contains("Tìm thấy 0 phiếu"));
        verifyNoInteractions(inventoryDocumentRepository);
    }

    @Test
    void followUpUsesThePreviousUserQuestionNotTheAssistantAnswer() {
        loginWith("ROLE_ACCOUNTANT", "ai_chat:view", "product:view");
        when(productRepository.searchProducts(any(), any(), any(), any(), any(), any())).thenReturn(Page.empty());
        when(productVariantRepository.searchVariants(any(), any(Boolean.class), any())).thenReturn(Page.empty());
        AiChatMessageDto question = new AiChatMessageDto();
        question.setRole("user");
        question.setContent("Tìm sản phẩm Dell");
        AiChatMessageDto answer = new AiChatMessageDto();
        answer.setRole("assistant");
        answer.setContent("Hệ thống hiện có nhiều kho, đơn mua hàng, đơn bán hàng, tồn kho, phiếu nhập kho...");

        AiChatResponse response = service.chat("cái này giá bao nhiêu", List.of(question, answer));

        assertEquals("PRODUCT_SEARCH", response.getIntent());
    }
}
