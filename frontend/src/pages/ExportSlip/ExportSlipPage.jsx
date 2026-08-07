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
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import { printExportSlip } from '../../utils/printExportSlip';
import styles from './ExportSlipPage.module.css';

const DEFAULT_COLUMNS = {
  date: true,
  docCode: true,
  issuePurpose: true,
  partner: true,
  warehouse: true,
  salesperson: true,
  recipient: true,
  total: true,
  vat: true,
  note: true,
  status: true,
};

const EXPORT_PURPOSE_OPTIONS = [
  { value: 'SALES', label: 'Bán hàng' },
  { value: 'USAGE', label: 'Sử dụng nội bộ' },
  { value: 'ASSEMBLY', label: 'Xuất lắp ráp / tháo dỡ' },
  { value: 'REPAIR', label: 'Xuất sửa chữa' },
  { value: 'OTHER', label: 'Khác' }
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Lưu tạm' },
  { value: 'POSTED', label: 'Ghi sổ' },
];

const COLUMN_OPTIONS = [
  { id: 'date', label: 'Ngày Xuất' },
  { id: 'docCode', label: 'Số Phiếu' },
  { id: 'issuePurpose', label: 'Loại Phiếu' },
  { id: 'partner', label: 'Khách Hàng / LSX' },
  { id: 'warehouse', label: 'Kho Xuất' },
  { id: 'salesperson', label: 'Nhân viên xuất hàng' },
  { id: 'recipient', label: 'Người nhận hàng' },
  { id: 'total', label: 'Tổng Tiền' },
  { id: 'vat', label: 'Tiền VAT' },
  { id: 'note', label: 'Ghi Chú' },
  { id: 'status', label: 'Trạng Thái' },
];

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  POSTED: { label: 'Ghi sổ', code: 'success' },
};

