import { useState, useEffect, useCallback } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import BrandModal from './components/BrandModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';
import styles from './BrandListPage.module.css';
import axiosClient from '../../api/axiosClient';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';


const DEFAULT_COLUMNS = {
    code: true,
    name: true,
    hotline: true,
    contactEmail: true,
    description: true,
    status: true,
};

const COLUMN_OPTIONS = [
    { id: 'code', label: 'Mã Thương Hiệu' },
    { id: 'name', label: 'Tên Thương Hiệu' },
    { id: 'hotline', label: 'Điện Thoại' },
    { id: 'contactEmail', label: 'Email' },
    { id: 'description', label: 'Mô Tả' },
    { id: 'status', label: 'Trạng Thái' },
];

const STATUS_LABELS = {
    APPROVED: { label: 'Đang hoạt động', code: 'success' },
    INACTIVE: { label: 'Ngừng hoạt động', code: 'danger' },
};

const BrandListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const guard = usePermissionGuard();
    
    const [brands, setBrands] = useState([]);
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
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, brand: null });

    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('dlc_brand_columns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const toggleColumn = (colId) => {
        setColumns(prev => {
            const next = { ...prev, [colId]: !prev[colId] };
            localStorage.setItem('dlc_brand_columns', JSON.stringify(next));
            return next;
        });
    };

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchBrands = useCallback(async ({ silent } = {}) => {
        try {
            if (!silent) setLoading(true);
            const params = {};
            if (filters.search) params.search = filters.search;
            const res = await axiosClient.get('/brands', { params });
            let data = [];
            if (res.data && res.data.data) {
                data = res.data.data;
            }
            if (filters.status) {
                data = data.filter(b => b.status === filters.status);
            }
            setBrands(data);
            if (!silent) setSelectedIds([]);
        } catch (error) {
            console.error('Lỗi tải danh sách thương hiệu:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách thương hiệu');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filters.search, filters.status]);
  useRealtimeRefresh(['BRAND'], fetchBrands);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    useEffect(() => {
        if (location.state?.toastMessage) {
            showToast(location.state.toastType || 'success', location.state.toastMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Derived data for table
    const rows = brands.map(item => {
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
        const headers = ['Mã thương hiệu', 'Tên thương hiệu', 'Điện thoại', 'Email', 'Mô tả', 'Trạng thái'];
        const data = rows.map(item => [
            item.code,
            item.name,
            item.hotline || '',
            item.contactEmail || '',
            item.description || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_thuong_hieu');
        showToast('success', 'Xuất Excel thành công!');
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? paginatedRows.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleDeleteClick = (e, brand) => {
        e.stopPropagation();
        guard('brand:delete', () => setDeleteConfirm({ isOpen: true, brand }));
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        guard('brand:edit', () => setModalConfig({ isOpen: true, data: item }));
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.brand) return;
        try {
            await axiosClient.delete(`/brands/${deleteConfirm.brand.id}`);
            showToast('success', `Đã xóa thương hiệu ${deleteConfirm.brand.name}`);
            fetchBrands();
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi xóa thương hiệu');
            if (error.response?.status === 409) {
                // Refresh list if it was a soft delete conflict
                fetchBrands();
            }
        } finally {
            setDeleteConfirm({ isOpen: false, brand: null });
        }
    };

    const tableColumns = [
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
        }
    ];

    if (columns.code) {
        tableColumns.push({
            title: 'Mã Thương Hiệu',
            dataIndex: 'code',
            width: '160px',
            render: (val, item) => (
                <a
                    href="#"
                    className={styles.link}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/brands/${item.id}`);
                    }}
                >
                    {val}
                </a>
            )
        });
    }

    if (columns.name) {
        tableColumns.push({
            title: 'Tên Thương Hiệu',
            dataIndex: 'name',
            width: '220px',
            render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>
        });
    }

    if (columns.hotline) {
        tableColumns.push({
            title: 'Điện Thoại',
            dataIndex: 'hotline',
            width: '150px',
            render: (val) => val || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>
        });
    }

    if (columns.contactEmail) {
        tableColumns.push({
            title: 'Email',
            dataIndex: 'contactEmail',
            width: '200px',
            render: (val) => val || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>
        });
    }

    if (columns.description) {
        tableColumns.push({
            title: 'Mô Tả',
            dataIndex: 'description',
            width: '180px',
            render: (val) => (
                <div className={styles.tooltipContainer} style={{ maxWidth: '180px', display: 'inline-block' }}>
                    <span className={styles.noteText}>{val || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Không có ghi chú</span>}</span>
                    {val && <span className={styles.tooltipText}>{val}</span>}
                </div>
            )
        });
    }

    if (columns.status) {
        tableColumns.push({
            title: 'Trạng Thái',
            dataIndex: 'statusLabel',
            width: '140px',
            render: (val, item) => (
                <span className={`${styles.badge} ${item.statusCode === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                    {val}
                </span>
            )
        });
    }

    const renderActions = (item) => (
        <>
            <i 
                className="bi bi-eye" 
                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                title="Xem chi tiết" 
                onClick={(e) => { e.stopPropagation(); navigate(`/brands/${item.id}`); }}
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
                title="Xóa thương hiệu" 
                onClick={(e) => handleDeleteClick(e, item)}
            ></i>
        </>
    );

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <h1 className={styles.pageTitle}>Danh sách thương hiệu</h1>
                    <button className={styles.btnPrimary} onClick={() => guard('brand:add', () => setModalConfig({ isOpen: true, data: null }))}>
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
                                placeholder="Mã hoặc tên thương hiệu..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && fetchBrands()}
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
                            onClick={() => { setFilters({ search: '', status: '' }); setTimeout(fetchBrands, 0); }}
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
                        <button
                            className={styles.iconBtn}
                            onClick={() => setShowSettingsModal(true)}
                            title="Cấu hình hiển thị cột"
                        >
                            <i className="bi bi-gear"></i>
                        </button>
                        <button className={styles.btnPrimary} onClick={fetchBrands}>
                            <i className="bi bi-funnel"></i> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <ResponsiveTable
                        columns={tableColumns}
                        data={paginatedRows}
                        loading={loading}
                        emptyMessage="Không tìm thấy thương hiệu nào"
                        onRowClick={(item) => navigate(`/brands/${item.id}`)}
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
                <BrandModal
                    initialData={modalConfig.data}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSave={async (data, isContinue = false) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;

                            const payload = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                status: data.status || 'APPROVED',
                                hotline: cleanString(data.hotline),
                                contactEmail: cleanString(data.contactEmail),
                                description: cleanString(data.description)
                            };
                            
                            if (modalConfig.data && modalConfig.data.id) {
                                await axiosClient.put(`/brands/${modalConfig.data.id}`, payload);
                                showToast('success', 'Cập nhật thương hiệu thành công!');
                                setModalConfig({ isOpen: false, data: null });
                            } else {
                                await axiosClient.post('/brands', payload);
                                showToast('success', 'Thêm mới thương hiệu thành công!');
                                if (!isContinue) {
                                    setModalConfig({ isOpen: false, data: null });
                                } else {
                                    // if isContinue, close and reopen to reset form
                                    setModalConfig({ isOpen: false, data: null });
                                    setTimeout(() => setModalConfig({ isOpen: true, data: null }), 100);
                                }
                            }
                            
                            fetchBrands();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra');
                        }
                    }}
                />
            )}

            <Modal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                ariaLabel="Thiết lập cột hiển thị"
            >
                <div className={styles.settingsModalHeader}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Thiết lập cột hiển thị</h3>
                    <button className={styles.iconBtn} style={{ border: 'none', background: 'none' }} onClick={() => setShowSettingsModal(false)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className={styles.settingsModalBody} style={{ padding: '16px' }}>
                    <div className={styles.checkboxGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {COLUMN_OPTIONS.map(col => (
                            <label key={col.id} className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="Xác nhận xóa"
                message={<span>Bạn có chắc chắn muốn xóa thương hiệu <strong>{deleteConfirm.brand?.name}</strong> {deleteConfirm.brand?.code ? `(${deleteConfirm.brand.code})` : ''} không? Hành động này không thể hoàn tác.</span>}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, brand: null })}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default BrandListPage;
