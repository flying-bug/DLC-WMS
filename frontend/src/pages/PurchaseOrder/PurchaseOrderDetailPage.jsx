import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as poApi from '../../api/purchaseOrderApi';
import styles from './PurchaseOrderDetailPage.module.css';

const unwrap      = (res) => res?.data?.data ?? res?.data;
const money       = (v)   => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const fmtDate     = (v)   => (v ? new Date(v).toLocaleDateString('vi-VN') : '—');
const fmtDateTime = (v)   => (v ? new Date(v).toLocaleString('vi-VN') : '—');

const STATUS_CONFIG = {
  DRAFT:     { label: 'Nháp',       bg: '#f1f5f9', color: '#64748b', icon: 'bi-pencil-square' },
  APPROVED:  { label: 'Đã duyệt',   bg: '#dcfce7', color: '#16a34a', icon: 'bi-check-circle-fill' },
  POSTED:    { label: 'Hoàn thành', bg: '#ede9fe', color: '#7c3aed', icon: 'bi-bag-check-fill' },
  CANCELLED: { label: 'Đã hủy',     bg: '#fef2f2', color: '#dc2626', icon: 'bi-x-circle-fill' },
};

const PAYMENT_STATUS_CONFIG = {
  UNPAID:  { label: 'Chưa thanh toán', bg: '#fee2e2', color: '#991b1b', icon: 'bi-dash-circle' },
  PARTIAL: { label: 'Trả một phần',    bg: '#fef9c3', color: '#854d0e', icon: 'bi-pie-chart-fill' },
  PAID:    { label: 'Đã thanh toán',   bg: '#dcfce7', color: '#166534', icon: 'bi-check-circle-fill' },
};

