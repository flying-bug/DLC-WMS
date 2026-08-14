import { Link } from 'react-router-dom';
import TabPagination from './TabPagination';

const WarrantyTab = ({ data, loading, page, setPage, formatDate, styles }) => {
    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ BẢO HÀNH</th>
                        <th>SERIAL SẢN PHẨM</th>
                        <th>THỜI GIAN BH</th>
                        <th>TRẠNG THÁI</th>
                        <th>LỊCH SỬ SỬA CHỮA</th>
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
                                    <div className={styles.emptyText}>Chưa có lịch sử bảo hành</div>
                                </div>
                            </td>
                        </tr>
                    ) : data.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>
                                <Link to={`/warranties/${item.warrantyId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                    {item.warrantyCode}
                                </Link>
                            </td>
                            <td>{item.serialNumber || '-'}</td>
                            <td>{formatDate(item.startDate)} - {formatDate(item.endDate)}</td>
                            <td>
                                <span className={`${styles.badge} ${
                                    item.warrantyStatus === 'ACTIVE' ? styles.badgeSuccess : 
                                    item.warrantyStatus === 'VOIDED' ? styles.badgeDanger : 
                                    styles.badgeWarning
                                }`}>
                                    {item.warrantyStatus === 'ACTIVE' ? 'Đang hoạt động' : 
                                     item.warrantyStatus === 'VOIDED' ? 'Vô hiệu hóa' : 
                                     item.warrantyStatus === 'EXPIRED' ? 'Hết hạn' : item.warrantyStatus}
                                </span>
                            </td>
                            <td>
                                {item.repairs?.length > 0 ? (
                                    item.repairs.map(r => {
                                        const statusMap = {
                                            'DRAFT': 'Nháp',
                                            'QUOTATION': 'Báo giá',
                                            'CONFIRMED': 'Đã xác nhận',
                                            'UNDER_REPAIR': 'Đang sửa chữa',
                                            'DONE': 'Đã hoàn thành',
                                            'CANCELLED': 'Đã hủy'
                                        };
                                        const translatedStatus = statusMap[r.repairStatus] || r.repairStatus;
                                        return (
                                            <div key={r.repairCode} style={{ fontSize: '12px', marginBottom: '4px' }}>
                                                <Link to={`/repairs/${r.repairId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                                                    {r.repairCode}
                                                </Link> - {translatedStatus} ({formatDate(r.receivedDate)})
                                            </div>
                                        );
                                    })
                                ) : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <TabPagination page={page} setPage={setPage} totalPages={data.totalPages} styles={styles} />
        </>
    );
};

export default WarrantyTab;
