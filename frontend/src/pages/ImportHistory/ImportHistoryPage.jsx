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
import { printImportSlip } from '../../utils/printImportSlip';
import { formatDateOnly } from '../../utils/dateFormat';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import TimeInfoBadge from '../../components/ui/TimeInfoBadge/TimeInfoBadge';
import AttachmentUpload from '../../components/ui/AttachmentUpload/AttachmentUpload';
import { parseNoteAndAttachments } from '../../utils/attachmentHelper';
import styles from './ImportHistoryPage.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import { canViewPricing } from '../../auth/session';


const DEFAULT_COLUMNS = {
  date: true,
  docCode: true,
  issuePurpose: true,
  partner: true,
  warehouse: true,
  purchaser: true,
  deliverer: true,
  total: true,
  vat: true,
  note: true,
  status: true,
};

const IMPORT_PURPOSE_OPTIONS = [
  { value: 'PURCHASE', label: 'Nhập mua hàng' },
  { value: 'STOCKTAKE_ADD', label: 'Hàng thừa từ kiểm kê' },
  { value: 'PRODUCTION', label: 'Lắp ráp / tháo dỡ' },
  { value: 'RETURN', label: 'Hàng bán bị trả lại' },
  { value: 'SCRAP', label: 'Nhập phế liệu (Sửa chữa)' },
  { value: 'OTHER', label: 'Khác' }
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Lưu tạm' },
  { value: 'POSTED', label: 'Ghi sổ' },
];

const COLUMN_OPTIONS = [
  { id: 'date', label: 'Ngày Nhập' },
  { id: 'docCode', label: 'Số Phiếu' },
  { id: 'issuePurpose', label: 'Loại Phiếu' },
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
  POSTED: { label: 'Ghi sổ', code: 'success' },
};

