package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.service.RepairService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/repairs")
@RequiredArgsConstructor
public class PublicRepairController {

    private final RepairService repairService;

    @GetMapping("/{token}/quote")
    public ResponseEntity<RepairResponse> getPublicQuote(@PathVariable String token) {
        RepairResponse response = repairService.getPublicQuoteByToken(token);
        return ResponseEntity.ok(response);
    }
}
