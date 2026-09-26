package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostAllocationService;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Kế toán duyệt lệnh sửa chữa chỉ có dịch vụ (không có linh kiện qua kho) thì KTV không nhận được thông báo:
 * thông báo nằm cuối handleConfirm, sau nhánh return sớm của lệnh không cần xuất/nhập kho.
 */
class RepairApprovalNotificationTest {

    private static final long REPAIR_ID = 13L;
    private static final long TECHNICIAN_ID = 7L;

    private final RepairRepository repairRepository = mock(RepairRepository.class);
    private final AppNotificationService notificationService = mock(AppNotificationService.class);
    private RepairWorkflowService service;
    private Repair repair;

    @BeforeEach
    void setUp() {
        service = new RepairWorkflowService(
                repairRepository,
                mock(RepairLineRepository.class), // không có dòng linh kiện nào: lệnh chỉ có dịch vụ
                mock(RepairFeeRepository.class),
                mock(InventoryBalanceRepository.class),
                mock(InventoryDocumentRepository.class),
                mock(WarehouseRepository.class),
                mock(UserRepository.class),
                mock(AuditLogService.class),
                mock(RepairService.class),
                mock(ProductVariantRepository.class),
                mock(InventoryDocumentService.class),
                mock(InventoryCostAllocationService.class),
                mock(SerialNumberRepository.class),
                mock(DeviceComponentSerialRepository.class),
                notificationService,
                mock(PaymentService.class));

        repair = new Repair();
        repair.initOrder("SC00013", 3L, null, null, 1, null, null, null, null, null, null, null,
                null, null, "Đề nghị sửa SSD", null, false, null, null, null, null, null, TECHNICIAN_ID);
        repair.setId(REPAIR_ID);
        repair.moveToQuotation();
        repair.sendForApproval(); // KTV gửi báo giá chờ Kế toán duyệt
        when(repairRepository.findWithDetailsById(REPAIR_ID)).thenReturn(Optional.of(repair));
        when(repairRepository.save(any(Repair.class))).thenAnswer(inv -> inv.getArgument(0));

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "ketoan", null, List.of(new SimpleGrantedAuthority("ROLE_ACCOUNTANT"))));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void technicianIsNotifiedWhenAServiceOnlyRepairIsApproved() {
        service.transitionStatus(REPAIR_ID, "CONFIRMED", null);

        assertEquals(RepairStatus.UNDER_REPAIR.name(), repair.getRepairStatus());
        verify(notificationService).createNotification(
                eq("ROLE_TECHNICIAN"), eq(TECHNICIAN_ID), eq("Lệnh sửa chữa được duyệt"), anyString(),
                eq("REPAIR_CONFIRMED"), eq("REPAIR"), eq(REPAIR_ID), eq("/repairs/" + REPAIR_ID), isNull());
    }
}
