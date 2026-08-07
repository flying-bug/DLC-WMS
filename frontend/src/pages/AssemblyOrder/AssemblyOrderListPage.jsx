import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import { exportToExcel } from '../../utils/excelExport';
import * as assemblyApi from '../../api/assemblyOrderApi';
import * as warehouseApi from '../../api/warehouseApi';
import styles from './AssemblyOrderListPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Lưu tạm', code: 'secondary' },
    APPROVED: { label: 'Đã duyệt', code: 'primary' },
    SUBMITTED: { label: 'Hoàn thành', code: 'success' }
};

const TYPE_META = {
    ASSEMBLY: 'Lắp ráp',
    DISASSEMBLY: 'Tháo dỡ'
};

const DEFAULT_FILTERS = {
    keyword: '',
    orderType: '',
    status: '',
    warehouseId: '',
    fromDate: '',
    toDate: ''
};

const COLUMN_OPTIONS = [
    { id: 'orderCode', label: 'Mã lệnh' },
    { id: 'orderType', label: 'Loại lệnh' },
    { id: 'bom', label: 'Cấu hình' },
    { id: 'product', label: 'Thành phẩm' },
    { id: 'warehouse', label: 'Kho thực hiện' },
    { id: 'date', label: 'Ngày thực hiện' },
    { id: 'status', label: 'Tình trạng' }
];

const DEFAULT_COLUMNS = {
    orderCode: true,
    orderType: true,
    bom: true,
    product: true,
    warehouse: true,
    date: true,
    status: true
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '---');

