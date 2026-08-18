import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as soApi from '../../api/salesOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import { printSalesInvoice } from '../../utils/printSalesInvoice';
import { printQuotation } from '../../utils/printQuotation';
import styles from './SalesOrderDetailPage.module.css';
import { formatDateOnly, formatDateTime } from '../../utils/dateFormat';

const unwrap = (res) => res?.data?.data ?? res?.data;
const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const formatMoneyInput = (value) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
};
const fmtDate = (v) => (v ? formatDateOnly(v) : '—');
const fmtDateTime = (v) => (v ? formatDateTime(v) : '—');

const STATUS_CONFIG = {
  DRAFT: { label: 'Nháp', bg: '#f1f5f9', color: '#64748b', icon: 'bi-pencil-square' },
  APPROVED: { label: 'Đã duyệt', bg: '#dcfce7', color: '#16a34a', icon: 'bi-check-circle-fill' },
  POSTED: { label: 'Ghi sổ', bg: '#ede9fe', color: '#7c3aed', icon: 'bi-bag-check-fill' },
  CANCELLED: { label: 'Đã hủy', bg: '#fef2f2', color: '#dc2626', icon: 'bi-x-circle-fill' },
};

const PAYMENT_STATUS_CONFIG = {
  UNPAID: { label: 'Chưa thanh toán', bg: '#fee2e2', color: '#991b1b', icon: 'bi-dash-circle' },
  PARTIAL: { label: 'Trả một phần', bg: '#fef08a', color: '#854d0e', icon: 'bi-pie-chart-fill' },
  PAID: { label: 'Đã thanh toán', bg: '#dcfce7', color: '#166534', icon: 'bi-check-circle-fill' },
};

const RES_STATUS_CONFIG = {
  HOLDING: { label: 'Đang giữ', bg: '#fef9c3', color: '#ca8a04' },
  BACKORDERED: { label: 'Chờ nhập', bg: '#fee2e2', color: '#dc2626' },
  FULFILLED: { label: 'Đã xuất kho', bg: '#dcfce7', color: '#16a34a' },
  RELEASED: { label: 'Đã hủy', bg: '#f1f5f9', color: '#64748b' },
};

function SalesOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [now] = useState(() => Date.now());

  const [so, setSo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [existingDraftExport, setExistingDraftExport] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const handlePrintQuote = () => {
    printQuotation(so);
  };

  const handlePrintInvoice = () => {
    printSalesInvoice(so);
  };

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

  const handleOpenEmailModal = () => {
    setEmailTo(so?.partnerEmail || '');
    setEmailMessage('');
    setShowEmailPreview(false);
    setEmailModalOpen(true);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo || !emailTo.trim()) {
      showToast('error', 'Vui lòng nhập địa chỉ email nhận');
      return;
    }
    setSendingEmail(true);
    try {
      await soApi.sendQuoteEmail(id, { toEmail: emailTo.trim(), message: emailMessage.trim() });
      showToast('success', `Đã gửi báo giá thành công đến email ${emailTo.trim()}!`);
      setEmailModalOpen(false);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Gửi email báo giá thất bại');
    } finally {
      setSendingEmail(false);
    }
  };

  const loadSo = async () => {
    setLoading(true);
    try {
      const res = await soApi.getSalesOrderById(id);
      setSo(unwrap(res));
    } catch {
      showToast('error', 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSo(); }, [id]);

  useEffect(() => {
    if (so && so.status === 'APPROVED') {
      exportApi.getExportHistory({ referenceType: 'SALES_ORDER', referenceId: so.id })
        .then(res => {
          const docs = unwrap(res) || [];
          const draft = docs.find(d => ['DRAFT', 'SUBMITTED'].includes(d.status));
          setExistingDraftExport(draft || null);
        })
        .catch(err => console.error(err));
    }
  }, [so]);

  const handleApprove = async () => {
    try {
      const res = await soApi.approveSalesOrder(id);
      setSo(unwrap(res));
      showToast('success', 'Duyệt đơn thành công! Hàng hóa đã được giữ chỗ 72 giờ.');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể duyệt đơn hàng');
    }
    setConfirmApprove(false);
  };

  const handleCancel = async () => {
    try {
      const res = await soApi.cancelSalesOrder(id);
      setSo(unwrap(res));
      showToast('success', 'Đã hủy đơn hàng. Tồn kho đã được giải phóng.');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể hủy đơn hàng');
    }
    setConfirmCancel(false);
  };

  const handleCreateExport = () => {
    const exportableLines = (so.lines || [])
      .map(l => {
        const rem = l.remainingQuantity !== undefined && l.remainingQuantity !== null
          ? Number(l.remainingQuantity)
          : Number(l.quantity || 1);
        return {
          variantId: String(l.variantId),
          warehouseId: l.warehouseId,
          warehouseName: l.warehouseName,
          quantity: rem,
          maxQuantity: rem,
          orderedQuantity: l.quantity,
          exportedQuantity: l.exportedQuantity || 0,
          price: l.unitPrice || l.price || 0,
          unitName: l.unitName || '',
          vatPercent: l.vatRate || l.vatPercent || 0,
          warrantyMonths: l.warrantyMonths || 0,
          note: l.note || '',
        };
      })
      .filter(l => l.quantity > 0);

    if (exportableLines.length === 0) {
      showToast('info', 'Đơn hàng này đã xuất kho đủ toàn bộ sản phẩm');
      return;
    }

    navigate('/export-slips/create', {
      state: {
        soData: {
          soId: so.id,
          soCode: so.soCode,
          warehouseId: so.warehouseId,
          partnerId: so.partnerId,
          partnerName: so.partnerName,
          partnerCode: so.partnerCode,
          partnerPhone: so.partnerPhone,
          partnerAddress: so.partnerAddress,
          note: so.note || `Xuất kho theo đơn hàng ${so.soCode}`,
          salespersonId: so.salespersonId,
          lines: exportableLines,
        },
        returnUrl: `/sales-orders/${id}`,
      }
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      showToast('error', 'Số tiền thanh toán phải lớn hơn 0');
      return;
    }
    setRecordingPayment(true);
    try {
      const res = await soApi.recordPayment(id, Number(paymentAmount));
      setSo(unwrap(res));
      showToast('success', 'Đã ghi nhận thanh toán thành công!');
      setPaymentModalOpen(false);
      setPaymentAmount('');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể ghi nhận thanh toán');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
      </AdminLayout>
    );
  }

  if (!so) {
    return (
      <AdminLayout>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>Không tìm thấy đơn hàng</p>
          <button onClick={() => navigate('/sales-orders')} className={styles.btnSecondary}>← Quay lại</button>
        </div>
      </AdminLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[so.status] || { label: so.status, bg: '#f1f5f9', color: '#64748b', icon: 'bi-circle' };
  const subTotalAmount = so.subTotalAmount || (so.lines || []).reduce((s, l) => s + Number(l.lineAmount || 0), 0);
  const taxAmount = so.taxAmount || 0;
  const totalAmount = so.totalAmount || (subTotalAmount + taxAmount);

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Breadcrumb ── */}
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbLink} onClick={() => navigate('/sales-orders')}>Đơn bán hàng</span>
          <i className="bi bi-chevron-right" style={{ margin: '0 6px', fontSize: 12 }} />
          <span>{so.soCode}</span>
        </div>

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.docCode}>{so.soCode}</div>
            <span
              className={styles.statusBadge}
              style={{ background: statusCfg.bg, color: statusCfg.color }}
            >
              <i className={`bi ${statusCfg.icon}`} style={{ marginRight: 5 }} />
              {statusCfg.label}
            </span>
            {so.paymentStatus && (
              <span
                className={styles.statusBadge}
                style={{
                  background: PAYMENT_STATUS_CONFIG[so.paymentStatus]?.bg || '#f1f5f9',
                  color: PAYMENT_STATUS_CONFIG[so.paymentStatus]?.color || '#64748b'
                }}
              >
                <i className={`bi ${PAYMENT_STATUS_CONFIG[so.paymentStatus]?.icon || 'bi-circle'}`} style={{ marginRight: 5 }} />
                {PAYMENT_STATUS_CONFIG[so.paymentStatus]?.label || so.paymentStatus}
              </span>
            )}
          </div>

          <div className={styles.headerActions}>
            {so.status !== 'CANCELLED' && (
              <>
                {so.status === 'POSTED' ? (
                  <>
                    <button className={styles.btnPrimary} onClick={handlePrintInvoice}>
                      <i className="bi bi-printer" /> In Hóa đơn
                    </button>
                    <button className={styles.btnPrimary} onClick={handleOpenEmailModal} style={{ backgroundColor: '#0284c7' }}>
                      <i className="bi bi-envelope" /> Gửi Email Hóa đơn
                    </button>
                  </>
                ) : (
                  <>
                    <button className={styles.btnPrimary} onClick={handlePrintQuote}>
                      <i className="bi bi-printer" /> In Báo giá
                    </button>
                    <button className={styles.btnPrimary} onClick={handleOpenEmailModal} style={{ backgroundColor: '#0284c7' }}>
                      <i className="bi bi-envelope" /> Gửi Email Báo giá
                    </button>
                  </>
                )}
              </>
            )}
            {so.status === 'DRAFT' && (
              <>
                <button className={styles.btnOutline} onClick={() => navigate(`/sales-orders/${id}/edit`)}>
                  <i className="bi bi-pencil" /> Chỉnh sửa
                </button>
                <button className={styles.btnSuccess} onClick={() => setConfirmApprove(true)}>
                  <i className="bi bi-check-circle" /> Duyệt đơn
                </button>
              </>
            )}
            {['APPROVED', 'POSTED'].includes(so.status) && so.paymentStatus !== 'PAID' && (
              <button className={styles.btnSuccess} onClick={() => setPaymentModalOpen(true)}>
                <i className="bi bi-cash-coin" /> Ghi nhận thanh toán
              </button>
            )}
            {so.status === 'APPROVED' && (
              <>
                {existingDraftExport ? (
                  <button
                    className={styles.btnWarning}
                    onClick={() => navigate(`/export-slips/${existingDraftExport.id}/edit`)}
                  >
                    <i className="bi bi-arrow-right-circle" /> Tiếp tục xuất kho
                  </button>
                ) : so.isFullyExported ? (
                  <button className={styles.btnSecondary} disabled title="Đơn hàng này đã xuất kho đủ 100%">
                    <i className="bi bi-check-all" /> Đã xuất kho đủ
                  </button>
                ) : (
                  <button
                    className={styles.btnPrimary}
                    onClick={handleCreateExport}
                  >
                    <i className="bi bi-box-arrow-right" /> Tạo phiếu xuất kho
                  </button>
                )}
              </>
            )}
            {so.status === 'DRAFT' && (
              <button className={styles.btnDanger} onClick={() => setConfirmCancel(true)}>
                <i className="bi bi-x-circle" /> Hủy đơn
              </button>
            )}
          </div>
        </div>

        {/* ── Info Grid ── */}
        <div className={styles.infoGrid}>
          {/* Thông tin đơn hàng */}
          <div className={styles.card}>
            <div className={styles.cardTitle}><i className="bi bi-info-circle" /> Thông tin đơn hàng</div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Mã đơn:</span><span className={styles.infoValue}>{so.soCode}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Ngày lập:</span><span className={styles.infoValue}>{fmtDate(so.soDate)}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Người tạo:</span><span className={styles.infoValue}>{so.createdByName || `#${so.createdBy}`}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Ngày tạo:</span><span className={styles.infoValue}>{fmtDateTime(so.createdAt)}</span></div>
            </div>
          </div>

          {/* Khách hàng */}
          <div className={styles.card}>
            <div className={styles.cardTitle}><i className="bi bi-person" /> Khách hàng</div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Mã KH:</span><span className={styles.infoValue}>{so.partnerCode || '—'}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Tên KH:</span><span className={`${styles.infoValue} ${styles.highlight}`}>{so.partnerName || '—'}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Điện thoại:</span><span className={styles.infoValue}>{so.partnerPhone || '—'}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Địa chỉ giao hàng:</span><span className={styles.infoValue}>{so.deliveryAddress || '—'}</span></div>
            </div>
          </div>

          {/* Kho & Tài chính */}
          <div className={styles.card}>
            <div className={styles.cardTitle}><i className="bi bi-building" /> Kho & Tài chính</div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Kho:</span><span className={`${styles.infoValue} ${styles.highlight}`}>{so.warehouseName || 'Theo từng dòng'}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Hạn thanh toán:</span><span className={styles.infoValue}>{fmtDate(so.paymentDueDate)}</span></div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tiền hàng:</span>
                <span className={styles.infoValue} style={{ fontWeight: 600 }}>{money(subTotalAmount)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Thuế VAT:</span>
                <span className={styles.infoValue} style={{ fontWeight: 600, color: '#dc2626' }}>{money(taxAmount)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tổng cộng:</span>
                <span className={styles.infoValue} style={{ fontWeight: 700, color: '#16a34a' }}>{money(totalAmount)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Đã thanh toán:</span>
                <span className={styles.infoValue} style={{ color: '#16a34a', fontWeight: 600 }}>{money(so.paidAmount)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Còn nợ:</span>
                <span className={styles.infoValue} style={{ color: '#dc2626', fontWeight: 600 }}>
                  {money(totalAmount - (so.paidAmount || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Lines Table ── */}
        <div className={styles.card}>
          <div className={styles.cardTitle}><i className="bi bi-list-ul" /> Danh sách hàng hóa ({(so.lines || []).length} dòng)</div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Tên sản phẩm</th>
                  <th style={{ width: 140 }}>Kho xuất</th>
                  <th style={{ textAlign: 'center' }}>ĐVT</th>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'center' }}>BH (T)</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  <th style={{ textAlign: 'center' }}>% VAT</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {(so.lines || []).map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td>{idx + 1}</td>
                    <td><span className={styles.skuBadge}>{line.sku || `#${line.variantId}`}</span></td>
                    <td>{line.variantName || '—'}</td>
                    <td style={{ color: '#1e40af', fontWeight: 500 }}>{line.warehouseName || (line.warehouseId ? `Kho #${line.warehouseId}` : '—')}</td>
                    <td style={{ textAlign: 'center', color: '#475569' }}>{line.unitName || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{Number(line.quantity).toLocaleString('vi-VN')}</td>
                    <td style={{ textAlign: 'center' }}>{line.warrantyMonths || 0}</td>
                    <td style={{ textAlign: 'right' }}>{money(line.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>{money(line.lineAmount)}</td>
                    <td style={{ textAlign: 'center' }}>{line.vatRate || 0}</td>
                    <td style={{ color: '#64748b' }}>{line.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={9} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Tiền hàng:</td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#1d4ed8', fontSize: 15 }}>{money(subTotalAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={9} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Thuế VAT:</td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#dc2626', fontSize: 15 }}>{money(taxAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={9} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Tổng thanh toán:</td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#16a34a', fontSize: 15 }}>{money(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Reservations ── */}
        {so.reservations && so.reservations.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <i className="bi bi-shield-lock" /> Hàng hóa đang giữ chỗ ({so.reservations.length} dòng)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Sản phẩm</th>
                    <th>Kho</th>
                    <th style={{ textAlign: 'center' }}>Số lượng giữ</th>
                    <th>Trạng thái</th>
                    <th>Hết hạn lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {so.reservations.map((r, idx) => {
                    const rCfg = RES_STATUS_CONFIG[r.status] || { label: r.status, bg: '#f1f5f9', color: '#64748b' };
                    const expiredSoon = r.status === 'HOLDING' && new Date(r.expiresAt) < new Date(now + 6 * 3600000);
                    return (
                      <tr key={r.id || idx}>
                        <td><span className={styles.skuBadge}>{r.sku || `#${r.variantId}`}</span></td>
                        <td>{r.variantName || '—'}</td>
                        <td>{r.warehouseName || `Kho #${r.warehouseId}`}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(r.quantityReserved).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className={styles.resBadge} style={{ background: rCfg.bg, color: rCfg.color }}>
                            {rCfg.label}
                          </span>
                        </td>
                        <td style={{ color: expiredSoon ? '#ef4444' : '#374151' }}>
                          {fmtDateTime(r.expiresAt)}
                          {expiredSoon && <i className="bi bi-exclamation-triangle-fill" style={{ marginLeft: 5, color: '#ef4444' }} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modals ── */}
        <ConfirmModal
          isOpen={confirmApprove}
          title="Duyệt đơn bán hàng"
          message="Xác nhận duyệt đơn hàng này? Hệ thống sẽ kiểm tra tồn kho và giữ chỗ hàng hóa trong 72 giờ."
          onConfirm={handleApprove}
          onCancel={() => setConfirmApprove(false)}
        />
        <ConfirmModal
          isOpen={confirmCancel}
          title="Hủy đơn bán hàng"
          message="Xác nhận hủy đơn hàng này? Hàng hóa đang giữ chỗ sẽ được giải phóng."
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
        />
        {paymentModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 20, width: 400, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>Ghi nhận thanh toán</h3>
              <p style={{ marginBottom: 15, fontSize: 14, color: '#475569' }}>
                Còn nợ: <b style={{ color: '#dc2626' }}>{money(totalAmount - (so.paidAmount || 0))}</b>
              </p>
              <form onSubmit={handleRecordPayment}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Số tiền khách đưa</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(paymentAmount)}
                    onChange={(e) => setPaymentAmount(digitsOnly(e.target.value))}
                    placeholder="Nhập số tiền..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setPaymentModalOpen(false)}>Hủy</button>
                  <button type="submit" className={styles.btnSuccess} disabled={recordingPayment}>
                    {recordingPayment ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {emailModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: showEmailPreview ? 760 : 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-envelope-paper" style={{ color: '#0284c7' }} /> Gửi Email Báo Giá
              </h3>
              <form onSubmit={handleSendEmail}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#334155' }}>
                    Email người nhận <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="khachhang@example.com"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#334155' }}>
                    Lời nhắn đính kèm (Không bắt buộc)
                  </label>
                  <textarea
                    rows={2}
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Nhập lời nhắn kính gửi khách hàng..."
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {showEmailPreview && (
                  <div style={{ marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#f8fafc', maxHeight: 320, overflowY: 'auto' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="bi bi-eye" /> Xem trước nội dung Email
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, fontSize: 13, color: '#334155', fontFamily: 'Arial, sans-serif' }}>
                      <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: '2px solid #2563eb', paddingBottom: 10 }}>
                        <h4 style={{ color: '#2563eb', margin: 0, fontSize: 16 }}>BẢNG BÁO GIÁ SẢN PHẨM</h4>
                        <span style={{ color: '#64748b', fontSize: 12 }}>Mã báo giá: <strong>{so.soCode}</strong></span>
                      </div>
                      <p style={{ margin: '0 0 8px 0' }}>Kính gửi Quý khách hàng <strong>{so.partnerName || 'Khách hàng'}</strong>,</p>
                      <p style={{ margin: '0 0 12px 0' }}>Chúng tôi xin gửi đến Quý khách chi tiết bảng báo giá đơn hàng với nội dung cụ thể như sau:</p>

                      {emailMessage && emailMessage.trim() && (
                        <div style={{ background: '#f1f5f9', borderLeft: '4px solid #007bff', padding: '8px 12px', margin: '10px 0', fontStyle: 'italic', borderRadius: '0 4px 4px 0' }}>
                          <strong>Lời nhắn:</strong> {emailMessage.trim()}
                        </div>
                      )}

                      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#1e293b' }}>
                            <th style={{ padding: '6px 8px', textAlignment: 'center' }}>#</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Sản phẩm</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>ĐVT</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>SL</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Đơn giá</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(so.lines || []).map((line, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ padding: '6px 8px' }}>
                                <strong>{line.variantName || line.sku || '-'}</strong>
                                {line.sku && <div style={{ fontSize: 11, color: '#64748b' }}>SKU: {line.sku}</div>}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{line.unitName || ''}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(line.quantity || 0).toLocaleString('vi-VN')}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{money(line.unitPrice)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{money(line.lineAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
                        <div>Tạm tính: <strong>{money(subTotalAmount)}</strong></div>
                        <div>Thuế VAT: <strong>{money(taxAmount)}</strong></div>
                        <div style={{ fontSize: 15, color: '#dc2626', marginTop: 4 }}>Tổng cộng: <strong>{money(totalAmount)}</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setShowEmailPreview(!showEmailPreview)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                  >
                    <i className={`bi ${showEmailPreview ? 'bi-eye-slash' : 'bi-eye'}`} />
                    {showEmailPreview ? 'Ẩn xem trước' : 'Xem trước nội dung'}
                  </button>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className={styles.btnSecondary} onClick={() => setEmailModalOpen(false)} disabled={sendingEmail}>
                      Hủy
                    </button>
                    <button type="submit" className={styles.btnPrimary} style={{ backgroundColor: '#0284c7' }} disabled={sendingEmail}>
                      {sendingEmail ? 'Đang gửi email...' : 'Gửi ngay'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        <Toast
          isVisible={toast.isVisible}
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      </div>
    </AdminLayout>
  );
}

export default SalesOrderDetailPage;
