import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as soApi from '../../api/salesOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import QuotationTemplate from './components/QuotationTemplate';
import styles from './SalesOrderDetailPage.module.css';

const unwrap = (res) => res?.data?.data ?? res?.data;
const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '—');
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

const STATUS_CONFIG = {
  DRAFT: { label: 'Nháp', bg: '#f1f5f9', color: '#64748b', icon: 'bi-pencil-square' },
  APPROVED: { label: 'Đã duyệt', bg: '#dcfce7', color: '#16a34a', icon: 'bi-check-circle-fill' },
  POSTED: { label: 'Hoàn thành', bg: '#ede9fe', color: '#7c3aed', icon: 'bi-bag-check-fill' },
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

  const printRef = useRef(null);
  const handlePrintQuote = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bao-Gia-${so?.soCode || 'SO'}`,
  });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

  const handleCopyPublicLink = () => {
    if (!so) return;
    if (!so.publicToken) {
        showToast('error', 'Đơn hàng cũ chưa có mã bảo mật, vui lòng cập nhật lại đơn hàng!');
        return;
    }
    const link = `${window.location.origin}/quote/${so.publicToken}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast('success', 'Đã copy link báo giá!'))
      .catch(() => showToast('error', 'Không thể copy link'));
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
    // Navigate trực tiếp sang trang tạo phiếu xuất kho mới,
    // truyền toàn bộ thông tin SO qua location.state để tự điền
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
          lines: (so.lines || []).map(l => ({
            variantId: String(l.variantId),
            quantity: l.quantity || 1,
            price: l.unitPrice || l.price || 0,
            vatPercent: l.vatRate || l.vatPercent || 0,
            warrantyMonths: l.warrantyMonths || 0,
            note: l.note || '',
          })),
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
  const totalAmount = (so.lines || []).reduce((s, l) => s + Number(l.lineAmount || 0), 0);

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
            {so.status === 'DRAFT' && (
              <>
                <button className={styles.btnPrimary} onClick={handlePrintQuote}>
                  <i className="bi bi-printer" /> In Báo giá
                </button>
                <button className={styles.btnPrimary} onClick={handleCopyPublicLink} style={{ backgroundColor: '#2563eb' }}>
                  <i className="bi bi-link-45deg" /> Chia sẻ Link
                </button>
                <button className={styles.btnOutline} onClick={() => navigate(`/sales-orders/${id}/edit`)}>
                  <i className="bi bi-pencil" /> Sửa đơn
                </button>
              </>
            )}
            {so.status === 'DRAFT' && (
              <button className={styles.btnSuccess} onClick={() => setConfirmApprove(true)}>
                <i className="bi bi-check2-circle" /> Duyệt đơn
              </button>
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
                    className={styles.btnPrimary}
                    onClick={() => navigate(`/export-slips/${existingDraftExport.id}/edit`)}
                  >
                    <i className="bi bi-arrow-right-circle" /> Tiếp tục xuất kho
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
            {(so.status === 'DRAFT' || so.status === 'APPROVED') && (
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
            </div>
          </div>

          {/* Kho & Tài chính */}
          <div className={styles.card}>
            <div className={styles.cardTitle}><i className="bi bi-building" /> Kho & Tài chính</div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Kho:</span><span className={`${styles.infoValue} ${styles.highlight}`}>{so.warehouseName || '—'}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Hạn thanh toán:</span><span className={styles.infoValue}>{fmtDate(so.paymentDueDate)}</span></div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tổng cộng:</span>
                <span className={styles.infoValue} style={{ fontWeight: 600 }}>{money(totalAmount)}</span>
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
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {(so.lines || []).map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td>{idx + 1}</td>
                    <td><span className={styles.skuBadge}>{line.sku || `#${line.variantId}`}</span></td>
                    <td>{line.variantName || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{Number(line.quantity).toLocaleString('vi-VN')}</td>
                    <td style={{ textAlign: 'right' }}>{money(line.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>{money(line.lineAmount)}</td>
                    <td style={{ color: '#64748b' }}>{line.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Tổng cộng:</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#1d4ed8', fontSize: 15 }}>{money(totalAmount)}</td>
                  <td />
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
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
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
        <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={hideToast}
      />

      <div style={{ display: 'none' }}>
        <QuotationTemplate ref={printRef} order={so} />
      </div>
      </div>
    </AdminLayout>
  );
}

export default SalesOrderDetailPage;
