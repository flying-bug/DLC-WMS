import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as repairApi from '../../api/repairApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './RepairListPage.module.css';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';
import { formatDateOnly } from '../../utils/dateFormat';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import useSessionState from '../../hooks/useSessionState';


const STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  QUOTATION: { label: 'Báo giá', code: 'primary' },
  WAITING_FOR_APPROVAL: { label: 'Chờ duyệt', code: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', code: 'success' },
  WAITING_FOR_EXPORT: { label: 'Chờ xuất kho', code: 'warning' },
  UNDER_REPAIR: { label: 'Đang sửa chữa', code: 'purple' },
  DONE: { label: 'Hoàn tất', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' }
};

const DEFAULT_FILTERS = {
  keyword: '',
  status: '',
  fromDate: '',
  toDate: ''
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, meta]) => ({ value, label: meta.label }));

const COLUMN_OPTIONS = [
  { id: 'repairCode', label: 'Mã phiếu' },
  { id: 'partnerName', label: 'Khách hàng' },
  { id: 'productName', label: 'Sản phẩm' },
  { id: 'serialNumber', label: 'Serial' },
  { id: 'receivedDate', label: 'Ngày tiếp nhận' },
  { id: 'totalAmount', label: 'Tổng tiền' },
  { id: 'status', label: 'Trạng thái' }
];

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const totalFromPayload = (payload, fallback) => payload?.totalElements ?? fallback;
const formatDate = (value) => (value ? formatDateOnly(value) : 'Chưa có');

function RepairListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const guard = usePermissionGuard();

  const [filters, setFilters] = useSessionState('filters', DEFAULT_FILTERS);
  const [repairs, setRepairs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useSessionState('currentPage', 1);
  const [pageSize, setPageSize] = useSessionState('pageSize', 20);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

  const [columns, setColumns] = useState({
    repairCode: true,
    partnerName: true,
    productName: true,
    serialNumber: true,
    receivedDate: true,
    totalAmount: true,
    status: true
  });

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const toggleColumn = (id) => {
    setColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadRepairs = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = {
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        page: currentPage - 1,
        size: pageSize
      };
      const response = await repairApi.getRepairs(params);
      const payload = unwrap(response);
      setRepairs(pageContent(payload));
      setTotalItems(totalFromPayload(payload, 0));
      if (!silent) setSelectedIds([]);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không tải được danh sách phiếu sửa chữa.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters, currentPage, pageSize]);
  useRealtimeRefresh(['REPAIR'], loadRepairs);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  useEffect(() => {
    if (location.state?.toastMessage) {
      showToast(location.state.toastType || 'success', location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const rows = repairs.map(item => {
    const status = STATUS_LABELS[item.repairStatus] || { label: item.repairStatus || 'Không rõ', code: 'info' };
    const pName = item.partnerName || 'Khách lẻ';
    const sCode = item.serialNumber || '';
    const prdName = item.productName || 'Chưa rõ';
    
    return {
      ...item,
      displayPartnerName: pName,
      displaySerialNumber: sCode,
      displayProductName: prdName,
      receivedDateText: formatDate(item.receivedDate),
      totalAmountText: item.totalAmount ? Number(item.totalAmount).toLocaleString('vi-VN') + ' đ' : '0 đ',
      statusLabel: status.label,
      statusCode: status.code
    };
  });

  const handleExport = () => {
    const headers = ['Mã phiếu', 'Khách hàng', 'Sản phẩm', 'Serial', 'Ngày tiếp nhận', 'Tổng tiền', 'Trạng thái'];
    const data = rows.map(item => [
      item.repairCode || `SC-${item.id}`,
      item.displayPartnerName,
      item.displayProductName,
      item.displaySerialNumber,
      item.receivedDateText,
      item.totalAmountText,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_phieu_sua_chua');
    showToast('success', 'Xuất Excel thành công!');
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? rows.map(row => row.id) : []);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

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

  const getTableColumns = () => {
    const tableCols = [];

    if (columns.repairCode) {
      tableCols.push({
        title: 'Mã Phiếu',
        width: '150px',
        render: (_, item) => (
          <span className={styles.link} style={{ whiteSpace: 'nowrap' }}>
            {item.repairCode || `SC-${item.id}`}
          </span>
        )
      });
    }

    if (columns.partnerName) {
      tableCols.push({ title: 'Khách Hàng', dataIndex: 'displayPartnerName', width: '180px' });
    }
    if (columns.productName) {
      tableCols.push({ title: 'Sản Phẩm', dataIndex: 'displayProductName', width: '180px' });
    }
    if (columns.serialNumber) {
      tableCols.push({ title: 'Serial', dataIndex: 'displaySerialNumber', width: '150px' });
    }
    if (columns.receivedDate) {
      tableCols.push({ title: 'Tiếp Nhận', dataIndex: 'receivedDateText', width: '120px' });
    }
    if (columns.totalAmount) {
      tableCols.push({
        title: 'Tổng Tiền',
        dataIndex: 'totalAmountText',
        width: '130px',
        align: 'right'
      });
    }
    if (columns.status) {
      tableCols.push({
        title: 'Trạng Thái',
        width: '140px',
        render: (_, item) => (
          <span className={`${styles.badge} ${
            item.statusCode === 'success' ? styles.badgeSuccess :
            item.statusCode === 'info' ? styles.badgeInfo :
            item.statusCode === 'warning' ? styles.badgeWarning :
            item.statusCode === 'primary' ? styles.badgePrimary :
            item.statusCode === 'purple' ? styles.badgePurple :
            styles.badgeDanger
          }`}>
            {item.statusLabel}
          </span>
        )
      });
    }

    return tableCols;
  };

  const renderActions = (item) => (
    <i 
      className="bi bi-pencil" 
      style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} 
      title="Chỉnh sửa" 
      onClick={() => guard('repair:edit', () => navigate(`/repairs/${item.id}/edit`))}
    ></i>
  );

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách phiếu sửa chữa</h1>
          <button className={styles.btnPrimary} onClick={() => guard('repair:add', () => navigate('/repairs/create'))}>
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
                placeholder="Mã phiếu, khách hàng..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); loadRepairs(); } }}
              />
            </div>
          </div>
          <div className={styles.filterActions}>
            <FilterPopover
              filters={filters}
              onApply={(newFilters) => { setFilters(newFilters); setCurrentPage(1); }}
              onReset={() => { setFilters(DEFAULT_FILTERS); setCurrentPage(1); }}
              statusOptions={STATUS_OPTIONS}
            />
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
            <button className={styles.btnPrimary} onClick={() => { setCurrentPage(1); loadRepairs(); }}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <ResponsiveTable
            columns={getTableColumns()}
            data={rows}
            loading={loading}
            emptyMessage="Không tìm thấy phiếu sửa chữa nào"
            onRowClick={(item) => navigate(`/repairs/${item.id}/edit`)}
            actions={renderActions}
          />
        </div>

        <Pagination
          page={currentPage - 1}
          totalPages={Math.max(1, totalPages)}
          totalElements={totalItems}
          size={pageSize}
          onPageChange={(page) => setCurrentPage(page + 1)}
          onSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />

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

export default RepairListPage;
