package com.duylongtech.backend.feature.ai.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiChatServiceKeywordTest {

    @InjectMocks
    private AiChatService service;

    @Test
    void extractsDocumentCode() {
        assertEquals("SO0070", service.extractSearchKeyword("cho tôi xem đơn bán SO0070 nhé"));
        assertEquals("NK00079", service.extractSearchKeyword("phiếu nhập kho NK00079 ai duyệt?"));
        assertEquals("PO123", service.extractSearchKeyword("PO123"));
    }

    @Test
    void extractsQuotedString() {
        assertEquals("Khách vãng lai", service.extractSearchKeyword("tìm đơn của khách \"Khách vãng lai\""));
        assertEquals("Dell XPS 15", service.extractSearchKeyword("tồn kho 'Dell XPS 15' còn bao nhiêu"));
    }

    @Test
    void extractsAfterSpecificWords() {
        assertEquals("Nguyễn Văn A", service.extractSearchKeyword("đơn của khách Nguyễn Văn A"));
        assertEquals("Thành Phát", service.extractSearchKeyword("PO của ncc Thành Phát"));
        assertEquals("Công ty TNHH", service.extractSearchKeyword("khách hàng Công ty TNHH có đơn nào"));
        assertEquals("Lê B", service.extractSearchKeyword("đơn mua của Lê B"));
        assertEquals("Anh Tuấn", service.extractSearchKeyword("khách hàng tên là Anh Tuấn"));
    }

    @Test
    void returnsEmptyWhenNoClearSign() {
        assertEquals("", service.extractSearchKeyword("5 đơn bán hàng mới nhất là?"));
        assertEquals("", service.extractSearchKeyword("đơn bán hàng mới nhất"));
        assertEquals("", service.extractSearchKeyword("các phiếu xuất kho hôm nay"));
        assertEquals("", service.extractSearchKeyword("phiếu nhập kho chờ duyệt"));
    }
}
