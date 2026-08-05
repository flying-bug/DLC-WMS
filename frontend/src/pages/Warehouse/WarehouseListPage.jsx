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

    const fetchWarehouses = async (pageIndex = 1, currentSize = size) => {
        setLoading(true);
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
            const totalPages = payload.page?.totalPages ?? payload.totalPages ?? Math.ceil(content.length / currentSize) ?? 1;
            const totalElements = payload.page?.totalElements ?? payload.totalElements ?? payload.totalItems ?? content.length ?? 0;
            
            setTotalPages(totalPages);
            setTotalElements(totalElements);
            setPage(pageIndex);
        } catch (error) {
            console.error("Lỗi fetch kho:", error);
            showToast('error', 'Không thể tải dữ liệu kho!');
        } finally {
            setLoading(false);
        }
    };

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
        e.stopPropagation(); // prevent row click
        setDeletingWarehouse(warehouse);
        setShowDeleteModal(true);
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
        e.stopPropagation(); // prevent row click
        setIsEdit(true);
        setSelectedData(warehouse);
        setShowModal(true);
    };

    const handleRowClick = (id) => {
        navigate(`/warehouses/${id}`);
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
                        <p className={styles.pageSubtitle}>Danh sách và cấu hình các kho hàng thuộc hệ thống</p>
                    </div>
                    <div className={styles.actionButtons}>
                        <button className={styles.btnPrimary} type="button" onClick={() => {
                            setIsEdit(false);
                            setSelectedData(null);
                            setShowModal(true);
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
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '15%' }} onClick={() => handleSort('code')}>
                                    MÃ KHO {getSortIcon('code')}
                                </th>
                                <th style={{ width: '25%' }} onClick={() => handleSort('name')}>
                                    TÊN KHO {getSortIcon('name')}
                                </th>
                                <th style={{ width: '30%' }} onClick={() => handleSort('address')}>
                                    ĐỊA CHỈ {getSortIcon('address')}
                                </th>
                                <th style={{ width: '15%' }} onClick={() => handleSort('status')}>
                                    TRẠNG THÁI {getSortIcon('status')}
                                </th>
                                <th style={{ width: '15%', textAlign: 'center' }}>
                                    THAO TÁC
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</td>
                                </tr>
                            ) : warehouses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className={styles.emptyState}>
                                        <i className={`fas fa-box-open ${styles.emptyIcon}`}></i>
                                        <div className={styles.emptyText}>Không có dữ liệu kho.</div>
                                    </td>
                                </tr>
                            ) : (
                                warehouses.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleRowClick(item.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className={styles.codeCell}>{item.code}</td>
                                        <td className={styles.nameCell}>{item.name}</td>
                                        <td>{item.address}</td>
                                        <td>{getStatusBadge(item.status)}</td>
                                        <td className={styles.textCenter}>
                                            <div className={styles.rowActions}>
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
                                                    style={{ cursor: 'pointer', color: '#ef4444', fontSize: '16px' }}
                                                    onClick={(e) => handleDelete(e, item)}
                                                ></i>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalElements > 0 && (
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Hiển thị</span>
                                <select 
                                    className="misa-select"
                                    style={{ width: '70px', height: '32px', padding: '0 8px', border: '1px solid #d4d4d7', borderRadius: '4px', outline: 'none' }}
                                    value={size} 
                                    onChange={(e) => {
                                        setSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <span>trên tổng số {totalElements} bản ghi</span>
                            </div>
                        </div>
                        <div className={styles.pageControls}>
                            <button 
                                disabled={page === 1} 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className={styles.pageBtn}
                            >
                                <i className="bi bi-chevron-left"></i>
                                <span>Trước</span>
                            </button>
                            
                            <div className={styles.paginationNumbers}>
                                {(() => {
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
                                    
                                    return pages.map((num, idx) => (
                                        num === page ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                title="Nhập số trang và nhấn Enter"
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
                                    ));
                                })()}
                            </div>
                            
                            <button 
                                disabled={page === totalPages} 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className={styles.pageBtn}
                            >
                                <span>Sau</span>
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
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
