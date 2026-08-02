package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.service.SalesOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/sales-orders")
@RequiredArgsConstructor
public class PublicSalesOrderController {

    private final SalesOrderService salesOrderService;

    @GetMapping("/{token}/quote")
    public ResponseEntity<SalesOrderResponse> getPublicQuote(@PathVariable String token) {
        SalesOrderResponse response = salesOrderService.getPublicQuoteByToken(token);
        return ResponseEntity.ok(response);
    }
}
