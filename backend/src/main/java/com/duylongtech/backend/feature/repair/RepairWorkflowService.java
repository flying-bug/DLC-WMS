package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.repair.RepairResponse;

import com.duylongtech.backend.exception.BusinessException;

import com.duylongtech.backend.feature.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairResponse;
import com.duylongtech.backend.feature.repair.RepairWorkflowService;

public interface RepairWorkflowService {
    RepairResponse transitionStatus(Long repairId, String targetStatus, String note);
}
