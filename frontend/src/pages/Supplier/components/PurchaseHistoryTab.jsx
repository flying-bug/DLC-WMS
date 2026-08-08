const statusText = (status) => ({
    APPROVED: 'Đã duyệt',
    POSTED: 'Ghi sổ',
    DRAFT: 'Nháp',
    CANCELLED: 'Đã hủy'
}[status] || status || '-');

const PurchaseHistoryTab = ({ data, loading, formatDate, formatCurrency, styles }) => (
    <table className={styles.table}>
        <thead>
            <tr>
                <th>MÃ ĐƠN MUA</th>
                <th>NGÀY ĐẶT HÀNG</th>
                <th>SẢN PHẨM</th>
                <th style={{ textAlign: 'right' }}>SỐ LƯỢNG</th>
                <th style={{ textAlign: 'right' }}>ĐƠN GIÁ</th>
                <th style={{ textAlign: 'right' }}>THÀNH TIỀN</th>
                <th>TRẠNG THÁI</th>
            </tr>
        </thead>
        <tbody>
            {loading ? (
                <tr><td colSpan="7" className={styles.loadingState}>Đang tải lịch sử mua hàng...</td></tr>
            ) : data.length === 0 ? (
                <tr>
                    <td colSpan="7">
                        <div className={styles.emptyState}>
                            <i className={`bi bi-inbox ${styles.emptyIcon}`} style={{ fontSize: '32px' }}></i>
                            <div className={styles.emptyText}>Chưa có lịch sử mua hàng</div>
                        </div>
                    </td>
                </tr>
            ) : data.map((item, index) => (
                <tr key={`${item.poCode || 'po'}-${item.lineId || index}`}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.poCode}</td>
                    <td>{formatDate(item.poDate)}</td>
                    <td>{item.productName || item.variantName || item.productCode || item.sku || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)} đ</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.lineAmount)} đ</td>
                    <td>
                        <span className={item.status === 'POSTED' ? styles.badgeInfo : styles.badgeSuccess}>
                            {statusText(item.status)}
                        </span>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);

export default PurchaseHistoryTab;
