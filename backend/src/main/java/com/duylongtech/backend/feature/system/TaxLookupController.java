package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.feature.system.TaxLookupResponse;
import com.duylongtech.backend.feature.system.TaxLookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tax-lookup")
@RequiredArgsConstructor
public class TaxLookupController {

    private final TaxLookupService taxLookupService;

    @GetMapping("/{taxCode}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<TaxLookupResponse> lookup(@PathVariable String taxCode) {
        TaxLookupResponse result = taxLookupService.lookupTaxCode(taxCode);
        return ApiResponse.success(result);
    }
}
