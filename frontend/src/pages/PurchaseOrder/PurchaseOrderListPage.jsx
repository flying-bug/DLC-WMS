import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import TimeInfoBadge from '../../components/ui/TimeInfoBadge/TimeInfoBadge';
import * as poApi from '../../api/purchaseOrderApi';
import { printPurchaseOrder } from '../../utils/printPurchaseOrder';
import styles from './PurchaseOrderListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import { exportToExcel } from '../../utils/excelExport';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


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

function renderPaymentDueDateBadge(po) {
  if (!po.paymentDueDate) {
    return <span style={{ color: 'var(--color-text-muted-2)' }}>—</span>;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(po.paymentDueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
  const isPaid = po.paymentStatus === 'PAID';

  return (
    <div className={styles.dateCell}>
      <span className={styles.dateMain}>{fmtDate(po.paymentDueDate)}</span>
      {isPaid ? (
        <span className={`${styles.badgePill} ${styles.pillPaid}`} title="Đã thanh toán đủ">
          <i className="bi bi-check-circle-fill" /> Đã trả
        </span>
      ) : diffDays < 0 ? (
        <span className={`${styles.badgePill} ${styles.pillOverdue}`} title={`Quá hạn công nợ ${Math.abs(diffDays)} ngày`}>
          <i className="bi bi-exclamation-triangle-fill" /> Quá hạn {Math.abs(diffDays)}N
        </span>
      ) : diffDays === 0 ? (
        <span className={`${styles.badgePill} ${styles.pillDueToday}`} title="Đến hạn thanh toán hôm nay">
          <i className="bi bi-clock-fill" /> Hôm nay
        </span>
      ) : diffDays <= 3 ? (
        <span className={`${styles.badgePill} ${styles.pillDueSoon}`} title={`Sắp đến hạn trong ${diffDays} ngày`}>
          <i className="bi bi-hourglass-split" /> Còn {diffDays}N
        </span>
      ) : null}
    </div>
  );
}

function renderDeliveryDateBadge(po) {
  if (!po.expectedDeliveryDate) {
    return <span style={{ color: 'var(--color-text-muted-2)' }}>—</span>;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivDate = new Date(po.expectedDeliveryDate);
  delivDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((delivDate - today) / (1000 * 60 * 60 * 24));
  const isFullyImported = po.isFullyImported || po.status === 'POSTED';

  return (
    <div className={styles.dateCell}>
      <span className={styles.dateMain}>{fmtDate(po.expectedDeliveryDate)}</span>
      {isFullyImported ? (
        <span className={`${styles.badgePill} ${styles.pillPaid}`} title="Đã nhập kho đủ">
          <i className="bi bi-check2-all" /> Đã nhập
        </span>
      ) : diffDays < 0 ? (
        <span className={`${styles.badgePill} ${styles.pillDeliveryLate}`} title={`Trễ hạn giao hàng ${Math.abs(diffDays)} ngày`}>
          <i className="bi bi-truck-flatbed" /> Trễ {Math.abs(diffDays)}N
        </span>
      ) : diffDays === 0 ? (
        <span className={`${styles.badgePill} ${styles.pillDeliveryToday}`} title="Dự kiến giao hàng trong hôm nay">
          <i className="bi bi-box-seam" /> Giao hôm nay
        </span>
      ) : diffDays === 1 ? (
        <span className={`${styles.badgePill} ${styles.pillDeliverySoon}`} title="Dự kiến giao hàng vào ngày mai">
          <i className="bi bi-calendar-event" /> Ngày mai
        </span>
      ) : null}
    </div>
  );
}

function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const DEFAULT_FILTERS = useMemo(() => {
    const range = getDateRangePreset('THIS_YEAR');
    return {
      keyword: '',
      status: '',
      partnerId: '',
      preset: 'THIS_YEAR',
      fromDate: range?.fromDate || '',
      toDate: range?.toDate || '',
    };
  }, []);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmCancel, setConfirmCancel]   = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(null);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await poApi.getSuppliers({ size: 200 });
        const list = unwrap(res);
        setSuppliers(Array.isArray(list) ? list : (list?.content || []));
      } catch (err) {
        console.error('Không tải được danh sách nhà cung cấp', err);
      }
    };
    loadSuppliers();
  }, []);

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
    const headers = ['Mã đơn', 'Ngày lập', 'Nhà cung cấp', 'Hạn công nợ', 'Ngày giao DK', 'Tổng tiền', 'Trạng thái'];
    const data = orders.map(po => [
      po.poCode,
      fmtDate(po.poDate),
      po.partnerName || `#${po.partnerId}`,
      fmtDate(po.paymentDueDate),
      fmtDate(po.expectedDeliveryDate),
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

  const handlePrintPo = async (po) => {
    try {
      const res = await poApi.getPurchaseOrderById(po.id);
      const detail = unwrap(res);
      printPurchaseOrder(detail);
    } catch {
      showToast('error', 'Không thể tải dữ liệu để in đơn mua hàng');
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
            <i className="bi bi-bag-plus" style={{ marginRight: 8 }} />
            Đơn mua hàng
          </h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/purchase-orders/create')}>
            <i className="bi bi-plus" /> Tạo đơn mua hàng
          </button>
        </div>

        {/* ── Filter ── */}
        <div className={styles.filterSection}>
          <div className={styles.searchAndPopover}>
            <div className={styles.searchBox}>
              <i className="bi bi-search" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo mã đơn, nhà cung cấp..."
                value={filters.keyword}
                onChange={e => {
                  setCurrentPage(1);
                  setFilters(p => ({ ...p, keyword: e.target.value }));
                }}
              />
              {filters.keyword && (
                <button
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setCurrentPage(1);
                    setFilters(p => ({ ...p, keyword: '' }));
                  }}
                >
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </div>

            <TimeInfoBadge filters={filters} />
          </div>

          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => {
                setCurrentPage(1);
                setFilters(DEFAULT_FILTERS);
              }}
              title="Đặt lại bộ lọc"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
            <FilterPopover
              filters={filters}
              onApply={(newFilters) => {
                setCurrentPage(1);
                setFilters(newFilters);
              }}
              onReset={() => {
                setCurrentPage(1);
                setFilters(DEFAULT_FILTERS);
              }}
              partners={suppliers}
              partnerLabel="Nhà cung cấp"
              statusOptions={STATUS_OPTIONS}
            />
            <button
              className={styles.iconBtn}
              onClick={handleExport}
              title="Xuất tệp Excel"
            >
              <i className="bi bi-file-earmark-excel" />
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className={styles.tableContainer}>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 45 }}>#</th>
                  <th style={{ width: 110 }}>Mã đơn</th>
                  <th style={{ width: 95 }}>Ngày lập</th>
                  <th>Nhà cung cấp</th>
                  <th style={{ width: 125 }}>Hạn công nợ</th>
                  <th style={{ width: 130 }}>Ngày giao DK</th>
                  <th style={{ width: 125, textAlign: 'right' }}>Tổng tiền</th>
                  <th style={{ width: 100 }}>Trạng thái</th>
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
                      <td>{renderPaymentDueDateBadge(po)}</td>
                      <td>{renderDeliveryDateBadge(po)}</td>
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
                        <i
                          className="bi bi-printer"
                          title="In đơn mua hàng"
                          style={{ cursor: 'pointer', marginRight: 8, color: '#0284c7', fontSize: 15 }}
                          onClick={() => handlePrintPo(po)}
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
                        {po.status === 'DRAFT' && (
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
                    <td colSpan={9} className={styles.textCenter} style={{ padding: 40 }}>
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
              <SearchableSelect
                className="misa-select"
                style={{ width: 70, height: 32, padding: '0 8px' }}
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </SearchableSelect>
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
