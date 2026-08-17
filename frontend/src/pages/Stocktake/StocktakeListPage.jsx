import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import { exportToExcel } from '../../utils/excelExport';
import StocktakeInitModal from './components/StocktakeInitModal';
import Toast from '../../components/ui/Toast/Toast';
import styles from './StocktakeListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  POSTED: { label: 'Đã xử lý chênh lệch', code: 'success' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const formatDate = (value) => value ? formatDateOnly(value) : '';

function StocktakeListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stocktakes, setStocktakes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const DEFAULT_FILTERS = useMemo(() => {
    const range = getDateRangePreset('THIS_YEAR');
    return {
      stocktakeCode: '',
      preset: 'THIS_YEAR',
      fromDate: range ? range.fromDate : '',
      toDate: range ? range.toDate : '',
      status: '',
    };
  }, []);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

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
      const warehouseRes = await stocktakeApi.getWarehouses({ size: 100 });
      setWarehouses(pageContent(unwrap(warehouseRes)));
    } catch (err) {
      console.error('Failed to load warehouses', err);
    }
  }, []);

  const loadStocktakes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        stocktakeCode: filters.stocktakeCode || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        status: filters.status || undefined,
      };
      const response = await stocktakeApi.getStocktakes(params);
      const data = pageContent(unwrap(response));
      setStocktakes(data);
      setSelectedIds([]);
    } catch (err) {
      console.error(err.response?.data?.userMessage || 'Không tải được danh sách bảng kiểm kê');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
    setSelectedIds(e.target.checked ? rows.map(row => row.id) : []);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Kiểm kê vật tư hàng hóa</h1>
          <button className={styles.btnPrimary} onClick={() => setShowInitModal(true)}>
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
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value, preset: 'CUSTOM' }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ĐẾN NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.toDate}
                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value, preset: 'CUSTOM' }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TRẠNG THÁI</span>
              <SearchableSelect
                className={styles.filterSelect}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="POSTED">Đã xử lý</option>
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
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>NGÀY</th>
                <th>SỐ</th>
                <th>KIỂM KÊ KHO</th>
                <th>MỤC ĐÍCH</th>
                <th>KẾT LUẬN</th>
                <th>TRẠNG THÁI</th>
                <th className={styles.textCenter}>CHỨC NĂNG</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map(st => (
                <tr key={st.id} onClick={() => navigate(`/stocktakes/${st.id}`)}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selectedIds.includes(st.id)}
                      onChange={(e) => handleSelectRow(e, st.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>{st.date}</td>
                  <td>
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
                  </td>
                  <td>{st.warehouse}</td>
                  <td>{st.purpose || st.note || ''}</td>
                  <td>{st.conclusion || ''}</td>
                  <td>
                      <span className={`${styles.badge} ${
                        st.statusCode === 'success' ? styles.badgeSuccess :
                        st.statusCode === 'info' ? styles.badgeInfo :
                        st.statusCode === 'warning' ? styles.badgeWarning :
                        styles.badgeDanger
                      }`}>
                        {st.statusLabel}
                      </span>
                  </td>
                  <td className={styles.textCenter}>
                     <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px' }} title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); navigate(`/stocktakes/${st.id}`); }}></i>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">
                    <div className={styles.emptyState}>
                      <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                      <div className={styles.emptyText}>{loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu'}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <span>Hiển thị {rows.length} bản ghi</span>
          </div>
        </div>


        
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
