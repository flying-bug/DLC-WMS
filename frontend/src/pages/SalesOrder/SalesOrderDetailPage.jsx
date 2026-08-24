import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as soApi from '../../api/salesOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as einvoiceApi from '../../api/einvoiceApi';
import { getBaseURL } from '../../api/axiosClient';
import IssueInvoiceModal from './components/IssueInvoiceModal';
import EInvoicePreviewModal from '../EInvoice/components/EInvoicePreviewModal';
import { printSalesInvoice } from '../../utils/printSalesInvoice';
import { printQuotation } from '../../utils/printQuotation';
import AttachmentUpload from '../../components/ui/AttachmentUpload/AttachmentUpload';
import { parseNoteAndAttachments } from '../../utils/attachmentHelper';
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

  const [einvoices, setEinvoices] = useState([]);
  const [exportDocs, setExportDocs] = useState([]);
  const [issueModalTarget, setIssueModalTarget] = useState(null); // { so, exportDoc }
  const [issuingInvoice, setIssuingInvoice] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const [invoiceDropdownOpen, setInvoiceDropdownOpen] = useState(false);
  const invoiceDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(event.target)) {
        setInvoiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const loadEInvoices = async () => {
    try {
      const res = await einvoiceApi.getEInvoicesBySalesOrderId(id);
      const data = res.data?.data;
      setEinvoices(Array.isArray(data) ? data : (data ? [data] : []));
    } catch {
      setEinvoices([]);
    }
  };

  const loadExportDocs = async () => {
    try {
      const res = await exportApi.getExportHistory({ referenceType: 'SALES_ORDER', referenceId: id });
      const docs = unwrap(res) || [];
      setExportDocs(docs);
      const draft = docs.find(d => ['DRAFT', 'SUBMITTED'].includes(d.status));
      setExistingDraftExport(draft || null);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSo = async () => {
    setLoading(true);
    try {
      const res = await soApi.getSalesOrderById(id);
      setSo(unwrap(res));
      loadEInvoices();
      loadExportDocs();
    } catch {
      showToast('error', 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  };

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

  const handleIssueEInvoice = async (formData) => {
    setIssuingInvoice(true);
    try {
      const payload = {
        salesOrderId: Number(id),
        inventoryDocumentId: formData.inventoryDocumentId,
        buyerName: formData.name,
        buyerLegalName: formData.legalName,
        buyerTaxCode: formData.taxCode,
        buyerAddress: formData.address,
        buyerPhone: formData.phone,
        buyerEmail: formData.email,
        paymentMethod: so.paymentStatus === 'PAID' ? 'TM/CK' : 'TM/CK',
      };
      const res = await einvoiceApi.issueEInvoice(payload);
      showToast('success', 'Phát hành Hóa đơn điện tử thành công!');
      setIssueModalTarget(null);
      loadEInvoices();
      loadExportDocs();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Phát hành HĐĐT thất bại');
    } finally {
      setIssuingInvoice(false);
    }
  };

  const handleOpenEInvoicePreview = (inv) => {
    const targetInv = inv || einvoices[0];
    if (targetInv) {
      setPreviewInvoice(targetInv);
      window.open(targetInv.viewUrl || `${getBaseURL()}/einvoices/preview/${targetInv.transactionUuid}`, '_blank');
    } else {
      showToast('warning', 'Không tìm thấy đường dẫn hóa đơn');
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

  const activeSoLevelInvoice = einvoices.find(i => !i.inventoryDocumentId && i.status !== 'CANCELED');
  const activeExportLevelInvoices = einvoices.filter(i => Boolean(i.inventoryDocumentId) && i.status !== 'CANCELED');
  const canceledSoLevelInvoice = einvoices.find(i => !i.inventoryDocumentId && i.status === 'CANCELED');

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

            {einvoices.length === 1 ? (
              (() => {
                const inv = einvoices[0];
                const isCanceled = inv.status === 'CANCELED';
                return (
                  <span
                    className={styles.statusBadge}
                    style={{
                      background: isCanceled ? '#fff1f2' : '#dcfce7',
                      color: isCanceled ? '#9f1239' : '#166534',
                      cursor: 'pointer',
                      border: `1px solid ${isCanceled ? '#fecdd3' : '#86efac'}`
                    }}
                    onClick={() => handleOpenEInvoicePreview(inv)}
                    title={isCanceled ? `HĐĐT ${inv.invoiceNumber} (Đã hủy: ${inv.cancelReason || '—'}). Nhấn để xem chi tiết` : 'Nhấn để xem HĐĐT'}
                  >
                    <i className={`bi ${isCanceled ? 'bi-x-circle-fill' : 'bi-file-earmark-check-fill'}`} style={{ marginRight: 5, color: isCanceled ? '#f43f5e' : '#16a34a' }} />
                    HĐĐT: {inv.invoiceNumber || 'Đã cấp'} ({inv.invoiceSeries}) {isCanceled ? '• Đã hủy' : ''}
                  </span>
                );
              })()
            ) : einvoices.length > 1 ? (
              <div style={{ position: 'relative' }} ref={invoiceDropdownRef}>
                <button
                  type="button"
                  className={styles.statusBadge}
                  style={{
                    background: activeSoLevelInvoice || activeExportLevelInvoices.length > 0 ? '#dcfce7' : '#fff1f2',
                    color: activeSoLevelInvoice || activeExportLevelInvoices.length > 0 ? '#166534' : '#9f1239',
                    cursor: 'pointer',
                    border: `1px solid ${activeSoLevelInvoice || activeExportLevelInvoices.length > 0 ? '#86efac' : '#fecdd3'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onClick={() => setInvoiceDropdownOpen(prev => !prev)}
                  title="Nhấn để xem danh sách các HĐĐT của đơn này"
                >
                  <i
                    className={`bi ${activeSoLevelInvoice || activeExportLevelInvoices.length > 0 ? 'bi-file-earmark-check-fill' : 'bi-x-circle-fill'}`}
                    style={{ color: activeSoLevelInvoice || activeExportLevelInvoices.length > 0 ? '#16a34a' : '#f43f5e' }}
                  />
                  <span>
                    {activeSoLevelInvoice
                      ? `HĐĐT: ${activeSoLevelInvoice.invoiceNumber} (${activeSoLevelInvoice.invoiceSeries})`
                      : activeExportLevelInvoices.length > 0
                      ? `${activeExportLevelInvoices.length} HĐĐT hiệu lực`
                      : 'HĐĐT đã hủy'}
                  </span>
                  <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                    {einvoices.length} HĐ ▾
                  </span>
                </button>

                {invoiceDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      background: '#ffffff',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      zIndex: 100,
                      minWidth: 330,
                      padding: '6px 0',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Hóa đơn điện tử ({einvoices.length})</span>
                      <span
                        style={{ color: '#0284c7', cursor: 'pointer', textTransform: 'none', fontWeight: 500 }}
                        onClick={() => {
                          const el = document.getElementById('einvoice-history-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          setInvoiceDropdownOpen(false);
                        }}
                      >
                        Xem bảng chi tiết ↓
                      </span>
                    </div>

                    {einvoices.map(inv => {
                      const isCanceled = inv.status === 'CANCELED';
                      return (
                        <div
                          key={inv.id}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f8fafc',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => {
                            handleOpenEInvoicePreview(inv);
                            setInvoiceDropdownOpen(false);
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13, color: isCanceled ? '#991b1b' : '#0284c7' }}>
                                #{inv.invoiceNumber || 'Chưa cấp số'}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                                ({inv.invoiceSeries})
                              </span>
                              {inv.inventoryDocumentId && (
                                <span style={{ fontSize: 10, background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, color: '#475569' }}>
                                  Đợt {inv.exportDocCode || `#${inv.inventoryDocumentId}`}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: isCanceled ? '#dc2626' : '#64748b', marginTop: 2 }}>
                              {isCanceled ? `Đã hủy: ${inv.cancelReason || '—'}` : `${inv.invoiceDate} • ${money(inv.totalAmount)}`}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: isCanceled ? '#fee2e2' : '#ecfdf5',
                                color: isCanceled ? '#991b1b' : '#065f46'
                              }}
                            >
                              {isCanceled ? 'Đã hủy' : 'Hiệu lực'}
                            </span>
                            <i className="bi bi-chevron-right" style={{ fontSize: 11, color: '#94a3b8' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className={styles.headerActions}>
            {!activeSoLevelInvoice && activeExportLevelInvoices.length === 0 && ['APPROVED', 'POSTED'].includes(so.status) && (
              <button
                className={styles.btnPrimary}
                onClick={() => setIssueModalTarget({ so, exportDoc: null })}
                style={{ backgroundColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <i className="bi bi-file-earmark-text" /> {canceledSoLevelInvoice ? 'Xuất lại HĐĐT mới' : 'Xuất Hóa Đơn Điện Tử'}
              </button>
            )}

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
              <div className={styles.infoRow}><span className={styles.infoLabel}>Mã số thuế:</span><span className={styles.infoValue} style={{ fontFamily: 'monospace', fontWeight: 600 }}>{so.partnerTaxCode || '—'}</span></div>
              <div className={styles.infoRow}><span className={styles.infoLabel}>Điện thoại:</span><span className={styles.infoValue}>{so.partnerPhone || '—'}</span></div>
              {so.partnerEmail && (
                <div className={styles.infoRow}><span className={styles.infoLabel}>Email:</span><span className={styles.infoValue}>{so.partnerEmail}</span></div>
              )}
              <div className={styles.infoRow}><span className={styles.infoLabel}>Địa chỉ giao hàng:</span><span className={styles.infoValue}>{so.deliveryAddress || so.partnerAddress || '—'}</span></div>
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

        {/* ── Ghi chú & Đính kèm ── */}
        {(() => {
          const { note: cleanNote, attachments: soAttachments } = parseNoteAndAttachments(so.note);
          if (!cleanNote && (!soAttachments || soAttachments.length === 0)) return null;
          return (
            <div className={styles.card} style={{ marginTop: 20 }}>
              <div className={styles.cardTitle}>
                <i className="bi bi-paperclip" /> Ghi chú &amp; Tệp đính kèm
              </div>
              {cleanNote && (
                <div style={{ marginBottom: (soAttachments && soAttachments.length > 0) ? 14 : 0, fontSize: 13.5, color: '#334155', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
                  <strong>Ghi chú:</strong> {cleanNote}
                </div>
              )}
              {soAttachments && soAttachments.length > 0 && (
                <AttachmentUpload
                  files={soAttachments}
                  disabled={true}
                />
              )}
            </div>
          );
        })()}

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

        {/* ── Export Documents & Batch E-Invoices (Khoản 1 Điều 9 NĐ 123) ── */}
        <div className={styles.card} style={{ marginTop: 20 }}>
          <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-truck" style={{ color: '#0284c7' }} /> Các đợt giao hàng & Hóa đơn điện tử tương ứng (Nghị định 123/2020/NĐ-CP)
            </div>
            {so.status === 'APPROVED' && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleCreateExport}
                style={{ fontSize: 13, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <i className="bi bi-plus-circle" /> Tạo phiếu xuất đợt mới
              </button>
            )}
          </div>
          {exportDocs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mã phiếu xuất</th>
                    <th>Ngày xuất</th>
                    <th>Kho xuất</th>
                    <th style={{ textAlign: 'center' }}>Số lượng</th>
                    <th>Trạng thái xuất</th>
                    <th>Hóa đơn điện tử tương ứng</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {exportDocs.map((doc, idx) => {
                    const activeDocInv = einvoices.find(i => Number(i.inventoryDocumentId) === Number(doc.id) && i.status !== 'CANCELED');
                    const canceledDocInv = einvoices.find(i => Number(i.inventoryDocumentId) === Number(doc.id) && i.status === 'CANCELED');
                    const isPosted = doc.status === 'POSTED';
                    const qtyTotal = doc.lines?.reduce((s, l) => s + (Number(l.quantityOut ?? l.quantity ?? 0)), 0) || doc.totalQuantity || 0;
                    return (
                      <tr key={doc.id || idx}>
                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                        <td>
                          <strong style={{ color: '#0284c7', cursor: 'pointer' }} onClick={() => navigate(`/exports/edit/${doc.id}`)}>
                            {doc.docCode}
                          </strong>
                        </td>
                        <td>{doc.docDate || fmtDateTime(doc.createdAt)}</td>
                        <td>{doc.warehouseName || (doc.warehouseId ? `Kho #${doc.warehouseId}` : '—')}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(qtyTotal).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className={styles.statusBadge} style={{ background: isPosted ? '#dcfce7' : '#fef3c7', color: isPosted ? '#166534' : '#92400e' }}>
                            {isPosted ? 'Đã ghi sổ' : (doc.status === 'SUBMITTED' ? 'Chờ duyệt' : 'Bản nháp')}
                          </span>
                        </td>
                        <td>
                          {activeDocInv ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
                                  padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600
                                }}
                              >
                                <i className="bi bi-file-earmark-check-fill" style={{ color: '#059669' }} />
                                HĐ: {activeDocInv.invoiceNumber || 'Đã cấp'} ({activeDocInv.invoiceSeries})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEInvoicePreview(activeDocInv)}
                                style={{
                                  background: 'none', border: 'none', color: '#0284c7',
                                  cursor: 'pointer', fontSize: 12, textDecoration: 'underline'
                                }}
                              >
                                Xem HĐ
                              </button>
                            </div>
                          ) : activeSoLevelInvoice ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
                                  padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600
                                }}
                                title="Đơn hàng đã được xuất HĐĐT gộp toàn bộ đơn"
                              >
                                <i className="bi bi-file-earmark-lock-fill" style={{ color: '#2563eb' }} />
                                Đã xuất theo HĐ đơn hàng ({activeSoLevelInvoice.invoiceNumber})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEInvoicePreview(activeSoLevelInvoice)}
                                style={{
                                  background: 'none', border: 'none', color: '#0284c7',
                                  cursor: 'pointer', fontSize: 12, textDecoration: 'underline'
                                }}
                              >
                                Xem HĐ
                              </button>
                            </div>
                          ) : isPosted ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {canceledDocInv && (
                                <span
                                  style={{
                                    fontSize: 11, color: '#dc2626', background: '#fee2e2',
                                    padding: '2px 6px', borderRadius: 4, border: '1px solid #fecaca', cursor: 'pointer'
                                  }}
                                  onClick={() => handleOpenEInvoicePreview(canceledDocInv)}
                                  title="HĐ cũ đã hủy"
                                >
                                  HĐ cũ #{canceledDocInv.invoiceNumber} (Đã hủy)
                                </span>
                              )}
                              <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => setIssueModalTarget({ so, exportDoc: doc })}
                                style={{
                                  backgroundColor: '#059669', fontSize: 12, padding: '3px 10px',
                                  display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                              >
                                <i className="bi bi-file-earmark-plus" /> {canceledDocInv ? 'Xuất lại HĐ đợt này' : 'Xuất HĐĐT đợt này'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Chưa hoàn tất xuất kho</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => navigate(`/exports/edit/${doc.id}`)}
                            style={{ fontSize: 12, padding: '3px 8px' }}
                          >
                            Xem phiếu
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Chưa có phiếu xuất kho nào cho đơn hàng này.
            </div>
          )}
        </div>

        {/* ── E-Invoice History & Details Card (Khoản 1 Điều 9 Nghị định 123/2020/NĐ-CP) ── */}
        {einvoices.length > 0 && (
          <div className={styles.card} style={{ marginTop: 20 }}>
            <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-file-earmark-ruled" style={{ color: '#059669' }} /> Lịch sử Hóa đơn điện tử của đơn hàng ({einvoices.length} bản ghi)
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 45, textAlign: 'center' }}>#</th>
                    <th style={{ width: 110 }}>Số HĐ</th>
                    <th style={{ width: 90 }}>Ký hiệu</th>
                    <th style={{ width: 105 }}>Ngày lập</th>
                    <th>Loại hóa đơn</th>
                    <th>Người mua / MST</th>
                    <th style={{ textAlign: 'right', width: 140 }}>Tổng tiền</th>
                    <th style={{ width: 130 }}>Cơ quan thuế</th>
                    <th style={{ minWidth: 150 }}>Trạng thái</th>
                    <th style={{ textAlign: 'center', width: 110 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {einvoices.map((inv, idx) => {
                    const isCanceled = inv.status === 'CANCELED';
                    return (
                      <tr key={inv.id || idx}>
                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                        <td>
                          <span
                            style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#0284c7', cursor: 'pointer' }}
                            onClick={() => handleOpenEInvoicePreview(inv)}
                            title="Nhấn để xem bản thể hiện HĐĐT"
                          >
                            {inv.invoiceNumber || 'Chưa cấp'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#475569' }}>
                          {inv.invoiceSeries}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{inv.invoiceDate}</td>
                        <td>
                          {inv.inventoryDocumentId ? (
                            <span style={{ fontSize: 12, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                              Đợt xuất: {inv.exportDocCode || `PXK #${inv.inventoryDocumentId}`}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#1e40af', background: '#eff6ff', padding: '2px 8px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                              Toàn bộ đơn hàng
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.buyerLegalName || inv.buyerName || 'Khách lẻ'}</div>
                          {inv.buyerTaxCode && <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>MST: {inv.buyerTaxCode}</div>}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: isCanceled ? '#9f1239' : '#166534' }}>
                          {money(inv.totalAmount)}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 6px', borderRadius: 4 }}>
                            <i className="bi bi-shield-check" /> {inv.cqtCode ? 'Đã cấp mã' : 'Hợp lệ'}
                          </span>
                        </td>
                        <td>
                          {isCanceled ? (
                            <div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f43f5e' }} /> Đã hủy
                              </span>
                              <div style={{ fontSize: 11, color: '#9f1239', marginTop: 3 }}>
                                <strong>Lý do:</strong> {inv.cancelReason || '—'}
                              </div>
                              {inv.canceledByName && <div style={{ fontSize: 10, color: '#64748b' }}>Bởi: {inv.canceledByName}</div>}
                            </div>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} /> Đã phát hành
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => handleOpenEInvoicePreview(inv)}
                            style={{ fontSize: 12, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <i className="bi bi-eye" /> Xem HĐ
                          </button>
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
        {/* ── Modal Phát Hành Hóa Đơn Điện Tử ── */}
        <IssueInvoiceModal
          isOpen={Boolean(issueModalTarget)}
          onClose={() => setIssueModalTarget(null)}
          so={issueModalTarget?.so || so}
          exportDoc={issueModalTarget?.exportDoc}
          onConfirm={handleIssueEInvoice}
          loading={issuingInvoice}
        />

        {/* ── Modal Xem Hóa Đơn Điện Tử ── */}
        <EInvoicePreviewModal
          invoice={previewInvoice}
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
        />

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
