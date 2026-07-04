import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import { exportToExcel } from '../../utils/excelExport';
import StocktakeInitModal from './components/StocktakeInitModal';
import Toast from '../../components/ui/Toast/Toast';
import styles from './StocktakeListPage.module.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  SUBMITTED: { label: 'Chờ xử lý', code: 'warning' },
  POSTED: { label: 'Đã xử lý chênh lệch', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '';

function StocktakeListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stocktakes, setStocktakes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ stocktakeCode: '', fromDate: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editStatusValue, setEditStatusValue] = useState('');
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
    setError('');
    try {
      const params = {
        stocktakeCode: filters.stocktakeCode || undefined,
        fromDate: filters.fromDate || undefined,
        status: filters.status || undefined,
      };
      const response = await stocktakeApi.getStocktakes(params);
      const data = pageContent(unwrap(response));
      setStocktakes(data);
      setSelectedStocktake(current => data.find(item => item.id === current?.id) || data[0] || null);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.userMessage || 'Không tải được danh sách bảng kiểm kê');
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
    const headers = ['Ngày', 'Số', 'Kiểm kê kho', 'Mục đích', 'Kết luận', 'Đã xử lý'];
    const data = rows.map(item => [
      item.date,
      item.stocktakeCode,
      item.warehouse,
      item.note,
      item.statusLabel,
      item.isProcessed ? 'Có' : 'Không'
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
          <button className={styles.btnPrimary} style={{ backgroundColor: '#2e7d32' }} onClick={() => setShowInitModal(true)}>
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
              <span className={styles.filterLabel}>NGÀY KIỂM KÊ</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TRẠNG THÁI</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="SUBMITTED">Chờ xử lý</option>
                <option value="POSTED">Đã xử lý</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={`${styles.iconBtnAction} ${styles.reload}`} onClick={() => setFilters({ stocktakeCode: '', fromDate: '', status: '' })} title="Tải lại">
              <i className="bi bi-arrow-clockwise"></i> Tải lại
            </button>
            <button className={`${styles.iconBtnAction} ${styles.excel}`} onClick={handleExport} title="Xuất ra file excel">
              <i className="bi bi-file-earmark-excel"></i> Xuất Excel
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
                <th className={styles.textCenter}>ĐÃ XỬ LÝ</th>
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
                  <td><a href="#" className={styles.link} onClick={(e) => e.preventDefault()}>{st.stocktakeCode}</a></td>
                  <td>{st.warehouse}</td>
                  <td>{st.note || ''}</td>
                  <td>
                    {editingRowId === st.id ? (
                      <select 
                        value={editStatusValue} 
                        onChange={(e) => setEditStatusValue(e.target.value)}
                        className={styles.statusSelect}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.entries(STATUS_LABELS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`${styles.badge} ${
                        st.statusCode === 'success' ? styles.badgeSuccess :
                        st.statusCode === 'info' ? styles.badgeInfo :
                        st.statusCode === 'warning' ? styles.badgeWarning :
                        styles.badgeDanger
                      }`}
                      style={{ cursor: 'pointer' }}
                      title="Nhấn để đổi trạng thái"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingRowId(st.id);
                        setEditStatusValue(st.status || 'DRAFT');
                      }}
                      >
                        {st.statusLabel}
                      </span>
                    )}
                  </td>
                  <td className={styles.textCenter}>
                    {st.isProcessed ? <i className="bi bi-check-circle-fill" style={{ color: 'var(--color-success-strong)' }}></i> : ''}
                  </td>
                  <td className={styles.textCenter}>
                    {editingRowId === st.id ? (
                      <>
                        <i className="bi bi-check-lg" style={{ cursor: 'pointer', color: 'var(--color-success-strong)', fontSize: '18px', marginRight: '12px' }} title="Lưu" onClick={(e) => { 
                          e.stopPropagation(); 
                          // Update mock data logic here
                          const updated = stocktakes.map(item => item.id === st.id ? { 
                            ...item, 
                            status: editStatusValue,
                            statusCode: STATUS_LABELS[editStatusValue]?.code,
                            statusLabel: STATUS_LABELS[editStatusValue]?.label
                          } : item);
                          setStocktakes(updated);
                          setEditingRowId(null);
                          showToast('success', 'Đã cập nhật trạng thái phiếu kiểm kê!');
                        }}></i>
                        <i className="bi bi-x-lg" style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '18px' }} title="Hủy" onClick={(e) => { e.stopPropagation(); setEditingRowId(null); }}></i>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px' }} title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); navigate(`/stocktakes/${st.id}`); }}></i>
                      </>
                    )}
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
