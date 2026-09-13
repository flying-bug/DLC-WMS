package com.duylongtech.backend.feature.warranty;

import com.duylongtech.backend.feature.warranty.WarrantyRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.warranty.WarrantyStatusRequest;
import com.duylongtech.backend.feature.warranty.WarrantyLineRequest;
import com.duylongtech.backend.feature.warranty.WarrantyLineResponse;
import com.duylongtech.backend.feature.warranty.WarrantyResponse;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warranty.WarrantyLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public interface WarrantyLifecycleService {
    WarrantyResponse createWarranty(WarrantyRequest request);
    WarrantyResponse updateWarranty(Long id, WarrantyRequest request);
    WarrantyResponse updateWarrantyStatus(Long id, WarrantyStatusRequest request);
}
