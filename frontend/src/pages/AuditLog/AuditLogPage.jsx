import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import { exportToExcel } from '../../utils/excelExport';
import Pagination from '../../components/ui/Pagination/Pagination';
import { useToast } from '../../contexts/ToastContext';
import styles from './AuditLogPage.module.css';

const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return isoString;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    } catch {
        return isoString;
    }
};

const parseDateInput = (value, endOfDay = false) => {
    if (!value || !value.trim()) return null;

    const parts = value.trim().split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
    );

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getActionBadgeClass = (action) => {
    if (!action) return styles.badgeLogin;
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('thêm') || lowerAction.includes('tạo') || lowerAction.includes('add') || lowerAction.includes('create')) return styles.badgeAdd;
    if (lowerAction.includes('sửa') || lowerAction.includes('cập nhật') || lowerAction.includes('edit') || lowerAction.includes('update')) return styles.badgeEdit;
    if (lowerAction.includes('xóa') || lowerAction.includes('hủy') || lowerAction.includes('delete') || lowerAction.includes('remove')) return styles.badgeDelete;
    return styles.badgeLogin;
};

const getModuleLabel = (module) => {
    const moduleLabels = {
        Account: 'Tài khoản',
        Auth: 'Xác thực',
        Product: 'Sản phẩm',
        Unit: 'Đơn vị tính',
        Permission: 'Phân quyền',
        ExportSlip: 'Phiếu xuất kho',
        ImportSlip: 'Phiếu nhập kho',
        InventoryDocument: 'Chứng từ kho',
        User: 'Người dùng',
        Role: 'Vai trò',
        Warehouse: 'Kho hàng',
    };

    return moduleLabels[module] || module || 'Hệ thống';
};

const fieldLabels = {
    id: 'ID',
    username: 'Tên đăng nhập',
    fullName: 'Họ tên',
    email: 'Email',
    phone: 'Số điện thoại',
    status: 'Trạng thái',
    roles: 'Vai trò',
    permissions: 'Quyền',
    name: 'Tên',
    description: 'Mô tả',
    productCode: 'Mã sản phẩm',
    productName: 'Tên sản phẩm',
    productType: 'Loại sản phẩm',
    brandId: 'ID thương hiệu',
    brandName: 'Thương hiệu',
    categoryId: 'ID danh mục',
    categoryName: 'Danh mục',
    unitId: 'ID đơn vị',
    unitName: 'Đơn vị tính',
    trackSerial: 'Theo dõi serial',
    trackLot: 'Theo dõi lô',
    isAssembly: 'Lắp ráp',
    active: 'Hoạt động',
    taxReductionStatus: 'Giảm thuế',
    stockQty: 'Tồn kho',
    stockValue: 'Giá trị tồn',
    imageUrl: 'Ảnh',
};

const getFieldLabel = (field) => fieldLabels[field] || field;

const formatDetailValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

function AuditLogPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [fromDateInput, setFromDateInput] = useState('');
    const [toDateInput, setToDateInput] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const fromDate = parseDateInput(fromDateInput);
            const toDate = parseDateInput(toDateInput, true);
            const params = new URLSearchParams({
                page: String(page),
                size: String(size),
            });

            if (debouncedSearch.trim()) params.set('searchTerm', debouncedSearch.trim());
            if (selectedModule) params.set('module', selectedModule);
            if (fromDate) params.set('fromDate', fromDate);
            if (toDate) params.set('toDate', toDate);

            const res = await axiosClient.get(`/audit-logs?${params.toString()}`);
            if (res.data && res.data.success) {
                const { logs: fetchedLogs, totalItems, totalPages: fetchedTotalPages } = res.data.data;
                setLogs(fetchedLogs || []);
                setTotalElements(totalItems || 0);
                setTotalPages(fetchedTotalPages || 0);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [page, size, debouncedSearch, selectedModule, fromDateInput, toDateInput]);

    useEffect(() => {

        fetchLogs();
    }, [fetchLogs]);

    const handleExport = () => {
        if (!logs || logs.length === 0) {
            showToast('warning', 'Không có dữ liệu để xuất.');
            return;
        }
        const headers = ['Thời gian', 'Người dùng', 'Thao tác', 'Phân hệ', 'Địa chỉ IP'];
        const data = logs.map(log => [
            formatDateTime(log.timestamp),
            log.user,
            log.action,
            getModuleLabel(log.module),
            log.ipAddress || ''
        ]);
        exportToExcel(headers, data, 'Nhat_ky_he_thong');
        showToast('success', 'Xuất Excel thành công.');
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setPage(newPage);
        }
    };

    const handleViewDetail = async (logId) => {
        try {
            setDetailLoading(true);
            setDetailError('');
            const res = await axiosClient.get(`/audit-logs/${logId}`);
            if (res.data && res.data.success) {
                setSelectedLog(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching audit log detail:', error);
            setDetailError('Không tải được chi tiết nhật ký.');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedLog(null);
        setDetailError('');
    };

    const detailChanges = selectedLog?.detail?.changes || [];
    const detailBefore = selectedLog?.detail?.before || {};
    const detailAfter = selectedLog?.detail?.after || {};
    const fallbackFields = Array.from(new Set([...Object.keys(detailBefore), ...Object.keys(detailAfter)]));

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px', marginRight: '32px' }} onClick={() => navigate('/dashboard')}>
                        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img src="/dl-logo.png" alt="Duy Long Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className={styles.brandName} style={{ margin: 0 }}>Duy Long Computer</div>
                    </div>
                    <nav className={styles.navLinks}>
                        <a onClick={() => navigate('/users')} className={styles.navLink}>Quản lý người dùng</a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLinkActive}>Nhật ký hệ thống</a>
                        <a onClick={() => navigate('/operations')} className={styles.navLink}>Trung tâm điều hành</a>
                    </nav>
                </div>
                <div className={styles.headerRight}>

                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Nhật ký hệ thống</h1>
                        <p className={styles.pageSubtitle}>Theo dõi và truy xuất các hoạt động của người dùng trên toàn hệ thống.</p>
                    </div>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.searchAndPopover}>
                        <div className={styles.searchBox}>
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Tìm tên, nội dung hoặc ID..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); }}
                            />
                            {searchTerm && (
                                <button className={styles.clearSearchBtn} onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setPage(0); }}>
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.filterSelectGroup}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Từ:</span>
                            <input
                                type="date"
                                className={styles.filterSelect}
                                value={fromDateInput}
                                onChange={(e) => { setFromDateInput(e.target.value); setPage(0); }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Đến:</span>
                            <input
                                type="date"
                                className={styles.filterSelect}
                                value={toDateInput}
                                onChange={(e) => { setToDateInput(e.target.value); setPage(0); }}
                            />
                        </div>
                        <select
                            className={styles.filterSelect}
                            value={selectedModule}
                            onChange={(e) => { setSelectedModule(e.target.value); setPage(0); }}
                        >
                            <option value="">Tất cả phân hệ</option>
                            <option value="Auth">Xác thực</option>
                            <option value="Account">Tài khoản</option>
                            <option value="Permission">Phân quyền</option>
                            <option value="Product">Sản phẩm</option>
                            <option value="Unit">Đơn vị tính</option>
                            <option value="ExportSlip">Phiếu xuất kho</option>
                        </select>
                    </div>

                    <div className={styles.filterActions}>
                        <button className={styles.iconBtn} onClick={() => {
                            setSearchTerm(''); setDebouncedSearch(''); setFromDateInput(''); setToDateInput(''); setSelectedModule(''); setPage(0);
                        }} title="Làm mới">
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button className={styles.iconBtn} onClick={handleExport} title="Xuất Excel">
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>THỜI GIAN</th>
                                <th>NGƯỜI DÙNG</th>
                                <th>THAO TÁC</th>
                                <th>PHÂN HỆ</th>
                                <th>ĐỊA CHỈ IP</th>
                                <th>CHI TIẾT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Đang tải dữ liệu...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-subtle)' }}>
                                        Không tìm thấy nhật ký nào.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={styles.tableRow}>
                                        <td className={styles.timeCol}>{formatDateTime(log.timestamp)}</td>
                                        <td className={styles.userCol}>
                                            <div className={styles.userInfo}>
                                                <strong>{log.user}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.actionBadge} ${getActionBadgeClass(log.action)}`}>
                                                {log.action?.toUpperCase() || 'HỆ THỐNG'}
                                            </span>
                                        </td>
                                        <td>{getModuleLabel(log.module)}</td>
                                        <td className={styles.ipCol}>{log.ip || 'N/A'}</td>
                                        <td className={styles.actionCell}>
                                            <button
                                                className={styles.btnView}
                                                onClick={() => handleViewDetail(log.id)}
                                                title="Xem chi tiết"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalElements={totalElements}
                        size={size}
                        onPageChange={handlePageChange}
                        onSizeChange={(s) => { setSize(s); setPage(0); }}
                    />
                </div>
            </main>

            {(selectedLog || detailLoading || detailError) && (
                <div className="misa-modal-overlay" onClick={closeDetail}>
                    <div className="misa-modal" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw', height: '80vh' }}>
                        <div className="misa-modal-header">
                            <div>
                                <h2>Chi tiết nhật ký thao tác</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-light, #64748b)' }}>{selectedLog?.description || 'Đang tải chi tiết nhật ký'}</p>
                            </div>
                            <i className="fas fa-times" onClick={closeDetail} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                        </div>

                        {detailLoading ? (
                            <div className={styles.detailEmpty}>Đang tải dữ liệu...</div>
                        ) : detailError ? (
                            <div className={styles.detailEmpty}>{detailError}</div>
                        ) : (
                            <div className="misa-modal-body">
                                <section className={styles.detailPanel}>
                                    <h3>Thông tin chung</h3>
                                    <dl className={styles.infoList}>
                                        <dt>Thời gian</dt>
                                        <dd>{formatDateTime(selectedLog.timestamp)}</dd>
                                        <dt>Người thực hiện</dt>
                                        <dd>{selectedLog.user}</dd>
                                        <dt>Phân hệ</dt>
                                        <dd>{getModuleLabel(selectedLog.module)}</dd>
                                        <dt>Thao tác</dt>
                                        <dd>{selectedLog.actionType || selectedLog.action}</dd>
                                        <dt>Trạng thái</dt>
                                        <dd>{selectedLog.status}</dd>
                                        <dt>Địa chỉ IP</dt>
                                        <dd>{selectedLog.ip || 'N/A'}</dd>
                                    </dl>
                                </section>

                                <section className={styles.comparePanel}>
                                    <div className={styles.compareTitle}>
                                        <h3>So sánh dữ liệu thay đổi</h3>
                                        <span>{selectedLog.detail?.changeCount || detailChanges.length || 0} thay đổi</span>
                                    </div>

                                    {detailChanges.length > 0 ? (
                                        <table className={styles.diffTable}>
                                            <thead>
                                                <tr>
                                                    <th>Trường</th>
                                                    <th>Trước khi thay đổi</th>
                                                    <th>Sau khi thay đổi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailChanges.map((change) => (
                                                    <tr key={change.field}>
                                                        <td>{getFieldLabel(change.field)}</td>
                                                        <td>{formatDetailValue(change.before)}</td>
                                                        <td>{formatDetailValue(change.after)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : fallbackFields.length > 0 ? (
                                        <table className={styles.diffTable}>
                                            <thead>
                                                <tr>
                                                    <th>Trường</th>
                                                    <th>Trước khi thay đổi</th>
                                                    <th>Sau khi thay đổi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fallbackFields.map((field) => (
                                                    <tr key={field}>
                                                        <td>{getFieldLabel(field)}</td>
                                                        <td>{formatDetailValue(detailBefore[field])}</td>
                                                        <td>{formatDetailValue(detailAfter[field])}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className={styles.detailEmpty}>Nhật ký này chưa có dữ liệu trước/sau.</div>
                                    )}

                                    {selectedLog.detail?.note && (
                                        <div className={styles.noteBox}>
                                            <strong>Ghi chú hệ thống</strong>
                                            <span>{selectedLog.detail.note}</span>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuditLogPage;
