package com.duylongtech.backend.feature.ai.agent;

import com.duylongtech.backend.feature.ai.agent.tool.AiToolSupport;
import com.duylongtech.backend.feature.ai.agent.tool.DocumentTools;
import com.duylongtech.backend.feature.ai.service.AiAccessPolicy;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.warehouse.StockTransfer;
import com.duylongtech.backend.feature.warehouse.StockTransferRepository;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Công cụ chứng từ gọi qua chính cơ chế của Spring AI (ToolCallbacks + JSON), như khi mô hình gọi thật: quyền theo từng
 * module, phạm vi kho của thủ kho, ẩn tiền, lọc trạng thái/ngày và các giới hạn.
 */
class AiAgentDocumentToolsTest {

    private InventoryDocumentRepository documentRepository;
    private StockTransferRepository transferRepository;
    private PurchaseOrderRepository purchaseOrderRepository;
    private RepairRepository repairRepository;
    private ProductVariantRepository variantRepository;
    private PartnerRepository partnerRepository;
    private WarehouseAccessGuard warehouseGuard;
    private ToolCallback[] tools;

    @BeforeEach
    void setUp() {
        documentRepository = mock(InventoryDocumentRepository.class);
        transferRepository = mock(StockTransferRepository.class);
        purchaseOrderRepository = mock(PurchaseOrderRepository.class);
        repairRepository = mock(RepairRepository.class);
        variantRepository = mock(ProductVariantRepository.class);
        partnerRepository = mock(PartnerRepository.class);
        warehouseGuard = mock(WarehouseAccessGuard.class);
        WarehouseRepository warehouseRepository = mock(WarehouseRepository.class);

        AiToolSupport support = new AiToolSupport(new AiAccessPolicy(warehouseGuard), new AiAgentProperties(), warehouseRepository);
        tools = ToolCallbacks.from(new DocumentTools(documentRepository, transferRepository, mock(AssemblyOrderRepository.class),
                purchaseOrderRepository, mock(SalesOrderRepository.class), repairRepository, mock(WarrantyRepository.class),
                variantRepository, partnerRepository, support));

        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(null); // mặc định không giới hạn kho
        Warehouse hanoi = warehouse(1L, "KA", "Kho Hà Nội");
        Warehouse danang = warehouse(2L, "KB", "Kho Đà Nẵng");
        when(warehouseRepository.findAll()).thenReturn(List.of(hanoi, danang));
        when(partnerRepository.findAllById(any())).thenReturn(List.of());
        when(variantRepository.findAllById(any())).thenReturn(List.of());
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

    private String call(String toolName, String json) {
        for (ToolCallback tool : tools) {
            if (tool.getToolDefinition().name().equals(toolName)) {
                return tool.call(json);
            }
        }
        throw new AssertionError("Không có công cụ " + toolName);
    }

    private static Warehouse warehouse(long id, String code, String name) {
        Warehouse w = mock(Warehouse.class);
        when(w.getId()).thenReturn(id);
        when(w.getCode()).thenReturn(code);
        when(w.getName()).thenReturn(name);
        return w;
    }

    private static InventoryDocument doc(String code, String docType, long warehouseId, String status, int lineCount) {
        InventoryDocument doc = mock(InventoryDocument.class);
        when(doc.getDocCode()).thenReturn(code);
        when(doc.getDocType()).thenReturn(docType);
        when(doc.getWarehouseId()).thenReturn(warehouseId);
        when(doc.getStatus()).thenReturn(status);
        when(doc.getDocDate()).thenReturn(LocalDate.of(2026, 9, 15));
        List<InventoryDocumentLine> lines = new ArrayList<>();
        for (int i = 1; i <= lineCount; i++) {
            InventoryDocumentLine line = mock(InventoryDocumentLine.class);
            when(line.getVariantId()).thenReturn((long) i);
            when(line.getQuantityIn()).thenReturn(BigDecimal.valueOf(i));
            when(line.getUnitPrice()).thenReturn(new BigDecimal("100000"));
            lines.add(line);
        }
        when(doc.getLines()).thenReturn(lines);
        return doc;
    }

    private void importsReturn(List<InventoryDocument> docs) {
        when(documentRepository.searchImports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(docs);
    }

    private static StockTransfer transfer(String code, long from, long to) {
        StockTransfer t = mock(StockTransfer.class);
        when(t.getTransferCode()).thenReturn(code);
        when(t.getFromWarehouseId()).thenReturn(from);
        when(t.getToWarehouseId()).thenReturn(to);
        when(t.getStatus()).thenReturn("DRAFT");
        when(t.getLines()).thenReturn(List.of());
        return t;
    }

    // ---------------- đăng ký công cụ ----------------

    @Test
    void documentToolsAreRegisteredWithDescriptions() {
        List<String> names = Arrays.stream(tools).map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.containsAll(List.of("findDocuments", "getDocumentDetail")), names.toString());
        for (ToolCallback tool : tools) {
            assertFalse(tool.getToolDefinition().description().isBlank(), tool.getToolDefinition().name());
        }
    }

    // ---------------- quyền theo module ----------------

    @Test
    void eachDocumentTypeNeedsThePermissionOfItsOwnModule() {
        loginAs("export:view");
        when(documentRepository.searchExports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of());

        String imports = call("findDocuments", "{\"type\":\"import\"}");
        assertTrue(imports.contains("không có quyền"), imports);
        verify(documentRepository, never()).searchImports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());

        assertTrue(call("findDocuments", "{\"type\":\"export\"}").contains("\"ok\":true"));
        assertTrue(call("getDocumentDetail", "{\"type\":\"import\",\"code\":\"NK1\"}").contains("không có quyền"));
        verify(documentRepository, never()).findByDocCode(anyString());
    }

