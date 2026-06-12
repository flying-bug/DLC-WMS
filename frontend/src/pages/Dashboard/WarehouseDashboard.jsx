import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './WarehouseDashboard.module.css';

function WarehouseDashboard() {
    const navigate = useNavigate();

    return (
        <AdminLayout activeTab="dashboard">
            <div className={styles.dashboardContainer}>
                {/* Main Process Area */}
                <div className={styles.mainProcess}>
                    <h3 className={styles.sectionTitle}>NGHIỆP VỤ KHO</h3>
                    
                    <div className={styles.processDiagram}>
                        {/* Process Nodes */}
                        <div className={`${styles.node} ${styles.pos1}`}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-file-signature"></i>
                            </div>
                            <span>Lệnh sản xuất</span>
                        </div>

                        <div className={`${styles.node} ${styles.pos2}`}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-tools"></i>
                            </div>
                            <span>Lắp ráp, tháo dỡ</span>
                        </div>

                        <div className={`${styles.node} ${styles.pos3}`} onClick={() => navigate('/export-slips')}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-truck-loading"></i>
                            </div>
                            <span>Xuất kho</span>
                        </div>

                        <div className={`${styles.node} ${styles.pos4}`}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-boxes"></i>
                            </div>
                            <span>Nhập kho</span>
                        </div>

                        <div className={`${styles.node} ${styles.pos5}`}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-exchange-alt"></i>
                            </div>
                            <span>Chuyển kho</span>
                        </div>

                        <div className={`${styles.node} ${styles.pos6}`}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-calculator"></i>
                            </div>
                            <span>Tính giá xuất kho</span>
                        </div>

                        <div className={`${styles.node} ${styles.pos7}`}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-clipboard-check"></i>
                            </div>
                            <span>Kiểm kê</span>
                        </div>

                        {/* Connecting Lines (CSS based) */}
                        <div className={styles.lineVertical1}></div>
                        <div className={styles.lineHorizontalMain}></div>
                        <div className={styles.lineVertical2}></div>
                        <div className={styles.lineVertical3}></div>
                        <div className={styles.lineVertical4}></div>
                    </div>

                    {/* Bottom Toolbar */}
                    <div className={styles.bottomToolbar}>
                        <div className={styles.toolbarItem}>
                            <i className="fas fa-warehouse"></i>
                            <span>Kho</span>
                        </div>
                        <div className={styles.toolbarItem} onClick={() => navigate('/products')}>
                            <i className="fas fa-box"></i>
                            <span>Vật tư hàng hóa</span>
                        </div>
                        <div className={styles.toolbarItem} onClick={() => navigate('/units')}>
                            <i className="fas fa-balance-scale"></i>
                            <span>Đơn vị tính</span>
                        </div>
                        <div className={styles.toolbarItem}>
                            <i className="fas fa-cog"></i>
                            <span>Tiện ích</span>
                        </div>
                        <div className={styles.toolbarItem}>
                            <i className="fas fa-sliders-h"></i>
                            <span>Tùy chọn</span>
                        </div>
                    </div>
                </div>

                {/* Reports Sidebar */}
                <div className={styles.reportsArea}>
                    <h3 className={styles.sectionTitle}>BÁO CÁO</h3>
                    <ul className={styles.reportList}>
                        <li><i className="fas fa-circle"></i> Sổ chi tiết vật tư hàng hóa</li>
                        <li><i className="fas fa-circle"></i> Tổng hợp tồn kho</li>
                        <li><i className="fas fa-circle"></i> Báo cáo đối chiếu giá thành và giá trị nhập kho</li>
                        <li><i className="fas fa-circle"></i> Báo cáo đối chiếu kho và sổ cái</li>
                        <li><i className="fas fa-circle"></i> Báo cáo tiến độ sản xuất</li>
                    </ul>
                    <div className={styles.allReports}>
                        <a href="#" onClick={(e) => e.preventDefault()}>Tất cả báo cáo</a>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export default WarehouseDashboard;
