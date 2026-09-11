package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.WarrantyRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.WarrantyStatusRequest;
import com.duylongtech.backend.dto.request.WarrantyLineRequest;
import com.duylongtech.backend.dto.response.WarrantyLineResponse;
import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.entity.WarrantyLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.WarrantyRepository;
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
