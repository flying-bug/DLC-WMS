import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './WarrantyListPage.module.css';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';

const STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  APPROVED: { label: 'Còn hiệu lực', code: 'success' },
  POSTED: { label: 'Đã ghi nhận', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
  EXPIRED: { label: 'Hết hạn', code: 'warning' },
  VOIDED: { label: 'Không hợp lệ', code: 'danger' }
};

const DEFAULT_FILTERS = {
  keyword: '',
  status: '',
  fromDate: '',
  toDate: ''
};

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
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có');

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
    const status = STATUS_LABELS[item.warrantyStatus] || { label: item.warrantyStatus || 'Không rõ', code: 'info' };
    const pName = item.partnerName || item.customerName || item.partner?.name || 'Khách lẻ';
    
    let sCode = '';
    let prdName = 'Chưa rõ';
    
    if (item.lines && item.lines.length > 0) {
      if (item.lines.length === 1) {
        sCode = item.lines[0].serialNumber || '';
        prdName = item.lines[0].variantName || item.lines[0].sku || 'Chưa rõ';
      } else {
        sCode = `[${item.lines.length} Serial]`;
        prdName = `[${item.lines.length} Sản phẩm]`;
      }
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

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách bảo hành</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/export-slips/create?type=WARRANTY')}>
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
                placeholder="Mã bảo hành, serial..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); loadWarranties(); } }}
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
              onClick={() => { setFilters(DEFAULT_FILTERS); setCurrentPage(1); setTimeout(loadWarranties, 0); }}
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
            <button className={styles.btnPrimary} onClick={() => { setCurrentPage(1); loadWarranties(); }}>
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
                {columns.warrantyCode && <th style={{ width: '150px' }}>Mã Bảo Hành</th>}
                {columns.serialNumber && <th style={{ width: '150px' }}>Serial</th>}
                {columns.productName && <th style={{ minWidth: '180px' }}>Sản Phẩm</th>}
                {columns.partnerName && <th style={{ minWidth: '180px' }}>Khách Hàng</th>}
                {columns.startDate && <th style={{ width: '120px' }}>Bắt Đầu</th>}
                {columns.endDate && <th style={{ width: '120px' }}>Kết Thúc</th>}
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
                      <div className={styles.emptyText}>Không tìm thấy phiếu bảo hành nào</div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(item => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectRow(e, item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {columns.warrantyCode && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          className={styles.link}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/warranties/${item.id}`);
                          }}
                        >
                          {item.warrantyCode || `BH-${item.id}`}
                        </span>
                      </td>
                    )}
                    {columns.serialNumber && <td>{item.displaySerialNumber}</td>}
                    {columns.productName && <td>{item.displayProductName}</td>}
                    {columns.partnerName && <td>{item.displayPartnerName}</td>}
                    {columns.startDate && <td>{item.startDateText}</td>}
                    {columns.endDate && <td>{item.endDateText}</td>}
                    {columns.status && (
                      <td>
                        <span className={`${styles.badge} ${
                          item.statusCode === 'success' ? styles.badgeSuccess :
                          item.statusCode === 'info' ? styles.badgeInfo :
                          item.statusCode === 'warning' ? styles.badgeWarning :
                          styles.badgeDanger
                        }`}>
                          {item.statusLabel}
                        </span>
                      </td>
                    )}
                    <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                      <i 
                        className="bi bi-eye" 
                        style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px' }} 
                        title="Xem chi tiết" 
                        onClick={(e) => { e.stopPropagation(); navigate(`/warranties/${item.id}`); }}
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

export default WarrantyListPage;
