import styles from './RepairStatusBadge.module.css';

const STATUS_META = {
    DRAFT:       { label: 'Nháp',        cls: styles.draft },
    QUOTATION:   { label: 'Báo giá',     cls: styles.quotation },
    CONFIRMED:   { label: 'Đã xác nhận', cls: styles.confirmed },
    UNDER_REPAIR:{ label: 'Đang sửa',    cls: styles.underRepair },
    TESTING:     { label: 'Kiểm tra',    cls: styles.testing },
    DONE:        { label: 'Hoàn tất',    cls: styles.done },
    CANCELLED:   { label: 'Đã hủy',      cls: styles.cancelled },
};

/**
 * Reusable component hiển thị trạng thái lệnh sửa chữa.
 * @param {string} status - Mã trạng thái từ API (VD: "DRAFT", "DONE")
 */
function RepairStatusBadge({ status }) {
    const meta = STATUS_META[status] || { label: status || 'Không rõ', cls: styles.draft };
    return (
        <span className={`${styles.badge} ${meta.cls}`}>
            {meta.label}
        </span>
    );
}

export default RepairStatusBadge;
