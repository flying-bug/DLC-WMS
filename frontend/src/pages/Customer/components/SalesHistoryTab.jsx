
import TabPagination from './TabPagination';

const SalesHistoryTab = ({ data, loading, page, setPage, formatDate, styles }) => {
    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃƒ ÄÆ N HÃ€NG</th>
                        <th>NGÃ€Y MUA</th>
                        <th>Sáº¢N PHáº¨M</th>
                        <th style={{ textAlign: 'center' }}>Sá» LÆ¯á»¢NG</th>
                        <th>SERIAL / IMEI</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="5" className={styles.loadingState}>Äang táº£i...</td></tr>
                    ) : data.content.length === 0 ? (
                        <tr><td colSpan="5" className={styles.emptyState}>ChÆ°a cÃ³ lá»‹ch sá»­ mua hÃ ng</td></tr>
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
