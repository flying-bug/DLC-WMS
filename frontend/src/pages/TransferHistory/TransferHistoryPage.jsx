import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';

import AdminLayout from '../../components/layout/AdminLayout';
import * as transferApi from '../../api/stockTransferApi';
import { exportToExcel } from '../../utils/excelExport';
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
  POSTED: { label: 'Hoàn thành', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
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
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showToast('error', 'Trình duyệt chặn cửa sổ popup. Vui lòng cho phép popup để in phiếu.');
      return;
    }

    const escapeHtml = (unsafe) => {
      if (!unsafe) return '';
      return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const slipDate = formatDate(slip.transferDate);
    const fromWarehouseName = warehouseById.get(slip.fromWarehouseId)?.name || 'Chưa rõ';
    const toWarehouseName = warehouseById.get(slip.toWarehouseId)?.name || 'Chưa rõ';
    const lines = slip.lines || [];

    let rowsHtml = '';
    lines.forEach((line, index) => {
      const product = productById.get(line.variantId);
      const name = variantLabel(product) || 'Chưa rõ';
      const sku = product?.sku || `SKU #${line.variantId}`;
      const unit = product?.unitName || '';
      rowsHtml += `
        <tr>
          <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(sku)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(name)}</td>
          <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${escapeHtml(unit)}</td>
          <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${Number(line.quantity || 0).toLocaleString('vi-VN')}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(line.note || '')}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <title>In Phiếu Chuyển Kho</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 20px; color: #000; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .title { text-align: center; font-size: 22px; font-weight: bold; margin-top: 10px; margin-bottom: 5px; }
            .subtitle { text-align: center; font-size: 14px; margin-bottom: 20px; font-style: italic; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px; }
            .info-table td { padding: 4px; vertical-align: top; }
            .main-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            .main-table th { border: 1px solid #000; padding: 8px; background-color: #f0f0f0; font-weight: bold; text-align: center; }
            .signatures { width: 100%; margin-top: 40px; }
            .signatures td { text-align: center; width: 33%; font-size: 14px; padding-top: 10px; }
            .sign-space { height: 80px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 50%;">
                <strong style="font-size: 16px;">DLC COMPUTER</strong><br/>
                <span style="font-size: 12px; color: #666;">Hệ thống quản lý kho WMS</span>
              </td>
              <td style="width: 50%; text-align: right; font-size: 13px;">
                Số phiếu: <strong>${escapeHtml(slip.transferCode)}</strong><br/>
                Ngày lập: ${escapeHtml(slipDate)}
              </td>
            </tr>
          </table>

          <div class="title">PHIẾU CHUYỂN KHO</div>
          <div class="subtitle">Liên 1: Lưu trữ - Liên 2: Bàn giao</div>

          <table class="info-table">
            <tr>
              <td style="width: 15%;"><strong>Kho xuất:</strong></td>
              <td style="width: 35%;">${escapeHtml(fromWarehouseName)}</td>
              <td style="width: 15%;"><strong>Kho nhập:</strong></td>
              <td style="width: 35%;">${escapeHtml(toWarehouseName)}</td>
            </tr>
            <tr>
              <td><strong>Ghi chú:</strong></td>
              <td colspan="3">${escapeHtml(slip.note || 'Không có')}</td>
            </tr>
          </table>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 5%;">STT</th>
                <th style="width: 15%;">Mã sản phẩm</th>
                <th>Tên sản phẩm</th>
                <th style="width: 10%;">ĐVT</th>
                <th style="width: 15%;">Số lượng</th>
                <th style="width: 20%;">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr>
                <td colspan="4" style="text-align: right; border: 1px solid #000; padding: 8px; font-weight: bold;">Tổng cộng:</td>
                <td style="text-align: center; border: 1px solid #000; padding: 8px; font-weight: bold;">${sumQuantity(slip.lines).toLocaleString('vi-VN')}</td>
                <td style="border: 1px solid #000; padding: 8px;"></td>
              </tr>
            </tbody>
          </table>

          <table class="signatures">
            <tr>
              <td><strong>Người lập phiếu</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
              <td><strong>Thủ kho xuất</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, đóng dấu)</span></td>
              <td><strong>Thủ kho nhập</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, đóng dấu)</span></td>
            </tr>
            <tr class="sign-space">
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); loadSlips(); } }}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(e) => { setFilters(prev => ({ ...prev, fromDate: e.target.value })); setCurrentPage(1); }}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ĐẾN NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.toDate}
                onChange={(e) => { setFilters(prev => ({ ...prev, toDate: e.target.value })); setCurrentPage(1); }}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌNH TRẠNG</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value })); setCurrentPage(1); }}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="POSTED">Hoàn thành</option>
              </select>
            </div>
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
              onClick={() => setShowSettingsModal(true)}
              title="Cấu hình hiển thị cột"
            >
              <i className="bi bi-gear"></i>
            </button>
            <button
              className={styles.iconBtn}
              onClick={handleExport}
              title="Xuất tệp Excel"
            >
              <i className="bi bi-file-earmark-excel"></i>
            </button>
            <button className={styles.btnPrimary} onClick={() => { setCurrentPage(1); loadSlips(); }}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
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
                          <span className={`${styles.badge} ${
                            slip.statusCode === 'success' ? styles.badgeSuccess :
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
                        {(slip.status === 'DRAFT' || slip.status === 'SUBMITTED') && (
                          <i 
                            className="bi bi-pencil" 
                            style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} 
                            title="Chỉnh sửa" 
                            onClick={(e) => { e.stopPropagation(); navigate(`/transfer-history/${slip.id}/edit`); }}
                          ></i>
                        )}
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
                  {selectedSlip.transferCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handlePrintSlip(selectedSlip)}
                    className={styles.btnSecondary}
                    style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="bi bi-printer"></i> In phiếu
                  </button>
                  <button className={styles.modalClose} onClick={() => setSelectedSlip(null)}>&times;</button>
                </div>
              </div>

              <div className={styles.modalBody}>
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
                          <td style={{ textAlign: 'center' }}>{index + 1}</td>
                          <td className={styles.textBlue}>{product?.sku || `SKU #${line.variantId}`}</td>
                          <td>{variantLabel(product) || 'Chưa có tên sản phẩm'}</td>
                          <td style={{ textAlign: 'center' }}>{product?.unitName || ''}</td>
                          <td className={styles.textCenter}>{Number(line.quantity || 0).toLocaleString('vi-VN')}</td>
                          <td>{line.note || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.detailFooter}>
                  <div className={styles.footerTotalLabel}>Tổng số lượng chuyển:</div>
                  <div className={styles.footerTotal}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</div>
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
