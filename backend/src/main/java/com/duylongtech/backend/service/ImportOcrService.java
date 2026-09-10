package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.OcrImportResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.OcrImportResponse.OcrItemLine;
import com.duylongtech.backend.dto.response.OcrImportResponse.VariantSuggestion;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.VendorProductMapping;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.VendorProductMappingRepository;
import com.duylongtech.backend.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

public interface ImportOcrService {

    @lombok.Getter
    @lombok.Setter
    public static class OcrSessionData {
        private String status; // PENDING, PROCESSING, SUCCESS, ERROR
        private OcrImportResponse result;
        private String errorMessage;
        private long createdAt = System.currentTimeMillis();
    }
    void cleanupExpiredSessions();
    String initSession();
    OcrSessionData getSessionState(String sessionId);
    void scanDocumentForSession(String sessionId, MultipartFile file);
    OcrImportResponse scanDocument(MultipartFile file);
    OcrImportResponse scanDocumentBytes(byte[] imageBytes, String mimeType);
    void confirmMapping(Long partnerId, String vendorProductName, Long variantId);
}