function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [po,              setPo]              = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmApprove,  setConfirmApprove]  = useState(false);
  const [confirmCancel,   setConfirmCancel]   = useState(false);
  const [paymentOpen,     setPaymentOpen]     = useState(false);
  const [paymentAmount,   setPaymentAmount]   = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

  const loadPo = async () => {
    setLoading(true);
    try {
      const res = await poApi.getPurchaseOrderById(id);
      setPo(unwrap(res));
    } catch {
      showToast('error', 'Không thể tải thông tin đơn mua hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPo(); }, [id]);

  const handleApprove = async () => {
    setConfirmApprove(false);
    try {
      await poApi.approvePurchaseOrder(id);
      showToast('success', 'Đã duyệt đơn mua hàng. Công nợ phải trả đã được ghi nhận.');
      loadPo();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể duyệt đơn hàng');
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    try {
      await poApi.cancelPurchaseOrder(id);
      showToast('success', 'Đã hủy đơn mua hàng.');
      loadPo();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể hủy đơn hàng');
    }
  };

  const handleRecordPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) { showToast('error', 'Số tiền thanh toán phải lớn hơn 0'); return; }
    setRecordingPayment(true);
    try {
      await poApi.recordPayment(id, amt);
      showToast('success', `Đã ghi nhận thanh toán ${money(amt)}`);
      setPaymentOpen(false);
      setPaymentAmount('');
      loadPo();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Ghi nhận thanh toán thất bại');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          <i className="bi bi-hourglass-split" style={{ fontSize: 32 }} />
          <p>Đang tải...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!po) {
    return (
      <AdminLayout>
        <div style={{ padding: 60, textAlign: 'center', color: '#dc2626' }}>
          Không tìm thấy đơn mua hàng
        </div>
      </AdminLayout>
    );
  }

  const stCfg  = STATUS_CONFIG[po.status]         || STATUS_CONFIG.DRAFT;
  const pstCfg = PAYMENT_STATUS_CONFIG[po.paymentStatus] || PAYMENT_STATUS_CONFIG.UNPAID;
  const remaining = Number(po.totalAmount || 0) - Number(po.paidAmount || 0);

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Breadcrumb + actions ── */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbLink} onClick={() => navigate('/purchase-orders')}>
                Đơn mua hàng
              </span>
              <i className="bi bi-chevron-right" style={{ margin: '0 6px', fontSize: 12 }} />
              <span>{po.poCode}</span>
            </div>
            <h1 className={styles.pageTitle}>
              <i className="bi bi-bag-plus" style={{ marginRight: 8 }} />
              {po.poCode}
            </h1>
          </div>

          <div className={styles.headerActions}>
            {po.status === 'DRAFT' && (
              <button className={styles.btnEdit} onClick={() => navigate(`/purchase-orders/${id}/edit`)}>
                <i className="bi bi-pencil" /> Sửa
              </button>
            )}
            {po.status === 'DRAFT' && (
              <button className={styles.btnApprove} onClick={() => setConfirmApprove(true)}>
                <i className="bi bi-check2-circle" /> Duyệt đơn
              </button>
            )}
            {(po.status === 'APPROVED' || po.status === 'POSTED') && po.paymentStatus !== 'PAID' && (
              <button className={styles.btnPay} onClick={() => setPaymentOpen(true)}>
                <i className="bi bi-cash-coin" /> Ghi nhận thanh toán
              </button>
            )}
            {(po.status === 'DRAFT' || po.status === 'APPROVED') && (
              <button className={styles.btnCancel} onClick={() => setConfirmCancel(true)}>
                <i className="bi bi-x-circle" /> Hủy đơn
              </button>
            )}
          </div>
        </div>

        {/* ── Status badges ── */}
        <div className={styles.statusBar}>
          <span className={styles.statusBadge} style={{ background: stCfg.bg, color: stCfg.color }}>
            <i className={`bi ${stCfg.icon}`} /> {stCfg.label}
          </span>
          <span className={styles.statusBadge} style={{ background: pstCfg.bg, color: pstCfg.color }}>
            <i className={`bi ${pstCfg.icon}`} /> {pstCfg.label}
          </span>
        </div>

        {/* ── Info grid ── */}
        <div className={styles.infoGrid}>
          {/* Supplier info */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <i className="bi bi-truck" /> Nhà cung cấp
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Mã NCC</span>
              <span className={styles.infoValue}>{po.partnerCode || '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tên NCC</span>
              <span className={styles.infoValue} style={{ fontWeight: 600 }}>{po.partnerName || '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Điện thoại</span>
              <span className={styles.infoValue}>{po.partnerPhone || '—'}</span>
            </div>
          </div>

          {/* Document info */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <i className="bi bi-file-earmark-text" /> Thông tin chứng từ
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Số đơn</span>
              <span className={styles.infoValue} style={{ fontWeight: 700, color: '#1d4ed8' }}>{po.poCode}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ngày lập</span>
              <span className={styles.infoValue}>{fmtDate(po.poDate)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Hạn thanh toán</span>
              <span className={styles.infoValue}>{fmtDate(po.paymentDueDate)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ngày giao hàng DK</span>
              <span className={styles.infoValue}>{fmtDate(po.expectedDeliveryDate)}</span>
            </div>
            {po.note && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ghi chú</span>
                <span className={styles.infoValue}>{po.note}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Người tạo</span>
              <span className={styles.infoValue}>{po.createdByName || `#${po.createdBy}`}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ngày tạo</span>
              <span className={styles.infoValue}>{fmtDateTime(po.createdAt)}</span>
            </div>
          </div>

          {/* Payment summary */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <i className="bi bi-cash-stack" /> Tóm tắt thanh toán
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tiền hàng</span>
              <span className={styles.infoValue}>{money(po.subTotalAmount)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Thuế VAT</span>
              <span className={styles.infoValue}>{money(po.taxAmount)}</span>
            </div>
            <div className={styles.infoRow} style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 8, marginTop: 4 }}>
              <span className={styles.infoLabel} style={{ fontWeight: 700 }}>Tổng cộng</span>
              <span className={styles.infoValue} style={{ fontWeight: 700, fontSize: 16, color: '#1e40af' }}>
                {money(po.totalAmount)}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel} style={{ color: '#16a34a' }}>Đã thanh toán</span>
              <span className={styles.infoValue} style={{ color: '#16a34a', fontWeight: 600 }}>
                {money(po.paidAmount)}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel} style={{ color: '#dc2626' }}>Còn lại</span>
              <span className={styles.infoValue} style={{ color: '#dc2626', fontWeight: 700 }}>
                {money(remaining)}
              </span>
            </div>

            {/* Progress bar */}
            {Number(po.totalAmount) > 0 && (
              <div className={styles.progressWrap}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${Math.min(100, (Number(po.paidAmount) / Number(po.totalAmount)) * 100).toFixed(1)}%` }}
                />
                <span className={styles.progressLabel}>
                  {((Number(po.paidAmount) / Number(po.totalAmount)) * 100).toFixed(1)}% đã thanh toán
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Lines table ── */}
        <div className={styles.card} style={{ marginTop: 0 }}>
          <div className={styles.cardTitle}>
            <i className="bi bi-list-ul" /> Danh sách hàng hóa
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.linesTable}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Sản phẩm</th>
                  <th style={{ width: 80 }}>SKU</th>
                  <th style={{ width: 80 }}>ĐVT</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Số lượng</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ width: 70, textAlign: 'center' }}>VAT %</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Tiền thuế</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Thành tiền</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {(po.lines || []).length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      Không có dòng sản phẩm
                    </td>
                  </tr>
                ) : (
                  (po.lines || []).map((line, idx) => (
                    <tr key={line.id || idx}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{line.variantName || `#${line.variantId}`}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{line.sku || '—'}</td>
                      <td style={{ color: '#64748b' }}>{line.unitName || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {Number(line.quantity).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {money(line.unitPrice)}
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>
                        {line.vatRate || 0}%
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {money(line.vatAmount)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>
                        {money(Number(line.lineAmount) + Number(line.vatAmount || 0))}
                      </td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{line.note || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={8} style={{ textAlign: 'right', fontWeight: 600, padding: '12px 8px', fontSize: 14 }}>
                    TỔNG CỘNG:
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e40af', fontSize: 15, padding: '12px 8px' }}>
                    {money(po.totalAmount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {paymentOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3><i className="bi bi-cash-coin" /> Ghi nhận thanh toán</h3>
              <button className={styles.modalClose} onClick={() => setPaymentOpen(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
                Đơn <strong>{po.poCode}</strong> — Còn nợ: <strong style={{ color: '#dc2626' }}>{money(remaining)}</strong>
              </p>
              <label className={styles.modalLabel}>Số tiền thanh toán (đ)</label>
              <input
                type="number"
                className={styles.modalInput}
                min="1"
                max={remaining}
                step="1000"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="Nhập số tiền..."
                autoFocus
              />
              <div className={styles.quickAmounts}>
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    className={styles.quickBtn}
                    onClick={() => setPaymentAmount(String(Math.round(remaining * pct / 100)))}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnOutlineSmall} onClick={() => setPaymentOpen(false)}>Hủy</button>
              <button
                className={styles.btnConfirmPay}
                onClick={handleRecordPayment}
                disabled={recordingPayment}
              >
                {recordingPayment ? 'Đang xử lý...' : <><i className="bi bi-check2" /> Xác nhận</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmApprove}
        title="Duyệt đơn mua hàng"
        message={`Xác nhận duyệt đơn "${po.poCode}"? Công nợ phải trả ${money(po.totalAmount)} sẽ được ghi nhận vào sổ nhà cung cấp.`}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(false)}
      />
      <ConfirmModal
        isOpen={confirmCancel}
        title="Hủy đơn mua hàng"
        message={`Xác nhận hủy đơn "${po.poCode}"?${po.status === 'APPROVED' ? ` Công nợ ${money(po.totalAmount)} đã ghi nhận sẽ được rollback.` : ''}`}
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
      <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
    </AdminLayout>
  );
}

export default PurchaseOrderDetailPage;
