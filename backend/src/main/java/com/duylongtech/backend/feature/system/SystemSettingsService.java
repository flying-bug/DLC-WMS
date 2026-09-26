package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.utils.HttpTimeouts;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.system.SystemSetting;
import com.duylongtech.backend.feature.system.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import com.duylongtech.backend.feature.system.GoogleDriveService;
import com.duylongtech.backend.feature.system.SystemSetting;
import com.duylongtech.backend.feature.system.SystemSettingRepository;
import com.duylongtech.backend.feature.system.SystemSettingsService;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingsService {

    // Mức thuế GTGT hợp lệ 0% - 10%, khớp kiểm tra thuế trên dòng phiếu (InventoryDocumentService.validateVatRate)
    static final int MIN_VAT_RATE = 0;
    static final int MAX_VAT_RATE = 10;
    private static final List<Integer> DEFAULT_ALLOWED_VAT_RATES = List.of(0, 5, 8, 10);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    // Thông tin doanh nghiệp khi chưa cài đặt (trùng thông tin trước đây in cứng trên các chứng từ)
    static final String DEFAULT_COMPANY_NAME = "Công ty TNHH Công nghệ Thương mại Duy Long Techcom";
    static final String DEFAULT_COMPANY_SHORT_NAME = "Duy Long Computer";
    static final String DEFAULT_COMPANY_SLOGAN = "Since 2003";
    static final String DEFAULT_COMPANY_TAX_CODE = "0109123456";
    static final String DEFAULT_COMPANY_ADDRESS = "Tầng 1, số 42 Lê Thanh Nghị, Phường Bách Khoa, Quận Hai Bà Trưng, TP. Hà Nội";
    static final String DEFAULT_COMPANY_PHONE = "0914.89.8889 - 0912.01.1102 - 039.271.8888 - 07.8865.8865";
    static final String DEFAULT_COMPANY_EMAIL = "duylongcomputer@gmail.com";
    static final String DEFAULT_COMPANY_WEBSITE = "maytinhduylong.vn";
    static final String DEFAULT_COMPANY_BANK_ACCOUNT = "1903666888999 - Techcombank";

    private final SystemSettingRepository settingRepo;
    private final GoogleDriveService driveService;
    private final Environment env;

    public String getSetting(String key, String def) {
        return settingRepo.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(def);
    }

    private boolean getBool(String key) {
        return "true".equalsIgnoreCase(getSetting(key, "false"));
    }

    public boolean isAiEnabled() {
        return "true".equalsIgnoreCase(getSetting("ai.enabled", "true"));
    }

    public SystemSettingsDto getSettings() {
        String saJson = getSetting("drive.service.account", "");
        return SystemSettingsDto.builder()
                .backupPath(getSetting("backup.path", "/tmp/backups"))
                .driveEnabled(getBool("drive.enabled"))
                .driveFolderId(getSetting("drive.folder.id", ""))
                .driveConfigured(!saJson.isBlank())
                .encryptEnabled(getBool("backup.encrypt.enabled"))
                .encryptKey("") // never expose key
                .notifyEmailEnabled(getBool("notify.email.enabled"))
                .notifyEmailTo(getSetting("notify.email.to", ""))
                .snapshotTime(getSetting("snapshot.time", "00:05"))
                .reservationExpiryHours(Integer.parseInt(getSetting("sales.reservation.expiry_hours", "72")))
                .aiEnabled(isAiEnabled())
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
        upsert("ai.enabled", String.valueOf(dto.isAiEnabled()));

        if (dto.getSnapshotTime() != null && !dto.getSnapshotTime().isBlank()) {
            upsert("snapshot.time", dto.getSnapshotTime().trim());
        }
        
        Integer expiry = dto.getReservationExpiryHours();
        if (expiry == null || expiry <= 0) {
            expiry = 24; // Mặc định an toàn là 24h nếu người dùng nhập linh tinh
        }
        upsert("sales.reservation.expiry_hours", String.valueOf(expiry));

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
        String clientId = env.getProperty("google.client-id");
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
        String clientId = env.getProperty("google.client-id");

        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate(
                HttpTimeouts.requestFactory(HttpTimeouts.SHORT_READ_TIMEOUT));
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
            throw new IllegalStateException(SystemMessage.SYS_SET_ERR_001.getMessage());
        }
    }

    static boolean isValidVatRate(Integer rate) {
        return rate != null && rate >= MIN_VAT_RATE && rate <= MAX_VAT_RATE;
    }

    /** Mức thuế mặc định; giá trị đã lưu không nằm trong danh sách cho phép thì lấy 8% (hoặc mức cao nhất). */
    public int getDefaultVatRate() {
        List<Integer> allowed = getAllowedVatRates();
        try {
            int rate = Integer.parseInt(getSetting("tax.default_vat_rate", "8").trim());
            if (allowed.contains(rate)) {
                return rate;
            }
        } catch (NumberFormatException ignored) {
            // dùng mức dự phòng bên dưới
        }
        return allowed.contains(8) ? 8 : allowed.get(allowed.size() - 1);
    }

    /** Các mức thuế cho phép, bỏ qua giá trị không hợp lệ đã lưu từ trước (số âm, trên 10%, không phải số). */
    public List<Integer> getAllowedVatRates() {
        List<Integer> rates = Arrays.stream(getSetting("tax.allowed_vat_rates", "").split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Integer.valueOf(s);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                })
                .filter(SystemSettingsService::isValidVatRate)
                .distinct()
                .sorted()
                .toList();
        return rates.isEmpty() ? DEFAULT_ALLOWED_VAT_RATES : rates;
    }

    /** Kiểm tra danh sách mức thuế gửi lên: ít nhất một mức, mỗi mức là số nguyên 0-10; bỏ trùng, sắp xếp tăng dần. */
    static List<Integer> normalizeVatRates(List<Integer> rates) {
        if (rates == null || rates.isEmpty()) {
            throw new BusinessException(SystemMessage.BIZ_SET_ERR_002);
        }
        if (rates.stream().anyMatch(rate -> !isValidVatRate(rate))) {
            throw new BusinessException(SystemMessage.BIZ_SET_ERR_001);
        }
        return rates.stream().distinct().sorted().toList();
    }

    /** Giá trị doanh nghiệp đã lưu (kể cả để trống có chủ đích); chưa từng lưu thì dùng mặc định. */
    private String getCompanySetting(String key, String def) {
        return settingRepo.findBySettingKey(key)
                .map(setting -> setting.getSettingValue() == null ? "" : setting.getSettingValue().trim())
                .orElse(def);
    }

    /** Thông tin doanh nghiệp dùng chung cho mẫu in, xuất file, hóa đơn điện tử, email và giao diện. */
    public CompanyProfileDto getCompanyProfile() {
        String name = getCompanySetting("company.name", DEFAULT_COMPANY_NAME);
        if (name.isBlank()) {
            name = DEFAULT_COMPANY_NAME;
        }
        String shortName = getCompanySetting("company.short_name", DEFAULT_COMPANY_SHORT_NAME);
        return CompanyProfileDto.builder()
                .name(name)
                .shortName(shortName.isBlank() ? name : shortName)
                .slogan(getCompanySetting("company.slogan", DEFAULT_COMPANY_SLOGAN))
                .taxCode(getCompanySetting("company.tax_code", DEFAULT_COMPANY_TAX_CODE))
                .address(getCompanySetting("company.address", DEFAULT_COMPANY_ADDRESS))
                .phone(getCompanySetting("company.phone", DEFAULT_COMPANY_PHONE))
                .email(getCompanySetting("company.email", DEFAULT_COMPANY_EMAIL))
                .website(getCompanySetting("company.website", DEFAULT_COMPANY_WEBSITE))
                .bankAccount(getCompanySetting("company.bank_account", DEFAULT_COMPANY_BANK_ACCOUNT))
                .build();
    }

    public BusinessSettingsDto getBusinessSettings() {
        CompanyProfileDto company = getCompanyProfile();
        return BusinessSettingsDto.builder()
                .defaultVatRate(getDefaultVatRate())
                .allowedVatRates(getAllowedVatRates())
                .companyName(company.getName())
                // Hiển thị đúng giá trị đã lưu (có thể để trống = dùng tên doanh nghiệp)
                .companyShortName(getCompanySetting("company.short_name", DEFAULT_COMPANY_SHORT_NAME))
                .companySlogan(company.getSlogan())
                .companyTaxCode(company.getTaxCode())
                .companyAddress(company.getAddress())
                .companyPhone(company.getPhone())
                .companyEmail(company.getEmail())
                .companyWebsite(company.getWebsite())
                .companyBankAccount(company.getBankAccount())
                .build();
    }

    @Transactional
    public void saveBusinessSettings(BusinessSettingsDto dto) {
        List<Integer> allowedRates = dto.getAllowedVatRates() != null
                ? normalizeVatRates(dto.getAllowedVatRates())
                : getAllowedVatRates();
        if (dto.getDefaultVatRate() != null) {
            if (!isValidVatRate(dto.getDefaultVatRate())) {
                throw new BusinessException(SystemMessage.BIZ_SET_ERR_001);
            }
            if (!allowedRates.contains(dto.getDefaultVatRate())) {
                throw new BusinessException(SystemMessage.BIZ_SET_ERR_003);
            }
        }
        if (dto.getCompanyName() != null && dto.getCompanyName().isBlank()) {
            throw new BusinessException(SystemMessage.BIZ_SET_ERR_004);
        }
        if (dto.getCompanyEmail() != null && !dto.getCompanyEmail().isBlank()
                && !EMAIL_PATTERN.matcher(dto.getCompanyEmail().trim()).matches()) {
            throw new BusinessException(SystemMessage.BIZ_SET_ERR_005);
        }

        if (dto.getAllowedVatRates() != null) {
            upsert("tax.allowed_vat_rates", allowedRates.stream()
                    .map(String::valueOf)
                    .collect(java.util.stream.Collectors.joining(",")));
        }
        if (dto.getDefaultVatRate() != null) {
            upsert("tax.default_vat_rate", String.valueOf(dto.getDefaultVatRate()));
        }
        upsertTrimmed("company.name", dto.getCompanyName());
        upsertTrimmed("company.short_name", dto.getCompanyShortName());
        upsertTrimmed("company.slogan", dto.getCompanySlogan());
        upsertTrimmed("company.tax_code", dto.getCompanyTaxCode());
        upsertTrimmed("company.address", dto.getCompanyAddress());
        upsertTrimmed("company.phone", dto.getCompanyPhone());
        upsertTrimmed("company.email", dto.getCompanyEmail());
        upsertTrimmed("company.website", dto.getCompanyWebsite());
        upsertTrimmed("company.bank_account", dto.getCompanyBankAccount());
    }

    /** Trường không gửi lên (null) thì giữ nguyên giá trị cũ. */
    private void upsertTrimmed(String key, String value) {
        if (value != null) {
            upsert(key, value.trim());
        }
    }

    private void upsert(String key, String value) {
        SystemSetting s = settingRepo.findBySettingKey(key)
                .orElseGet(() -> {
                    SystemSetting created = new SystemSetting();
                    created.initSetting(key, null, null);
                    return created;
                });
        s.updateValue(value);
        settingRepo.save(s);
    }
}
