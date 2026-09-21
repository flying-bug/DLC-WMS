package com.duylongtech.backend.service;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.DocumentDependencyService;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostAllocationService;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.inventory.InventoryPostingService;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderService;
import com.duylongtech.backend.feature.stocktake.StocktakeLockGuard;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.WarrantyLifecycleService;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;

import java.lang.reflect.Method;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage for the bug fixed alongside this test: postExport() was
 * annotated @Transactional(readOnly = true) despite writing InventoryBalance,
 * InventoryCostLayer, SerialNumber, Warranty and InventoryLedger rows - risking
 * silently-dropped writes / no rollback on failure. See InventoryPostingService.
 */
class InventoryPostingServiceExportGuardTest {

    private final InventoryDocumentRepository inventoryDocumentRepository = mock(InventoryDocumentRepository.class);

    private InventoryPostingService newService() {
        return new InventoryPostingService(
                mock(CodeGeneratorService.class),
                mock(InventoryDocumentMapper.class),
                inventoryDocumentRepository,
                mock(InventoryDocumentLineRepository.class),
                mock(InventoryBalanceRepository.class),
                mock(InventoryCostLayerRepository.class),
                mock(InventoryCostAllocationService.class),
                mock(InventoryLedgerRepository.class),
                mock(SerialNumberRepository.class),
                mock(PartnerLedgerService.class),
                mock(ProductVariantRepository.class),
                mock(WarrantyRepository.class),
                mock(WarrantyLifecycleService.class),
                mock(PartnerRepository.class),
                mock(AssemblyOrderSerialRepository.class),
                mock(UserRepository.class),
                mock(ProductRepository.class),
                mock(AssemblyOrderRepository.class),
                mock(AssemblyBomRepository.class),
                mock(DeviceComponentSerialRepository.class),
                mock(StocktakeRepository.class),
                mock(SalesOrderRepository.class),
                mock(RepairRepository.class),
                mock(PurchaseOrderRepository.class),
                mock(SalesOrderService.class),
                mock(StockReservationRepository.class),
                mock(WarehouseRepository.class),
                mock(UnitRepository.class),
                mock(AppNotificationService.class),
                mock(DocumentDependencyService.class),
                mock(AuditLogService.class),
                mock(WarehouseAccessGuard.class),
                mock(ApplicationEventPublisher.class),
                mock(StocktakeLockGuard.class)
        );
    }

    @Test
    void postExportRejectsDocumentsThatAreNotDraftSubmittedOrUnposted() {
        InventoryDocument alreadyPosted = new InventoryDocument();
        alreadyPosted.setId(42L);
        alreadyPosted.updateStatus(DocumentStatus.POSTED.name());
        when(inventoryDocumentRepository.findExportByIdWithLines(42L)).thenReturn(Optional.of(alreadyPosted));

        InventoryPostingService service = newService();

        assertThrows(BusinessException.class, () -> service.postExport(42L));

        // The guard clause must reject the document before touching any write path.
        verify(inventoryDocumentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void postExportIsNotReadOnlySoInventoryWritesActuallyPersistAndRollBackTogether() throws NoSuchMethodException {
        Method postExport = InventoryPostingService.class.getMethod("postExport", Long.class);
        Transactional annotation = postExport.getAnnotation(Transactional.class);

        assertNotNull(annotation, "postExport must stay @Transactional");
        assertFalse(annotation.readOnly(),
                "postExport writes InventoryBalance/CostLayer/SerialNumber/Warranty/Ledger rows - " +
                        "readOnly=true silently risks dropped writes and no rollback on failure");
        assertTrue(annotation.rollbackFor().length > 0 || annotation.rollbackForClassName().length > 0,
                "postExport should roll back on failure like its sibling postImport does");
    }
}
