import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as poApi from '../../api/purchaseOrderApi';
import styles from './PurchaseOrderListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { exportToExcel } from '../../utils/excelExport';

const STATUS_LABELS = {
  DRAFT:     { label: 'Nháp',         code: 'info'    },
  APPROVED:  { label: 'Đã duyệt',     code: 'success' },
  POSTED:    { label: 'Ghi sổ',       code: 'purple'  },
  CANCELLED: { label: 'Đã hủy',       code: 'danger'  },
};

const STATUS_OPTIONS = [
  { value: 'DRAFT',     label: 'Nháp'         },
  { value: 'APPROVED',  label: 'Đã duyệt'     },
  { value: 'POSTED',    label: 'Ghi sổ'       },
  { value: 'CANCELLED', label: 'Đã hủy'       },
];

const money    = (v) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const fmtDate  = (v) => (v ? formatDateOnly(v) : '');
const unwrap   = (res) => res?.data?.data ?? res?.data;

function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', status: '', fromDate: '', toDate: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmCancel, setConfirmCancel]   = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(null);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await poApi.getPurchaseOrders(filters);
      const list = unwrap(res);
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể tải danh sách đơn mua hàng');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleExport = () => {
    if (!orders || orders.length === 0) {
      showToast('warning', 'Không có dữ liệu để xuất Excel');
      return;
    }
    const headers = ['Mã đơn', 'Ngày lập', 'Nhà cung cấp', 'Tổng tiền', 'Trạng thái'];
    const data = orders.map(po => [
      po.poCode,
      fmtDate(po.poDate),
      po.partnerName || `#${po.partnerId}`,
      money(po.totalAmount),
      STATUS_LABELS[po.status]?.label || po.status
    ]);
    exportToExcel(headers, data, 'Danh_sach_don_mua_hang');
    showToast('success', 'Xuất Excel thành công!');
  };

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (location.state?.toastMessage) {
      showToast(location.state.toastType || 'success', location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleApprove = async (po) => {
    try {
      await poApi.approvePurchaseOrder(po.id);
      showToast('success', `Đã duyệt đơn ${po.poCode}. Công nợ đã được ghi nhận.`);
      loadOrders();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể duyệt đơn hàng');
    }
    setConfirmApprove(null);
  };

  const handleCancel = async (po) => {
    try {
      await poApi.cancelPurchaseOrder(po.id);
      showToast('success', `Đã hủy đơn ${po.poCode}.`);
      loadOrders();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể hủy đơn hàng');
    }
    setConfirmCancel(null);
  };

  // Pagination
  const totalItems = orders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {/* ── Header ── */}
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>
            <i className="bi bi-bag-plus" style={{ marginRight: 8 }} />
            Đơn mua hàng
          </h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/purchase-orders/create')}>
            <i className="bi bi-plus" /> Tạo đơn mua hàng
          </button>
        </div>

        {/* ── Filter ── */}
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌM KIẾM</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Mã PO, tên nhà cung cấp..."
                value={filters.keyword}
                onChange={e => setFilters(p => ({ ...p, keyword: e.target.value }))}
              />
            </div>

            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TRẠNG THÁI</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              >
                <option value="">Tất cả</option>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={e => setFilters(p => ({ ...p, fromDate: e.target.value }))}
              />
            </div>

            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ĐẾN NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.toDate}
                onChange={e => setFilters(p => ({ ...p, toDate: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setFilters({ keyword: '', status: '', fromDate: '', toDate: '' })}
              title="Đặt lại"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
            <button
              className={styles.iconBtn}
              onClick={handleExport}
              title="Xuất tệp Excel"
            >
              <i className="bi bi-file-earmark-excel" />
            </button>
            <button className={styles.btnPrimary} onClick={loadOrders}>
              <i className="bi bi-funnel" /> Lọc
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className={styles.tableContainer}>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th style={{ width: 130 }}>Mã đơn</th>
                  <th style={{ width: 110 }}>Ngày lập</th>
                  <th>Nhà cung cấp</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Công nợ</th>
                  <th style={{ width: 110 }}>Trạng thái</th>
                  <th style={{ width: 120, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length > 0 ? paginatedOrders.map((po, idx) => {
                  const st  = STATUS_LABELS[po.status] || { label: po.status, code: 'info' };
                  return (
                    <tr
                      key={po.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                    >
                      <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <a
                          className={styles.link}
                          onClick={e => { e.stopPropagation(); navigate(`/purchase-orders/${po.id}`); }}
                        >
                          {po.poCode}
                        </a>
                      </td>
                      <td>{fmtDate(po.poDate)}</td>
                      <td>{po.partnerName || `#${po.partnerId}`}</td>
                      <td className={`${styles.money} ${styles.textRight}`} style={{ whiteSpace: 'nowrap' }}>
                        {money(po.totalAmount)}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${
                          st.code === 'success' ? styles.badgeSuccess :
                          st.code === 'purple'  ? styles.badgeWarning :
                          st.code === 'danger'  ? styles.badgeDanger  :
                          styles.badgeInfo
                        }`}>
                          {st.label}
                        </span>
                      </td>
                      <td className={styles.textCenter} onClick={e => e.stopPropagation()}>
                        <i
                          className="bi bi-eye"
                          title="Xem chi tiết"
                          style={{ cursor: 'pointer', marginRight: 8, color: 'var(--color-text-muted-2)', fontSize: 15 }}
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        />
                        {po.status === 'DRAFT' && (
                          <i
                            className="bi bi-pencil"
                            title="Sửa"
                            style={{ cursor: 'pointer', marginRight: 8, color: 'var(--color-primary)', fontSize: 15 }}
                            onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                          />
                        )}
                        {po.status === 'DRAFT' && (
                          <i
                            className="bi bi-check2-circle"
                            title="Duyệt đơn"
                            style={{ cursor: 'pointer', marginRight: 8, color: '#22c55e', fontSize: 15 }}
                            onClick={() => setConfirmApprove(po)}
                          />
                        )}
                        {(po.status === 'DRAFT' || po.status === 'APPROVED') && (
                          <i
                            className="bi bi-x-circle"
                            title="Hủy đơn"
                            style={{ cursor: 'pointer', color: '#ef4444', fontSize: 15 }}
                            onClick={() => setConfirmCancel(po)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className={styles.textCenter} style={{ padding: 40 }}>
                      {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy đơn mua hàng nào'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Hiển thị</span>
              <select
                className="misa-select"
                style={{ width: 70, height: 32, padding: '0 8px' }}
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>trên tổng số {totalItems} bản ghi</span>
            </div>
            {totalPages > 1 && (
              <div className={styles.pageControls}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={styles.pageBtn}>
                  <i className="bi bi-chevron-left" /> Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <span
                    key={p}
                    className={`${styles.pageNumber} ${p === currentPage ? styles.active : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </span>
                ))}
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={styles.pageBtn}>
                  Sau <i className="bi bi-chevron-right" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <ConfirmModal
          isOpen={!!confirmApprove}
          title="Duyệt đơn mua hàng"
          message={`Xác nhận duyệt đơn "${confirmApprove?.poCode}"? Công nợ phải trả sẽ được ghi nhận vào sổ nhà cung cấp.`}
          onConfirm={() => handleApprove(confirmApprove)}
          onCancel={() => setConfirmApprove(null)}
        />
        <ConfirmModal
          isOpen={!!confirmCancel}
          title="Hủy đơn mua hàng"
          message={`Xác nhận hủy đơn "${confirmCancel?.poCode}"?${confirmCancel?.status === 'APPROVED' ? ' Công nợ đã ghi nhận sẽ được rollback.' : ''}`}
          onConfirm={() => handleCancel(confirmCancel)}
          onCancel={() => setConfirmCancel(null)}
        />
        <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
      </div>
    </AdminLayout>
  );
}

export default PurchaseOrderListPage;