function AssemblyOrderListPage() {
    const navigate = useNavigate();

    // Data states
    const [orders, setOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters and Pagination
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Toast
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('dlc_assembly_order_columns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const toggleColumn = (colId) => {
        setColumns(prev => {
            const next = { ...prev, [colId]: !prev[colId] };
            localStorage.setItem('dlc_assembly_order_columns', JSON.stringify(next));
            return next;
        });
    };

    const handleExport = () => {
        if (orders.length === 0) {
            showToast('warning', 'Không có dữ liệu để xuất Excel');
            return;
        }

        const headers = COLUMN_OPTIONS.filter(c => columns[c.id]).map(c => c.label);
        const data = orders.map(order => {
            const row = [];
            if (columns.orderCode) row.push(order.orderCode);
            if (columns.orderType) row.push(TYPE_META[order.orderType] || order.orderType);
            if (columns.bom) row.push(order.bomName || order.bomCode || '---');
            if (columns.product) row.push(order.targetName || order.targetSku || '---');
            if (columns.warehouse) row.push(warehouseName(order.warehouseId));
            if (columns.date) row.push(formatDate(order.executionDate));
            if (columns.status) row.push(STATUS_META[order.status]?.label || order.status);
            return row;
        });

        exportToExcel(headers, data, 'Danh_sach_lap_rap_thao_do');
        showToast('success', 'Xuất Excel thành công!');
    };

    const loadWarehouses = useCallback(async () => {
        try {
            const response = await warehouseApi.getWarehouses({ page: 0, size: 200 });
            setWarehouses(listFrom(unwrap(response)));
        } catch {
            setWarehouses([]);
        }
    }, []);

    const loadOrders = useCallback(async (currentFilters = filters) => {
        setLoading(true);
        try {
            const response = await assemblyApi.getAssemblyOrders({
                keyword: currentFilters.keyword || undefined,
                orderType: currentFilters.orderType || undefined,
                status: currentFilters.status || undefined,
                warehouseId: currentFilters.warehouseId || undefined,
                fromDate: currentFilters.fromDate || undefined,
                toDate: currentFilters.toDate || undefined
            });
            setOrders(listFrom(unwrap(response)));
            setPage(1); // Reset page on new load
        } catch (err) {
            setOrders([]);
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách lệnh.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadWarehouses();
        loadOrders();
    }, [loadWarehouses, loadOrders]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            loadOrders();
        }
    };

    const warehouseName = (id) => {
        const warehouse = warehouses.find((item) => String(item.id) === String(id));
        return warehouse?.name || warehouse?.warehouseName || (id ? `Kho #${id}` : 'Chưa chọn');
    };

    // Client-side pagination logic
    const totalElements = orders.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const currentOrders = orders.slice((page - 1) * pageSize, page * pageSize);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
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
                    <div>
                        <h1 className={styles.pageTitle}>Lắp ráp/Tháo dỡ</h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            Quản lý các lệnh tạo máy thành phẩm và rã linh kiện.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className={styles.btnOutline} onClick={() => navigate('/assembly-orders/create?type=DISASSEMBLY')}>
                            <i className="bi bi-box-arrow-down"></i> Tạo tháo dỡ
                        </button>
                        <button className={styles.btnPrimary} onClick={() => navigate('/assembly-orders/create?type=ASSEMBLY')}>
                            <i className="bi bi-plus"></i> Tạo lắp ráp
                        </button>
                    </div>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.searchAndPopover}>
                        <div className={styles.searchBox}>
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Mã lệnh, Cấu hình, SKU..."
                                value={filters.keyword}
                                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                            {filters.keyword && (
                                <button className={styles.clearSearchBtn} onClick={() => handleFilterChange('keyword', '')}>
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            )}
                        </div>

                        <FilterPopover
                            filters={filters}
                            onApply={(newFilters) => setFilters(newFilters)}
                            onReset={() => setFilters(DEFAULT_FILTERS)}
                            warehouses={warehouses}
                            purposeOptions={[
                                { value: 'ASSEMBLY', label: 'Lắp ráp' },
                                { value: 'DISASSEMBLY', label: 'Tháo dỡ' }
                            ]}
                            statusOptions={Object.entries(STATUS_META).map(([val, meta]) => ({ value: val, label: meta.label }))}
                            purposeLabel="Loại lệnh"
                            purposeField="orderType"
                        />
                    </div>

                    <div className={styles.filterActions}>
                        <button 
                            className={styles.iconBtn} 
                            onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); loadOrders(DEFAULT_FILTERS); }}
                            title="Tải lại"
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
                            title="Thiết lập cột hiển thị"
                        >
                            <i className="bi bi-gear"></i>
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {columns.orderCode && <th style={{ width: '160px' }}>Mã lệnh</th>}
                                {columns.orderType && <th style={{ width: '120px' }}>Loại lệnh</th>}
                                {columns.bom && <th>Cấu hình</th>}
                                {columns.product && <th>Thành phẩm</th>}
                                {columns.warehouse && <th style={{ width: '180px' }}>Kho thực hiện</th>}
                                {columns.date && <th style={{ width: '150px', textAlign: 'center' }}>Ngày thực hiện</th>}
                                {columns.status && <th style={{ width: '130px' }}>Tình trạng</th>}
                                <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && currentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={Object.values(columns).filter(Boolean).length + 1} className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : currentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={Object.values(columns).filter(Boolean).length + 1} className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`} style={{ fontSize: '32px', color: '#9ca3af', marginBottom: '12px' }}></i>
                                            <div className={styles.emptyText} style={{ color: '#6b7280', fontSize: '14px' }}>Không tìm thấy lệnh nào</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentOrders.map(item => {
                                    const status = STATUS_META[item.status] || { label: item.status || 'Chưa rõ', code: 'info' };
                                    return (
                                        <tr key={item.id} onClick={() => navigate(`/assembly-orders/${item.id}?mode=${item.status === 'DRAFT' ? 'edit' : 'view'}`)} style={{ cursor: 'pointer' }}>
                                            {columns.orderCode && <td className={styles.textBlue} style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{item.orderCode}</td>}
                                            {columns.orderType && <td>{TYPE_META[item.orderType] || item.orderType}</td>}
                                            {columns.bom && <td>{item.bomCode || item.bomName || '---'}</td>}
                                            {columns.product && <td>{item.targetName || item.targetSku || '---'}</td>}
                                            {columns.warehouse && <td>{warehouseName(item.warehouseId)}</td>}
                                            {columns.date && <td style={{ textAlign: 'center' }}>{formatDate(item.executionDate)}</td>}
                                            {columns.status && (
                                                <td>
                                                    <span className={`${styles.badge} ${styles['badge' + status.code.charAt(0).toUpperCase() + status.code.slice(1)]}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                            )}
                                            <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                                <i
                                                    className="bi bi-eye"
                                                    style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }}
                                                    title="Xem chi tiết"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/assembly-orders/${item.id}?mode=${item.status === 'DRAFT' ? 'edit' : 'view'}`); }}
                                                ></i>
                                                <i
                                                    className="bi bi-pencil"
                                                    style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }}
                                                    title="Cập nhật lệnh"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (item.status === 'SUBMITTED') {
                                                            showToast('error', 'Lệnh đã hoàn thành không được phép chỉnh sửa.');
                                                        } else {
                                                            navigate(`/assembly-orders/${item.id}?mode=edit`);
                                                        }
                                                    }}
                                                ></i>
                                            </td>
                                        </tr>
                                    );
                                })
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
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span>trên tổng số {totalElements} bản ghi</span>
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pageControls}>
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className={styles.pageBtn}
                                >
                                    <i className="bi bi-chevron-left"></i> Trước
                                </button>

                                <div className={styles.paginationNumbers}>
                                    {getPageNumbers().map((num, idx) => (
                                        num === page ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                onBlur={(e) => e.target.value = page}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        let p = parseInt(e.target.value, 10);
                                                        if (!isNaN(p)) {
                                                            p = Math.max(1, Math.min(totalPages, p));
                                                            setPage(p);
                                                            e.target.blur();
                                                        } else {
                                                            e.target.value = page;
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span
                                                key={idx}
                                                className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                                                onClick={() => num !== '...' && setPage(num)}
                                            >
                                                {num}
                                            </span>
                                        )
                                    ))}
                                </div>

                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className={styles.pageBtn}
                                >
                                    Sau <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
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
            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
}

export default AssemblyOrderListPage;
