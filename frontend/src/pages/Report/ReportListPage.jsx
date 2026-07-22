import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import { getWarehouses } from '../../api/warehouseApi';
import {
    getInventoryBalanceReport,
    getStockLedgerReport,
    getStockTransferReport,
    getDebtReport,
    getInventorySummaryReport,
    exportReportExcel
} from '../../api/reportApi';
import styles from './ReportListPage.module.css';

const MOCK_CATEGORIES = [
    {
        id: 'favorites',
        title: 'BÃ¡o cÃ¡o yÃªu thÃ­ch',
        icon: 'fas fa-star',
        reports: [
            { id: 'inventory-summary', name: 'Tá»•ng há»£p tá»“n kho (Nháº­p - Xuáº¥t - Tá»“n)', desc: 'Theo dÃµi chi tiáº¿t lÆ°á»£ng nháº­p, xuáº¥t vÃ  tá»“n cá»§a váº­t tÆ° hÃ ng hÃ³a trong ká»³.' },
            { id: 'stock-ledger', name: 'Sá»• chi tiáº¿t váº­t tÆ° hÃ ng hÃ³a', desc: 'Xem chi tiáº¿t cÃ¡c chá»©ng tá»« nháº­p xuáº¥t phÃ¡t sinh cá»§a tá»«ng hÃ ng hÃ³a.' }
        ]
    },
    {
        id: 'inventory-reports',
        title: 'BÃ¡o cÃ¡o tá»•ng há»£p tá»“n kho',
        icon: 'fas fa-boxes-stacked',
        reports: [
            { id: 'inventory-summary', name: 'Tá»•ng há»£p tá»“n kho (Nháº­p - Xuáº¥t - Tá»“n)', desc: 'Theo dÃµi lÆ°á»£ng nháº­p, xuáº¥t vÃ  sá»‘ dÆ° cuá»‘i ká»³ theo kho hoáº·c toÃ n há»‡ thá»‘ng.' },
            { id: 'inventory-balance', name: 'BÃ¡o cÃ¡o tá»“n kho hiá»‡n táº¡i', desc: 'BÃ¡o cÃ¡o sá»‘ lÆ°á»£ng vÃ  giÃ¡ trá»‹ tá»“n kho hiá»‡n thá»i cá»§a váº­t tÆ°.' }
        ]
    },
    {
        id: 'detailed-reports',
        title: 'BÃ¡o cÃ¡o chi tiáº¿t kho',
        icon: 'fas fa-list-ul',
        reports: [
            { id: 'stock-ledger', name: 'Sá»• chi tiáº¿t váº­t tÆ° hÃ ng hÃ³a', desc: 'Theo dÃµi lá»‹ch sá»­ nháº­p xuáº¥t, sá»‘ dÆ° cá»§a tá»«ng mÃ£ hÃ ng theo ngÃ y.' },
            { id: 'stock-transfers', name: 'BÃ¡o cÃ¡o chuyá»ƒn kho ná»™i bá»™', desc: 'Tá»•ng há»£p danh sÃ¡ch cÃ¡c láº§n luÃ¢n chuyá»ƒn hÃ ng hÃ³a giá»¯a cÃ¡c kho.' }
        ]
    },
    {
        id: 'debt-reports',
        title: 'BÃ¡o cÃ¡o Ä‘á»‘i chiáº¿u & cÃ´ng ná»£',
        icon: 'fas fa-file-invoice-dollar',
        reports: [
            { id: 'debt', name: 'BÃ¡o cÃ¡o cÃ´ng ná»£ Ä‘á»‘i tÃ¡c (KhÃ¡ch hÃ ng / NhÃ  cung cáº¥p)', desc: 'Xem sá»‘ dÆ° ná»£ Ä‘áº§u ká»³, phÃ¡t sinh tÄƒng/giáº£m vÃ  ná»£ cuá»‘i ká»³ cá»§a Ä‘á»‘i tÃ¡c.' }
        ]
    }
];

