import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as poApi from '../../api/purchaseOrderApi';
import * as importApi from '../../api/inventoryImportApi';
import * as exportApi from '../../api/inventoryExportApi';
import { printPurchaseOrder } from '../../utils/printPurchaseOrder';
import styles from './PurchaseOrderDetailPage.module.css';
import { formatDateOnly, formatDateTime } from '../../utils/dateFormat';

const unwrap      = (res) => res?.data?.data ?? res?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money       = (v)   => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const fmtDate     = (v)   => (v ? formatDateOnly(v) : '—');
const fmtDateTime = (v)   => (v ? formatDateTime(v) : '—');

const STATUS_CONFIG = {
  DRAFT:     { label: 'Nháp',       bg: '#f1f5f9', color: '#64748b', icon: 'bi-pencil-square' },
  APPROVED:  { label: 'Đã duyệt',   bg: '#dcfce7', color: '#16a34a', icon: 'bi-check-circle-fill' },
  POSTED:    { label: 'Ghi sổ',     bg: '#ede9fe', color: '#7c3aed', icon: 'bi-bag-check-fill' },
  CANCELLED: { label: 'Đã hủy',     bg: '#fef2f2', color: '#dc2626', icon: 'bi-x-circle-fill' },
};

function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [po,              setPo]              = useState(null);
  const [importSlips,     setImportSlips]     = useState([]);
  const [users,           setUsers]           = useState([]);
  const [warehouses,      setWarehouses]      = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmApprove,  setConfirmApprove]  = useState(false);
  const [confirmCancel,   setConfirmCancel]   = useState(false);

  const userById = useMemo(() => new Map(users.map(item => [item.id, item])), [users]);
  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);

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

  const loadImportSlips = async () => {
    try {
      const res = await importApi.getImportHistory({ referenceType: 'PURCHASE_ORDER', referenceId: id });
      setImportSlips(pageContent(unwrap(res)));
    } catch (err) {
      console.error('Failed to load import slips', err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await exportApi.getUsers({ size: 1000 });
      setUsers(pageContent(unwrap(res)));
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await importApi.getWarehouses({ size: 100 });
      setWarehouses(pageContent(unwrap(res)));
    } catch (err) {
      console.error('Failed to load warehouses', err);
    }
  };

  useEffect(() => { loadPo(); loadImportSlips(); loadUsers(); loadWarehouses(); }, [id]);

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

  const handleCreateImport = () => {
    const importableLines = (po.lines || [])
      .map(l => {
        const rem = l.remainingQuantity !== undefined && l.remainingQuantity !== null
          ? Number(l.remainingQuantity)
          : Number(l.quantity || 1);
        return {
          ...l,
          remainingQuantity: rem,
          quantity: rem,
        };
      })
      .filter(l => l.remainingQuantity > 0);

    if (importableLines.length === 0) {
      showToast('info', 'Đơn mua hàng này đã nhập kho đủ toàn bộ sản phẩm');
      return;
    }

    navigate('/import-history/create', {
      state: {
        poData: {
          ...po,
          lines: importableLines,
        }
      }
    });
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

  const stCfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.DRAFT;

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
            <button className={styles.btnPrimary} onClick={() => printPurchaseOrder(po, { userById })}>
              <i className="bi bi-printer" /> In đơn mua hàng
            </button>
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
            {(po.status === 'APPROVED' || po.status === 'POSTED') && !po.isFullyImported && (
              <button className={styles.btnPrimary} onClick={handleCreateImport}>
                <i className="bi bi-box-seam" /> Tạo phiếu nhập
              </button>
            )}
            {po.status === 'DRAFT' && (
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
              <span className={styles.infoLabel}>Hạn công nợ</span>
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
              <span className={styles.infoValue}>{po.createdByName || userById.get(po.createdBy)?.fullName || userById.get(po.createdBy)?.username || `#${po.createdBy}`}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ngày tạo</span>
              <span className={styles.infoValue}>{fmtDateTime(po.createdAt)}</span>
            </div>
          </div>

          {/* Debt summary */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <i className="bi bi-cash-stack" /> Tóm tắt công nợ
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
              <span className={styles.infoLabel} style={{ fontWeight: 700 }}>Công nợ ghi nhận</span>
              <span className={styles.infoValue} style={{ fontWeight: 700, fontSize: 16, color: '#1e40af' }}>
                {money(po.totalAmount)}
              </span>
            </div>
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
                  <th style={{ width: 160 }}>Kho nhận dự kiến</th>
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
                    <td colSpan={11} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      Không có dòng sản phẩm
                    </td>
                  </tr>
                ) : (
                  (po.lines || []).map((line, idx) => (
                    <tr key={line.id || idx}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{line.variantName || line.productName || `#${line.variantId}`}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{line.sku || '—'}</td>
                      <td style={{ color: '#1e40af', fontWeight: 500 }}>
                        {line.warehouseName || (line.warehouseId ? warehouseById.get(line.warehouseId)?.name : null) || '—'}
                      </td>
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
        
        {/* ── Linked Import Slips ── */}
        {(po.status === 'APPROVED' || po.status === 'POSTED') && (
          <div className={styles.card} style={{ marginTop: 20 }}>
            <div className={styles.cardTitle}>
              <i className="bi bi-box-arrow-in-down" /> Các phiếu nhập kho liên kết
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.linesTable}>
                <thead>
                  <tr>
                    <th>Mã phiếu nhập</th>
                    <th>Ngày nhập</th>
                    <th>Kho</th>
                    <th>Người tạo</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {importSlips.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Chưa có phiếu nhập kho nào được tạo cho đơn hàng này
                      </td>
                    </tr>
                  ) : (
                    importSlips.map((slip) => (
                      <tr key={slip.id}>
                        <td>
                          <span 
                            style={{ fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                            onClick={() => navigate(`/import-history`)} // ideally go to detail page if available
                          >
                            {slip.docCode}
                          </span>
                        </td>
                        <td>{fmtDateTime(slip.createdAt)}</td>
                        <td>{slip.warehouseName || warehouseById.get(slip.warehouseId)?.name || '—'}</td>
                        <td>{slip.createdByName || userById.get(slip.createdBy)?.fullName || userById.get(slip.createdBy)?.username || `#${slip.createdBy}`}</td>
                        <td style={{ color: '#64748b' }}>{slip.note || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
