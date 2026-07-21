import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as warehouseApi from '../../api/warehouseApi';
import WarehouseFormModal from '../../components/warehouse/WarehouseFormModal';
import WarehouseDeleteModal from '../../components/warehouse/WarehouseDeleteModal';
import Toast from '../../components/ui/Toast/Toast';
import styles from './WarehouseListPage.module.css';

const WarehouseListPage = () => {
    const navigate = useNavigate();
    const [warehouses, setWarehouses] = useState([]);
    
    // Các state bộ lọc
    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchAddress, setSearchAddress] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
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

    const fetchWarehouses = async () => {
        try {
            const res = await warehouseApi.getWarehouses({
                code: searchCode || undefined,
                name: searchName || undefined,
                address: searchAddress || undefined,
                status: filterStatus || undefined,
                page: page,
                size: size
            });
            setWarehouses(res.data.data.content || []);
            setTotalPages(res.data.data.totalPages || 0);
            setTotalElements(res.data.data.totalElements || 0);
        } catch (error) {
            console.error("Lỗi fetch kho:", error);
            showToast('error', 'Không thể tải dữ liệu kho!');
        }
    };

    useEffect(() => {
         
        fetchWarehouses();
         
    }, [page, size]); 

    const handleFilter = () => {
        setPage(0);
        fetchWarehouses();
    };

    const handleReload = () => {
        setSearchCode('');
        setSearchName('');
        setSearchAddress('');
        setFilterStatus('');
        setSortConfig({ key: null, direction: 'asc' });
        setPage(0);
        warehouseApi.getWarehouses({ page: 0, size: size }).then(res => {
            setWarehouses(res.data.data.content || []);
            setTotalPages(res.data.data.totalPages || 0);
            setTotalElements(res.data.data.totalElements || 0);
        }).catch(err => {
            console.error(err);
        });
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
            fetchWarehouses();
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra!');
            throw error; // Re-throw để WarehouseFormModal không tự động clear form nếu lỗi
        }
    };

    const handleDelete = (warehouse) => {
        setDeletingWarehouse(warehouse);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async (id) => {
        try {
            await warehouseApi.deleteWarehouse(id);
            fetchWarehouses();
            showToast('success', 'Xóa kho thành công!');
        } catch (error) {
            console.error("Lỗi xóa kho:", error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra khi xóa!');
            fetchWarehouses();
        } finally {
            setShowDeleteModal(false);
            setDeletingWarehouse(null);
        }
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <i className={`fas fa-sort ${styles.sortIcon} ${styles.sortIconInactive}`}></i>;
        if (sortConfig.direction === 'asc') return <i className={`fas fa-sort-up ${styles.sortIcon}`}></i>;
        return <i className={`fas fa-sort-down ${styles.sortIcon}`}></i>;
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
                return (
                    <div className={`${styles.statusBadge} ${styles.statusPaused}`}>
                        <span className={styles.statusDot}></span>
                        Tạm ngưng
                    </div>
                );
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
                code: searchCode || undefined,
                name: searchName || undefined,
                address: searchAddress || undefined,
                status: filterStatus || undefined
            });
            
            // Create Blob URL and download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');
            
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

    return (
        <AdminLayout activeTab="warehouses">
            <div className={styles.container}>
                {/* Header Page */}
                <div className={styles.pageHeader}>
                    <div className={styles.titleWrapper}>
                        <h2 className={styles.pageTitle}>Quản lý kho</h2>
                        <p className={styles.pageSubtitle}>Danh sách và cấu hình các kho hàng thuộc hệ thống Duy Long Computer</p>
                    </div>
                    <div className={styles.actionButtons}>
                        <button className={styles.btnAdd} type="button" onClick={() => {
                            setIsEdit(false);
                            setSelectedData(null);
                            setShowModal(true);
                        }}>
                            <i className="fas fa-plus"></i> Thêm kho
                        </button>
                        <button className={styles.btnExport} type="button" onClick={handleExportExcel}>
                            <i className="fas fa-file-excel"></i> Xuất Excel
                        </button>
                    </div>
                </div>

                {/* Filter Card */}
                <div className={styles.filterCard}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <label>Tìm theo mã kho</label>
                            <input 
                                type="text" 
                                placeholder="Ví dụ: K01, MK01..." 
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Tìm theo tên kho</label>
                            <input 
                                type="text" 
                                placeholder="Nhập tên kho hàng" 
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Địa chỉ</label>
                            <input 
                                type="text" 
                                placeholder="Nhập địa chỉ" 
                                value={searchAddress}
                                onChange={(e) => setSearchAddress(e.target.value)}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Trạng thái</label>
                            <div className={styles.selectWrapper}>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">Tất cả</option>
                                    <option value="APPROVED">Đang hoạt động</option>
                                    <option value="INACTIVE">Ngừng sử dụng</option>
                                </select>
                                <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                            </div>
                        </div>
                        <div className={styles.filterAction}>
                            <button className={styles.btnFilter} onClick={handleFilter} type="button">
                                <i className="fas fa-filter"></i> Lọc dữ liệu
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className={styles.tableCard}>
                    <div className={styles.tableResponsive}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '15%' }} onClick={() => handleSort('code')} className={styles.sortableHeader}>
                                        MÃ KHO {getSortIcon('code')}
                                    </th>
                                    <th style={{ width: '20%' }} onClick={() => handleSort('name')} className={styles.sortableHeader}>
                                        TÊN KHO {getSortIcon('name')}
                                    </th>
                                    <th style={{ width: '25%' }} onClick={() => handleSort('address')} className={styles.sortableHeader}>
                                        ĐỊA CHỈ {getSortIcon('address')}
                                    </th>
                                    <th style={{ width: '15%' }} onClick={() => handleSort('status')} className={styles.sortableHeader}>
                                        TRẠNG THÁI {getSortIcon('status')}
                                    </th>
                                    <th style={{ width: '10%', textAlign: 'center' }}>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warehouses.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '0' }}>
                                            <div className={styles.emptyState}>
                                                <div className={styles.emptyIcon}>
                                                    <i className="fas fa-box-open"></i>
                                                </div>
                                                <p className={styles.emptyTitle}>Không tìm thấy kho hàng</p>
                                                <p className={styles.emptySubtitle}>Không có dữ liệu nào khớp với điều kiện tìm kiếm hiện tại của bạn.</p>
                                                <button className={styles.btnClearFilter} onClick={handleReload} type="button">
                                                    Xóa bộ lọc
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    warehouses.map((warehouse) => (
                                        <tr key={warehouse.id}>
                                            <td className={styles.codeCell}>{warehouse.code}</td>
                                            <td className={styles.nameCell}>{warehouse.name}</td>
                                            <td>{warehouse.address}</td>
                                            <td>{getStatusBadge(warehouse.status)}</td>
                                            <td>
                                                <div className={styles.rowActions}>
                                                    <button className={styles.iconBtn} title="Xem chi tiết" onClick={() => navigate(`/warehouses/${warehouse.id}`)}>
                                                        <i className="far fa-eye"></i>
                                                    </button>
                                                    <button className={styles.iconBtn} title="Sửa" onClick={() => {
                                                        setIsEdit(true);
                                                        setSelectedData(warehouse);
                                                        setShowModal(true);
                                                    }}>
                                                        <i className="fas fa-pencil-alt"></i>
                                                    </button>
                                                    <button 
                                                        className={styles.iconBtn} 
                                                        title="Xóa" 
                                                        onClick={() => handleDelete(warehouse)}
                                                        disabled={warehouse.status === 'INACTIVE' || warehouse.status === 'STOPPED'}
                                                    >
                                                        <i className="far fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {warehouses.length > 0 && (
                        <div className={styles.pagination}>
                            <div className={styles.pageInfo}>
                                Hiển thị {page * size + 1} - {Math.min((page + 1) * size, totalElements)} trong tổng số {totalElements} bản ghi
                            </div>
                            <div className={styles.pageControls}>
                                <button className={styles.pageNavBtn} disabled={page === 0} onClick={() => setPage(page - 1)}>
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                
                                {[...Array(totalPages)].map((_, i) => (
                                    <button 
                                        key={i} 
                                        className={`${styles.pageBtn} ${page === i ? styles.active : ''}`}
                                        onClick={() => setPage(i)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}

                                <button className={styles.pageNavBtn} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                                
                                <div className={styles.pageSizeSelect}>
                                    <select value={size} onChange={(e) => {
                                        setSize(Number(e.target.value));
                                        setPage(0);
                                    }}>
                                        <option value={10}>10 bản ghi / trang</option>
                                        <option value={20}>20 bản ghi / trang</option>
                                        <option value={50}>50 bản ghi / trang</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <WarehouseFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaveModal}
                    isEdit={isEdit}
                    initialData={selectedData}
                />

                <WarehouseDeleteModal 
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteConfirm}
                    warehouse={deletingWarehouse}
                />

                <Toast 
                    isVisible={toast.isVisible}
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, isVisible: false })}
                />
            </div>
        </AdminLayout>
    );
};

export default WarehouseListPage;