const ReportListPage = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('favorite_reports');
        return saved ? JSON.parse(saved) : ['inventory-summary', 'stock-ledger'];
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('vi');

    // Report selection and display states
    const [activeReport, setActiveReport] = useState(null); // The report definition currently selected
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'

    // Filter inputs
    const [filters, setFilters] = useState({
        warehouseId: '',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        search: '',
        partnerType: 'ALL', // ALL, CUSTOMER, SUPPLIER
        status: ''
    });

    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, 400);
        return () => clearTimeout(timer);
    }, [filters.search]);

    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    // Fetch warehouses for filters
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const res = await getWarehouses({ size: 100 });
                const content = res.data?.data?.content || res.data?.content || [];
                setWarehouses(content);
            } catch (err) {
                console.error('Lá»—i táº£i danh sÃ¡ch kho:', err);
            }
        };
        fetchWarehouses();
    }, []);

    // Save favorites to localStorage
    const toggleFavorite = (reportId, e) => {
        e.stopPropagation();
        setFavorites((prev) => {
            const updated = prev.includes(reportId)
                ? prev.filter((id) => id !== reportId)
                : [...prev, reportId];
            localStorage.setItem('favorite_reports', JSON.stringify(updated));
            return updated;
        });
        showToast('success', 'ÄÃ£ cáº­p nháº­t bÃ¡o cÃ¡o yÃªu thÃ­ch.');
    };

    // Open report view page
    const handleReportClick = (report) => {
        setActiveReport(report);
        setViewMode('detail');
    };

    // Submit report query
    const handleViewReport = async () => {
        if (!activeReport) return;
        setLoading(true);

        try {
            // Prepare query parameters (append start/end time if API expects ISO Date Time)
            const params = {
                search: filters.search.trim() || undefined,
                warehouseId: filters.warehouseId ? Number(filters.warehouseId) : undefined
            };

            if (filters.startDate) {
                params.startDate = `${filters.startDate}T00:00:00`;
            }
            if (filters.endDate) {
                params.endDate = `${filters.endDate}T23:59:59`;
            }

            let response;
            switch (activeReport.id) {
                case 'inventory-summary':
                    response = await getInventorySummaryReport(params);
                    break;
                case 'inventory-balance':
                    response = await getInventoryBalanceReport({
                        search: params.search,
                        warehouseId: params.warehouseId
                    });
                    break;
                case 'stock-ledger':
                    response = await getStockLedgerReport(params);
                    break;
                case 'stock-transfers':
                    params.status = filters.status || undefined;
                    response = await getStockTransferReport(params);
                    break;
                case 'debt':
                    params.partnerType = filters.partnerType !== 'ALL' ? filters.partnerType : undefined;
                    response = await getDebtReport(params);
                    break;
                default:
                    throw new Error('Loáº¡i bÃ¡o cÃ¡o khÃ´ng há»£p lá»‡');
            }

            const data = response.data?.data || response.data || [];
            setReportData(data);
        } catch (err) {
            console.error('Lá»—i khi láº¥y dá»¯ liá»‡u bÃ¡o cÃ¡o:', err);
            showToast('error', err.response?.data?.userMessage || 'KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u bÃ¡o cÃ¡o.');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch data on switching to a report or changing filters
    useEffect(() => {
        if (viewMode === 'detail' && activeReport) {
             
            handleViewReport();
        }
         
    }, [viewMode, activeReport, filters.warehouseId, filters.startDate, filters.endDate, filters.partnerType, filters.status, debouncedSearch]);

    // Format utility functions
    const formatCurrency = (val) => {
        if (val === undefined || val === null) return '0';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatQuantity = (val) => {
        if (val === undefined || val === null) return '0';
        return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        }).format(val);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    // Export to Excel
    const handleExport = async () => {
        if (!reportData || reportData.length === 0) {
            showToast('warning', 'KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ xuáº¥t.');
            return;
        }
        
        try {
            const params = {
                search: filters.search.trim() || undefined,
                warehouseId: filters.warehouseId ? Number(filters.warehouseId) : undefined
            };

            if (filters.startDate) {
                params.startDate = `${filters.startDate}T00:00:00`;
            }
            if (filters.endDate) {
                params.endDate = `${filters.endDate}T23:59:59`;
            }

            if (activeReport.id === 'stock-transfers') {
                params.status = filters.status || undefined;
            } else if (activeReport.id === 'debt') {
                params.partnerType = filters.partnerType !== 'ALL' ? filters.partnerType : undefined;
            }

            await exportReportExcel(activeReport.id, params);
            showToast('success', 'Xuáº¥t Excel bÃ¡o cÃ¡o thÃ nh cÃ´ng.');
        } catch (error) {
            console.error('Lá»—i xuáº¥t Excel:', error);
            showToast('error', 'CÃ³ lá»—i xáº£y ra khi xuáº¥t Excel bÃ¡o cÃ¡o!');
        }
    };

    // Filter report categories by Search Term
    const filteredCategories = MOCK_CATEGORIES.map((cat) => {
        // Resolve actual reports for favorites category
        let reportsList = cat.reports;
        if (cat.id === 'favorites') {
            reportsList = MOCK_CATEGORIES.flatMap((c) => c.reports).filter((rep) => favorites.includes(rep.id));
            // De-duplicate just in case
            reportsList = reportsList.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
        }

        const matchedReports = reportsList.filter(
            (r) =>
                r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.desc.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return { ...cat, reports: matchedReports };
    }).filter((cat) => cat.reports.length > 0);

    return (
        <AdminLayout>
            <Toast
                isVisible={toast.isVisible}
                type={toast.type}
                message={toast.message}
                onClose={() => setToast((current) => ({ ...current, isVisible: false }))}
            />

            <div className={styles.container}>
                {viewMode === 'list' ? (
                    <>
                        {/* Header bar */}
                        <div className={styles.header}>
                            <div className={styles.titleArea}>
                                <h2>BÃ¡o cÃ¡o</h2>
                                <span className={styles.subtitle}>Tá»•ng há»£p dá»¯ liá»‡u tá»“n kho, xuáº¥t nháº­p vÃ  Ä‘á»‘i chiáº¿u cÃ´ng ná»£ cá»§a há»‡ thá»‘ng.</span>
                            </div>

                            <div className={styles.headerRight}>
                                <div className={styles.languageSelect}>
                                    <label>NgÃ´n ngá»¯ bÃ¡o cÃ¡o</label>
                                    <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
                                        <option value="vi">Tiáº¿ng Viá»‡t</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Filter and search controls */}
                        <div className={styles.toolbar}>
                            <div className={styles.searchBox}>
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="TÃ¬m kiáº¿m theo tÃªn hoáº·c mÃ´ táº£ bÃ¡o cÃ¡o..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <i className={`fas fa-times ${styles.clearIcon}`} onClick={() => setSearchTerm('')}></i>
                                )}
                            </div>
                        </div>

                        {/* Report Categories Grid */}
                        <div className={styles.categoriesGrid}>
                            {filteredCategories.length === 0 ? (
                                <div className={styles.noResults}>
                                    <i className="fas fa-search-minus"></i>
                                    <p>KhÃ´ng tÃ¬m tháº¥y bÃ¡o cÃ¡o nÃ o phÃ¹ há»£p vá»›i tÃ¬m kiáº¿m cá»§a báº¡n.</p>
                                </div>
                            ) : (
                                filteredCategories.map((category) => (
                                    <div key={category.id} className={styles.categoryCard}>
                                        <div className={styles.categoryHeader}>
                                            <i className={`${category.icon} ${styles.categoryIcon}`}></i>
                                            <h3>{category.title}</h3>
                                        </div>
                                        <div className={styles.reportsList}>
                                            {category.reports.map((report) => (
                                                <div
                                                    key={report.id}
                                                    className={styles.reportRow}
                                                    onClick={() => handleReportClick(report)}
                                                >
                                                    <div className={styles.reportInfo}>
                                                        <span className={styles.reportName}>{report.name}</span>
                                                        <p className={styles.reportDesc}>{report.desc}</p>
                                                    </div>
                                                    <div className={styles.rowActions}>
                                                        <button
                                                            className={styles.starBtn}
                                                            onClick={(e) => toggleFavorite(report.id, e)}
                                                            title={favorites.includes(report.id) ? 'Bá» yÃªu thÃ­ch' : 'YÃªu thÃ­ch'}
                                                        >
                                                            <i className={`${favorites.includes(report.id) ? 'fas' : 'far'} fa-star ${styles.starIcon}`}></i>
                                                        </button>
                                                        <i className="fas fa-chevron-right className={styles.chevronIcon}"></i>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    activeReport && (
                        <div className={styles.detailContainer}>
                            {/* Back Header */}
                            <div className={styles.backHeader}>
                                <button className={styles.backBtn} onClick={() => { setViewMode('list'); setReportData([]); }}>
                                    <i className="fas fa-arrow-left"></i> Quay láº¡i danh sÃ¡ch bÃ¡o cÃ¡o
                                </button>
                            </div>

                            {/* Report Title */}
                            <div className={styles.header} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                <div className={styles.titleArea}>
                                    <h2>{activeReport.name}</h2>
                                    <span className={styles.subtitle}>{activeReport.desc}</span>
                                </div>
                            </div>

                            {/* In-page Filter Bar */}
                            <div className={styles.filterBar}>
                                {/* Warehouse Filter */}
                                {activeReport.id !== 'debt' && (
                                    <div className={styles.filterGroup}>
                                        <label>Kho chá»©a</label>
                                        <select
                                            className={styles.filterSelect}
                                            value={filters.warehouseId}
                                            onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                                        >
                                            <option value="">Táº¥t cáº£ kho</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>{w.warehouseCode} - {w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Date range filters */}
                                {activeReport.id !== 'inventory-balance' && (
                                    <>
                                        <div className={styles.filterGroup}>
                                            <label>Tá»« ngÃ y</label>
                                            <input
                                                type="date"
                                                className={styles.filterInput}
                                                value={filters.startDate}
                                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.filterGroup}>
                                            <label>Äáº¿n ngÃ y</label>
                                            <input
                                                type="date"
                                                className={styles.filterInput}
                                                value={filters.endDate}
                                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Partner Type Filter */}
                                {activeReport.id === 'debt' && (
                                    <div className={styles.filterGroup}>
                                        <label>Loáº¡i Ä‘á»‘i tÃ¡c</label>
                                        <select
                                            className={styles.filterSelect}
                                            value={filters.partnerType}
                                            onChange={(e) => setFilters({ ...filters, partnerType: e.target.value })}
                                        >
                                            <option value="ALL">Táº¥t cáº£ Ä‘á»‘i tÃ¡c</option>
                                            <option value="CUSTOMER">KhÃ¡ch hÃ ng</option>
                                            <option value="SUPPLIER">NhÃ  cung cáº¥p</option>
                                        </select>
                                    </div>
                                )}

                                {/* Status Filter */}
                                {activeReport.id === 'stock-transfers' && (
                                    <div className={styles.filterGroup}>
                                        <label>Tráº¡ng thÃ¡i</label>
                                        <select
                                            className={styles.filterSelect}
                                            value={filters.status}
                                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        >
                                            <option value="">Táº¥t cáº£</option>
                                            <option value="COMPLETED">HoÃ n thÃ nh</option>
                                            <option value="PENDING">Chá» duyá»‡t</option>
                                            <option value="CANCELLED">ÄÃ£ há»§y</option>
                                        </select>
                                    </div>
                                )}

                                {/* Search keyword filter */}
                                <div className={styles.filterGroup}>
                                    <label>TÃ¬m máº·t hÃ ng</label>
                                    <input
                                        type="text"
                                        className={styles.filterInput}
                                        placeholder="Nháº­p tÃªn, mÃ£..."
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleViewReport(); }}
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    />
                                </div>

                                {/* Actions */}
                                <button className={styles.btnView} onClick={handleViewReport}>
                                    <i className="fas fa-sync-alt"></i> Xem bÃ¡o cÃ¡o
                                </button>

                                <button className={styles.btnExport} onClick={handleExport}>
                                    <i className="fas fa-file-excel" style={{ color: 'var(--color-excel)' }}></i> Xuáº¥t Excel
                                </button>

                                <button className={styles.btnPrint} onClick={() => window.print()}>
                                    <i className="fas fa-print"></i> In áº¥n
                                </button>
                            </div>

                            {/* Report Results Content */}
                            <div className="report-results-view" style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border-soft)' }}>
                                <div className={styles.reportMetadataHeader}>
                                    <h4>Duy Long Computer Warehouse</h4>
                                    <p><strong>Ká»³ bÃ¡o cÃ¡o:</strong> {activeReport.id !== 'inventory-balance' ? `Tá»« ${formatDate(filters.startDate)} Ä‘áº¿n ${formatDate(filters.endDate)}` : 'TÃ­nh Ä‘áº¿n thá»i Ä‘iá»ƒm hiá»‡n táº¡i'}</p>
                                    {filters.warehouseId && <p><strong>Kho:</strong> {warehouses.find(w => w.id === Number(filters.warehouseId))?.name}</p>}
                                </div>

                                {loading ? (
                                    <div className={styles.loadingSpinnerContainer}>
                                        <div className={styles.spinner}></div>
                                        <p>Äang láº­p bÃ¡o cÃ¡o. Vui lÃ²ng chá» trong giÃ¢y lÃ¡t...</p>
                                    </div>
                                ) : reportData.length === 0 ? (
                                    <div className={styles.noDataContainer}>
                                        <i className="fas fa-folder-open"></i>
                                        <p>KhÃ´ng cÃ³ dá»¯ liá»‡u phÃ¹ há»£p vá»›i bá»™ lá»c Ä‘Ã£ chá»n.</p>
                                    </div>
                                ) : (
                                    <div className={styles.reportTableContainer}>
                                        {/* 1. INVENTORY SUMMARY REPORT */}
                                        {activeReport.id === 'inventory-summary' && (
                                            <table className={`${styles.reportTable} ${styles.summaryTable}`}>
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2">Kho</th>
                                                        <th rowSpan="2">MÃ£ hÃ ng</th>
                                                        <th rowSpan="2">TÃªn hÃ ng</th>
                                                        <th rowSpan="2">ÄVT</th>
                                                        <th colSpan="2" className={styles.textCenter}>Tá»“n Ä‘áº§u ká»³</th>
                                                        <th colSpan="2" className={styles.textCenter}>Nháº­p trong ká»³</th>
                                                        <th colSpan="2" className={styles.textCenter}>Xuáº¥t trong ká»³</th>
                                                        <th colSpan="2" className={styles.textCenter}>Tá»“n cuá»‘i ká»³</th>
                                                    </tr>
                                                    <tr>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng</th>
                                                        <th className={styles.textRight}>GiÃ¡ trá»‹</th>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng</th>
                                                        <th className={styles.textRight}>GiÃ¡ trá»‹</th>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng</th>
                                                        <th className={styles.textRight}>GiÃ¡ trá»‹</th>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng</th>
                                                        <th className={styles.textRight}>GiÃ¡ trá»‹</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{item.warehouseName || '-'}</td>
                                                            <td className={styles.fontSemibold}>{item.productCode}</td>
                                                            <td>{item.productName}</td>
                                                            <td>{item.unitName || '-'}</td>
                                                            <td className={styles.textRight}>{formatQuantity(item.openingQuantity)}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.openingValue)}</td>
                                                            <td className={styles.textRight}>{formatQuantity(item.receiptQuantity)}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.receiptValue)}</td>
                                                            <td className={styles.textRight}>{formatQuantity(item.issueQuantity)}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.issueValue)}</td>
                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: 'var(--misa-primary)' }}>{formatQuantity(item.endingQuantity)}</td>
                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`}>{formatCurrency(item.endingValue)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* 2. INVENTORY BALANCE REPORT */}
                                        {activeReport.id === 'inventory-balance' && (
                                            <table className={styles.reportTable}>
                                                <thead>
                                                    <tr>
                                                        <th>MÃ£ hÃ ng</th>
                                                        <th>TÃªn hÃ ng</th>
                                                        <th>ÄÆ¡n vá»‹ tÃ­nh</th>
                                                        <th>Kho chá»©a</th>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng tá»“n</th>
                                                        <th className={styles.textRight}>GiÃ¡ trá»‹ tá»“n</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className={styles.fontSemibold}>{item.itemCode}</td>
                                                            <td>{item.itemName}</td>
                                                            <td>{item.unitName || '-'}</td>
                                                            <td>{item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : '-'}</td>
                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: 'var(--color-success)' }}>{formatQuantity(item.totalQuantity)}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.totalValue)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* 3. STOCK LEDGER REPORT */}
                                        {activeReport.id === 'stock-ledger' && (
                                            <table className={styles.reportTable}>
                                                <thead>
                                                    <tr>
                                                        <th>NgÃ y CT</th>
                                                        <th>Sá»‘ chá»©ng tá»«</th>
                                                        <th>Loáº¡i CT</th>
                                                        <th>MÃ£ hÃ ng</th>
                                                        <th>TÃªn hÃ ng</th>
                                                        <th>Kho</th>
                                                        <th>ÄVT</th>
                                                        <th className={styles.textRight}>ÄÆ¡n giÃ¡</th>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng nháº­p</th>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng xuáº¥t</th>
                                                        <th className={styles.textRight}>Tá»“n sau CT</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{formatDate(item.documentDate)}</td>
                                                            <td className={styles.fontSemibold}>{item.documentNumber}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${item.documentType?.includes('NHAP') || item.documentType?.includes('IMPORT') ? styles.badgeImport : styles.badgeExport}`}>
                                                                    {item.documentType}
                                                                </span>
                                                            </td>
                                                            <td>{item.productCode}</td>
                                                            <td>{item.productName}</td>
                                                            <td>{item.warehouseName}</td>
                                                            <td>{item.unitName || '-'}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.unitPrice)}</td>
                                                            <td className={`${styles.textRight} ${styles.textSuccess}`}>{item.quantityIn > 0 ? `+${formatQuantity(item.quantityIn)}` : '-'}</td>
                                                            <td className={`${styles.textRight} ${styles.textDanger}`}>{item.quantityOut > 0 ? `-${formatQuantity(item.quantityOut)}` : '-'}</td>
                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`}>{formatQuantity(item.balanceAfter)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* 4. STOCK TRANSFERS REPORT */}
                                        {activeReport.id === 'stock-transfers' && (
                                            <table className={styles.reportTable}>
                                                <thead>
                                                    <tr>
                                                        <th>NgÃ y CT</th>
                                                        <th>Sá»‘ chá»©ng tá»«</th>
                                                        <th>MÃ£ hÃ ng</th>
                                                        <th>TÃªn hÃ ng</th>
                                                        <th>Kho chuyá»ƒn</th>
                                                        <th>Kho nháº­n</th>
                                                        <th>ÄVT</th>
                                                        <th className={styles.textRight}>Sá»‘ lÆ°á»£ng</th>
                                                        <th className={styles.textRight}>ÄÆ¡n giÃ¡</th>
                                                        <th className={styles.textRight}>ThÃ nh tiá»n</th>
                                                        <th>Tráº¡ng thÃ¡i</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{formatDate(item.documentDate)}</td>
                                                            <td className={styles.fontSemibold}>{item.documentNumber}</td>
                                                            <td>{item.itemCode}</td>
                                                            <td>{item.itemName}</td>
                                                            <td>{item.sourceWarehouse}</td>
                                                            <td>{item.destinationWarehouse}</td>
                                                            <td>{item.unitName}</td>
                                                            <td className={styles.textRight}>{formatQuantity(item.quantity)}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.unitPrice)}</td>
                                                            <td className={styles.textRight}>{formatCurrency(item.amount)}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${item.status === 'COMPLETED' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                                                    {item.status === 'COMPLETED' ? 'HoÃ n thÃ nh' : item.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* 5. DEBT REPORT */}
                                        {activeReport.id === 'debt' && (
                                            <table className={styles.reportTable}>
                                                <thead>
                                                    <tr>
                                                        <th>MÃ£ Ä‘á»‘i tÃ¡c</th>
                                                        <th>TÃªn Ä‘á»‘i tÃ¡c</th>
                                                        <th>PhÃ¢n loáº¡i</th>
                                                        <th className={styles.textRight}>DÆ° Ä‘áº§u ká»³</th>
                                                        <th className={styles.textRight}>PhÃ¡t sinh tÄƒng (Ná»£)</th>
                                                        <th className={styles.textRight}>PhÃ¡t sinh giáº£m (CÃ³)</th>
                                                        <th className={styles.textRight}>DÆ° cuá»‘i ká»³ (Ná»£ cuá»‘i)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className={styles.fontSemibold}>{item.partnerCode}</td>
                                                            <td>{item.partnerName}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${item.partnerType === 'SUPPLIER' ? styles.badgeSupplier : styles.badgeCustomer}`}>
                                                                    {item.partnerType === 'SUPPLIER' ? 'NhÃ  cung cáº¥p' : 'KhÃ¡ch hÃ ng'}
                                                                </span>
                                                            </td>
                                                            <td className={styles.textRight}>{formatCurrency(item.openingBalance)}</td>
                                                            <td className={`${styles.textRight} ${styles.textSuccess}`}>{formatCurrency(item.debitIncrease)}</td>
                                                            <td className={`${styles.textRight} ${styles.textDanger}`}>{formatCurrency(item.creditDecrease)}</td>
                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: item.closingBalance >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                                                                {formatCurrency(item.closingBalance)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>
        </AdminLayout>
    );
};

export default ReportListPage;
