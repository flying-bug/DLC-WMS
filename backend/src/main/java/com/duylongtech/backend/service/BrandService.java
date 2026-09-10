package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.BrandRequest;
import com.duylongtech.backend.dto.response.BrandResponse;
import com.duylongtech.backend.entity.Brand;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public interface BrandService {
    List<BrandResponse> getAllBrands(String keyword);
    BrandResponse getBrandById(Long id);
    BrandResponse createBrand(BrandRequest req);
    BrandResponse updateBrand(Long id, BrandRequest req);
    boolean deleteBrand(Long id);
}
