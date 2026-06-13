import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import styles from './AuditLogPage.module.css';

function AuditLogPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination state
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0); // Reset to first page on search
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/audit-logs?page=${page}&size=${size}&searchTerm=${encodeURIComponent(debouncedSearch)}`);
            if (res.data && res.data.success) {
                const { logs: fetchedLogs, totalItems, totalPages: fetchedTotalPages } = res.data.data;
                setLogs(fetchedLogs || []);
                setTotalElements(totalItems || 0);
                setTotalPages(fetchedTotalPages || 0);
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    }, [page, size, debouncedSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchLogs]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setPage(newPage);
        }
    };

    const handleSizeChange = (e) => {
        setSize(Number(e.target.value));
        setPage(0);
    };

    // Calculate item ranges for pagination description
    const startItem = totalElements === 0 ? 0 : page * size + 1;
    const endItem = Math.min((page + 1) * size, totalElements);

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
                            onChange={handleSearchChange}
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
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                                        <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
                                            <span className="visually-hidden">Đang tải dữ liệu...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                        Không tìm thấy nhật ký nào.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={styles.tableRow}>
                                        <td className={styles.timeCol}>{log.timestamp}</td>
                                        <td><strong>{log.user}</strong></td>
                                        <td>{log.action}</td>
                                        <td><span className={styles.moduleBadge}>{log.module}</span></td>
                                        <td>{log.ip}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${
                                                log.status === 'Thành công' ? styles.statusSuccess : styles.statusFail
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            Hiển thị {startItem} đến {endItem} của {totalElements} bản ghi
                        </div>
                        <div className={styles.pageControls}>
                            <select 
                                value={size} 
                                onChange={handleSizeChange} 
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0',
                                    outline: 'none',
                                    fontSize: '13px',
                                    color: '#475569',
                                    marginRight: '12px',
                                    background: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value={10}>10 bản ghi / trang</option>
                                <option value={20}>20 bản ghi / trang</option>
                                <option value={50}>50 bản ghi / trang</option>
                            </select>
                            <button 
                                className={styles.pageBtn} 
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 0}
                                style={{ opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                <i className="bi bi-chevron-left" />
                            </button>
                            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>
                                {page + 1}
                            </button>
                            <button 
                                className={styles.pageBtn} 
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= totalPages - 1}
                                style={{ opacity: page >= totalPages - 1 ? 0.5 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <i className="bi bi-chevron-right" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AuditLogPage;
