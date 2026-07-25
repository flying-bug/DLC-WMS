
import TabPagination from './TabPagination';

const SalesHistoryTab = ({ data, loading, page, setPage, formatDate, styles }) => {
    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ ĐƠN HÀNG</th>
                        <th>NGÀY MUA</th>
                        <th>SẢN PHẨM</th>
                        <th style={{ textAlign: 'center' }}>SỐ LƯỢNG</th>
                        <th>SERIAL / IMEI</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="5" className={styles.loadingState}>Đang tải...</td></tr>
                    ) : data.content.length === 0 ? (
                        <tr>
                            <td colSpan="5">
                                <div className={styles.emptyState}>
                                    <i className={`bi bi-inbox ${styles.emptyIcon}`} style={{ fontSize: '32px' }}></i>
                                    <div className={styles.emptyText}>Chưa có lịch sử mua hàng</div>
                                </div>
                            </td>
                        </tr>
                    ) : data.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.orderCode}</td>
                            <td>{formatDate(item.orderDate)}</td>
                            <td>{item.productName}</td>
                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td>{item.serialNumber || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <TabPagination page={page} setPage={setPage} totalPages={data.totalPages} styles={styles} />
        </>
    );
};

export default SalesHistoryTab;
