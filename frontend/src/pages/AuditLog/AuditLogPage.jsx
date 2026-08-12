import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { exportToExcel } from '../../utils/excelExport';
import Pagination from '../../components/ui/Pagination/Pagination';
import Modal from '../../components/ui/Modal/Modal';
import { useToast } from '../../contexts/ToastContext';
import styles from './AuditLogPage.module.css';
import { formatDateTime as formatVietnamDateTime } from '../../utils/dateFormat';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const formatDateTime = (isoString) => isoString ? formatVietnamDateTime(isoString, { withSeconds: false }) : '';

const parseDateInput = (value, endOfDay = false) => {
    if (!value || !value.trim()) return null;

    const text = value.trim();
    const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!isoDate) return null;

    const [, year, month, day] = isoDate;
    const calendarDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (
        calendarDate.getFullYear() !== Number(year) ||
        calendarDate.getMonth() !== Number(month) - 1 ||
        calendarDate.getDate() !== Number(day)
    ) {
        return null;
    }

    const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
    const date = new Date(`${year}-${month}-${day}T${time}+07:00`);
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

const MODULE_LABELS = {
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
    Supplier: 'Nhà cung cấp',
    Customer: 'Khách hàng',
    Category: 'Danh mục',
    Brand: 'Thương hiệu'
};

const getModuleLabel = (module) => {
    return MODULE_LABELS[module] || module || 'Hệ thống';
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
    const [size, setSize] = useState(10);
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
            if ((fromDateInput.trim() && !fromDate) || (toDateInput.trim() && !toDate)) {
                showToast('warning', 'Ngày lọc không hợp lệ. Vui lòng chọn ngày từ lịch.');
                return;
            }
            if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
                showToast('warning', 'Ngày bắt đầu không được lớn hơn ngày kết thúc.');
                return;
            }
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
    }, [page, size, debouncedSearch, selectedModule, fromDateInput, toDateInput, showToast]);

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
        <SuperAdminLayout>
            <div className={styles.main}>
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
                                aria-label="Tìm kiếm nhật ký hệ thống"
                            />
                            {searchTerm && (
                                <button type="button" className={styles.clearSearchBtn} onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setPage(0); }} aria-label="Xóa nội dung tìm kiếm">
                                    <i className="bi bi-x-circle-fill" aria-hidden="true"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.filterSelectGroup}>
                        <div className={styles.dateFilterField}>
                            <label htmlFor="audit-from-date">Từ:</label>
                            <input
                                id="audit-from-date"
                                type="date"
                                className={styles.filterSelect}
                                value={fromDateInput}
                                onChange={(e) => { setFromDateInput(e.target.value); setPage(0); }}
                            />
                        </div>
                        <div className={styles.dateFilterField}>
                            <label htmlFor="audit-to-date">Đến:</label>
                            <input
                                id="audit-to-date"
                                type="date"
                                className={styles.filterSelect}
                                value={toDateInput}
                                onChange={(e) => { setToDateInput(e.target.value); setPage(0); }}
                            />
                        </div>
                        <SearchableSelect
                            className={styles.filterSelect}
                            value={selectedModule}
                            onChange={(e) => { setSelectedModule(e.target.value); setPage(0); }}
                            aria-label="Lọc theo phân hệ"
                        >
                            <option value="">Tất cả phân hệ</option>
                            {Object.entries(MODULE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </SearchableSelect>
                    </div>

                    <div className={styles.filterActions}>
                        <button type="button" className={styles.iconBtn} onClick={() => {
                            setSearchTerm(''); setDebouncedSearch(''); setFromDateInput(''); setToDateInput(''); setSelectedModule(''); setPage(0);
                        }} title="Làm mới" aria-label="Làm mới bộ lọc">
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button type="button" className={styles.iconBtn} onClick={handleExport} title="Xuất Excel" aria-label="Xuất nhật ký ra Excel">
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
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
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                                        <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '8px' }}></i>
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '50px 0' }}>
                                        <div className={styles.detailEmpty}>
                                            Không tìm thấy nhật ký nào
                                        </div>
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
                                                type="button"
                                                className={styles.btnView}
                                                onClick={() => handleViewDetail(log.id)}
                                                title="Xem chi tiết"
                                                aria-label={`Xem chi tiết nhật ký ${log.id}`}
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalElements={totalElements}
                        size={size}
                        onPageChange={handlePageChange}
                        onSizeChange={(s) => { setSize(s); setPage(0); }}
                    />
            </div>

            {(selectedLog || detailLoading || detailError) && (
                <Modal
                    isOpen
                    onClose={closeDetail}
                    ariaLabelledBy="audit-detail-title"
                    dialogClassName={styles.detailModal}
                >
                        <div className={styles.detailHeader}>
                            <div>
                                <h2 id="audit-detail-title">Chi tiết nhật ký thao tác</h2>
                                <p>{selectedLog?.description || 'Đang tải chi tiết nhật ký'}</p>
                            </div>
                            <button type="button" className={styles.closeBtn} onClick={closeDetail} aria-label="Đóng chi tiết nhật ký">
                                <i className="fas fa-times" aria-hidden="true"></i>
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className={styles.detailEmpty}>Đang tải dữ liệu...</div>
                        ) : detailError ? (
                            <div className={styles.detailEmpty}>{detailError}</div>
                        ) : (
                            <div className={styles.detailBody}>
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
                                        <div className={styles.diffTableWrap}><table className={styles.diffTable}>
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
                                        </table></div>
                                    ) : fallbackFields.length > 0 ? (
                                        <div className={styles.diffTableWrap}><table className={styles.diffTable}>
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
                                        </table></div>
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
                </Modal>
            )}
        </SuperAdminLayout>
    );
}

export default AuditLogPage;
