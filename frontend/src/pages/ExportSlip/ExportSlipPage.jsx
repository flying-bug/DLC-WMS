import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import * as importApi from '../../api/inventoryImportApi';
import * as assemblyOrderApi from '../../api/assemblyOrderApi';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';
import styles from './ExportSlipPage.module.css';

const DEFAULT_COLUMNS = {
  date: true,
  docCode: true,
  partner: true,
  warehouse: true,
  total: true,
  note: true,
  status: true,
};

const COLUMN_OPTIONS = [
  { id: 'date', label: 'Ngày Xuất' },
  { id: 'docCode', label: 'Số Phiếu' },
  { id: 'partner', label: 'Khách Hàng' },
  { id: 'warehouse', label: 'Kho Xuất' },
  { id: 'total', label: 'Tổng Tiền' },
  { id: 'note', label: 'Ghi Chú' },
  { id: 'status', label: 'Trạng Thái' },
];

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
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
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

function ExportSlipPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [slips, setSlips] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ docCode: location.state?.filterDocCode || '', fromDate: '', status: '' });
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmPost, setConfirmPost] = useState(false);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('dlc_export_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const toggleColumn = (colId) => {
    setColumns(prev => {
      const next = { ...prev, [colId]: !prev[colId] };
      localStorage.setItem('dlc_export_columns', JSON.stringify(next));
      return next;
    });
  };

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);
  const productById = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);
  const customerById = useMemo(() => new Map(customers.map(item => [item.id, item])), [customers]);
  const supplierById = useMemo(() => new Map(suppliers.map(item => [item.id, item])), [suppliers]);
  const assemblyOrderById = useMemo(() => new Map(assemblyOrders.map(item => [item.id, item])), [assemblyOrders]);
  const userById = useMemo(() => new Map(users.map(item => [item.id, item])), [users]);

  const loadLookups = useCallback(async () => {
    const [warehouseRes, productRes, customerRes, userRes, supplierRes, assemblyOrderRes] = await Promise.allSettled([
      exportApi.getWarehouses({ size: 100 }),
      exportApi.getProducts({ size: 100 }),
      exportApi.getCustomers({ size: 1000 }),
      exportApi.getUsers({ size: 1000 }).catch(() => null),
      importApi.getSuppliers({ size: 1000 }).catch(() => null),
      assemblyOrderApi.getAssemblyOrders({ size: 100 }).catch(() => null),
    ]);

    if (warehouseRes.status === 'fulfilled') {
      setWarehouses(pageContent(unwrap(warehouseRes.value)));
    }
    if (productRes.status === 'fulfilled') {
      setProducts(pageContent(unwrap(productRes.value)));
    }
    if (customerRes.status === 'fulfilled') {
      setCustomers(pageContent(unwrap(customerRes.value)));
    }
    if (userRes.status === 'fulfilled' && userRes.value) {
      setUsers(pageContent(unwrap(userRes.value)));
    }
    if (supplierRes.status === 'fulfilled' && supplierRes.value) {
      setSuppliers(pageContent(unwrap(supplierRes.value)));
    }
    if (assemblyOrderRes.status === 'fulfilled' && assemblyOrderRes.value) {
      setAssemblyOrders(pageContent(unwrap(assemblyOrderRes.value)));
    }
  }, []);

  const loadSlips = useCallback(async () => {
    setLoading(true);

    try {
      const response = await exportApi.getExportHistory({
        docCode: filters.docCode || undefined,
        fromDate: filters.fromDate || undefined,
        status: filters.status || undefined,
      });
      const data = unwrap(response) || [];
      setSlips(data);
      setSelectedSlip(current => data.find(item => item.id === current?.id) || null);
      setSelectedIds([]);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Có lỗi xảy ra khi tải dữ liệu');
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
      date: formatDate(slip.docDate),
      partner: customerById.get(slip.partnerId)?.name || (slip.partnerId ? `Khách hàng #${slip.partnerId}` : 'Chưa chọn'),
      warehouse: warehouseById.get(slip.warehouseId)?.name || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'Chưa chọn'),
      total: money(sumAmount(slip.lines)),
      statusLabel: status.label,
      statusCode: status.code,
    };
  });

  const handleExport = () => {
    const headers = ['Ngày hạch toán', 'Số chứng từ', 'Khách hàng', 'Diễn giải', 'Tổng tiền', 'Kho xuất', 'Trạng thái'];
    const data = rows.map(item => [
      item.date,
      item.docCode,
      item.partner,
      item.note || '',
      item.total,
      item.warehouse,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_phieu_xuat_kho');
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

  const handlePrintSlip = (slip, isImport = true) => {
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

    const typeTitle = isImport ? 'NHẬP KHO' : 'XUẤT KHO';
    const partnerTitle = isImport ? 'Nhà cung cấp / Đối tác' : 'Khách hàng';
    const warehouseTitle = isImport ? 'Kho nhập' : 'Kho xuất';
    const lines = slip.lines || [];

    let rowsHtml = '';
    lines.forEach((line, index) => {
      const product = productById.get(line.variantId);
      const sku = product?.sku || `SKU #${line.variantId}`;
      const name = variantLabel(product) || 'Sản phẩm';
      const unit = product?.unitName || '';
      const qty = Number(isImport ? line.quantityIn : line.quantityOut || 0);
      const price = Number(line.unitCost || line.unitPrice || 0);
      const amount = qty * price;
      const serials = line.serialNumbers && line.serialNumbers.length > 0 ? line.serialNumbers.join(', ') : 'Không có';

      rowsHtml += `
        <tr>
          <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(sku)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(name)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(unit)}</td>
          <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${price.toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${amount.toLocaleString('vi-VN')} đ</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${escapeHtml(serials)}</td>
        </tr>
      `;
    });

    const partnerName = isImport
      ? ((!slip.issuePurpose || slip.issuePurpose === 'PURCHASE') ? (supplierById.get(slip.partnerId)?.name || 'Chưa chọn')
        : slip.issuePurpose === 'PRODUCTION' ? (assemblyOrderById.get(slip.referenceId)?.orderCode || 'Chưa chọn')
        : (customerById.get(slip.partnerId)?.name || 'Chưa chọn'))
      : (customerById.get(slip.partnerId)?.name || 'Chưa chọn');

    const warehouseName = warehouseById.get(slip.warehouseId)?.name || `Kho #${slip.warehouseId}`;
    const salesperson = slip.salespersonName || userById.get(slip.salespersonId)?.fullName || userById.get(slip.salespersonId)?.username || 'Chưa rõ';
    const slipDate = slip.docDate ? new Date(slip.docDate).toLocaleDateString('vi-VN') : '';

    const htmlContent = `
      <html>
        <head>
          <title>In phiếu ${escapeHtml(slip.docCode)}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 20px; line-height: 1.4; }
            .header-table { width: 100%; margin-bottom: 30px; }
            .title { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { text-align: center; font-size: 14px; font-style: italic; margin-bottom: 20px; }
            .info-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
            .info-table td { padding: 6px 0; font-size: 14px; }
            .main-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
            .main-table th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 10px 8px; font-size: 13px; font-weight: bold; }
            .total-row td { font-weight: bold; background-color: #fafafa; }
            .signatures { width: 100%; margin-top: 40px; }
            .signatures td { text-align: center; width: 25%; font-size: 14px; padding-top: 10px; }
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
                Số phiếu: <strong>${escapeHtml(slip.docCode)}</strong><br/>
                Ngày lập: ${escapeHtml(slipDate)}
              </td>
            </tr>
          </table>

          <div class="title">PHIẾU ${escapeHtml(typeTitle)} KHO</div>
          <div class="subtitle">Liên 1: Lưu trữ - Liên 2: Bàn giao</div>

          <table class="info-table">
            <tr>
              <td style="width: 15%;"><strong>${escapeHtml(partnerTitle)}:</strong></td>
              <td style="width: 50%;">${escapeHtml(partnerName)}</td>
              <td style="width: 15%;"><strong>${escapeHtml(warehouseTitle)}:</strong></td>
              <td style="width: 20%;">${escapeHtml(warehouseName)}</td>
            </tr>
            <tr>
              <td><strong>Người giao/nhận:</strong></td>
              <td>${escapeHtml(slip.recipientName || 'Chưa rõ')}</td>
              <td><strong>Nhân viên:</strong></td>
              <td>${escapeHtml(salesperson)}</td>
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
                <th style="width: 12%;">Mã sản phẩm</th>
                <th>Tên sản phẩm</th>
                <th style="width: 8%;">ĐVT</th>
                <th style="width: 10%;">Số lượng</th>
                <th style="width: 12%;">Đơn giá</th>
                <th style="width: 15%;">Thành tiền</th>
                <th style="width: 18%;">Số Serial</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="total-row">
                <td colspan="4" style="text-align: right; border: 1px solid #ddd; padding: 10px;">Tổng cộng:</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 10px;">${sumQuantity(slip.lines).toLocaleString('vi-VN')}</td>
                <td style="border: 1px solid #ddd; padding: 10px;"></td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 10px;">${sumAmount(slip.lines).toLocaleString('vi-VN')} đ</td>
                <td style="border: 1px solid #ddd; padding: 10px;"></td>
              </tr>
            </tbody>
          </table>

          <table class="signatures">
            <tr>
              <td><strong>Người giao hàng</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
              <td><strong>Người nhận hàng</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
              <td><strong>Thủ kho</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, đóng dấu)</span></td>
              <td><strong>Người lập phiếu</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            </tr>
            <tr class="sign-space">
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
              <td>${salesperson}</td>
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
          <h1 className={styles.pageTitle}>Danh sách phiếu xuất kho</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/export-slips/create')}>
            <i className="bi bi-plus"></i> Thêm mới
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌM KIẾM MÃ PHIẾU</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Nhập mã phiếu xuất..."
                value={filters.docCode}
                onChange={(event) => setFilters(prev => ({ ...prev, docCode: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY LẬP</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(event) => setFilters(prev => ({ ...prev, fromDate: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TRẠNG THÁI PHIẾU</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="POSTED">Đã hoàn thành</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setFilters({ docCode: '', fromDate: '', status: '' })}
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
            <button className={styles.btnPrimary} onClick={loadSlips}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" className={styles.checkbox} checked={rows.length > 0 && selectedIds.length === rows.length} onChange={handleSelectAll} />
                </th>
                {columns.date && <th style={{ width: '120px' }}>Ngày Xuất</th>}
                {columns.docCode && <th style={{ width: '180px' }}>Số Phiếu</th>}
                {columns.partner && <th style={{ width: '200px' }}>Khách Hàng</th>}
                {columns.warehouse && <th style={{ width: '120px' }}>Kho Xuất</th>}
                {columns.total && <th className={styles.textRight} style={{ width: '110px' }}>Tổng Tiền</th>}
                {columns.note && <th style={{ minWidth: '150px' }}>Ghi Chú</th>}
                {columns.status && <th style={{ width: '120px' }}>Trạng Thái</th>}
                <th className={styles.textCenter} style={{ width: '100px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? paginatedRows.map(slip => (
                <tr key={slip.id} className={selectedSlip?.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)} style={{ cursor: 'pointer' }}>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" className={styles.checkbox} checked={selectedIds.includes(slip.id)} onChange={(event) => handleSelectRow(event, slip.id)} onClick={(event) => event.stopPropagation()} /></td>
                  {columns.date && <td>{slip.date}</td>}
                  {columns.docCode && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <a
                        href="#"
                        className={styles.link}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedSlip(slip);
                        }}
                      >
                        {slip.docCode}
                      </a>
                    </td>
                  )}
                  {columns.partner && <td>{slip.partner}</td>}
                  {columns.warehouse && <td>{slip.warehouse}</td>}
                  {columns.total && <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>}
                  {columns.note && (
                    <td style={{ maxWidth: '180px' }}>
                      <div className={styles.tooltipContainer}>
                        <span className={styles.noteText}>{slip.note || 'Không có ghi chú'}</span>
                        {slip.note && <span className={styles.tooltipText}>{slip.note}</span>}
                      </div>
                    </td>
                  )}
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
                  <td className={styles.textCenter}>
                    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiết" onClick={(event) => { event.stopPropagation(); setSelectedSlip(slip); }}></i>
                    <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sửa phiếu xuất kho" onClick={(event) => {
                      event.stopPropagation();
                      if (slip.status !== 'DRAFT') {
                        showToast('error', 'Chỉ có thể cập nhật phiếu lưu tạm.');
                      } else {
                        navigate(`/export-slips/${slip.id}/edit`);
                      }
                    }}></i>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" className={styles.textCenter}>
                    {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy phiếu xuất nào'}
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
                  <i className={`bi bi-receipt ${styles.detailIcon}`}></i>
                  {selectedSlip.docCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handlePrintSlip(selectedSlip, false)}
                    className={styles.btnSecondary}
                    style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="bi bi-printer"></i> In phiếu
                  </button>
                  {selectedSlip.status === 'DRAFT' && (
                    <button
                      onClick={() => setConfirmPost(true)}
                      className={styles.btnPrimary}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      <i className="bi bi-journal-check" style={{ marginRight: '6px' }}></i> Ghi sổ
                    </button>
                  )}
                  <button className={styles.modalClose} onClick={() => setSelectedSlip(null)}>&times;</button>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Khách hàng</span>
                      <span className={styles.detailValue}>{customerById.get(selectedSlip.partnerId)?.name || (selectedSlip.partnerId ? `Khách hàng #${selectedSlip.partnerId}` : 'Chưa chọn')}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Người nhận hàng</span>
                      <span className={styles.detailValue}>{selectedSlip.recipientName || 'Chưa có thông tin'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Địa chỉ nhận hàng</span>
                      <span className={styles.detailValue}>{selectedSlip.recipientAddress || 'Chưa có thông tin'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Nhân viên xuất hàng</span>
                      <span className={styles.detailValue}>
                        {selectedSlip.salespersonName || userById.get(selectedSlip.salespersonId)?.fullName || userById.get(selectedSlip.salespersonId)?.username || (selectedSlip.salespersonId ? String(selectedSlip.salespersonId) : 'Chưa có thông tin')}
                      </span>
                    </div>
                    {(selectedSlip.referenceType && selectedSlip.referenceId) && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Kèm chứng từ</span>
                        <span className={styles.detailValue} style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>
                           <i className="bi bi-link-45deg"></i> {selectedSlip.referenceCode || selectedSlip.referenceId}
                        </span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Lý do xuất</span>
                      <span className={styles.detailValue}>{selectedSlip.note || 'Không có ghi chú'}</span>
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
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.detailTable}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã hàng</th>
                        <th>Tên hàng</th>
                        <th>DVT</th>
                        <th className={styles.textCenter}>Số lượng</th>
                        <th className={styles.textRight}>Đơn giá</th>
                        <th className={styles.textRight}>% VAT</th>
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
                            <td>
                              {variantLabel(product) || 'Chưa có tên sản phẩm'}
                              {line.serialNumbers && line.serialNumbers.length > 0 && (
                                <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {line.serialNumbers.map(serial => (
                                    <span key={serial} style={{ fontSize: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', color: '#475569' }}>
                                      <i className="bi bi-upc-scan" style={{ marginRight: '4px' }}></i>
                                      {serial}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>{product?.unitName || ''}</td>
                            <td className={styles.textCenter}>{Number(line.quantityOut || 0).toLocaleString('vi-VN')}</td>
                            <td className={styles.textRight}>{money(line.unitCost || line.unitPrice)}</td>
                            <td className={styles.textRight}>{line.vatPercent ?? line.vatRate ?? 0}%</td>
                            <td className={styles.textRight}>{money(line.lineAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.detailFooter}>
                  <div className={styles.footerTotalLabel}>Tổng cộng hàng xuất:</div>
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
          message="Bạn có chắc chắn muốn ghi sổ phiếu xuất này không? Thao tác này không thể hoàn tác và sẽ cập nhật lại số lượng hàng hóa trong kho."
          onConfirm={async () => {
            setConfirmPost(false);
            try {
              await exportApi.postExportSlip(selectedSlip.id);
              loadSlips();
              setSelectedSlip(prev => ({ ...prev, status: 'POSTED', statusLabel: STATUS_LABELS['POSTED'].label, statusCode: STATUS_LABELS['POSTED'].code }));
              showToast('success', 'Ghi sổ phiếu xuất thành công!');
            } catch (err) {
              showToast('error', err.response?.data?.userMessage || 'Không thể ghi sổ phiếu xuất kho');
            }
          }}
          onCancel={() => setConfirmPost(false)}
        />
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          ariaLabel="Thiết lập cột hiển thị"
        >
          <div className={styles.settingsModalHeader}>
            <h3>Thiết lập cột hiển thị</h3>
            <button className={styles.settingsModalCloseBtn} onClick={() => setShowSettingsModal(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className={styles.settingsModalBody}>
            <div className={styles.checkboxGrid}>
              {COLUMN_OPTIONS.map(col => (
                <label key={col.id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={columns[col.id]}
                    onChange={() => toggleColumn(col.id)}
                  />
                  <span className={styles.checkboxText}>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.settingsModalFooter}>
            <button className={styles.btnSecondary} onClick={() => setColumns(DEFAULT_COLUMNS)}>
              Đặt lại
            </button>
            <button className={styles.btnPrimary} onClick={() => setShowSettingsModal(false)}>
              Hoàn tất
            </button>
          </div>
        </Modal>
      </div>
      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={hideToast}
      />
    </AdminLayout>
  );
}

export default ExportSlipPage;
