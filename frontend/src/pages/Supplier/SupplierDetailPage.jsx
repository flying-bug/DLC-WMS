import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './SupplierDetailPage.module.css';

const SupplierDetailPage = () => {
    const navigate = useNavigate();

    return (
        <AdminLayout>
            <div className={styles.container}>
                
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <div className={styles.backLink} onClick={() => navigate('/suppliers')}>
                            <i className="fas fa-arrow-left"></i> Tất cả danh mục
                            <span className={styles.breadcrumbSeparator}>|</span>
                            <span className={styles.breadcrumbText}>Chi tiết nhà cung cấp</span>
                        </div>
                        <h2 className={styles.supplierName}>CÔNG TY TNHH CÔNG NGHIỆP H VIỆT NAM</h2>
                        <div className={styles.badgeRow}>
                            <div className={styles.badgeGray}># 0106242834</div>
                            <div className={styles.badgeStatus}>
                                <i className="fas fa-check-circle"></i> Đang hoạt động
                            </div>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.btnOutline}>
                            <i className="fas fa-pen"></i> Chỉnh sửa
                        </button>
                        <button className={styles.btnDanger}>
                            <i className="far fa-trash-alt"></i> Xóa
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className={styles.kpiContainer}>
                    <div className={`${styles.kpiCard} ${styles.kpiBorderRed}`}>
                        <div className={styles.kpiLeft}>
                            <div className={styles.kpiLabel}>Nợ quá hạn</div>
                            <div className={styles.kpiNumber}>0 VNĐ</div>
                        </div>
                        <div className={styles.kpiRight}>
                            <i className="fas fa-exclamation-circle"></i>
                        </div>
                    </div>
                    
                    <div className={`${styles.kpiCard} ${styles.kpiBorderBlue}`}>
                        <div className={styles.kpiLeft}>
                            <div className={styles.kpiLabel}>Tổng nợ phải trả</div>
                            <div className={styles.kpiNumber}>15.500.000 VNĐ</div>
                        </div>
                        <div className={styles.kpiRight}>
                            <i className="fas fa-wallet"></i>
                        </div>
                    </div>

                    <div className={`${styles.kpiCard} ${styles.kpiBorderTeal}`}>
                        <div className={styles.kpiLeft}>
                            <div className={styles.kpiLabel}>Đã thanh toán (30 ngày)</div>
                            <div className={styles.kpiNumber}>42.200.000 VNĐ</div>
                        </div>
                        <div className={styles.kpiRight}>
                            <i className="fas fa-money-bill-wave"></i>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <div className={`${styles.tab} ${styles.tabActive}`}>Thông tin chung</div>
                    <div className={styles.tab}>Lịch sử giao dịch</div>
                    <div className={styles.tab}>Công nợ chi tiết</div>
                    <div className={styles.tab}>Tệp đính kèm (0)</div>
                </div>

                {/* Content Grid */}
                <div className={styles.contentGrid}>
                    
                    {/* Left Column */}
                    <div className={styles.colLeft}>
                        {/* Basic Info Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <i className={`fas fa-info-circle ${styles.cardIcon}`}></i>
                                <h3 className={styles.cardTitle}>Thông tin cơ bản</h3>
                            </div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem} style={{ gridColumn: '1 / span 1' }}>
                                    <div className={styles.infoLabel}>Tên nhà cung cấp</div>
                                    <div className={styles.infoValueBold}>CÔNG TY TNHH CÔNG NGHIỆP H VIỆT NAM</div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>Mã nhà cung cấp</div>
                                    <div className={styles.infoValue}>0106242834</div>
                                </div>
                                
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>Mã số thuế</div>
                                    <div className={styles.infoValue}>0106242834</div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>Điện thoại</div>
                                    <div className={styles.infoValue}>024 3367 0218</div>
                                </div>

                                <div className={styles.infoItem} style={{ gridColumn: '1 / span 2' }}>
                                    <div className={styles.infoLabel}>Địa chỉ</div>
                                    <div className={styles.infoValue}>Đội 3, thôn Hoàng Xá, Xã Thạch Thất, TP Hà Nội</div>
                                </div>

                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>Lĩnh vực kinh doanh</div>
                                    <div className={styles.infoValue}>Sản xuất linh kiện máy tính, phụ kiện ngoại vi</div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoLabel}>Ngày tạo</div>
                                    <div className={styles.infoValue}>15/02/2023</div>
                                </div>
                            </div>
                        </div>

                        {/* Contacts Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <i className={`fas fa-address-book ${styles.cardIcon}`}></i>
                                <h3 className={styles.cardTitle}>Người liên hệ</h3>
                            </div>
                            <table className={styles.contactTable}>
                                <thead>
                                    <tr>
                                        <th>Họ và tên</th>
                                        <th>Chức vụ</th>
                                        <th>Số điện thoại</th>
                                        <th>Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Nguyễn Văn An</td>
                                        <td>Trưởng phòng KD</td>
                                        <td>0987 654 321</td>
                                        <td>an.nv@h-vietnam.com</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Trần Thị Bình</td>
                                        <td>Kế toán trưởng</td>
                                        <td>0912 345 678</td>
                                        <td>binh.tt@h-vietnam.com</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className={styles.colRight}>
                        {/* Bank Accounts Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <i className={`fas fa-university ${styles.cardIcon}`}></i>
                                <h3 className={styles.cardTitle}>Tài khoản ngân hàng</h3>
                            </div>
                            
                            <div className={styles.bankAccount}>
                                <div className={styles.bankName}>VIETCOMBANK - CHI NHÁNH THẠCH THẤT</div>
                                <div className={styles.bankNumber}>0451 000 999 888</div>
                                <div className={styles.bankHolder}>Chủ TK: CÔNG TY TNHH CONG NGHIEP H VIET NAM</div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </AdminLayout>
    );
};

export default SupplierDetailPage;
