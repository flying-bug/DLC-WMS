import { useState, useEffect, useCallback } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SupplierModal from './components/SupplierModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './SupplierListPage.module.css';
import axiosClient from '../../api/axiosClient';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';


const STATUS_LABELS = {
    APPROVED: { label: 'Đang hoạt động', code: 'success' },
    INACTIVE: { label: 'Ngừng hoạt động', code: 'danger' },
};

const SupplierListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const guard = usePermissionGuard();
    
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, supplier: null });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchSuppliers = useCallback(async ({ silent } = {}) => {
        try {
            if (!silent) setLoading(true);
            const params = {};
            if (filters.search) params.search = filters.search;
            const res = await axiosClient.get('/suppliers', { params });
            let data = [];
            if (res.data && res.data.data) {
                data = res.data.data;
            }
            if (filters.status) {
                data = data.filter(s => s.status === filters.status);
            }
            setSuppliers(data);
            if (!silent) setSelectedIds([]);
        } catch (error) {
            console.error('Lỗi tải danh sách nhà cung cấp:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách nhà cung cấp');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filters.search, filters.status]);
  useRealtimeRefresh(['PARTNER'], fetchSuppliers);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    useEffect(() => {
        if (location.state?.toastMessage) {
            showToast(location.state.toastType || 'success', location.state.toastMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Derived data for table
    const rows = suppliers.map(item => {
        const status = STATUS_LABELS[item.status] || { label: item.status || 'Không rõ', code: 'info' };
        return {
            ...item,
            statusLabel: status.label,
            statusCode: status.code
        };
    });

    const totalItems = rows.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

    const handleExport = () => {
        const headers = ['Mã nhà cung cấp', 'Tên nhà cung cấp', 'Mã số thuế', 'Địa chỉ', 'Trạng thái'];
        const data = rows.map(item => [
            item.code,
            item.name,
            item.taxCode || '',
            item.address || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_nha_cung_cap');
        showToast('success', 'Xuất Excel thành công!');
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? paginatedRows.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleDeleteClick = (e, supplier) => {
        e.stopPropagation();
        guard('supplier:delete', () => setDeleteConfirm({ isOpen: true, supplier }));
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        guard('supplier:edit', () => setModalConfig({ isOpen: true, data: item }));
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.supplier) return;
        try {
            await axiosClient.delete(`/suppliers/${deleteConfirm.supplier.id}`);
            showToast('success', `Đã xóa nhà cung cấp ${deleteConfirm.supplier.name}`);
            fetchSuppliers();
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi xóa nhà cung cấp');
            if (error.response?.status === 409) {
                // Refresh list if it was a soft delete conflict
                fetchSuppliers();
            }
        } finally {
            setDeleteConfirm({ isOpen: false, supplier: null });
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
                    checked={paginatedRows.length > 0 && selectedIds.length === paginatedRows.length} 
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
            title: 'Mã NCC',
            dataIndex: 'code',
            width: '160px',
            render: (val, item) => (
                <a
                    href="#"
                    className={styles.link}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/suppliers/${item.id}`);
                    }}
                >
                    {val}
                </a>
            )
        },
        {
            title: 'Tên Nhà Cung Cấp',
            dataIndex: 'name',
            width: '220px',
            render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>
        },
        {
            title: 'Mã Số Thuế',
            dataIndex: 'taxCode',
            width: '140px',
            render: (val) => val || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>
        },
        {
            title: 'Địa Chỉ',
            dataIndex: 'address',
            width: '250px',
            render: (val) => (
                <div className={styles.tooltipContainer} style={{ maxWidth: '250px', display: 'inline-block' }}>
                    <span className={styles.noteText}>{val || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Không có địa chỉ</span>}</span>
                    {val && <span className={styles.tooltipText}>{val}</span>}
                </div>
            )
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'statusLabel',
            width: '140px',
            render: (val, item) => (
                <span className={`${styles.badge} ${item.statusCode === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                    {val}
                </span>
            )
        }
    ];

    const renderActions = (item) => (
        <>
            <i 
                className="bi bi-eye" 
                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                title="Xem chi tiết" 
                onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${item.id}`); }}
            ></i>
            <i 
                className="bi bi-pencil" 
                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                title="Chỉnh sửa" 
                onClick={(e) => handleEditClick(e, item)}
            ></i>
            <i 
                className="bi bi-trash" 
                style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }} 
                title="Xóa nhà cung cấp" 
                onClick={(e) => handleDeleteClick(e, item)}
            ></i>
        </>
    );

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <h1 className={styles.pageTitle}>Danh sách nhà cung cấp</h1>
                    <button className={styles.btnPrimary} onClick={() => guard('supplier:add', () => setModalConfig({ isOpen: true, data: null }))}>
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
                                placeholder="Mã hoặc tên nhà cung cấp..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers()}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                            <SearchableSelect
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="APPROVED">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </SearchableSelect>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setFilters({ search: '', status: '' }); setTimeout(fetchSuppliers, 0); }}
                            title="Đặt lại bộ lọc"
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
                        <button className={styles.btnPrimary} onClick={fetchSuppliers}>
                            <i className="bi bi-funnel"></i> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <ResponsiveTable
                        columns={columns}
                        data={paginatedRows}
                        loading={loading}
                        emptyMessage="Không tìm thấy nhà cung cấp nào"
                        onRowClick={(item) => navigate(`/suppliers/${item.id}`)}
                        actions={renderActions}
                    />

                    <Pagination
                        page={currentPage - 1}
                        totalPages={Math.max(1, totalPages)}
                        totalElements={totalItems}
                        size={pageSize}
                        onPageChange={(p) => setCurrentPage(p + 1)}
                        onSizeChange={(nextSize) => { setPageSize(nextSize); setCurrentPage(1); }}
                    />
                </div>
            </div>

            {modalConfig.isOpen && (
                <SupplierModal
                    initialData={modalConfig.data}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSave={async (data, isContinue = false) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;

                            const payload = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                groupType: cleanString(data.groupType) || 'RETAIL',
                                taxCode: cleanString(data.taxCode),
                                phone: cleanString(data.phone),
                                email: cleanString(data.email),
                                address: cleanString(data.address),
                                contactName: cleanString(data.contactName),
                                bankName: cleanString(data.bankName),
                                bankAccountNumber: cleanString(data.bankAccountNumber),
                                bankBeneficiaryName: cleanString(data.bankBeneficiaryName),
                                status: data.status || 'APPROVED'
                            };
                            
                            if (modalConfig.data && modalConfig.data.id) {
                                await axiosClient.put(`/suppliers/${modalConfig.data.id}`, payload);
                                showToast('success', 'Cập nhật nhà cung cấp thành công!');
                                setModalConfig({ isOpen: false, data: null });
                            } else {
                                await axiosClient.post('/suppliers', payload);
                                showToast('success', 'Thêm mới nhà cung cấp thành công!');
                                if (!isContinue) {
                                    setModalConfig({ isOpen: false, data: null });
                                } else {
                                    setModalConfig({ isOpen: false, data: null });
                                    setTimeout(() => setModalConfig({ isOpen: true, data: null }), 100);
                                }
                            }
                            
                            fetchSuppliers();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="Xác nhận xóa"
                message={<span>Bạn có chắc chắn muốn xóa nhà cung cấp <strong>{deleteConfirm.supplier?.name}</strong> {deleteConfirm.supplier?.code ? `(${deleteConfirm.supplier.code})` : ''} không? Hành động này không thể hoàn tác.</span>}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, supplier: null })}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default SupplierListPage;
