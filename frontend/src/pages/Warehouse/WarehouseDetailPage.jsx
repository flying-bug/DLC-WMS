import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as warehouseApi from '../../api/warehouseApi';
import WarehouseFormModal from '../../components/warehouse/WarehouseFormModal';
import Toast from '../../components/ui/Toast/Toast';
import styles from './WarehouseDetailPage.module.css';

const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0 ₫';
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
            return 'Đang hoạt động';
        case 'PAUSED':
            return 'Tạm ngưng';
        case 'STOPPED':
        case 'INACTIVE':
            return 'Ngừng sử dụng';
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
    if (value === null || value === undefined || value === '') return 'Trống';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const getFieldLabel = (field) => {
    const labels = {
        code: 'Mã kho',
        name: 'Tên kho',
        address: 'Địa chỉ',
        type: 'Loại kho',
        status: 'Trạng thái',
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
                    <span className={styles.changeArrow}>→</span>
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
            console.error('Lỗi tải chi tiết kho:', error);
            showToast('error', 'Không thể tải dữ liệu kho.');
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
            console.error('Lỗi tải lịch sử:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDetail();
        if (activeTab === 'history') {
            fetchLogs(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, activeTab]);

    const handleBack = () => {
        navigate('/warehouses');
    };

    const handleSaveModal = async (formData) => {
        try {
            await warehouseApi.updateWarehouse(id, formData);
            showToast('success', 'Cập nhật kho thành công!');
            fetchDetail();
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra!');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa kho này không? (Hệ thống sẽ vô hiệu hóa nếu kho có chứa hàng)')) {
            try {
                await warehouseApi.deleteWarehouse(id);
                showToast('success', 'Xóa kho thành công!');
                setTimeout(() => navigate('/warehouses'), 1500);
            } catch (error) {
                console.error("Lỗi xóa kho:", error);
                showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra khi xóa!');
                fetchDetail(); // Reload to reflect INACTIVE status if 409 Soft delete occurred
            }
        }
    };

    if (loading) {
        return (
            <AdminLayout activeTab="warehouses">
                <div className={styles.container}>Đang tải dữ liệu...</div>
            </AdminLayout>
        );
    }

    if (!warehouse) {
        return (
            <AdminLayout activeTab="warehouses">
                <div className={styles.container}>Kho không tồn tại hoặc đã bị xóa.</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout activeTab="warehouses">
            <div className={styles.container}>
                {/* 1. Page Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <button className={styles.btnBack} onClick={handleBack} title="Quay lại">
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
                            <i className="fas fa-pencil-alt"></i> Chỉnh sửa
                        </button>
                        <button className={styles.btnDelete} onClick={handleDelete}>
                            <i className="far fa-trash-alt"></i> Xóa
                        </button>
                    </div>
                </div>

                {/* 2. Tabs Navigation */}
                <div className={styles.tabsNav}>
                    <button 
                        className={`${styles.tabItem} ${activeTab === 'info' ? styles.active : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        Thông tin chung
                    </button>
                    <button 
                        className={`${styles.tabItem} ${activeTab === 'stats' ? styles.active : ''}`}
                        onClick={() => setActiveTab('stats')}
                    >
                        Thống kê
                    </button>
                    <button 
                        className={`${styles.tabItem} ${activeTab === 'history' ? styles.active : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Lịch sử hoạt động
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
                                    <span className={styles.kpiTrend} style={{ color: '#16a34a' }}>Tổng quan</span>
                                </div>
                                <div className={styles.kpiLabel}>Tổng số mặt hàng (SKU)</div>
                                <div className={styles.kpiValue}>
                                    {new Intl.NumberFormat('vi-VN').format(warehouse.totalSkus || 0)}
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiHeader}>
                                    <div className={styles.kpiIconWrapper} style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
                                        <i className="fas fa-clipboard-list"></i>
                                    </div>
                                    <span className={styles.kpiTrend} style={{ color: '#64748b' }}>Thực tế</span>
                                </div>
                                <div className={styles.kpiLabel}>Tổng tồn kho</div>
                                <div className={styles.kpiValue}>
                                    {new Intl.NumberFormat('vi-VN').format(warehouse.totalQuantity || 0)}
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiHeader}>
                                    <div className={styles.kpiIconWrapper} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                        <i className="fas fa-money-bill-wave"></i>
                                    </div>
                                    <span className={styles.kpiTrend} style={{ color: '#16a34a' }}>Ước tính</span>
                                </div>
                                <div className={styles.kpiLabel}>Giá trị tồn kho</div>
                                <div className={styles.kpiValue}>
                                    {formatCurrency(warehouse.totalValue)}
                                </div>
                            </div>
                        </div>

                        {/* 4. Main Content Grid (2 Columns) */}
                        <div className={styles.mainGrid}>
                            {/* Left Column */}
                            <div className={styles.leftColumn}>
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <i className="fas fa-info-circle"></i>
                                        <h3>Thông tin cơ bản</h3>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.infoGrid}>
                                            <div className={styles.infoItem}>
                                                <label>MÃ KHO</label>
                                                <p>{warehouse.code}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>TÊN KHO</label>
                                                <p>{warehouse.name}</p>
                                            </div>
                                            <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                                                <label>ĐỊA CHỈ</label>
                                                <p>{warehouse.address}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>LOẠI KHO</label>
                                                <p>{warehouse.type === 'STANDARD' ? 'Kho tiêu chuẩn' : (warehouse.type || 'Tiêu chuẩn')}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>TRẠNG THÁI</label>
                                                <p>{getStatusLabel(warehouse.status)}</p>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.metaInfoBox}>
                                            <div className={styles.infoItem}>
                                                <label>NGƯỜI TẠO</label>
                                                <p>Admin System</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>NGÀY TẠO</label>
                                                <p>{formatDate(warehouse.createdAt)}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>CẬP NHẬT LẦN CUỐI</label>
                                                <p>{formatDate(warehouse.updatedAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className={styles.rightColumn}>
                                {/* Alert Card */}
                                <div className={styles.alertCard}>
                                    <div className={styles.alertHeader}>
                                        <i className="fas fa-info-circle" style={{color: '#3b82f6'}}></i>
                                        <h4>Ghi chú hoạt động</h4>
                                    </div>
                                    <p className={styles.alertText} style={{color: '#475569', backgroundColor: 'transparent'}}>
                                        Mọi thay đổi thông tin liên quan đến kho hàng sẽ được ghi nhận vào nhật ký hệ thống (Audit Log).
                                    </p>
                                    <button className={styles.btnAlertAction} style={{backgroundColor: '#e2e8f0', color: '#475569'}} onClick={() => navigate('/audit-log')}>
                                        Xem nhật ký hệ thống
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Stats */}
                {activeTab === 'stats' && (
                    <div className={styles.tabContent}>
                        <div className={styles.card}>
                            <div className={styles.cardBody}>
                                <p>Tính năng Thống kê chi tiết đang được phát triển...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab History */}
                {activeTab === 'history' && (
                    <div className={styles.tabContent}>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <i className="fas fa-history"></i>
                                <h3>Lịch sử hoạt động</h3>
                            </div>
                            <div className={styles.cardBody}>
                                {loadingLogs ? (
                                    <p>Đang tải nhật ký...</p>
                                ) : logs.length === 0 ? (
                                    <p>Chưa có lịch sử hoạt động nào.</p>
                                ) : (
                                    <div className={styles.timeline}>
                                        {logs.map(log => (
                                            <div key={log.id} className={styles.timelineItem}>
                                                <div className={styles.timelineIcon}>
                                                    <i className={log.action === 'CREATE' ? 'fas fa-plus' : log.action === 'UPDATE' ? 'fas fa-pencil-alt' : 'fas fa-trash-alt'}></i>
                                                </div>
                                                <div className={styles.timelineContent}>
                                                    <div className={styles.timelineHeader}>
                                                        <strong>{log.user?.fullName || log.user?.username || 'Hệ thống'}</strong>
                                                        <span className={styles.timelineAction}>
                                                            {log.action === 'CREATE' ? 'tạo mới' : log.action === 'UPDATE' ? 'cập nhật' : 'đã vô hiệu hóa'}
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
                                
                                {/* Phân trang */}
                                {logsTotalPages > 1 && (
                                    <div className={styles.pagination}>
                                        <button 
                                            disabled={logsPage === 0} 
                                            onClick={() => fetchLogs(logsPage - 1)}
                                            className={styles.pageBtn}
                                        >
                                            Trước
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
                    © 2026 Duy Long Computer - Hệ thống quản lý kho v2.4.1
                </div>

                {/* Modal Edit */}
                <WarehouseFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaveModal}
                    isEdit={true}
                    initialData={warehouse}
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
