package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import lombok.RequiredArgsConstructor;
import com.duylongtech.backend.feature.repair.RepairPhotoRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RepairTokenService {

    private final RepairTokenRepository repairTokenRepository;
    private final RepairRepository repairRepository;
    private final RepairPhotoRepository repairPhotoRepository;
    private final PartnerRepository partnerRepository;
    private final UserRepository userRepository;
    private final SerialNumberRepository serialNumberRepository;

    @Transactional
    public String generateTokenForRepair(Long repairId) {
        // Revoke existing active tokens for this repair
        List<RepairToken> existingTokens = repairTokenRepository.findByRepairIdAndStatus(repairId, "ACTIVE");
        for (RepairToken t : existingTokens) {
            t.setStatus("REVOKED");
            repairTokenRepository.save(t);
        }

        // Generate new token
        RepairToken token = new RepairToken();
        token.setRepairId(repairId);
        token.setToken(generateRandomToken());
        token.setExpiresAt(LocalDateTime.now().plusHours(48));
        token.setCreatedBy(getCurrentUserId());
        
        repairTokenRepository.save(token);
        return token.getToken();
    }

    @Transactional(readOnly = true)
    public PublicRepairResponse getRepairByToken(String tokenStr) {
        RepairToken token = repairTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new BusinessException("Liên kết không hợp lệ hoặc không tồn tại."));

        Repair repair = repairRepository.findWithDetailsById(token.getRepairId())
                .orElseThrow(() -> new BusinessException("Lệnh sửa chữa không tồn tại."));

        PublicRepairResponse response = new PublicRepairResponse();
        response.setRepairCode(repair.getRepairCode());
        response.setProductName(repair.getProductVariant() != null ? repair.getProductVariant().getVariantName() : null);
        
        String serialText = null;
        if (repair.getSerialNumberId() != null) {
            serialText = serialNumberRepository.findById(repair.getSerialNumberId()).map(s -> s.getSerialNumber()).orElse(null);
        }
        response.setSerialNumber(serialText);
        response.setIssueDescription(repair.getIssueDescription());
        response.setDiagnosisNote(repair.getDiagnosisNote());
        response.setRepairStatus(repair.getRepairStatus());
        response.setReceivedDate(repair.getReceivedDate());
        response.setExpectedDate(repair.getExpectedDate());

        Partner customer = partnerRepository.findById(repair.getPartnerId()).orElse(null);
        response.setCustomerName(customer != null ? customer.getName() : "Khách hàng");

        // Calculate totals and map lines
        BigDecimal totalParts = BigDecimal.ZERO;
        List<PublicRepairResponse.PublicRepairLineDto> lineDtos = repair.getRepairLines().stream()
                .filter(l -> "ADD".equals(l.getActionType()) || "REPLACE".equals(l.getActionType()))
                .map(l -> {
                    PublicRepairResponse.PublicRepairLineDto dto = new PublicRepairResponse.PublicRepairLineDto();
                    dto.setComponentName(l.getComponentVariant() != null ? l.getComponentVariant().getVariantName() : "Linh kiện");
                    dto.setQuantity(l.getQuantity() != null ? l.getQuantity().intValue() : 0);
                    dto.setUnitName("Cái"); // Simplified
                    dto.setUnitPrice(l.getUnitPrice());
                    dto.setVatPercent(l.getVatPercent() != null ? l.getVatPercent().intValue() : 0);
                    dto.setIsFreeWarranty(l.getIsFreeWarranty());
                    
                    BigDecimal amt = BigDecimal.ZERO;
                    if (!Boolean.TRUE.equals(l.getIsFreeWarranty())) {
                        BigDecimal qty = l.getQuantity() != null ? l.getQuantity() : BigDecimal.ZERO;
                        BigDecimal price = l.getUnitPrice() != null ? l.getUnitPrice() : BigDecimal.ZERO;
                        amt = qty.multiply(price);
                        BigDecimal vatPercent = l.getVatPercent() != null ? l.getVatPercent() : BigDecimal.ZERO;
                        BigDecimal vat = amt.multiply(vatPercent).divide(new BigDecimal(100));
                        amt = amt.add(vat);
                    }
                    dto.setAmount(amt);
                    return dto;
                }).collect(Collectors.toList());

        for (PublicRepairResponse.PublicRepairLineDto l : lineDtos) {
            totalParts = totalParts.add(l.getAmount());
        }
        
        BigDecimal totalFees = BigDecimal.ZERO;
        List<PublicRepairResponse.PublicRepairFeeDto> feeDtos = repair.getFees().stream()
                .map(f -> {
                    PublicRepairResponse.PublicRepairFeeDto dto = new PublicRepairResponse.PublicRepairFeeDto();
                    dto.setFeeName(f.getFeeName());
                    dto.setQuantity(f.getQuantity() != null ? f.getQuantity().intValue() : 1);
                    dto.setUnitName(f.getUnitName());
                    dto.setFeeAmount(f.getFeeAmount());
                    dto.setVatPercent(f.getVatPercent() != null ? f.getVatPercent().intValue() : 0);
                    dto.setIsFreeWarranty(f.getIsFreeWarranty());
                    
                    BigDecimal amt = BigDecimal.ZERO;
                    if (!Boolean.TRUE.equals(f.getIsFreeWarranty())) {
                        BigDecimal qty = f.getQuantity() != null ? f.getQuantity() : BigDecimal.ONE;
                        BigDecimal price = f.getFeeAmount() != null ? f.getFeeAmount() : BigDecimal.ZERO;
                        amt = qty.multiply(price);
                        BigDecimal vatPercent = f.getVatPercent() != null ? f.getVatPercent() : BigDecimal.ZERO;
                        BigDecimal vat = amt.multiply(vatPercent).divide(new BigDecimal(100));
                        amt = amt.add(vat);
                    }
                    dto.setAmount(amt);
                    return dto;
                }).collect(Collectors.toList());

        for (PublicRepairResponse.PublicRepairFeeDto f : feeDtos) {
            totalFees = totalFees.add(f.getAmount());
        }

        response.setLines(lineDtos);
        response.setFees(feeDtos);
        response.setPhotos(repairPhotoRepository.findByRepairIdOrderByCreatedAtAsc(repair.getId()).stream().map(p -> {
            PublicRepairResponse.PublicRepairPhotoDto dto = new PublicRepairResponse.PublicRepairPhotoDto();
            dto.setPhase(p.getPhase());
            dto.setCategory(p.getCategory());
            dto.setSecureUrl(p.getSecureUrl());
            dto.setCaption(p.getCaption());
            return dto;
        }).collect(Collectors.toList()));

        response.setTotalPartsAmount(totalParts);
        response.setTotalFeesAmount(totalFees);
        response.setTotalAmount(totalParts.add(totalFees));
        
        // Note: actual totalVAT should be separated, but for public view, total amount is what matters.
        
        response.setIsTokenValid("ACTIVE".equals(token.getStatus()) && token.getExpiresAt().isAfter(LocalDateTime.now()) && !token.getUsed());
        response.setTokenExpiresAt(token.getExpiresAt());

        return response;
    }

    @Transactional
    public RepairToken validateToken(String tokenStr) {
        RepairToken token = repairTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new BusinessException("Liên kết không hợp lệ."));
        if (!"ACTIVE".equals(token.getStatus())) {
            throw new BusinessException("Liên kết đã bị thu hồi.");
        }
        if (token.getUsed()) {
            throw new BusinessException("Liên kết này đã được sử dụng để xác nhận.");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Liên kết đã hết hạn.");
        }
        return token;
    }

    @Transactional
    public void markTokenAsUsed(String tokenStr) {
        RepairToken token = validateToken(tokenStr);
        token.setUsed(true);
        repairTokenRepository.save(token);
    }

    private String generateRandomToken() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return null;
        return userRepository.findByUsername(auth.getName()).map(User::getId).orElse(null);
    }
}
