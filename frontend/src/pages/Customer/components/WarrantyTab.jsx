
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
                        <tr><td colSpan="5" className={styles.emptyState}>Chưa có lịch sử bảo hành</td></tr>
                    ) : data.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.warrantyCode}</td>
                            <td>{item.serialNumber || '-'}</td>
                            <td>{formatDate(item.startDate)} - {formatDate(item.endDate)}</td>
                            <td>{item.warrantyStatus}</td>
                            <td>
                                {item.repairs?.length > 0 ? (
                                    item.repairs.map(r => (
                                        <div key={r.repairCode} style={{ fontSize: '12px' }}>
                                            {r.repairCode} - {r.repairStatus} ({formatDate(r.receivedDate)})
                                        </div>
                                    ))
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
