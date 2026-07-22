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
    
    // CÃ¡c state bá»™ lá»c
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

    // State sáº¯p xáº¿p
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
            console.error("Lá»—i fetch kho:", error);
            showToast('error', 'KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u kho!');
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
                showToast('success', 'Cáº­p nháº­t kho thÃ nh cÃ´ng!');
            } else {
                await warehouseApi.createWarehouse(formData);
                showToast('success', 'ThÃªm má»›i kho thÃ nh cÃ´ng!');
            }
            fetchWarehouses();
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra!');
            throw error; // Re-throw Ä‘á»ƒ WarehouseFormModal khÃ´ng tá»± Ä‘á»™ng clear form náº¿u lá»—i
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
            showToast('success', 'XÃ³a kho thÃ nh cÃ´ng!');
        } catch (error) {
            console.error("Lá»—i xÃ³a kho:", error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra khi xÃ³a!');
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
                        Äang hoáº¡t Ä‘á»™ng
                    </div>
                );
            case 'PAUSED':
                return (
                    <div className={`${styles.statusBadge} ${styles.statusPaused}`}>
                        <span className={styles.statusDot}></span>
                        Táº¡m ngÆ°ng
                    </div>
                );
            case 'STOPPED':
            case 'INACTIVE':
                return (
                    <div className={`${styles.statusBadge} ${styles.statusStopped}`}>
                        <span className={styles.statusDot}></span>
                        Ngá»«ng sá»­ dá»¥ng
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
            
            showToast('success', 'Xuáº¥t Excel thÃ nh cÃ´ng!');
        } catch (error) {
            console.error("Lá»—i xuáº¥t Excel:", error);
            showToast('error', 'CÃ³ lá»—i xáº£y ra khi xuáº¥t Excel!');
        }
    };

    return (
        <AdminLayout activeTab="warehouses">
            <div className={styles.container}>
                {/* Header Page */}
                <div className={styles.pageHeader}>
                    <div className={styles.titleWrapper}>
                        <h2 className={styles.pageTitle}>Quáº£n lÃ½ kho</h2>
                        <p className={styles.pageSubtitle}>Danh sÃ¡ch vÃ  cáº¥u hÃ¬nh cÃ¡c kho hÃ ng thuá»™c há»‡ thá»‘ng Duy Long Computer</p>
                    </div>
                    <div className={styles.actionButtons}>
                        <button className={styles.btnAdd} type="button" onClick={() => {
                            setIsEdit(false);
                            setSelectedData(null);
                            setShowModal(true);
                        }}>
                            <i className="fas fa-plus"></i> ThÃªm kho
                        </button>
                        <button className={styles.btnExport} type="button" onClick={handleExportExcel}>
                            <i className="fas fa-file-excel"></i> Xuáº¥t Excel
                        </button>
                    </div>
                </div>

                {/* Filter Card */}
                <div className={styles.filterCard}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <label>TÃ¬m theo mÃ£ kho</label>
                            <input 
                                type="text" 
                                placeholder="VÃ­ dá»¥: K01, MK01..." 
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>TÃ¬m theo tÃªn kho</label>
                            <input 
                                type="text" 
                                placeholder="Nháº­p tÃªn kho hÃ ng" 
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Äá»‹a chá»‰</label>
                            <input 
                                type="text" 
                                placeholder="Nháº­p Ä‘á»‹a chá»‰" 
                                value={searchAddress}
                                onChange={(e) => setSearchAddress(e.target.value)}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Tráº¡ng thÃ¡i</label>
                            <div className={styles.selectWrapper}>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="">Táº¥t cáº£</option>
                                    <option value="APPROVED">Äang hoáº¡t Ä‘á»™ng</option>
                                    <option value="INACTIVE">Ngá»«ng sá»­ dá»¥ng</option>
                                </select>
                                <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                            </div>
                        </div>
                        <div className={styles.filterAction}>
                            <button className={styles.btnFilter} onClick={handleFilter} type="button">
                                <i className="fas fa-filter"></i> Lá»c dá»¯ liá»‡u
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
                                        MÃƒ KHO {getSortIcon('code')}
                                    </th>
                                    <th style={{ width: '20%' }} onClick={() => handleSort('name')} className={styles.sortableHeader}>
                                        TÃŠN KHO {getSortIcon('name')}
                                    </th>
                                    <th style={{ width: '25%' }} onClick={() => handleSort('address')} className={styles.sortableHeader}>
                                        Äá»ŠA CHá»ˆ {getSortIcon('address')}
                                    </th>
                                    <th style={{ width: '15%' }} onClick={() => handleSort('status')} className={styles.sortableHeader}>
                                        TRáº NG THÃI {getSortIcon('status')}
                                    </th>
                                    <th style={{ width: '10%', textAlign: 'center' }}>THAO TÃC</th>
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
                                                <p className={styles.emptyTitle}>KhÃ´ng tÃ¬m tháº¥y kho hÃ ng</p>
                                                <p className={styles.emptySubtitle}>KhÃ´ng cÃ³ dá»¯ liá»‡u nÃ o khá»›p vá»›i Ä‘iá»u kiá»‡n tÃ¬m kiáº¿m hiá»‡n táº¡i cá»§a báº¡n.</p>
                                                <button className={styles.btnClearFilter} onClick={handleReload} type="button">
                                                    XÃ³a bá»™ lá»c
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
                                                    <button className={styles.iconBtn} title="Xem chi tiáº¿t" onClick={() => navigate(`/warehouses/${warehouse.id}`)}>
                                                        <i className="far fa-eye"></i>
                                                    </button>
                                                    <button className={styles.iconBtn} title="Sá»­a" onClick={() => {
                                                        setIsEdit(true);
                                                        setSelectedData(warehouse);
                                                        setShowModal(true);
                                                    }}>
                                                        <i className="fas fa-pencil-alt"></i>
                                                    </button>
                                                    <button 
                                                        className={styles.iconBtn} 
                                                        title="XÃ³a" 
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
                                Hiá»ƒn thá»‹ {page * size + 1} - {Math.min((page + 1) * size, totalElements)} trong tá»•ng sá»‘ {totalElements} báº£n ghi
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
                                        <option value={10}>10 báº£n ghi / trang</option>
                                        <option value={20}>20 báº£n ghi / trang</option>
                                        <option value={50}>50 báº£n ghi / trang</option>
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
