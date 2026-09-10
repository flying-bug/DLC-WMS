package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.TaxLookupResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

public interface TaxLookupService {
    TaxLookupResponse lookupTaxCode(String rawTaxCode);
}
