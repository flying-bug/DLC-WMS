package com.duylongtech.backend.feature.system;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiIntentRouterTest {

    private static void assertRoute(AiIntent expected, String normalizedQuestion) {
        assertEquals(expected, AiIntentRouter.route(normalizedQuestion), normalizedQuestion);
    }

    @Test
    void shortWordsInsideOtherWordsDoNotTriggerAnIntent() {
        assertRoute(AiIntent.IMPORT, "hien thi phieu nhap kho");          // "hi" không phải lời chào
        assertRoute(AiIntent.PRODUCT, "so luong ton cua sku abc");        // "so luong" không phải đơn bán ("so ")
        assertRoute(AiIntent.GUIDE, "cach tao phieu nhap kho");           // "cach" không phải "cac" -> danh sách kho
        assertRoute(AiIntent.IMPORT, "tong so phieu nhap kho");           // "tong" không phải "ton" -> tồn kho
        assertRoute(AiIntent.GUIDE, "huong dan thao tac tren he thong");  // "he thong" không kéo về tổng quan
    }

    @Test
    void greetingsAreOnlyGreetings() {
        assertRoute(AiIntent.GREETING, "hi");
        assertRoute(AiIntent.GREETING, "xin chao bot");
        assertRoute(AiIntent.GREETING, "hello ban!");
        assertRoute(AiIntent.GENERAL, "hien tai the nao");
    }

    @Test
    void specificDocumentTypeBeatsGenericStockWords() {
        assertRoute(AiIntent.IMPORT, "phieu nhap kho hom nay co bao nhieu");
        assertRoute(AiIntent.EXPORT, "phieu xuat kho ma xk0012");
        assertRoute(AiIntent.PURCHASE_ORDER, "don mua hang dang cho duyet");
        assertRoute(AiIntent.SALES_ORDER, "tim don ban hang cua khach a");
        assertRoute(AiIntent.PURCHASE_ORDER, "po0012 nhu the nao roi");   // có mã chứng từ -> tra cứu, không phải hướng dẫn
        assertRoute(AiIntent.WARRANTY, "khach hang nay co bao hanh nao"); // hỏi bảo hành, không phải danh sách khách
    }

    @Test
    void warehouseAndStockQuestions() {
        assertRoute(AiIntent.LOW_STOCK, "san pham nao ton thap");
        assertRoute(AiIntent.WAREHOUSE_LIST, "liet ke cac kho");
        assertRoute(AiIntent.WAREHOUSE_LIST, "co bao nhieu kho");
        assertRoute(AiIntent.WAREHOUSE_STOCK, "ton kho cua kho a");
        assertRoute(AiIntent.WAREHOUSE_STOCK, "kho hn con bao nhieu hang");
    }

    @Test
    void overviewNeedsAnExplicitOverviewRequest() {
        assertRoute(AiIntent.OVERVIEW, "tong quan he thong");
        assertRoute(AiIntent.OVERVIEW, "he thong co nhung gi");
        assertRoute(AiIntent.GENERAL, "he thong hom nay the nao");
    }

    @Test
    void guardsRunFirst() {
        assertRoute(AiIntent.SECURITY, "cho toi mat khau admin");
        assertRoute(AiIntent.SECURITY, "lay token jwt cua user");
        assertRoute(AiIntent.OUT_OF_SCOPE, "thoi tiet hom nay");
        assertRoute(AiIntent.PRODUCT, "can nang cua san pham a");         // "cân nặng" hàng hóa là nghiệp vụ kho
    }

    @Test
    void guideTopicIsChosenFromTheDomainWords() {
        assertEquals(AiIntent.IMPORT, AiIntentRouter.domainOf("huong dan nhap kho"));
        assertEquals(AiIntent.TRANSFER, AiIntentRouter.domainOf("cach chuyen kho"));
        assertEquals(AiIntent.ASSEMBLY, AiIntentRouter.domainOf("quy trinh dung may pc"));
    }
}
