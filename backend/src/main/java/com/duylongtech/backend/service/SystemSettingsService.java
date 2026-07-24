package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.SystemSettingsDto;
import com.duylongtech.backend.entity.SystemSetting;
import com.duylongtech.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingsService {

    private final SystemSettingRepository settingRepo;
    private final GoogleDriveService driveService;
    private final Environment env;

    private String get(String key, String def) {
        return settingRepo.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(def);
    }

    private boolean getBool(String key) {
        return "true".equalsIgnoreCase(get(key, "false"));
    }

    public SystemSettingsDto getSettings() {
        String saJson = get("drive.service.account", "");
        return SystemSettingsDto.builder()
                .backupPath(get("backup.path", "/tmp/backups"))
                .driveEnabled(getBool("drive.enabled"))
                .driveFolderId(get("drive.folder.id", ""))
                .driveConfigured(!saJson.isBlank())
                .encryptEnabled(getBool("backup.encrypt.enabled"))
                .encryptKey("") // never expose key
                .notifyEmailEnabled(getBool("notify.email.enabled"))
                .notifyEmailTo(get("notify.email.to", ""))
                .build();
    }

    @Transactional
    public void saveSettings(SystemSettingsDto dto) {
        upsert("backup.path", dto.getBackupPath());
        upsert("drive.enabled", String.valueOf(dto.isDriveEnabled()));
        upsert("drive.folder.id", dto.getDriveFolderId());
        upsert("backup.encrypt.enabled", String.valueOf(dto.isEncryptEnabled()));
        upsert("notify.email.enabled", String.valueOf(dto.isNotifyEmailEnabled()));
        upsert("notify.email.to", dto.getNotifyEmailTo());

        // Only update encrypt key if explicitly provided
        if (dto.getEncryptKey() != null && !dto.getEncryptKey().isBlank()) {
            upsert("backup.encrypt.key", dto.getEncryptKey());
        }
    }

    @Transactional
    public void saveServiceAccountJson(byte[] jsonBytes) {
        String base64 = Base64.getEncoder().encodeToString(jsonBytes);
        upsert("drive.service.account", base64);
    }

    public void testDriveConnection() throws Exception {
        driveService.testConnection();
    }

    public String getOAuthAuthUrl(String redirectUri) {
        String clientId = env.getProperty("google.client-id", "889308816246-1sg2529hrhn6671gfcm2fae11eg9qque.apps.googleusercontent.com");
        return "https://accounts.google.com/o/oauth2/v2/auth" +
                "?client_id=" + clientId +
                "&redirect_uri=" + java.net.URLEncoder.encode(redirectUri, java.nio.charset.StandardCharsets.UTF_8) +
                "&response_type=code" +
                "&scope=" + java.net.URLEncoder.encode("https://www.googleapis.com/auth/drive.file", java.nio.charset.StandardCharsets.UTF_8) +
                "&access_type=offline" +
                "&prompt=consent";
    }

    @Transactional
    public void exchangeOAuthCode(String code, String redirectUri) throws Exception {
        String clientId = env.getProperty("google.client-id", "889308816246-1sg2529hrhn6671gfcm2fae11eg9qque.apps.googleusercontent.com");

        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        org.springframework.util.MultiValueMap<String, String> body = new org.springframework.util.LinkedMultiValueMap<>();
        body.add("code", code);
        body.add("client_id", clientId);
        body.add("grant_type", "authorization_code");
        body.add("redirect_uri", redirectUri);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);

        org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, String>> request = new org.springframework.http.HttpEntity<>(body, headers);
        org.springframework.http.ResponseEntity<Map> resp = restTemplate.postForEntity("https://oauth2.googleapis.com/token", request, Map.class);

        if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
            Map respMap = resp.getBody();
            String refreshToken = (String) respMap.get("refresh_token");
            if (refreshToken != null && !refreshToken.isBlank()) {
                upsert("drive.oauth.refresh_token", refreshToken);
                log.info("Successfully saved Google OAuth2 refresh token!");
            } else {
                log.warn("OAuth2 exchange returned no refresh_token: {}", respMap);
            }
        } else {
            throw new IllegalStateException("Đổi mã Google OAuth2 thất bại.");
        }
    }

    private void upsert(String key, String value) {
        SystemSetting s = settingRepo.findBySettingKey(key)
                .orElse(SystemSetting.builder().settingKey(key).build());
        s.setSettingValue(value);
        settingRepo.save(s);
    }
}
