import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './WarrantyListPage.module.css';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';
import { formatDateOnly } from '../../utils/dateFormat';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';


const STATUS_LABELS = {
  ACTIVE: { label: 'Còn hiệu lực', code: 'success' },
  EXPIRED: { label: 'Hết hạn', code: 'warning' },
  VOIDED: { label: 'Bị hủy', code: 'danger' }
};

const DEFAULT_FILTERS = {
  keyword: '',
  status: '',
  fromDate: '',
  toDate: ''
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, meta]) => ({ value, label: meta.label }));

const COLUMN_OPTIONS = [
  { id: 'warrantyCode', label: 'Mã bảo hành' },
  { id: 'serialNumber', label: 'Serial' },
  { id: 'productName', label: 'Sản phẩm' },
  { id: 'partnerName', label: 'Khách hàng' },
  { id: 'startDate', label: 'Ngày bắt đầu' },
  { id: 'endDate', label: 'Ngày hết hạn' },
  { id: 'status', label: 'Trạng thái' }
];

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const totalFromPayload = (payload, fallback) => payload?.totalElements ?? fallback;
const formatDate = (value) => (value ? formatDateOnly(value) : 'Chưa có');

function WarrantyListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [warranties, setWarranties] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedIds, setSelectedIds] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

  const [columns, setColumns] = useState({
    warrantyCode: true,
    serialNumber: true,
    productName: true,
    partnerName: true,
    startDate: true,
    endDate: true,
    status: true
  });

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const toggleColumn = (id) => {
    setColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadWarranties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        page: currentPage - 1,
        size: pageSize
      };
      const response = await warrantyApi.getWarranties(params);
      const payload = unwrap(response);
      setWarranties(pageContent(payload));
      setTotalItems(totalFromPayload(payload, 0));
      setSelectedIds([]);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không tải được danh sách bảo hành.');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  useEffect(() => {
    loadWarranties();
  }, [loadWarranties]);

  useEffect(() => {
    if (location.state?.toastMessage) {
      showToast(location.state.toastType || 'success', location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const rows = warranties.map(item => {
    let currentStatus = item.warrantyStatus;
    if (currentStatus === 'APPROVED' || currentStatus === 'POSTED') currentStatus = 'ACTIVE';
    const status = STATUS_LABELS[currentStatus] || { label: currentStatus || 'Không rõ', code: 'info' };
    const pName = item.partnerName || item.customerName || item.partner?.name || 'Khách lẻ';

    const validSerials = item.lines
      ? item.lines.map(line => line.serialNumber).filter(s => s && String(s).trim() !== '')
      : [];
    const sCode = validSerials.length > 0
      ? validSerials.join(', ')
      : (item.serialNumber && String(item.serialNumber).trim() !== '' ? item.serialNumber : '-');

    const productNames = item.lines
      ? item.lines.map(line => line.variantName || line.productName || line.sku).filter(name => name && String(name).trim() !== '')
      : [];
    let prdName = 'Chưa rõ';
    if (productNames.length > 3) {
      prdName = productNames.slice(0, 3).join(', ') + ', ...';
    } else if (productNames.length > 0) {
      prdName = productNames.join(', ');
    } else if (item.productName || item.variantName) {
      prdName = item.productName || item.variantName;
    }

    return {
      ...item,
      displayPartnerName: pName,
      displaySerialNumber: sCode,
      displayProductName: prdName,
      startDateText: formatDate(item.startDate),
      endDateText: formatDate(item.endDate),
      statusLabel: status.label,
      statusCode: status.code
    };
  });

  const handleExport = () => {
    const headers = ['Mã bảo hành', 'Serial', 'Sản phẩm', 'Khách hàng', 'Ngày bắt đầu', 'Ngày hết hạn', 'Trạng thái'];
    const data = rows.map(item => [
      item.warrantyCode || `BH-${item.id}`,
      item.displaySerialNumber,
      item.displayProductName,
      item.displayPartnerName,
      item.startDateText,
      item.endDateText,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_bao_hanh');
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

    if (columns.warrantyCode) {
      tableCols.push({
        title: 'Mã Bảo Hành',
        width: '150px',
        render: (_, item) => (
          <span
            className={styles.link}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/warranties/${item.id}`);
            }}
          >
            {item.warrantyCode || `BH-${item.id}`}
          </span>
        )
      });
    }

    if (columns.serialNumber) {
      tableCols.push({ title: 'Serial', dataIndex: 'displaySerialNumber', width: '150px' });
    }
    if (columns.productName) {
      tableCols.push({ title: 'Sản Phẩm', dataIndex: 'displayProductName', width: '180px' });
    }
    if (columns.partnerName) {
      tableCols.push({ title: 'Khách Hàng', dataIndex: 'displayPartnerName', width: '180px' });
    }
    if (columns.startDate) {
      tableCols.push({ title: 'Bắt Đầu', dataIndex: 'startDateText', width: '120px' });
    }
    if (columns.endDate) {
      tableCols.push({ title: 'Kết Thúc', dataIndex: 'endDateText', width: '120px' });
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
      className="bi bi-eye"
      style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px' }}
      title="Xem chi tiết"
      onClick={(e) => { e.stopPropagation(); navigate(`/warranties/${item.id}`); }}
    ></i>
  );

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách bảo hành</h1>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌM KIẾM</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Mã bảo hành, serial..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); loadWarranties(); } }}
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
            <button className={styles.btnPrimary} onClick={() => { setCurrentPage(1); loadWarranties(); }}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <ResponsiveTable
            columns={getTableColumns()}
            data={rows}
            loading={loading}
            emptyMessage="Không tìm thấy phiếu bảo hành nào"
            onRowClick={(item) => navigate(`/warranties/${item.id}`)}
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

export default WarrantyListPage;
