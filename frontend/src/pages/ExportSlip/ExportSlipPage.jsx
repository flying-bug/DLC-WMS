import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import styles from './ExportSlipPage.module.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  SUBMITTED: { label: 'Chờ duyệt', code: 'warning' },
  APPROVED: { label: 'Đã duyệt', code: 'success' },
  POSTED: { label: 'Hoàn thành', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '');
const sumAmount = (lines = []) => lines.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0);
const sumQuantity = (lines = []) => lines.reduce((sum, line) => sum + Number(line.quantityOut || 0), 0);

function ExportSlipPage() {
  const navigate = useNavigate();
  const [slips, setSlips] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ docCode: '', fromDate: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);
  const productById = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);

  const loadLookups = useCallback(async () => {
    const [warehouseRes, productRes] = await Promise.allSettled([
      exportApi.getWarehouses({ size: 100 }),
      exportApi.getProducts({ size: 100 }),
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
      const response = await exportApi.getExportHistory({
        docCode: filters.docCode || undefined,
        fromDate: filters.fromDate || undefined,
        status: filters.status || undefined,
      });
      const data = unwrap(response) || [];
      setSlips(data);
      setSelectedSlip(current => data.find(item => item.id === current?.id) || data[0] || null);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.userMessage || 'Không tải được danh sách phiếu xuất kho');
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
      date: formatDate(slip.docDate),
      warehouse: warehouseById.get(slip.warehouseId)?.name || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'Chưa chọn'),
      total: money(sumAmount(slip.lines)),
      statusLabel: status.label,
      statusCode: status.code,
    };
  });

  const toggleAll = (event) => {
    setSelectedIds(event.target.checked ? rows.map(row => row.id) : []);
  };

  const toggleRow = (event, id) => {
    event.stopPropagation();
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody} style={{ padding: 0 }}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách phiếu xuất kho</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/export-slips/create')}>
            <i className="bi bi-plus"></i> Thêm mới
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>Tìm kiếm</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Mã phiếu..."
                value={filters.docCode}
                onChange={(event) => setFilters(prev => ({ ...prev, docCode: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>Từ ngày</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(event) => setFilters(prev => ({ ...prev, fromDate: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>Trạng thái phiếu</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="SUBMITTED">Chờ duyệt</option>
                <option value="POSTED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>
          <div className={styles.pageControls}>
            <button className={styles.btnOutline} onClick={() => setFilters({ docCode: '', fromDate: '', status: '' })}>
              Làm mới
            </button>
            <button className={styles.btnPrimary} onClick={loadSlips}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
            </button>
          </div>
        </div>

        {error && <div className={styles.detailSection} style={{ color: '#b91c1c', marginBottom: 24 }}>{error}</div>}

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleAll} />
                </th>
                <th>Ngày hạch toán</th>
                <th>Số chứng từ</th>
                <th>Diễn giải</th>
                <th className={styles.textRight}>Tổng tiền</th>
                <th>Kho xuất</th>
                <th>Trạng thái</th>
                <th className={styles.textCenter}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map(slip => (
                <tr key={slip.id} className={selectedSlip?.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)}>
                  <td><input type="checkbox" checked={selectedIds.includes(slip.id)} onChange={(event) => toggleRow(event, slip.id)} onClick={(event) => event.stopPropagation()} /></td>
                  <td>{slip.date}</td>
                  <td><a href="#" className={styles.link} onClick={(event) => event.preventDefault()}>{slip.docCode}</a></td>
                  <td>{slip.note || 'Không có ghi chú'}</td>
                  <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>
                  <td>{slip.warehouse}</td>
                  <td>
                    <span className={`${styles.badge} ${slip.statusCode === 'success' ? styles.badgeSuccess :
                        slip.statusCode === 'info' ? styles.badgeInfo :
                          slip.statusCode === 'warning' ? styles.badgeWarning :
                            styles.badgeDanger
                      }`}>
                      {slip.statusLabel}
                    </span>
                  </td>
                  <td className={styles.textCenter}>
                    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiết" onClick={(event) => { event.stopPropagation(); setSelectedSlip(slip); }}></i>
                    <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sửa phiếu xuất kho" onClick={(event) => { event.stopPropagation(); navigate(`/export-slips/${slip.id}/edit`); }}></i>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className={styles.textCenter}>
                    {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy phiếu xuất nào'}
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
              <i className={`bi bi-receipt ${styles.detailIcon}`}></i>
              <h2 className={styles.detailTitle}>Chi tiết phiếu xuất kho: {selectedSlip.docCode}</h2>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailGroup}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Đối tượng</span>
                  <span className={styles.detailValue}>{selectedSlip.partnerId ? `Đối tượng #${selectedSlip.partnerId}` : 'Chưa chọn'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lý do xuất</span>
                  <span className={styles.detailValue}>{selectedSlip.note || 'Không có ghi chú'}</span>
                </div>
              </div>

              <div className={styles.detailGroup}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Diễn giải</span>
                  <span className={styles.detailValue}>{selectedSlip.note || 'Không có ghi chú'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Trạng thái</span>
                  <span className={styles.detailValue}>{STATUS_LABELS[selectedSlip.status]?.label || selectedSlip.status}</span>
                </div>
              </div>

              <div className={styles.detailRight}>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Ngày chứng từ</span>
                  <span className={styles.detailRightValue}>{formatDate(selectedSlip.docDate)}</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Kho xuất</span>
                  <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{warehouseById.get(selectedSlip.warehouseId)?.name || `Kho #${selectedSlip.warehouseId}`}</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Nhân viên lập</span>
                  <span className={styles.detailRightValue}>{selectedSlip.createdBy ? `User #${selectedSlip.createdBy}` : 'Chưa có'}</span>
                </div>
              </div>
            </div>

            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th>DVT</th>
                  <th className={styles.textRight}>Số lượng</th>
                  <th className={styles.textRight}>Đơn giá</th>
                  <th className={styles.textRight}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(selectedSlip.lines || []).map((line, index) => {
                  const product = productById.get(line.variantId);
                  return (
                    <tr key={line.id || index}>
                      <td><a href="#" className={styles.link} onClick={(event) => event.preventDefault()}>{product?.productCode || `SP #${line.variantId}`}</a></td>
                      <td>{product?.productName || 'Chưa có tên sản phẩm'}</td>
                      <td>{product?.unitName || ''}</td>
                      <td className={styles.textRight}>{Number(line.quantityOut || 0).toLocaleString('vi-VN')}</td>
                      <td className={styles.textRight}>{money(line.unitPrice)}</td>
                      <td className={`${styles.textRight} ${styles.money}`}>{money(line.lineAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.detailFooter}>
              <div className={styles.footerTotalLabel}>Tổng cộng:</div>
              <div className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</div>
              <div className={styles.footerMoney}>{money(sumAmount(selectedSlip.lines))}</div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default ExportSlipPage;
