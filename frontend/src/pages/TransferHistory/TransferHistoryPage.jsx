import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as transferApi from '../../api/stockTransferApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './TransferHistoryPage.module.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  SUBMITTED: { label: 'Lưu tạm', code: 'info' },
  POSTED: { label: 'Hoàn thành', code: 'success' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '';
const sumQuantity = (lines = []) => lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

function TransferHistoryPage() {
  const navigate = useNavigate();
  const [slips, setSlips] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ transferCode: '', fromDate: '', toDate: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);
  const productById = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);

  const loadLookups = useCallback(async () => {
    const [warehouseRes, productRes] = await Promise.allSettled([
      transferApi.getWarehouses({ size: 100 }),
      transferApi.getProducts({ size: 100 }),
    ]);

    if (warehouseRes.status === 'fulfilled') {
      setWarehouses(pageContent(unwrap(warehouseRes.value)));
    }
    if (productRes.status === 'fulfilled') {
      setProducts(pageContent(unwrap(productRes.value)));
    }
  }, []);

  const loadSlips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        transferCode: filters.transferCode || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        status: filters.status || undefined,
      };
      const response = await transferApi.getTransferHistory(params);
      const data = unwrap(response) || [];
      setSlips(data);
      setSelectedSlip(current => data.find(item => item.id === current?.id) || data[0] || null);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.userMessage || 'Không tải được danh sách phiếu chuyển kho');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSlips();
  }, [loadSlips]);

  const rows = slips.map(slip => {
    const status = STATUS_LABELS[slip.status] || { label: slip.status || 'Không rõ', code: 'info' };
    return {
      ...slip,
      date: formatDate(slip.transferDate),
      fromWarehouse: warehouseById.get(slip.fromWarehouseId)?.name || (slip.fromWarehouseId ? `Kho #${slip.fromWarehouseId}` : 'Chưa chọn'),
      toWarehouse: warehouseById.get(slip.toWarehouseId)?.name || (slip.toWarehouseId ? `Kho #${slip.toWarehouseId}` : 'Chưa chọn'),
      quantity: sumQuantity(slip.lines),
      statusLabel: status.label,
      statusCode: status.code,
    };
  });

  const handleExport = () => {
    const headers = ['Ngày ghi nhận', 'Số phiếu', 'Từ kho', 'Đến kho', 'Số lượng', 'Trạng thái'];
    const data = rows.map(item => [
      item.date,
      item.transferCode,
      item.fromWarehouse,
      item.toWarehouse,
      item.quantity,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_phieu_chuyen_kho');
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
          <h1 className={styles.pageTitle}>Danh sách phiếu chuyển kho</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/transfer-history/create')}>
            <i className="bi bi-plus"></i> Thêm mới
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌM KIẾM</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Mã phiếu..."
                value={filters.transferCode}
                onChange={(e) => setFilters(prev => ({ ...prev, transferCode: e.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ĐẾN NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.toDate}
                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌNH TRẠNG</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="POSTED">Hoàn thành</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={styles.btnOutline} onClick={() => setFilters({ transferCode: '', fromDate: '', toDate: '', status: '' })}>
              Làm mới
            </button>
            <button className={styles.btnOutline} onClick={handleExport}>
              <i className="bi bi-file-earmark-excel"></i> Xuất Excel
            </button>
            <button className={styles.btnPrimary} onClick={loadSlips}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
            </button>
          </div>
        </div>

        {error && <div className={styles.emptyState}>{error}</div>}

        {selectedIds.length > 0 && (
          <div className={styles.bulkActionsToolbar}>
            <div className={styles.bulkText}>Đã chọn {selectedIds.length} phiếu chuyển</div>
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
                <th>Ngày ghi nhận</th>
                <th>Số phiếu</th>
                <th>Từ kho</th>
                <th>Đến kho</th>
                <th className={styles.textCenter}>Số lượng</th>
                <th>Trạng thái</th>
                <th className={styles.textCenter}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map(slip => (
                <tr key={slip.id} className={selectedSlip?.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selectedIds.includes(slip.id)}
                      onChange={(e) => handleSelectRow(e, slip.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>{slip.date}</td>
                  <td>
                    <a
                      href="#"
                      className={styles.link}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSlip(slip);
                      }}
                    >
                      {slip.transferCode}
                    </a>
                  </td>
                  <td>{slip.fromWarehouse}</td>
                  <td>{slip.toWarehouse}</td>
                  <td className={styles.textCenter}>{slip.quantity.toLocaleString('vi-VN')}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      slip.statusCode === 'success' ? styles.badgeSuccess :
                      slip.statusCode === 'info' ? styles.badgeInfo :
                      slip.statusCode === 'warning' ? styles.badgeWarning :
                      styles.badgeDanger
                    }`}>
                      {slip.statusLabel}
                    </span>
                  </td>
                  <td className={styles.textCenter}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', width: '44px' }}>
                      <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); setSelectedSlip(slip); }}></i>
                      {(slip.status === 'DRAFT' || slip.status === 'SUBMITTED') && (
                        <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sửa phiếu chuyển kho" onClick={(e) => { e.stopPropagation(); navigate(`/transfer-history/${slip.id}/edit`); }}></i>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">
                    <div className={styles.emptyState}>
                      <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                      <div className={styles.emptyText}>{loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy phiếu chuyển nào'}</div>
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

        {selectedSlip && (
          <div className={styles.detailSection}>
            <div className={styles.detailHeader}>
              <i className={`bi bi-arrow-left-right ${styles.detailIcon}`}></i>
              <h2 className={styles.detailTitle}>Chi tiết phiếu chuyển: {selectedSlip.transferCode}</h2>
              <div style={{ flex: 1 }}></div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Ghi chú</span>
                  <span className={styles.detailValue}>{selectedSlip.note || 'Không có ghi chú'}</span>
                </div>
              </div>

              <div className={styles.detailRight}>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Ngày chuyển</span>
                  <span className={styles.detailRightValue}>{formatDate(selectedSlip.transferDate)}</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Từ kho</span>
                  <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{warehouseById.get(selectedSlip.fromWarehouseId)?.name || `Kho #${selectedSlip.fromWarehouseId}`}</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Đến kho</span>
                  <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{warehouseById.get(selectedSlip.toWarehouseId)?.name || `Kho #${selectedSlip.toWarehouseId}`}</span>
                </div>
              </div>
            </div>

            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã sản phẩm</th>
                  <th>Tên sản phẩm</th>
                  <th>ĐVT</th>
                  <th className={styles.textCenter}>Số lượng chuyển</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {(selectedSlip.lines || []).map((line, index) => {
                  const product = productById.get(line.variantId);
                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td className={styles.textBlue}>{product?.sku || `SKU #${line.variantId}`}</td>
                      <td>{variantLabel(product) || 'Chưa có tên sản phẩm'}</td>
                      <td>{product?.unitName || ''}</td>
                      <td className={styles.textCenter}>{Number(line.quantity || 0).toLocaleString('vi-VN')}</td>
                      <td>{line.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.detailFooter}>
              <div className={styles.footerTotalLabel}>Tổng cộng số lượng chuyển:</div>
              <div className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default TransferHistoryPage;
