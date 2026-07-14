import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';

import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './ImportHistoryPage.module.css';

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
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '';
const sumAmount = (lines = []) => lines.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0);
const sumQuantity = (lines = []) => lines.reduce((sum, line) => sum + Number(line.quantityIn || 0), 0);
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

function ImportHistoryPage() {
  const navigate = useNavigate();
  const [slips, setSlips] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmPost, setConfirmPost] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ docCode: '', fromDate: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);
  const supplierById = useMemo(() => new Map(suppliers.map(item => [item.id, item])), [suppliers]);
  const productById = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);

  const loadLookups = useCallback(async () => {
    const [warehouseRes, supplierRes, productRes] = await Promise.allSettled([
      importApi.getWarehouses({ size: 100 }),
      importApi.getSuppliers(),
      importApi.getProducts({ size: 100 }),
    ]);

    if (warehouseRes.status === 'fulfilled') {
      setWarehouses(pageContent(unwrap(warehouseRes.value)));
    }
    if (supplierRes.status === 'fulfilled') {
      setSuppliers(pageContent(unwrap(supplierRes.value)));
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
        docCode: filters.docCode || undefined,
        fromDate: filters.fromDate || undefined,
        status: filters.status || undefined,
      };
      const response = await importApi.getImportHistory(params);
      const data = unwrap(response) || [];
      setSlips(data);
      setSelectedSlip(current => data.find(item => item.id === current?.id) || null);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.userMessage || 'Không tải được danh sách phiếu nhập kho');
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
      partner: supplierById.get(slip.partnerId)?.name || (slip.partnerId ? `NCC #${slip.partnerId}` : 'Chưa chọn'),
      warehouse: warehouseById.get(slip.warehouseId)?.name || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'Chưa chọn'),
      total: money(sumAmount(slip.lines)),
      quantity: sumQuantity(slip.lines),
      statusLabel: status.label,
      statusCode: status.code,
    };
  });

  const handleExport = () => {
    const headers = ['Ngày ghi nhận', 'Số chứng từ', 'Nhà cung cấp', 'Kho nhập', 'Tổng tiền', 'Trạng thái'];
    const data = rows.map(item => [
      item.date,
      item.docCode,
      item.partner,
      item.warehouse,
      item.total,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_phieu_nhap_kho');
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? rows.map(row => row.id) : []);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
  };



  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách phiếu nhập kho</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/import-history/create')}>
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
                value={filters.docCode}
                onChange={(e) => setFilters(prev => ({ ...prev, docCode: e.target.value }))}
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
              <span className={styles.filterLabel}>TÌNH TRẠNG</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="SUBMITTED">Chờ duyệt</option>
                <option value="POSTED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={styles.btnOutline} onClick={() => setFilters({ docCode: '', fromDate: '', status: '' })}>
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
            <div className={styles.bulkText}>Đã chọn {selectedIds.length} phiếu nhập</div>
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
                <th>Nhà cung cấp</th>
                <th>Kho nhập</th>
                <th className={styles.textRight}>Tổng tiền</th>
                <th>Trạng thái</th>
                <th className={styles.textCenter}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? paginatedRows.map(slip => (
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
                  <td><a href="#" className={styles.link} onClick={(e) => e.preventDefault()}>{slip.docCode}</a></td>
                  <td>{slip.partner}</td>
                  <td>{slip.warehouse}</td>
                  <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>
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
                    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); setSelectedSlip(slip); }}></i>
                    <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sửa phiếu nhập kho" onClick={(e) => {
                      e.stopPropagation();
                      if (slip.status !== 'DRAFT') {
                        showToast('error', 'Chỉ có thể cập nhật phiếu lưu tạm.');
                      } else {
                        navigate(`/import-slips/${slip.id}/edit`);
                      }
                    }}></i>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">
                    <div className={styles.emptyState}>
                      <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                      <div className={styles.emptyText}>{loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy phiếu nhập nào'}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Hiển thị</span>
              <select 
                className="misa-select" 
                style={{ width: '70px', height: '32px', padding: '0 8px' }} 
                value={pageSize} 
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>trên tổng số {totalItems} bản ghi</span>
            </div>
            
            {totalPages > 1 && (
              <div className={styles.pageControls}>
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={styles.pageBtn}
                >
                  <i className="bi bi-chevron-left"></i>
                  <span>Trước</span>
                </button>

                <div className={styles.paginationNumbers}>
                  {getPageNumbers().map((num, idx) => (
                    num === currentPage ? (
                      <input
                        key={idx}
                        className={`${styles.pageNumber} ${styles.active}`}
                        style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                        defaultValue={num}
                        title="Nhập số trang và nhấn Enter"
                        onBlur={(e) => e.target.value = currentPage}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            let p = parseInt(e.target.value, 10);
                            if (!isNaN(p)) {
                              p = Math.max(1, Math.min(totalPages, p));
                              setCurrentPage(p);
                              e.target.blur();
                            } else {
                              e.target.value = currentPage;
                            }
                          }
                        }}
                      />
                    ) : (
                      <span 
                        key={idx} 
                        className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                        onClick={() => num !== '...' && setCurrentPage(num)}
                      >
                        {num}
                      </span>
                    )
                  ))}
                </div>

                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={styles.pageBtn}
                >
                  <span>Sau</span>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedSlip && (
          <div className={styles.modalOverlay} onClick={() => setSelectedSlip(null)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <i className={`bi bi-file-earmark-text ${styles.detailIcon}`}></i>
                  Chi tiết đơn nhập hàng: {selectedSlip.docCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedSlip.status === 'DRAFT' && (
                    <button
                      onClick={() => setConfirmPost(true)}
                      className={styles.btnPrimary}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      <i className="bi bi-printer" style={{ marginRight: '6px' }}></i> Ghi sổ
                    </button>
                  )}
                  <button className={styles.modalClose} onClick={() => setSelectedSlip(null)}>&times;</button>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Nhà cung cấp</span>
                      <span className={styles.detailValue}>{supplierById.get(selectedSlip.partnerId)?.name || 'Chưa chọn'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Ghi chú</span>
                      <span className={styles.detailValue}>{selectedSlip.note || 'Không có ghi chú'}</span>
                    </div>
                  </div>

                  <div className={styles.detailRight}>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>Ngày nhận hàng</span>
                      <span className={styles.detailRightValue}>{formatDate(selectedSlip.docDate)}</span>
                    </div>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>Kho nhập</span>
                      <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{warehouseById.get(selectedSlip.warehouseId)?.name || `Kho #${selectedSlip.warehouseId}`}</span>
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
                      <th className={styles.textCenter}>Số lượng</th>
                      <th className={styles.textRight}>Giá nhập</th>
                      <th className={styles.textRight}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSlip.lines || []).map((line, index) => {
                      const product = productById.get(line.variantId);
                      return (
                        <tr key={line.id || index}>
                          <td>{index + 1}</td>
                          <td className={styles.textBlue}>{product?.sku || `SKU #${line.variantId}`}</td>
                          <td>{variantLabel(product) || 'Chưa có tên sản phẩm'}</td>
                          <td>{product?.unitName || ''}</td>
                          <td className={styles.textCenter}>{Number(line.quantityIn || 0).toLocaleString('vi-VN')}</td>
                          <td className={styles.textRight}>{money(line.unitCost)}</td>
                          <td className={styles.textRight}>{money(line.lineAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.detailFooter}>
                  <div className={styles.footerTotalLabel}>Tổng cộng hàng nhập:</div>
                  <div className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</div>
                  <div className={styles.footerTotalLabel} style={{ flex: 0, whiteSpace: 'nowrap', paddingRight: '16px' }}>Tổng tiền:</div>
                  <div className={styles.footerMoney}>{money(sumAmount(selectedSlip.lines))}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <ConfirmModal
          isOpen={confirmPost}
          title="Xác nhận ghi sổ"
          message="Bạn có chắc chắn muốn ghi sổ phiếu nhập này không? Thao tác này không thể hoàn tác và sẽ cập nhật lại số lượng hàng hóa trong kho."
          onConfirm={async () => {
            setConfirmPost(false);
            try {
              await importApi.postImportSlip(selectedSlip.id);
              loadSlips();
              setSelectedSlip(prev => ({ ...prev, status: 'POSTED', statusLabel: STATUS_LABELS['POSTED'].label, statusCode: STATUS_LABELS['POSTED'].code }));
              showToast('success', 'Ghi sổ phiếu nhập thành công!');
            } catch (err) {
              showToast('error', err.response?.data?.userMessage || 'Không thể ghi sổ phiếu nhập kho');
            }
          }}
          onCancel={() => setConfirmPost(false)}
        />
        <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    </AdminLayout>
  );
}

export default ImportHistoryPage;
