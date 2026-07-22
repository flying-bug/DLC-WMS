import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import * as assemblyApi from '../../api/assemblyOrderApi';
import * as warehouseApi from '../../api/warehouseApi';
import styles from './AssemblyOrderListPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'LÆ°u táº¡m', code: 'info' },
    SUBMITTED: { label: 'HoÃ n thÃ nh', code: 'success' },
    CANCELLED: { label: 'ÄÃ£ há»§y', code: 'danger' }
};

const TYPE_META = {
    ASSEMBLY: 'Láº¯p rÃ¡p',
    DISASSEMBLY: 'ThÃ¡o dá»¡'
};

const DEFAULT_FILTERS = {
    keyword: '',
    orderType: '',
    status: '',
    warehouseId: '',
    fromDate: '',
    toDate: ''
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '---');

function AssemblyOrderListPage() {
    const navigate = useNavigate();
    
    // Data states
    const [orders, setOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Toast
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const loadWarehouses = useCallback(async () => {
        try {
            const response = await warehouseApi.getWarehouses({ page: 0, size: 200 });
            setWarehouses(listFrom(unwrap(response)));
        } catch {
            setWarehouses([]);
        }
    }, []);

    const loadOrders = useCallback(async (currentFilters = filters) => {
        setLoading(true);
        try {
            const response = await assemblyApi.getAssemblyOrders({
                keyword: currentFilters.keyword || undefined,
                orderType: currentFilters.orderType || undefined,
                status: currentFilters.status || undefined,
                warehouseId: currentFilters.warehouseId || undefined,
                fromDate: currentFilters.fromDate || undefined,
                toDate: currentFilters.toDate || undefined
            });
            setOrders(listFrom(unwrap(response)));
            setPage(1); // Reset page on new load
        } catch (err) {
            setOrders([]);
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch lá»‡nh.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadWarehouses();
        loadOrders();
    }, [loadWarehouses, loadOrders]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            loadOrders();
        }
    };

    const warehouseName = (id) => {
        const warehouse = warehouses.find((item) => String(item.id) === String(id));
        return warehouse?.name || warehouse?.warehouseName || (id ? `Kho #${id}` : 'ChÆ°a chá»n');
    };

    // Client-side pagination logic
    const totalElements = orders.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const currentOrders = orders.slice((page - 1) * pageSize, page * pageSize);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <div>
                        <h1 className={styles.pageTitle}>Lá»‹ch sá»­ Láº¯p rÃ¡p / ThÃ¡o dá»¡</h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            Quáº£n lÃ½ cÃ¡c lá»‡nh táº¡o mÃ¡y thÃ nh pháº©m vÃ  rÃ£ linh kiá»‡n.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className={styles.btnOutline} onClick={() => navigate('/assembly-orders/create?type=DISASSEMBLY')}>
                            <i className="bi bi-box-arrow-down"></i> Táº¡o thÃ¡o dá»¡
                        </button>
                        <button className={styles.btnPrimary} onClick={() => navigate('/assembly-orders/create?type=ASSEMBLY')}>
                            <i className="bi bi-plus"></i> Táº¡o láº¯p rÃ¡p
                        </button>
                    </div>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.filterGroup}>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÃŒM KIáº¾M</span>
                            <input
                                type="text"
                                className={styles.filterInput}
                                placeholder="MÃ£ lá»‡nh, BOM, SKU..."
                                value={filters.keyword}
                                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>LOáº I Lá»†NH</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.orderType}
                                onChange={(e) => handleFilterChange('orderType', e.target.value)}
                            >
                                <option value="">Táº¥t cáº£</option>
                                <option value="ASSEMBLY">Láº¯p rÃ¡p</option>
                                <option value="DISASSEMBLY">ThÃ¡o dá»¡</option>
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÃŒNH TRáº NG</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">Táº¥t cáº£</option>
                                {Object.entries(STATUS_META).map(([val, meta]) => (
                                    <option key={val} value={val}>{meta.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>KHO</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.warehouseId}
                                onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
                            >
                                <option value="">Táº¥t cáº£</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name || w.warehouseName}</option>)}
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>Tá»ª NGÃ€Y</span>
                            <input
                                type="date"
                                className={styles.filterInput}
                                value={filters.fromDate}
                                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>Äáº¾N NGÃ€Y</span>
                            <input
                                type="date"
                                className={styles.filterInput}
                                value={filters.toDate}
                                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className={styles.filterActions}>
                        <button className={styles.btnOutline} onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }}>
                            LÃ m má»›i
                        </button>
                        <button className={styles.btnPrimary} onClick={() => loadOrders()}>
                            <i className="bi bi-funnel"></i> Lá»c dá»¯ liá»‡u
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '160px' }}>MÃ£ lá»‡nh</th>
                                <th style={{ width: '120px' }}>Loáº¡i lá»‡nh</th>
                                <th>BOM</th>
                                <th>ThÃ nh pháº©m</th>
                                <th style={{ width: '180px' }}>Kho thá»±c hiá»‡n</th>
                                <th style={{ width: '150px', textAlign: 'center' }}>NgÃ y thá»±c hiá»‡n</th>
                                <th style={{ width: '130px' }}>TÃ¬nh tráº¡ng</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Thao tÃ¡c</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && currentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Äang táº£i dá»¯ liá»‡u...</div>
                                    </td>
                                </tr>
                            ) : currentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`} style={{ fontSize: '32px', color: '#9ca3af', marginBottom: '12px' }}></i>
                                            <div className={styles.emptyText} style={{ color: '#6b7280', fontSize: '14px' }}>KhÃ´ng tÃ¬m tháº¥y lá»‡nh nÃ o</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentOrders.map(item => {
                                    const status = STATUS_META[item.status] || { label: item.status || 'ChÆ°a rÃµ', code: 'info' };
                                    return (
                                        <tr key={item.id} onClick={() => navigate(`/assembly-orders/${item.id}?mode=view`)} style={{ cursor: 'pointer' }}>
                                            <td className={styles.textBlue} style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{item.orderCode}</td>
                                            <td>{TYPE_META[item.orderType] || item.orderType}</td>
                                            <td>{item.bomCode || item.bomName || '---'}</td>
                                            <td>{item.targetName || item.targetSku || '---'}</td>
                                            <td>{warehouseName(item.warehouseId)}</td>
                                            <td style={{ textAlign: 'center' }}>{formatDate(item.executionDate)}</td>
                                            <td>
                                                <span className={`${styles.badge} ${styles['badge' + status.code.charAt(0).toUpperCase() + status.code.slice(1)]}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                                <i 
                                                    className="bi bi-eye" 
                                                    style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                                                    title="Xem chi tiáº¿t" 
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/assembly-orders/${item.id}?mode=view`); }}
                                                ></i>
                                                <i 
                                                    className="bi bi-pencil" 
                                                    style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} 
                                                    title="Cáº­p nháº­t lá»‡nh" 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (item.status === 'SUBMITTED') {
                                                            showToast('error', 'Lá»‡nh Ä‘Ã£ hoÃ n thÃ nh khÃ´ng Ä‘Æ°á»£c phÃ©p chá»‰nh sá»­a.');
                                                        } else {
                                                            navigate(`/assembly-orders/${item.id}?mode=edit`); 
                                                        }
                                                    }}
                                                ></i>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Hiá»ƒn thá»‹</span>
                            <select
                                className="misa-select"
                                style={{ width: '70px', height: '32px', padding: '0 8px' }}
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span>trÃªn tá»•ng sá»‘ {totalElements} báº£n ghi</span>
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pageControls}>
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className={styles.pageBtn}
                                >
                                    <i className="bi bi-chevron-left"></i> TrÆ°á»›c
                                </button>

                                <div className={styles.paginationNumbers}>
                                    {getPageNumbers().map((num, idx) => (
                                        num === page ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                onBlur={(e) => e.target.value = page}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        let p = parseInt(e.target.value, 10);
                                                        if (!isNaN(p)) {
                                                            p = Math.max(1, Math.min(totalPages, p));
                                                            setPage(p);
                                                            e.target.blur();
                                                        } else {
                                                            e.target.value = page;
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span
                                                key={idx}
                                                className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                                                onClick={() => num !== '...' && setPage(num)}
                                            >
                                                {num}
                                            </span>
                                        )
                                    ))}
                                </div>

                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className={styles.pageBtn}
                                >
                                    Sau <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
}

export default AssemblyOrderListPage;
