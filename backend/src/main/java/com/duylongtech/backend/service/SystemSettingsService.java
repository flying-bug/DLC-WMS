package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.SystemSettingsDto;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.entity.SystemSetting;
import com.duylongtech.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Base64;
import java.util.Map;

public interface SystemSettingsService {
    String getSetting(String key, String def);
    boolean isAiEnabled();
    SystemSettingsDto getSettings();
    void saveSettings(SystemSettingsDto dto);
    void saveServiceAccountJson(byte[] jsonBytes);
    void testDriveConnection() throws Exception;
    String getOAuthAuthUrl(String redirectUri);
    void exchangeOAuthCode(String code, String redirectUri) throws Exception;
    int getDefaultVatRate();
    java.util.List<Integer> getAllowedVatRates();
    com.duylongtech.backend.dto.BusinessSettingsDto getBusinessSettings();
    void saveBusinessSettings(com.duylongtech.backend.dto.BusinessSettingsDto dto);
}
