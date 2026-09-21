package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.assembly.*;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AssemblyOrderCostVisibilityTest {
    private final AssemblyOrderMapper mapper = mock(AssemblyOrderMapper.class);
    private final InventoryBalanceRepository inventoryBalanceRepository = mock(InventoryBalanceRepository.class);
    private final AssemblyOrderService service = new AssemblyOrderService(
            mock(AssemblyBomService.class),
            mock(AssemblyOrderRepository.class),
            mock(ProductVariantRepository.class),
            mock(InventoryDocumentRepository.class),
            inventoryBalanceRepository,
            mock(AssemblyOrderSerialRepository.class),
            mock(RepairRepository.class),
            mock(UserRepository.class),
            mapper);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void exposesCostOnlyAfterApprovalAndForAllowedRole() {
        AssemblyOrder order = new AssemblyOrder();
        order.initOrder("LR-TEST", "ASSEMBLY", null, null, 1L, new BigDecimal("5"), LocalDate.now(), null, 1L);
        ProductVariant variant = mock(ProductVariant.class);
        when(variant.getId()).thenReturn(10L);
        AssemblyOrderLine line = new AssemblyOrderLine();
        line.initLine(variant, new BigDecimal("5"), new BigDecimal("200000"), null);
        order.addLine(line);
        when(inventoryBalanceRepository.sumAvailableLooseQuantitiesGroupedByVariant(1L, List.of(10L), "GOOD"))
                .thenReturn(List.<Object[]>of(new Object[]{10L, new BigDecimal("7")}));
        when(mapper.toOrderResponse(order)).thenAnswer(ignored -> AssemblyOrderResponse.builder().build());
        when(mapper.toOrderLineResponse(any())).thenAnswer(ignored -> AssemblyOrderLineResponse.builder()
                .componentName("Linh kiện")
                .unitCost(new BigDecimal("200000"))
                .build());

        authenticate("ROLE_ACCOUNTANT");
        assertNull(service.toOrderResponse(order).getLines().get(0).getUnitCost());
        assertEquals(new BigDecimal("7"), service.toOrderResponse(order).getLines().get(0).getAvailableQuantity());
        assertNull(service.toOrderResponse(order).getTargetUnitCost());

        order.setApprovedAt(LocalDateTime.now());
        assertEquals(new BigDecimal("200000"), service.toOrderResponse(order).getLines().get(0).getUnitCost());
        assertNull(service.toOrderResponse(order).getLines().get(0).getAvailableQuantity());
        assertEquals(new BigDecimal("200000.0000"), service.toOrderResponse(order).getTargetUnitCost());

        authenticate("ROLE_TECHNICIAN");
        assertNull(service.toOrderResponse(order).getLines().get(0).getUnitCost());
        assertNull(service.toOrderResponse(order).getTargetUnitCost());
    }

    private void authenticate(String authority) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "user", null, List.of(new SimpleGrantedAuthority(authority))));
    }
}
