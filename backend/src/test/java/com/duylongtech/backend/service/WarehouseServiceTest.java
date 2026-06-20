package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.WarehouseRequest;
import com.duylongtech.backend.dto.response.WarehouseDetailResponse;
import com.duylongtech.backend.dto.response.WarehouseResponse;
import com.duylongtech.backend.entity.Warehouse;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.UserWarehouseRoleRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WarehouseServiceTest {

    @Mock
    private WarehouseRepository warehouseRepository;
    
    @Mock
    private UserWarehouseRoleRepository userWarehouseRoleRepository;
    
    @Mock
    private InventoryBalanceRepository inventoryBalanceRepository;

    @InjectMocks
    private WarehouseService warehouseService;

    private Warehouse mockWarehouse;
    private WarehouseRequest mockRequest;

    @BeforeEach
    void setUp() {
        mockWarehouse = Warehouse.builder()
                .id(1L)
                .code("WH-01")
                .name("Kho Test")
                .address("123 Test")
                .type("STANDARD")
                .status("APPROVED")
                .build();

        mockRequest = WarehouseRequest.builder()
                .code("WH-01")
                .name("Kho Test Edit")
                .address("123 Test Edit")
                .status("APPROVED")
                .build();
    }

    @Test
    void createWarehouse_Success() {
        when(warehouseRepository.existsByCodeIgnoreCase("WH-01")).thenReturn(false);
        when(warehouseRepository.save(any(Warehouse.class))).thenReturn(mockWarehouse);

        WarehouseResponse res = warehouseService.createWarehouse(mockRequest, 99L);

        assertNotNull(res);
        assertEquals("WH-01", res.getCode());
        verify(userWarehouseRoleRepository, times(1)).save(any());
    }

    @Test
    void createWarehouse_FailCodeExists() {
        when(warehouseRepository.existsByCodeIgnoreCase("WH-01")).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, 
                () -> warehouseService.createWarehouse(mockRequest, 99L));
        assertEquals(SystemMessage.WH_CODE_EXISTS.getMessage(), ex.getMessage());
    }

    @Test
    void getWarehouses_Success() {
        Page<Warehouse> page = new PageImpl<>(List.of(mockWarehouse));
        when(warehouseRepository.filterWarehouses(any(), any(), any(), any(), any(PageRequest.class))).thenReturn(page);

        Page<WarehouseResponse> res = warehouseService.getWarehouses(null, null, null, null, PageRequest.of(0, 10));

        assertEquals(1, res.getTotalElements());
        assertEquals("WH-01", res.getContent().get(0).getCode());
    }

    @Test
    void getWarehouseDetail_Success() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(mockWarehouse));
        when(inventoryBalanceRepository.countDistinctVariantsByWarehouseId(1L)).thenReturn(10L);
        when(inventoryBalanceRepository.sumQuantityOnHandByWarehouseId(1L)).thenReturn(BigDecimal.valueOf(50L));
        when(inventoryBalanceRepository.sumTotalValueByWarehouseId(1L)).thenReturn(BigDecimal.valueOf(1000));

        WarehouseDetailResponse res = warehouseService.getWarehouseDetail(1L);

        assertEquals("WH-01", res.getCode());
        assertEquals(10L, res.getTotalSkus());
        assertEquals(50L, res.getTotalQuantity());
        assertEquals(BigDecimal.valueOf(1000), res.getTotalValue());
    }

    @Test
    void updateWarehouse_Success() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(mockWarehouse));
        when(warehouseRepository.save(any(Warehouse.class))).thenReturn(mockWarehouse);

        WarehouseResponse res = warehouseService.updateWarehouse(1L, mockRequest);

        assertNotNull(res);
        assertEquals("Kho Test Edit", mockWarehouse.getName());
        assertEquals("123 Test Edit", mockWarehouse.getAddress());
        // Code and type should not be changed by logic
    }

    @Test
    void deleteWarehouse_SuccessEmptyWarehouse() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(mockWarehouse));
        when(inventoryBalanceRepository.existsByWarehouseId(1L)).thenReturn(false);

        warehouseService.deleteWarehouse(1L);

        assertEquals("INACTIVE", mockWarehouse.getStatus());
        verify(warehouseRepository, times(1)).save(mockWarehouse);
    }

    @Test
    void deleteWarehouse_FailHasInventory() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(mockWarehouse));
        when(inventoryBalanceRepository.existsByWarehouseId(1L)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> warehouseService.deleteWarehouse(1L));

        assertEquals(SystemMessage.WH_HAS_TRANSACTION.getMessage(), ex.getMessage());
        assertEquals("INACTIVE", mockWarehouse.getStatus());
        verify(warehouseRepository, times(1)).save(mockWarehouse);
    }
}
