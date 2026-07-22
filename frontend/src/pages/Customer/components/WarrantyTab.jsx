
import TabPagination from './TabPagination';

const WarrantyTab = ({ data, loading, page, setPage, formatDate, styles }) => {
    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃƒ Báº¢O HÃ€NH</th>
                        <th>SERIAL Sáº¢N PHáº¨M</th>
                        <th>THá»œI GIAN BH</th>
                        <th>TRáº NG THÃI</th>
                        <th>Lá»ŠCH Sá»¬ Sá»¬A CHá»®A</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="5" className={styles.loadingState}>Äang táº£i...</td></tr>
                    ) : data.content.length === 0 ? (
                        <tr><td colSpan="5" className={styles.emptyState}>ChÆ°a cÃ³ lá»‹ch sá»­ báº£o hÃ nh</td></tr>
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
