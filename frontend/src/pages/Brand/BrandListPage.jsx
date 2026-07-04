import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Pagination from '../../components/ui/Pagination/Pagination';
import BrandDetailDrawer from './components/BrandDetailDrawer';
import BrandModal from './components/BrandModal';
import BrandDeleteModal from './components/BrandDeleteModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import styles from './BrandListPage.module.css';

const mockBrands = Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    code: `BR-${String(i + 1).padStart(3, '0')}`,
    name: ['ASUS', 'Samsung', 'Gigabyte', 'Cisco', 'Logitech', 'Intel', 'AMD', 'Dell', 'HP', 'Lenovo'][i % 10] + (i > 9 ? ` ${Math.floor(i/10)}` : ''),
    description: ['Linh kiện máy tính', 'Thiết bị lưu trữ', 'Gaming Gear', 'Thiết bị mạng', 'Phụ kiện'][i % 5],
    status: i % 4 === 0 ? 'INACTIVE' : 'ACTIVE',
    icon: ['fa-laptop', 'fa-mobile-screen', 'fa-microchip', 'fa-server', 'fa-mouse'][i % 5]
}));

const BrandListPage = () => {
    const [brands, setBrands] = useState(mockBrands);
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

    // Initial load
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

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
                onDeactivate={(brandId) => {
                    setBrands(brands.map(b => b.id === brandId ? { ...b, status: 'INACTIVE' } : b));
                    if (selectedBrand && selectedBrand.id === brandId) {
                        setSelectedBrand({ ...selectedBrand, status: 'INACTIVE' });
                    }
                    showToast('success', 'Vô hiệu hóa thương hiệu thành công!');
                }}
            />

            {isAddModalOpen && (
                <BrandModal 
                    initialData={editingBrand}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={(formData) => {
                        let isNew = false;
                        if (editingBrand) {
                            // Update existing
                            setBrands(brands.map(b => b.id === editingBrand.id ? { ...b, ...formData } : b));
                        } else {
                            // Mock saving new
                            isNew = true;
                            const newId = formData.code || `BR-${String(brands.length + 1).padStart(3, '0')}`;
                            const newBrand = {
                                id: brands.length + 1,
                                code: newId,
                                name: formData.name,
                                description: formData.description,
                                status: formData.status,
                                icon: 'fa-star'
                            };
                            setBrands([newBrand, ...brands]);
                        }
                        setIsAddModalOpen(false);
                        showToast('success', isNew ? 'Tạo thương hiệu thành công!' : 'Cập nhật thương hiệu thành công!');
                    }}
                />
            )}

            {isDeleteModalOpen && (
                <BrandDeleteModal 
                    isOpen={isDeleteModalOpen}
                    brand={deletingBrand}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={(brandId) => {
                        setBrands(brands.filter(b => b.id !== brandId));
                        setIsDeleteModalOpen(false);
                        showToast('error', 'Xóa thương hiệu thành công!');
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
