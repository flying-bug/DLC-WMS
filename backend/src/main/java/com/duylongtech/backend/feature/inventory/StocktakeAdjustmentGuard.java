package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.StocktakeStatus;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Phiếu điều chỉnh kiểm kê: mỗi lần kiểm kê chỉ có MỘT phiếu nhập điều chỉnh (hàng thừa) và MỘT phiếu xuất điều chỉnh
 * (hàng thiếu) còn hiệu lực. Trước đây nút "Lập phiếu" và API đều không kiểm tra, nên lập / ghi sổ được nhiều phiếu cho
 * cùng một lần kiểm kê (kể cả khi kiểm kê đã vào sổ, qua hộp "Tham chiếu") -> tồn kho bị điều chỉnh nhiều lần.
 *
 * <p>Lớp thường (không phải bean): các service dựng từ repository sẵn có, không đổi constructor của service.
 */
public final class StocktakeAdjustmentGuard {

    /** Các cách ghi loại chứng từ tham chiếu "kiểm kê" (khớp InventoryDocumentService.STOCKTAKE_REFERENCE_TYPES). */
    public static final Set<String> REFERENCE_TYPES = Set.of("STOCKTAKE", "STOCK_TAKE", "STOCKTAKE_ADJUSTMENT");
    public static final String IMPORT_DOC_TYPE = "IN_PO";
    public static final String EXPORT_DOC_TYPE = "EX_SO";

    private static final Set<String> VOID_DOCUMENT_STATUSES = Set.of("CANCELLED", "CANCELED");
    /** Kiểm kê ở các trạng thái này không còn nhận phiếu điều chỉnh (chưa được duyệt, bị từ chối, đã hủy). */
    private static final Set<String> CLOSED_STOCKTAKE_STATUSES = Set.of(
            StocktakeStatus.PENDING_APPROVAL.name(), StocktakeStatus.REJECTED.name(), StocktakeStatus.CANCELLED.name());

    private static final Map<String, String> STOCKTAKE_STATUS_LABELS = Map.of(
            "DRAFT", "Nháp",
            "PENDING_APPROVAL", "Chờ duyệt",
            "REJECTED", "Bị từ chối",
            "COUNTING", "Đang kiểm kê",
            "COMPLETED", "Đã hoàn thành",
            "POSTED", "Đã vào sổ",
            "CANCELLED", "Đã hủy");

    private static final Map<String, String> DOCUMENT_STATUS_LABELS = Map.of(
            "DRAFT", "nháp",
            "POSTED", "đã ghi sổ",
            "UNPOSTED", "đã bỏ ghi sổ");

    private final InventoryDocumentRepository documentRepository;
    private final StocktakeRepository stocktakeRepository;

    public StocktakeAdjustmentGuard(InventoryDocumentRepository documentRepository, StocktakeRepository stocktakeRepository) {
        this.documentRepository = documentRepository;
        this.stocktakeRepository = stocktakeRepository;
    }

    public static boolean isStocktakeReference(String referenceType) {
        return referenceType != null && REFERENCE_TYPES.contains(referenceType.trim().toUpperCase(Locale.ROOT));
    }

    private List<InventoryDocument> adjustments(Long stocktakeId, String docType) {
        return documentRepository.findByReferenceTypeInAndReferenceIdAndDocTypeOrderByIdDesc(REFERENCE_TYPES, stocktakeId, docType);
    }

    /** Phiếu điều chỉnh còn hiệu lực (chưa hủy), mới nhất, của lần kiểm kê theo loại phiếu; bỏ qua phiếu excludeDocId. */
    public Optional<InventoryDocument> activeAdjustment(Long stocktakeId, String docType, Long excludeDocId) {
        if (stocktakeId == null) {
            return Optional.empty();
        }
        return adjustments(stocktakeId, docType).stream()
                .filter(doc -> excludeDocId == null || !excludeDocId.equals(doc.getId()))
                .filter(doc -> doc.getStatus() == null || !VOID_DOCUMENT_STATUSES.contains(doc.getStatus()))
                .findFirst();
    }

