import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import { exportToExcel } from '../../utils/excelExport';
import styles from './AuditLogPage.module.css';

const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return isoString;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    } catch {
        return isoString;
    }
};

const parseDateInput = (value, endOfDay = false) => {
    if (!value || !value.trim()) return null;

    const parts = value.trim().split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
    );

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getActionBadgeClass = (action) => {
    if (!action) return styles.badgeLogin;
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('thÃªm') || lowerAction.includes('táº¡o') || lowerAction.includes('add') || lowerAction.includes('create')) return styles.badgeAdd;
    if (lowerAction.includes('sá»­a') || lowerAction.includes('cáº­p nháº­t') || lowerAction.includes('edit') || lowerAction.includes('update')) return styles.badgeEdit;
    if (lowerAction.includes('xÃ³a') || lowerAction.includes('há»§y') || lowerAction.includes('delete') || lowerAction.includes('remove')) return styles.badgeDelete;
    return styles.badgeLogin;
};

const getModuleLabel = (module) => {
    const moduleLabels = {
        Account: 'TÃ i khoáº£n',
        Auth: 'XÃ¡c thá»±c',
        Product: 'Sáº£n pháº©m',
        Unit: 'ÄÆ¡n vá»‹ tÃ­nh',
        Permission: 'PhÃ¢n quyá»n',
        ExportSlip: 'Phiáº¿u xuáº¥t kho',
        ImportSlip: 'Phiáº¿u nháº­p kho',
        InventoryDocument: 'Chá»©ng tá»« kho',
        User: 'NgÆ°á»i dÃ¹ng',
        Role: 'Vai trÃ²',
        Warehouse: 'Kho hÃ ng',
    };

    return moduleLabels[module] || module || 'Há»‡ thá»‘ng';
};

const fieldLabels = {
    id: 'ID',
    username: 'TÃªn Ä‘Äƒng nháº­p',
    fullName: 'Há» tÃªn',
    email: 'Email',
    phone: 'Sá»‘ Ä‘iá»‡n thoáº¡i',
    status: 'Tráº¡ng thÃ¡i',
    roles: 'Vai trÃ²',
    permissions: 'Quyá»n',
    name: 'TÃªn',
    description: 'MÃ´ táº£',
    productCode: 'MÃ£ sáº£n pháº©m',
    productName: 'TÃªn sáº£n pháº©m',
    productType: 'Loáº¡i sáº£n pháº©m',
    brandId: 'ID thÆ°Æ¡ng hiá»‡u',
    brandName: 'ThÆ°Æ¡ng hiá»‡u',
    categoryId: 'ID danh má»¥c',
    categoryName: 'Danh má»¥c',
    unitId: 'ID Ä‘Æ¡n vá»‹',
    unitName: 'ÄÆ¡n vá»‹ tÃ­nh',
    trackSerial: 'Theo dÃµi serial',
    trackLot: 'Theo dÃµi lÃ´',
    isAssembly: 'Láº¯p rÃ¡p',
    active: 'Hoáº¡t Ä‘á»™ng',
    taxReductionStatus: 'Giáº£m thuáº¿',
    stockQty: 'Tá»“n kho',
    stockValue: 'GiÃ¡ trá»‹ tá»“n',
    imageUrl: 'áº¢nh',
};

const getFieldLabel = (field) => fieldLabels[field] || field;

