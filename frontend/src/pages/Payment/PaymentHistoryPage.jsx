import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as customerApi from '../../api/customerApi';
import * as purchaseOrderApi from '../../api/purchaseOrderApi';
import * as paymentApi from '../../api/paymentApi';
import styles from './PaymentHistoryPage.module.css';
import { formatDateTime } from '../../utils/dateFormat';
import { printPaymentReceipt } from '../../utils/printPaymentReceipt';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';

const unwrap = (res) => res?.data?.data ?? res?.data;
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const statusText = (status) => (status === 'POSTED' ? 'Ghi sổ' : status === 'DRAFT' ? 'Nháp' : status || '-');
const formatPaymentDateTime = (value) => value ? formatDateTime(value, { withSeconds: false }) : '-';

const entityTypeLabel = (type) => {
  switch (type) {
    case 'INVENTORY_IMPORT':
      return { text: 'Nhập kho', className: styles.typeImport, icon: 'bi-box-arrow-in-down' };
    case 'INVENTORY_EXPORT_SO':
      return { text: 'Xuất kho bán', className: styles.typeExport, icon: 'bi-box-arrow-up-right' };
    case 'SALES_ORDER':
      return { text: 'Đơn bán hàng', className: styles.typeOrder, icon: 'bi-cart-check' };
    case 'PURCHASE_ORDER':
      return { text: 'Đơn mua hàng', className: styles.typePo, icon: 'bi-bag-plus' };
    case 'PAYMENT_RECEIPT':
      return { text: 'Phiếu thu', className: styles.typeReceipt, icon: 'bi-arrow-down-circle' };
    case 'PAYMENT_VOUCHER':
      return { text: 'Phiếu chi', className: styles.typeVoucher, icon: 'bi-arrow-up-circle' };
    default:
      return { text: type || 'Chứng từ', className: styles.typeDefault, icon: 'bi-file-text' };
  }
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
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

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
      showToast('error', 'Không thể tải chi tiết công nợ đối tác');
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
      showToast('success', 'Ghi sổ phiếu nháp thành công');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể ghi sổ phiếu nháp');
    } finally {
      setPostingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem?.id) return;
    try {
      await paymentApi.deletePayment(deletingItem.id);
      await loadData();
      showToast('success', `Đã xóa phiếu nháp ${deletingItem.code}`);
      setDeletingItem(null);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể xóa phiếu nháp');
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <div className={styles.breadcrumb}>Thu chi &amp; Công nợ / Chi tiết công nợ đối tác</div>
            <h1 className={styles.title}>Chi tiết công nợ {partnerTypeLabel}</h1>
            <p className={styles.subtitle}>
              <i className="bi bi-person-lines-fill" /> {partnerLabel} {partner?.phone ? ` | SĐT: ${partner.phone}` : ''}
            </p>
          </div>
          <button className={styles.backButton} onClick={() => navigate(mode === 'VOUCHER' ? '/payments/expense' : '/payments/receipt')} type="button">
            <i className="bi bi-arrow-left" /> Quay lại thu chi
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardPrimary}`}>
            <span>Công nợ hiện tại</span>
            <strong>{money(debtBalance)} đ</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Tổng giá trị phát sinh nợ (Hóa đơn)</span>
            <strong>{money(totals.totalInvoiceAmount)} đ</strong>
            <small>{totals.invoiceCount} chứng từ</small>
          </div>
          <div className={styles.summaryCard}>
            <span>Tổng tiền đã thu / chi (Đã ghi sổ)</span>
            <strong className={styles.textSuccess}>{money(totals.totalPaymentAmount)} đ</strong>
            <small>{totals.paymentCount} phiếu ({totals.draftPaymentCount} nháp)</small>
          </div>
          <div className={styles.summaryCard}>
            <span>Tổng số giao dịch phát sinh</span>
            <strong>{totals.invoiceCount + totals.paymentCount}</strong>
            <small>Cập nhật tự động từ sổ cái</small>
          </div>
        </div>

        {/* Split 2-Column Main Layout */}
        <div className={styles.splitGrid}>
          {/* Left Column: Hóa đơn Nhập / Xuất kho & Chứng từ phát sinh nợ */}
          <section className={styles.columnCard}>
            <div className={styles.columnHeader}>
              <div className={styles.columnTitle}>
                <i className="bi bi-journal-bookmark-fill" /> Hóa đơn &amp; Chứng từ Nhập/Xuất ({filteredInvoices.length})
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <i className="bi bi-search" />
                <input
                  value={leftKeyword}
                  onChange={e => setLeftKeyword(e.target.value)}
                  placeholder="Tìm mã chứng từ, ghi chú..."
                />
              </div>
              <SearchableSelect
                className={styles.select}
                value={leftTypeFilter}
                onChange={e => setLeftTypeFilter(e.target.value)}
              >
                <option value="ALL">Tất cả loại chứng từ</option>
                <option value="INVENTORY_IMPORT">Nhập kho nhà cung cấp</option>
                <option value="INVENTORY_EXPORT_SO">Xuất kho bán hàng</option>
                <option value="SALES_ORDER">Đơn bán hàng</option>
              </SearchableSelect>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã chứng từ</th>
                    <th>Loại</th>
                    <th>Thời gian</th>
                    <th className={styles.textRight}>Số tiền phát sinh</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className={styles.empty}>Đang tải hóa đơn...</td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.empty}>Không có hóa đơn phát sinh nợ</td>
                    </tr>
                  ) : (
                    filteredInvoices.map(item => {
                      const typeInfo = entityTypeLabel(item.entityType);
                      return (
                        <tr key={item.id}>
                          <td className={styles.codeCell}>
                            <span className={styles.codeText}>{item.referenceCode || item.docCode || `#${item.referenceId || item.id}`}</span>
                            {item.note && <div className={styles.codeNote} title={item.note}>{item.note}</div>}
                          </td>
                          <td className={styles.nowrapCell}>
                            <span className={`${styles.badge} ${typeInfo.className}`}>
                              {typeInfo.text}
                            </span>
                          </td>
                          <td className={styles.dateCell}>{formatPaymentDateTime(item.createdAt)}</td>
                          <td className={`${styles.textRight} ${styles.amountDebt}`}>
                            +{money(item.amountDebt)} đ
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Column: Lịch sử thanh toán */}
          <section className={styles.columnCard}>
            <div className={styles.columnHeader}>
              <div className={styles.columnTitle}>
                <i className="bi bi-cash-stack" /> Lịch sử {mode === 'RECEIPT' ? 'thu' : 'chi'} thanh toán ({filteredPayments.length})
              </div>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <i className="bi bi-search" />
                <input
                  value={rightKeyword}
                  onChange={e => setRightKeyword(e.target.value)}
                  placeholder={`Tìm mã phiếu ${mode === 'RECEIPT' ? 'thu' : 'chi'}...`}
                />
              </div>
              <SearchableSelect
                className={styles.select}
                value={rightStatusFilter}
                onChange={e => setRightStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="POSTED">Ghi sổ</option>
                <option value="DRAFT">Nháp</option>
              </SearchableSelect>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Loại</th>
                    <th>Phương thức</th>
                    <th>Trạng thái</th>
                    <th className={styles.textRight}>Số tiền</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>Đang tải phiếu {mode === 'RECEIPT' ? 'thu' : 'chi'}...</td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>Chưa có phiếu {mode === 'RECEIPT' ? 'thu' : 'chi'} thanh toán</td>
                    </tr>
                  ) : (
                    filteredPayments.map(item => (
                      <tr key={item.id}>
                        <td className={styles.codeCell}>
                          <span className={styles.codeText}>{item.code}</span>
                          {item.note && <div className={styles.codeNote} title={item.note}>{item.note}</div>}
                        </td>
                        <td className={styles.nowrapCell}>
                          <span className={`${styles.badge} ${item.type === 'RECEIPT' ? styles.typeReceipt : styles.typeVoucher}`}>
                            {item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}
                          </span>
                        </td>
                        <td className={styles.nowrapCell}>{item.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</td>
                        <td className={styles.nowrapCell}>
                          <span className={item.status === 'POSTED' ? styles.statusPosted : styles.statusDraft}>
                            {statusText(item.status)}
                          </span>
                        </td>
                        <td className={`${styles.textRight} ${styles.amountReceipt}`}>
                          -{money(item.amount)} đ
                        </td>
                        <td className={styles.nowrapCell} style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                            <button
                              className={styles.btnActionSmall}
                              onClick={() => printPaymentReceipt(item, { partnerName: partner?.name || '', salespersonName: '' })}
                              title="In phiếu"
                            >
                              <i className="bi bi-printer" />
                            </button>
                            {item.status === 'DRAFT' && (
                              <>
                                <button
                                  className={styles.postButton}
                                  disabled={postingId === item.id}
                                  onClick={() => postDraftPayment(item)}
                                  title="Ghi sổ phiếu nháp"
                                  style={{ borderRadius: 4, padding: '2px 6px', fontSize: 11 }}
                                >
                                  Ghi sổ
                                </button>
                                <button
                                  className={styles.btnActionSmallDelete}
                                  onClick={() => setDeletingItem(item)}
                                  title="Xóa phiếu nháp"
                                >
                                  <i className="bi bi-trash" />
                                </button>
                              </>
                            )}
                          </div>
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

      <ConfirmModal
        isOpen={!!deletingItem}
        title="Xóa phiếu nháp"
        message={`Bạn có chắc chắn muốn xóa phiếu nháp "${deletingItem?.code}" số tiền ${money(deletingItem?.amount)} đ không? Thao tác này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
        confirmText="Xóa phiếu"
        isDanger={true}
      />

      <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
    </AdminLayout>
  );
}

export default PaymentHistoryPage;
