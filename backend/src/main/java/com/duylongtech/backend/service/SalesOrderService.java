package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.SalesOrderRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public interface SalesOrderService {
    List<SalesOrderResponse> getSalesOrders(String keyword, String status, String reservationStatus, String exportDocumentStatus, Long partnerId,
            Long warehouseId, LocalDate fromDate, LocalDate toDate);
    SalesOrderResponse getSalesOrderById(Long id);
    String generateNextSoCode();
    SalesOrderResponse createSalesOrder(SalesOrderRequest request, String actor);
    SalesOrderResponse updateSalesOrder(Long id, SalesOrderRequest request, String actor);
    SalesOrderResponse approveSalesOrder(Long id, String actor);
    SalesOrderResponse cancelSalesOrder(Long id, String actor);
    void releaseReservations(Long salesOrderId, Long warehouseId);
    void fulfillReservation(Long salesOrderId, Long variantId, Long warehouseId, BigDecimal quantityFulfilled, BigDecimal costAmountFulfilled);
    void reEvaluateBackorders(Long warehouseId, Long variantId);
    SalesOrderResponse recordPayment(Long id, BigDecimal amount, String actor);
    void sendQuoteEmail(Long id, com.duylongtech.backend.dto.request.EmailQuoteRequest req);
}
