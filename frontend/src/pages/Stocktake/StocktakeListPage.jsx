import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import { exportToExcel } from '../../utils/excelExport';
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
  const [stocktakes, setStocktakes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedStocktake, setSelectedStocktake] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ stocktakeCode: '', fromDate: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          <button className={styles.btnPrimary} style={{ backgroundColor: '#2e7d32' }} onClick={() => navigate('/stocktakes/create')}>
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
            <button className={styles.btnOutline} onClick={() => setFilters({ stocktakeCode: '', fromDate: '', status: '' })}>
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <button className={styles.btnOutline} onClick={handleExport} title="Xuất ra file excel">
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
                <th className={styles.textCenter}>ĐÃ XỬ LÝ</th>
                <th className={styles.textCenter}>CHỨC NĂNG</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map(st => (
                <tr key={st.id} className={selectedStocktake?.id === st.id ? styles.activeRow : ''} onClick={() => setSelectedStocktake(st)}>
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
                    {st.isProcessed ? <i className="bi bi-check-circle-fill" style={{ color: 'var(--color-success-strong)' }}></i> : ''}
                  </td>
                  <td className={styles.textCenter}>
                    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); setSelectedStocktake(st); }}></i>
                    <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sửa" onClick={(e) => { e.stopPropagation(); navigate(`/stocktakes/${st.id}/edit`); }}></i>
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

        {selectedStocktake && (
          <div className={styles.detailSection}>
            <div className={styles.detailHeader}>
              <i className={`bi bi-card-checklist ${styles.detailIcon}`}></i>
              <h2 className={styles.detailTitle}>Chi tiết kiểm kê: {selectedStocktake.stocktakeCode}</h2>
            </div>
            <div className={styles.detailGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className={styles.detailGroup}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Kho kiểm kê</span>
                  <span className={`${styles.detailValue} ${styles.textBlue}`}>{warehouseById.get(selectedStocktake.warehouseId)?.name || `Kho #${selectedStocktake.warehouseId}`}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Ngày kiểm kê</span>
                  <span className={styles.detailValue}>{formatDate(selectedStocktake.stocktakeDate)}</span>
                </div>
              </div>
              <div className={styles.detailGroup}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mục đích / Ghi chú</span>
                  <span className={styles.detailValue}>{selectedStocktake.note || 'Không có ghi chú'}</span>
                </div>
                 <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Trạng thái</span>
                  <span className={styles.detailValue}>{STATUS_LABELS[selectedStocktake.status]?.label || selectedStocktake.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default StocktakeListPage;