const formatDetailValue = (value) => {
    if (value === null || value === undefined || value === '') return 'â€”';
    if (typeof value === 'boolean') return value ? 'CÃ³' : 'KhÃ´ng';
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'â€”';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

function AuditLogPage() {
    const navigate = useNavigate();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [fromDateInput, setFromDateInput] = useState('');
    const [toDateInput, setToDateInput] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const fromDate = parseDateInput(fromDateInput);
            const toDate = parseDateInput(toDateInput, true);
            const params = new URLSearchParams({
                page: String(page),
                size: String(size),
            });

            if (debouncedSearch.trim()) params.set('searchTerm', debouncedSearch.trim());
            if (selectedModule) params.set('module', selectedModule);
            if (fromDate) params.set('fromDate', fromDate);
            if (toDate) params.set('toDate', toDate);

            const res = await axiosClient.get(`/audit-logs?${params.toString()}`);
            if (res.data && res.data.success) {
                const { logs: fetchedLogs, totalItems, totalPages: fetchedTotalPages } = res.data.data;
                setLogs(fetchedLogs || []);
                setTotalElements(totalItems || 0);
                setTotalPages(fetchedTotalPages || 0);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [page, size, debouncedSearch, selectedModule, fromDateInput, toDateInput]);

    useEffect(() => {
         
        fetchLogs();
    }, [fetchLogs]);

    const handleExport = () => {
        const headers = ['Thá»i gian', 'NgÆ°á»i dÃ¹ng', 'Thao tÃ¡c', 'PhÃ¢n há»‡', 'Äá»‹a chá»‰ IP'];
        const data = logs.map(log => [
            formatDateTime(log.timestamp),
            log.user,
            log.action,
            getModuleLabel(log.module),
            log.ipAddress || ''
        ]);
        exportToExcel(headers, data, 'Nhat_ky_he_thong');
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setPage(newPage);
        }
    };

    const handleViewDetail = async (logId) => {
        try {
            setDetailLoading(true);
            setDetailError('');
            const res = await axiosClient.get(`/audit-logs/${logId}`);
            if (res.data && res.data.success) {
                setSelectedLog(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching audit log detail:', error);
            setDetailError('KhÃ´ng táº£i Ä‘Æ°á»£c chi tiáº¿t nháº­t kÃ½.');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedLog(null);
        setDetailError('');
    };

    const detailChanges = selectedLog?.detail?.changes || [];
    const detailBefore = selectedLog?.detail?.before || {};
    const detailAfter = selectedLog?.detail?.after || {};
    const fallbackFields = Array.from(new Set([...Object.keys(detailBefore), ...Object.keys(detailAfter)]));

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a onClick={() => navigate('/users')} className={styles.navLink}>Quáº£n lÃ½ ngÆ°á»i dÃ¹ng</a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLinkActive}>Nháº­t kÃ½ há»‡ thá»‘ng</a>
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

            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Nháº­t kÃ½ há»‡ thá»‘ng</h1>
                        <p className={styles.pageSubtitle}>Theo dÃµi vÃ  truy xuáº¥t cÃ¡c hoáº¡t Ä‘á»™ng cá»§a ngÆ°á»i dÃ¹ng trÃªn toÃ n há»‡ thá»‘ng.</p>
                    </div>
                </div>

                <div className={styles.filterContainer}>
                    <div className={styles.filterGroup}>
                        <label>Khoáº£ng thá»i gian</label>
                        <div className={styles.dateRangeFields}>
                            <div className={styles.dateField}>
                                <span>Tá»« ngÃ y</span>
                                <input
                                    type="date"
                                    value={fromDateInput}
                                    onChange={(e) => { setFromDateInput(e.target.value); setPage(0); }}
                                />
                            </div>
                            <div className={styles.dateField}>
                                <span>Äáº¿n ngÃ y</span>
                                <input
                                    type="date"
                                    value={toDateInput}
                                    onChange={(e) => { setToDateInput(e.target.value); setPage(0); }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>PhÃ¢n há»‡</label>
                        <div className={styles.inputWrapper}>
                            <select
                                value={selectedModule}
                                onChange={(e) => { setSelectedModule(e.target.value); setPage(0); }}
                            >
                                <option value="">Táº¥t cáº£</option>
                                <option value="Auth">XÃ¡c thá»±c</option>
                                <option value="Account">TÃ i khoáº£n</option>
                                <option value="Permission">PhÃ¢n quyá»n</option>
                                <option value="Product">Sáº£n pháº©m</option>
                                <option value="Unit">ÄÆ¡n vá»‹ tÃ­nh</option>
                                <option value="ExportSlip">Phiáº¿u xuáº¥t kho</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>NgÆ°á»i dÃ¹ng / TÃ¬m kiáº¿m</label>
                        <div className={styles.inputWrapper}>
                            <i className="bi bi-person-bounding-box"></i>
                            <input
                                type="text"
                                placeholder="TÃ¬m tÃªn, ná»™i dung hoáº·c ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={styles.filterAction}>
                        <button className={styles.btnSearch} onClick={() => { setDebouncedSearch(searchTerm); setPage(0); }}>
                            <i className="bi bi-search"></i> Tra cá»©u
                        </button>
                        <button className={styles.btnSearch} onClick={handleExport} style={{ marginLeft: '10px', backgroundColor: '#10b981' }}>
                            <i className="bi bi-file-earmark-excel"></i> Xuáº¥t Excel
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>THá»œI GIAN</th>
                                <th>NGÆ¯á»œI DÃ™NG</th>
                                <th>THAO TÃC</th>
                                <th>PHÃ‚N Há»†</th>
                                <th>Äá»ŠA CHá»ˆ IP</th>
                                <th>CHI TIáº¾T</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Äang táº£i dá»¯ liá»‡u...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-subtle)' }}>
                                        KhÃ´ng tÃ¬m tháº¥y nháº­t kÃ½ nÃ o.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={styles.tableRow}>
                                        <td className={styles.timeCol}>{formatDateTime(log.timestamp)}</td>
                                        <td className={styles.userCol}>
                                            <div className={styles.userInfo}>
                                                <strong>{log.user}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.actionBadge} ${getActionBadgeClass(log.action)}`}>
                                                {log.action?.toUpperCase() || 'Há»† THá»NG'}
                                            </span>
                                        </td>
                                        <td>{getModuleLabel(log.module)}</td>
                                        <td className={styles.ipCol}>{log.ip || 'N/A'}</td>
                                        <td className={styles.actionCell}>
                                            <button
                                                className={styles.btnView}
                                                onClick={() => handleViewDetail(log.id)}
                                                title="Xem chi tiáº¿t"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div className={styles.totalInfo}>Tá»•ng sá»‘: <b>{totalElements}</b> báº£n ghi</div>
                        <div className={styles.pageControls}>
                            <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
                                <option value={10}>10 báº£n ghi trÃªn 1 trang</option>
                                <option value={20}>20 báº£n ghi trÃªn 1 trang</option>
                                <option value={30}>30 báº£n ghi trÃªn 1 trang</option>
                                <option value={50}>50 báº£n ghi trÃªn 1 trang</option>
                            </select>
                            <span
                                className={`${styles.pageBtn} ${page === 0 ? styles.disabled : ''}`}
                                onClick={() => page > 0 && handlePageChange(page - 1)}
                            >
                                TrÆ°á»›c
                            </span>
                            <span className={styles.currentPage}>{page + 1}</span>
                            <span
                                className={`${styles.pageBtn} ${page >= totalPages - 1 ? styles.disabled : ''}`}
                                onClick={() => page < totalPages - 1 && handlePageChange(page + 1)}
                            >
                                Sau
                            </span>
                        </div>
                    </div>
                </div>
            </main>

            {(selectedLog || detailLoading || detailError) && (
                <div className="misa-modal-overlay" onClick={closeDetail}>
                    <div className="misa-modal" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw', height: '80vh' }}>
                        <div className="misa-modal-header">
                            <div>
                                <h2>Chi tiáº¿t nháº­t kÃ½ thao tÃ¡c</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-light, #64748b)' }}>{selectedLog?.description || 'Äang táº£i chi tiáº¿t nháº­t kÃ½'}</p>
                            </div>
                            <i className="fas fa-times" onClick={closeDetail} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                        </div>

                        {detailLoading ? (
                            <div className={styles.detailEmpty}>Äang táº£i dá»¯ liá»‡u...</div>
                        ) : detailError ? (
                            <div className={styles.detailEmpty}>{detailError}</div>
                        ) : (
                            <div className="misa-modal-body">
                                <section className={styles.detailPanel}>
                                    <h3>ThÃ´ng tin chung</h3>
                                    <dl className={styles.infoList}>
                                        <dt>Thá»i gian</dt>
                                        <dd>{formatDateTime(selectedLog.timestamp)}</dd>
                                        <dt>NgÆ°á»i thá»±c hiá»‡n</dt>
                                        <dd>{selectedLog.user}</dd>
                                        <dt>PhÃ¢n há»‡</dt>
                                        <dd>{getModuleLabel(selectedLog.module)}</dd>
                                        <dt>Thao tÃ¡c</dt>
                                        <dd>{selectedLog.actionType || selectedLog.action}</dd>
                                        <dt>Tráº¡ng thÃ¡i</dt>
                                        <dd>{selectedLog.status}</dd>
                                        <dt>Äá»‹a chá»‰ IP</dt>
                                        <dd>{selectedLog.ip || 'N/A'}</dd>
                                    </dl>
                                </section>

                                <section className={styles.comparePanel}>
                                    <div className={styles.compareTitle}>
                                        <h3>So sÃ¡nh dá»¯ liá»‡u thay Ä‘á»•i</h3>
                                        <span>{selectedLog.detail?.changeCount || detailChanges.length || 0} thay Ä‘á»•i</span>
                                    </div>

                                    {detailChanges.length > 0 ? (
                                        <table className={styles.diffTable}>
                                            <thead>
                                                <tr>
                                                    <th>TrÆ°á»ng</th>
                                                    <th>TrÆ°á»›c khi thay Ä‘á»•i</th>
                                                    <th>Sau khi thay Ä‘á»•i</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailChanges.map((change) => (
                                                    <tr key={change.field}>
                                                        <td>{getFieldLabel(change.field)}</td>
                                                        <td>{formatDetailValue(change.before)}</td>
                                                        <td>{formatDetailValue(change.after)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : fallbackFields.length > 0 ? (
                                        <table className={styles.diffTable}>
                                            <thead>
                                                <tr>
                                                    <th>TrÆ°á»ng</th>
                                                    <th>TrÆ°á»›c khi thay Ä‘á»•i</th>
                                                    <th>Sau khi thay Ä‘á»•i</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fallbackFields.map((field) => (
                                                    <tr key={field}>
                                                        <td>{getFieldLabel(field)}</td>
                                                        <td>{formatDetailValue(detailBefore[field])}</td>
                                                        <td>{formatDetailValue(detailAfter[field])}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className={styles.detailEmpty}>Nháº­t kÃ½ nÃ y chÆ°a cÃ³ dá»¯ liá»‡u trÆ°á»›c/sau.</div>
                                    )}

                                    {selectedLog.detail?.note && (
                                        <div className={styles.noteBox}>
                                            <strong>Ghi chÃº há»‡ thá»‘ng</strong>
                                            <span>{selectedLog.detail.note}</span>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuditLogPage;
