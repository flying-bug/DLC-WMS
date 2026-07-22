import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as warehouseApi from '../../api/warehouseApi';
import WarehouseFormModal from '../../components/warehouse/WarehouseFormModal';
import WarehouseDeleteModal from '../../components/warehouse/WarehouseDeleteModal';
import Toast from '../../components/ui/Toast/Toast';
import WarehouseStaffList from './components/WarehouseStaffList';
import WarehouseInventoryList from './components/WarehouseInventoryList';
import styles from './WarehouseDetailPage.module.css';

const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0 â‚«';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'ACTIVE':
        case 'APPROVED':
            return 'Äang hoáº¡t Ä‘á»™ng';
        case 'PAUSED':
            return 'Táº¡m ngÆ°ng';
        case 'STOPPED':
        case 'INACTIVE':
            return 'Ngá»«ng sá»­ dá»¥ng';
        default:
            return status;
    }
};

const isActiveStatus = (status) => status === 'ACTIVE' || status === 'APPROVED';

const parseLogDetail = (detail) => {
    if (!detail) return null;
    if (typeof detail === 'object') return detail;
    try {
        return JSON.parse(detail);
    } catch {
        return null;
    }
};

const formatDetailValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Trá»‘ng';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const getFieldLabel = (field) => {
    const labels = {
        code: 'MÃ£ kho',
        name: 'TÃªn kho',
        address: 'Äá»‹a chá»‰',
        type: 'Loáº¡i kho',
        status: 'Tráº¡ng thÃ¡i',
    };
    return labels[field] || field;
};

const renderLogChanges = (log) => {
    const detail = parseLogDetail(log.detail);
    if (!detail?.changes?.length) return null;

    return (
        <div className={styles.changeList}>
            {detail.changes.map((change, index) => (
                <div key={`${change.field}-${index}`} className={styles.changeItem}>
                    <span className={styles.changeField}>{getFieldLabel(change.field)}</span>
                    <span className={styles.changeValue}>{formatDetailValue(change.before)}</span>
                    <span className={styles.changeArrow}>â†’</span>
                    <span className={styles.changeValue}>{formatDetailValue(change.after)}</span>
                </div>
            ))}
        </div>
    );
};

const WarehouseDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('info');
    const [warehouse, setWarehouse] = useState(null);
    const [loading, setLoading] = useState(true);

    // Logs state
    const [logs, setLogs] = useState([]);
    const [logsPage, setLogsPage] = useState(0);
    const [logsTotalPages, setLogsTotalPages] = useState(0);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    const fetchDetail = async () => {
        try {
            const res = await warehouseApi.getWarehouseDetail(id);
            setWarehouse(res.data.data);
        } catch (error) {
            console.error('Lá»—i táº£i chi tiáº¿t kho:', error);
            showToast('error', 'KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u kho.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async (page = 0) => {
        setLoadingLogs(true);
        try {
            const res = await warehouseApi.getWarehouseLogs(id, { page, size: 10 });
            setLogs(res.data.data.content || []);
            setLogsTotalPages(res.data.data.totalPages || 0);
            setLogsPage(page);
        } catch (error) {
            console.error('Lá»—i táº£i lá»‹ch sá»­:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
         
        fetchDetail();
        if (activeTab === 'history') {
            fetchLogs(0);
        }
         
    }, [id, activeTab]);

    const handleBack = () => {
        navigate('/warehouses');
    };

    const handleSaveModal = async (formData) => {
        try {
            await warehouseApi.updateWarehouse(id, formData);
            showToast('success', 'Cáº­p nháº­t kho thÃ nh cÃ´ng!');
            fetchDetail();
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra!');
            throw error;
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await warehouseApi.deleteWarehouse(id);
            showToast('success', 'XÃ³a kho thÃ nh cÃ´ng!');
            setTimeout(() => navigate('/warehouses'), 1500);
        } catch (error) {
            console.error("Lá»—i xÃ³a kho:", error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra khi xÃ³a!');
            fetchDetail(); // Reload to reflect INACTIVE status if 409 Soft delete occurred
        } finally {
            setShowDeleteModal(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout activeTab="warehouses">
                <div className={styles.container}>Äang táº£i dá»¯ liá»‡u...</div>
            </AdminLayout>
        );
    }

    if (!warehouse) {
        return (
            <AdminLayout activeTab="warehouses">
                <div className={styles.container}>Kho khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ xÃ³a.</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout activeTab="warehouses">
            <div className={styles.container}>
                {/* 1. Page Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <button className={styles.btnBack} onClick={handleBack} title="Quay láº¡i">
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <h2 className={styles.pageTitle}>{warehouse.name} ({warehouse.code})</h2>
                        <div className={`${styles.statusBadge} ${isActiveStatus(warehouse.status) ? styles.statusActive : styles.statusStopped}`}>
                            <span className={styles.statusDot}></span>
                            {getStatusLabel(warehouse.status)}
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.btnEdit} onClick={() => setShowModal(true)}>
                            <i className="fas fa-pencil-alt"></i> Chá»‰nh sá»­a
                        </button>
                        <button className={styles.btnDelete} onClick={handleDelete} disabled={!isActiveStatus(warehouse.status)}>
                            <i className="far fa-trash-alt"></i> XÃ³a
                        </button>
                    </div>
                </div>

                {/* 2. Tabs Navigation */}
                <div className={styles.tabsNav}>
                    <button 
                        className={`${styles.tabItem} ${activeTab === 'info' ? styles.active : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        ThÃ´ng tin chung
                    </button>
                    <button 
                        className={`${styles.tabItem} ${activeTab === 'inventory' ? styles.active : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        Tá»“n kho
                    </button>
                    <button 
                        className={`${styles.tabItem} ${activeTab === 'staff' ? styles.active : ''}`}
                        onClick={() => setActiveTab('staff')}
                    >
                        NhÃ¢n sá»±
                    </button>
                    <button 
                        className={`${styles.tabItem} ${activeTab === 'history' ? styles.active : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Lá»‹ch sá»­ hoáº¡t Ä‘á»™ng
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'info' && (
                    <div className={styles.tabContent}>
                        {/* 3. KPI Cards */}
                        <div className={styles.kpiGrid}>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiHeader}>
                                    <div className={styles.kpiIconWrapper} style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                                        <i className="fas fa-boxes"></i>
                                    </div>
                                    <span className={styles.kpiTrend} style={{ color: '#16a34a' }}>Tá»•ng quan</span>
                                </div>
                                <div className={styles.kpiLabel}>Tá»•ng sá»‘ máº·t hÃ ng (SKU)</div>
                                <div className={styles.kpiValue}>
                                    {new Intl.NumberFormat('vi-VN').format(warehouse.totalSkus || 0)}
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiHeader}>
                                    <div className={styles.kpiIconWrapper} style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
                                        <i className="fas fa-clipboard-list"></i>
                                    </div>
                                    <span className={styles.kpiTrend} style={{ color: '#64748b' }}>Thá»±c táº¿</span>
                                </div>
                                <div className={styles.kpiLabel}>Tá»•ng tá»“n kho</div>
                                <div className={styles.kpiValue}>
                                    {new Intl.NumberFormat('vi-VN').format(warehouse.totalQuantity || 0)}
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiHeader}>
                                    <div className={styles.kpiIconWrapper} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                        <i className="fas fa-money-bill-wave"></i>
                                    </div>
                                    <span className={styles.kpiTrend} style={{ color: '#16a34a' }}>Æ¯á»›c tÃ­nh</span>
                                </div>
                                <div className={styles.kpiLabel}>GiÃ¡ trá»‹ tá»“n kho</div>
                                <div className={styles.kpiValue}>
                                    {formatCurrency(warehouse.totalValue)}
                                </div>
                            </div>
                        </div>

                        {/* 4. Main Content */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <i className="fas fa-info-circle"></i>
                                <h3>ThÃ´ng tin cÆ¡ báº£n</h3>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.infoGrid}>
                                            <div className={styles.infoItem}>
                                                <label>MÃƒ KHO</label>
                                                <p>{warehouse.code}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>TÃŠN KHO</label>
                                                <p>{warehouse.name}</p>
                                            </div>
                                            <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                                                <label>Äá»ŠA CHá»ˆ</label>
                                                <p>{warehouse.address}</p>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.metaInfoBox}>
                                            <div className={styles.infoItem}>
                                                <label>NGÆ¯á»œI Táº O</label>
                                                <p>{warehouse.creatorName || 'ChÆ°a cáº­p nháº­t'}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>NGÃ€Y Táº O</label>
                                                <p>{formatDate(warehouse.createdAt)}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>NGÆ¯á»œI Cáº¬P NHáº¬T</label>
                                                <p>{warehouse.updaterName || 'ChÆ°a cáº­p nháº­t'}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>Cáº¬P NHáº¬T Láº¦N CUá»I</label>
                                                <p>{formatDate(warehouse.updatedAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                    </div>
                )}

                {/* Tab Inventory */}
                {activeTab === 'inventory' && (
                    <div className={styles.tabContent}>
                        <WarehouseInventoryList warehouseId={id} />
                    </div>
                )}

                {/* Tab Staff */}
                {activeTab === 'staff' && (
                    <div className={styles.tabContent}>
                        <WarehouseStaffList warehouseId={id} />
                    </div>
                )}

                {/* Tab History */}
                {activeTab === 'history' && (
                    <div className={styles.tabContent}>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <i className="fas fa-history"></i>
                                <h3>Lá»‹ch sá»­ hoáº¡t Ä‘á»™ng</h3>
                            </div>
                            <div className={styles.cardBody}>
                                {loadingLogs ? (
                                    <p>Äang táº£i nháº­t kÃ½...</p>
                                ) : logs.length === 0 ? (
                                    <p>ChÆ°a cÃ³ lá»‹ch sá»­ hoáº¡t Ä‘á»™ng nÃ o.</p>
                                ) : (
                                    <div className={styles.timeline}>
                                        {logs.map(log => (
                                            <div key={log.id} className={styles.timelineItem}>
                                                <div className={styles.timelineIcon}>
                                                    <i className={log.action === 'CREATE' ? 'fas fa-plus' : log.action === 'UPDATE' ? 'fas fa-pencil-alt' : 'fas fa-trash-alt'}></i>
                                                </div>
                                                <div className={styles.timelineContent}>
                                                    <div className={styles.timelineHeader}>
                                                        <strong>{log.user?.fullName || log.user?.username || 'Há»‡ thá»‘ng'}</strong>
                                                        <span className={styles.timelineAction}>
                                                            {log.action === 'CREATE' ? 'táº¡o má»›i' : log.action === 'UPDATE' ? 'cáº­p nháº­t' : 'Ä‘Ã£ vÃ´ hiá»‡u hÃ³a'}
                                                        </span>
                                                        <span className={styles.timelineDate}>{formatDate(log.createdAt)}</span>
                                                    </div>
                                                    {log.description && <p className={styles.timelineDesc}>{log.description}</p>}
                                                    {renderLogChanges(log)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* PhÃ¢n trang */}
                                {logsTotalPages > 1 && (
                                    <div className={styles.pagination}>
                                        <button 
                                            disabled={logsPage === 0} 
                                            onClick={() => fetchLogs(logsPage - 1)}
                                            className={styles.pageBtn}
                                        >
                                            TrÆ°á»›c
                                        </button>
                                        <span className={styles.pageInfo}>Trang {logsPage + 1} / {logsTotalPages}</span>
                                        <button 
                                            disabled={logsPage >= logsTotalPages - 1} 
                                            onClick={() => fetchLogs(logsPage + 1)}
                                            className={styles.pageBtn}
                                        >
                                            Sau
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.pageFooter}>
                    Â© 2026 Duy Long Computer - Há»‡ thá»‘ng quáº£n lÃ½ kho v2.4.1
                </div>

                <WarehouseFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaveModal}
                    isEdit={true}
                    initialData={warehouse}
                />

                <WarehouseDeleteModal 
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteConfirm}
                    warehouse={warehouse}
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

export default WarehouseDetailPage;
