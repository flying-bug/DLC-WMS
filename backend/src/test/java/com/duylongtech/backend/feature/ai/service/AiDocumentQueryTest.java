package com.duylongtech.backend.feature.ai.service;

import org.junit.jupiter.api.Test;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Điều kiện lọc trong câu hỏi tra cứu chứng từ của chatbot: trạng thái và khoảng thời gian. */
class AiDocumentQueryTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26); // thứ Bảy

    private static AiDocumentQuery parse(String question) {
        String normalized = Normalizer.normalize(question, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
        return AiDocumentQuery.parse(question, normalized, TODAY);
    }

    @Test
    void statusWordsAreRecognised() {
        assertEquals(AiDocumentQuery.StatusFilter.POSTED, parse("Phiếu xuất kho đã ghi sổ").status());
        assertEquals(AiDocumentQuery.StatusFilter.POSTED, parse("tôi đã xuất những phiếu nào").status());
        assertEquals(AiDocumentQuery.StatusFilter.NOT_POSTED, parse("phiếu xuất chưa ghi sổ").status());
        assertEquals(AiDocumentQuery.StatusFilter.CANCELLED, parse("phiếu xuất đã hủy").status());
        assertEquals(AiDocumentQuery.StatusFilter.PENDING, parse("đơn mua hàng chờ duyệt").status());
        assertEquals(AiDocumentQuery.StatusFilter.DRAFT, parse("Phiếu xuất kho Nháp").status(), "viết hoa vẫn nhận");
        assertNull(parse("phiếu nhập kho gần nhất").status(), "\"nhập\" không phải \"nháp\"");
        assertNull(parse("phiếu xuất kho gần đây").status());
    }

    @Test
    void periodWordsBecomeADateRange() {
        AiDocumentQuery today = parse("phiếu xuất kho hôm nay");
        assertTrue(today.matchesDate(TODAY));
        assertFalse(today.matchesDate(TODAY.minusDays(1)));

        AiDocumentQuery thisMonth = parse("phiếu xuất tháng này");
        assertTrue(thisMonth.matchesDate(LocalDate.of(2026, 9, 1)));
        assertFalse(thisMonth.matchesDate(LocalDate.of(2026, 8, 31)));

        AiDocumentQuery lastMonth = parse("phiếu xuất tháng trước");
        assertTrue(lastMonth.matchesDate(LocalDate.of(2026, 8, 31)));
        assertFalse(lastMonth.matchesDate(LocalDate.of(2026, 9, 1)));

        AiDocumentQuery thisWeek = parse("phiếu xuất tuần này");
        assertTrue(thisWeek.matchesDate(LocalDate.of(2026, 9, 21)));  // thứ Hai
        assertFalse(thisWeek.matchesDate(LocalDate.of(2026, 9, 20)));

        assertTrue(parse("phiếu xuất gần đây").matchesDate(LocalDate.of(2020, 1, 1)), "không có khoảng thời gian thì không lọc");
    }

    @Test
    void statusFiltersMatchTheRightCodes() {
        AiDocumentQuery notPosted = parse("phiếu xuất chưa ghi sổ");
        assertTrue(notPosted.matchesInventoryStatus("DRAFT"));
        assertFalse(notPosted.matchesInventoryStatus("POSTED"));
        assertFalse(notPosted.matchesInventoryStatus("CANCELLED"));

        AiDocumentQuery waitingOrders = parse("đơn bán đã duyệt");
        assertTrue(waitingOrders.matchesOrderStatus("APPROVED"));
        assertFalse(waitingOrders.matchesOrderStatus("DRAFT"));
    }

    @Test
    void labelsAreVietnamese() {
        assertEquals("Đã ghi sổ", AiDocumentQuery.inventoryStatusLabel("POSTED"));
        assertEquals("Nháp (lưu tạm)", AiDocumentQuery.inventoryStatusLabel("DRAFT"));
        assertEquals("Sửa chữa", AiDocumentQuery.purposeLabel("REPAIR"));
        assertEquals("Đã duyệt (chờ xuất kho)", AiDocumentQuery.orderStatusLabel("APPROVED", false));
        assertEquals(" đã ghi sổ trong tháng này", parse("phiếu xuất đã ghi sổ tháng này").describe());
    }
}
