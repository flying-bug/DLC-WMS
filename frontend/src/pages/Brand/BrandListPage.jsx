import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Pagination from '../../components/ui/Pagination/Pagination';
import BrandDetailDrawer from './components/BrandDetailDrawer';
import BrandModal from './components/BrandModal';
import BrandDeleteModal from './components/BrandDeleteModal';
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
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [deletingBrand, setDeletingBrand] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Pagination states (mock)
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);

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
        const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              brand.code.toLowerCase().includes(searchTerm.toLowerCase());
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
                        <button className={styles.btnExport} type="button">
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
                                {filteredBrands.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>
                                            Không tìm thấy thương hiệu nào phù hợp.
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
            />

            {isAddModalOpen && (
                <BrandModal 
                    initialData={editingBrand}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={(formData) => {
                        if (editingBrand) {
                            // Update existing
                            setBrands(brands.map(b => b.id === editingBrand.id ? { ...b, ...formData } : b));
                        } else {
                            // Mock saving new
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
                    }}
                />
            )}
        </AdminLayout>
    );
};

export default BrandListPage;
