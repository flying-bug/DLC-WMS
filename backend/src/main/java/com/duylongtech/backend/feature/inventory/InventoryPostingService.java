package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.ScanResolveRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.ScanResolveResponse;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryCostLayer;
import com.duylongtech.backend.feature.assembly.AssemblyBom;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerial;
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
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
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
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
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

import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.assembly.AssemblyBom;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerial;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.DependencyCheckResponse;
import com.duylongtech.backend.feature.inventory.DocumentDependencyService;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayer;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.InventoryLedger;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.inventory.InventoryPostingService;
import com.duylongtech.backend.feature.inventory.ScanResolveRequest;
import com.duylongtech.backend.feature.inventory.ScanResolveResponse;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderLine;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderService;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warranty.WarrantyLifecycleService;
import com.duylongtech.backend.feature.warranty.WarrantyLine;
import com.duylongtech.backend.feature.warranty.WarrantyLineRequest;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;

@Service
@RequiredArgsConstructor
public class InventoryPostingService {

    private final CodeGeneratorService codeGeneratorService;
    private final InventoryDocumentMapper inventoryDocumentMapper;

    private static final String EXPORT_DOC_TYPE = "EX_SO";
    private static final String IMPORT_DOC_TYPE = "IN_PO";
    private static final String DEFAULT_STATUS = DocumentStatus.DRAFT.name();
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final Set<String> VALID_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), DocumentStatus.APPROVED.name(), DocumentStatus.POSTED.name(), DocumentStatus.CANCELLED.name(),
            "UNPOSTED");
    private static final Set<String> EDITABLE_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), "UNPOSTED");

    // PhÃƒÆ’Ã‚Â¢n loÃƒÂ¡Ã‚ÂºÃ‚Â¡i phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho thÃƒÂ¡Ã‚Â»Ã‚Â§ cÃƒÆ’Ã‚Â´ng (do ngÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âi dÃƒÆ’Ã‚Â¹ng tÃƒÂ¡Ã‚ÂºÃ‚Â¡o)
    public static final String ISSUE_PURPOSE_SALES = "SALES"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho bÃƒÆ’Ã‚Â¡n hÃƒÆ’Ã‚Â ng ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tÃƒÂ¡Ã‚Â»Ã‚Â± sinh bÃƒÂ¡Ã‚ÂºÃ‚Â£o hÃƒÆ’Ã‚Â nh
    public static final String ISSUE_PURPOSE_USAGE = "USAGE"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho sÃƒÂ¡Ã‚Â»Ã‚Â­ dÃƒÂ¡Ã‚Â»Ã‚Â¥ng nÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢i bÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â khÃƒÆ’Ã‚Â´ng sinh bÃƒÂ¡Ã‚ÂºÃ‚Â£o hÃƒÆ’Ã‚Â nh
    public static final String ISSUE_PURPOSE_ASSEMBLY = "ASSEMBLY"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho lÃƒÂ¡Ã‚ÂºÃ‚Â¯p rÃƒÆ’Ã‚Â¡p/thÃƒÆ’Ã‚Â¡o dÃƒÂ¡Ã‚Â»Ã‚Â¡

    // PhÃƒÆ’Ã‚Â¢n loÃƒÂ¡Ã‚ÂºÃ‚Â¡i phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t/nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho tÃƒÂ¡Ã‚Â»Ã‚Â± Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ng tÃƒÂ¡Ã‚Â»Ã‚Â« module ChuyÃƒÂ¡Ã‚Â»Ã†â€™n kho
    public static final String ISSUE_PURPOSE_TRANSFER_OUT = "TRANSFER_EXPORT"; // XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho chuyÃƒÂ¡Ã‚Â»Ã†â€™n Ãƒâ€žÃ¢â‚¬Ëœi
    public static final String ISSUE_PURPOSE_TRANSFER_IN = "TRANSFER_IMPORT"; // NhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho tÃƒÂ¡Ã‚Â»Ã‚Â« chuyÃƒÂ¡Ã‚Â»Ã†â€™n vÃƒÂ¡Ã‚Â»Ã‚Â
    public static final String ISSUE_PURPOSE_INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT"; // XÃƒÂ¡Ã‚Â»Ã‚Â­ lÃƒÆ’Ã‚Â½ chÃƒÆ’Ã‚Âªnh lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ch kiÃƒÂ¡Ã‚Â»Ã†â€™m kÃƒÆ’Ã‚Âª

    // TÃƒÂ¡Ã‚ÂºÃ‚Â­p hÃƒÂ¡Ã‚Â»Ã‚Â£p cÃƒÆ’Ã‚Â¡c mÃƒÂ¡Ã‚Â»Ã‚Â¥c Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â­ch hÃƒÂ¡Ã‚Â»Ã‚Â£p lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ khi ngÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âi dÃƒÆ’Ã‚Â¹ng tÃƒÂ¡Ã‚ÂºÃ‚Â¡o phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t thÃƒÂ¡Ã‚Â»Ã‚Â§ cÃƒÆ’Ã‚Â´ng
    private static final Set<String> VALID_MANUAL_EXPORT_PURPOSES = Set.of(ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE,
            ISSUE_PURPOSE_ASSEMBLY);

    // TÃƒÂ¡Ã‚ÂºÃ‚Â­p hÃƒÂ¡Ã‚Â»Ã‚Â£p cÃƒÆ’Ã‚Â¡c mÃƒÂ¡Ã‚Â»Ã‚Â¥c Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â­ch hÃƒÂ¡Ã‚Â»Ã‚Â£p lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ toÃƒÆ’Ã‚Â n bÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ (bÃƒÂ¡Ã‚ÂºÃ‚Â¯t cÃƒÂ¡Ã‚ÂºÃ‚Â£ nÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢i bÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ vÃƒÆ’Ã‚Â  ngÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Âi dÃƒÆ’Ã‚Â¹ng)
    private static final Set<String> VALID_ALL_EXPORT_PURPOSES = Set.of(
            ISSUE_PURPOSE_SALES, ISSUE_PURPOSE_USAGE, ISSUE_PURPOSE_ASSEMBLY, ISSUE_PURPOSE_TRANSFER_OUT,
            ISSUE_PURPOSE_INVENTORY_ADJUSTMENT);

    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryCostLayerRepository inventoryCostLayerRepository;
    private final InventoryLedgerRepository inventoryLedgerRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final PartnerLedgerService partnerLedgerService;
    private final ProductVariantRepository productVariantRepository;
    private final WarrantyRepository warrantyRepository;
    private final WarrantyLifecycleService warrantyLifecycleService;
    private final PartnerRepository partnerRepository;
    private final AssemblyOrderSerialRepository assemblyOrderSerialRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final AssemblyBomRepository assemblyBomRepository;
    private final DeviceComponentSerialRepository deviceComponentSerialRepository;
    private final StocktakeRepository stocktakeRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final RepairRepository repairRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SalesOrderService salesOrderService;
    private final com.duylongtech.backend.feature.inventory.StockReservationRepository stockReservationRepository;
    private final com.duylongtech.backend.feature.warehouse.WarehouseRepository warehouseRepository;
    private final UnitRepository unitRepository;
    private final AppNotificationService appNotificationService;
    private final DocumentDependencyService documentDependencyService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public InventoryDocumentResponse postExport(Long id) {
        InventoryDocument doc = findExportOrThrow(id);
        if (!DocumentStatus.DRAFT.name().equals(doc.getStatus()) && !DocumentStatus.SUBMITTED.name().equals(doc.getStatus())
                && !"UNPOSTED".equals(doc.getStatus())) {
            throw new BusinessException(SystemMessage.INV_ERR_046.getMessage());
        }

        List<com.duylongtech.backend.feature.warranty.WarrantyLineRequest> warrantyLines = new java.util.ArrayList<>();

        for (InventoryDocumentLine line : doc.getLines()) {
            Long effectiveWarehouseId = line.getWarehouseId() != null ? line.getWarehouseId() : doc.getWarehouseId();
            if (effectiveWarehouseId == null) {
                throw new BusinessException("DÃƒÆ’Ã‚Â²ng sÃƒÂ¡Ã‚ÂºÃ‚Â£n phÃƒÂ¡Ã‚ÂºÃ‚Â©m chÃƒâ€ Ã‚Â°a Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£c chÃƒÂ¡Ã‚Â»Ã‚Ân kho xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t");
            }
            BigDecimal qtyToExport = line.getBaseQuantity() != null && line.getBaseQuantity().compareTo(ZERO) > 0
                    ? line.getBaseQuantity()
                    : line.getQuantityOut();
            List<SerialNumber> serialsToExport = new java.util.ArrayList<>();
            ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);

            Long targetSerialId = line.getSerialNumberId();
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                List<String> serials = parseSerialNumbers(line.getSerialNumbersText());
                for (String sn : serials) {
                    serialNumberRepository.findByVariantIdAndSerialNumberForUpdate(line.getVariantId(), sn)
                            .ifPresent(serialsToExport::add);
                }
                if (!serialsToExport.isEmpty() && targetSerialId == null) {
                    line.setSerialNumberId(serialsToExport.get(0).getId());
                }
            } else if (targetSerialId != null) {
                SerialNumber snObj = serialNumberRepository.findByIdForUpdate(targetSerialId)
                        .orElseThrow(() -> new BusinessException("KhÃƒÆ’Ã‚Â´ng tÃƒÆ’Ã‚Â¬m thÃƒÂ¡Ã‚ÂºÃ‚Â¥y serial cÃƒÂ¡Ã‚ÂºÃ‚Â§n xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t"));
                serialsToExport.add(snObj);
            }

            for (SerialNumber snObj : serialsToExport) {
                if (!"AVAILABLE".equals(snObj.getStatus())) {
                    throw new BusinessException(String.format(SystemMessage.INV_ERR_045.getMessage(),
                            snObj.getSerialNumber(), snObj.getStatus()));
                }
                if (!effectiveWarehouseId.equals(snObj.getWarehouseId())) {
                    throw new BusinessException(
                            String.format(SystemMessage.INV_ERR_044.getMessage(), snObj.getSerialNumber()));
                }
                if (!line.getVariantId().equals(snObj.getVariantId())) {
                    throw new BusinessException(
                            String.format(SystemMessage.INV_ERR_043.getMessage(), snObj.getSerialNumber()));
                }
                ensureSerialNotInstalledInPc(snObj, doc);
            }

            if (variant != null && variant.getProduct() != null
                    && Boolean.TRUE.equals(variant.getProduct().getTrackSerial())) {
                int expected = line.getQuantityOut().stripTrailingZeros().intValueExact();
                if (serialsToExport.size() != expected) {
                    throw new BusinessException(
                            String.format(SystemMessage.INV_ERR_042.getMessage(), variant.getSku(), expected));
                }
            }

            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null || balance.getQuantityOnHand().compareTo(ZERO) <= 0) {
                List<InventoryBalance> balances = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId());
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null || balance.getQuantityOnHand().compareTo(qtyToExport) < 0) {
                String productDisplayName = variant != null && variant.getProduct() != null
                        ? variant.getProduct().getProductName()
                        : variant != null ? variant.getVariantName() : null;
                if (productDisplayName == null || productDisplayName.isBlank()) {
                    productDisplayName = variant != null && variant.getSku() != null
                            ? variant.getSku()
                            : String.valueOf(line.getVariantId());
                }
                throw new BusinessException(String.format(SystemMessage.INV_ERR_041.getMessage(), productDisplayName));
            }

            balance.setQuantityOnHand(balance.getQuantityOnHand().subtract(qtyToExport));
            balance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);

            List<InventoryCostLayer> layers = inventoryCostLayerRepository
                    .findAvailableLayersForUpdate(effectiveWarehouseId, line.getVariantId());
            BigDecimal remainingQty = qtyToExport;
            BigDecimal totalCost = ZERO;

            for (InventoryCostLayer layer : layers) {
                if (remainingQty.compareTo(ZERO) <= 0) {
                    break;
                }
                BigDecimal qtyFromLayer = remainingQty.min(layer.getQuantityLayered());
                layer.setQuantityLayered(layer.getQuantityLayered().subtract(qtyFromLayer));
                inventoryCostLayerRepository.save(layer);
                totalCost = totalCost.add(qtyFromLayer.multiply(layer.getUnitCost()));
                remainingQty = remainingQty.subtract(qtyFromLayer);
            }

            if (remainingQty.compareTo(ZERO) > 0 || totalCost.compareTo(ZERO) <= 0) {
                BigDecimal fallbackCost = (line.getUnitCost() != null && line.getUnitCost().compareTo(ZERO) > 0)
                        ? line.getUnitCost()
                        : ((balance != null && balance.getAverageCost() != null
                                && balance.getAverageCost().compareTo(ZERO) > 0)
                                        ? balance.getAverageCost()
                                        : (variant != null && variant.getCostPrice() != null
                                                && variant.getCostPrice().compareTo(ZERO) > 0
                                                        ? variant.getCostPrice()
                                                        : (variant != null && variant.getSalePrice() != null
                                                                ? variant.getSalePrice()
                                                                : ZERO)));
                if (totalCost.compareTo(ZERO) <= 0) {
                    totalCost = qtyToExport.multiply(fallbackCost);
                } else if (remainingQty.compareTo(ZERO) > 0) {
                    totalCost = totalCost.add(remainingQty.multiply(fallbackCost));
                }
                remainingQty = ZERO;
            }

            BigDecimal avgUnitCost = totalCost.divide(qtyToExport, 4, RoundingMode.HALF_UP);
            line.setUnitCost(avgUnitCost);
            BigDecimal currentOnHand = balance != null ? balance.getQuantityOnHand() : ZERO;
            inventoryLedgerRepository
                    .save(buildLedger(doc, line, "OUT", ZERO, qtyToExport, avgUnitCost, currentOnHand,
                            effectiveWarehouseId));

            for (SerialNumber snObj : serialsToExport) {
                updateExportedSerialBalance(doc, line, snObj, avgUnitCost, effectiveWarehouseId);
                com.duylongtech.backend.feature.warranty.WarrantyLineRequest wl = generateWarrantyLineIfNeeded(doc, line,
                        snObj);
                if (wl != null)
                    warrantyLines.add(wl);
            }
            if (serialsToExport.isEmpty()) {
                com.duylongtech.backend.feature.warranty.WarrantyLineRequest wl = generateWarrantyLineIfNeeded(doc, line,
                        null);
                if (wl != null)
                    warrantyLines.add(wl);
            }

            Long soId = doc.getSalesOrderId();
            if (soId == null && (com.duylongtech.backend.enums.ReferenceType.SALES_ORDER.name().equalsIgnoreCase(doc.getReferenceType())
                    || com.duylongtech.backend.enums.ReferenceType.SALES_ORDER.name().equalsIgnoreCase(doc.getReferenceType()))) {
                soId = doc.getReferenceId();
            }
            if (soId != null) {
                salesOrderService.fulfillReservation(soId, line.getVariantId(), effectiveWarehouseId,
                        qtyToExport, totalCost);
            }
        }

        if (!warrantyLines.isEmpty()) {
            Warranty w = new Warranty();
            w.setWarrantyCode(codeGeneratorService.generateCode("WARRANTIES", "warranty_code", "BH", 5));
            w.setPartnerId(doc.getPartnerId());
            w.setSalesOrderId(doc.getSalesOrderId());
            w.setExportSlipId(doc.getId());
            w.setStartDate(LocalDate.now());
            LocalDate maxEndDate = warrantyLines.stream()
                    .map(com.duylongtech.backend.feature.warranty.WarrantyLineRequest::getEndDate).max(LocalDate::compareTo)
                    .orElse(LocalDate.now());
            w.setEndDate(maxEndDate);
            w.setWarrantyStatus(com.duylongtech.backend.enums.EntityStatus.ACTIVE.name());
            w.setNote("TÃƒÂ¡Ã‚Â»Ã‚Â± Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ng sinh tÃƒÂ¡Ã‚Â»Ã‚Â« phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t " + doc.getDocCode());
            for (com.duylongtech.backend.feature.warranty.WarrantyLineRequest reqLine : warrantyLines) {
                com.duylongtech.backend.feature.warranty.WarrantyLine wLine = new com.duylongtech.backend.feature.warranty.WarrantyLine();
                wLine.setWarranty(w);
                wLine.setProductVariantId(reqLine.getProductVariantId());
                wLine.setSerialNumberId(reqLine.getSerialNumberId());
                wLine.setQuantity(reqLine.getQuantity());
                wLine.setStartDate(reqLine.getStartDate());
                wLine.setEndDate(reqLine.getEndDate());
                wLine.setWarrantyStatus(reqLine.getWarrantyStatus());
                w.getLines().add(wLine);
            }
            warrantyRepository.save(w);
        }

        if (doc.getSalesOrderId() != null && doc.getPartnerId() != null) {
            SalesOrder so = salesOrderRepository.findById(doc.getSalesOrderId()).orElse(null);
            if (so != null) {
                BigDecimal totalDebt = BigDecimal.ZERO;
                for (InventoryDocumentLine line : doc.getLines()) {
                    SalesOrderLine soLine = so.getLines().stream()
                            .filter(l -> l.getVariantId().equals(line.getVariantId()))
                            .findFirst().orElse(null);

                    if (soLine != null) {
                        BigDecimal qtyToExport = line.getQuantityOut();
                        BigDecimal unitPrice = soLine.getUnitPrice();
                        BigDecimal lineAmount = qtyToExport.multiply(unitPrice);
                        BigDecimal vatRate = soLine.getVatRate() != null ? soLine.getVatRate() : BigDecimal.ZERO;
                        BigDecimal vatAmount = lineAmount.multiply(vatRate).divide(BigDecimal.valueOf(100), 2,
                                RoundingMode.HALF_UP);

                        totalDebt = totalDebt.add(lineAmount).add(vatAmount);
                    }
                }

                if (totalDebt.compareTo(BigDecimal.ZERO) > 0) {
                    partnerLedgerService.recordLedger(
                            doc.getPartnerId(),
                            "INVENTORY_EXPORT_SO",
                            doc.getId(),
                            doc.getDocCode(),
                            totalDebt,
                            BigDecimal.ZERO,
                            "Ghi nhÃƒÂ¡Ã‚ÂºÃ‚Â­n cÃƒÆ’Ã‚Â´ng nÃƒÂ¡Ã‚Â»Ã‚Â£ xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho bÃƒÆ’Ã‚Â¡n hÃƒÆ’Ã‚Â ng " + doc.getDocCode());
                }
            }
        }

        doc.post(null);
        doc.setUpdatedAt(LocalDateTime.now());

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        try {
            auditLogService.logEvent(null, "POST_EXPORT", "InventoryDocument", saved.getId(), "SUCCESS",
                    "Ghi sÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho " + saved.getDocCode() + " ("
                            + (saved.getIssuePurpose() != null ? saved.getIssuePurpose() : "EX_SO") + ")",
                    null, null);
        } catch (Exception ignored) {
        }

        return toResponse(saved);
    }

    public InventoryDocumentResponse postImport(Long id) {
        InventoryDocument doc = findImportOrThrow(id);
        if (!DocumentStatus.DRAFT.name().equals(doc.getStatus()) && !DocumentStatus.SUBMITTED.name().equals(doc.getStatus())
                && !"UNPOSTED".equals(doc.getStatus())) {
            throw new BusinessException(SystemMessage.INV_ERR_040.getMessage());
        }

        InventoryDocument savedDoc = inventoryDocumentRepository.saveAndFlush(doc);
        for (InventoryDocumentLine line : savedDoc.getLines()) {
            Long effectiveWarehouseId = line.getWarehouseId() != null ? line.getWarehouseId()
                    : savedDoc.getWarehouseId();
            if (effectiveWarehouseId == null) {
                throw new BusinessException("DÃƒÆ’Ã‚Â²ng sÃƒÂ¡Ã‚ÂºÃ‚Â£n phÃƒÂ¡Ã‚ÂºÃ‚Â©m chÃƒâ€ Ã‚Â°a Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£c chÃƒÂ¡Ã‚Â»Ã‚Ân kho nhÃƒÂ¡Ã‚ÂºÃ‚Â­p");
            }
            BigDecimal qtyToImport = line.getBaseQuantity() != null && line.getBaseQuantity().compareTo(ZERO) > 0
                    ? line.getBaseQuantity()
                    : line.getQuantityIn();
            BigDecimal unitCost = nonNegativeOrZero(line.getUnitCost(), "unitCost");
            InventoryBalance balance = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId(), "GOOD")
                    .orElse(null);

            if (balance == null) {
                List<InventoryBalance> balances = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(effectiveWarehouseId, line.getVariantId());
                balance = balances.stream()
                        .filter(b -> b.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                        .findFirst()
                        .orElse(balances.isEmpty() ? null : balances.get(0));
            }

            if (balance == null) {
                balance = InventoryBalance.builder()
                        .warehouseId(effectiveWarehouseId)
                        .variantId(line.getVariantId())
                        .stockStatus("GOOD")
                        .quantityOnHand(ZERO)
                        .quantityReserved(ZERO)
                        .averageCost(ZERO)
                        .updatedAt(LocalDateTime.now())
                        .build();
            }

            BigDecimal oldQty = balance.getQuantityOnHand();
            BigDecimal oldValue = oldQty.multiply(balance.getAverageCost());
            BigDecimal importValue = qtyToImport.multiply(unitCost);
            BigDecimal newQty = oldQty.add(qtyToImport);
            BigDecimal newAverageCost = newQty.compareTo(ZERO) > 0
                    ? oldValue.add(importValue).divide(newQty, 4, RoundingMode.HALF_UP)
                    : ZERO;

            balance.setQuantityOnHand(newQty);
            balance.setAverageCost(newAverageCost);
            balance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(balance);

            inventoryCostLayerRepository.save(InventoryCostLayer.builder()
                    .warehouseId(effectiveWarehouseId)
                    .variantId(line.getVariantId())
                    .inventoryDocumentLineId(line.getId())
                    .quantityReceived(qtyToImport)
                    .quantityLayered(qtyToImport)
                    .unitCost(unitCost)
                    .createdAt(LocalDateTime.now())
                    .build());

            inventoryLedgerRepository
                    .save(buildLedger(savedDoc, line, "IN", qtyToImport, ZERO, unitCost, balance.getQuantityOnHand(),
                            effectiveWarehouseId));
            createImportedSerialsIfNeeded(savedDoc, line, unitCost, effectiveWarehouseId);
        }

        savedDoc.post(null);
        savedDoc.setUpdatedAt(LocalDateTime.now());
        InventoryDocument savedImport = inventoryDocumentRepository.save(savedDoc);
        syncStocktakeReference(savedImport);

        // Ghi nhÃƒÂ¡Ã‚ÂºÃ‚Â­n tÃƒâ€žÃ†â€™ng cÃƒÆ’Ã‚Â´ng nÃƒÂ¡Ã‚Â»Ã‚Â£ nhÃƒÆ’Ã‚Â  cung cÃƒÂ¡Ã‚ÂºÃ‚Â¥p khi nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho (luÃƒÆ’Ã‚Â´n luÃƒÆ’Ã‚Â´n ghi nhÃƒÂ¡Ã‚ÂºÃ‚Â­n nÃƒÂ¡Ã‚ÂºÃ‚Â¿u cÃƒÆ’Ã‚Â³
        // partnerId)
        if (savedImport.getPartnerId() != null) {
            BigDecimal totalImportValue = savedImport.getLines().stream()
                    .map(l -> {
                        if (l.getLineAmount() != null && l.getLineAmount().compareTo(BigDecimal.ZERO) > 0) {
                            return l.getLineAmount();
                        }
                        BigDecimal qty = l.getQuantityIn() != null ? l.getQuantityIn() : BigDecimal.ZERO;
                        BigDecimal cost = l.getUnitCost() != null ? l.getUnitCost() : BigDecimal.ZERO;
                        BigDecimal subtotal = qty.multiply(cost);
                        BigDecimal vatRate = l.getVatRate() != null ? l.getVatRate()
                                : (l.getVatPercent() != null ? l.getVatPercent() : BigDecimal.ZERO);
                        BigDecimal vatAmount = subtotal.multiply(vatRate).divide(BigDecimal.valueOf(100), 2,
                                RoundingMode.HALF_UP);
                        return subtotal.add(vatAmount);
                    })
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            partnerLedgerService.recordLedger(
                    savedImport.getPartnerId(),
                    "INVENTORY_IMPORT",
                    savedImport.getId(),
                    savedImport.getDocCode(),
                    totalImportValue,
                    BigDecimal.ZERO,
                    "Ghi nhÃƒÂ¡Ã‚ÂºÃ‚Â­n cÃƒÆ’Ã‚Â´ng nÃƒÂ¡Ã‚Â»Ã‚Â£ phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho " + savedImport.getDocCode());
        }

        if (savedImport.getPurchaseOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findByIdWithDetails(savedImport.getPurchaseOrderId())
                    .orElse(null);
            if (po != null && !DocumentStatus.POSTED.name().equals(po.getStatus()) && !DocumentStatus.CANCELLED.name().equals(po.getStatus())) {
                boolean fullyImported = !po.getLines().isEmpty() && po.getLines().stream().allMatch(l -> {
                    BigDecimal imported = inventoryDocumentLineRepository
                            .sumImportedQuantityByPurchaseOrderIdAndVariantId(po.getId(), l.getVariantId());
                    if (imported == null)
                        imported = BigDecimal.ZERO;
                    return l.getQuantity().subtract(imported).compareTo(BigDecimal.ZERO) <= 0;
                });
                if (fullyImported) {
                    po.setStatus(DocumentStatus.POSTED.name());
                    purchaseOrderRepository.save(po);
                }
            }
        }

        // TÃƒÂ¡Ã‚Â»Ã‚Â± Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ng kiÃƒÂ¡Ã‚Â»Ã†â€™m tra vÃƒÆ’Ã‚Â  chuyÃƒÂ¡Ã‚Â»Ã†â€™n BACKORDERED thÃƒÆ’Ã‚Â nh HOLDING cho cÃƒÆ’Ã‚Â¡c Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â¡n hÃƒÆ’Ã‚Â ng bÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¹
        // thiÃƒÂ¡Ã‚ÂºÃ‚Â¿u hÃƒÆ’Ã‚Â ng trÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºc Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â¢y
        savedImport.getLines().stream()
                .map(InventoryDocumentLine::getVariantId)
                .distinct()
                .forEach(variantId -> salesOrderService.reEvaluateBackorders(savedImport.getWarehouseId(), variantId));

        // KiÃƒÂ¡Ã‚Â»Ã†â€™m tra chÃƒÆ’Ã‚Âªnh lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ch giÃƒÂ¡Ã‚Â»Ã‚Â¯a sÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœ lÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£ng dÃƒÂ¡Ã‚Â»Ã‚Â± kiÃƒÂ¡Ã‚ÂºÃ‚Â¿n vÃƒÆ’Ã‚Â  thÃƒÂ¡Ã‚Â»Ã‚Â±c nhÃƒÂ¡Ã‚ÂºÃ‚Â­n
        boolean hasDiscrepancy = false;
        StringBuilder discrepancyDetails = new StringBuilder();
        for (InventoryDocumentLine line : savedImport.getLines()) {
            BigDecimal exp = line.getExpectedQuantity() != null
                    && line.getExpectedQuantity().compareTo(BigDecimal.ZERO) > 0
                            ? line.getExpectedQuantity()
                            : (line.getQuantityIn() != null ? line.getQuantityIn() : BigDecimal.ZERO);
            BigDecimal act = line.getQuantityIn() != null ? line.getQuantityIn() : BigDecimal.ZERO;
            BigDecimal rej = line.getRejectedQuantity() != null ? line.getRejectedQuantity() : BigDecimal.ZERO;

            if (act.compareTo(exp) < 0 || rej.compareTo(BigDecimal.ZERO) > 0
                    || (line.getDiscrepancyReason() != null && !line.getDiscrepancyReason().isBlank())) {
                hasDiscrepancy = true;
                ProductVariant pv = productVariantRepository.findById(line.getVariantId()).orElse(null);
                String sku = pv != null ? pv.getSku() : String.valueOf(line.getVariantId());
                BigDecimal diff = exp.subtract(act);
                discrepancyDetails.append(
                        String.format("ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ %s: DÃƒÂ¡Ã‚Â»Ã‚Â± kiÃƒÂ¡Ã‚ÂºÃ‚Â¿n %s, ThÃƒÂ¡Ã‚Â»Ã‚Â±c nhÃƒÂ¡Ã‚ÂºÃ‚Â­n %s (ThiÃƒÂ¡Ã‚ÂºÃ‚Â¿u: %s, LÃƒÂ¡Ã‚Â»Ã¢â‚¬â€i: %s). Chi tiÃƒÂ¡Ã‚ÂºÃ‚Â¿t lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ch: %s\n",
                                sku, exp.stripTrailingZeros().toPlainString(), act.stripTrailingZeros().toPlainString(),
                                diff.stripTrailingZeros().toPlainString(), rej.stripTrailingZeros().toPlainString(),
                                line.getDiscrepancyReason() != null ? line.getDiscrepancyReason() : "ChÃƒâ€ Ã‚Â°a nhÃƒÂ¡Ã‚ÂºÃ‚Â­p lÃƒÆ’Ã‚Â½ do"));
            }

        }

        if (hasDiscrepancy) {
            savedImport.setHasDiscrepancy(true);
            savedImport.setDiscrepancyNote(discrepancyDetails.toString().trim());
            inventoryDocumentRepository.save(savedImport);

            try {
                String partnerName = "";
                if (savedImport.getPartnerId() != null) {
                    partnerName = partnerRepository.findById(savedImport.getPartnerId()).map(Partner::getName)
                            .orElse("");
                }
                String notifTitle = "ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â CÃƒÂ¡Ã‚ÂºÃ‚Â£nh bÃƒÆ’Ã‚Â¡o nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho thiÃƒÂ¡Ã‚ÂºÃ‚Â¿u: " + savedImport.getDocCode();
                String notifMsg = String.format(
                        "ThÃƒÂ¡Ã‚Â»Ã‚Â§ kho Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â£ kiÃƒÂ¡Ã‚Â»Ã†â€™m nhÃƒÂ¡Ã‚ÂºÃ‚Â­n phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u %s %s nhÃƒâ€ Ã‚Â°ng phÃƒÆ’Ã‚Â¡t hiÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡n thiÃƒÂ¡Ã‚ÂºÃ‚Â¿u/hÃƒÆ’Ã‚Â ng lÃƒÂ¡Ã‚Â»Ã¢â‚¬â€i:\n%s\nVui lÃƒÆ’Ã‚Â²ng Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœi soÃƒÆ’Ã‚Â¡t lÃƒÂ¡Ã‚ÂºÃ‚Â¡i hÃƒÆ’Ã‚Â³a Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â¡n vÃƒÆ’Ã‚Â  cÃƒÆ’Ã‚Â´ng nÃƒÂ¡Ã‚Â»Ã‚Â£ vÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºi NCC.",
                        savedImport.getDocCode(), partnerName.isBlank() ? "" : "(NCC: " + partnerName + ")",
                        discrepancyDetails.toString().trim());

                appNotificationService.createNotification("ROLE_ACCOUNTANT", null, notifTitle, notifMsg,
                        "DISCREPANCY", "IMPORT_DOCUMENT", savedImport.getId(),
                        "/import-slips/" + savedImport.getId() + "/edit");
                appNotificationService.createNotification("ROLE_MANAGER", null, notifTitle, notifMsg,
                        "DISCREPANCY", "IMPORT_DOCUMENT", savedImport.getId(),
                        "/import-slips/" + savedImport.getId() + "/edit");
            } catch (Exception e) {
                // Log warning but do not fail the transaction
            }
        }

        try {
            String postDesc = "Ghi sÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho " + savedImport.getDocCode();
            if (Boolean.TRUE.equals(savedImport.getHasDiscrepancy())) {
                postDesc += " (CÃƒÆ’Ã‚Â³ chÃƒÆ’Ã‚Âªnh lÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¡ch: " + savedImport.getDiscrepancyNote() + ")";
            }
            auditLogService.logEvent(null, "POST_IMPORT", "InventoryDocument", savedImport.getId(), "SUCCESS", postDesc,
                    null, null);
        } catch (Exception ignored) {
        }

        return toResponse(savedImport);
    }

    public InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId) {
        InventoryDocument doc = findImportOrThrow(id);
        if (!DocumentStatus.POSTED.name().equalsIgnoreCase(doc.getStatus())) {
            throw new BusinessException("ChÃƒÂ¡Ã‚Â»Ã¢â‚¬Â° cÃƒÆ’Ã‚Â³ thÃƒÂ¡Ã‚Â»Ã†â€™ bÃƒÂ¡Ã‚Â»Ã‚Â ghi sÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ chÃƒÂ¡Ã‚Â»Ã‚Â©ng tÃƒÂ¡Ã‚Â»Ã‚Â« Ãƒâ€žÃ¢â‚¬Ëœang ÃƒÂ¡Ã‚Â»Ã…Â¸ trÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÆ’Ã‚Â¡i Ãƒâ€žÃ‚ÂÃƒÆ’Ã†â€™ GHI SÃƒÂ¡Ã‚Â»Ã¢â‚¬Â (POSTED).");
        }

        com.duylongtech.backend.feature.inventory.DependencyCheckResponse check = documentDependencyService
                .checkImportSlipUnpostable(id);
        if (!check.isCanUnpost()) {
            throw new BusinessException(check.getMessage() + " Chi tiÃƒÂ¡Ã‚ÂºÃ‚Â¿t: " + String.join("; ", check.getDetails()));
        }

        Long warehouseId = doc.getWarehouseId();

        // 1. HoÃƒÆ’Ã‚Â n tÃƒÆ’Ã‚Â¡c tÃƒÂ¡Ã‚Â»Ã¢â‚¬Å“n kho (giÃƒÂ¡Ã‚ÂºÃ‚Â£m sÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœ lÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£ng Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â£ nhÃƒÂ¡Ã‚ÂºÃ‚Â­p)
        for (InventoryDocumentLine line : doc.getLines()) {
            if (line.getVariantId() == null)
                continue;
            BigDecimal qtyIn = line.getBaseQuantity() != null ? line.getBaseQuantity() : line.getQuantityIn();
            if (qtyIn == null || qtyIn.compareTo(ZERO) <= 0)
                continue;

            Optional<InventoryBalance> balanceOpt = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(warehouseId, line.getVariantId(), "AVAILABLE");
            if (balanceOpt.isPresent()) {
                InventoryBalance balance = balanceOpt.get();
                balance.setQuantityOnHand(balance.getQuantityOnHand().subtract(qtyIn));
                balance.setUpdatedAt(LocalDateTime.now());
                inventoryBalanceRepository.save(balance);

                InventoryLedger ledger = buildLedger(doc, line, "UNPOST_IMPORT", ZERO, qtyIn, line.getUnitCost(),
                        balance.getQuantityOnHand(), warehouseId);
                inventoryLedgerRepository.save(ledger);
            }

            // XÃƒÆ’Ã‚Â³a Serial Numbers Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â£ sinh nÃƒÂ¡Ã‚ÂºÃ‚Â¿u cÃƒÆ’Ã‚Â³
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                String[] rawSerials = line.getSerialNumbersText().split("[,;\\s\\n]+");
                for (String sn : rawSerials) {
                    String clean = sn.trim();
                    if (!clean.isEmpty()) {
                        serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), clean)
                                .ifPresent(serialNumberRepository::delete);
                    }
                }
            }
        }

        // 2. ChuyÃƒÂ¡Ã‚Â»Ã†â€™n trÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÆ’Ã‚Â¡i PO nÃƒÂ¡Ã‚ÂºÃ‚Â¿u cÃƒÆ’Ã‚Â³
        if (doc.getPurchaseOrderId() != null) {
            purchaseOrderRepository.findById(doc.getPurchaseOrderId()).ifPresent(po -> {
                if (DocumentStatus.POSTED.name().equals(po.getStatus())) {
                    po.setStatus(DocumentStatus.APPROVED.name());
                    purchaseOrderRepository.save(po);
                }
            });
        }

        // 3. CÃƒÂ¡Ã‚ÂºÃ‚Â­p nhÃƒÂ¡Ã‚ÂºÃ‚Â­t trÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÂ¡Ã‚Â»Ã‚Â©ng tÃƒÂ¡Ã‚Â»Ã‚Â«
        doc.unpost(currentUserId, reason != null && !reason.isBlank() ? reason.trim() : "Bỏ ghi sổ phiếu nhập");
        doc.setUpdatedAt(LocalDateTime.now());

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        try {
            String username = currentUserId != null
                    ? userRepository.findById(currentUserId).map(User::getUsername).orElse(null)
                    : null;
            auditLogService.logEvent(username, "UNPOST_IMPORT", "InventoryDocument", doc.getId(), "SUCCESS",
                    "BÃƒÂ¡Ã‚Â»Ã‚Â  ghi sÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho " + doc.getDocCode() + ". LÃƒÆ’Ã‚Â½ do: " + doc.getUnpostReason(), null, null);
        } catch (Exception ignored) {
        }

        return toResponse(saved, true);
    }

    public InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId) {
        InventoryDocument doc = findExportOrThrow(id);
        if (!DocumentStatus.POSTED.name().equalsIgnoreCase(doc.getStatus())) {
            throw new BusinessException("ChÃƒÂ¡Ã‚Â»Ã¢â‚¬Â° cÃƒÆ’Ã‚Â³ thÃƒÂ¡Ã‚Â»Ã†â€™ bÃƒÂ¡Ã‚Â»Ã‚Â  ghi sÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ chÃƒÂ¡Ã‚Â»Ã‚Â©ng tÃƒÂ¡Ã‚Â»Ã‚Â« Ãƒâ€žÃ¢â‚¬Ëœang ÃƒÂ¡Ã‚Â»Ã…Â¸ trÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÆ’Ã‚Â¡i Ãƒâ€žÃ‚Â ÃƒÆ’Ã†â€™ GHI SÃƒÂ¡Ã‚Â»Ã¢â‚¬Â  (POSTED).");
        }

        com.duylongtech.backend.feature.inventory.DependencyCheckResponse check = documentDependencyService
                .checkExportSlipUnpostable(id);
        if (!check.isCanUnpost()) {
            throw new BusinessException(check.getMessage());
        }

        Long warehouseId = doc.getWarehouseId();

        // 1. HoÃƒÆ’Ã‚Â n tÃƒÆ’Ã‚Â¡c tÃƒÂ¡Ã‚Â»Ã¢â‚¬Å“n kho (cÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ng lÃƒÂ¡Ã‚ÂºÃ‚Â¡i sÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœ lÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£ng Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â£ xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t)
        for (InventoryDocumentLine line : doc.getLines()) {
            if (line.getVariantId() == null)
                continue;
            BigDecimal qtyOut = line.getBaseQuantity() != null ? line.getBaseQuantity() : line.getQuantityOut();
            if (qtyOut == null || qtyOut.compareTo(ZERO) <= 0)
                continue;

            Optional<InventoryBalance> balanceOpt = inventoryBalanceRepository
                    .findByWarehouseAndVariantForUpdate(warehouseId, line.getVariantId(), "AVAILABLE");
            if (balanceOpt.isPresent()) {
                InventoryBalance balance = balanceOpt.get();
                balance.setQuantityOnHand(balance.getQuantityOnHand().add(qtyOut));
                balance.setUpdatedAt(LocalDateTime.now());
                inventoryBalanceRepository.save(balance);

                InventoryLedger ledger = buildLedger(doc, line, "UNPOST_EXPORT", qtyOut, ZERO, line.getUnitCost(),
                        balance.getQuantityOnHand(), warehouseId);
                inventoryLedgerRepository.save(ledger);
            }

            // TrÃƒÂ¡Ã‚ÂºÃ‚Â£ lÃƒÂ¡Ã‚ÂºÃ‚Â¡i trÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÆ’Ã‚Â¡i Serial = AVAILABLE
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                String[] rawSerials = line.getSerialNumbersText().split("[,;\\s\\n]+");
                for (String sn : rawSerials) {
                    String clean = sn.trim();
                    if (!clean.isEmpty()) {
                        serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), clean)
                                .ifPresent(s -> {
                                    s.setStatus("AVAILABLE");
                                    s.setSoldAt(null);
                                    s.setSalesOrderLineId(null);
                                    serialNumberRepository.save(s);
                                });
                    }
                }
            }
        }

        // 2. ChuyÃƒÂ¡Ã‚Â»Ã†â€™n trÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÂ¡Ã‚ÂºÃ‚Â¿i SO nÃƒÂ¡Ã‚ÂºÃ‚Â¿u cÃƒÆ’Ã‚Â³
        if (doc.getSalesOrderId() != null) {
            salesOrderRepository.findById(doc.getSalesOrderId()).ifPresent(so -> {
                if (DocumentStatus.POSTED.name().equals(so.getStatus())) {
                    so.setStatus(DocumentStatus.APPROVED.name());
                    salesOrderRepository.save(so);
                }
            });
        }

        // 3. CÃƒÂ¡Ã‚ÂºÃ‚Â­p nhÃƒÂ¡Ã‚ÂºÃ‚Â­t trÃƒÂ¡Ã‚ÂºÃ‚Â¡ng thÃƒÂ¡Ã‚Â»Ã‚Â©ng tÃƒÂ¡Ã‚Â»Ã‚Â«
        doc.unpost(currentUserId, reason != null && !reason.isBlank() ? reason.trim() : "Bỏ ghi sổ phiếu xuất");
        doc.setUpdatedAt(LocalDateTime.now());

        InventoryDocument saved = inventoryDocumentRepository.save(doc);

        try {
            String username = currentUserId != null
                    ? userRepository.findById(currentUserId).map(User::getUsername).orElse(null)
                    : null;
            auditLogService.logEvent(username, "UNPOST_EXPORT", "InventoryDocument", doc.getId(), "SUCCESS",
                    "BÃƒÂ¡Ã‚Â»Ã‚Â ghi sÃƒÂ¡Ã‚Â»Ã¢â‚¬Â¢ phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho " + doc.getDocCode() + ". LÃƒÆ’Ã‚Â½ do: " + doc.getUnpostReason(), null, null);
        } catch (Exception ignored) {
        }

        return toResponse(saved, true);
    }

    public void syncStocktakeReference(InventoryDocument doc) {
        if ("STOCKTAKE".equals(doc.getReferenceType()) && doc.getReferenceId() != null) {
            stocktakeRepository.findById(doc.getReferenceId()).ifPresent(stocktake -> {
                if (IMPORT_DOC_TYPE.equals(doc.getDocType())) {
                    stocktake.setReferenceImportId(doc.getId());
                } else if (EXPORT_DOC_TYPE.equals(doc.getDocType())) {
                    stocktake.setReferenceExportId(doc.getId());
                }

                if (DocumentStatus.POSTED.name().equals(doc.getStatus())) {
                    boolean hasSurplus = stocktake.getLines().stream()
                            .anyMatch(l -> l.getDiffQty() != null && l.getDiffQty().compareTo(BigDecimal.ZERO) > 0);
                    boolean hasShortage = stocktake.getLines().stream()
                            .anyMatch(l -> l.getDiffQty() != null && l.getDiffQty().compareTo(BigDecimal.ZERO) < 0);

                    boolean importDone = !hasSurplus || stocktake.getReferenceImportId() != null;
                    boolean exportDone = !hasShortage || stocktake.getReferenceExportId() != null;

                    if (importDone && exportDone) {
                        stocktake.setStatus(DocumentStatus.POSTED.name());
                    }
                }
                stocktakeRepository.save(stocktake);
            });
        }
    }

    public InventoryLedger buildLedger(InventoryDocument doc, InventoryDocumentLine line, String movementType,
            BigDecimal quantityIn, BigDecimal quantityOut, BigDecimal unitCost, BigDecimal balanceAfter,
            Long warehouseId) {
        return InventoryLedger.builder()
                .inventoryDocumentId(doc.getId())
                .inventoryDocumentLineId(line.getId())
                .warehouseId(warehouseId != null ? warehouseId : doc.getWarehouseId())
                .variantId(line.getVariantId())
                .serialNumberId(line.getSerialNumberId())
                .movementType(movementType)
                .quantityIn(quantityIn)
                .quantityOut(quantityOut)
                .unitCost(unitCost)
                .balanceAfter(balanceAfter)
                .movementAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
    }

    public void ensureSerialNotInstalledInPc(SerialNumber serial) {
        if (serial == null || serial.getVariantId() == null || trimToNull(serial.getSerialNumber()) == null) {
            return;
        }
        boolean installedInPc = deviceComponentSerialRepository.existsActiveComponentSerial(
                serial.getVariantId(), serial.getSerialNumber().trim());
        if (installedInPc) {
            throw new BusinessException(
                    String.format(SystemMessage.INV_ERR_036.getMessage(), serial.getSerialNumber()));
        }
    }

    public void ensureSerialNotInstalledInPc(SerialNumber serial, InventoryDocument doc) {
        if (isAssemblyDocument(doc)) {
            return;
        }
        ensureSerialNotInstalledInPc(serial);
    }

    public void updateExportedSerialBalance(InventoryDocument doc, InventoryDocumentLine line, SerialNumber serial,
            BigDecimal unitCost, Long warehouseId) {
        Long effectiveWh = warehouseId != null ? warehouseId : doc.getWarehouseId();
        InventoryBalance serialBalance = inventoryBalanceRepository
                .findByWarehouseVariantSerialForUpdate(effectiveWh, line.getVariantId(), serial.getId(),
                        "GOOD")
                .orElse(null);
        if (serialBalance != null) {
            if (serialBalance.getQuantityOnHand().compareTo(BigDecimal.ONE) < 0) {
                throw new BusinessException(
                        String.format(SystemMessage.INV_ERR_027.getMessage(), serial.getSerialNumber()));
            }
            serialBalance.setQuantityOnHand(ZERO);
            serialBalance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(serialBalance);
        }

        if (ISSUE_PURPOSE_TRANSFER_OUT.equals(doc.getIssuePurpose())) {
            serial.setStatus("IN_TRANSIT");
        } else {
            serial.setStatus(com.duylongtech.backend.enums.SerialStatus.SOLD.name());
            serial.setSoldAt(LocalDateTime.now());
        }
        serial.setUpdatedAt(LocalDateTime.now());
        serialNumberRepository.save(serial);
    }

    private com.duylongtech.backend.feature.warranty.WarrantyLineRequest generateWarrantyLineIfNeeded(InventoryDocument doc,
            InventoryDocumentLine line, SerialNumber serial) {
        // ChÃƒÂ¡Ã‚Â»Ã¢â‚¬Â° tÃƒÂ¡Ã‚Â»Ã‚Â± Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢ng sinh phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u bÃƒÂ¡Ã‚ÂºÃ‚Â£o hÃƒÆ’Ã‚Â nh khi mÃƒÂ¡Ã‚Â»Ã‚Â¥c Ãƒâ€žÃ¢â‚¬ËœÃƒÆ’Ã‚Â­ch lÃƒÆ’Ã‚Â  SALES (XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho bÃƒÆ’Ã‚Â¡n hÃƒÆ’Ã‚Â ng)
        // USAGE (XuÃƒÂ¡Ã‚ÂºÃ‚Â¥t sÃƒÂ¡Ã‚Â»Ã‚Â­ dÃƒÂ¡Ã‚Â»Ã‚Â¥ng nÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢i bÃƒÂ¡Ã‚Â»Ã¢â€žÂ¢) vÃƒÆ’Ã‚Â  TRANSFER_EXPORT (ChuyÃƒÂ¡Ã‚Â»Ã†â€™n kho) Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã‚Âu KHÃƒÆ’Ã¢â‚¬ÂNG sinh
        // bÃƒÂ¡Ã‚ÂºÃ‚Â£o hÃƒÆ’Ã‚Â nh
        if (doc.getIssuePurpose() == null || !ISSUE_PURPOSE_SALES.equalsIgnoreCase(doc.getIssuePurpose().trim())) {
            return null;
        }

        Integer warrantyMonths = line.getWarrantyMonths();
        if (warrantyMonths == null || warrantyMonths <= 0) {
            ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
            if (variant != null) {
                warrantyMonths = variant.getWarrantyMonths();
                if ((warrantyMonths == null || warrantyMonths <= 0) && variant.getProduct() != null) {
                    warrantyMonths = variant.getProduct().getWarrantyPeriodMonths();
                }
            }
        }

        if (warrantyMonths == null || warrantyMonths <= 0) {
            return null;
        }

        if (doc.getPartnerId() == null) {
            return null;
        }

        LocalDate startDate = doc.getDocDate() != null ? doc.getDocDate() : LocalDate.now();
        LocalDate endDate = startDate.plusMonths(warrantyMonths);

        com.duylongtech.backend.feature.warranty.WarrantyLineRequest wLine = new com.duylongtech.backend.feature.warranty.WarrantyLineRequest();
        wLine.setSerialNumberId(serial != null ? serial.getId() : null);
        wLine.setProductVariantId(line.getVariantId());
        wLine.setQuantity(serial != null ? BigDecimal.ONE : line.getQuantityOut());
        wLine.setStartDate(startDate);
        wLine.setEndDate(endDate);
        wLine.setWarrantyStatus(DocumentStatus.APPROVED.name());
        return wLine;
    }

    public void createImportedSerialsIfNeeded(InventoryDocument doc, InventoryDocumentLine line, BigDecimal unitCost,
            Long warehouseId) {
        ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
        Product product = variant != null ? variant.getProduct() : null;
        if (product == null || !Boolean.TRUE.equals(product.getTrackSerial())) {
            return;
        }

        Long effectiveWh = warehouseId != null ? warehouseId : doc.getWarehouseId();

        List<String> serialValues = parseSerialNumbers(line.getSerialNumbersText());
        int expectedQuantity = requireWholeNumber(line.getQuantityIn(), "So luong nhap serial");
        if (serialValues.size() != expectedQuantity) {
            throw new BusinessException(String.format(SystemMessage.INV_ERR_026.getMessage(), expectedQuantity));
        }

        for (String serialValue : serialValues) {
            if (serialNumberRepository.findBySerialNumber(serialValue).stream()
                    .anyMatch(existing -> !existing.getVariantId().equals(line.getVariantId()))) {
                throw new BusinessException(String.format(SystemMessage.INV_ERR_025.getMessage(), serialValue));
            }
            Optional<SerialNumber> existingOpt = serialNumberRepository
                    .findByVariantIdAndSerialNumber(line.getVariantId(), serialValue);
            if (existingOpt.isPresent()) {
                if ("SCRAP".equals(doc.getIssuePurpose())) {
                    SerialNumber serial = existingOpt.get();
                    serial.setStatus("SCRAP");
                    serial.setWarehouseId(effectiveWh);
                    serial.setUpdatedAt(LocalDateTime.now());
                    SerialNumber savedSerial = serialNumberRepository.save(serial);
                    inventoryBalanceRepository.save(InventoryBalance.builder()
                            .warehouseId(effectiveWh)
                            .variantId(line.getVariantId())
                            .serialNumberId(savedSerial.getId())
                            .stockStatus("GOOD")
                            .quantityOnHand(BigDecimal.ONE)
                            .quantityReserved(ZERO)
                            .averageCost(unitCost)
                            .updatedAt(LocalDateTime.now())
                            .build());
                    continue;
                } else if (ISSUE_PURPOSE_TRANSFER_IN.equals(doc.getIssuePurpose())) {
                    SerialNumber serial = existingOpt.get();
                    if (!"IN_TRANSIT".equals(serial.getStatus())) {
                        throw new BusinessException(String.format(SystemMessage.INV_ERR_024.getMessage(), serialValue));
                    }
                    serial.setStatus("AVAILABLE");
                    serial.setWarehouseId(effectiveWh);
                    serial.setUpdatedAt(LocalDateTime.now());
                    SerialNumber savedSerial = serialNumberRepository.save(serial);
                    inventoryBalanceRepository.save(InventoryBalance.builder()
                            .warehouseId(effectiveWh)
                            .variantId(line.getVariantId())
                            .serialNumberId(savedSerial.getId())
                            .stockStatus("GOOD")
                            .quantityOnHand(BigDecimal.ONE)
                            .quantityReserved(ZERO)
                            .averageCost(unitCost)
                            .updatedAt(LocalDateTime.now())
                            .build());
                    continue;
                } else {
                    throw new BusinessException(String.format(SystemMessage.INV_ERR_023.getMessage(), serialValue));
                }
            }
            SerialNumber serial = SerialNumber.builder()
                    .variantId(line.getVariantId())
                    .warehouseId(effectiveWh)
                    .serialNumber(serialValue)
                    .status("AVAILABLE")
                    .importedAt(LocalDateTime.now())
                    .build();
            SerialNumber savedSerial = serialNumberRepository.save(serial);
            inventoryBalanceRepository.save(InventoryBalance.builder()
                    .warehouseId(effectiveWh)
                    .variantId(line.getVariantId())
                    .serialNumberId(savedSerial.getId())
                    .stockStatus("GOOD")
                    .quantityOnHand(BigDecimal.ONE)
                    .quantityReserved(ZERO)
                    .averageCost(unitCost)
                    .updatedAt(LocalDateTime.now())
                    .build());
        }
    }

    public int requireWholeNumber(BigDecimal value, String fieldName) {
        try {
            return value.stripTrailingZeros().intValueExact();
        } catch (ArithmeticException ex) {
            throw new BusinessException(fieldName + " phÃƒÂ¡Ã‚ÂºÃ‚Â£i lÃƒÆ’Ã‚Â  sÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœ nguyÃƒÆ’Ã‚Âªn");
        }
    }

    public InventoryDocument findExportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.INV_ERR_022.getMessage());
        }
        return inventoryDocumentRepository.findExportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("KhÃƒÆ’Ã‚Â´ng tÃƒÆ’Ã‚Â¬m thÃƒÂ¡Ã‚ÂºÃ‚Â¥y phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u xuÃƒÂ¡Ã‚ÂºÃ‚Â¥t kho"));
    }

    public InventoryDocument findImportOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.INV_ERR_021.getMessage());
        }
        return inventoryDocumentRepository.findImportByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("KhÃƒÆ’Ã‚Â´ng tÃƒÆ’Ã‚Â¬m thÃƒÂ¡Ã‚ÂºÃ‚Â¥y phiÃƒÂ¡Ã‚ÂºÃ‚Â¿u nhÃƒÂ¡Ã‚ÂºÃ‚Â­p kho"));
    }

    public BigDecimal nonNegativeOrZero(BigDecimal value, String fieldName) {
        if (value == null) {
            return ZERO;
        }
        if (value.compareTo(ZERO) < 0) {
            throw new BusinessException(fieldName + " phÃƒÂ¡Ã‚ÂºÃ‚Â£i lÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºn hÃƒâ€ Ã‚Â¡n hoÃƒÂ¡Ã‚ÂºÃ‚Â·c bÃƒÂ¡Ã‚ÂºÃ‚Â±ng 0");
        }
        return value;
    }

    public List<String> parseSerialNumbers(String serialNumbersText) {
        String normalized = trimToNull(serialNumbersText);
        if (normalized == null) {
            return List.of();
        }
        return List.of(normalized.split("\\R"))
                .stream()
                .map(this::trimToNull)
                .filter(value -> value != null)
                .distinct()
                .toList();
    }

    public InventoryDocumentResponse toResponse(InventoryDocument doc) {
        return toResponse(doc, false);
    }

    public InventoryDocumentResponse toResponse(InventoryDocument doc, boolean includeLines) {
        InventoryDocumentResponse r = inventoryDocumentMapper.toResponse(doc);
        if (doc.getCreatedBy() != null) {
            userRepository.findById(doc.getCreatedBy()).ifPresent(u -> r.setCreatedByName(u.getFullName()));
        }
        if (doc.getApprovedBy() != null) {
            userRepository.findById(doc.getApprovedBy()).ifPresent(u -> r.setApprovedByName(u.getFullName()));
        }
        if (doc.getUnpostedBy() != null) {
            userRepository.findById(doc.getUnpostedBy()).ifPresent(u -> r.setUnpostedByName(u.getFullName()));
        }

        if (doc.getPartnerId() != null) {

            Partner partner = partnerRepository.findById(doc.getPartnerId()).orElse(null);
            if (partner != null) {
                r.setPartnerCode(partner.getCode());
                r.setPartnerName(partner.getName());
            }
        }

        if (doc.getSalespersonId() != null) {
            User salesperson = userRepository.findById(doc.getSalespersonId()).orElse(null);
            if (salesperson != null) {
                r.setSalespersonName(salesperson.getFullName());
            }
        }

        if (doc.getReferenceType() != null && doc.getReferenceId() != null) {
            String refType = doc.getReferenceType().trim().toUpperCase();
            if ("ASSEMBLY_ORDER".equals(refType)) {
                assemblyOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(order -> r.setReferenceCode(order.getOrderCode()));
            } else if ("BOM".equals(refType)) {
                assemblyBomRepository.findById(doc.getReferenceId())
                        .ifPresent(bom -> r.setReferenceCode(bom.getBomCode()));
            } else if ("SALES_ORDER".equals(refType) || "SO".equals(refType)) {
                salesOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(so -> r.setReferenceCode(so.getSoCode()));
            } else if ("REPAIR".equals(refType)) {
                repairRepository.findById(doc.getReferenceId())
                        .ifPresent(repair -> r.setReferenceCode(repair.getRepairCode()));
            } else if ("STOCKTAKE".equals(refType) || "STOCK_TAKE".equals(refType)
                    || "STOCKTAKE_ADJUSTMENT".equals(refType)) {
                stocktakeRepository.findById(doc.getReferenceId())
                        .ifPresent(st -> r.setReferenceCode(st.getStocktakeCode()));
            } else if ("PURCHASE_ORDER".equals(refType) || "PO".equals(refType)) {
                purchaseOrderRepository.findById(doc.getReferenceId())
                        .ifPresent(po -> r.setReferenceCode(po.getPoCode()));
            }
        }

        if (r.getReferenceCode() == null && doc.getSalesOrderId() != null) {
            salesOrderRepository.findById(doc.getSalesOrderId())
                    .ifPresent(so -> {
                        r.setReferenceCode(so.getSoCode());
                        if (r.getReferenceType() == null) {
                            r.setReferenceType("SALES_ORDER");
                        }
                        if (r.getReferenceId() == null) {
                            r.setReferenceId(so.getId());
                        }
                    });
        }

        if (r.getReferenceCode() == null && doc.getPurchaseOrderId() != null) {
            purchaseOrderRepository.findById(doc.getPurchaseOrderId())
                    .ifPresent(po -> {
                        r.setReferenceCode(po.getPoCode());
                        if (r.getReferenceType() == null) {
                            r.setReferenceType("PURCHASE_ORDER");
                        }
                        if (r.getReferenceId() == null) {
                            r.setReferenceId(po.getId());
                        }
                    });
        }

        if (doc.getLines() != null) {
            List<InventoryDocumentLineResponse> lines = doc.getLines().stream().map(l -> {
                InventoryDocumentLineResponse lr = inventoryDocumentMapper.toLineResponse(l);
                if (l.getVariantId() != null) {
                    productVariantRepository.findById(l.getVariantId()).ifPresent(v -> {
                        lr.setSku(v.getSku());
                        lr.setVariantName(v.getVariantName());
                        lr.setBarcode(v.getBarcode());
                        if (v.getProduct() != null) {
                            lr.setProductName(v.getProduct().getProductName());
                            lr.setTrackSerial(Boolean.TRUE.equals(v.getProduct().getTrackSerial()));
                        } else {
                            lr.setProductName(v.getVariantName());
                        }
                    });
                }
                lr.setSerialNumbers(parseSerialNumbers(l.getSerialNumbersText()));
                lr.setExpectedQuantity(l.getExpectedQuantity() != null ? l.getExpectedQuantity() : l.getQuantityIn());
                lr.setRejectedQuantity(l.getRejectedQuantity() != null ? l.getRejectedQuantity() : ZERO);
                lr.setConversionRatio(l.getConversionRatio() != null ? l.getConversionRatio() : BigDecimal.ONE);
                lr.setBaseQuantity(l.getBaseQuantity() != null ? l.getBaseQuantity()
                        : (l.getQuantityIn() != null && l.getQuantityIn().compareTo(ZERO) > 0 ? l.getQuantityIn()
                                : l.getQuantityOut()));
                if (l.getUnitId() != null) {
                    unitRepository.findById(l.getUnitId()).ifPresent(u -> lr.setUnitName(u.getName()));
                }
                if (l.getBaseUnitId() != null) {
                    unitRepository.findById(l.getBaseUnitId()).ifPresent(u -> lr.setBaseUnitName(u.getName()));
                }
                if (l.getWarehouseId() != null) {
                    warehouseRepository.findById(l.getWarehouseId()).ifPresent(wh -> {
                        lr.setWarehouseName(wh.getName());
                        lr.setWarehouseCode(wh.getCode());
                    });
                }
                if (l.getTargetWarehouseId() != null) {
                    warehouseRepository.findById(l.getTargetWarehouseId()).ifPresent(wh -> {
                        lr.setTargetWarehouseName(wh.getName());
                    });
                }
                return lr;
            }).collect(Collectors.toList());
            r.setLines(lines);
        }
        return r;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
    
    public boolean isAssemblyDocument(com.duylongtech.backend.feature.inventory.InventoryDocument doc) {
        if (doc == null) {
            return false;
        }
        return "ASSEMBLY".equals(doc.getIssuePurpose())
                || com.duylongtech.backend.enums.ReferenceType.ASSEMBLY_ORDER.name().equalsIgnoreCase(trimToNull(doc.getReferenceType()));
    }
}