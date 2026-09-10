package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.DependencyCheckResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

public interface DocumentDependencyService {
    DependencyCheckResponse checkImportSlipUnpostable(Long docId);
    DependencyCheckResponse checkExportSlipUnpostable(Long docId);
}
