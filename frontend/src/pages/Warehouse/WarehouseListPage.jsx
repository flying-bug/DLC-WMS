import { useState, useEffect } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as warehouseApi from '../../api/warehouseApi';
import WarehouseFormModal from '../../components/warehouse/WarehouseFormModal';
import WarehouseDeleteModal from '../../components/warehouse/WarehouseDeleteModal';
import Toast from '../../components/ui/Toast/Toast';
import styles from './WarehouseListPage.module.css';
import { getVietnamTimestamp } from '../../utils/dateFormat';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';


const WarehouseListPage = () => {
    const navigate = useNavigate();
    const guard = usePermissionGuard();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Các state bộ lọc
    const [searchKeyword, setSearchKeyword] = useState('');

    // Pagination
    const [page, setPage] = useState(1); // 1-indexed for UI
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedData, setSelectedData] = useState(null);

    // Delete Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingWarehouse, setDeletingWarehouse] = useState(null);

    // Toast state
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    // State sắp xếp
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const fetchWarehouses = async (pageIndex = 1, currentSize = size, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await warehouseApi.getWarehouses({
                search: searchKeyword || undefined,
                page: pageIndex - 1, // backend is 0-indexed
                size: currentSize
            });
            const payload = res.data.data || res.data;
            // Handle both Spring Page object (has content) and normal Array
            const content = payload.content || (Array.isArray(payload) ? payload : []);
            setWarehouses(content);
            
            // Spring Boot 3 serialization uses payload.page.totalElements, older uses payload.totalElements
            const totalElements = payload.page?.totalElements ?? payload.totalElements ?? payload.totalItems ?? content.length ?? 0;
            const totalPages = Math.max(1, Math.ceil(totalElements / currentSize));
            
            setTotalPages(totalPages);
            setTotalElements(totalElements);
            setPage(pageIndex);
        } catch (error) {
            console.error("Lỗi fetch kho:", error);
            showToast('error', 'Không thể tải dữ liệu kho!');
        } finally {
            if (!silent) setLoading(false);
        }
    };
    useRealtimeRefresh(['WAREHOUSE'], ({ silent } = {}) => fetchWarehouses(page, size, silent));

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchWarehouses(page, size);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [page, size, searchKeyword]);

    const handleReload = () => {
        setSearchKeyword('');
        setSortConfig({ key: null, direction: 'asc' });
        setPage(1);
        // Will trigger useEffect because page might change, or if it doesn't we fetch directly:
        fetchWarehouses(1, size);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        // Client-side sort on current page data
        const sortedData = [...warehouses].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setWarehouses(sortedData);
    };

    const handleSaveModal = async (formData) => {
        try {
            if (isEdit) {
                await warehouseApi.updateWarehouse(selectedData.id, formData);
                showToast('success', 'Cập nhật kho thành công!');
            } else {
                await warehouseApi.createWarehouse(formData);
                showToast('success', 'Thêm mới kho thành công!');
            }
            setShowModal(false);
            fetchWarehouses(page, size);
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra!');
            throw error;
        }
    };

    const handleDelete = (e, warehouse) => {
        e.stopPropagation();
        guard('warehouse_master:delete', () => {
            setDeletingWarehouse(warehouse);
            setShowDeleteModal(true);
        });
    };

    const handleDeleteConfirm = async (id) => {
        try {
            await warehouseApi.deleteWarehouse(id);
            fetchWarehouses(page, size);
            showToast('success', 'Xóa kho thành công!');
        } catch (error) {
            console.error("Lỗi xóa kho:", error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra khi xóa!');
            fetchWarehouses(page, size);
        } finally {
            setShowDeleteModal(false);
            setDeletingWarehouse(null);
        }
    };

    const handleEdit = (e, warehouse) => {
        e.stopPropagation();
        guard('warehouse_master:edit', () => {
            setIsEdit(true);
            setSelectedData(warehouse);
            setShowModal(true);
        });
    };

    const handleRowClick = (id) => {
        navigate(`/warehouses/${id}`);
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <i className={`bi bi-arrow-down-up ${styles.sortIcon} ${styles.sortIconInactive}`}></i>;
        if (sortConfig.direction === 'asc') return <i className={`bi bi-caret-up-fill ${styles.sortIcon}`}></i>;
        return <i className={`bi bi-caret-down-fill ${styles.sortIcon}`}></i>;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE':
            case 'APPROVED':
                return (
                    <div className={`${styles.statusBadge} ${styles.statusActive}`}>
                        <span className={styles.statusDot}></span>
                        Đang hoạt động
                    </div>
                );
            case 'PAUSED':
            case 'STOPPED':
            case 'INACTIVE':
                return (
                    <div className={`${styles.statusBadge} ${styles.statusStopped}`}>
                        <span className={styles.statusDot}></span>
                        Ngừng sử dụng
                    </div>
                );
            default:
                return null;
        }
    };

    const handleExportExcel = async () => {
        try {
            const res = await warehouseApi.exportWarehouses({
                search: searchKeyword || undefined
            });
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const timestamp = getVietnamTimestamp();
            
            link.setAttribute('download', `DLC_WMS_Danh_Sach_Kho_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            showToast('success', 'Xuất Excel thành công!');
        } catch (error) {
            console.error("Lỗi xuất Excel:", error);
            showToast('error', 'Có lỗi xảy ra khi xuất Excel!');
        }
    };

    const columns = [
        {
            title: 'MÃ KHO',
            dataIndex: 'code',
            width: '15%',
            render: (val) => <span className={styles.codeCell}>{val}</span>
        },
        {
            title: 'TÊN KHO',
            dataIndex: 'name',
            width: '25%',
            render: (val) => <span className={styles.nameCell}>{val}</span>
        },
        {
            title: 'ĐỊA CHỈ',
            dataIndex: 'address',
            width: '30%'
        },
        {
            title: 'TRẠNG THÁI',
            dataIndex: 'status',
            width: '15%',
            render: (val) => getStatusBadge(val)
        }
    ];

    const renderActions = (item) => (
        <div className={styles.rowActions} style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <i 
                className="bi bi-eye"
                title="Xem chi tiết"
                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px' }}
                onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(item.id);
                }}
            ></i>
            <i 
                className="bi bi-pencil" 
                title="Chỉnh sửa"
                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }}
                onClick={(e) => handleEdit(e, item)}
            ></i>
            <i 
                className="bi bi-trash"
                title="Xóa"
                style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }}
                onClick={(e) => handleDelete(e, item)}
            ></i>
        </div>
    );

    return (
        <AdminLayout activeTab="warehouses">
            <div className={styles.container}>
                {/* Header Page */}
                <div className={styles.pageHeader}>
                    <div className={styles.titleWrapper}>
                        <h2 className={styles.pageTitle}>Quản lý kho</h2>
                        <p className={styles.pageSubtitle}>Danh sách và cấu hình các kho hàng thuộc hệ thống</p>
                    </div>
                    <div className={styles.actionButtons}>
                        <button className={styles.btnPrimary} type="button" onClick={() => {
                            guard('warehouse_master:add', () => {
                                setIsEdit(false);
                                setSelectedData(null);
                                setShowModal(true);
                            });
                        }}>
                            <i className="bi bi-plus"></i> Thêm mới
                        </button>
                    </div>
                </div>

                {/* Filter Section */}
                <div className={styles.filterSection}>
                    <div className={styles.searchBox}>
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Nhập từ khóa tìm kiếm mã kho, tên kho, địa chỉ..."
                            value={searchKeyword}
                            onChange={(e) => {
                                setSearchKeyword(e.target.value);
                                setPage(1);
                            }}
                        />
                        {searchKeyword && (
                            <button className={styles.clearSearchBtn} onClick={() => {
                                setSearchKeyword('');
                                setPage(1);
                            }}>
                                <i className="bi bi-x-circle-fill"></i>
                            </button>
                        )}
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.iconBtn} onClick={handleReload} type="button" title="Làm mới">
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button className={styles.iconBtn} onClick={handleExportExcel} type="button" title="Xuất Excel">
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.tableContainer}>
                    <ResponsiveTable
                        columns={columns}
                        data={warehouses}
                        loading={loading}
                        emptyMessage="Không có dữ liệu kho."
                        onRowClick={(item) => handleRowClick(item.id)}
                        actions={renderActions}
                    />
                </div>

                {/* Pagination */}
                {!loading && totalElements > 0 && (
                    <Pagination
                        page={page - 1}
                        totalPages={Math.max(1, totalPages)}
                        totalElements={totalElements}
                        size={size}
                        onPageChange={(p) => setPage(p + 1)}
                        onSizeChange={(nextSize) => { setSize(nextSize); setPage(1); }}
                        sizeOptions={[10, 20, 50]}
                    />
                )}
            </div>

            {/* Modals */}
            {showModal && (
                <WarehouseFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaveModal}
                    isEdit={isEdit}
                    initialData={selectedData}
                />
            )}

            {showDeleteModal && (
                <WarehouseDeleteModal
                    isOpen={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setDeletingWarehouse(null);
                    }}
                    onConfirm={() => handleDeleteConfirm(deletingWarehouse.id)}
                    warehouseName={deletingWarehouse?.name}
                    warehouseCode={deletingWarehouse?.code}
                />
            )}

            {toast.isVisible && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, isVisible: false })}
                />
            )}
        </AdminLayout>
    );
};

export default WarehouseListPage;
