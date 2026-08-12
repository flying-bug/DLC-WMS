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
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const formatMoneyInput = (value) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
};
const statusText = (status) => (status === 'POSTED' ? 'Ghi sß╗ò' : status === 'DRAFT' ? 'Nh├íp' : status || '-');
const formatPaymentDateTime = (value) => value ? formatDateTime(value, { withSeconds: false }) : '-';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    height: 36,
    fontSize: 13,
    borderColor: state.isFocused ? 'var(--color-primary)' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
  }),
  valueContainer: (base) => ({ ...base, height: 36, padding: '0 8px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

function PaymentManagementPage({ initialMode = 'RECEIPT' }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
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
      showToast('error', mode === 'RECEIPT' ? 'Vui l├▓ng chß╗ìn kh├ích h├áng' : 'Vui l├▓ng chß╗ìn nh├á cung cß║Ñp');
      return false;
    }
    const numericAmount = Number(digitsOnly(amount) || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('error', 'Sß╗æ tiß╗ün phß║úi lß╗¢n h╞ín 0');
      return false;
    }
    if (numericAmount > Number(debtBalance || 0)) {
      showToast('error', 'Sß╗æ tiß╗ün kh├┤ng ─æ╞░ß╗úc v╞░ß╗út qu├í c├┤ng nß╗ú hiß╗çn tß║íi');
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
      showToast('success', nextStatus === 'POSTED' ? 'Ghi sß╗ò th├ánh c├┤ng' : 'L╞░u tß║ím th├ánh c├┤ng');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Kh├┤ng thß╗â lß║¡p phiß║┐u thu/chi');
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
      showToast('success', 'Ghi sß╗ò phiß║┐u nh├íp th├ánh c├┤ng');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Kh├┤ng thß╗â ghi sß╗ò phiß║┐u nh├íp');
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
      showToast('warning', 'Kh├┤ng c├│ lß╗ïch sß╗¡ thu chi ─æß╗â xuß║Ñt Excel');
      return;
    }
    const headers = ['M├ú phiß║┐u', 'Ng├áy tß║ío', 'Loß║íi phiß║┐u', 'Sß╗æ tiß╗ün', 'Ph╞░╞íng thß╗⌐c', 'Trß║íng th├íi', 'Ghi ch├║'];
    const data = history.map(item => [
      item.code,
      item.createdAt ? formatDateOnly(item.createdAt) : '',
      item.type === 'RECEIPT' ? 'Phiß║┐u thu' : 'Phiß║┐u chi',
      item.amount,
      item.paymentMethod === 'BANK_TRANSFER' ? 'Chuyß╗ân khoß║ún' : 'Tiß╗ün mß║╖t',
      item.status === 'POSTED' ? '─É├ú ghi sß╗ò' : 'L╞░u tß║ím',
      item.note || ''
    ]);
    exportToExcel(headers, data, `Lich_su_thu_chi_${partnerId || 'tat_ca'}`);
    showToast('success', 'Xuß║Ñt Excel th├ánh c├┤ng!');
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.breadcrumb}>Thu chi</div>
            <h1 className={styles.pageTitle}>{mode === 'RECEIPT' ? 'Quß║ún l├╜ phiß║┐u thu' : 'Quß║ún l├╜ phiß║┐u chi'}</h1>
          </div>
        </div>

        <div className={styles.topGrid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <i className="bi bi-person-vcard" /> {mode === 'RECEIPT' ? 'Thu tiß╗ün kh├ích h├áng' : 'Trß║ú c├┤ng nß╗ú nh├á cung cß║Ñp'}
            </div>
            {loading ? (
              <div className={styles.loading}>─Éang tß║úi dß╗» liß╗çu...</div>
            ) : (
              <>
                <div className={styles.fieldRow}>
                  <label className={styles.label}>{mode === 'RECEIPT' ? 'Kh├ích h├áng' : 'Nh├á cung cß║Ñp'} <span>*</span></label>
                  <Select
                    options={partnerOptions}
                    value={selectedPartner}
                    onChange={opt => setPartnerId(opt?.value || null)}
                    isClearable
                    placeholder={mode === 'RECEIPT' ? 'Chß╗ìn kh├ích h├áng...' : 'Chß╗ìn nh├á cung cß║Ñp...'}
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>

                <div
                  className={`${styles.debtPanel} ${partnerId ? styles.debtPanelClickable : ''}`}
                  onClick={openFullHistory}
                  title={partnerId ? 'Bß║Ñm ─æß╗â xem lß╗ïch sß╗¡ c├┤ng nß╗ú & h├│a ─æ╞ín chi tiß║┐t' : 'Vui l├▓ng chß╗ìn ─æß╗æi t├íc'}
                >
                  <div className={styles.debtPanelLabelGroup}>
                    <span>C├┤ng nß╗ú hiß╗çn tß║íi</span>
                    {partnerId ? (
                      <span className={styles.debtPanelBadge}>
                        <i className="bi bi-box-arrow-up-right" /> Chi tiß║┐t
                      </span>
                    ) : (
                      <span className={styles.debtPanelHint}>(Chß╗ìn ─æß╗æi t├íc ─æß╗â xem chi tiß║┐t)</span>
                    )}
                  </div>
                  <strong>{money(debtBalance)} ─æ</strong>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Sß╗æ tiß╗ün <span>*</span></label>
                    <input
                      className={styles.input}
                      inputMode="numeric"
                      type="text"
                      value={formattedAmount}
                      onChange={e => setAmount(digitsOnly(e.target.value))}
                      placeholder="Nhß║¡p sß╗æ tiß╗ün"
                    />
                  </div>
                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ph╞░╞íng thß╗⌐c</label>
                    <SearchableSelect className={styles.input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                      <option value="CASH">Tiß╗ün mß║╖t</option>
                      <option value="BANK_TRANSFER">Chuyß╗ân khoß║ún</option>
                    </SearchableSelect>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <label className={styles.label}>Ghi ch├║</label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Nß╗Öi dung thu/chi"
                  />
                </div>

                <div className={styles.formActions}>
                  <button className={styles.btnDraft} disabled={saving} onClick={() => submit('DRAFT')} type="button">
                    L╞░u tß║ím
                  </button>
                  <button className={styles.btnPost} disabled={saving || Number(debtBalance || 0) <= 0} onClick={() => submit('POSTED')} type="button">
                    <i className="bi bi-check2-circle" /> Ghi sß╗ò
                  </button>
                </div>
              </>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>
                <i className="bi bi-clock-history" /> Lß╗ïch sß╗¡ thu chi
              </div>
              <div className={styles.historyTools}>
                <span className={styles.historyCount}>{Math.min(history.length, 5)} gß║ºn nhß║Ñt</span>
                {history.length > 0 && (
                  <button className={styles.linkButton} onClick={handleExportExcel} type="button" title="Xuß║Ñt tß╗çp Excel" style={{ marginRight: 8 }}>
                    <i className="bi bi-file-earmark-excel" /> Xuß║Ñt Excel
                  </button>
                )}
                {partnerId && (
                  <button className={styles.linkButton} onClick={openFullHistory} type="button">
                    Xem tß║Ñt cß║ú
                  </button>
                )}
              </div>
            </div>
            <div className={styles.historyList}>
              {recentHistory.length > 0 && (
                <div className={styles.historyHeader}>
                  <span>Chß╗⌐ng tß╗½</span>
                  <span className={styles.textRight}>Sß╗æ tiß╗ün</span>
                </div>
              )}
              {history.length === 0 ? (
                <div className={styles.empty}>Ch╞░a c├│ phiß║┐u thu/chi</div>
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
                          title="In phiß║┐u"
                        >
                          <i className="bi bi-printer"></i>
                        </button>
                        <span className={item.status === 'POSTED' ? styles.statusPosted : styles.statusDraft}>{statusText(item.status)}</span>
                      </div>
                    </div>
                    <span>{item.type === 'RECEIPT' ? 'Phiß║┐u thu' : 'Phiß║┐u chi'} - {item.paymentMethod === 'CASH' ? 'Tiß╗ün mß║╖t' : 'Chuyß╗ân khoß║ún'}</span>
                    <span className={styles.historyMeta}>
                      <i className="bi bi-calendar3" /> {formatPaymentDateTime(item.createdAt)}
                    </span>
                    <span className={styles.historyNote}>
                      <i className="bi bi-chat-left-text" /> {item.note || 'Kh├┤ng c├│ ghi ch├║'}
                    </span>
                  </div>
                  <div className={styles.historyAmount}>
                    <strong>{money(item.amount)} ─æ</strong>
                    {item.status === 'DRAFT' && (
                      <button
                        className={styles.btnPostInline}
                        disabled={postingId === item.id || saving}
                        onClick={() => postDraftPayment(item)}
                        type="button"
                      >
                        <i className="bi bi-check2-circle" /> Ghi sß╗ò
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
