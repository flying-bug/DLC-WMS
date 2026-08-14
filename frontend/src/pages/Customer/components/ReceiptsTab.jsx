import { Link } from 'react-router-dom';
import TabPagination from './TabPagination';

const statusText = (status) => (status === 'POSTED' ? 'Ghi sổ' : status === 'DRAFT' ? 'Nháp' : status || '-');
const paymentMethodText = (method) => method === 'CASH' ? 'Tiền mặt' : method === 'BANK_TRANSFER' ? 'Chuyển khoản' : method || '-';

const ReceiptsTab = ({ data, loading, page, setPage, formatDate, formatCurrency, styles, customerId }) => {
    return (
        <>
            <div style={{ display: 'flex', marginBottom: '24px' }}>
                <div style={{ 
                    backgroundColor: 'var(--color-bg-subtle)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    width: '380px'
                }}>
                    <div>
                        <div className={styles.detailLabel} style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tổng tiền đã thu</div>
                        <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--color-primary)' }}>{formatCurrency(data.totalPaid)} <span style={{ fontSize: '20px', color: 'var(--color-text-muted)' }}>₫</span></h2>
                    </div>
                    <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        backgroundColor: 'var(--color-bg)', 
                        color: 'var(--color-primary)', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '28px',
                        border: '1px solid var(--color-border)'
                    }}>
                        <i className="bi bi-safe"></i>
                    </div>
                </div>
            </div>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ CHỨNG TỪ</th>
                        <th>LOẠI</th>
                        <th>NGÀY GIAO DỊCH</th>
                        <th style={{ textAlign: 'right' }}>SỐ TIỀN (VNĐ)</th>
                        <th>PHƯƠNG THỨC</th>
                        <th>TRẠNG THÁI</th>
                        <th>GHI CHÚ</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="7" className={styles.loadingState}>Đang tải...</td></tr>
                    ) : data.content.length === 0 ? (
                        <tr>
                            <td colSpan="7">
                                <div className={styles.emptyState}>
                                    <i className={`bi bi-inbox ${styles.emptyIcon}`} style={{ fontSize: '32px' }}></i>
                                    <div className={styles.emptyText}>Chưa có lịch sử thu chi</div>
                                </div>
                            </td>
                        </tr>
                    ) : data.content.map((item, idx) => (
                        <tr key={`${item.receiptCode || 'receipt'}-${idx}`}>
                            <td style={{ fontWeight: 600 }}>
                                <Link to={`/payments/history/${customerId}?mode=${item.type}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                    {item.receiptCode}
                                </Link>
                            </td>
                            <td>
                                {item.type === 'RECEIPT' ? (
                                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Phiếu Thu</span>
                                ) : (
                                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Phiếu Chi</span>
                                )}
                            </td>
                            <td>{formatDate(item.createdAt)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                <span className={item.type === 'VOUCHER' ? styles.amountOut : styles.amountIn}>
                                    {item.type === 'VOUCHER' ? '-' : '+'}{formatCurrency(item.amount)} ₫
                                </span>
                            </td>
                            <td>{paymentMethodText(item.paymentMethod)}</td>
                            <td>
                                <span className={`${styles.badge} ${item.status === 'POSTED' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                    {statusText(item.status)}
                                </span>
                            </td>
                            <td>{item.note || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <TabPagination page={page} setPage={setPage} totalPages={data.totalPages} styles={styles} />
        </>
    );
};

export default ReceiptsTab;
