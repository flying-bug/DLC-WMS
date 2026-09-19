package com.duylongtech.backend.feature.purchase_order;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Tiến độ nhập hàng của 1 PO, tính từ các dòng PO và tổng số lượng trên các phiếu nhập liên kết (mọi kho).
 *
 * <p>Hai khái niệm tách biệt:
 * <ul>
 *   <li><b>posted</b>: đã ghi sổ - dùng để xét PO đã nhận đủ / hoàn thành.</li>
 *   <li><b>allocated</b>: đã nằm trong phiếu chưa hủy (kể cả nháp) - dùng để gợi ý/giới hạn số lượng khi tạo phiếu,
 *       tránh phân bổ trùng cùng một phần hàng cho 2 phiếu.</li>
 * </ul>
 *
 * <p>PO nhập đa kho (các dòng chỉ định từ 2 kho trở lên) được theo dõi theo (sản phẩm, kho) để cùng một sản phẩm
 * ở 2 kho không "trừ nhầm" của nhau; PO 1 kho theo dõi theo sản phẩm như trước.
 */
public final class PurchaseOrderReceiving {

    private static final String STATUS_POSTED = "POSTED";

    private record Key(Long variantId, Long warehouseId) {
    }

    public static final class Group {
        private final Long variantId;
        private final Long warehouseId;
        private BigDecimal ordered = BigDecimal.ZERO;
        private BigDecimal posted = BigDecimal.ZERO;
        private BigDecimal allocated = BigDecimal.ZERO;

        private Group(Long variantId, Long warehouseId) {
            this.variantId = variantId;
            this.warehouseId = warehouseId;
        }

        public Long getVariantId() {
            return variantId;
        }

        public Long getWarehouseId() {
            return warehouseId;
        }

        public BigDecimal getOrdered() {
            return ordered;
        }

        public BigDecimal getPosted() {
            return posted;
        }

        public BigDecimal getAllocated() {
            return allocated;
        }

        /** Còn được phép đưa vào phiếu mới (không tính phần đã nằm trong phiếu nháp/đã ghi sổ). */
        public BigDecimal remainingToAllocate() {
            return ordered.subtract(allocated).max(BigDecimal.ZERO);
        }
    }

    private final Map<Key, Group> groups = new LinkedHashMap<>();
    private final boolean multiWarehouse;

    private PurchaseOrderReceiving(boolean multiWarehouse) {
        this.multiWarehouse = multiWarehouse;
    }

    /**
     * @param receivedRows mỗi phần tử là [variantId, warehouseId, docStatus, tổng quantityIn] của các phiếu chưa hủy
     */
    public static PurchaseOrderReceiving of(Collection<PurchaseOrderLine> lines, List<Object[]> receivedRows) {
        long distinctWarehouses = lines.stream()
                .map(PurchaseOrderLine::getWarehouseId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        PurchaseOrderReceiving receiving = new PurchaseOrderReceiving(distinctWarehouses > 1);

        for (PurchaseOrderLine line : lines) {
            Key key = receiving.keyOf(line);
            Group group = receiving.groups.computeIfAbsent(key, k -> new Group(k.variantId(), k.warehouseId()));
            group.ordered = group.ordered.add(line.getQuantity());
        }

        for (Object[] row : receivedRows) {
            Group group = receiving.forVariant((Long) row[0], (Long) row[1]);
            if (group == null) {
                continue;
            }
            BigDecimal quantity = (BigDecimal) row[3];
            group.allocated = group.allocated.add(quantity);
            if (STATUS_POSTED.equals(row[2])) {
                group.posted = group.posted.add(quantity);
            }
        }
        return receiving;
    }

    public boolean isMultiWarehouse() {
        return multiWarehouse;
    }

    public Group forLine(PurchaseOrderLine line) {
        return groups.get(keyOf(line));
    }

    /** Nhóm mà một dòng phiếu nhập (sản phẩm, kho) được tính vào; null nếu sản phẩm không có trong PO. */
    public Group forVariant(Long variantId, Long warehouseId) {
        if (multiWarehouse) {
            Group exact = warehouseId == null ? null : groups.get(new Key(variantId, warehouseId));
            if (exact != null) {
                return exact;
            }
            Group unassigned = groups.get(new Key(variantId, null));
            if (unassigned != null) {
                return unassigned;
            }
            return groups.values().stream()
                    .filter(group -> Objects.equals(group.variantId, variantId))
                    .findFirst()
                    .orElse(null);
        }
        return groups.get(new Key(variantId, null));
    }

    /** PO đã nhận đủ khi mọi nhóm đã GHI SỔ đủ số lượng đặt. */
    public boolean isFullyPosted() {
        return !groups.isEmpty() && groups.values().stream()
                .allMatch(group -> group.posted.compareTo(group.ordered) >= 0);
    }

    private Key keyOf(PurchaseOrderLine line) {
        return multiWarehouse && line.getWarehouseId() != null
                ? new Key(line.getVariantId(), line.getWarehouseId())
                : new Key(line.getVariantId(), null);
    }
}
