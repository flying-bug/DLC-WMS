
import TabPagination from './TabPagination';

const ReceiptsTab = ({ data, loading, page, setPage, formatDate, formatCurrency, styles }) => {
    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃƒ CHá»¨NG Tá»ª</th>
                        <th>LOáº I</th>
                        <th>NGÃ€Y GIAO Dá»ŠCH</th>
                        <th style={{ textAlign: 'right' }}>Sá» TIá»€N (VNÄ)</th>
                        <th>PHÆ¯Æ NG THá»¨C</th>
                        <th>TRáº NG THÃI</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="6" className={styles.loadingState}>Äang táº£i...</td></tr>
                    ) : data.content.length === 0 ? (
                        <tr><td colSpan="6" className={styles.emptyState}>ChÆ°a cÃ³ lá»‹ch sá»­ giao dá»‹ch</td></tr>
                    ) : data.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.receiptCode}</td>
                            <td>
                                {item.type === 'RECEIPT' ? (
                                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Phiáº¿u Thu</span>
                                ) : (
                                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Phiáº¿u Chi</span>
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
