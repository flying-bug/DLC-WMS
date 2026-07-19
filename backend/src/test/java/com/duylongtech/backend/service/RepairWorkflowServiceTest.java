package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.RepairActionType;
import com.duylongtech.backend.constant.RepairStatus;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.RepairStatusUpdateRequest;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.RepairLine;
import com.duylongtech.backend.repository.RepairLineRepository;
import com.duylongtech.backend.repository.RepairRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RepairWorkflowServiceTest {

    @Mock
    private RepairRepository repairRepository;
    
    @Mock
    private RepairLineRepository repairLineRepository;

    @Mock
    private AuditLogService auditLogService;
    
    @Mock
    private InventoryDocumentService inventoryDocumentService;

    @InjectMocks
    private RepairWorkflowService repairWorkflowService;

    private Repair mockRepair;

    @BeforeEach
    void setUp() {
        mockRepair = Repair.builder()
                .id(1L)
                .repairCode("REP_TEST")
                .repairStatus(RepairStatus.QUOTATION.name())
                .totalAmount(BigDecimal.ZERO)
                .invoiceMethod("none")
                .build();
    }

    @Test
    void updateStatus_ToConfirmed_ShouldGenerateReservation() {
        RepairStatusUpdateRequest request = new RepairStatusUpdateRequest();
        request.setStatus(RepairStatus.CONFIRMED.name());

        when(repairRepository.findById(1L)).thenReturn(Optional.of(mockRepair));
        
        RepairLine line = RepairLine.builder()
                .actionType(RepairActionType.ADD.name())
                .componentVariantId(10L)
                .quantity(BigDecimal.ONE)
                .unitPrice(BigDecimal.ZERO)
                .build();
                
        when(repairLineRepository.findByRepairId(1L)).thenReturn(List.of(line));

        repairWorkflowService.updateStatus(1L, request, 1L);

        verify(inventoryDocumentService, times(1)).createExport(any(InventoryDocumentRequest.class));
        assertEquals(RepairStatus.CONFIRMED.name(), mockRepair.getRepairStatus());
    }
}