const EXPORT_PURPOSE_LABELS = {
  SALES: 'Bán hàng',
  USAGE: 'Sử dụng nội bộ',
  ASSEMBLY: 'Xuất lắp ráp / tháo dỡ',
  REPAIR: 'Xuất sửa chữa'
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '');
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
  const DEFAULT_FILTERS = useMemo(() => ({
    docCode: location.state?.filterDocCode || '',
    fromDate: '',
    toDate: '',
    preset: 'ALL',
    status: '',
    warehouseId: '',
    partnerId: '',
    staffId: '',
    issuePurpose: '',
  }), [location.state?.filterDocCode]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
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
        toDate: filters.toDate || undefined,
        status: filters.status || undefined,
        warehouseId: filters.warehouseId || undefined,
        issuePurpose: filters.issuePurpose || undefined,
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
  }, [filters.docCode, filters.fromDate, filters.toDate, filters.status, filters.warehouseId, filters.issuePurpose]);

  const handleNavigateReference = (refType, refId) => {
    if (!refType || !refId) return;
    const type = String(refType).trim().toUpperCase();
    if (type.includes('STOCKTAKE') || type.includes('STOCK_TAKE')) {
      navigate(`/stocktakes/${refId}`);
    } else if (type.includes('PURCHASE') || type === 'PO') {
      navigate(`/purchase-orders/${refId}`);
    } else if (type.includes('SALES') || type === 'SO') {
      navigate(`/sales-orders/${refId}`);
    } else if (type.includes('ASSEMBLY')) {
      navigate(`/assembly-orders/${refId}`);
    } else if (type === 'BOM') {
      navigate(`/assembly-boms/${refId}`);
    } else if (type.includes('REPAIR')) {
      navigate(`/repairs/${refId}`);
    } else if (type.includes('WARRANTY')) {
      navigate(`/warranties/${refId}`);
    }
  };

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

  const rows = slips
    .filter(slip => {
      if (filters.partnerId && String(slip.partnerId) !== String(filters.partnerId)) return false;
      if (filters.staffId && String(slip.salespersonId) !== String(filters.staffId)) return false;
      return true;
    })
    .map(slip => {
      const status = STATUS_LABELS[slip.status] || { label: slip.status || 'Không rõ', code: 'info' };

      let partnerLabel = 'Chưa chọn';
      if (!slip.issuePurpose || slip.issuePurpose === 'SALES' || slip.issuePurpose === 'REPAIR') {
        partnerLabel = customerById.get(slip.partnerId)?.name || (slip.partnerId ? `Khách hàng #${slip.partnerId}` : 'Chưa chọn');
      } else if (slip.issuePurpose === 'ASSEMBLY') {
        partnerLabel = assemblyOrderById.get(slip.referenceId)?.orderCode || (slip.referenceId ? `LSX #${slip.referenceId}` : 'Chưa chọn');
      }

      return {
        ...slip,
        date: formatDate(slip.docDate),
        issuePurposeLabel: EXPORT_PURPOSE_LABELS[slip.issuePurpose] || 'Khác',
        partner: partnerLabel,
        warehouse: warehouseById.get(slip.warehouseId)?.name || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'Chưa chọn'),
        salespersonName: slip.salespersonName || userById.get(slip.salespersonId)?.fullName || userById.get(slip.salespersonId)?.username || (slip.salespersonId ? String(slip.salespersonId) : 'Chưa rõ'),
        recipientName: slip.recipientName || 'Chưa rõ',
        total: money(sumSubtotal(slip.lines) + sumVat(slip.lines)),
        vat: money(sumVat(slip.lines)),
        quantity: sumQuantity(slip.lines),
        statusLabel: status.label,
        statusCode: status.code,
      };
    });

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? rows.filter(r => selectedIds.includes(r.id)) 
      : rows;

    if (dataToExport.length === 0) {
      showToast('warning', 'Không có dữ liệu để xuất Excel');
      return;
    }

    const headers = ['Ngày ghi nhận', 'Số chứng từ', 'Loại phiếu', 'Khách hàng / LSX', 'Kho xuất', 'Tổng tiền', 'Tiền VAT', 'Trạng thái'];
    const data = dataToExport.map(item => [
      item.date,
      item.docCode,
      item.issuePurposeLabel,
      item.partner,
      item.warehouse,
      item.total,
      item.vat,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_phieu_xuat_kho');
    showToast('success', 'Xuất Excel thành công!');
  };

  const handleBulkPrint = () => {
    const slipsToPrint = selectedIds.length > 0 
      ? slips.filter(s => selectedIds.includes(s.id))
      : [];
      
    if (slipsToPrint.length === 0) {
      showToast('warning', 'Vui lòng chọn phiếu để in');
      return;
    }

    printExportSlip(slipsToPrint, {
      customerById,
      warehouseById,
      productById,
      userById,
      isImport: false,
      onError: (msg) => showToast('error', msg)
    });
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

  const handlePrintSlip = (slip, isImport = false) => {
    const customer = customerById.get(slip.partnerId) || customerById.get(slip.customerId) || {};
    const warehouseName = warehouseById.get(slip.warehouseId)?.name || '';

    printExportSlip(slip, {
      customer,
      warehouseName,
      productById,
      userById,
      isImport,
    });
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
          <div className={styles.searchAndPopover}>
            <div className={styles.searchBox}>
              <i className="bi bi-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Nhập từ khóa tìm kiếm mã phiếu..."
                value={filters.docCode}
                onChange={(event) => setFilters(prev => ({ ...prev, docCode: event.target.value }))}
              />
              {filters.docCode && (
                <button className={styles.clearSearchBtn} onClick={() => setFilters(prev => ({ ...prev, docCode: '' }))}>
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>

            <FilterPopover
              filters={filters}
              onApply={(newFilters) => setFilters(newFilters)}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              warehouses={warehouses}
              partners={customers}
              staffList={users}
              purposeOptions={EXPORT_PURPOSE_OPTIONS}
              statusOptions={STATUS_OPTIONS}
              partnerLabel="Khách hàng"
              staffLabel="Nhân viên xuất"
              purposeLabel="Loại phiếu xuất"
            />
          </div>

          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => setFilters(DEFAULT_FILTERS)}
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
                    <input type="checkbox" className={styles.checkbox} checked={rows.length > 0 && selectedIds.length === rows.length} onChange={handleSelectAll} />
                  </th>
                  {columns.date && <th style={{ width: '120px' }}>Ngày Xuất</th>}
                  {columns.docCode && <th style={{ width: '150px' }}>Số Phiếu</th>}
                  {columns.issuePurpose && <th style={{ width: '150px' }}>Loại Phiếu</th>}
                  {columns.partner && <th style={{ width: '200px' }}>Khách Hàng / LSX</th>}
                  {columns.warehouse && <th style={{ width: '120px' }}>Kho Xuất</th>}
                  {columns.salesperson && <th style={{ width: '150px' }}>Nhân viên xuất hàng</th>}
                  {columns.recipient && <th style={{ width: '150px' }}>Người nhận hàng</th>}
                  {columns.vat && <th className={styles.textRight} style={{ width: '110px' }}>Tiền VAT</th>}
                  {columns.total && <th className={styles.textRight} style={{ width: '110px' }}>Tổng Tiền</th>}
                  {columns.note && <th style={{ width: '180px' }}>Ghi Chú</th>}
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
                    {columns.issuePurpose && <td>{slip.issuePurposeLabel}</td>}
                    {columns.partner && <td>{slip.partner}</td>}
                    {columns.warehouse && <td>{slip.warehouse}</td>}
                    {columns.salesperson && <td>{slip.salespersonName}</td>}
                    {columns.recipient && <td>{slip.recipientName}</td>}
                    {columns.vat && <td className={`${styles.money} ${styles.textRight}`} style={{ whiteSpace: 'nowrap' }}>{slip.vat}</td>}
                    {columns.total && <td className={`${styles.money} ${styles.textRight}`} style={{ whiteSpace: 'nowrap' }}>{slip.total}</td>}
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
          </div>

          {/* Action Bar */}
          {selectedIds.length > 0 && (
            <div className={styles.actionBar}>
              <div className={styles.actionBarContent}>
                <span className={styles.actionText}>
                  Đã chọn <strong>{selectedIds.length}</strong> phiếu
                </span>
                <div className={styles.actionButtons}>
                  <button 
                    className={styles.btnSecondary} 
                    onClick={() => setSelectedIds([])}
                    style={{ backgroundColor: 'white', color: '#64748b', borderColor: '#e2e8f0' }}
                  >
                    <i className="bi bi-x-circle"></i> Bỏ chọn
                  </button>
                  <button className={styles.btnSecondary} onClick={handleBulkPrint} style={{ backgroundColor: 'white', color: '#475569', borderColor: '#cbd5e1' }}>
                    <i className="bi bi-printer"></i> In phiếu
                  </button>
                  <button className={styles.btnSecondary} onClick={handleExport} style={{ backgroundColor: 'white', color: '#16a34a', borderColor: '#bbf7d0' }}>
                    <i className="bi bi-file-earmark-excel"></i> Xuất Excel
                  </button>
                </div>
              </div>
            </div>
          )}

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
                  Chi tiết phiếu xuất kho: {selectedSlip.docCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handlePrintSlip(selectedSlip, false)}
                    className={styles.btnOutline}
                    style={{ padding: '6px 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                  <div className={styles.infoGrid}>
                    {(selectedSlip.partnerId || selectedSlip.issuePurpose === 'SALE') && (
                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>
                          <i className="bi bi-person-hearts"></i> Khách hàng
                        </span>
                        <span className={styles.infoValue}>
                          {customerById.get(selectedSlip.partnerId)?.name || (selectedSlip.partnerId ? `Khách hàng #${selectedSlip.partnerId}` : 'Chưa chọn')}
                        </span>
                      </div>
                    )}

                    {selectedSlip.recipientName && (
                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>
                          <i className="bi bi-person"></i> Người nhận hàng
                        </span>
                        <span className={styles.infoValue}>{selectedSlip.recipientName}</span>
                      </div>
                    )}
                    
                    {selectedSlip.recipientAddress && (
                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>
                          <i className="bi bi-geo-alt"></i> Địa chỉ nhận hàng
                        </span>
                        <span className={styles.infoValue}>{selectedSlip.recipientAddress}</span>
                      </div>
                    )}

                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>
                        <i className="bi bi-person-badge"></i>
                        {selectedSlip.issuePurpose === 'SALE'
                          ? 'Nhân viên bán hàng'
                          : selectedSlip.issuePurpose === 'PRODUCTION'
                          ? 'Nhân viên phụ trách'
                          : 'Nhân viên lập phiếu'}
                      </span>
                      <span className={styles.infoValue}>
                        {selectedSlip.salespersonName || userById.get(selectedSlip.salespersonId)?.fullName || userById.get(selectedSlip.salespersonId)?.username || (selectedSlip.salespersonId ? String(selectedSlip.salespersonId) : 'Quản Lý Hệ Thống')}
                      </span>
                    </div>
                    
                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>
                        <i className="bi bi-chat-text"></i> Lý do xuất
                      </span>
                      <span className={styles.infoValue} style={{ color: selectedSlip.note ? 'inherit' : '#9ca3af', fontStyle: selectedSlip.note ? 'normal' : 'italic' }}>
                        {selectedSlip.note || 'Không có ghi chú'}
                      </span>
                    </div>

                    {(selectedSlip.referenceType && selectedSlip.referenceId) && (
                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>
                          <i className="bi bi-link-45deg"></i> Kèm chứng từ
                        </span>
                        <span 
                          className={styles.infoValue} 
                          style={{ color: 'var(--color-primary)', cursor: 'pointer', display: 'inline-block', marginTop: '4px' }}
                          onClick={() => handleNavigateReference(selectedSlip.referenceType, selectedSlip.referenceId)}
                          title="Bấm để xem chứng từ tham chiếu"
                        >
                          <span className={styles.serialBadge} style={{ cursor: 'pointer' }}>
                            <i className="bi bi-box-arrow-up-right" style={{ marginRight: '4px' }}></i>
                            {selectedSlip.referenceCode || selectedSlip.referenceId}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.detailRight}>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>
                        <i className="bi bi-calendar3"></i> Ngày chứng từ
                      </span>
                      <span className={styles.detailRightValue}>{formatDate(selectedSlip.docDate)}</span>
                    </div>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>
                        <i className="bi bi-box-arrow-right"></i> Kho xuất
                      </span>
                      <span className={`${styles.detailRightValue} ${styles.textBlue}`}>
                        {warehouseById.get(selectedSlip.warehouseId)?.name || `Kho #${selectedSlip.warehouseId}`}
                      </span>
                    </div>
                  </div>
                </div>

                <table className={styles.detailTable}>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Mã hàng</th>
                      <th>Tên hàng</th>
                      <th>DVT</th>
                      <th className={styles.textCenter}>Số lượng</th>
                      <th className={styles.textRight}>Đơn giá</th>
                      <th className={styles.textRight}>Giá xuất</th>
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
                          <td className={styles.textBlue} style={{ fontWeight: '500' }}>{product?.sku || `SKU #${line.variantId}`}</td>
                          <td style={{ fontWeight: '500' }}>
                            {variantLabel(product) || 'Chưa có tên sản phẩm'}
                          </td>
                          <td>{product?.unitName || ''}</td>
                          <td className={styles.textCenter} style={{ fontWeight: '600' }}>{Number(line.quantityOut || 0).toLocaleString('vi-VN')}</td>
                          <td className={styles.textRight}>{money(line.unitCost || line.unitPrice)}</td>
                          <td className={styles.textRight}>{money(line.unitPrice)}</td>
                          <td className={styles.textRight}>{line.vatPercent ?? line.vatRate ?? 0}%</td>
                          <td className={styles.textRight}>{money(Number(line.quantityOut || 0) * Number(line.unitPrice || 0) * (Number(line.vatPercent ?? line.vatRate ?? 0) / 100))}</td>
                          <td className={styles.textRight} style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{money(line.lineAmount)}</td>
                          <td style={{ maxWidth: '220px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                            {line.serialNumbers && line.serialNumbers.length > 0 ? (
                              <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                                {line.serialNumbers.join(', ')}
                              </span>
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
                    <span className={styles.footerTotalLabel}>Tổng SL xuất:</span>
                    <span className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</span>
                  </div>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Tổng tiền hàng: <strong>{money(sumSubtotal(selectedSlip.lines))}</strong></div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Tiền VAT: <strong>{money(sumVat(selectedSlip.lines))}</strong></div>
                    <div style={{ fontSize: '16px', color: 'var(--color-primary)', marginTop: '4px' }}>Tổng thanh toán: <strong>{money(sumSubtotal(selectedSlip.lines) + sumVat(selectedSlip.lines))}</strong></div>
                  </div>
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
