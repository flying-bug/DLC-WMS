package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.ScanResolveRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.ScanResolveResponse;
import com.duylongtech.backend.entity.InventoryBalance;
import com.duylongtech.backend.entity.InventoryCostLayer;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.InventoryDocumentLine;
import com.duylongtech.backend.entity.InventoryLedger;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.InventoryCostLayerRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.InventoryLedgerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.entity.SalesOrderLine;
import com.duylongtech.backend.entity.PurchaseOrder;
import com.duylongtech.backend.entity.PurchaseOrderLine;
import java.util.Map;
import com.duylongtech.backend.repository.UnitRepository;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.DeviceComponentSerialRepository;
import com.duylongtech.backend.repository.StocktakeRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.PurchaseOrderRepository;
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
    com.duylongtech.backend.dto.response.DependencyCheckResponse checkImportUnpostable(Long id);
    com.duylongtech.backend.dto.response.DependencyCheckResponse checkExportUnpostable(Long id);
    InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId);
    InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId);
}
