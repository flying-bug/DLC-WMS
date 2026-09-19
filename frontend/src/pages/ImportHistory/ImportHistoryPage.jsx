import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useLocation } from 'react-router-dom';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';
import UnpostConfirmModal from '../../components/ui/UnpostConfirmModal/UnpostConfirmModal';


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
import RowActionMenu from '../../components/ui/RowActionMenu/RowActionMenu';
import Pagination from '../../components/ui/Pagination/Pagination';
import { canViewPricing } from '../../auth/session';
import usePermissionGuard from '../../hooks/usePermissionGuard';


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
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);
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
  const [initialLoading, setInitialLoading] = useState(true);
  const guard = usePermissionGuard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unpostTarget, setUnpostTarget] = useState(null);


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

  const loadSlips = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
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
      if (!silent) setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load import slips:', err);
      setError('Khởi tạo danh sách thất bại. Vui lòng thử lại.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);
  useRealtimeRefresh(['IMPORT_DOCUMENT'], loadSlips);

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
      <div className={styles.pageBody} onClick={() => setOpenDropdownId(null)}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách phiếu nhập kho</h1>
          {guard.check('import:add') && (
            <button className={styles.btnPrimary} onClick={() => navigate('/import-history/create')}>
              <i className="bi bi-plus"></i> Thêm mới
            </button>
          )}
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
                        {slip.status === 'POSTED' || slip.status === 'COMPLETED' ? (
                          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                            <i className="fas fa-check" style={{ marginRight: 4 }}></i>Đã ghi sổ
                          </span>
                        ) : slip.status === 'UNPOSTED' ? (
                          <span className={`${styles.badge} ${styles.badgeWarning}`}>
                            <i className="fas fa-undo" style={{ marginRight: 4 }}></i>Bỏ ghi sổ
                          </span>
                        ) : slip.status === 'APPROVED' ? (
                          <span className={`${styles.badge} ${styles.badgeInfo}`}>
                            <i className="fas fa-check-double" style={{ marginRight: 4 }}></i>Đã duyệt
                          </span>
                        ) : slip.status === 'CANCELLED' ? (
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>
                            <i className="fas fa-ban" style={{ marginRight: 4 }}></i>Đã hủy
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeDraft}`}>
                            <i className="fas fa-clock" style={{ marginRight: 4 }}></i>Chờ ghi sổ
                          </span>
                        )}
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
                      <RowActionMenu
                        open={openDropdownId === slip.id}
                        onToggle={() => setOpenDropdownId(openDropdownId === slip.id ? null : slip.id)}
                        buttonClassName={styles.misaActionLink}
                        menuClassName={styles.actionDropdownMenu}
                      >
                            <button
                              type="button"
                              className={styles.dropdownItem}
                              onClick={() => {
                                setOpenDropdownId(null);
                                setSelectedSlip(slip);
                              }}
                            >
                              <i className="fas fa-eye"></i> Xem chi tiết
                            </button>
                            {guard.check('import:edit') && (
                              <button
                                type="button"
                                className={styles.dropdownItem}
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  if (slip.status !== 'DRAFT' && slip.status !== 'UNPOSTED') {
                                    showToast('error', 'Chỉ có thể cập nhật phiếu lưu tạm hoặc đã bỏ ghi sổ.');
                                  } else {
                                    navigate(`/import-slips/${slip.id}/edit`);
                                  }
                                }}
                              >
                                <i className="fas fa-edit"></i> Sửa phiếu nhập kho
                              </button>
                            )}
                            {slip.status === 'POSTED' && guard.check('import:edit') && (
                              <button
                                type="button"
                                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setUnpostTarget(slip);
                                }}
                              >
                                <i className="fas fa-undo-alt"></i> Bỏ ghi sổ
                              </button>
                            )}
                      </RowActionMenu>
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
                    style={{ backgroundColor: 'white', color: 'var(--wms-text-muted)', borderColor: 'var(--wms-border-base)' }}
                  >
                    <i className="bi bi-x-circle"></i> Bỏ chọn
                  </button>
                  <button className={styles.btnSecondary} onClick={handleBulkPrint} style={{ backgroundColor: 'white', color: 'var(--wms-text-muted)', borderColor: 'var(--wms-border-strong)' }}>
                    <i className="bi bi-printer"></i> In phiếu
                  </button>
                  <button className={styles.btnSecondary} onClick={handleExport} style={{ backgroundColor: 'white', color: '#16a34a', borderColor: 'var(--wms-success-border)' }}>
                    <i className="bi bi-file-earmark-excel"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          <Pagination
            page={currentPage - 1}
            totalPages={Math.max(1, totalPages)}
            totalElements={totalItems}
            size={pageSize}
            onPageChange={(p) => setCurrentPage(p + 1)}
            onSizeChange={(nextSize) => { setPageSize(nextSize); setCurrentPage(1); }}
          />
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
                        {selectedSlip.salespersonName || userById.get(selectedSlip.salespersonId)?.fullName || userById.get(selectedSlip.salespersonId)?.username || (selectedSlip.salespersonId ? String(selectedSlip.salespersonId) : 'Chưa phân công')}
                      </span>
                    </div>

                    {(() => {
                      const { note: cleanNote } = parseNoteAndAttachments(selectedSlip.note);
                      return (
                        <div className={styles.infoBlock}>
                          <span className={styles.infoLabel}>
                            <i className="bi bi-chat-text"></i> Ghi chú
                          </span>
                          <span className={styles.infoValue} style={{ color: cleanNote ? 'inherit' : 'var(--color-text-placeholder)', fontStyle: cleanNote ? 'normal' : 'italic' }}>
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

                {(() => {
                  const isAssembly = selectedSlip.issuePurpose === 'PRODUCTION' && selectedSlip.referenceType === 'ASSEMBLY_ORDER';
                  const displayVatAndTotal = showPricing && !isAssembly;

                  // Cột quy đổi đơn vị (ĐVC/Tỷ lệ CĐ/Phép tính/SL ĐVC) chỉ có ý nghĩa khi ít
                  // nhất 1 dòng thực sự quy đổi (tỷ lệ khác 1 hoặc ĐVT khác ĐVC) - còn lại thì
                  // 4 cột này luôn lặp lại y hệt ĐVT/Số lượng, chỉ tổ chiếm chỗ khiến bảng phải
                  // cuộn ngang mới thấy hết.
                  const hasAnyConversion = (selectedSlip.lines || []).some(line => {
                    const product = productById.get(line.variantId);
                    const baseUnitName = line.baseUnitName || product?.unitName || '-';
                    const unitName = line.unitName || product?.unitName || '-';
                    const ratio = Number(line.conversionRatio) > 0 ? Number(line.conversionRatio) : 1;
                    return ratio !== 1 || baseUnitName !== unitName;
                  });

                  const columnCount = 5 // STT, Mã SP, Tên sản phẩm, ĐVT, Số lượng
                    + (hasAnyConversion ? 4 : 0)
                    + (showPricing ? 1 : 0)
                    + (displayVatAndTotal ? 3 : 0);

                  return (
                    <>
                      <table className={styles.detailTable}>
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Mã SP</th>
                            <th>Tên sản phẩm</th>
                            <th>ĐVT</th>
                            <th className={styles.textCenter}>Số lượng</th>
                            {hasAnyConversion && <th>ĐVC</th>}
                            {hasAnyConversion && <th className={styles.textCenter}>Tỷ lệ CĐ</th>}
                            {hasAnyConversion && <th className={styles.textCenter}>Phép tính</th>}
                            {hasAnyConversion && <th className={styles.textRight}>SL (ĐVC)</th>}
                            {showPricing && <th className={styles.textRight}>Giá nhập</th>}
                            {displayVatAndTotal && <th className={styles.textRight}>% VAT</th>}
                            {displayVatAndTotal && <th className={styles.textRight}>Tiền VAT</th>}
                            {displayVatAndTotal && <th className={styles.textRight}>Thành tiền</th>}
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
                            const hasSerial = line.serialNumbers && line.serialNumbers.length > 0;
                            return (
                              <Fragment key={line.id || index}>
                                <tr>
                                  <td>{index + 1}</td>
                                  <td className={styles.textBlue} style={{ fontWeight: '500' }}>{product?.sku || `SKU #${line.variantId}`}</td>
                                  <td style={{ fontWeight: '500' }}>{variantLabel(product) || 'Chưa có tên sản phẩm'}</td>
                                  <td>{unitName}</td>
                                  <td className={styles.textCenter} style={{ fontWeight: '600' }}>{Number(qty).toLocaleString('vi-VN')}</td>
                                  {hasAnyConversion && <td>{baseUnitName}</td>}
                                  {hasAnyConversion && <td className={styles.textCenter}>{ratio}</td>}
                                  {hasAnyConversion && <td className={styles.textCenter} style={{ fontWeight: 600, color: 'var(--wms-primary)' }}>{op === 'DIVIDE' || op === '/' ? '/' : '*'}</td>}
                                  {hasAnyConversion && <td className={styles.textRight} style={{ fontWeight: '600', color: 'var(--wms-success)' }}>{Number(baseQty.toFixed(4)).toLocaleString('vi-VN')}</td>}
                                  {showPricing && <td className={styles.textRight}>{money(line.unitCost)}</td>}
                                  {displayVatAndTotal && <td className={styles.textRight}>{line.vatPercent ?? line.vatRate ?? 0}%</td>}
                                  {displayVatAndTotal && <td className={styles.textRight}>{money(Number(qty) * Number(line.unitCost || 0) * (Number(line.vatPercent ?? line.vatRate ?? 0) / 100))}</td>}
                                  {displayVatAndTotal && <td className={styles.textRight} style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{money(line.lineAmount)}</td>}
                                </tr>
                                {hasSerial && (
                                  <tr>
                                    <td colSpan={columnCount} style={{ backgroundColor: 'var(--wms-bg-soft)', padding: '8px 12px 8px 40px', whiteSpace: 'normal', wordWrap: 'break-word', borderBottom: '1px solid var(--wms-bg-hover)' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1', marginRight: '6px' }}>
                                        <i className="bi bi-upc-scan" style={{ marginRight: '4px' }}></i>
                                        Serial ({line.serialNumbers.length}):
                                      </span>
                                      <span style={{ fontSize: '13px', color: 'var(--wms-text-strong)' }}>
                                        {line.serialNumbers.join(', ')}
                                      </span>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>

                      {(() => {
                        const { attachments } = parseNoteAndAttachments(selectedSlip.note);
                        if (!attachments || attachments.length === 0) return null;
                        return (
                          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'var(--wms-bg-soft)', borderRadius: '8px', border: '1px solid var(--wms-border-base)' }}>
                            <AttachmentUpload
                              files={attachments}
                              disabled={true}
                            />
                          </div>
                        );
                      })()}

                      <div className={styles.detailFooter}>
                        <div className={styles.footerGroup}>
                          <span className={styles.footerTotalLabel}>Tổng số mặt hàng:</span>
                          <span className={styles.footerQty}>{(selectedSlip.lines || []).length}</span>
                          <span className={styles.footerTotalLabel} style={{ marginLeft: '16px' }}>Tổng SL thực nhập:</span>
                          <span className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</span>
                        </div>
                        <div style={{ flex: 1 }}></div>
                        {showPricing && (
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--wms-text-muted)' }}>{isAssembly ? 'Tổng giá trị nhập:' : 'Tổng tiền hàng:'} <strong>{money(sumSubtotal(selectedSlip.lines))}</strong></div>
                            {displayVatAndTotal && (
                              <>
                                <div style={{ fontSize: '13px', color: 'var(--wms-text-muted)' }}>Tiền VAT: <strong>{money(sumVat(selectedSlip.lines))}</strong></div>
                                <div style={{ fontSize: '16px', color: 'var(--color-primary)', marginTop: '4px' }}>Tổng thanh toán: <strong>{money(sumSubtotal(selectedSlip.lines) + sumVat(selectedSlip.lines))}</strong></div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
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
        <UnpostConfirmModal
          open={Boolean(unpostTarget)}
          onClose={() => setUnpostTarget(null)}
          docCode={unpostTarget?.docCode}
          onCheckDependency={() => importApi.checkImportUnpost(unpostTarget?.id)}
          onConfirmUnpost={async (reason) => {
            await importApi.unpostImportSlip(unpostTarget?.id, reason);
            showToast('success', 'Bỏ ghi sổ phiếu nhập kho thành công!');
            loadSlips();
          }}
          docType="nhập kho"
        />
        <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>

    </AdminLayout>
  );
}

export default ImportHistoryPage;
