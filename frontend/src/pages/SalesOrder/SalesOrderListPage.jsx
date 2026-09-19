import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import TimeInfoBadge from '../../components/ui/TimeInfoBadge/TimeInfoBadge';
import * as soApi from '../../api/salesOrderApi';
import styles from './SalesOrderListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import { exportToExcel } from '../../utils/excelExport';
import { printQuotation } from '../../utils/printQuotation';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';


const STATUS_LABELS = {
  DRAFT:     { label: 'Nháp',         code: 'info'    },
  APPROVED:  { label: 'Đã duyệt',     code: 'success' },
  POSTED:    { label: 'Ghi sổ',       code: 'purple'  },
  CANCELLED: { label: 'Đã hủy',       code: 'danger'  },
};

const PAYMENT_STATUS_LABELS = {
  UNPAID: { label: 'Chưa thanh toán', color: '#991b1b', bg: '#fee2e2' },
  PARTIAL: { label: 'Trả một phần', color: '#854d0e', bg: '#fef08a' },
  PAID: { label: 'Đã thanh toán', color: '#166534', bg: 'var(--color-success-bg)' },
};

const STATUS_OPTIONS = [
  { value: 'DRAFT',     label: 'Nháp'         },
  { value: 'APPROVED',  label: 'Đã duyệt'     },
  { value: 'POSTED',    label: 'Ghi sổ'       },
  { value: 'CANCELLED', label: 'Đã hủy'       },
];

const RESERVATION_STATUS_OPTIONS = [
  { value: 'NOT_RESERVED', label: 'Chưa giữ hàng'  },
  { value: 'RESERVED',     label: 'Đã giữ hàng'    },
  { value: 'BACKORDERED',  label: 'Chờ nhập hàng'  },
  { value: 'RELEASED',     label: 'Đã giải phóng'  },
];

const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const fmtDate = (v) => (v ? formatDateOnly(v) : '');
const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (p) => p?.content ?? p ?? [];

function SalesOrderListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const guard = usePermissionGuard();

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const DEFAULT_FILTERS = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const range = getDateRangePreset('THIS_YEAR');
    return {
      keyword: '',
      status: searchParams.get('status') || '',
      reservationStatus: searchParams.get('backordered') === 'true' ? 'BACKORDERED' : '',
      partnerId: '',
      warehouseId: '',
      preset: 'THIS_YEAR',
      fromDate: range ? range.fromDate : '',
      toDate: range ? range.toDate : '',
    };
  }, [location.search]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmCancel, setConfirmCancel] = useState(null); // SO to cancel
  const [confirmApprove, setConfirmApprove] = useState(null); // SO to approve

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [cRes, wRes] = await Promise.all([
          soApi.getCustomers({ size: 200 }),
          soApi.getWarehouses({ size: 100 }),
        ]);
        setCustomers(pageContent(unwrap(cRes)));
        setWarehouses(pageContent(unwrap(wRes)));
      } catch (err) {
        console.error('Không tải được danh mục bổ trợ', err);
      }
    };
    loadLookups();
  }, []);

  const loadOrders = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await soApi.getSalesOrders({
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        reservationStatus: filters.reservationStatus || undefined,
        partnerId: filters.partnerId || undefined,
        warehouseId: filters.warehouseId || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      });
      setOrders(unwrap(res) || []);
    } catch {
      showToast('error', 'Không thể tải danh sách đơn bán hàng');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);
  useRealtimeRefresh(['SALES_ORDER'], loadOrders);

  const handleExport = () => {
    if (!orders || orders.length === 0) {
      showToast('warning', 'Không có dữ liệu để xuất Excel');
      return;
    }
    const headers = ['Mã đơn', 'Ngày lập', 'Khách hàng', 'Tổng tiền', 'Trạng thái'];
    const data = orders.map(so => [
      so.soCode,
      fmtDate(so.soDate),
      so.customerName || `#${so.customerId}`,
      money(so.totalAmount),
      STATUS_LABELS[so.status]?.label || so.status
    ]);
    exportToExcel(headers, data, 'Danh_sach_don_ban_hang');
    showToast('success', 'Xuất Excel thành công!');
  };

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
      // Đơn hàng có dòng ở nhiều kho khác nhau sẽ sinh ra nhiều phiếu xuất (1 phiếu/kho) -
      // luôn nhận về mảng, kể cả khi chỉ có 1 phiếu.
      const exportDocs = unwrap(res) || [];
      if (exportDocs.length === 1) {
        showToast('success', 'Đã tạo phiếu xuất kho. Đang chuyển sang trang xuất kho...');
        setTimeout(() => navigate(`/export-slips/${exportDocs[0].id}/edit`), 800);
      } else if (exportDocs.length > 1) {
        // ExportSlipPage đọc filter qua location.state (referenceId/referenceType), không
        // qua query string - dùng đúng cơ chế sẵn có để lọc thẳng ra các phiếu vừa tạo.
        setTimeout(() => navigate('/export-slips', {
          state: {
            referenceId: so.id,
            referenceType: 'SALES_ORDER',
            toastMessage: `Đơn hàng có sản phẩm ở nhiều kho - đã tự động tạo ${exportDocs.length} phiếu xuất kho cho các kho tương ứng.`,
            toastType: 'success',
          },
        }), 800);
      } else {
        showToast('error', 'Không thể tạo phiếu xuất kho');
      }
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể tạo phiếu xuất kho');
    }
  };

  const handlePrintQuote = async (soSummary, e) => {
    e.stopPropagation();
    try {
      let fullSo = soSummary;
      if (!fullSo.lines || fullSo.lines.length === 0) {
        const res = await soApi.getSalesOrderById(soSummary.id);
        fullSo = unwrap(res);
      }
      printQuotation(fullSo);
    } catch {
      showToast('error', 'Không thể tải dữ liệu để in báo giá');
    }
  };

  // Pagination
  const totalItems = orders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns = [
    {
      title: '#',
      width: 50,
      render: (_, __, idx) => (currentPage - 1) * pageSize + idx + 1
    },
    {
      title: 'Mã đơn',
      dataIndex: 'soCode',
      width: 130,
      render: (val, so) => (
        <a className={styles.link} onClick={e => { e.stopPropagation(); navigate(`/sales-orders/${so.id}`); }}>
          {val}
        </a>
      )
    },
    {
      title: 'Ngày lập',
      dataIndex: 'soDate',
      width: 110,
      render: (val) => fmtDate(val)
    },
    {
      title: 'Khách hàng',
      render: (_, so) => so.partnerName || `#${so.partnerId}`
    },
    {
      title: 'Kho',
      render: (_, so) => so.warehouseName || `Kho #${so.warehouseId}`,
      width: 140
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      width: 130,
      align: 'right',
      render: (val) => <span className={`${styles.money} ${styles.textRight}`} style={{ whiteSpace: 'nowrap' }}>{money(val)}</span>
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      width: 110,
      render: (val) => {
        const st = STATUS_LABELS[val] || { label: val, code: 'info' };
        return (
          <span className={`${styles.badge} ${st.code === 'success' ? styles.badgeSuccess :
            st.code === 'purple' ? styles.badgeWarning :
              st.code === 'danger' ? styles.badgeDanger :
                styles.badgeInfo
            }`}>
            {st.label}
          </span>
        );
      }
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      width: 120,
      render: (val) => {
        const pst = PAYMENT_STATUS_LABELS[val || 'UNPAID'];
        return (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
            backgroundColor: pst.bg, color: pst.color, whiteSpace: 'nowrap'
          }}>
            {pst.label}
          </span>
        );
      }
    }
  ];

  const renderActions = (so) => (
    <>
      <i
        className="bi bi-eye"
        title="Xem chi tiết"
        style={{ cursor: 'pointer', marginRight: 10, color: 'var(--color-text-muted-2)', fontSize: 15 }}
        onClick={() => navigate(`/sales-orders/${so.id}`)}
      />
      <i
        className="bi bi-printer"
        title="In báo giá"
        style={{ cursor: 'pointer', marginRight: 10, color: 'var(--color-info-hover)', fontSize: 15 }}
        onClick={(e) => handlePrintQuote(so, e)}
      />
      {so.status === 'DRAFT' && (
        <i
          className="bi bi-pencil"
          title="Sửa"
          style={{ cursor: 'pointer', marginRight: 10, color: 'var(--color-primary)', fontSize: 15 }}
          onClick={() => guard('sales_order:edit', () => navigate(`/sales-orders/${so.id}/edit`))}
        />
      )}
      {so.status === 'DRAFT' && (
        <i
          className="bi bi-check2-circle"
          title="Duyệt đơn"
          style={{ cursor: 'pointer', marginRight: 10, color: '#22c55e', fontSize: 15 }}
          onClick={() => guard('sales_order:edit', () => setConfirmApprove(so))}
        />
      )}
      {so.status === 'APPROVED' && (
        <i
          className="bi bi-box-arrow-right"
          title="Tạo phiếu xuất kho"
          style={{ cursor: 'pointer', marginRight: 10, color: '#8b5cf6', fontSize: 15 }}
          onClick={() => guard('sales_order:edit', () => handleCreateExport(so))}
        />
      )}
      {so.status === 'DRAFT' && (
        <i
          className="bi bi-x-circle"
          title="Hủy đơn"
          style={{ cursor: 'pointer', color: 'var(--wms-danger)', fontSize: 15 }}
          onClick={() => guard('sales_order:edit', () => setConfirmCancel(so))}
        />
      )}
    </>
  );

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {/* ── Header ── */}
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>
            Đơn bán hàng
          </h1>
          <button className={styles.btnPrimary} onClick={() => guard('sales_order:add', () => navigate('/sales-orders/create'))}>
            <i className="bi bi-plus" /> Tạo đơn bán hàng
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
                placeholder="Tìm theo mã đơn, khách hàng..."
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
              warehouses={warehouses}
              partners={customers}
              partnerLabel="Khách hàng"
              statusOptions={STATUS_OPTIONS}
              customSelects={[
                {
                  key: 'reservationStatus',
                  label: 'Tình trạng giữ hàng',
                  options: RESERVATION_STATUS_OPTIONS,
                },
              ]}
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
          <ResponsiveTable
            columns={columns}
            data={paginatedOrders}
            loading={loading}
            emptyMessage="Không tìm thấy đơn bán hàng nào"
            onRowClick={(so) => navigate(`/sales-orders/${so.id}`)}
            actions={renderActions}
          />
        </div>

        <div className={styles.sharedPagination}>
          <Pagination
            page={currentPage - 1}
            totalPages={Math.max(1, totalPages)}
            totalElements={totalItems}
            size={pageSize}
            onPageChange={(page) => setCurrentPage(page + 1)}
            onSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
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
