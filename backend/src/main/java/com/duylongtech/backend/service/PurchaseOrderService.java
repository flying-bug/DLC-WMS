package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.PurchaseOrderRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.PurchaseOrderResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
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
