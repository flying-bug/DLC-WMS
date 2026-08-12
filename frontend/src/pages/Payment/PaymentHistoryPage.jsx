import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import * as customerApi from '../../api/customerApi';
import * as purchaseOrderApi from '../../api/purchaseOrderApi';
import * as paymentApi from '../../api/paymentApi';
import styles from './PaymentHistoryPage.module.css';
import { formatDateTime } from '../../utils/dateFormat';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const unwrap = (res) => res?.data?.data ?? res?.data;
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const statusText = (status) => (status === 'POSTED' ? 'Ghi sß╗ò' : status === 'DRAFT' ? 'Nh├íp' : status || '-');
const formatPaymentDateTime = (value) => value ? formatDateTime(value, { withSeconds: false }) : '-';

const entityTypeLabel = (type) => {
  switch (type) {
    case 'INVENTORY_IMPORT':
      return { text: 'Nhß║¡p kho', className: styles.typeImport, icon: 'bi-box-arrow-in-down' };
    case 'INVENTORY_EXPORT_SO':
      return { text: 'Xuß║Ñt kho b├ín', className: styles.typeExport, icon: 'bi-box-arrow-up-right' };
    case 'SALES_ORDER':
      return { text: '─É╞ín b├ín h├áng', className: styles.typeOrder, icon: 'bi-cart-check' };
    case 'PURCHASE_ORDER':
      return { text: '─É╞ín mua h├áng', className: styles.typePo, icon: 'bi-bag-plus' };
    case 'PAYMENT_RECEIPT':
      return { text: 'Phiß║┐u thu', className: styles.typeReceipt, icon: 'bi-arrow-down-circle' };
    case 'PAYMENT_VOUCHER':
      return { text: 'Phiß║┐u chi', className: styles.typeVoucher, icon: 'bi-arrow-up-circle' };
    default:
      return { text: type || 'Chß╗⌐ng tß╗½', className: styles.typeDefault, icon: 'bi-file-text' };
  }
};

