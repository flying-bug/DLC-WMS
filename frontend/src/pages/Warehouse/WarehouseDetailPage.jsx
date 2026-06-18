import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './WarehouseDetailPage.module.css';

const WarehouseDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('info');

    // Mock data for the warehouse based on the Figma design
    const warehouse = {
        code: id || 'K01',
        name: 'Kho Hà Nội - Chi nhánh chính',
        status: 'ACTIVE',
        address: 'Số 45, Đường Giải Phóng, Quận Hai Bà Trưng, TP. Hà Nội',
        manager: 'Nguyễn Mạnh Hùng',
        branch: 'Hà Nội I',
        createdBy: 'Admin System',
        createdAt: '12/01/2024 - 14:30'
    };

    const handleBack = () => {
        navigate('/warehouses');
    };

    return (
        <AdminLayout activeTab="warehouses">
            <div className={styles.container}>
                {/* 1. Page Header (Mocking the Figma top bar) */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <button className={styles.btnBack} onClick={handleBack} title="Quay lại">
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <h2 className={styles.pageTitle}>Kho Hà Nội ({warehouse.code})</h2>
                        <div className={styles.statusBadge}>
                            <span className={styles.statusDot}></span>
                            Đang hoạt động
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.btnEdit}>
                            <i className="fas fa-pencil-alt"></i> Chỉnh sửa
                        </button>
                        <button className={styles.btnDelete}>
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
                                    <span className={styles.kpiTrend} style={{ color: '#16a34a' }}>+12%</span>
                                </div>
                                <div className={styles.kpiLabel}>Tổng số sản phẩm</div>
                                <div className={styles.kpiValue}>1,425</div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiHeader}>
                                    <div className={styles.kpiIconWrapper} style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
                                        <i className="fas fa-clipboard-list"></i>
                                    </div>
                                    <span className={styles.kpiTrend} style={{ color: '#64748b' }}>Ổn định</span>
                                </div>
                                <div className={styles.kpiLabel}>Tổng tồn kho</div>
                                <div className={styles.kpiValue}>24,890</div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiHeader}>
                                    <div className={styles.kpiIconWrapper} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                        <i className="fas fa-money-bill-wave"></i>
                                    </div>
                                    <span className={styles.kpiTrend} style={{ color: '#16a34a' }}>+5.4%</span>
                                </div>
                                <div className={styles.kpiLabel}>Giá trị tồn kho</div>
                                <div className={styles.kpiValue}>1.25B đ</div>
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
                                                <label>TÀI KHOẢN QUẢN LÝ</label>
                                                <div className={styles.userProfile}>
                                                    <div className={styles.avatar}>
                                                        <img src="https://ui-avatars.com/api/?name=Nguyen+Manh+Hung&background=0D8ABC&color=fff" alt="avatar" />
                                                    </div>
                                                    <p>{warehouse.manager}</p>
                                                </div>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>CHI NHÁNH</label>
                                                <p>{warehouse.branch}</p>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.metaInfoBox}>
                                            <div className={styles.infoItem}>
                                                <label>NGƯỜI TẠO</label>
                                                <p>{warehouse.createdBy}</p>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <label>NGÀY TẠO</label>
                                                <p>{warehouse.createdAt}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className={styles.rightColumn}>
                                {/* Map Card */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeaderFlex}>
                                        <h3>Vị trí thực tế</h3>
                                        <button className={styles.btnZoom}>Phóng to</button>
                                    </div>
                                    <div className={styles.mapContainer}>
                                        {/* Placeholder for map */}
                                        <div className={styles.mapPlaceholder}>
                                            <div className={styles.mapOverlay}>
                                                <div className={styles.mapPin}>
                                                    <i className="fas fa-map-marker-alt"></i>
                                                </div>
                                                <div className={styles.mapInfo}>
                                                    <strong>Tọa độ: 21.0012, 105.8436</strong>
                                                    <span>Hai Bà Trưng, Hà Nội</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Alert Card */}
                                <div className={styles.alertCard}>
                                    <div className={styles.alertHeader}>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <h4>Thông báo khẩn</h4>
                                    </div>
                                    <p className={styles.alertText}>
                                        Có 3 mặt hàng sắp hết hạn tồn kho trong tuần này. Vui lòng kiểm tra danh sách phiếu xuất.
                                    </p>
                                    <button className={styles.btnAlertAction}>
                                        Xem ngay
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.pageFooter}>
                    © 2026 Duy Long Computer - Hệ thống quản lý kho v2.4.1
                </div>
            </div>
        </AdminLayout>
    );
};

export default WarehouseDetailPage;
