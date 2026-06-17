import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './WarehouseListPage.module.css';

// Dữ liệu mock dựa trên Figma (Không gọi API)
const MOCK_WAREHOUSES = [
    {
        id: 'K01',
        name: 'Kho Linh Kiện',
        address: 'Khu Công nghệ Cao, Quận 9, TP. Thủ Đức',
        status: 'ACTIVE', // Đang hoạt động
        branch: 'Hồ Chí Minh'
    },
    {
        id: 'MK01',
        name: 'Kho Thành Phẩm',
        address: 'Sông Lô, Vĩnh Phúc',
        status: 'PAUSED', // Tạm ngưng
        branch: 'Vĩnh Phúc'
    },
    {
        id: 'K05',
        name: 'Kho Phụ Kiện',
        address: 'Hola, Thạch Thất, Hà Nội',
        status: 'STOPPED', // Ngừng sử dụng
        branch: 'Hà Nội'
    }
];

const WarehouseListPage = () => {
    const navigate = useNavigate();
    const [warehouses, setWarehouses] = useState(MOCK_WAREHOUSES);
    
    // Các state bộ lọc
    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchAddress, setSearchAddress] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterBranch, setFilterBranch] = useState('');

    // State sắp xếp
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleFilter = () => {
        let filtered = MOCK_WAREHOUSES.filter(w => {
            const matchCode = w.id.toLowerCase().includes(searchCode.toLowerCase());
            const matchName = w.name.toLowerCase().includes(searchName.toLowerCase());
            const matchAddress = w.address.toLowerCase().includes(searchAddress.toLowerCase());
            const matchStatus = filterStatus ? w.status === filterStatus : true;
            
            // Xử lý logic lọc chi nhánh đơn giản (vì mock data dùng tên hiển thị)
            let matchBranch = true;
            if (filterBranch === 'HCM') matchBranch = w.branch.includes('Hồ Chí Minh');
            else if (filterBranch === 'HN') matchBranch = w.branch.includes('Hà Nội');
            else if (filterBranch === 'VP') matchBranch = w.branch.includes('Vĩnh Phúc');
            
            return matchCode && matchName && matchAddress && matchStatus && matchBranch;
        });

        // Áp dụng luôn sắp xếp nếu đang có sort
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        setWarehouses(filtered);
    };

    const handleReload = () => {
        setSearchCode('');
        setSearchName('');
        setSearchAddress('');
        setFilterStatus('');
        setFilterBranch('');
        setSortConfig({ key: null, direction: 'asc' });
        setWarehouses(MOCK_WAREHOUSES);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...warehouses].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setWarehouses(sortedData);
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <i className={`fas fa-sort ${styles.sortIcon} ${styles.sortIconInactive}`}></i>;
        if (sortConfig.direction === 'asc') return <i className={`fas fa-sort-up ${styles.sortIcon}`}></i>;
        return <i className={`fas fa-sort-down ${styles.sortIcon}`}></i>;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE':
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

    return (
        <AdminLayout activeTab="dashboard">
            <div className={styles.container}>
                {/* Header Page */}
                <div className={styles.pageHeader}>
                    <div className={styles.titleWrapper}>
                        <h2 className={styles.pageTitle}>Quản lý kho</h2>
                        <p className={styles.pageSubtitle}>Danh sách và cấu hình các kho hàng thuộc hệ thống Duy Long Computer</p>
                    </div>
                    <div className={styles.actionButtons}>
                        <button className={styles.btnAdd} type="button">
                            <i className="fas fa-plus"></i> Thêm kho
                        </button>
                        <button className={styles.btnExport} type="button">
                            <i className="fas fa-file-excel"></i> Xuất Excel
                        </button>
                        <button className={styles.btnReload} onClick={handleReload} type="button" title="Tải lại dữ liệu">
                            <i className="fas fa-redo"></i>
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
                                    <option value="ACTIVE">Đang hoạt động</option>
                                    <option value="PAUSED">Tạm ngưng</option>
                                    <option value="STOPPED">Ngừng sử dụng</option>
                                </select>
                                <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                            </div>
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Chi nhánh</label>
                            <div className={styles.selectWrapper}>
                                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                                    <option value="">Tất cả chi nhánh</option>
                                    <option value="HCM">Hồ Chí Minh</option>
                                    <option value="HN">Hà Nội</option>
                                    <option value="VP">Vĩnh Phúc</option>
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
                                    <th style={{ width: '15%' }} onClick={() => handleSort('id')} className={styles.sortableHeader}>
                                        MÃ KHO {getSortIcon('id')}
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
                                    <th style={{ width: '15%' }} onClick={() => handleSort('branch')} className={styles.sortableHeader}>
                                        CHI NHÁNH {getSortIcon('branch')}
                                    </th>
                                    <th style={{ width: '10%', textAlign: 'center' }}>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warehouses.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '0' }}>
                                            {/* Trạng thái trống (Empty State) */}
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
                                            <td className={styles.codeCell}>{warehouse.id}</td>
                                            <td className={styles.nameCell}>{warehouse.name}</td>
                                            <td>{warehouse.address}</td>
                                            <td>{getStatusBadge(warehouse.status)}</td>
                                            <td>{warehouse.branch}</td>
                                            <td>
                                                <div className={styles.rowActions}>
                                                    <button className={styles.iconBtn} title="Xem chi tiết">
                                                        <i className="far fa-eye"></i>
                                                    </button>
                                                    <button className={styles.iconBtn} title="Sửa">
                                                        <i className="fas fa-pencil-alt"></i>
                                                    </button>
                                                    <button className={styles.iconBtn} title="Xóa">
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
                                Hiển thị 1 - {warehouses.length} trong tổng số {warehouses.length} bản ghi
                            </div>
                            <div className={styles.pageControls}>
                                <button className={styles.pageNavBtn} disabled>
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
                                <button className={styles.pageNavBtn} disabled>
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                                
                                <div className={styles.pageSizeSelect}>
                                    <select>
                                        <option>3 bản ghi / trang</option>
                                        <option>10 bản ghi / trang</option>
                                        <option>20 bản ghi / trang</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default WarehouseListPage;