function PaymentHistoryPage() {
  const { partnerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = searchParams.get('mode') === 'VOUCHER' ? 'VOUCHER' : 'RECEIPT';
  const partnerTypeLabel = mode === 'RECEIPT' ? 'kh├ích h├áng' : 'nh├á cung cß║Ñp';

  const [partner, setPartner] = useState(null);
  const [debtBalance, setDebtBalance] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState(null);

  // Filters for left column (Invoices & Import/Export Docs)
  const [leftKeyword, setLeftKeyword] = useState('');
  const [leftTypeFilter, setLeftTypeFilter] = useState('ALL');

  // Filters for right column (Payments - Receipts / Vouchers)
  const [rightKeyword, setRightKeyword] = useState('');
  const [rightStatusFilter, setRightStatusFilter] = useState('ALL');

  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const loadData = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const partnerRequest = mode === 'RECEIPT'
        ? customerApi.getCustomerById(partnerId)
        : purchaseOrderApi.getSupplierById(partnerId);

      const [partnerRes, balanceRes, ledgerRes, historyRes] = await Promise.allSettled([
        partnerRequest,
        paymentApi.getPartnerDebtBalance(partnerId),
        paymentApi.getPartnerLedgerDetails(partnerId),
        paymentApi.getPartnerPaymentHistory(partnerId),
      ]);

      if (partnerRes.status === 'fulfilled') {
        setPartner(unwrap(partnerRes.value));
      }
      if (balanceRes.status === 'fulfilled') {
        setDebtBalance(Number(unwrap(balanceRes.value) || 0));
      }
      if (ledgerRes.status === 'fulfilled') {
        setLedgerEntries(unwrap(ledgerRes.value) || []);
      }
      if (historyRes.status === 'fulfilled') {
        setPaymentHistory(unwrap(historyRes.value) || []);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Kh├┤ng thß╗â tß║úi chi tiß║┐t c├┤ng nß╗ú ─æß╗æi t├íc');
    } finally {
      setLoading(false);
    }
  }, [mode, partnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Left Column: Invoices & Inventory Import/Export records (debt increasing entries)
  const filteredInvoices = useMemo(() => {
    const kw = leftKeyword.trim().toLowerCase();
    return ledgerEntries.filter(item => {
      const isInvoice = Number(item.amountDebt || 0) > 0 || ['INVENTORY_IMPORT', 'INVENTORY_EXPORT_SO', 'SALES_ORDER'].includes(item.entityType);
      if (!isInvoice) return false;

      const matchesType = leftTypeFilter === 'ALL' || item.entityType === leftTypeFilter;
      const haystack = `${item.referenceCode || ''} ${item.note || ''} ${item.entityType || ''}`.toLowerCase();
      return matchesType && (!kw || haystack.includes(kw));
    });
  }, [ledgerEntries, leftKeyword, leftTypeFilter]);

  // Right Column: Payments (Receipts / Vouchers)
  const filteredPayments = useMemo(() => {
    const kw = rightKeyword.trim().toLowerCase();
    return paymentHistory.filter(item => {
      const matchesStatus = rightStatusFilter === 'ALL' || item.status === rightStatusFilter;
      const haystack = `${item.code || ''} ${item.note || ''} ${item.paymentMethod || ''} ${item.type || ''}`.toLowerCase();
      return matchesStatus && (!kw || haystack.includes(kw));
    });
  }, [paymentHistory, rightKeyword, rightStatusFilter]);

  const totals = useMemo(() => {
    const totalInvoiceAmount = ledgerEntries
      .filter(item => Number(item.amountDebt || 0) > 0)
      .reduce((sum, item) => sum + Number(item.amountDebt || 0), 0);

    const totalPaymentAmount = paymentHistory
      .filter(item => item.status === 'POSTED')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      totalInvoiceAmount,
      totalPaymentAmount,
      invoiceCount: ledgerEntries.filter(item => Number(item.amountDebt || 0) > 0).length,
      paymentCount: paymentHistory.length,
      draftPaymentCount: paymentHistory.filter(item => item.status === 'DRAFT').length,
    };
  }, [ledgerEntries, paymentHistory]);

  const partnerLabel = partner
    ? `${partner.code || ''} - ${partner.name || ''}`.trim()
    : location.state?.partnerLabel || `ID ${partnerId}`;

  const postDraftPayment = async (item) => {
    if (!item?.id || item.status !== 'DRAFT') return;
    setPostingId(item.id);
    try {
      await paymentApi.postPayment(item.id);
      await loadData();
      showToast('success', 'Ghi sß╗ò phiß║┐u nh├íp th├ánh c├┤ng');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Kh├┤ng thß╗â ghi sß╗ò phiß║┐u nh├íp');
    } finally {
      setPostingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <div className={styles.breadcrumb}>Thu chi &amp; C├┤ng nß╗ú / Chi tiß║┐t c├┤ng nß╗ú ─æß╗æi t├íc</div>
            <h1 className={styles.title}>Chi tiß║┐t c├┤ng nß╗ú {partnerTypeLabel}</h1>
            <p className={styles.subtitle}>
              <i className="bi bi-person-lines-fill" /> {partnerLabel} {partner?.phone ? ` | S─ÉT: ${partner.phone}` : ''}
            </p>
          </div>
          <button className={styles.backButton} onClick={() => navigate('/payments')} type="button">
            <i className="bi bi-arrow-left" /> Quay lß║íi thu chi
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardPrimary}`}>
            <span>C├┤ng nß╗ú hiß╗çn tß║íi</span>
            <strong>{money(debtBalance)} ─æ</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Tß╗òng gi├í trß╗ï ph├ít sinh nß╗ú (H├│a ─æ╞ín)</span>
            <strong>{money(totals.totalInvoiceAmount)} ─æ</strong>
            <small>{totals.invoiceCount} chß╗⌐ng tß╗½</small>
          </div>
          <div className={styles.summaryCard}>
            <span>Tß╗òng tiß╗ün ─æ├ú thu / chi (─É├ú ghi sß╗ò)</span>
            <strong className={styles.textSuccess}>{money(totals.totalPaymentAmount)} ─æ</strong>
            <small>{totals.paymentCount} phiß║┐u ({totals.draftPaymentCount} nh├íp)</small>
          </div>
          <div className={styles.summaryCard}>
            <span>Tß╗òng sß╗æ giao dß╗ïch ph├ít sinh</span>
            <strong>{totals.invoiceCount + totals.paymentCount}</strong>
            <small>Cß║¡p nhß║¡t tß╗▒ ─æß╗Öng tß╗½ sß╗ò c├íi</small>
          </div>
        </div>

        {/* Split 2-Column Main Layout */}
        <div className={styles.splitGrid}>
          {/* Left Column: H├│a ─æ╞ín Nhß║¡p / Xuß║Ñt kho & Chß╗⌐ng tß╗½ ph├ít sinh nß╗ú */}
          <section className={styles.columnCard}>
            <div className={styles.columnHeader}>
              <div className={styles.columnTitle}>
                <i className="bi bi-journal-bookmark-fill" /> H├│a ─æ╞ín &amp; Chß╗⌐ng tß╗½ Nhß║¡p/Xuß║Ñt ({filteredInvoices.length})
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <i className="bi bi-search" />
                <input
                  value={leftKeyword}
                  onChange={e => setLeftKeyword(e.target.value)}
                  placeholder="T├¼m m├ú chß╗⌐ng tß╗½, ghi ch├║..."
                />
              </div>
              <SearchableSelect
                className={styles.select}
                value={leftTypeFilter}
                onChange={e => setLeftTypeFilter(e.target.value)}
              >
                <option value="ALL">Tß║Ñt cß║ú loß║íi chß╗⌐ng tß╗½</option>
                <option value="INVENTORY_IMPORT">Nhß║¡p kho nh├á cung cß║Ñp</option>
                <option value="INVENTORY_EXPORT_SO">Xuß║Ñt kho b├ín h├áng</option>
                <option value="SALES_ORDER">─É╞ín b├ín h├áng</option>
              </SearchableSelect>
            </div>
            <SearchableSelect className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">Tß║Ñt cß║ú trß║íng th├íi</option>
              <option value="POSTED">Ghi sß╗ò</option>
              <option value="DRAFT">Nh├íp</option>
            </SearchableSelect>
          </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>M├ú chß╗⌐ng tß╗½</th>
                    <th>Loß║íi</th>
                    <th>Thß╗¥i gian</th>
                    <th className={styles.textRight}>Sß╗æ tiß╗ün ph├ít sinh</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className={styles.empty}>─Éang tß║úi h├│a ─æ╞ín...</td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.empty}>Ch╞░a c├│ h├│a ─æ╞ín / chß╗⌐ng tß╗½ nhß║¡p xuß║Ñt</td>
                    </tr>
                  ) : (
                    filteredInvoices.map(item => {
                      const typeInfo = entityTypeLabel(item.entityType);
                      return (
                        <tr key={item.id}>
                          <td className={styles.codeCell}>
                            <i className={`bi ${typeInfo.icon}`} /> {item.referenceCode || '-'}
                          </td>
                          <td>
                            <span className={`${styles.badge} ${typeInfo.className}`}>
                              {typeInfo.text}
                            </span>
                          </td>
                          <td className={styles.dateCell}>{formatPaymentDateTime(item.createdAt)}</td>
                          <td className={`${styles.textRight} ${styles.amountDebt}`}>
                            +{money(item.amountDebt)} ─æ
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Column: Lß╗ïch sß╗¡ Thu / Chi tiß╗ün thanh to├ín */}
          <section className={styles.columnCard}>
            <div className={styles.columnHeader}>
              <div className={styles.columnTitle}>
                <i className="bi bi-cash-stack" /> Lß╗ïch sß╗¡ Thu / Chi thanh to├ín ({filteredPayments.length})
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <i className="bi bi-search" />
                <input
                  value={rightKeyword}
                  onChange={e => setRightKeyword(e.target.value)}
                  placeholder="T├¼m m├ú phiß║┐u thu/chi..."
                />
              </div>
              <SearchableSelect
                className={styles.select}
                value={rightStatusFilter}
                onChange={e => setRightStatusFilter(e.target.value)}
              >
                <option value="ALL">Tß║Ñt cß║ú trß║íng th├íi</option>
                <option value="POSTED">Ghi sß╗ò</option>
                <option value="DRAFT">Nh├íp</option>
              </SearchableSelect>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>M├ú phiß║┐u</th>
                    <th>Loß║íi</th>
                    <th>Ph╞░╞íng thß╗⌐c</th>
                    <th>Trß║íng th├íi</th>
                    <th className={styles.textRight}>Sß╗æ tiß╗ün</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>─Éang tß║úi phiß║┐u thu/chi...</td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>Ch╞░a c├│ phiß║┐u thu / chi thanh to├ín</td>
                    </tr>
                  ) : (
                    filteredPayments.map(item => (
                      <tr key={item.id}>
                        <td className={styles.codeCell}>{item.code}</td>
                        <td>
                          <span className={item.type === 'RECEIPT' ? styles.typeReceipt : styles.typeVoucher}>
                            {item.type === 'RECEIPT' ? 'Phiß║┐u thu' : 'Phiß║┐u chi'}
                          </span>
                        </td>
                        <td>{item.paymentMethod === 'CASH' ? 'Tiß╗ün mß║╖t' : 'Chuyß╗ân khoß║ún'}</td>
                        <td>
                          <span className={item.status === 'POSTED' ? styles.statusPosted : styles.statusDraft}>
                            {statusText(item.status)}
                          </span>
                        </td>
                        <td className={`${styles.textRight} ${styles.amountReceipt}`}>
                          -{money(item.amount)} ─æ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
    </AdminLayout>
  );
}

export default PaymentHistoryPage;
