package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.StocktakeLineRequest;
import com.duylongtech.backend.dto.request.StocktakeRequest;
import com.duylongtech.backend.dto.response.StocktakeResponse;
import com.duylongtech.backend.dto.response.StocktakeLineResponse;
import com.duylongtech.backend.dto.response.StocktakeLineSerialResponse;
import com.duylongtech.backend.dto.response.StocktakeParticipantResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public interface StocktakeService {
    String generateNextStocktakeCode();
    Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, LocalDate fromDate,
            LocalDate toDate, Pageable pageable);
    Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, Long warehouseId,
            LocalDate fromDate, LocalDate toDate, Pageable pageable, com.duylongtech.backend.security.UserDetailsImpl userPrincipal);
    StocktakeResponse getStocktakeDetail(Long id);
    StocktakeResponse getStocktakeDetail(Long id, com.duylongtech.backend.security.UserDetailsImpl userPrincipal);
    List<SerialNumber> getAvailableSerials(Long warehouseId, Long variantId);
    StocktakeResponse createStocktake(StocktakeRequest req);
    StocktakeResponse updateStocktake(Long id, StocktakeRequest req);
    StocktakeResponse postStocktake(Long id, Long processedBy);
}
