import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as soApi from '../../api/salesOrderApi';
import styles from './SalesOrderListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';

const STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  APPROVED: { label: 'Đã duyệt', code: 'success' },
  POSTED: { label: 'Ghi sổ', code: 'purple' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
};

const PAYMENT_STATUS_LABELS = {
  UNPAID: { label: 'Chưa thanh toán', color: '#991b1b', bg: '#fee2e2' },
  PARTIAL: { label: 'Trả một phần', color: '#854d0e', bg: '#fef08a' },
  PAID: { label: 'Đã thanh toán', color: '#166534', bg: '#dcfce7' },
};

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'POSTED', label: 'Ghi sổ' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const fmtDate = (v) => (v ? formatDateOnly(v) : '');
const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (p) => p?.content ?? p ?? [];

function SalesOrderListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', status: '', fromDate: '', toDate: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmCancel, setConfirmCancel] = useState(null); // SO to cancel
  const [confirmApprove, setConfirmApprove] = useState(null); // SO to approve

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await soApi.getSalesOrders({
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      });
      setOrders(unwrap(res) || []);
    } catch {
      showToast('error', 'Không thể tải danh sách đơn bán hàng');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (location.state?.toastMessage) {
      showToast(location.state.toastType || 'success', location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleApprove = async (so) => {
    try {
      await soApi.approveSalesOrder(so.id);
      showToast('success', `Đã duyệt đơn ${so.soCode}. Hàng hóa đã được giữ chỗ 72 giờ.`);
      loadOrders();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể duyệt đơn hàng');
    }
    setConfirmApprove(null);
  };

  const handleCancel = async (so) => {
    try {
      await soApi.cancelSalesOrder(so.id);
      showToast('success', `Đã hủy đơn ${so.soCode}. Tồn kho đã được giải phóng.`);
      loadOrders();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể hủy đơn hàng');
    }
    setConfirmCancel(null);
  };

  const handleCreateExport = async (so) => {
    try {
      const res = await soApi.createExportFromSO(so.id);
      const exportId = unwrap(res)?.id;
      showToast('success', 'Đã tạo phiếu xuất kho. Đang chuyển sang trang xuất kho...');
      setTimeout(() => navigate(`/export-slips/${exportId}/edit`), 800);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể tạo phiếu xuất kho');
    }
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
            Đơn bán hàng
          </h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/sales-orders/create')}>
            <i className="bi bi-plus" /> Tạo đơn bán hàng
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
                placeholder="Mã đơn, tên KH..."
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
            <button className={styles.iconBtn} onClick={() => setFilters({ keyword: '', status: '', fromDate: '', toDate: '' })} title="Đặt lại">
              <i className="bi bi-arrow-clockwise" />
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
                  <th>Khách hàng</th>
                  <th style={{ width: 140 }}>Kho</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Tổng tiền</th>
                  <th style={{ width: 110 }}>Trạng thái đơn</th>
                  <th style={{ width: 120 }}>Thanh toán</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length > 0 ? paginatedOrders.map((so, idx) => {
                  const st = STATUS_LABELS[so.status] || { label: so.status, code: 'info' };
                  const pst = PAYMENT_STATUS_LABELS[so.paymentStatus || 'UNPAID'];
                  return (
                    <tr
                      key={so.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/sales-orders/${so.id}`)}
                    >
                      <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <a className={styles.link} onClick={e => { e.stopPropagation(); navigate(`/sales-orders/${so.id}`); }}>
                          {so.soCode}
                        </a>
                      </td>
                      <td>{fmtDate(so.soDate)}</td>
                      <td>{so.partnerName || `#${so.partnerId}`}</td>
                      <td>{so.warehouseName || `Kho #${so.warehouseId}`}</td>
                      <td className={`${styles.money} ${styles.textRight}`} style={{ whiteSpace: 'nowrap' }}>
                        {money(so.totalAmount)}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${st.code === 'success' ? styles.badgeSuccess :
                          st.code === 'purple' ? styles.badgeWarning :
                            st.code === 'danger' ? styles.badgeDanger :
                              styles.badgeInfo
                          }`}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                          backgroundColor: pst.bg, color: pst.color, whiteSpace: 'nowrap'
                        }}>
                          {pst.label}
                        </span>
                      </td>
                      <td className={styles.textCenter} onClick={e => e.stopPropagation()}>
                        <i
                          className="bi bi-eye"
                          title="Xem chi tiết"
                          style={{ cursor: 'pointer', marginRight: 10, color: 'var(--color-text-muted-2)', fontSize: 15 }}
                          onClick={() => navigate(`/sales-orders/${so.id}`)}
                        />
                        {so.status === 'DRAFT' && (
                          <i
                            className="bi bi-pencil"
                            title="Sửa"
                            style={{ cursor: 'pointer', marginRight: 10, color: 'var(--color-primary)', fontSize: 15 }}
                            onClick={() => navigate(`/sales-orders/${so.id}/edit`)}
                          />
                        )}
                        {so.status === 'DRAFT' && (
                          <i
                            className="bi bi-check2-circle"
                            title="Duyệt đơn"
                            style={{ cursor: 'pointer', marginRight: 10, color: '#22c55e', fontSize: 15 }}
                            onClick={() => setConfirmApprove(so)}
                          />
                        )}
                        {so.status === 'APPROVED' && (
                          <i
                            className="bi bi-box-arrow-right"
                            title="Tạo phiếu xuất kho"
                            style={{ cursor: 'pointer', marginRight: 10, color: '#8b5cf6', fontSize: 15 }}
                            onClick={() => handleCreateExport(so)}
                          />
                        )}
                        {(so.status === 'DRAFT' || so.status === 'APPROVED') && (
                          <i
                            className="bi bi-x-circle"
                            title="Hủy đơn"
                            style={{ cursor: 'pointer', color: '#ef4444', fontSize: 15 }}
                            onClick={() => setConfirmCancel(so)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className={styles.textCenter} style={{ padding: 40 }}>
                      {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy đơn bán hàng nào'}
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
              <select className="misa-select" style={{ width: 70, height: 32, padding: '0 8px' }}
                value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
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
                  <span key={p}
                    className={`${styles.pageNumber} ${p === currentPage ? styles.active : ''}`}
                    onClick={() => setCurrentPage(p)}>
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
          title="Duyệt đơn bán hàng"
          message={`Xác nhận duyệt đơn "${confirmApprove?.soCode}"? Hệ thống sẽ giữ chỗ hàng hóa trong kho 72 giờ.`}
          onConfirm={() => handleApprove(confirmApprove)}
          onCancel={() => setConfirmApprove(null)}
        />
        <ConfirmModal
          isOpen={!!confirmCancel}
          title="Hủy đơn bán hàng"
          message={`Xác nhận hủy đơn "${confirmCancel?.soCode}"? Hàng hóa đã giữ chỗ sẽ được giải phóng.`}
          onConfirm={() => handleCancel(confirmCancel)}
          onCancel={() => setConfirmCancel(null)}
        />
        <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
      </div>
    </AdminLayout>
  );
}

export default SalesOrderListPage;
