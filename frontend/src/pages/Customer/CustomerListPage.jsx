import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CustomerModal from './components/CustomerModal';
import CustomerImportModal from './components/CustomerImportModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { searchCustomers, deactivateCustomer, activateCustomer, exportCustomersToExcel } from '../../api/customerApi';
import styles from './CustomerListPage.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';


const STATUS_LABELS = {
    APPROVED: { label: 'Đang hoạt động', code: 'success' },
    INACTIVE: { label: 'Ngừng hoạt động', code: 'danger' },
};

const GROUP_LABELS = {
    RETAIL: 'Khách lẻ',
    WHOLESALE: 'Khách thợ',
    DISTRIBUTOR: 'Đại lý'
};

const CustomerListPage = () => {
    const navigate = useNavigate();
    const guard = usePermissionGuard();
    
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState({ search: '', status: '', groupType: '' });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, action: '' });

    const debounceRef = useRef(null);

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchCustomers = useCallback(async (currentFilters = filters, currentPage = page, currentSize = pageSize, silent = false) => {
        try {
            if (!silent) setLoading(true);
            // API expects 0-indexed page
            const apiPage = Math.max(0, currentPage - 1);
            const response = await searchCustomers(
                currentFilters.search, 
                currentFilters.status, 
                currentFilters.groupType, 
                apiPage, 
                currentSize
            );
            const payload = response.data?.data ?? response.data;
            if (payload) {
                setCustomers(payload.content || []);
                const total = payload.totalElements ?? payload.content?.length ?? 0;
                setTotalPages(Math.max(1, Math.ceil(total / currentSize)));
                setTotalElements(total);
            }
            if (!silent) setSelectedIds([]);
        } catch (error) {
            console.error('Lỗi tải danh sách khách hàng:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách khách hàng');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filters, page, pageSize]);
    useRealtimeRefresh(['PARTNER'], ({ silent } = {}) => fetchCustomers(undefined, undefined, undefined, silent));

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setFilters(prev => ({ ...prev, search: value }));
        setPage(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            await exportCustomersToExcel(
                { keyword: filters.search, status: filters.status, groupType: filters.groupType }, 
                selectedIds
            );
            showToast('success', 'Đã xuất Excel thành công.');
        } catch (err) {
            showToast('error', 'Có lỗi xảy ra khi xuất Excel.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? customers.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleToggleStatus = (e, customer) => {
        e.stopPropagation();
        if (!guard('customer:edit')) return;
        const action = customer.status === 'APPROVED' ? 'vô hiệu hóa' : 'kích hoạt';
        setConfirmModal({ isOpen: true, customer, action });
    };

    const executeToggleStatus = async () => {
        if (!confirmModal.customer) return;
        try {
            if (confirmModal.customer.status === 'APPROVED') {
                await deactivateCustomer(confirmModal.customer.id);
                showToast('success', `Đã vô hiệu hóa khách hàng "${confirmModal.customer.name}".`);
            } else {
                await activateCustomer(confirmModal.customer.id);
                showToast('success', `Đã kích hoạt lại khách hàng "${confirmModal.customer.name}".`);
            }
            fetchCustomers();
        } catch (error) {
            const msg = error.response?.data?.userMessage || 'Có lỗi xảy ra. Vui lòng thử lại.';
            showToast('error', msg);
        } finally {
            setConfirmModal({ isOpen: false, customer: null, action: '' });
        }
    };

    const columns = [
        {
            key: 'checkbox',
            dataIndex: 'id',
            title: (
                <input 
                    type="checkbox" 
                    className={styles.checkbox} 
                    checked={customers.length > 0 && selectedIds.length === customers.length} 
                    onChange={handleSelectAll} 
                />
            ),
            width: '40px',
            align: 'center',
            render: (_, item) => (
                <input 
                    type="checkbox" 
                    className={styles.checkbox} 
                    checked={selectedIds.includes(item.id)} 
                    onChange={(e) => handleSelectRow(e, item.id)} 
                    onClick={(e) => e.stopPropagation()} 
                />
            )
        },
        {
            title: 'Mã Khách Hàng',
            dataIndex: 'code',
            width: '150px',
            render: (val) => <span className={styles.textBlue} style={{ whiteSpace: 'nowrap' }}>{val}</span>
        },
        {
            title: 'Tên Khách Hàng',
            dataIndex: 'name',
            width: '200px',
            render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>
        },
        {
            title: 'Nhóm',
            dataIndex: 'groupType',
            width: '130px',
            render: (val) => GROUP_LABELS[val] || val
        },
        {
            title: 'Điện Thoại',
            dataIndex: 'phone',
            width: '130px',
            render: (val) => val || '---'
        },
        {
            title: 'Địa Chỉ',
            dataIndex: 'address',
            width: '200px',
            render: (val) => (
                <div className={styles.tooltipContainer} style={{ display: 'inline-block', maxWidth: '100%' }}>
                    <span className={styles.noteText}>{val || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Không có</span>}</span>
                    {val && <span className={styles.tooltipText}>{val}</span>}
                </div>
            )
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            width: '140px',
            render: (val) => {
                const status = STATUS_LABELS[val] || { label: val || 'Không rõ', code: 'info' };
                return (
                    <span className={`${styles.badge} ${status.code === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                        {status.label}
                    </span>
                );
            }
        }
    ];

    const renderActions = (item) => (
        <>
            <i 
                className="bi bi-eye" 
                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                title="Xem chi tiết" 
                onClick={(e) => { e.stopPropagation(); navigate(`/customers/${item.id}`); }}
            ></i>
            <i 
                className="bi bi-pencil" 
                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                title="Chỉnh sửa" 
                onClick={(e) => { e.stopPropagation(); guard('customer:edit', () => setModalConfig({ isOpen: true, data: item })); }}
            ></i>
            {item.status === 'APPROVED' ? (
                <i 
                    className="bi bi-slash-circle" 
                    style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }} 
                    title="Vô hiệu hóa" 
                    onClick={(e) => handleToggleStatus(e, item)}
                ></i>
            ) : (
                <i 
                    className="bi bi-check2-circle" 
                    style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} 
                    title="Kích hoạt lại" 
                    onClick={(e) => handleToggleStatus(e, item)}
                ></i>
            )}
        </>
    );

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <h1 className={styles.pageTitle}>Danh sách khách hàng</h1>
                    <button className={styles.btnPrimary} onClick={() => guard('customer:add', () => setModalConfig({ isOpen: true, data: null }))}>
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
                                placeholder="Tên, mã, SĐT khách hàng..."
                                value={filters.search}
                                onChange={handleSearchChange}
                                onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                            <SearchableSelect
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                <option value="APPROVED">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </SearchableSelect>
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>NHÓM KHÁCH</span>
                            <SearchableSelect
                                className={styles.filterSelect}
                                value={filters.groupType}
                                onChange={(e) => handleFilterChange('groupType', e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                <option value="RETAIL">Khách lẻ</option>
                                <option value="WHOLESALE">Khách thợ</option>
                                <option value="DISTRIBUTOR">Đại lý</option>
                            </SearchableSelect>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setFilters({ search: '', status: '', groupType: '' }); setPage(1); }}
                            title="Đặt lại bộ lọc"
                        >
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setIsImportModalOpen(true)}
                            title="Nhập Excel"
                        >
                            <i className="bi bi-file-earmark-arrow-up"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={handleExport}
                            title="Xuất tệp Excel"
                        >
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                        <button className={styles.btnPrimary} onClick={() => fetchCustomers()}>
                            <i className="bi bi-funnel"></i> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className={styles.bulkActionsToolbar}>
                        <div className={styles.bulkText}>Đã chọn {selectedIds.length} khách hàng</div>
                    </div>
                )}

                <div className={styles.tableContainer}>
                    <ResponsiveTable
                        columns={columns}
                        data={customers}
                        loading={loading}
                        emptyMessage="Không tìm thấy khách hàng nào"
                        onRowClick={(item) => navigate(`/customers/${item.id}`)}
                        actions={renderActions}
                    />

                    <Pagination
                        page={page - 1}
                        totalPages={Math.max(1, totalPages)}
                        totalElements={totalElements}
                        size={pageSize}
                        onPageChange={(p) => setPage(p + 1)}
                        onSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
                    />
                </div>
            </div>

            <CustomerModal
                isOpen={modalConfig.isOpen}
                editData={modalConfig.data}
                onClose={() => setModalConfig({ isOpen: false, data: null })}
                onSaved={(isEdit, isContinue) => {
                    showToast('success', isEdit ? 'Cập nhật khách hàng thành công!' : 'Thêm mới khách hàng thành công!');
                    fetchCustomers();
                    if (!isContinue) setModalConfig({ isOpen: false, data: null });
                }}
            />

            <CustomerImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => fetchCustomers()}
                showToast={(type, title, msg) => showToast(type, msg || title)}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={`Xác nhận ${confirmModal.action}`}
                message={<span>Bạn có chắc chắn muốn {confirmModal.action} khách hàng <strong>{confirmModal.customer?.name}</strong> {confirmModal.customer?.code ? `(${confirmModal.customer.code})` : ''} không?</span>}
                onConfirm={executeToggleStatus}
                onCancel={() => setConfirmModal({ isOpen: false, customer: null, action: '' })}
                confirmText="Đồng ý"
                cancelText="Hủy"
                confirmButtonClass={confirmModal.action === 'vô hiệu hóa' ? 'btn-misa-danger' : 'btn-misa-primary'}
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default CustomerListPage;
