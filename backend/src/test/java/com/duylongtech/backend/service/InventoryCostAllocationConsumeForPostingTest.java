package com.duylongtech.backend.service;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostAllocation;
import com.duylongtech.backend.feature.inventory.InventoryCostAllocationRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostAllocationService;
import com.duylongtech.backend.feature.inventory.InventoryCostLayer;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit test report: InventoryCostAllocationService.consumeForPosting
 * (InventoryDocument document, InventoryDocumentLine line, BigDecimal quantity, boolean reservationRequired),
 * trả về BigDecimal (tổng giá vốn FIFO). Kỹ thuật Branch Coverage.
 * <p>
 * Precondition chung: kho 1, sản phẩm 10 có 2 lớp giá FIFO 10@100000 và 10@200000, dòng 100 chưa giữ chỗ;
 * kho 2 không có lớp giá. Testcase đổi tham số; chỉ UTCID09/10 cần dòng 100 đã giữ chỗ sẵn.
 * Mỗi test tương ứng 1 testcase UTCIDxx trong utool/testcases/primitive-return-methods-testcases.json.
 */
@UnitTestMethod(module = "InventoryCostAllocationService",
        signature = "consumeForPosting(InventoryDocument document, InventoryDocumentLine line, BigDecimal quantity, boolean reservationRequired)",
        technique = Technique.BRANCH,
        precondition = {"Warehouse 1, variant 10 has FIFO layers 10@100000 and 10@200000; warehouse 2 has no layer; line 100 has no reservation"})
@DisplayName("consumeForPosting(InventoryDocument document, InventoryDocumentLine line, BigDecimal quantity, boolean reservationRequired)")
class InventoryCostAllocationConsumeForPostingTest {

    private final InventoryCostLayerRepository layerRepository = mock(InventoryCostLayerRepository.class);
    private final InventoryCostAllocationRepository allocationRepository = mock(InventoryCostAllocationRepository.class);
    private final InventoryBalanceRepository balanceRepository = mock(InventoryBalanceRepository.class);
    private final InventoryCostAllocationService service = new InventoryCostAllocationService(
            layerRepository, allocationRepository, balanceRepository, mock(InventoryDocumentLineRepository.class));

    private InventoryCostLayer first;
    private InventoryCostLayer second;

    @BeforeEach
    void setUp() {
        first = layer(1L, "10", "100000");
        second = layer(2L, "10", "200000");
        when(layerRepository.findAvailableLayersForUpdate(1L, 10L)).thenReturn(List.of(first, second));
    }

    private BigDecimal consume(Long documentWarehouseId, Long lineWarehouseId, String quantity, boolean reservationRequired) {
        InventoryDocument document = documentWithLine(documentWarehouseId, lineWarehouseId);
        return service.consumeForPosting(document, document.getLines().get(0), qty(quantity), reservationRequired);
    }

    private BusinessException consumeFails(Long documentWarehouseId, Long lineWarehouseId, String quantity,
                                           boolean reservationRequired) {
        return assertThrows(BusinessException.class,
                () -> consume(documentWarehouseId, lineWarehouseId, quantity, reservationRequired));
    }

