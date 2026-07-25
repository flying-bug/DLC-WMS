
import TabPagination from './TabPagination';

const ReceiptsTab = ({ data, loading, page, setPage, formatDate, formatCurrency, styles }) => {
    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ CHỨNG TỪ</th>
                        <th>LOẠI</th>
                        <th>NGÀY GIAO DỊCH</th>
                        <th style={{ textAlign: 'right' }}>SỐ TIỀN (VNĐ)</th>
                        <th>PHƯƠNG THỨC</th>
                        <th>TRẠNG THÁI</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="6" className={styles.loadingState}>Đang tải...</td></tr>
                    ) : data.content.length === 0 ? (
                        <tr>
                            <td colSpan="6">
                                <div className={styles.emptyState}>
                                    <i className={`bi bi-inbox ${styles.emptyIcon}`} style={{ fontSize: '32px' }}></i>
                                    <div className={styles.emptyText}>Chưa có lịch sử giao dịch</div>
                                </div>
                            </td>
                        </tr>
                    ) : data.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.receiptCode}</td>
                            <td>
                                {item.type === 'RECEIPT' ? (
                                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Phiếu Thu</span>
                                ) : (
                                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Phiếu Chi</span>
                                )}
                            </td>
                            <td>{formatDate(item.createdAt)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {item.type === 'VOUCHER' ? '-' : '+'}{formatCurrency(item.amount)}
                            </td>
                            <td>{item.paymentMethod || '-'}</td>
                            <td>{item.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <TabPagination page={page} setPage={setPage} totalPages={data.totalPages} styles={styles} />
        </>
    );
};

export default ReceiptsTab;
