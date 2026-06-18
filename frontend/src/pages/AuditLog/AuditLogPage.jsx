import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import styles from './AuditLogPage.module.css';

const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    } catch {
        return isoString;
    }
};

const getActionBadgeClass = (action) => {
    if (!action) return styles.badgeLogin;
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('thêm') || lowerAction.includes('tạo') || lowerAction.includes('add') || lowerAction.includes('create')) return styles.badgeAdd;
    if (lowerAction.includes('sửa') || lowerAction.includes('cập nhật') || lowerAction.includes('edit') || lowerAction.includes('update')) return styles.badgeEdit;
    if (lowerAction.includes('xóa') || lowerAction.includes('hủy') || lowerAction.includes('delete') || lowerAction.includes('remove')) return styles.badgeDelete;
    return styles.badgeLogin; // Default for things like login, system events
};

function AuditLogPage() {
    const navigate = useNavigate();
    
    // API States
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination state
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filter UI States (Optional API support)
    const [dateRange, setDateRange] = useState('');
    const [selectedModule, setSelectedModule] = useState('Tất cả');

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
        fetchLogs();
    }, [fetchLogs]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setPage(newPage);
        }
    };

    const startItem = totalElements === 0 ? 0 : page * size + 1;
    const endItem = Math.min((page + 1) * size, totalElements);

    // Calculate pagination buttons
    const maxPagesToShow = 5;
    let startPage = Math.max(0, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

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
                        <h1 className={styles.pageTitle}>Nhật ký hệ thống</h1>
                        <p className={styles.pageSubtitle}>Theo dõi và truy xuất các hoạt động của người dùng trên toàn hệ thống.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className={styles.filterContainer}>
                    <div className={styles.filterGroup}>
                        <label>Khoảng thời gian</label>
                        <div className={styles.inputWrapper}>
                            <i className="bi bi-calendar3"></i>
                            <input 
                                type="text" 
                                placeholder="Ví dụ: 20/05/2024 - 27/05/2024"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Phân hệ</label>
                        <div className={styles.inputWrapper}>
                            <select 
                                value={selectedModule}
                                onChange={(e) => setSelectedModule(e.target.value)}
                            >
                                <option value="Tất cả">Tất cả</option>
                                <option value="Kho hàng">Kho hàng</option>
                                <option value="Bán hàng">Bán hàng</option>
                                <option value="Hệ thống">Hệ thống</option>
                                <option value="Người dùng">Người dùng</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Người dùng / Tìm kiếm</label>
                        <div className={styles.inputWrapper}>
                            <i className="bi bi-person-bounding-box"></i>
                            <input 
                                type="text" 
                                placeholder="Tìm tên, nội dung hoặc ID..." 
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>
                    </div>
                    <div className={styles.filterAction}>
                        <button className={styles.btnSearch} onClick={() => setPage(0)}>
                            <i className="bi bi-search"></i> Tra cứu
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>THỜI GIAN</th>
                                <th>NGƯỜI DÙNG</th>
                                <th>THAO TÁC</th>
                                <th>PHÂN HỆ</th>
                                <th>NỘI DUNG CHI TIẾT</th>
                                <th>ĐỊA CHỈ IP</th>
                                <th>CHI TIẾT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                                        <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem', margin: '0 auto', display: 'block' }}>
                                            <span className="visually-hidden">Đang tải dữ liệu...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-subtle)' }}>
                                        Không tìm thấy nhật ký nào.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={styles.tableRow}>
                                        <td className={styles.timeCol}>{formatDateTime(log.timestamp)}</td>
                                        <td className={styles.userCol}>
                                            <div className={styles.userInfo}>
                                                <strong>{log.user}</strong>
                                                {/* API may not provide exact userId like DLC-001, we display user string */}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.actionBadge} ${getActionBadgeClass(log.action)}`}>
                                                {log.action?.toUpperCase() || 'HỆ THỐNG'}
                                            </span>
                                        </td>
                                        <td>{log.module || 'Hệ thống'}</td>
                                        <td className={styles.detailCol}>
                                            {/* Details mapped from old log.action or a new description field */}
                                            {log.details || log.action}
                                        </td>
                                        <td className={styles.ipCol}>{log.ip || 'N/A'}</td>
                                        <td className={styles.actionCell}>
                                            <button className={styles.btnView}>
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            Hiển thị {startItem} - {endItem} trong {totalElements} kết quả &nbsp;&nbsp;&nbsp; 
                            Số dòng mỗi trang: <strong>{size}</strong>
                        </div>
                        <div className={styles.pageControls}>
                            <button 
                                className={styles.pageBtn} 
                                onClick={() => handlePageChange(0)} 
                                disabled={page === 0}
                                style={{ opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                <i className="bi bi-chevron-bar-left" />
                            </button>
                            <button 
                                className={styles.pageBtn} 
                                onClick={() => handlePageChange(page - 1)} 
                                disabled={page === 0}
                                style={{ opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                <i className="bi bi-chevron-left" />
                            </button>
                            
                            {pageNumbers.map(pageNum => (
                                <button 
                                    key={pageNum}
                                    className={`${styles.pageBtn} ${page === pageNum ? styles.pageBtnActive : ''}`}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum + 1}
                                </button>
                            ))}

                            {endPage < totalPages - 1 && (
                                <>
                                    <span className={styles.pageEllipsis}>...</span>
                                    <button 
                                        className={styles.pageBtn} 
                                        onClick={() => handlePageChange(totalPages - 1)}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                            
                            <button 
                                className={styles.pageBtn} 
                                onClick={() => handlePageChange(page + 1)} 
                                disabled={page >= totalPages - 1}
                                style={{ opacity: page >= totalPages - 1 ? 0.5 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <i className="bi bi-chevron-right" />
                            </button>
                            <button 
                                className={styles.pageBtn} 
                                onClick={() => handlePageChange(totalPages - 1)} 
                                disabled={page >= totalPages - 1}
                                style={{ opacity: page >= totalPages - 1 ? 0.5 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <i className="bi bi-chevron-bar-right" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AuditLogPage;
