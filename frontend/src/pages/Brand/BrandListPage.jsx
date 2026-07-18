import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/layout/AdminLayout';
import Pagination from '../../components/ui/Pagination/Pagination';
import BrandDetailDrawer from './components/BrandDetailDrawer';
import BrandModal from './components/BrandModal';
import BrandDeleteModal from './components/BrandDeleteModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import styles from './BrandListPage.module.css';

const mapBackendToFrontend = (b) => ({
    ...b,
    status: b.status === 'APPROVED' ? 'ACTIVE' : 'INACTIVE',
    email: b.contactEmail || '',
    icon: b.icon || 'fa-building'
});

const BrandListPage = () => {
    const [brands, setBrands] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [deletingBrand, setDeletingBrand] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    const fetchBrands = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await axiosClient.get('/brands');
            const mapped = (res.data.data || []).map(mapBackendToFrontend);
            setBrands(mapped);
        } catch (error) {
            console.error('Lỗi tải danh sách thương hiệu:', error);
            showToast('error', 'Có lỗi xảy ra khi tải danh sách thương hiệu.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBrands();
    }, [fetchBrands]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchTerm, filterStatus]);

    // Pagination states (mock)
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);

    const handleExport = () => {
        const headers = ['Mã thương hiệu', 'Tên thương hiệu', 'Mô tả', 'Trạng thái'];
        const data = filteredBrands.map(brand => [
            brand.code,
            brand.name,
            brand.description,
            brand.status === 'ACTIVE' ? 'Đang hợp tác' : 'Ngừng hợp tác'
        ]);
        exportToExcel(headers, data, 'Danh_sach_thuong_hieu');
    };

    const getStatusBadge = (status) => {
        if (status === 'ACTIVE') {
            return (
                <div className={`${styles.statusBadge} ${styles.statusActive}`}>
                    Đang hợp tác
                </div>
            );
        }
        return (
            <div className={`${styles.statusBadge} ${styles.statusStopped}`}>
                Ngừng hợp tác
            </div>
        );
    };

    const filteredBrands = brands.filter((brand) => {
        const matchesSearch = brand.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                              brand.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesStatus = filterStatus ? brand.status === filterStatus : true;
        return matchesSearch && matchesStatus;
    });

    const totalElements = filteredBrands.length;
    const totalPages = Math.ceil(totalElements / size);
    const paginatedBrands = filteredBrands.slice(page * size, (page + 1) * size);

    return (
        <AdminLayout activeTab="brands">
            <div className={styles.container}>
                {/* Header Page */}
                <div className={styles.pageHeader}>
                    <div className={styles.titleWrapper}>
                        <h2 className={styles.pageTitle}>Quản lý Thương hiệu</h2>
                        <p className={styles.pageSubtitle}>Quản lý danh sách các thương hiệu điện tử đối tác.</p>
                    </div>
                    <div className={styles.actionButtons}>
                        <button className={styles.btnExport} type="button" onClick={handleExport}>
                            <i className="fas fa-download"></i> Xuất file
                        </button>
                        <button className={styles.btnAdd} type="button" onClick={() => {
                            setEditingBrand(null);
                            setIsAddModalOpen(true);
                        }}>
                            <i className="fas fa-plus"></i> Thêm Thương hiệu
                        </button>
                    </div>
                </div>

                {/* Filter Card */}
                <div className={styles.filterCard}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <div className={styles.filterSearch}>
                                <i className={`fas fa-search ${styles.searchIcon}`}></i>
                                <input 
                                    type="text" 
                                    placeholder="Tìm theo mã hoặc tên thương hiệu..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className={styles.selectWrapper}>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="ACTIVE">Đang hợp tác</option>
                                    <option value="INACTIVE">Ngừng hợp tác</option>
                                </select>
                                <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className={styles.tableCard}>
                    <div className={styles.tableResponsive}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '15%' }}>MÃ THƯƠNG HIỆU</th>
                                    <th style={{ width: '25%' }}>TÊN THƯƠNG HIỆU</th>
                                    <th style={{ width: '35%' }}>MÔ TẢ</th>
                                    <th style={{ width: '15%' }}>TRẠNG THÁI</th>
                                    <th style={{ width: '10%' }}>CHỨC NĂNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: size }).map((_, idx) => (
                                        <tr key={`skeleton-${idx}`} className={styles.skeletonRow}>
                                            <td><div className={styles.skeletonCell} style={{ width: '80%' }}></div></td>
                                            <td>
                                                <div className={styles.nameCellWrapper}>
                                                    <div className={`${styles.skeletonCell} ${styles.skeletonIcon}`}></div>
                                                    <div className={styles.skeletonCell} style={{ width: '120px' }}></div>
                                                </div>
                                            </td>
                                            <td><div className={styles.skeletonCell} style={{ width: '90%' }}></div></td>
                                            <td><div className={styles.skeletonCell} style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div></td>
                                            <td><div className={styles.skeletonCell} style={{ width: '60px' }}></div></td>
                                        </tr>
                                    ))
                                ) : filteredBrands.length === 0 ? (
                                    <tr>
                                        <td colSpan="5">
                                            <div className={styles.emptyState}>
                                                <div className={styles.emptyIcon}>
                                                    <i className="far fa-folder-open"></i>
                                                </div>
                                                <h4>Không tìm thấy thương hiệu nào</h4>
                                                <p>Vui lòng thử lại với từ khóa hoặc bộ lọc khác.</p>
                                                {(searchTerm || filterStatus) && (
                                                    <button 
                                                        className={styles.btnClearFilter}
                                                        onClick={() => {
                                                            setSearchTerm('');
                                                            setFilterStatus('');
                                                        }}
                                                    >
                                                        Xóa bộ lọc
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedBrands.map((brand) => (
                                        <tr key={brand.id}>
                                        <td className={styles.codeCell}>{brand.code}</td>
                                        <td>
                                            <div className={styles.nameCellWrapper}>
                                                <div className={styles.brandIcon}>
                                                    <i className={`fas ${brand.icon}`}></i>
                                                </div>
                                                <span className={styles.nameCell}>{brand.name}</span>
                                            </div>
                                        </td>
                                        <td>{brand.description}</td>
                                        <td>{getStatusBadge(brand.status)}</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button 
                                                    className={`${styles.iconBtn} ${styles.view}`} 
                                                    title="Xem chi tiết"
                                                    onClick={() => {
                                                        setSelectedBrand(brand);
                                                        setIsDrawerOpen(true);
                                                    }}
                                                >
                                                    <i className="far fa-eye"></i>
                                                </button>
                                                <button 
                                                    className={`${styles.iconBtn} ${styles.edit}`} 
                                                    title="Sửa"
                                                    onClick={() => {
                                                        setEditingBrand(brand);
                                                        setIsAddModalOpen(true);
                                                    }}
                                                >
                                                    <i className="fas fa-pencil-alt"></i>
                                                </button>
                                                <button 
                                                    className={`${styles.iconBtn} ${styles.delete}`} 
                                                    title="Xóa"
                                                    onClick={() => {
                                                        setDeletingBrand(brand);
                                                        setIsDeleteModalOpen(true);
                                                    }}
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
                    {filteredBrands.length > 0 && (
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            size={size}
                            onPageChange={setPage}
                            onSizeChange={(s) => {
                                setSize(s);
                                setPage(0);
                            }}
                        />
                    )}
                </div>
            </div>

            <BrandDetailDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => {
                    setIsDrawerOpen(false);
                    setTimeout(() => setSelectedBrand(null), 300); // delay to allow animation to finish
                }} 
                brand={selectedBrand} 
                onEdit={() => {
                    setEditingBrand(selectedBrand);
                    setIsAddModalOpen(true);
                    setIsDrawerOpen(false);
                }}
                onDeactivate={async (brandId) => {
                    try {
                        const targetBrand = brands.find(b => b.id === brandId);
                        if (!targetBrand) return;
                        const payload = {
                            code: targetBrand.code,
                            name: targetBrand.name,
                            status: 'INACTIVE',
                            hotline: targetBrand.hotline || null,
                            contactEmail: targetBrand.email || null,
                            description: targetBrand.description || null
                        };
                        const res = await axiosClient.put(`/brands/${brandId}`, payload);
                        const updated = mapBackendToFrontend(res.data.data);
                        setBrands(brands.map(b => b.id === brandId ? updated : b));
                        if (selectedBrand && selectedBrand.id === brandId) {
                            setSelectedBrand(updated);
                        }
                        showToast('success', 'Vô hiệu hóa thương hiệu thành công!');
                    } catch (err) {
                        const errMsg = err.response?.data?.userMessage || err.response?.data?.message || 'Có lỗi xảy ra khi vô hiệu hóa thương hiệu.';
                        showToast('error', errMsg);
                    }
                }}
            />

            {isAddModalOpen && (
                <BrandModal 
                    initialData={editingBrand}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={async (formData) => {
                        try {
                            const payload = {
                                code: formData.code ? formData.code.trim() : null,
                                name: formData.name.trim(),
                                status: formData.status === 'ACTIVE' ? 'APPROVED' : 'INACTIVE',
                                hotline: formData.hotline ? formData.hotline.trim() : null,
                                contactEmail: formData.email ? formData.email.trim() : null,
                                description: formData.description ? formData.description.trim() : null
                            };
                            
                            if (editingBrand) {
                                // Update existing
                                const res = await axiosClient.put(`/brands/${editingBrand.id}`, payload);
                                const updated = mapBackendToFrontend(res.data.data);
                                setBrands(brands.map(b => b.id === editingBrand.id ? updated : b));
                                showToast('success', 'Cập nhật thương hiệu thành công!');
                            } else {
                                // Save new
                                const res = await axiosClient.post('/brands', payload);
                                const created = mapBackendToFrontend(res.data.data);
                                setBrands([created, ...brands]);
                                showToast('success', 'Tạo thương hiệu thành công!');
                            }
                            setIsAddModalOpen(false);
                        } catch (err) {
                            const errMsg = err.response?.data?.userMessage || err.response?.data?.message || 'Có lỗi xảy ra khi lưu thương hiệu.';
                            showToast('error', errMsg);
                        }
                    }}
                />
            )}

            {isDeleteModalOpen && (
                <BrandDeleteModal 
                    isOpen={isDeleteModalOpen}
                    brand={deletingBrand}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={async (brandId) => {
                        try {
                            await axiosClient.delete(`/brands/${brandId}`);
                            setBrands(brands.filter(b => b.id !== brandId));
                            showToast('success', 'Xóa thương hiệu thành công!');
                        } catch (err) {
                            if (err.response?.status === 409) {
                                // Business Rule 11: Soft deleted due to product links
                                showToast('success', 'Thương hiệu có liên kết, tự động chuyển về trạng thái ngừng hợp tác!');
                            } else {
                                const errMsg = err.response?.data?.userMessage || err.response?.data?.message || 'Có lỗi xảy ra khi xóa thương hiệu.';
                                showToast('error', errMsg);
                            }
                            // Refresh list to pull final states from database
                            fetchBrands();
                        }
                        setIsDeleteModalOpen(false);
                    }}
                />
            )}

            <Toast 
                isVisible={toast.isVisible} 
                type={toast.type} 
                message={toast.message} 
                onClose={() => setToast({ ...toast, isVisible: false })} 
            />
        </AdminLayout>
    );
};

export default BrandListPage;