    /** Lần kiểm kê đã có phiếu điều chỉnh loại này được ghi sổ chưa. */
    public boolean hasPostedAdjustment(Long stocktakeId, String docType) {
        return stocktakeId != null && adjustments(stocktakeId, docType).stream()
                .anyMatch(doc -> DocumentStatus.POSTED.name().equals(doc.getStatus()));
    }

    /**
     * Lập phiếu điều chỉnh (hoặc đổi tham chiếu của phiếu sang một lần kiểm kê): kiểm kê phải còn đang kiểm và chưa có
     * phiếu cùng loại còn hiệu lực. Phiếu cũ đã hủy thì được lập phiếu mới.
     */
    public void assertCanCreate(String referenceType, Long stocktakeId, String docType, Long excludeDocId) {
        if (!isStocktakeReference(referenceType) || stocktakeId == null) {
            return;
        }
        Stocktake stocktake = stocktakeRepository.findById(stocktakeId)
                .orElseThrow(() -> new BusinessException(SystemMessage.STK_ERR_009.getMessage()));
        if (!stocktake.isEditable()) {
            throw closedStocktake(stocktake);
        }
        activeAdjustment(stocktakeId, docType, excludeDocId).ifPresent(existing -> {
            throw new BusinessException(String.format(SystemMessage.STK_ERR_011.getMessage(), stocktake.getStocktakeCode(),
                    documentLabel(docType), existing.getDocCode(), documentStatusLabel(existing.getStatus())));
        });
    }

    /**
     * Ghi sổ phiếu điều chỉnh: không ghi sổ khi kiểm kê chưa duyệt / bị từ chối / đã hủy, khi đã có phiếu cùng loại khác
     * được ghi sổ, hoặc khi kiểm kê đã vào sổ mà phiếu này không phải phiếu điều chỉnh của nó (vd phiếu trùng lập từ trước).
     */
    public void assertCanPost(InventoryDocument doc) {
        if (doc == null || !isStocktakeReference(doc.getReferenceType()) || doc.getReferenceId() == null) {
            return;
        }
        Stocktake stocktake = stocktakeRepository.findById(doc.getReferenceId())
                .orElseThrow(() -> new BusinessException(SystemMessage.STK_ERR_009.getMessage()));
        if (CLOSED_STOCKTAKE_STATUSES.contains(stocktake.getStatus())) {
            throw closedStocktake(stocktake);
        }
        String docType = doc.getDocType();
        Long linkedId = IMPORT_DOC_TYPE.equals(docType) ? stocktake.getReferenceImportId() : stocktake.getReferenceExportId();
        if (StocktakeStatus.POSTED.name().equals(stocktake.getStatus()) && !doc.getId().equals(linkedId)) {
            throw closedStocktake(stocktake);
        }
        adjustments(stocktake.getId(), docType).stream()
                .filter(other -> !other.getId().equals(doc.getId()))
                .filter(other -> DocumentStatus.POSTED.name().equals(other.getStatus()))
                .findFirst()
                .ifPresent(posted -> {
                    throw new BusinessException(String.format(SystemMessage.STK_ERR_012.getMessage(),
                            stocktake.getStocktakeCode(), documentLabel(docType), posted.getDocCode()));
                });
    }

    private static BusinessException closedStocktake(Stocktake stocktake) {
        String status = stocktake.getStatus();
        return new BusinessException(String.format(SystemMessage.STK_ERR_010.getMessage(), stocktake.getStocktakeCode(),
                STOCKTAKE_STATUS_LABELS.getOrDefault(status, status)));
    }

    private static String documentLabel(String docType) {
        return IMPORT_DOC_TYPE.equals(docType) ? "phiếu nhập điều chỉnh" : "phiếu xuất điều chỉnh";
    }

    private static String documentStatusLabel(String status) {
        return status == null ? "nháp" : DOCUMENT_STATUS_LABELS.getOrDefault(status, status);
    }
}