    @Test
    void unknownDocumentTypeIsRefusedWithTheValidTypes() {
        loginAs("ROLE_MANAGER");

        String result = call("findDocuments", "{\"type\":\"hoa don\"}");

        assertTrue(result.contains("\"ok\":false"), result);
        assertTrue(result.contains("purchase_order"), "liệt kê các loại hợp lệ để mô hình chọn lại: " + result);
    }

    // ---------------- phạm vi kho ----------------

    @Test
    void keeperOnlySearchesAssignedWarehousesAndCannotAskForAnotherOne() {
        loginAs("import:view", "ROLE_WAREHOUSE_CONTROLLER");
        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(1L));
        importsReturn(List.of(doc("NK1", "IN_PO", 1L, "DRAFT", 1)));

        String own = call("findDocuments", "{\"type\":\"import\"}");
        assertTrue(own.contains("NK1"), own);
        verify(documentRepository).searchImports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), eq(List.of(1L)));

        String other = call("findDocuments", "{\"type\":\"import\",\"warehouse\":\"Kho Đà Nẵng\"}");
        assertTrue(other.contains("chưa được phân công"), other);
    }

    @Test
    void keeperWithoutAnyAssignedWarehouseSeesNothingAndNoQueryRuns() {
        loginAs("import:view", "ROLE_WAREHOUSE_CONTROLLER");
        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(List.of());

        String result = call("findDocuments", "{\"type\":\"import\"}");

        assertTrue(result.contains("\"totalMatches\":0"), result);
        verify(documentRepository, never()).searchImports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void transfersAreVisibleWhenEitherTheSourceOrTheTargetIsAnAssignedWarehouse() {
        loginAs("transfer:view", "ROLE_WAREHOUSE_CONTROLLER");
        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(1L));
        List<StockTransfer> transfers = List.of(
                transfer("CK-OUT", 1L, 2L), transfer("CK-IN", 2L, 1L), transfer("CK-OTHER", 2L, 3L));
        when(transferRepository.searchTransfers(any(), any(), any(), any())).thenReturn(transfers);

        String result = call("findDocuments", "{\"type\":\"transfer\"}");

        assertTrue(result.contains("CK-OUT") && result.contains("CK-IN"), result);
        assertFalse(result.contains("CK-OTHER"), "phiếu giữa hai kho không được giao không được lộ ra");
    }

    // ---------------- lọc trạng thái, ngày, giới hạn ----------------

    @Test
    void statusFilterWorksAndAWrongStatusGivesBackTheRealOnes() {
        loginAs("ROLE_MANAGER");
        importsReturn(List.of(doc("NK1", "IN_PO", 1L, "DRAFT", 1), doc("NK2", "IN_PO", 1L, "POSTED", 1)));

        String drafts = call("findDocuments", "{\"type\":\"import\",\"status\":\"draft\"}");
        assertTrue(drafts.contains("NK1") && !drafts.contains("NK2"), drafts);
        assertTrue(drafts.contains("\"totalMatches\":1"), drafts);

        String wrong = call("findDocuments", "{\"type\":\"import\",\"status\":\"NHAP\"}");
        assertTrue(wrong.contains("\"ok\":false"), wrong);
        assertTrue(wrong.contains("availableStatuses") && wrong.contains("POSTED"), wrong);
    }

    @Test
    void repairStatusMustBeARealRepairStatus() {
        loginAs("ROLE_MANAGER");

        String result = call("findDocuments", "{\"type\":\"repair\",\"status\":\"POSTED\"}");

        assertTrue(result.contains("UNDER_REPAIR"), result);
        verify(repairRepository, never()).searchRepairs(any(), any(), any(), any(), any(Pageable.class));
    }

    @Test
    void datesAreParsedForTheQueryAndBadDatesAreRejected() {
        loginAs("ROLE_MANAGER");
        importsReturn(List.of());

        call("findDocuments", "{\"type\":\"import\",\"fromDate\":\"2026-09-01\",\"toDate\":\"30/09/2026\"}");
        verify(documentRepository).searchImports(any(), eq(LocalDate.of(2026, 9, 1)), eq(LocalDate.of(2026, 9, 30)),
                any(), any(), any(), any(), any(), any(), any(), any());

        assertTrue(call("findDocuments", "{\"type\":\"import\",\"fromDate\":\"hom qua\"}").contains("Ngày không hợp lệ"));
        assertTrue(call("findDocuments", "{\"type\":\"import\",\"fromDate\":\"2026-10-01\",\"toDate\":\"2026-09-01\"}")
                .contains("fromDate đang sau toDate"));
    }

    @Test
    void rowsAreCappedButTotalMatchesCountsEverything() {
        loginAs("ROLE_MANAGER");
        List<InventoryDocument> many = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            many.add(doc("NK" + i, "IN_PO", 1L, "POSTED", 1));
        }
        importsReturn(many);

        String result = call("findDocuments", "{\"type\":\"import\",\"limit\":50}");

        assertTrue(result.contains("\"count\":10"), result);
        assertTrue(result.contains("\"totalMatches\":15"), result);
        assertTrue(result.contains("\"truncated\":true"), result);
    }

    // ---------------- ẩn tiền ----------------

    @Test
    void purchaseOrderMoneyIsOnlyShownToPricingRoles() {
        PurchaseOrder po = mock(PurchaseOrder.class);
        Partner supplier = mock(Partner.class);
        when(supplier.getName()).thenReturn("Công ty Alpha");
        when(po.getPoCode()).thenReturn("PO01");
        when(po.getStatus()).thenReturn("APPROVED");
        when(po.getPartner()).thenReturn(supplier);
        when(po.getTotalAmount()).thenReturn(new BigDecimal("5000000"));
        when(purchaseOrderRepository.findAllWithFilters(any(), any(), any(), any(), any())).thenReturn(List.of(po));

        loginAs("purchase_order:view", "ROLE_WAREHOUSE_CONTROLLER");
        String keeper = call("findDocuments", "{\"type\":\"purchase_order\"}");
        assertTrue(keeper.contains("PO01"), keeper);
        assertFalse(keeper.contains("totalAmount"), "không được xem giá thì bỏ hẳn trường tiền: " + keeper);

        loginAs("purchase_order:view", "ROLE_ACCOUNTANT");
        assertTrue(call("findDocuments", "{\"type\":\"purchase_order\"}").contains("totalAmount"));
    }

    // ---------------- chi tiết chứng từ ----------------

    @Test
    void documentDetailTellsMissingFromOutOfScopeAndCapsTheLines() {
        loginAs("import:view", "ROLE_WAREHOUSE_CONTROLLER");
        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(1L));
        InventoryDocument danangImport = doc("NK9", "IN_PO", 2L, "POSTED", 12);
        when(documentRepository.findByDocCode("NK9")).thenReturn(Optional.of(danangImport));
        when(documentRepository.findByDocCode("NK404")).thenReturn(Optional.empty());

        String outOfScope = call("getDocumentDetail", "{\"type\":\"import\",\"code\":\"NK9\"}");
        assertTrue(outOfScope.contains("không được phân công"), outOfScope);
        assertFalse(outOfScope.contains("lines"), "không lộ dòng hàng của kho không được giao");

        assertTrue(call("getDocumentDetail", "{\"type\":\"import\",\"code\":\"NK404\"}").contains("Không tìm thấy"));
        // Mã có thật nhưng là phiếu xuất: hỏi như phiếu nhập thì coi như không có.
        InventoryDocument export = doc("XK1", "EX_SO", 1L, "POSTED", 1);
        when(documentRepository.findByDocCode("XK1")).thenReturn(Optional.of(export));
        assertTrue(call("getDocumentDetail", "{\"type\":\"import\",\"code\":\"XK1\"}").contains("Không tìm thấy"));

        when(warehouseGuard.resolveAllowedWarehouseIds()).thenReturn(null);
        ProductVariant ram = mock(ProductVariant.class);
        Product product = mock(Product.class);
        when(product.getProductName()).thenReturn("RAM Kingston");
        when(ram.getId()).thenReturn(1L);
        when(ram.getSku()).thenReturn("SKU-1");
        when(ram.getVariantName()).thenReturn("16GB");
        when(ram.getProduct()).thenReturn(product);
        when(variantRepository.findAllById(any())).thenReturn(List.of(ram));

        String detail = call("getDocumentDetail", "{\"type\":\"import\",\"code\":\"NK9\"}");
        assertTrue(detail.contains("\"ok\":true"), detail);
        assertTrue(detail.contains("RAM Kingston - 16GB"), detail);
        assertTrue(detail.contains("\"totalLines\":12") && detail.contains("\"truncated\":true"), detail);
        assertFalse(detail.contains("unitPrice"), "thủ kho không được xem giá");
    }

    // ---------------- hạn thời gian ----------------

    @Test
    void documentToolsRefuseToRunOnceTheQuestionIsOutOfTime() {
        loginAs("ROLE_MANAGER");
        AiAgentRun run = AiAgentRun.start(6, Duration.ZERO);

        String result = call("findDocuments", "{\"type\":\"import\"}");

        assertTrue(result.contains("hết thời gian"), result);
        assertEquals(0, run.toolCalls().size(), "lần gọi bị từ chối vì hết giờ không tính vào ngân sách");
        verify(documentRepository, never()).searchImports(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
