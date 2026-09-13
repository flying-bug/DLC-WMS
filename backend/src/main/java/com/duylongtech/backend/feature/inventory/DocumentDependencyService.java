package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.DependencyCheckResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import com.duylongtech.backend.feature.inventory.DependencyCheckResponse;
import com.duylongtech.backend.feature.inventory.DocumentDependencyService;

public interface DocumentDependencyService {
    DependencyCheckResponse checkImportSlipUnpostable(Long docId);
    DependencyCheckResponse checkExportSlipUnpostable(Long docId);
}
