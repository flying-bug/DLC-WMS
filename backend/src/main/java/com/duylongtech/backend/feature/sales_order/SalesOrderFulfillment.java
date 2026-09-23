package com.duylongtech.backend.feature.sales_order;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Tiến độ giao hàng của 1 SO, tính từ các dòng SO và tổng số lượng trên các phiếu xuất liên kết (mọi kho).
 *
 * <p>Hai khái niệm tách biệt, giống {@code PurchaseOrderReceiving} bên mua hàng:
 * <ul>
 *   <li><b>posted</b>: đã ghi sổ - dùng để xét SO đã giao đủ / hoàn thành.</li>
 *   <li><b>allocated</b>: đã nằm trong phiếu chưa hủy (kể cả nháp) - dùng để giới hạn số lượng khi tạo phiếu mới,
 *       tránh hai phiếu cùng xuất một phần hàng.</li>
 * </ul>
 *
 * <p>SO bán đa kho (các dòng chỉ định từ 2 kho trở lên) được theo dõi theo (sản phẩm, kho) để cùng một sản phẩm
 * ở 2 kho không "trừ nhầm" của nhau; SO 1 kho theo dõi theo sản phẩm như trước. Dòng không chọn kho lấy kho
 * mặc định ở đầu đơn ({@code SalesOrder.warehouseId}).
 */
public final class SalesOrderFulfillment {

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

        /** Còn được phép đưa vào phiếu xuất mới (không tính phần đã nằm trong phiếu nháp/đã ghi sổ). */
        public BigDecimal remainingToAllocate() {
            return ordered.subtract(allocated).max(BigDecimal.ZERO);
        }
    }

    private final Map<Key, Group> groups = new LinkedHashMap<>();
    private final boolean multiWarehouse;
    private final Long defaultWarehouseId;

    private SalesOrderFulfillment(boolean multiWarehouse, Long defaultWarehouseId) {
        this.multiWarehouse = multiWarehouse;
        this.defaultWarehouseId = defaultWarehouseId;
    }

    /**
     * @param defaultWarehouseId kho ở đầu đơn, dùng cho dòng không chọn kho riêng
     * @param exportedRows       mỗi phần tử là [variantId, warehouseId, docStatus, tổng quantityOut] của các phiếu chưa hủy
     */
    public static SalesOrderFulfillment of(Collection<SalesOrderLine> lines, Long defaultWarehouseId,
                                           List<Object[]> exportedRows) {
        long distinctWarehouses = lines.stream()
                .map(line -> resolveWarehouse(line, defaultWarehouseId))
                .filter(Objects::nonNull)
                .distinct()
                .count();
        SalesOrderFulfillment fulfillment = new SalesOrderFulfillment(distinctWarehouses > 1, defaultWarehouseId);

        for (SalesOrderLine line : lines) {
            Key key = fulfillment.keyOf(line);
            Group group = fulfillment.groups.computeIfAbsent(key, k -> new Group(k.variantId(), k.warehouseId()));
            group.ordered = group.ordered.add(line.getQuantity() != null ? line.getQuantity() : BigDecimal.ZERO);
        }

        for (Object[] row : exportedRows) {
            Group group = fulfillment.forVariant((Long) row[0], (Long) row[1]);
            if (group == null) {
                continue;
            }
            BigDecimal quantity = (BigDecimal) row[3];
            group.allocated = group.allocated.add(quantity);
            if (STATUS_POSTED.equals(row[2])) {
                group.posted = group.posted.add(quantity);
            }
        }
        return fulfillment;
    }

    public boolean isMultiWarehouse() {
        return multiWarehouse;
    }

    public Group forLine(SalesOrderLine line) {
        return groups.get(keyOf(line));
    }

    /** Nhóm mà một dòng phiếu xuất (sản phẩm, kho) được tính vào; null nếu sản phẩm không có trong SO. */
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

    /** SO đã giao đủ khi mọi nhóm đã GHI SỔ đủ số lượng đặt. */
    public boolean isFullyPosted() {
        return !groups.isEmpty() && groups.values().stream()
                .allMatch(group -> group.posted.compareTo(group.ordered) >= 0);
    }

    private Key keyOf(SalesOrderLine line) {
        Long warehouseId = resolveWarehouse(line, defaultWarehouseId);
        return multiWarehouse && warehouseId != null
                ? new Key(line.getVariantId(), warehouseId)
                : new Key(line.getVariantId(), null);
    }

    private static Long resolveWarehouse(SalesOrderLine line, Long defaultWarehouseId) {
        return line.getWarehouseId() != null ? line.getWarehouseId() : defaultWarehouseId;
    }
}
