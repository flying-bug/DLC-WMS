package com.duylongtech.backend.feature.purchase_order;

import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderResponse;

import com.duylongtech.backend.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRequest;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderResponse;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderService;

public interface PurchaseOrderService {
    List<PurchaseOrderResponse> getPurchaseOrders(String keyword, String status, Long partnerId,
            LocalDate fromDate, LocalDate toDate);
    PurchaseOrderResponse getPurchaseOrderById(Long id);
    String generateNextPoCode();
    PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request, String actor);
    PurchaseOrderResponse updatePurchaseOrder(Long id, PurchaseOrderRequest request, String actor);
    PurchaseOrderResponse approvePurchaseOrder(Long id, String actor);
    PurchaseOrderResponse cancelPurchaseOrder(Long id, String actor);
}
