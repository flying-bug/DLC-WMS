package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.CustomerRequest;
import com.duylongtech.backend.dto.response.CustomerResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.SalesOrderLineRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private PartnerRepository partnerRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private SalesOrderLineRepository salesOrderLineRepository;

    @Mock
    private WarrantyRepository warrantyRepository;

    @Mock
    private RepairRepository repairRepository;

    @InjectMocks
    private CustomerService customerService;

    private Partner normalCustomer;
    private Partner seedCustomer;
    private CustomerRequest validRequest;

    @BeforeEach
    void setUp() {
        normalCustomer = Partner.builder()
                .id(1L)
                .code("KH2024010001")
                .name("Nguyen Van A")
                .phone("0901234567")
                .type("INDIVIDUAL")
                .groupType("RETAIL")
                .status("APPROVED")
                .isCustomer(true)
                .build();

        seedCustomer = Partner.builder()
                .id(999L)
                .code("KH-0000")
                .name("Khách vãng lai")
                .phone("0000000000")
                .type("INDIVIDUAL")
                .groupType("RETAIL")
                .status("APPROVED")
                .isCustomer(true)
                .build();

        validRequest = new CustomerRequest();
        validRequest.setName("Nguyen Van B");
        validRequest.setPhone("0987654321");
        validRequest.setGroupType("WHOLESALE");
    }

    @Test
    @DisplayName("Tìm kiếm khách hàng thành công")
    void searchCustomers_Success() {
        // Arrange
        PageRequest pageRequest = PageRequest.of(0, 10);
        Page<Partner> page = new PageImpl<>(List.of(normalCustomer));
        when(partnerRepository.searchCustomers(any(), any())).thenReturn(page);

        // Act
        Page<CustomerResponse> result = customerService.searchCustomers("090", 0, 10);

        // Assert
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Nguyen Van A");
    }

    @Test
    @DisplayName("Lấy chi tiết Khách hàng vãng lai (KH-0000) -> Ném ngoại lệ")
    void getCustomerById_WhenSeedCustomer_ShouldThrowException() {
        // Arrange
        when(partnerRepository.findByIdAndIsCustomerTrue(999L)).thenReturn(Optional.of(seedCustomer));

        // Act & Assert
        assertThatThrownBy(() -> customerService.getCustomerById(999L))
                .isInstanceOf(BusinessException.class)
                .hasMessage(SystemMessage.CUST_VIEW_SEED_DATA_DENIED.getMessage());
    }

    @Test
    @DisplayName("Tạo Khách hàng thành công")
    void createCustomer_Success() {
        // Arrange
        when(partnerRepository.existsByPhoneAndIsCustomerTrue("0987654321")).thenReturn(false);
        when(partnerRepository.save(any(Partner.class))).thenAnswer(i -> {
            Partner p = i.getArgument(0);
            p.setId(2L);
            return p;
        });

        // Act
        CustomerResponse response = customerService.createCustomer(validRequest);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Nguyen Van B");
        assertThat(response.getPhone()).isEqualTo("0987654321");

        ArgumentCaptor<Partner> captor = ArgumentCaptor.forClass(Partner.class);
        verify(partnerRepository).save(captor.capture());
        assertThat(captor.getValue().getCode()).startsWith("KH");
        assertThat(captor.getValue().getIsCustomer()).isTrue();
    }

    @Test
    @DisplayName("Tạo Khách hàng trùng SĐT -> Ném ngoại lệ CUST02")
    void createCustomer_WhenPhoneExists_ShouldThrowException() {
        // Arrange
        when(partnerRepository.existsByPhoneAndIsCustomerTrue("0987654321")).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> customerService.createCustomer(validRequest))
                .isInstanceOf(BusinessException.class)
                .hasMessage(SystemMessage.CUST_PHONE_EXISTS.getMessage());
    }

    @Test
    @DisplayName("Cập nhật Khách hàng (Đổi SĐT) -> Lưu Audit Log")
    void updateCustomer_WhenPhoneChanged_ShouldSaveAuditLog() {
        // Arrange
        when(partnerRepository.findByIdAndIsCustomerTrue(1L)).thenReturn(Optional.of(normalCustomer));
        when(partnerRepository.existsByPhoneAndIsCustomerTrueAndIdNot("0987654321", 1L)).thenReturn(false);
        when(partnerRepository.save(any(Partner.class))).thenReturn(normalCustomer);

        // Act
        customerService.updateCustomer(1L, validRequest, "admin");

        // Assert
        verify(auditLogService, times(1)).logEvent(
                eq("admin"), eq("UPDATE_PHONE"), eq("Customer"), eq(1L),
                eq("SUCCESS"), contains("Thay đổi SĐT"), isNull(), isNull()
        );
        assertThat(normalCustomer.getPhone()).isEqualTo("0987654321");
        assertThat(normalCustomer.getName()).isEqualTo("Nguyen Van B");
    }

    @Test
    @DisplayName("Vô hiệu hóa Khách hàng thành công")
    void deactivateCustomer_Success() {
        // Arrange
        when(partnerRepository.findByIdAndIsCustomerTrue(1L)).thenReturn(Optional.of(normalCustomer));
        when(partnerRepository.hasActiveRepairByPartnerId(1L)).thenReturn(false);

        // Act
        customerService.deactivateCustomer(1L);

        // Assert
        assertThat(normalCustomer.getStatus()).isEqualTo("INACTIVE");
        verify(partnerRepository).save(normalCustomer);
    }

    @Test
    @DisplayName("Vô hiệu hóa Khách hàng đang có thiết bị gửi sửa -> Ném ngoại lệ CUST03")
    void deactivateCustomer_WhenHasActiveRepair_ShouldThrowException() {
        // Arrange
        when(partnerRepository.findByIdAndIsCustomerTrue(1L)).thenReturn(Optional.of(normalCustomer));
        when(partnerRepository.hasActiveRepairByPartnerId(1L)).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> customerService.deactivateCustomer(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage(SystemMessage.CUST_HAS_REPAIRING_WARRANTY.getMessage());
        
        verify(partnerRepository, never()).save(any());
    }
}
