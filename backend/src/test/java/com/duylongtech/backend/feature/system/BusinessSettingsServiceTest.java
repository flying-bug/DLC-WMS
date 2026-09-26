package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Thiết lập nghiệp vụ: mức thuế VAT không được âm (trước đây nhập -10 vẫn lưu được; trên 10% chỉ cảnh báo ở màn
 * thiết lập, không chặn), và thông tin
 * doanh nghiệp là nguồn chung cho mẫu in, hóa đơn, email.
 */
class BusinessSettingsServiceTest {

    private final SystemSettingRepository repo = mock(SystemSettingRepository.class);
    private final Map<String, String> stored = new HashMap<>();
    private SystemSettingsService service;

    @BeforeEach
    void setUp() {
        service = new SystemSettingsService(repo, mock(GoogleDriveService.class), mock(Environment.class));
        when(repo.findBySettingKey(anyString())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            if (!stored.containsKey(key)) {
                return Optional.empty();
            }
            SystemSetting setting = new SystemSetting();
            setting.initSetting(key, stored.get(key), null);
            return Optional.of(setting);
        });
        when(repo.save(any(SystemSetting.class))).thenAnswer(invocation -> {
            SystemSetting setting = invocation.getArgument(0);
            stored.put(setting.getSettingKey(), setting.getSettingValue());
            return setting;
        });
    }

    private static BusinessSettingsDto vat(List<Integer> allowed, Integer defaultRate) {
        return BusinessSettingsDto.builder().allowedVatRates(allowed).defaultVatRate(defaultRate).build();
    }

    private void assertRejected(BusinessSettingsDto dto, SystemMessage expected) {
        BusinessException ex = assertThrows(BusinessException.class, () -> service.saveBusinessSettings(dto));
        assertEquals(expected, ex.getSystemMessage());
        verify(repo, never()).save(any());
    }

    @Test
    void negativeVatRateIsRejected() {
        assertRejected(vat(List.of(-10, 0, 8), 8), SystemMessage.BIZ_SET_ERR_001);
    }

    @Test
    void vatRateAboveTenPercentIsAllowed() {
        service.saveBusinessSettings(vat(List.of(0, 8, 15), 15));

        assertEquals(List.of(0, 8, 15), service.getAllowedVatRates());
        assertEquals(15, service.getDefaultVatRate());
    }

    @Test
    void negativeDefaultVatRateIsRejected() {
        assertRejected(vat(List.of(0, 8), -10), SystemMessage.BIZ_SET_ERR_001);
    }

    @Test
    void emptyVatRateListIsRejected() {
        assertRejected(vat(List.of(), null), SystemMessage.BIZ_SET_ERR_002);
    }

    @Test
    void defaultVatRateMustBeOneOfTheAllowedRates() {
        assertRejected(vat(List.of(0, 5, 10), 8), SystemMessage.BIZ_SET_ERR_003);
    }

    @Test
    void blankCompanyNameAndInvalidEmailAreRejected() {
        assertRejected(BusinessSettingsDto.builder().companyName("   ").build(), SystemMessage.BIZ_SET_ERR_004);
        assertRejected(BusinessSettingsDto.builder().companyName("Cty A").companyEmail("khong-phai-email").build(),
                SystemMessage.BIZ_SET_ERR_005);
    }

    @Test
    void allowedRatesAreDedupedAndSorted() {
        service.saveBusinessSettings(vat(List.of(10, 0, 8, 8), 8));

        assertEquals("0,8,10", stored.get("tax.allowed_vat_rates"));
        assertEquals(List.of(0, 8, 10), service.getAllowedVatRates());
        assertEquals(8, service.getDefaultVatRate());
    }

    @Test
    void invalidRatesSavedBeforeTheCheckAreIgnored() {
        stored.put("tax.allowed_vat_rates", "-10,5,8,13,abc");
        stored.put("tax.default_vat_rate", "-10");

        assertEquals(List.of(5, 8, 13), service.getAllowedVatRates());
        assertEquals(8, service.getDefaultVatRate());
    }

    @Test
    void companyProfileUsesSavedValuesAndFallsBackToLegalNameWhenShortNameIsBlank() {
        service.saveBusinessSettings(BusinessSettingsDto.builder()
                .companyName("  Công ty TNHH ABC  ")
                .companyShortName("")
                .companyWebsite("")
                .companyPhone("024 1234 5678")
                .build());

        CompanyProfileDto profile = service.getCompanyProfile();
        assertEquals("Công ty TNHH ABC", profile.getName());
        assertEquals("Công ty TNHH ABC", profile.getShortName());
        assertEquals("024 1234 5678", profile.getPhone());
        assertEquals("", profile.getWebsite(), "để trống có chủ đích thì không in website mặc định");
        assertEquals(SystemSettingsService.DEFAULT_COMPANY_ADDRESS, profile.getAddress(), "chưa lưu thì dùng mặc định");
    }
}
