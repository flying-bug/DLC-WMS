import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import * as customerApi from '../../api/customerApi';
import * as purchaseOrderApi from '../../api/purchaseOrderApi';
import * as paymentApi from '../../api/paymentApi';
import styles from './PaymentHistoryPage.module.css';

const unwrap = (res) => res?.data?.data ?? res?.data;
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const statusText = (status) => (status === 'POSTED' ? 'Ghi sổ' : status === 'DRAFT' ? 'Nháp' : status || '-');
const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function PaymentHistoryPage() {
  const { partnerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = searchParams.get('mode') === 'VOUCHER' ? 'VOUCHER' : 'RECEIPT';
  const partnerTypeLabel = mode === 'RECEIPT' ? 'khách hàng' : 'nhà cung cấp';

  const [partner, setPartner] = useState(null);
  const [debtBalance, setDebtBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const loadHistory = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const partnerRequest = mode === 'RECEIPT'
        ? customerApi.getCustomerById(partnerId)
        : purchaseOrderApi.getSupplierById(partnerId);
      const [partnerRes, balanceRes, historyRes] = await Promise.allSettled([
        partnerRequest,
        paymentApi.getPartnerDebtBalance(partnerId),
        paymentApi.getPartnerPaymentHistory(partnerId),
      ]);
      if (partnerRes.status === 'fulfilled') {
        setPartner(unwrap(partnerRes.value));
      }
      if (balanceRes.status === 'fulfilled') {
        setDebtBalance(Number(unwrap(balanceRes.value) || 0));
      }
      if (historyRes.status === 'fulfilled') {
        setHistory(unwrap(historyRes.value) || []);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Không thể tải lịch sử giao dịch');
    } finally {
      setLoading(false);
    }
  }, [mode, partnerId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return history.filter(item => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const haystack = `${item.code || ''} ${item.note || ''} ${item.paymentMethod || ''} ${item.type || ''}`.toLowerCase();
      return matchesStatus && (!normalizedKeyword || haystack.includes(normalizedKeyword));
    });
  }, [history, keyword, statusFilter]);

  const totals = useMemo(() => ({
    count: history.length,
    posted: history.filter(item => item.status === 'POSTED').length,
    draft: history.filter(item => item.status === 'DRAFT').length,
    amount: history.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }), [history]);

  const partnerLabel = partner
    ? `${partner.code || ''} - ${partner.name || ''}`.trim()
    : location.state?.partnerLabel || `ID ${partnerId}`;

  const postDraftPayment = async (item) => {
    if (!item?.id || item.status !== 'DRAFT') return;
    setPostingId(item.id);
    try {
      await paymentApi.postPayment(item.id);
      await loadHistory();
      showToast('success', 'Ghi sổ phiếu nháp thành công');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể ghi sổ phiếu nháp');
    } finally {
      setPostingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <div className={styles.breadcrumb}>Thu chi &amp; Công nợ / Lịch sử giao dịch</div>
            <h1 className={styles.title}>Lịch sử giao dịch {partnerTypeLabel}</h1>
            <p className={styles.subtitle}>{partnerLabel}</p>
          </div>
          <button className={styles.backButton} onClick={() => navigate('/payments')} type="button">
            <i className="bi bi-arrow-left" /> Quay lại thu chi
          </button>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Công nợ hiện tại</span>
            <strong>{money(debtBalance)} đ</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Tổng giao dịch</span>
            <strong>{totals.count}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Đã ghi sổ / Nháp</span>
            <strong>{totals.posted} / {totals.draft}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Tổng tiền giao dịch</span>
            <strong>{money(totals.amount)} đ</strong>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <i className="bi bi-search" />
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Tìm theo mã phiếu, ghi chú..."
              />
            </div>
            <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="POSTED">Ghi sổ</option>
              <option value="DRAFT">Nháp</option>
            </select>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Loại</th>
                  <th>Thời gian</th>
                  <th>Phương thức</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th className={styles.textRight}>Số tiền</th>
                  <th className={styles.textRight}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>Đang tải lịch sử...</td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>Không có giao dịch phù hợp</td>
                  </tr>
                ) : filteredHistory.map(item => (
                  <tr key={item.id}>
                    <td className={styles.codeCell}>{item.code}</td>
                    <td>{item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}</td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>{item.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
                    <td className={styles.noteCell}>{item.note || 'Không có ghi chú'}</td>
                    <td>
                      <span className={item.status === 'POSTED' ? styles.statusPosted : styles.statusDraft}>
                        {statusText(item.status)}
                      </span>
                    </td>
                    <td className={styles.textRight}>{money(item.amount)} đ</td>
                    <td className={styles.textRight}>
                      {item.status === 'DRAFT' ? (
                        <button
                          className={styles.postButton}
                          disabled={postingId === item.id}
                          onClick={() => postDraftPayment(item)}
                          type="button"
                        >
                          <i className="bi bi-check2-circle" /> Ghi sổ
                        </button>
                      ) : (
                        <span className={styles.muted}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
    </AdminLayout>
  );
}

export default PaymentHistoryPage;