const IMPORT_PURPOSE_LABELS = {
  PURCHASE: 'Mua hàng',
  STOCKTAKE_ADD: 'Hàng thừa từ kiểm kê',
  RETURN: 'Hàng bán bị trả lại',
  PRODUCTION: 'Nhập kho sản xuất',
  SCRAP: 'Nhập phế liệu',
  OTHER: 'Khác'
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDate = formatDateOnly;
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
  const showPricing = canViewPricing();
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
  const DEFAULT_FILTERS = useMemo(() => {
    const range = getDateRangePreset('THIS_YEAR');
    return {
      keyword: location.state?.filterKeyword || location.state?.filterDocCode || '',
      fromDate: range?.fromDate || '',
      toDate: range?.toDate || '',
      preset: 'THIS_YEAR',
      status: '',
      warehouseId: '',
      partnerId: '',
      staffId: '',
      issuePurpose: '',
      referenceId: location.state?.referenceId || '',
      referenceType: location.state?.referenceType || '',
    };
  }, [location.state?.filterKeyword, location.state?.filterDocCode, location.state?.referenceId, location.state?.referenceType]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
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
      importApi.getWarehouses({ size: 1000 }),
      importApi.getSuppliers(),
      importApi.getProducts({ size: 2000 }),
      customerApi.searchCustomers('', '', '', 0, 1000),
      assemblyOrderApi.getAssemblyOrders({ size: 1000 }),
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
        keyword: filters.keyword || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        status: filters.status || undefined,
        warehouseId: filters.warehouseId || undefined,
        issuePurpose: filters.issuePurpose || undefined,
        referenceId: filters.referenceId || undefined,
        referenceType: filters.referenceType || undefined,
        partnerId: filters.partnerId || undefined,
        salespersonId: filters.staffId || undefined,
      };
      const response = await importApi.getImportHistory(params);
      const data = unwrap(response) || [];
      setSlips(data);
      setSelectedSlip(current => data.find(item => item.id === current?.id) || null);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load import slips:', err);
      setError('Khởi tạo danh sách thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
      if (!slip.issuePurpose || slip.issuePurpose === 'PURCHASE') {
        partnerLabel = supplierById.get(slip.partnerId)?.name || (slip.partnerId ? `NCC #${slip.partnerId}` : 'Chưa chọn');
      } else if (slip.issuePurpose === 'RETURN' || slip.issuePurpose === 'SCRAP') {
        partnerLabel = customerById.get(slip.partnerId)?.name || (slip.partnerId ? `KH #${slip.partnerId}` : 'Chưa chọn');
      } else if (slip.issuePurpose === 'PRODUCTION') {
        partnerLabel = assemblyOrderById.get(slip.referenceId)?.orderCode || (slip.referenceId ? `LSX #${slip.referenceId}` : 'Chưa chọn');
      }

      return {
        ...slip,
        date: formatDate(slip.docDate),
        issuePurposeLabel: IMPORT_PURPOSE_LABELS[slip.issuePurpose] || 'Khác',
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
    const dataToExport = selectedIds.length > 0 
      ? rows.filter(r => selectedIds.includes(r.id)) 
      : rows;

    if (dataToExport.length === 0) {
      showToast('warning', 'Không có dữ liệu để xuất Excel');
      return;
    }

    const headers = ['Ngày ghi nhận', 'Số chứng từ', 'Loại phiếu', 'Đối tác / Tham chiếu', 'Kho nhập', 'Tổng tiền', 'Tiền VAT', 'Trạng thái'];
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
    exportToExcel(headers, data, 'Danh_sach_phieu_nhap_kho');
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

    printImportSlip(slipsToPrint, {
      supplierById,
      customerById,
      assemblyOrderById,
      warehouseById,
      productById,
      userById,
      isImport: true,
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

  const handlePrintSlip = (slip, isImport = true) => {
    const supplier = supplierById.get(slip.partnerId) || supplierById.get(Number(slip.partnerId)) || {};
    const customer = customerById.get(slip.partnerId) || customerById.get(Number(slip.partnerId)) || {};
    const warehouseName = warehouseById.get(slip.warehouseId)?.name || warehouseById.get(Number(slip.warehouseId))?.name || '';

    printImportSlip(slip, {
      supplier,
      customer,
      warehouseName,
      supplierById,
      customerById,
      assemblyOrderById,
      warehouseById,
      productById,
      userById,
      isImport,
      onError: (msg) => showToast('error', msg)
    });
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
          <div className={styles.searchAndPopover}>
            <div className={styles.searchBox}>
              <i className="bi bi-search"></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo mã phiếu, Serial, SKU..."
                value={filters.keyword}
                onChange={(event) => {
                  setCurrentPage(1);
                  setFilters(prev => ({ ...prev, keyword: event.target.value }));
                }}
              />
              {filters.keyword && (
                <button className={styles.clearSearchBtn} onClick={() => {
                  setCurrentPage(1);
                  setFilters(prev => ({ ...prev, keyword: '' }));
                }}>
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>

            <TimeInfoBadge filters={filters} />
          </div>

          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => {
                setCurrentPage(1);
                setFilters(DEFAULT_FILTERS);
              }}
              title="Làm mới"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <FilterPopover
              filters={filters}
              onApply={(newFilters) => {
                setCurrentPage(1);
                setFilters(newFilters);
              }}
              onReset={() => {
                setCurrentPage(1);
                setFilters(DEFAULT_FILTERS);
              }}
              warehouses={warehouses}
              partners={suppliers}
              staffList={users}
              purposeOptions={IMPORT_PURPOSE_OPTIONS}
              statusOptions={STATUS_OPTIONS}
              partnerLabel="Nhà cung cấp / Đối tác"
              staffLabel="Nhân viên mua"
              purposeLabel="Loại phiếu nhập"
            />
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
          </div>
        </div>

        {error && <div className={styles.emptyState}>{error}</div>}

        <div className={styles.tableContainer}>
          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
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
                  {columns.docCode && <th style={{ width: '150px' }}>Số Phiếu</th>}
                  {columns.issuePurpose && <th style={{ width: '150px' }}>Loại Phiếu</th>}
                  {columns.partner && <th style={{ width: '200px' }}>Đối tác / Tham chiếu</th>}
                  {columns.warehouse && <th style={{ width: '120px' }}>Kho Nhập</th>}
                  {columns.purchaser && <th style={{ width: '150px' }}>Nhân viên mua hàng</th>}
                  {columns.deliverer && <th style={{ width: '150px' }}>Người giao hàng</th>}
                  {showPricing && columns.vat && <th className={styles.textRight} style={{ width: '110px' }}>Tiền VAT</th>}
                  {showPricing && columns.total && <th className={styles.textRight} style={{ width: '110px' }}>Tổng Tiền</th>}
                  {columns.note && <th style={{ width: '180px' }}>Ghi Chú</th>}
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
                    {columns.issuePurpose && <td>{slip.issuePurposeLabel}</td>}
                    {columns.partner && <td>{slip.partner}</td>}
                    {columns.warehouse && <td>{slip.warehouse}</td>}
                    {columns.purchaser && <td>{slip.purchaserName}</td>}
                    {columns.deliverer && <td>{slip.delivererName}</td>}
                    {showPricing && columns.vat && <td className={`${styles.money} ${styles.textRight}`}>{slip.vat}</td>}
                    {showPricing && columns.total && <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>}
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
                        {slip.hasDiscrepancy && (
                          <span
                            style={{
                              marginLeft: 6,
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 10,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                            title={slip.discrepancyNote || 'Phiếu nhập kho có chênh lệch thiếu/hàng lỗi'}
                          >
                            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ea580c' }}></i>
                            Lệch HĐ
                          </span>
                        )}
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
                    <i className="bi bi-file-earmark-excel"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Hiển thị</span>
              <SearchableSelect
                className="misa-select"
                style={{ width: '70px', height: '32px', padding: '0 8px' }}
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </SearchableSelect>
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
                  Chi tiết phiếu nhập kho: {selectedSlip.docCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handlePrintSlip(selectedSlip, true)}
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
                    {(selectedSlip.partnerId || selectedSlip.issuePurpose === 'PURCHASE' || selectedSlip.issuePurpose === 'PRODUCTION' || selectedSlip.issuePurpose === 'RETURN') && (
                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>
                          <i className="bi bi-shop"></i>
                          {selectedSlip.issuePurpose === 'PRODUCTION'
                            ? 'Lệnh sản xuất'
                            : selectedSlip.issuePurpose === 'RETURN' || selectedSlip.issuePurpose === 'SCRAP'
                            ? 'Khách hàng'
                            : 'Nhà cung cấp'}
                        </span>
                        <span className={styles.infoValue}>
                          {selectedSlip.issuePurpose === 'PRODUCTION'
                            ? assemblyOrderById.get(selectedSlip.referenceId)?.orderCode || 'Chưa chọn'
                            : selectedSlip.issuePurpose === 'RETURN' || selectedSlip.issuePurpose === 'SCRAP'
                            ? customerById.get(selectedSlip.partnerId)?.name || 'Chưa chọn'
                            : supplierById.get(selectedSlip.partnerId)?.name || 'Chưa chọn'}
                        </span>
                      </div>
                    )}

                    {selectedSlip.recipientName && (
                      <div className={styles.infoBlock}>
                        <span className={styles.infoLabel}>
                          <i className="bi bi-truck"></i> Người giao hàng
                        </span>
                        <span className={styles.infoValue}>{selectedSlip.recipientName}</span>
                      </div>
                    )}

                    <div className={styles.infoBlock}>
                      <span className={styles.infoLabel}>
                        <i className="bi bi-person-badge"></i>
                        {selectedSlip.issuePurpose === 'PRODUCTION'
                          ? 'Nhân viên phụ trách'
                          : selectedSlip.issuePurpose === 'RETURN'
                          ? 'Nhân viên bán hàng'
                          : selectedSlip.issuePurpose === 'SCRAP'
                          ? 'Nhân viên tiếp nhận'
                          : selectedSlip.issuePurpose === 'PURCHASE'
                          ? 'Nhân viên mua hàng'
                          : 'Nhân viên lập phiếu'}
                      </span>
                      <span className={styles.infoValue}>
                        {selectedSlip.salespersonName || userById.get(selectedSlip.salespersonId)?.fullName || userById.get(selectedSlip.salespersonId)?.username || (selectedSlip.salespersonId ? String(selectedSlip.salespersonId) : 'Quản Lý Hệ Thống')}
                      </span>
                    </div>

                    {(() => {
                      const { note: cleanNote } = parseNoteAndAttachments(selectedSlip.note);
                      return (
                        <div className={styles.infoBlock}>
                          <span className={styles.infoLabel}>
                            <i className="bi bi-chat-text"></i> Ghi chú
                          </span>
                          <span className={styles.infoValue} style={{ color: cleanNote ? 'inherit' : '#9ca3af', fontStyle: cleanNote ? 'normal' : 'italic' }}>
                            {cleanNote || 'Không có ghi chú'}
                          </span>
                        </div>
                      );
                    })()}

                    {(selectedSlip.referenceType && selectedSlip.referenceId) && (
                      <div className={styles.infoBlock} style={{ gridColumn: 'span 2' }}>
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
                        <i className="bi bi-calendar3"></i> Ngày nhận hàng
                      </span>
                      <span className={styles.detailRightValue}>{formatDate(selectedSlip.docDate)}</span>
                    </div>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>
                        <i className="bi bi-box-seam"></i> Kho nhập
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
                      <th>Mã SP</th>
                      <th>Tên sản phẩm</th>
                      <th>ĐVT</th>
                      <th className={styles.textCenter}>Số lượng</th>
                      <th>ĐVC</th>
                      <th className={styles.textCenter}>Tỷ lệ CĐ</th>
                      <th className={styles.textCenter}>Phép tính</th>
                      <th className={styles.textRight}>SL (ĐVC)</th>
                      {showPricing && <th className={styles.textRight}>Giá nhập</th>}
                      {showPricing && <th className={styles.textRight}>% VAT</th>}
                      {showPricing && <th className={styles.textRight}>Tiền VAT</th>}
                      {showPricing && <th className={styles.textRight}>Thành tiền</th>}
                      <th>Số Serial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSlip.lines || []).map((line, index) => {
                      const product = productById.get(line.variantId);
                      const baseUnitName = line.baseUnitName || product?.unitName || '-';
                      const unitName = line.unitName || product?.unitName || '-';
                      const ratio = Number(line.conversionRatio) > 0 ? Number(line.conversionRatio) : 1;
                      const op = line.conversionOperator || 'MULTIPLY';
                      const qty = Number(line.quantityIn || 0);
                      const baseQty = line.baseQuantity != null ? Number(line.baseQuantity) : ((op === 'DIVIDE' || op === '/') ? (qty / ratio) : (qty * ratio));
                      return (
                        <tr key={line.id || index}>
                          <td>{index + 1}</td>
                          <td className={styles.textBlue} style={{ fontWeight: '500' }}>{product?.sku || `SKU #${line.variantId}`}</td>
                          <td style={{ fontWeight: '500' }}>{variantLabel(product) || 'Chưa có tên sản phẩm'}</td>
                          <td>{unitName}</td>
                          <td className={styles.textCenter} style={{ fontWeight: '600' }}>{Number(qty).toLocaleString('vi-VN')}</td>
                          <td>{baseUnitName}</td>
                          <td className={styles.textCenter}>{ratio}</td>
                          <td className={styles.textCenter} style={{ fontWeight: 600, color: '#2563eb' }}>{op === 'DIVIDE' || op === '/' ? '/' : '*'}</td>
                          <td className={styles.textRight} style={{ fontWeight: '600', color: '#059669' }}>{Number(baseQty.toFixed(4)).toLocaleString('vi-VN')}</td>
                          {showPricing && <td className={styles.textRight}>{money(line.unitCost)}</td>}
                          {showPricing && <td className={styles.textRight}>{line.vatPercent ?? line.vatRate ?? 0}%</td>}
                          {showPricing && <td className={styles.textRight}>{money(Number(qty) * Number(line.unitCost || 0) * (Number(line.vatPercent ?? line.vatRate ?? 0) / 100))}</td>}
                          {showPricing && <td className={styles.textRight} style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{money(line.lineAmount)}</td>}
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

                {(() => {
                  const { attachments } = parseNoteAndAttachments(selectedSlip.note);
                  if (!attachments || attachments.length === 0) return null;
                  return (
                    <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <AttachmentUpload
                        files={attachments}
                        disabled={true}
                      />
                    </div>
                  );
                })()}

                <div className={styles.detailFooter}>
                  <div className={styles.footerGroup}>
                    <span className={styles.footerTotalLabel}>Tổng SL thực nhập:</span>
                    <span className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</span>
                  </div>
                  <div style={{ flex: 1 }}></div>
                  {showPricing && (
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Tổng tiền hàng: <strong>{money(sumSubtotal(selectedSlip.lines))}</strong></div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Tiền VAT: <strong>{money(sumVat(selectedSlip.lines))}</strong></div>
                      <div style={{ fontSize: '16px', color: 'var(--color-primary)', marginTop: '4px' }}>Tổng thanh toán: <strong>{money(sumSubtotal(selectedSlip.lines) + sumVat(selectedSlip.lines))}</strong></div>
                    </div>
                  )}
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
