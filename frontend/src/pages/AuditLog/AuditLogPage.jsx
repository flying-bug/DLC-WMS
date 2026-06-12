import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import styles from './AuditLogPage.module.css';

const MOCK_LOGS = [
    { id: 1, timestamp: '2026-06-12 09:30:15', user: 'admin@duylong.vn', action: 'Đăng nhập hệ thống', module: 'Auth', ip: '192.168.1.15', status: 'Thành công', statusClass: styles.statusSuccess },
    { id: 2, timestamp: '2026-06-12 09:25:40', user: 'manager@duylong.vn', action: 'Cập nhật số lượng sản phẩm SP-RAM-008', module: 'Product', ip: '192.168.1.24', status: 'Thành công', statusClass: styles.statusSuccess },
    { id: 3, timestamp: '2026-06-12 09:15:02', user: 'staff@duylong.vn', action: 'Tạo phiếu xuất kho XK-2024-0012', module: 'ExportSlip', ip: '192.168.1.42', status: 'Thành công', statusClass: styles.statusSuccess },
    { id: 4, timestamp: '2026-06-12 08:55:12', user: 'anonymous_user', action: 'Thử đăng nhập sai mật khẩu', module: 'Auth', ip: '203.113.152.4', status: 'Thất bại', statusClass: styles.statusFail },
    { id: 5, timestamp: '2026-06-12 08:45:00', user: 'admin@duylong.vn', action: 'Phân quyền tài khoản manager@duylong.vn', module: 'Permission', ip: '192.168.1.15', status: 'Thành công', statusClass: styles.statusSuccess },
    { id: 6, timestamp: '2026-06-11 17:30:00', user: 'manager@duylong.vn', action: 'Thêm mới đơn vị tính: Hộp', module: 'Unit', ip: '192.168.1.24', status: 'Thành công', statusClass: styles.statusSuccess },
];

function AuditLogPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState(MOCK_LOGS);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (!term) {
            setLogs(MOCK_LOGS);
        } else {
            const filtered = MOCK_LOGS.filter(log => 
                log.user.toLowerCase().includes(term.toLowerCase()) ||
                log.action.toLowerCase().includes(term.toLowerCase()) ||
                log.module.toLowerCase().includes(term.toLowerCase())
            );
            setLogs(filtered);
        }
    };

    return (
        <div className={styles.page}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a onClick={() => navigate('/users')} className={styles.navLink}>Quản lý người dùng</a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLinkActive}>Nhật ký hệ thống</a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm nhật ký..." 
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <button className={styles.bellBtn}>
                        <i className="bi bi-bell" />
                        <span className={styles.bellDot}></span>
                    </button>
                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Nhật ký hệ thống (Audit Log)</h1>
                        <p className={styles.pageSubtitle}>Theo dõi lịch sử hoạt động, thay đổi cấu hình và đăng nhập của người dùng.</p>
                    </div>
                </div>

                {/* Table Container */}
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Người thực hiện</th>
                                <th>Hành động</th>
                                <th>Phân hệ</th>
                                <th>Địa chỉ IP</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy nhật ký nào.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={styles.tableRow}>
                                        <td className={styles.timeCol}>{log.timestamp}</td>
                                        <td><strong>{log.user}</strong></td>
                                        <td>{log.action}</td>
                                        <td><span className={styles.moduleBadge}>{log.module}</span></td>
                                        <td>{log.ip}</td>
                                        <td><span className={`${styles.statusBadge} ${log.statusClass}`}>{log.status}</span></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>Hiển thị 1 đến {logs.length} của {logs.length} bản ghi</div>
                        <div className={styles.pageControls}>
                            <button className={styles.pageBtn}><i className="bi bi-chevron-left" /></button>
                            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
                            <button className={styles.pageBtn}><i className="bi bi-chevron-right" /></button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AuditLogPage;
