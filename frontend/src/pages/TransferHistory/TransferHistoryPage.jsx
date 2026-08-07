import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';

import AdminLayout from '../../components/layout/AdminLayout';
import * as transferApi from '../../api/stockTransferApi';
import { exportToExcel } from '../../utils/excelExport';
import { printTransferSlip } from '../../utils/printTransferSlip';
import { formatDateOnly } from '../../utils/dateFormat';
import styles from './TransferHistoryPage.module.css';

const DEFAULT_COLUMNS = {
  date: true,
  transferCode: true,
  fromWarehouse: true,
  toWarehouse: true,
  quantity: true,
  status: true,
};

const COLUMN_OPTIONS = [
  { id: 'date', label: 'Ngày Ghi Nhận' },
  { id: 'transferCode', label: 'Số Phiếu' },
  { id: 'fromWarehouse', label: 'Kho Xuất' },
  { id: 'toWarehouse', label: 'Kho Nhập' },
  { id: 'quantity', label: 'Số Lượng' },
  { id: 'status', label: 'Trạng Thái' },
];

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  SUBMITTED: { label: 'Lưu tạm', code: 'info' }, // Adjust if you have another status
  POSTED: { label: 'Ghi sổ', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const formatDate = (value) => value ? formatDateOnly(value) : '';
const sumQuantity = (lines = []) => lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

function TransferHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [slips, setSlips] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const showToast = (type, message) => setToast({ isVisible: true, type, message });

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ transferCode: location.state?.filterTransferCode || '', fromDate: '', toDate: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('dlc_transfer_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const toggleColumn = (colId) => {
    setColumns(prev => {
      const next = { ...prev, [colId]: !prev[colId] };
      localStorage.setItem('dlc_transfer_columns', JSON.stringify(next));
      return next;
    });
  };

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);
  const productById = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);

  const loadLookups = useCallback(async () => {
    const [warehouseRes, productRes] = await Promise.allSettled([
      transferApi.getWarehouses({ size: 100 }),
      transferApi.getProducts({ size: 100 }),
    ]);

    if (warehouseRes.status === 'fulfilled') setWarehouses(pageContent(unwrap(warehouseRes.value)));
    if (productRes.status === 'fulfilled') setProducts(pageContent(unwrap(productRes.value)));
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
      setSelectedSlip(current => data.find(item => item.id === current?.id) || null);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.userMessage || 'Không tải được danh sách phiếu chuyển kho');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadSlips();
  }, [loadSlips]);

  useEffect(() => {
    if (location.state?.toastMessage) {
      showToast(location.state.toastType || 'success', location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

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
    showToast('success', 'Xuất Excel thành công!');
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

  const handlePrintSlip = (slip) => {
    printTransferSlip(slip, {
      warehouseById,
      productById,
    });
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
          <div className={styles.searchAndPopover}>
            <div className={styles.searchBox}>
              <i className="bi bi-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Nhập từ khóa tìm kiếm mã phiếu..."
                value={filters.transferCode}
                onChange={(event) => setFilters(prev => ({ ...prev, transferCode: event.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); loadSlips(); } }}
              />
              {filters.transferCode && (
                <button className={styles.clearSearchBtn} onClick={() => { setFilters(prev => ({ ...prev, transferCode: '' })); setCurrentPage(1); setTimeout(loadSlips, 0); }}>
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>

            <FilterPopover
              filters={filters}
              onApply={(newFilters) => { setFilters(newFilters); setCurrentPage(1); setTimeout(loadSlips, 0); }}
              onReset={() => { setFilters({ transferCode: '', fromDate: '', toDate: '', status: '' }); setCurrentPage(1); setTimeout(loadSlips, 0); }}
              statusOptions={[
                { value: 'DRAFT', label: 'Lưu tạm' },
                { value: 'POSTED', label: 'Ghi sổ' },
              ]}
            />
          </div>

          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => { setFilters({ transferCode: '', fromDate: '', toDate: '', status: '' }); setCurrentPage(1); setTimeout(loadSlips, 0); }}
              title="Đặt lại bộ lọc"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <button
              className={styles.iconBtn}
              onClick={handleExport}
              title="Xuất tệp Excel"
            >
              <i className="bi bi-file-earmark-excel"></i>
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setShowSettingsModal(true)}
              title="Cấu hình hiển thị cột"
            >
              <i className="bi bi-gear"></i>
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={paginatedRows.length > 0 && selectedIds.length === paginatedRows.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  {columns.date && <th style={{ width: '130px' }}>Ngày Ghi Nhận</th>}
                  {columns.transferCode && <th style={{ width: '160px' }}>Số Phiếu</th>}
                  {columns.fromWarehouse && <th style={{ width: '150px' }}>Kho Xuất</th>}
                  {columns.toWarehouse && <th style={{ width: '150px' }}>Kho Nhập</th>}
                  {columns.quantity && <th className={styles.textCenter} style={{ width: '120px' }}>Số Lượng</th>}
                  {columns.status && <th style={{ width: '140px' }}>Trạng Thái</th>}
                  <th className={styles.textCenter} style={{ width: '100px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.textCenter} style={{ padding: '40px' }}>
                      <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className={styles.emptyState}>
                        <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                        <div className={styles.emptyText}>Không tìm thấy phiếu chuyển nào</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map(slip => (
                    <tr key={slip.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedIds.includes(slip.id)}
                          onChange={(e) => handleSelectRow(e, slip.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      {columns.date && <td>{slip.date}</td>}
                      {columns.transferCode && (
                        <td style={{ whiteSpace: 'nowrap' }}>
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
                      )}
                      {columns.fromWarehouse && <td>{slip.fromWarehouse}</td>}
                      {columns.toWarehouse && <td>{slip.toWarehouse}</td>}
                      {columns.quantity && <td className={styles.textCenter}>{slip.quantity.toLocaleString('vi-VN')}</td>}
                      {columns.status && (
                        <td>
                          <span className={`${styles.badge} ${slip.statusCode === 'success' ? styles.badgeSuccess :
                              slip.statusCode === 'info' ? styles.badgeInfo :
                                slip.statusCode === 'warning' ? styles.badgeWarning :
                                  styles.badgeDanger
                            }`}>
                            {slip.statusLabel}
                          </span>
                        </td>
                      )}
                      <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                        <i
                          className="bi bi-eye"
                          style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }}
                          title="Xem chi tiết"
                          onClick={(e) => { e.stopPropagation(); setSelectedSlip(slip); }}
                        ></i>
                        <i
                          className="bi bi-pencil"
                          style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }}
                          title="Chỉnh sửa"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (slip.status === 'DRAFT' || slip.status === 'SUBMITTED') {
                              navigate(`/transfer-history/${slip.id}/edit`);
                            } else {
                              showToast('error', 'Chỉ có thể cập nhật phiếu lưu tạm.');
                            }
                          }}
                        ></i>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
                  <i className={`bi bi-arrow-left-right ${styles.detailIcon}`}></i>
                  Chi tiết phiếu chuyển kho: {selectedSlip.transferCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handlePrintSlip(selectedSlip)}
                    className={styles.btnOutline}
                    style={{ padding: '6px 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="bi bi-printer"></i> In phiếu
                  </button>
                  <button className={styles.modalClose} onClick={() => setSelectedSlip(null)}>&times;</button>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoBlock} style={{ gridColumn: 'span 2' }}>
                      <span className={styles.infoLabel}>
                        <i className="bi bi-chat-text"></i> Ghi chú
                      </span>
                      <span className={styles.infoValue} style={{ color: selectedSlip.note ? 'inherit' : '#9ca3af', fontStyle: selectedSlip.note ? 'normal' : 'italic' }}>
                        {selectedSlip.note || 'Không có ghi chú'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.detailRight}>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>
                        <i className="bi bi-calendar3"></i> Ngày chuyển
                      </span>
                      <span className={styles.detailRightValue}>{formatDate(selectedSlip.transferDate)}</span>
                    </div>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>
                        <i className="bi bi-box-arrow-right"></i> Từ kho
                      </span>
                      <span className={`${styles.detailRightValue} ${styles.textBlue}`}>
                        {warehouseById.get(selectedSlip.fromWarehouseId)?.name || `Kho #${selectedSlip.fromWarehouseId}`}
                      </span>
                    </div>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>
                        <i className="bi bi-box-arrow-in-right"></i> Đến kho
                      </span>
                      <span className={`${styles.detailRightValue} ${styles.textBlue}`}>
                        {warehouseById.get(selectedSlip.toWarehouseId)?.name || `Kho #${selectedSlip.toWarehouseId}`}
                      </span>
                    </div>
                  </div>
                </div>

                <table className={styles.detailTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                      <th>Mã SP</th>
                      <th>Tên sản phẩm</th>
                      <th style={{ textAlign: 'center' }}>ĐVT</th>
                      <th className={styles.textCenter}>Số lượng chuyển</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSlip.lines || []).map((line, index) => {
                      const product = productById.get(line.variantId);
                      return (
                        <tr key={index}>
                          <td style={{ textAlign: 'center' }}>{index + 1}</td>
                          <td className={styles.textBlue} style={{ fontWeight: '500' }}>{product?.sku || `SKU #${line.variantId}`}</td>
                          <td style={{ fontWeight: '500' }}>{variantLabel(product) || 'Chưa có tên sản phẩm'}</td>
                          <td style={{ textAlign: 'center' }}>{product?.unitName || ''}</td>
                          <td className={styles.textCenter} style={{ fontWeight: '600' }}>{Number(line.quantity || 0).toLocaleString('vi-VN')}</td>
                          <td>
                            {line.note ? (
                              <span style={{ fontSize: '13px' }}>{line.note}</span>
                            ) : (
                              <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '12px' }}>Không có</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.detailFooter}>
                  <div className={styles.footerGroup}>
                    <span className={styles.footerTotalLabel}>Tổng số lượng chuyển:</span>
                    <span className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSettingsModal && (
          <Modal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            title="Cấu hình hiển thị cột"
          >
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {COLUMN_OPTIONS.map(col => (
                <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={columns[col.id]}
                    onChange={() => toggleColumn(col.id)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  {col.label}
                </label>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className={styles.btnPrimary} onClick={() => setShowSettingsModal(false)}>Hoàn tất</button>
              </div>
            </div>
          </Modal>
        )}
      </div>

      {toast.isVisible && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
      )}
    </AdminLayout>
  );
}

export default TransferHistoryPage;
