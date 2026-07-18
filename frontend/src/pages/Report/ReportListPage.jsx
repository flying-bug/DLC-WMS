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
        title: 'Báo cáo yêu thích',
        icon: 'fas fa-star',
        reports: [
            { id: 'inventory-summary', name: 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', desc: 'Theo dõi chi tiết lượng nhập, xuất và tồn của vật tư hàng hóa trong kỳ.' },
            { id: 'stock-ledger', name: 'Sổ chi tiết vật tư hàng hóa', desc: 'Xem chi tiết các chứng từ nhập xuất phát sinh của từng hàng hóa.' }
        ]
    },
    {
        id: 'inventory-reports',
        title: 'Báo cáo tổng hợp tồn kho',
        icon: 'fas fa-boxes-stacked',
        reports: [
            { id: 'inventory-summary', name: 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', desc: 'Theo dõi lượng nhập, xuất và số dư cuối kỳ theo kho hoặc toàn hệ thống.' },
            { id: 'inventory-balance', name: 'Báo cáo tồn kho hiện tại', desc: 'Báo cáo số lượng và giá trị tồn kho hiện thời của vật tư.' }
        ]
    },
    {
        id: 'detailed-reports',
        title: 'Báo cáo chi tiết kho',
        icon: 'fas fa-list-ul',
        reports: [
            { id: 'stock-ledger', name: 'Sổ chi tiết vật tư hàng hóa', desc: 'Theo dõi lịch sử nhập xuất, số dư của từng mã hàng theo ngày.' },
            { id: 'stock-transfers', name: 'Báo cáo chuyển kho nội bộ', desc: 'Tổng hợp danh sách các lần luân chuyển hàng hóa giữa các kho.' }
        ]
    },
    {
        id: 'debt-reports',
        title: 'Báo cáo đối chiếu & công nợ',
        icon: 'fas fa-file-invoice-dollar',
        reports: [
            { id: 'debt', name: 'Báo cáo công nợ đối tác (Khách hàng / Nhà cung cấp)', desc: 'Xem số dư nợ đầu kỳ, phát sinh tăng/giảm và nợ cuối kỳ của đối tác.' }
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
                console.error('Lỗi tải danh sách kho:', err);
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
        showToast('success', 'Đã cập nhật báo cáo yêu thích.');
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
                    throw new Error('Loại báo cáo không hợp lệ');
            }

            const data = response.data?.data || response.data || [];
            setReportData(data);
        } catch (err) {
            console.error('Lỗi khi lấy dữ liệu báo cáo:', err);
            showToast('error', err.response?.data?.userMessage || 'Không thể tải dữ liệu báo cáo.');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch data on switching to a report or changing filters
    useEffect(() => {
        if (viewMode === 'detail' && activeReport) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            handleViewReport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            showToast('warning', 'Không có dữ liệu để xuất.');
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
            showToast('success', 'Xuất Excel báo cáo thành công.');
        } catch (error) {
            console.error('Lỗi xuất Excel:', error);
            showToast('error', 'Có lỗi xảy ra khi xuất Excel báo cáo!');
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
                                <h2>Báo cáo</h2>
                                <span className={styles.subtitle}>Tổng hợp dữ liệu tồn kho, xuất nhập và đối chiếu công nợ của hệ thống.</span>
                            </div>

                            <div className={styles.headerRight}>
                                <div className={styles.languageSelect}>
                                    <label>Ngôn ngữ báo cáo</label>
                                    <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
                                        <option value="vi">Tiếng Việt</option>
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
                                    placeholder="Tìm kiếm theo tên hoặc mô tả báo cáo..."
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
                                    <p>Không tìm thấy báo cáo nào phù hợp với tìm kiếm của bạn.</p>
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
                                                            title={favorites.includes(report.id) ? 'Bỏ yêu thích' : 'Yêu thích'}
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
                                    <i className="fas fa-arrow-left"></i> Quay lại danh sách báo cáo
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
                                        <label>Kho chứa</label>
                                        <select
                                            className={styles.filterSelect}
                                            value={filters.warehouseId}
                                            onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                                        >
                                            <option value="">Tất cả kho</option>
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
                                            <label>Từ ngày</label>
                                            <input
                                                type="date"
                                                className={styles.filterInput}
                                                value={filters.startDate}
                                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.filterGroup}>
                                            <label>Đến ngày</label>
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
                                        <label>Loại đối tác</label>
                                        <select
                                            className={styles.filterSelect}
                                            value={filters.partnerType}
                                            onChange={(e) => setFilters({ ...filters, partnerType: e.target.value })}
                                        >
                                            <option value="ALL">Tất cả đối tác</option>
                                            <option value="CUSTOMER">Khách hàng</option>
                                            <option value="SUPPLIER">Nhà cung cấp</option>
                                        </select>
                                    </div>
                                )}

                                {/* Status Filter */}
                                {activeReport.id === 'stock-transfers' && (
                                    <div className={styles.filterGroup}>
                                        <label>Trạng thái</label>
                                        <select
                                            className={styles.filterSelect}
                                            value={filters.status}
                                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        >
                                            <option value="">Tất cả</option>
                                            <option value="COMPLETED">Hoàn thành</option>
                                            <option value="PENDING">Chờ duyệt</option>
                                            <option value="CANCELLED">Đã hủy</option>
                                        </select>
                                    </div>
                                )}

                                {/* Search keyword filter */}
                                <div className={styles.filterGroup}>
                                    <label>Tìm mặt hàng</label>
                                    <input
                                        type="text"
                                        className={styles.filterInput}
                                        placeholder="Nhập tên, mã..."
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleViewReport(); }}
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    />
                                </div>

                                {/* Actions */}
                                <button className={styles.btnView} onClick={handleViewReport}>
                                    <i className="fas fa-sync-alt"></i> Xem báo cáo
                                </button>

                                <button className={styles.btnExport} onClick={handleExport}>
                                    <i className="fas fa-file-excel" style={{ color: 'var(--color-excel)' }}></i> Xuất Excel
                                </button>

                                <button className={styles.btnPrint} onClick={() => window.print()}>
                                    <i className="fas fa-print"></i> In ấn
                                </button>
                            </div>

                            {/* Report Results Content */}
                            <div className="report-results-view" style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border-soft)' }}>
                                <div className={styles.reportMetadataHeader}>
                                    <h4>Duy Long Computer Warehouse</h4>
                                    <p><strong>Kỳ báo cáo:</strong> {activeReport.id !== 'inventory-balance' ? `Từ ${formatDate(filters.startDate)} đến ${formatDate(filters.endDate)}` : 'Tính đến thời điểm hiện tại'}</p>
                                    {filters.warehouseId && <p><strong>Kho:</strong> {warehouses.find(w => w.id === Number(filters.warehouseId))?.name}</p>}
                                </div>

                                {loading ? (
                                    <div className={styles.loadingSpinnerContainer}>
                                        <div className={styles.spinner}></div>
                                        <p>Đang lập báo cáo. Vui lòng chờ trong giây lát...</p>
                                    </div>
                                ) : reportData.length === 0 ? (
                                    <div className={styles.noDataContainer}>
                                        <i className="fas fa-folder-open"></i>
                                        <p>Không có dữ liệu phù hợp với bộ lọc đã chọn.</p>
                                    </div>
                                ) : (
                                    <div className={styles.reportTableContainer}>
                                        {/* 1. INVENTORY SUMMARY REPORT */}
                                        {activeReport.id === 'inventory-summary' && (
                                            <table className={`${styles.reportTable} ${styles.summaryTable}`}>
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2">Kho</th>
                                                        <th rowSpan="2">Mã hàng</th>
                                                        <th rowSpan="2">Tên hàng</th>
                                                        <th rowSpan="2">ĐVT</th>
                                                        <th colSpan="2" className={styles.textCenter}>Tồn đầu kỳ</th>
                                                        <th colSpan="2" className={styles.textCenter}>Nhập trong kỳ</th>
                                                        <th colSpan="2" className={styles.textCenter}>Xuất trong kỳ</th>
                                                        <th colSpan="2" className={styles.textCenter}>Tồn cuối kỳ</th>
                                                    </tr>
                                                    <tr>
                                                        <th className={styles.textRight}>Số lượng</th>
                                                        <th className={styles.textRight}>Giá trị</th>
                                                        <th className={styles.textRight}>Số lượng</th>
                                                        <th className={styles.textRight}>Giá trị</th>
                                                        <th className={styles.textRight}>Số lượng</th>
                                                        <th className={styles.textRight}>Giá trị</th>
                                                        <th className={styles.textRight}>Số lượng</th>
                                                        <th className={styles.textRight}>Giá trị</th>
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
                                                        <th>Mã hàng</th>
                                                        <th>Tên hàng</th>
                                                        <th>Đơn vị tính</th>
                                                        <th>Kho chứa</th>
                                                        <th className={styles.textRight}>Số lượng tồn</th>
                                                        <th className={styles.textRight}>Giá trị tồn</th>
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
                                                        <th>Ngày CT</th>
                                                        <th>Số chứng từ</th>
                                                        <th>Loại CT</th>
                                                        <th>Mã hàng</th>
                                                        <th>Tên hàng</th>
                                                        <th>Kho</th>
                                                        <th>ĐVT</th>
                                                        <th className={styles.textRight}>Đơn giá</th>
                                                        <th className={styles.textRight}>Số lượng nhập</th>
                                                        <th className={styles.textRight}>Số lượng xuất</th>
                                                        <th className={styles.textRight}>Tồn sau CT</th>
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
                                                        <th>Ngày CT</th>
                                                        <th>Số chứng từ</th>
                                                        <th>Mã hàng</th>
                                                        <th>Tên hàng</th>
                                                        <th>Kho chuyển</th>
                                                        <th>Kho nhận</th>
                                                        <th>ĐVT</th>
                                                        <th className={styles.textRight}>Số lượng</th>
                                                        <th className={styles.textRight}>Đơn giá</th>
                                                        <th className={styles.textRight}>Thành tiền</th>
                                                        <th>Trạng thái</th>
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
                                                                    {item.status === 'COMPLETED' ? 'Hoàn thành' : item.status}
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
                                                        <th>Mã đối tác</th>
                                                        <th>Tên đối tác</th>
                                                        <th>Phân loại</th>
                                                        <th className={styles.textRight}>Dư đầu kỳ</th>
                                                        <th className={styles.textRight}>Phát sinh tăng (Nợ)</th>
                                                        <th className={styles.textRight}>Phát sinh giảm (Có)</th>
                                                        <th className={styles.textRight}>Dư cuối kỳ (Nợ cuối)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className={styles.fontSemibold}>{item.partnerCode}</td>
                                                            <td>{item.partnerName}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${item.partnerType === 'SUPPLIER' ? styles.badgeSupplier : styles.badgeCustomer}`}>
                                                                    {item.partnerType === 'SUPPLIER' ? 'Nhà cung cấp' : 'Khách hàng'}
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
