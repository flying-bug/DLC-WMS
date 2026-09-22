import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import { getMyWarehouses } from '../../api/warehouseApi';
import { exportToExcel } from '../../utils/excelExport';
import StocktakeInitModal from './components/StocktakeInitModal';
import Toast from '../../components/ui/Toast/Toast';
import Pagination from '../../components/ui/Pagination/Pagination';
import styles from './StocktakeListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';
import DateInput from '../../components/ui/DateInput/DateInput';
import useSessionState from '../../hooks/useSessionState';


const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', code: 'warning' },
  COUNTING: { label: 'Đang kiểm kê (kho bị khóa)', code: 'info' },
  POSTED: { label: 'Đã xử lý chênh lệch', code: 'success' },
  COMPLETED: { label: 'Hoàn thành', code: 'success' },
  REJECTED: { label: 'Bị từ chối', code: 'danger' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const ALL_RECORDS_SIZE = 10000;
const formatDate = (value) => value ? formatDateOnly(value) : '';

function StocktakeListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const guard = usePermissionGuard();
  const [stocktakes, setStocktakes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const DEFAULT_FILTERS = useMemo(() => {
    const range = getDateRangePreset('THIS_YEAR');
    return {
      stocktakeCode: '',
      warehouseId: '',
      preset: 'THIS_YEAR',
      fromDate: range ? range.fromDate : '',
      toDate: range ? range.toDate : '',
      status: '',
    };
  }, []);
  const [filters, setFilters] = useSessionState('filters', DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });
  const [page, setPage] = useSessionState('page', 0);
  const [pageSize, setPageSize] = useSessionState('pageSize', 10);

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
  };

  useEffect(() => {
    if (location.state?.toastMessage) {
      const type = location.state.toastType || 'success';
      const msg = location.state.toastMessage;
      setTimeout(() => {
        showToast(type, msg);
      }, 0);
      // Clear state so refresh doesn't trigger it again
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);

  const loadLookups = useCallback(async () => {
    try {
      const warehouseRes = await getMyWarehouses();
      const whList = pageContent(unwrap(warehouseRes));
      setWarehouses(whList);
      if (whList.length === 1) {
        setFilters(prev => ({ ...prev, warehouseId: String(whList[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load warehouses', err);
    }
  }, []);

  const loadStocktakes = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = {
        stocktakeCode: filters.stocktakeCode || undefined,
        warehouseId: filters.warehouseId || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        status: filters.status || undefined,
        // API trả về Page (mặc định size=10) trong khi màn này phân trang phía client:
        // phải lấy toàn bộ bản ghi, nếu không tổng số/số trang chỉ tính trên 10 phiếu đầu tiên.
        page: 0,
        size: ALL_RECORDS_SIZE,
      };
      const response = await stocktakeApi.getStocktakes(params);
      const data = pageContent(unwrap(response));
      setStocktakes(data);
      if (!silent) setSelectedIds([]);
    } catch (err) {
      console.error(err.response?.data?.userMessage || 'Không tải được danh sách bảng kiểm kê');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);
  useRealtimeRefresh(['STOCKTAKE'], loadStocktakes);

  useEffect(() => {
     
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
     
    loadStocktakes();
  }, [loadStocktakes]);

  const rows = stocktakes.map(st => {
    const status = STATUS_LABELS[st.status] || { label: st.status || 'Không rõ', code: 'info' };
    return {
      ...st,
      date: formatDate(st.stocktakeDate),
      warehouse: warehouseById.get(st.warehouseId)?.name || (st.warehouseId ? `Kho #${st.warehouseId}` : 'Chưa chọn'),
      statusLabel: status.label,
      statusCode: status.code,
      isProcessed: st.status === 'POSTED'
    };
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  const handleExport = () => {
    const headers = ['Ngày', 'Số', 'Kiểm kê kho', 'Mục đích', 'Kết luận', 'Trạng thái'];
    const data = rows.map(item => [
      item.date,
      item.stocktakeCode,
      item.warehouse,
      item.purpose || item.note || '',
      item.conclusion || '',
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_kiem_ke');
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? paginatedRows.map(row => row.id) : []);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
  };

  const columns = [
    {
      title: <input
        type="checkbox"
        className={styles.checkbox}
        checked={paginatedRows.length > 0 && selectedIds.length === paginatedRows.length}
        onChange={handleSelectAll}
      />,
      width: '40px',
      align: 'center',
      render: (_, st) => (
        <div style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={selectedIds.includes(st.id)}
            onChange={(e) => handleSelectRow(e, st.id)}
          />
        </div>
      )
    },
    { title: 'NGÀY', dataIndex: 'date' },
    {
      title: 'SỐ',
      render: (_, st) => (
        <a
          href="#"
          className={styles.link}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(`/stocktakes/${st.id}`);
          }}
        >
          {st.stocktakeCode}
        </a>
      )
    },
    { title: 'KIỂM KÊ KHO', dataIndex: 'warehouse' },
    { title: 'MỤC ĐÍCH', render: (_, st) => st.purpose || st.note || '' },
    { title: 'KẾT LUẬN', render: (_, st) => st.conclusion || '' },
    {
      title: 'TRẠNG THÁI',
      render: (_, st) => (
        <span className={`${styles.badge} ${
          st.statusCode === 'success' ? styles.badgeSuccess :
          st.statusCode === 'info' ? styles.badgeInfo :
          st.statusCode === 'warning' ? styles.badgeWarning :
          styles.badgeDanger
        }`}>
          {st.statusLabel}
        </span>
      )
    }
  ];

  const renderActions = (st) => (
    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px' }} title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); navigate(`/stocktakes/${st.id}`); }}></i>
  );

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Kiểm kê vật tư hàng hóa</h1>
          <button className={styles.btnPrimary} onClick={() => guard('stocktake:add', () => setShowInitModal(true))}>
            Thêm bảng kiểm kê
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌM KIẾM SỐ PHIẾU</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Nhập từ khóa tìm kiếm..."
                value={filters.stocktakeCode}
                onChange={(e) => setFilters(prev => ({ ...prev, stocktakeCode: e.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>KỲ THỜI GIAN</span>
              <SearchableSelect
                className={styles.filterSelect}
                value={filters.preset || 'THIS_YEAR'}
                onChange={e => {
                  const presetKey = e.target.value;
                  if (presetKey === 'CUSTOM') {
                    setFilters(p => ({ ...p, preset: 'CUSTOM' }));
                    return;
                  }
                  const range = getDateRangePreset(presetKey);
                  setFilters(p => ({
                    ...p,
                    preset: presetKey,
                    fromDate: range ? range.fromDate : '',
                    toDate: range ? range.toDate : '',
                  }));
                }}
              >
                {DATE_PRESET_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </SearchableSelect>
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <DateInput
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value, preset: 'CUSTOM' }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ĐẾN NGÀY</span>
              <DateInput
                className={styles.filterInput}
                value={filters.toDate}
                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value, preset: 'CUSTOM' }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>KHO KIỂM KÊ</span>
              <SearchableSelect
                className={styles.filterSelect}
                value={filters.warehouseId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, warehouseId: e.target.value }))}
              >
                <option value="">{warehouses.length > 1 ? 'Tất cả kho được giao' : 'Tất cả'}</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </SearchableSelect>
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TRẠNG THÁI</span>
              <SearchableSelect
                className={styles.filterSelect}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="PENDING_APPROVAL">Chờ duyệt</option>
                <option value="COUNTING">Đang kiểm kê</option>
                <option value="POSTED">Đã xử lý</option>
                <option value="REJECTED">Bị từ chối</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="DRAFT">Lưu tạm</option>
              </SearchableSelect>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={`${styles.iconBtnAction} ${styles.reload}`} onClick={() => setFilters(DEFAULT_FILTERS)} title="Tải lại">
              <i className="bi bi-arrow-clockwise"></i> Tải lại
            </button>
            <button className={`${styles.iconBtnAction} ${styles.excel}`} onClick={handleExport} title="Xuất ra file excel">
              <i className="bi bi-file-earmark-excel"></i>
            </button>
            <button className={styles.btnPrimary} onClick={loadStocktakes}>
              <i className="bi bi-funnel"></i> Lọc
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className={styles.bulkActionsToolbar}>
            <div className={styles.bulkText}>Đã chọn {selectedIds.length} bảng kiểm kê</div>
            <div className={styles.bulkButtons}>
               <button className={styles.btnOutline} style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>Xóa hàng loạt</button>
            </div>
          </div>
        )}

        <div className={styles.tableContainer}>
          <ResponsiveTable
            columns={columns}
            data={paginatedRows}
            loading={loading}
            emptyMessage="Không có dữ liệu"
            onRowClick={(st) => navigate(`/stocktakes/${st.id}`)}
            actions={renderActions}
          />
          <div className={styles.pagination}>
            <span>Hiển thị {rows.length} bản ghi</span>
          </div>
        </div>


        
        {!loading && rows.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={rows.length}
            size={pageSize}
            onPageChange={setPage}
            onSizeChange={(size) => { setPageSize(size); setPage(0); }}
          />
        )}

        {showInitModal && (
          <StocktakeInitModal 
            onClose={() => setShowInitModal(false)} 
            warehouses={warehouses} 
          />
        )}
      </div>
      <Toast 
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </AdminLayout>
  );
}

export default StocktakeListPage;
