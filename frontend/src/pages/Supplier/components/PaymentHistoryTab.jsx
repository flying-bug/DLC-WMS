const statusText = (status) => (status === 'POSTED' ? 'Ghi sổ' : status === 'DRAFT' ? 'Nháp' : status || '-');
const paymentTypeText = (type) => type === 'VOUCHER' ? 'Phiếu chi' : 'Phiếu thu';
const paymentMethodText = (method) => method === 'CASH' ? 'Tiền mặt' : method === 'BANK_TRANSFER' ? 'Chuyển khoản' : method || '-';

const PaymentHistoryTab = ({ data, debtBalance, loading, formatDateTime, formatCurrency, styles }) => {
    const totalPaidOut = data
        .filter(item => item.type === 'VOUCHER' && ['POSTED', 'APPROVED'].includes(item.status))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return (
        <>
            <div className={styles.historySummaryGrid}>
                <div className={styles.historySummaryCard}>
                    <span>Tổng tiền đã chi</span>
                    <strong className={styles.amountOut}>{formatCurrency(totalPaidOut)} đ</strong>
                </div>
                <div className={styles.historySummaryCard}>
                    <span>Dư nợ phải trả</span>
                    <strong className={styles.debtAmount}>{formatCurrency(debtBalance)} đ</strong>
                </div>
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ CHỨNG TỪ</th>
                        <th>LOẠI</th>
                        <th>NGÀY GIAO DỊCH</th>
                        <th style={{ textAlign: 'right' }}>SỐ TIỀN</th>
                        <th>PHƯƠNG THỨC</th>
                        <th>TRẠNG THÁI</th>
                        <th>GHI CHÚ</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="7" className={styles.loadingState}>Đang tải lịch sử thu chi...</td></tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan="7">
                                <div className={styles.emptyState}>
                                    <i className={`bi bi-inbox ${styles.emptyIcon}`} style={{ fontSize: '32px' }}></i>
                                    <div className={styles.emptyText}>Chưa có lịch sử thu chi</div>
                                </div>
                            </td>
                        </tr>
                    ) : data.map((item, index) => (
                        <tr key={`${item.code || 'payment'}-${item.id || index}`}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.code}</td>
                            <td>{paymentTypeText(item.type)}</td>
                            <td>{formatDateTime(item.createdAt)}</td>
                            <td className={styles.textRight}>
                                <span className={item.type === 'VOUCHER' ? styles.amountOut : styles.amountIn}>
                                    {item.type === 'VOUCHER' ? '-' : '+'}{formatCurrency(item.amount)} đ
                                </span>
                            </td>
                            <td>{paymentMethodText(item.paymentMethod)}</td>
                            <td>
                                <span className={item.status === 'POSTED' ? styles.badgeSuccess : styles.badgeWarning}>
                                    {statusText(item.status)}
                                </span>
                            </td>
                            <td>{item.note || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
};

export default PaymentHistoryTab;
