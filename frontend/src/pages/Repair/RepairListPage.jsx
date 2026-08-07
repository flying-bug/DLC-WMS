import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as repairApi from '../../api/repairApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './RepairListPage.module.css';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';
import { formatDateOnly } from '../../utils/dateFormat';

const STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  QUOTATION: { label: 'Báo giá', code: 'primary' },
  CONFIRMED: { label: 'Đã xác nhận', code: 'success' },
  UNDER_REPAIR: { label: 'Đang sửa chữa', code: 'warning' },
  DONE: { label: 'Hoàn tất', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' }
};

const DEFAULT_FILTERS = {
  keyword: '',
  status: '',
  fromDate: '',
  toDate: ''
};

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

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [repairs, setRepairs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
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

  const loadRepairs = useCallback(async () => {
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
      const response = await repairApi.getRepairs(params);
      const payload = unwrap(response);
      setRepairs(pageContent(payload));
      setTotalItems(totalFromPayload(payload, 0));
      setSelectedIds([]);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không tải được danh sách phiếu sửa chữa.');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

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

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách phiếu sửa chữa</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/repairs/create')}>
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
                {Object.entries(STATUS_LABELS).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button
              className={styles.iconBtn}
              onClick={() => { setFilters(DEFAULT_FILTERS); setCurrentPage(1); setTimeout(loadRepairs, 0); }}
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
            <button className={styles.btnPrimary} onClick={() => { setCurrentPage(1); loadRepairs(); }}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
            </button>
          </div>
        </div>

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
                {columns.repairCode && <th style={{ width: '150px' }}>Mã Phiếu</th>}
                {columns.partnerName && <th style={{ minWidth: '180px' }}>Khách Hàng</th>}
                {columns.productName && <th style={{ minWidth: '180px' }}>Sản Phẩm</th>}
                {columns.serialNumber && <th style={{ width: '150px' }}>Serial</th>}
                {columns.receivedDate && <th style={{ width: '120px' }}>Tiếp Nhận</th>}
                {columns.totalAmount && <th className={styles.textRight} style={{ width: '130px' }}>Tổng Tiền</th>}
                {columns.status && <th style={{ width: '140px' }}>Trạng Thái</th>}
                <th className={styles.textCenter} style={{ width: '100px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.textCenter} style={{ padding: '40px' }}>
                    <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className={styles.emptyState}>
                      <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                      <div className={styles.emptyText}>Không tìm thấy phiếu sửa chữa nào</div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(item => (
                  <tr key={item.id} onClick={() => navigate(`/repairs/${item.id}/edit`)} style={{ cursor: 'pointer' }}>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectRow(e, item.id)}
                      />
                    </td>
                    {columns.repairCode && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={styles.link}>
                          {item.repairCode || `SC-${item.id}`}
                        </span>
                      </td>
                    )}
                    {columns.partnerName && <td>{item.displayPartnerName}</td>}
                    {columns.productName && <td>{item.displayProductName}</td>}
                    {columns.serialNumber && <td>{item.displaySerialNumber}</td>}
                    {columns.receivedDate && <td>{item.receivedDateText}</td>}
                    {columns.totalAmount && <td className={styles.textRight}>{item.totalAmountText}</td>}
                    {columns.status && (
                      <td>
                        <span className={`${styles.badge} ${
                          item.statusCode === 'success' ? styles.badgeSuccess :
                          item.statusCode === 'info' ? styles.badgeInfo :
                          item.statusCode === 'warning' ? styles.badgeWarning :
                          item.statusCode === 'primary' ? styles.badgePrimary :
                          styles.badgeDanger
                        }`}>
                          {item.statusLabel}
                        </span>
                      </td>
                    )}
                    <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <i 
                        className="bi bi-pencil" 
                        style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} 
                        title="Chỉnh sửa" 
                        onClick={() => navigate(`/repairs/${item.id}/edit`)}
                      ></i>
                    </td>
                  </tr>
                ))
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
