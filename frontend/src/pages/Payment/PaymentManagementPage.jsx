import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import * as customerApi from '../../api/customerApi';
import * as purchaseOrderApi from '../../api/purchaseOrderApi';
import * as paymentApi from '../../api/paymentApi';
import styles from './PaymentManagementPage.module.css';
import { formatDateTime, formatDateOnly } from '../../utils/dateFormat';
import { printPaymentReceipt } from '../../utils/printPaymentReceipt';
import { exportToExcel } from '../../utils/excelExport';

const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const formatMoneyInput = (value) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
};
const statusText = (status) => (status === 'POSTED' ? 'Ghi sổ' : status === 'DRAFT' ? 'Nháp' : status || '-');
const formatPaymentDateTime = (value) => value ? formatDateTime(value, { withSeconds: false }) : '-';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    height: 36,
    fontSize: 13,
    borderColor: state.isFocused ? '#0075c0' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #0075c0' : 'none',
  }),
  valueContainer: (base) => ({ ...base, height: 36, padding: '0 8px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

function PaymentManagementPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('RECEIPT');
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [partnerId, setPartnerId] = useState(null);
  const [debtBalance, setDebtBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [customerRes, supplierRes] = await Promise.allSettled([
          customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
          purchaseOrderApi.getSuppliers({ size: 1000 }),
        ]);
        if (customerRes.status === 'fulfilled') {
          setCustomers(pageContent(unwrap(customerRes.value)));
        }
        if (supplierRes.status === 'fulfilled') {
          setSuppliers(pageContent(unwrap(supplierRes.value)).filter(s => s.status !== 'INACTIVE'));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setPartnerId(null);
    setDebtBalance(0);
    setAmount('');
    setNote('');
    setHistory([]);
  }, [mode]);

  const reloadPartnerSnapshot = useCallback(async (nextPartnerId) => {
    if (!nextPartnerId) {
      setDebtBalance(0);
      setHistory([]);
      return;
    }
    try {
      const [balanceRes, historyRes] = await Promise.allSettled([
        paymentApi.getPartnerDebtBalance(nextPartnerId),
        paymentApi.getPartnerPaymentHistory(nextPartnerId),
      ]);
      if (balanceRes.status === 'fulfilled') {
        setDebtBalance(Number(unwrap(balanceRes.value) || 0));
      }
      if (historyRes.status === 'fulfilled') {
        setHistory(unwrap(historyRes.value) || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    reloadPartnerSnapshot(partnerId);
  }, [partnerId, reloadPartnerSnapshot]);

  const partnerOptions = useMemo(() => {
    const source = mode === 'RECEIPT' ? customers : suppliers;
    return source.map(p => ({
      value: p.id,
      label: `${p.code || ''} - ${p.name || ''}${p.phone ? ` (${p.phone})` : ''}`,
    }));
  }, [customers, mode, suppliers]);

  const selectedPartner = partnerOptions.find(opt => opt.value === partnerId) || null;
  const recentHistory = history.slice(0, 5);
  const formattedAmount = formatMoneyInput(amount);

  const validate = () => {
    if (!partnerId) {
      showToast('error', mode === 'RECEIPT' ? 'Vui lòng chọn khách hàng' : 'Vui lòng chọn nhà cung cấp');
      return false;
    }
    const numericAmount = Number(digitsOnly(amount) || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('error', 'Số tiền phải lớn hơn 0');
      return false;
    }
    if (numericAmount > Number(debtBalance || 0)) {
      showToast('error', 'Số tiền không được vượt quá công nợ hiện tại');
      return false;
    }
    return true;
  };

  const submit = async (nextStatus) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        partnerId: Number(partnerId),
        amount: Number(digitsOnly(amount)),
        paymentMethod,
        note: note || undefined,
        status: nextStatus,
      };
      const res = mode === 'RECEIPT'
        ? await paymentApi.createReceipt(payload)
        : await paymentApi.createVoucher(payload);
      const saved = unwrap(res);
      setDebtBalance(Number(saved?.partnerDebtBalance || 0));
      setAmount('');
      setNote('');
      await reloadPartnerSnapshot(partnerId);
      showToast('success', nextStatus === 'POSTED' ? 'Ghi sổ thành công' : 'Lưu tạm thành công');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể lập phiếu thu/chi');
    } finally {
      setSaving(false);
    }
  };

  const postDraftPayment = async (item) => {
    if (!item?.id || item.status !== 'DRAFT') return;
    setPostingId(item.id);
    try {
      const res = await paymentApi.postPayment(item.id);
      const saved = unwrap(res);
      setDebtBalance(Number(saved?.partnerDebtBalance || 0));
      await reloadPartnerSnapshot(partnerId);
      showToast('success', 'Ghi sổ phiếu nháp thành công');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể ghi sổ phiếu nháp');
    } finally {
      setPostingId(null);
    }
  };

  const openFullHistory = () => {
    if (!partnerId) return;
    navigate(`/payments/history/${partnerId}?mode=${mode}`, {
      state: {
        partnerLabel: selectedPartner?.label || '',
      },
    });
  };

  const handleExportExcel = () => {
    if (!history || history.length === 0) {
      showToast('warning', 'Không có lịch sử thu chi để xuất Excel');
      return;
    }
    const headers = ['Mã phiếu', 'Ngày tạo', 'Loại phiếu', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ghi chú'];
    const data = history.map(item => [
      item.code,
      item.createdAt ? formatDateOnly(item.createdAt) : '',
      item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi',
      item.amount,
      item.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt',
      item.status === 'POSTED' ? 'Đã ghi sổ' : 'Lưu tạm',
      item.note || ''
    ]);
    exportToExcel(headers, data, `Lich_su_thu_chi_${partnerId || 'tat_ca'}`);
    showToast('success', 'Xuất Excel thành công!');
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.breadcrumb}>Thu chi &amp; Công nợ</div>
            <h1 className={styles.pageTitle}>Quản lý thu chi công nợ</h1>
          </div>
          <div className={styles.modeTabs}>
            <button
              className={`${styles.modeTab} ${mode === 'RECEIPT' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('RECEIPT')}
              type="button"
            >
              <i className="bi bi-arrow-down-circle" /> Phiếu thu
            </button>
            <button
              className={`${styles.modeTab} ${mode === 'VOUCHER' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('VOUCHER')}
              type="button"
            >
              <i className="bi bi-arrow-up-circle" /> Phiếu chi
            </button>
          </div>
        </div>

        <div className={styles.topGrid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <i className="bi bi-person-vcard" /> {mode === 'RECEIPT' ? 'Thu tiền khách hàng' : 'Trả công nợ nhà cung cấp'}
            </div>
            {loading ? (
              <div className={styles.loading}>Đang tải dữ liệu...</div>
            ) : (
              <>
                <div className={styles.fieldRow}>
                  <label className={styles.label}>{mode === 'RECEIPT' ? 'Khách hàng' : 'Nhà cung cấp'} <span>*</span></label>
                  <Select
                    options={partnerOptions}
                    value={selectedPartner}
                    onChange={opt => setPartnerId(opt?.value || null)}
                    isClearable
                    placeholder={mode === 'RECEIPT' ? 'Chọn khách hàng...' : 'Chọn nhà cung cấp...'}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>

                <div className={styles.debtPanel}>
                  <span>Công nợ hiện tại</span>
                  <strong>{money(debtBalance)} đ</strong>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Số tiền <span>*</span></label>
                    <input
                      className={styles.input}
                      inputMode="numeric"
                      type="text"
                      value={formattedAmount}
                      onChange={e => setAmount(digitsOnly(e.target.value))}
                      placeholder="Nhập số tiền"
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Phương thức</label>
                    <select className={styles.input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                      <option value="CASH">Tiền mặt</option>
                      <option value="BANK_TRANSFER">Chuyển khoản</option>
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <label className={styles.label}>Ghi chú</label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Nội dung thu/chi"
                  />
                </div>

                <div className={styles.formActions}>
                  <button className={styles.btnDraft} disabled={saving} onClick={() => submit('DRAFT')} type="button">
                    Lưu tạm
                  </button>
                  <button className={styles.btnPost} disabled={saving || Number(debtBalance || 0) <= 0} onClick={() => submit('POSTED')} type="button">
                    <i className="bi bi-check2-circle" /> Ghi sổ
                  </button>
                </div>
              </>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>
                <i className="bi bi-clock-history" /> Lịch sử thu chi
              </div>
              <div className={styles.historyTools}>
                <span className={styles.historyCount}>{Math.min(history.length, 5)} gần nhất</span>
                {history.length > 0 && (
                  <button className={styles.linkButton} onClick={handleExportExcel} type="button" title="Xuất tệp Excel" style={{ marginRight: 8 }}>
                    <i className="bi bi-file-earmark-excel" /> Xuất Excel
                  </button>
                )}
                {partnerId && (
                  <button className={styles.linkButton} onClick={openFullHistory} type="button">
                    Xem tất cả
                  </button>
                )}
              </div>
            </div>
            <div className={styles.historyList}>
              {recentHistory.length > 0 && (
                <div className={styles.historyHeader}>
                  <span>Chứng từ</span>
                  <span className={styles.textRight}>Số tiền</span>
                </div>
              )}
              {history.length === 0 ? (
                <div className={styles.empty}>Chưa có phiếu thu/chi</div>
              ) : recentHistory.map(item => (
                <div className={styles.historyItem} key={item.id}>
                  <div className={styles.historyMain}>
                    <div className={styles.historyCodeRow}>
                      <strong>{item.code}</strong>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className={styles.btnPostInline}
                          style={{ padding: '2px 6px', fontSize: '12px', backgroundColor: '#fff', border: '1px solid #d1d5db', color: '#374151' }}
                          onClick={() => printPaymentReceipt(item, { partnerName: selectedPartner?.label?.split(' - ')[1] || selectedPartner?.label, salespersonName: '' })}
                          title="In phiếu"
                        >
                          <i className="bi bi-printer"></i>
                        </button>
                        <span className={item.status === 'POSTED' ? styles.statusPosted : styles.statusDraft}>{statusText(item.status)}</span>
                      </div>
                    </div>
                    <span>{item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'} - {item.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
                    <span className={styles.historyMeta}>
                      <i className="bi bi-calendar3" /> {formatPaymentDateTime(item.createdAt)}
                    </span>
                    <span className={styles.historyNote}>
                      <i className="bi bi-chat-left-text" /> {item.note || 'Không có ghi chú'}
                    </span>
                  </div>
                  <div className={styles.historyAmount}>
                    <strong>{money(item.amount)} đ</strong>
                    {item.status === 'DRAFT' && (
                      <button
                        className={styles.btnPostInline}
                        disabled={postingId === item.id || saving}
                        onClick={() => postDraftPayment(item)}
                        type="button"
                      >
                        <i className="bi bi-check2-circle" /> Ghi sổ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
    </AdminLayout>
  );
}

export default PaymentManagementPage;
