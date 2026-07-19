package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.RepairActionType;
import com.duylongtech.backend.constant.RepairStatus;
import com.duylongtech.backend.dto.request.RepairLineRequest;
import com.duylongtech.backend.dto.request.RepairRequest;
import com.duylongtech.backend.dto.response.RepairLineResponse;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.RepairLine;
import com.duylongtech.backend.repository.RepairFeeRepository;
import com.duylongtech.backend.repository.RepairLineRepository;
import com.duylongtech.backend.repository.RepairRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RepairServiceTest {

    @Mock
    private RepairRepository repairRepository;
    
    @Mock
    private RepairLineRepository repairLineRepository;

    @Mock
    private RepairFeeRepository repairFeeRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private RepairService repairService;

    private Repair mockRepair;

    @BeforeEach
    void setUp() {
        mockRepair = Repair.builder()
                .id(1L)
                .repairCode("REP_TEST")
                .repairStatus(RepairStatus.DRAFT.name())
                .totalAmount(BigDecimal.ZERO)
                .underWarranty(false)
                .build();
    }

    @Test
    void searchRepairs_ShouldReturnPage() {
        Page<Repair> pagedResponse = new PageImpl<>(List.of(mockRepair));
        when(repairRepository.searchRepairTickets(any(), any(), any(), any(), any()))
                .thenReturn(pagedResponse);

        Page<RepairResponse> result = repairService.searchRepairs(null, null, null, null, 0, 10);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("REP_TEST", result.getContent().get(0).getRepairCode());
    }

    @Test
    void createRepair_ShouldReturnResponse_AndLogAudit() {
        RepairRequest request = new RepairRequest();
        request.setPartnerId(10L);
        request.setProductId(20L);
        
        when(repairRepository.save(any(Repair.class))).thenReturn(mockRepair);
        
        RepairResponse response = repairService.createRepair(request, 1L);
        
        assertNotNull(response);
        verify(repairRepository, times(1)).save(any(Repair.class));
        verify(auditLogService, times(1)).logAction(eq("REPAIR"), eq(1L), eq("CREATE"), anyString(), eq(1L));
    }

    @Test
    void addRepairLine_ShouldCalculateZeroPrice_WhenWarrantyIsTrue() {
        RepairLineRequest request = new RepairLineRequest();
        request.setComponentVariantId(100L);
        request.setActionType(RepairActionType.ADD.name());
        request.setQuantity(BigDecimal.valueOf(2));
        request.setUnitPrice(new BigDecimal("500000"));
        request.setIsFreeWarranty(true);

        when(repairRepository.findById(1L)).thenReturn(Optional.of(mockRepair));
        
        RepairLine mockLine = RepairLine.builder()
                .id(10L)
                .repairId(1L)
                .actionType("ADD")
                .quantity(BigDecimal.valueOf(2))
                .unitPrice(BigDecimal.ZERO) // Expected because isFreeWarranty = true
                .isFreeWarranty(true)
                .build();
                
        when(repairLineRepository.save(any(RepairLine.class))).thenReturn(mockLine);
        when(repairLineRepository.findByRepairId(1L)).thenReturn(List.of(mockLine));

        RepairLineResponse response = repairService.addRepairLine(1L, request, 1L);

        assertNotNull(response);
        assertEquals(BigDecimal.ZERO, response.getUnitPrice());
        verify(repairRepository, times(1)).save(any(Repair.class)); // Verifies recalculateTotalAmount is called
    }
}