    @Test
    @UnitTestCase(id = "UTCID01", type = "N",
            purpose = "Verify a small ordinary export is costed entirely from the oldest FIFO layer.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=3",
                    "reservationRequired=false"
            },
            returns = "300000 (3x100000) - layer 1 left 7, layer 2 left 10")
    @DisplayName("UTCID01 - quantity=3, reservationRequired=false -> 300000 (3 x 100000)")
    void utcid01SmallQuantityUsesFirstLayer() {
        assertEquals(new BigDecimal("300000"), consume(1L, null, "3", false));
        assertEquals(qty("7"), first.getQuantityLayered());
        assertEquals(qty("10"), second.getQuantityLayered());
    }

    @Test
    @UnitTestCase(id = "UTCID02", type = "B",
            purpose = "Verify an export exactly equal to the first layer consumes that layer completely.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=10",
                    "reservationRequired=false"
            },
            returns = "1000000 (10x100000) - layer 1 left 0, layer 2 left 10")
    @DisplayName("UTCID02 - quantity=10 (đúng bằng lớp đầu) -> 1000000")
    void utcid02QuantityEqualsFirstLayer() {
        assertEquals(new BigDecimal("1000000"), consume(1L, null, "10", false));
        assertEquals(BigDecimal.ZERO, first.getQuantityLayered());
        assertEquals(qty("10"), second.getQuantityLayered());
    }

    @Test
    @UnitTestCase(id = "UTCID03", type = "N",
            purpose = "Verify an export spanning two layers is costed FIFO across both.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=15",
                    "reservationRequired=false"
            },
            returns = "2000000 (10x100000 + 5x200000) - layer 1 left 0, layer 2 left 5")
    @DisplayName("UTCID03 - quantity=15 (qua 2 lớp) -> 2000000")
    void utcid03QuantitySpansTwoLayers() {
        assertEquals(new BigDecimal("2000000"), consume(1L, null, "15", false));
        assertEquals(BigDecimal.ZERO, first.getQuantityLayered());
        assertEquals(qty("5"), second.getQuantityLayered());
    }

    @Test
    @UnitTestCase(id = "UTCID04", type = "B",
            purpose = "Verify an export equal to the whole stock (20) consumes both layers.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=20",
                    "reservationRequired=false"
            },
            returns = "3000000 (10x100000 + 10x200000) - both layers left 0")
    @DisplayName("UTCID04 - quantity=20 (toàn bộ tồn) -> 3000000")
    void utcid04QuantityEqualsAllLayers() {
        assertEquals(new BigDecimal("3000000"), consume(1L, null, "20", false));
        assertEquals(BigDecimal.ZERO, first.getQuantityLayered());
        assertEquals(BigDecimal.ZERO, second.getQuantityLayered());
    }

    @Test
    @UnitTestCase(id = "UTCID05", type = "B",
            purpose = "Verify an export one unit above the stock (21) is rejected.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=21",
                    "reservationRequired=false"
            },
            exception = "BusinessException: Không đủ tồn khả dụng hoặc lớp giá FIFO cho sản phẩm 10")
    @DisplayName("UTCID05 - quantity=21 (vượt tồn 1) -> BusinessException thiếu tồn")
    void utcid05QuantityAboveStockThrows() {
        assertEquals("Không đủ tồn khả dụng hoặc lớp giá FIFO cho sản phẩm 10",
                consumeFails(1L, null, "21", false).getMessage());
    }

    @Test
    @UnitTestCase(id = "UTCID06", type = "A",
            purpose = "Verify an export that requires a reservation fails when the line has none.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=15",
                    "reservationRequired=true"
            },
            exception = "BusinessException: Phiếu xuất của lệnh chưa có lớp giá FIFO được giữ chỗ")
    @DisplayName("UTCID06 - reservationRequired=true nhưng dòng chưa giữ chỗ -> BusinessException")
    void utcid06ReservationRequiredWithoutHoldThrows() {
        assertEquals("Phiếu xuất của lệnh chưa có lớp giá FIFO được giữ chỗ",
                consumeFails(1L, null, "15", true).getMessage());
    }

    @Test
    @UnitTestCase(id = "UTCID07", type = "A",
            purpose = "Verify an export fails when neither the document nor the line has a warehouse.",
            inputs = {
                    "document=id=50, warehouseId=null",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=3",
                    "reservationRequired=false"
            },
            exception = "BusinessException: Dòng sản phẩm chưa có kho xuất")
    @DisplayName("UTCID07 - document.warehouseId=null và line.warehouseId=null -> BusinessException chưa có kho xuất")
    void utcid07MissingWarehouseThrows() {
        assertEquals("Dòng sản phẩm chưa có kho xuất", consumeFails(null, null, "3", false).getMessage());
    }

    @Test
    @UnitTestCase(id = "UTCID08", type = "A",
            purpose = "Verify the line warehouse (2) overrides the document warehouse (1), and warehouse 2 has no stock.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=2",
                    "quantity=3",
                    "reservationRequired=false"
            },
            exception = "BusinessException: Không đủ tồn khả dụng hoặc lớp giá FIFO cho sản phẩm 10")
    @DisplayName("UTCID08 - line.warehouseId=2 ghi đè kho phiếu, kho 2 không có lớp giá -> BusinessException thiếu tồn")
    void utcid08LineWarehouseOverridesDocumentWarehouse() {
        assertEquals("Không đủ tồn khả dụng hoặc lớp giá FIFO cho sản phẩm 10",
                consumeFails(1L, 2L, "3", false).getMessage());
        assertEquals(qty("10"), first.getQuantityLayered());
    }

    @Test
    @UnitTestCase(id = "UTCID09", type = "N",
            purpose = "Verify held FIFO allocations are consumed, the reservation is released and the held cost is returned.",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=15",
                    "reservationRequired=true"
            },
            precondition = {"Warehouse 1, variant 10 has FIFO layers 10@100000 and 10@200000; line 100 already holds 10 on layer 1 and 5 on layer 2; balance onHand=20, reserved=15"},
            returns = "2000000 (10x100000 + 5x200000) - balance reserved=0, both allocations CONSUMED")
    @DisplayName("UTCID09 - dòng đã giữ chỗ 10@100000 + 5@200000, quantity=15, reservationRequired=true -> 2000000")
    void utcid09HeldLayersAreConsumed() {
        HeldReservation held = holdFifteen();

        assertEquals(new BigDecimal("2000000"), consume(1L, null, "15", true));
        assertEquals(BigDecimal.ZERO, held.balance.getQuantityReserved());
        assertEquals("CONSUMED", held.a1.getStatus());
        assertEquals("CONSUMED", held.a2.getStatus());
    }

    @Test
    @UnitTestCase(id = "UTCID10", type = "A",
            purpose = "Verify posting fails when the export quantity (10) differs from the held quantity (15).",
            inputs = {
                    "document=id=50, warehouseId=1",
                    "line=id=100, variantId=10, warehouseId=null",
                    "quantity=10",
                    "reservationRequired=true"
            },
            precondition = {"Warehouse 1, variant 10 has FIFO layers 10@100000 and 10@200000; line 100 already holds 10 on layer 1 and 5 on layer 2; balance onHand=20, reserved=15"},
            exception = "BusinessException: Số lượng lớp giá FIFO giữ chỗ không khớp với phiếu xuất")
    @DisplayName("UTCID10 - dòng đã giữ chỗ 15 nhưng quantity=10 -> BusinessException không khớp")
    void utcid10HeldQuantityMismatchThrows() {
        holdFifteen();

        assertEquals("Số lượng lớp giá FIFO giữ chỗ không khớp với phiếu xuất",
                consumeFails(1L, null, "10", true).getMessage());
    }

    private record HeldReservation(InventoryBalance balance, InventoryCostAllocation a1, InventoryCostAllocation a2) {
    }

    /** Dữ liệu có sẵn: dòng 100 đã giữ 10 trên lớp 1 và 5 trên lớp 2; tồn kho onHand=20, reserved=15. */
    private HeldReservation holdFifteen() {
        first.setQuantityReserved(qty("10"));
        second.setQuantityReserved(qty("5"));
        InventoryCostAllocation a1 = allocation(first, "10");
        InventoryCostAllocation a2 = allocation(second, "5");
        InventoryBalance balance = new InventoryBalance();
        balance.initBalance(1L, 10L, null, "GOOD", qty("20"), qty("15"), BigDecimal.ZERO);
        when(allocationRepository.findByLineAndStatusForUpdate(100L, "HOLDING")).thenReturn(List.of(a1, a2));
        when(layerRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(first));
        when(layerRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(second));
        when(balanceRepository.findByWarehouseAndVariantForUpdate(1L, 10L, "GOOD")).thenReturn(Optional.of(balance));
        return new HeldReservation(balance, a1, a2);
    }

    private static BigDecimal qty(String value) {
        return new BigDecimal(value);
    }

    private static InventoryDocument documentWithLine(Long documentWarehouseId, Long lineWarehouseId) {
        InventoryDocument document = new InventoryDocument();
        document.setId(50L);
        document.setWarehouseId(documentWarehouseId);
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setId(100L);
        line.setVariantId(10L);
        line.setWarehouseId(lineWarehouseId);
        line.setInventoryDocument(document);
        document.getLines().add(line);
        return document;
    }

    private static InventoryCostLayer layer(Long id, String quantity, String cost) {
        InventoryCostLayer layer = new InventoryCostLayer();
        layer.setId(id);
        layer.initCostLayer(1L, 10L, 999L, qty(quantity), qty(quantity), qty(cost));
        layer.setCreatedAt(LocalDateTime.now());
        return layer;
    }

    private static InventoryCostAllocation allocation(InventoryCostLayer layer, String quantity) {
        InventoryCostAllocation allocation = new InventoryCostAllocation();
        allocation.init(100L, layer, qty(quantity), "HOLDING");
        return allocation;
    }
}
