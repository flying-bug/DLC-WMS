package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.TaxLookupResponse;
import com.duylongtech.backend.service.TaxLookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tax-lookup")
@RequiredArgsConstructor
public class TaxLookupController {

    private final TaxLookupService taxLookupService;

    @GetMapping("/{taxCode}")
    public ApiResponse<TaxLookupResponse> lookup(@PathVariable String taxCode) {
        TaxLookupResponse result = taxLookupService.lookupTaxCode(taxCode);
        return ApiResponse.success(result);
    }
}
