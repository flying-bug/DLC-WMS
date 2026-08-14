import { Link } from 'react-router-dom';
import TabPagination from './TabPagination';

const SalesHistoryTab = ({ data, loading, page, setPage, formatDate, formatCurrency, styles }) => {
    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ ĐƠN HÀNG</th>
                        <th>NGÀY MUA</th>
                        <th>SẢN PHẨM</th>
                        <th style={{ textAlign: 'center' }}>SỐ LƯỢNG</th>
                        <th style={{ textAlign: 'right' }}>ĐƠN GIÁ</th>
                        <th style={{ textAlign: 'right' }}>THÀNH TIỀN</th>
                        <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
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
                                    <div className={styles.emptyText}>Chưa có lịch sử mua hàng</div>
                                </div>
                            </td>
                        </tr>
                    ) : data.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>
                                <Link to={`/sales/orders/detail/${item.orderId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                    {item.orderCode}
                                </Link>
                            </td>
                            <td>{formatDate(item.orderDate)}</td>
                            <td>{item.productName}</td>
                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text-strong)' }}>{formatCurrency(item.lineAmount)}</td>
                            <td style={{ textAlign: 'center' }}>
                                <span className={`${styles.badge} ${item.status === 'POSTED' ? styles.badgeSuccess : styles.badgeInfo}`}>
                                    {item.status === 'POSTED' ? 'Hoàn thành' : 'Đã duyệt'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <TabPagination page={page} setPage={setPage} totalPages={data.totalPages} styles={styles} />
        </>
    );
};

export default SalesHistoryTab;
