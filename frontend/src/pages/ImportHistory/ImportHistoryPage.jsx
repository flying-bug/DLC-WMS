import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';

import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import * as customerApi from '../../api/customerApi';
import * as assemblyOrderApi from '../../api/assemblyOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './ImportHistoryPage.module.css';

const DEFAULT_COLUMNS = {
  date: true,
  docCode: true,
  partner: true,
  warehouse: true,
  purchaser: true,
  deliverer: true,
  total: true,
  vat: true,
  note: true,
  status: true,
};

const COLUMN_OPTIONS = [
  { id: 'date', label: 'Ngày Nhập' },
  { id: 'docCode', label: 'Số Phiếu' },
  { id: 'partner', label: 'Đối tác / Tham chiếu' },
  { id: 'warehouse', label: 'Kho Nhập' },
  { id: 'purchaser', label: 'Nhân viên mua hàng' },
  { id: 'deliverer', label: 'Người giao hàng' },
  { id: 'total', label: 'Tổng Tiền' },
  { id: 'vat', label: 'Tiền VAT' },
  { id: 'note', label: 'Ghi Chú' },
  { id: 'status', label: 'Trạng Thái' },
];

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  POSTED: { label: 'Hoàn thành', code: 'success' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '';
const sumAmount = (lines = []) => lines.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0);
const sumSubtotal = (lines = []) => lines.reduce((sum, line) => {
  const qty = Number(line.quantityIn || line.quantityOut || 0);
  const price = Number(line.unitCost || line.unitPrice || 0);
  return sum + (qty * price);
}, 0);
const sumVat = (lines = []) => lines.reduce((sum, line) => {
  const qty = Number(line.quantityIn || line.quantityOut || 0);
  const price = Number(line.unitCost || line.unitPrice || 0);
  const vatRate = Number(line.vatPercent ?? line.vatRate ?? 0) / 100;
  return sum + (qty * price * vatRate);
}, 0);
const sumQuantity = (lines = []) => lines.reduce((sum, line) => sum + Number(line.quantityIn || 0), 0);
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

function ImportHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [slips, setSlips] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmPost, setConfirmPost] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ docCode: location.state?.filterDocCode || '', fromDate: '', status: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('dlc_import_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const toggleColumn = (colId) => {
    setColumns(prev => {
      const next = { ...prev, [colId]: !prev[colId] };
      localStorage.setItem('dlc_import_columns', JSON.stringify(next));
      return next;
    });
  };

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);
  const supplierById = useMemo(() => new Map(suppliers.map(item => [item.id, item])), [suppliers]);
  const productById = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);
  const customerById = useMemo(() => new Map(customers.map(item => [item.id, item])), [customers]);
  const assemblyOrderById = useMemo(() => new Map(assemblyOrders.map(item => [item.id, item])), [assemblyOrders]);
  const userById = useMemo(() => new Map(users.map(item => [item.id, item])), [users]);

  const loadLookups = useCallback(async () => {
    const [warehouseRes, supplierRes, productRes, customerRes, assemblyOrderRes, userRes] = await Promise.allSettled([
      importApi.getWarehouses({ size: 100 }),
      importApi.getSuppliers(),
      importApi.getProducts({ size: 100 }),
      customerApi.searchCustomers('', '', '', 0, 100),
      assemblyOrderApi.getAssemblyOrders({ size: 100 }),
      exportApi.getUsers({ size: 1000 })
    ]);

    if (warehouseRes.status === 'fulfilled') setWarehouses(pageContent(unwrap(warehouseRes.value)));
    if (supplierRes.status === 'fulfilled') setSuppliers(pageContent(unwrap(supplierRes.value)));
    if (productRes.status === 'fulfilled') setProducts(pageContent(unwrap(productRes.value)));
    if (customerRes.status === 'fulfilled') setCustomers(pageContent(unwrap(customerRes.value)));
    if (assemblyOrderRes.status === 'fulfilled') setAssemblyOrders(pageContent(unwrap(assemblyOrderRes.value)));
    if (userRes.status === 'fulfilled') setUsers(pageContent(unwrap(userRes.value)));
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
    let partnerLabel = 'Chưa chọn';
    if (!slip.issuePurpose || slip.issuePurpose === 'PURCHASE') {
      partnerLabel = supplierById.get(slip.partnerId)?.name || (slip.partnerId ? `NCC #${slip.partnerId}` : 'Chưa chọn');
    } else if (slip.issuePurpose === 'RETURN') {
      partnerLabel = customerById.get(slip.partnerId)?.name || (slip.partnerId ? `KH #${slip.partnerId}` : 'Chưa chọn');
    } else if (slip.issuePurpose === 'PRODUCTION') {
      partnerLabel = assemblyOrderById.get(slip.referenceId)?.orderCode || (slip.referenceId ? `LSX #${slip.referenceId}` : 'Chưa chọn');
    }

    return {
      ...slip,
      date: formatDate(slip.docDate),
      partner: partnerLabel,
      warehouse: warehouseById.get(slip.warehouseId)?.name || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'Chưa chọn'),
      purchaserName: slip.salespersonName || userById.get(slip.salespersonId)?.fullName || userById.get(slip.salespersonId)?.username || (slip.salespersonId ? String(slip.salespersonId) : 'Chưa rõ'),
      delivererName: slip.recipientName || 'Chưa rõ',
      total: money(sumSubtotal(slip.lines) + sumVat(slip.lines)),
      vat: money(sumVat(slip.lines)),
      quantity: sumQuantity(slip.lines),
      statusLabel: status.label,
      statusCode: status.code,
    };
  });

  const handleExport = () => {
    const headers = ['Ngày ghi nhận', 'Số chứng từ', 'Đối tác / Tham chiếu', 'Kho nhập', 'Tổng tiền', 'Tiền VAT', 'Trạng thái'];
    const data = rows.map(item => [
      item.date,
      item.docCode,
      item.partner,
      item.warehouse,
      item.total,
      item.vat,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_phieu_nhap_kho');
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
      const vatPercent = Number(line.vatPercent ?? line.vatRate ?? 0);
      const vatAmount = amount * (vatPercent / 100);
      const serials = line.serialNumbers && line.serialNumbers.length > 0 ? line.serialNumbers.join(', ') : 'Không có';

      rowsHtml += `
        <tr>
          <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(sku)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(name)}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(unit)}</td>
          <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${price.toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${vatPercent}%</td>
          <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${vatAmount.toLocaleString('vi-VN')} đ</td>
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
                <th style="width: 10%;">Đơn giá</th>
                <th style="width: 7%;">% VAT</th>
                <th style="width: 10%;">Tiền VAT</th>
                <th style="width: 12%;">Thành tiền</th>
                <th style="width: 14%;">Số Serial</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="total-row">
                <td colspan="4" style="text-align: right; border: 1px solid #ddd; padding: 10px;">Tổng tiền hàng:</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 10px;">${sumQuantity(slip.lines).toLocaleString('vi-VN')}</td>
                <td style="border: 1px solid #ddd; padding: 10px;"></td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 10px;">${sumSubtotal(slip.lines).toLocaleString('vi-VN')} đ</td>
                <td colspan="3" style="border: 1px solid #ddd; padding: 10px;"></td>
              </tr>
              <tr class="total-row">
                <td colspan="8" style="text-align: right; border: 1px solid #ddd; padding: 10px;">Tiền VAT:</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 10px;">${sumVat(slip.lines).toLocaleString('vi-VN')} đ</td>
                <td style="border: 1px solid #ddd; padding: 10px;"></td>
              </tr>
              <tr class="total-row">
                <td colspan="8" style="text-align: right; border: 1px solid #ddd; padding: 10px; color: #d32f2f;">Tổng thanh toán:</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 10px; color: #d32f2f;">${(sumSubtotal(slip.lines) + sumVat(slip.lines)).toLocaleString('vi-VN')} đ</td>
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
                <option value="POSTED">Hoàn thành</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setFilters({ docCode: '', fromDate: '', status: '' })}
              title="Làm mới"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <button
              className={styles.iconBtn}
              onClick={handleExport}
              title="Xuất Excel"
            >
              <i className="bi bi-file-earmark-excel"></i>
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setShowSettingsModal(true)}
              title="Thiết lập"
            >
              <i className="bi bi-gear"></i>
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
                {columns.date && <th style={{ width: '120px' }}>Ngày Nhập</th>}
                {columns.docCode && <th style={{ width: '180px' }}>Số Phiếu</th>}
                {columns.partner && <th style={{ width: '200px' }}>Đối tác / Tham chiếu</th>}
                {columns.warehouse && <th style={{ width: '120px' }}>Kho Nhập</th>}
                {columns.purchaser && <th style={{ width: '150px' }}>Nhân viên mua hàng</th>}
                {columns.deliverer && <th style={{ width: '150px' }}>Người giao hàng</th>}
                {columns.vat && <th className={styles.textRight} style={{ width: '110px' }}>Tiền VAT</th>}
                {columns.total && <th className={styles.textRight} style={{ width: '110px' }}>Tổng Tiền</th>}
                {columns.note && <th style={{ minWidth: '150px' }}>Ghi Chú</th>}
                {columns.status && <th style={{ width: '120px' }}>Trạng Thái</th>}
                <th className={styles.textCenter} style={{ width: '100px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? paginatedRows.map(slip => (
                <tr key={slip.id} className={selectedSlip?.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)} style={{ cursor: 'pointer' }}>
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
                  {columns.docCode && (
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
                        {slip.docCode}
                      </a>
                    </td>
                  )}
                  {columns.partner && <td>{slip.partner}</td>}
                  {columns.warehouse && <td>{slip.warehouse}</td>}
                  {columns.purchaser && <td>{slip.purchaserName}</td>}
                  {columns.deliverer && <td>{slip.delivererName}</td>}
                  {columns.vat && <td className={`${styles.money} ${styles.textRight}`}>{slip.vat}</td>}
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
                  {selectedSlip.docCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handlePrintSlip(selectedSlip, true)}
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
                      <span className={styles.detailLabel}>
                        {(!selectedSlip.issuePurpose || selectedSlip.issuePurpose === 'PURCHASE') && 'Nhà cung cấp'}
                        {selectedSlip.issuePurpose === 'PRODUCTION' && 'Lệnh sản xuất'}
                        {selectedSlip.issuePurpose === 'RETURN' && 'Khách hàng'}
                      </span>
                      <span className={styles.detailValue}>
                        {(!selectedSlip.issuePurpose || selectedSlip.issuePurpose === 'PURCHASE') && (supplierById.get(selectedSlip.partnerId)?.name || 'Chưa chọn')}
                        {selectedSlip.issuePurpose === 'PRODUCTION' && (assemblyOrderById.get(selectedSlip.referenceId)?.orderCode || 'Chưa chọn')}
                        {selectedSlip.issuePurpose === 'RETURN' && (customerById.get(selectedSlip.partnerId)?.name || 'Chưa chọn')}
                      </span>
                    </div>
                    {(!selectedSlip.issuePurpose || selectedSlip.issuePurpose === 'PURCHASE' || selectedSlip.issuePurpose === 'PRODUCTION') && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Người giao hàng</span>
                        <span className={styles.detailValue}>{selectedSlip.recipientName || 'Chưa có thông tin'}</span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>
                        {(!selectedSlip.issuePurpose || selectedSlip.issuePurpose === 'PURCHASE') && 'Nhân viên mua hàng'}
                        {selectedSlip.issuePurpose === 'PRODUCTION' && 'Nhân viên phụ trách'}
                        {selectedSlip.issuePurpose === 'RETURN' && 'Nhân viên bán hàng'}
                      </span>
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
                      <th className={styles.textRight}>% VAT</th>
                      <th className={styles.textRight}>Tiền VAT</th>
                      <th className={styles.textRight}>Thành tiền</th>
                      <th>Số Serial</th>
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
                          <td className={styles.textRight}>{line.vatPercent ?? line.vatRate ?? 0}%</td>
                          <td className={styles.textRight}>{money(Number(line.quantityIn || 0) * Number(line.unitCost || 0) * (Number(line.vatPercent ?? line.vatRate ?? 0) / 100))}</td>
                          <td className={styles.textRight}>{money(line.lineAmount)}</td>
                          <td style={{ maxWidth: '200px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                            {line.serialNumbers && line.serialNumbers.length > 0 
                              ? line.serialNumbers.join(', ') 
                              : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>Không có</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.detailFooter}>
                  <div className={styles.footerTotalLabel}>Tổng cộng hàng nhập:</div>
                  <div className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</div>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '4px', fontSize: '13px' }}>Tổng tiền hàng: <strong>{money(sumSubtotal(selectedSlip.lines))}</strong></div>
                    <div style={{ marginBottom: '4px', fontSize: '13px' }}>Tiền VAT: <strong>{money(sumVat(selectedSlip.lines))}</strong></div>
                    <div style={{ fontSize: '16px', color: 'var(--color-primary)' }}>Tổng thanh toán: <strong>{money(sumSubtotal(selectedSlip.lines) + sumVat(selectedSlip.lines))}</strong></div>
                  </div>
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
        <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    </AdminLayout>
  );
}

export default ImportHistoryPage;
