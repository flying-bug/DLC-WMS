package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.ScanResolveRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.ScanResolveResponse;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryCostLayer;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryLedger;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderLine;
import java.util.Map;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Optional;
import java.util.stream.Collectors;

public interface InventoryDocumentService {
    public static final String ISSUE_PURPOSE_SALES = "SALES";
    public static final String ISSUE_PURPOSE_USAGE = "USAGE";
    public static final String ISSUE_PURPOSE_ASSEMBLY = "ASSEMBLY";
    public static final String ISSUE_PURPOSE_TRANSFER_OUT = "TRANSFER_EXPORT";
    public static final String ISSUE_PURPOSE_TRANSFER_IN = "TRANSFER_IMPORT";
    public static final String ISSUE_PURPOSE_INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT";
    ScanResolveResponse resolveExportScan(ScanResolveRequest req);
    List<InventoryDocumentResponse> getExportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId);
    List<InventoryDocumentResponse> getExportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId,
            Long partnerId, Long salespersonId);
    InventoryDocumentResponse getExportDetail(Long id);
    List<InventoryDocumentResponse> getImportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId);
    List<InventoryDocumentResponse> getImportHistory(String keyword, LocalDate fromDate, LocalDate toDate,
            String status, Long warehouseId, String issuePurpose, String referenceType, Long referenceId,
            Long partnerId, Long salespersonId);
    InventoryDocumentResponse getImportDetail(Long id);
    InventoryDocumentResponse createExport(InventoryDocumentRequest req);
    InventoryDocumentResponse createImport(InventoryDocumentRequest req);
    InventoryDocumentResponse updateExport(Long id, InventoryDocumentRequest req);
    InventoryDocumentResponse updateImport(Long id, InventoryDocumentRequest req);
    InventoryDocumentResponse postExport(Long id);
    InventoryDocumentResponse postImport(Long id);
    ScanResolveResponse resolveGenericScan(ScanResolveRequest req);
    String generateNextExportCode();
    String generateNextImportCode();
    InventoryDocumentResponse createExportFromSalesOrder(Long soId, Long actorUserId);
    com.duylongtech.backend.feature.inventory.DependencyCheckResponse checkImportUnpostable(Long id);
    com.duylongtech.backend.feature.inventory.DependencyCheckResponse checkExportUnpostable(Long id);
    InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId);
    InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId);

    @Transactional(readOnly = true)
    List<InventoryDocumentResponse> getAssemblyDocuments(Long orderId);
}
