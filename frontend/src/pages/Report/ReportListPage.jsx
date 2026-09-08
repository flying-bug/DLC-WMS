import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import { getWarehouses } from '../../api/warehouseApi';
import { getAllPayments } from '../../api/paymentApi';
import { useWorkspaceMode, WORKSPACE_MODES } from '../../contexts/WorkspaceModeContext';
import * as XLSX from 'xlsx';
import {
    getInventoryBalanceReport,
    getStockLedgerReport,
    getStockTransferReport,
    getDebtReport,
    getInventorySummaryReport,
    getSalesProfitReport,
    exportReportExcel
} from '../../api/reportApi';
import styles from './ReportListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { getDateRangePreset, DATE_PRESET_OPTIONS } from '../../utils/datePresets';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import { canViewPricing } from '../../auth/session';

const REPORT_DOMAINS = [
    { id: 'ALL', label: 'Tất cả báo cáo', icon: 'fas fa-th-large' },
    { id: 'WAREHOUSE', label: 'Kho & Hàng hóa', icon: 'fas fa-boxes', role: 'Thủ kho' },
    { id: 'CASHIER', label: 'Quỹ & Dòng tiền', icon: 'fas fa-cash-register', role: 'Thủ quỹ' },
    { id: 'SALES', label: 'Kinh doanh & Bán hàng', icon: 'fas fa-chart-line', role: 'Kinh doanh' },
];

const MOCK_CATEGORIES = [
    {
        id: 'favorites',
        title: 'Báo cáo yêu thích',
        icon: 'fas fa-star',
        domain: 'ALL',
        reports: [
            { id: 'inventory-summary', name: 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', desc: 'Theo dõi chi tiết lượng nhập, xuất và tồn của vật tư hàng hóa trong kỳ.', domain: 'WAREHOUSE' },
            { id: 'cash-flow', name: 'Báo cáo Dòng tiền & Sổ quỹ (Thu - Chi - Tồn)', desc: 'Tổng hợp dòng tiền thu, chi và tồn quỹ theo kỳ, phân loại theo tiền mặt và ngân hàng.', domain: 'CASHIER' }
        ]
    },
    // PHÂN HỆ THỦ KHO
    {
        id: 'inventory-reports',
        title: 'Báo cáo tổng hợp tồn kho',
        icon: 'fas fa-boxes-stacked',
        domain: 'WAREHOUSE',
        roleBadge: 'Thủ kho',
        reports: [
            { id: 'inventory-summary', name: 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', desc: 'Theo dõi lượng nhập, xuất và số dư cuối kỳ theo kho hoặc toàn hệ thống.', domain: 'WAREHOUSE' },
            { id: 'inventory-balance', name: 'Báo cáo tồn kho hiện tại', desc: 'Báo cáo số lượng và giá trị tồn kho hiện thời của vật tư.', domain: 'WAREHOUSE' }
        ]
    },
    {
        id: 'detailed-reports',
        title: 'Báo cáo chi tiết kho & luân chuyển',
        icon: 'fas fa-list-ul',
        domain: 'WAREHOUSE',
        roleBadge: 'Thủ kho',
        reports: [
            { id: 'stock-ledger', name: 'Sổ chi tiết vật tư hàng hóa', desc: 'Theo dõi lịch sử nhập xuất, số dư của từng mã hàng theo ngày.', domain: 'WAREHOUSE' },
            { id: 'stock-transfers', name: 'Báo cáo chuyển kho nội bộ', desc: 'Tổng hợp danh sách các lần luân chuyển hàng hóa giữa các kho.', domain: 'WAREHOUSE' }
        ]
    },
    // PHÂN HỆ THỦ QUỸ / TÀI CHÍNH
    {
        id: 'cash-flow-reports',
        title: 'Báo cáo Quỹ, Thu chi & Dòng tiền',
        icon: 'fas fa-cash-register',
        domain: 'CASHIER',
        roleBadge: 'Thủ quỹ',
        reports: [
            { id: 'cash-flow', name: 'Báo cáo Dòng tiền & Sổ quỹ (Thu - Chi - Tồn quỹ)', desc: 'Tổng hợp toàn bộ dòng tiền vào, dòng tiền ra, tồn quỹ tiền mặt và tài khoản ngân hàng theo kỳ.', domain: 'CASHIER' },
            { id: 'debt', name: 'Báo cáo công nợ đối tác (Khách hàng / Nhà cung cấp)', desc: 'Xem số dư nợ đầu kỳ, phát sinh tăng/giảm và nợ cuối kỳ của từng đối tác.', domain: 'CASHIER' }
        ]
    },
    // PHÂN HỆ KINH DOANH & LỢI NHUẬN
    {
        id: 'sales-reports',
        title: 'Báo cáo Kinh doanh & Lợi nhuận',
        icon: 'fas fa-chart-line',
        domain: 'SALES',
        roleBadge: 'Kinh doanh',
        reports: [
            { id: 'sales-profit', name: 'Báo cáo Doanh thu & Lợi nhuận gộp', desc: 'Thống kê lượng hàng bán ra, tổng doanh thu, giá vốn và lợi nhuận gộp theo từng mặt hàng.', domain: 'SALES' }
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
    const location = useLocation();
    const navigate = useNavigate();
    const { workspaceMode } = useWorkspaceMode();

    const [selectedDomain, setSelectedDomain] = useState(() => {
        const urlParams = new URLSearchParams(location.search);
        const urlDomain = urlParams.get('domain')?.toUpperCase();
        if (urlDomain && ['CASHIER', 'WAREHOUSE', 'SALES'].includes(urlDomain)) return urlDomain;
        if (workspaceMode === WORKSPACE_MODES.CASHIER) return 'CASHIER';
        if (workspaceMode === WORKSPACE_MODES.WAREHOUSE) return 'WAREHOUSE';
        return 'ALL';
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const urlDomain = urlParams.get('domain')?.toUpperCase();
        if (urlDomain && ['CASHIER', 'WAREHOUSE', 'SALES', 'ALL'].includes(urlDomain)) {
            setSelectedDomain(urlDomain);
        }
    }, [location.search]);

    // Report selection and display states
    const [activeReport, setActiveReport] = useState(null); // The report definition currently selected
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // Filter inputs
    const [datePreset, setDatePreset] = useState('THIS_MONTH');
    const [filters, setFilters] = useState({
        warehouseId: '',
        startDate: getDateRangePreset('THIS_MONTH')?.fromDate || '',
        endDate: getDateRangePreset('THIS_MONTH')?.toDate || '',
        search: '',
        partnerType: 'ALL', // ALL, CUSTOMER, SUPPLIER
        status: ''
    });

    const handleDatePresetChange = (presetKey) => {
        setDatePreset(presetKey);
        if (presetKey === 'ALL') {
            setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
        } else if (presetKey !== 'CUSTOM') {
            const range = getDateRangePreset(presetKey);
            if (range) {
                setFilters(prev => ({
                    ...prev,
                    startDate: range.fromDate || '',
                    endDate: range.toDate || ''
                }));
            }
        }
    };

    const handleStartDateChange = (val) => {
        setDatePreset('CUSTOM');
        setFilters(prev => ({ ...prev, startDate: val }));
    };

    const handleEndDateChange = (val) => {
        setDatePreset('CUSTOM');
        setFilters(prev => ({ ...prev, endDate: val }));
    };

    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, 400);
        return () => clearTimeout(timer);
    }, [filters.search]);

    useEffect(() => {
        if (location.state?.reportId) {
            let foundReport = null;
            for (const cat of MOCK_CATEGORIES) {
                const r = cat.reports?.find(x => x.id === location.state.reportId);
                if (r) {
                    foundReport = r;
                    break;
                }
            }
            if (foundReport) {
                setActiveReport(foundReport);
                setViewMode('detail');
                setCurrentPage(0);
            }
        }
    }, [location.state]);

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
        setCurrentPage(0);
    };

    // Submit report query
    const handleViewReport = async () => {
        if (!activeReport) return;
        setLoading(true);
        setCurrentPage(0);

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
                case 'sales-profit':
                    response = await getSalesProfitReport(params);
                    break;
                case 'cash-flow': {
                    const res = await getAllPayments();
                    const data = res.data?.data || res.data || [];
                    let list = Array.isArray(data) ? data : [];
                    if (filters.startDate) {
                        const from = new Date(filters.startDate).setHours(0, 0, 0, 0);
                        list = list.filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= from);
                    }
                    if (filters.endDate) {
                        const to = new Date(filters.endDate).setHours(23, 59, 59, 999);
                        list = list.filter((p) => p.createdAt && new Date(p.createdAt).getTime() <= to);
                    }
                    if (filters.search && filters.search.trim()) {
                        const term = filters.search.trim().toLowerCase();
                        list = list.filter(
                            (p) =>
                                (p.code && p.code.toLowerCase().includes(term)) ||
                                (p.partnerName && p.partnerName.toLowerCase().includes(term)) ||
                                (p.note && p.note.toLowerCase().includes(term))
                        );
                    }
                    setReportData(list);
                    return;
                }
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
            return formatDateOnly(dateStr);
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

            if (activeReport.id === 'cash-flow') {
                const worksheetData = reportData.map((item, idx) => ({
                    'STT': idx + 1,
                    'Ngày chứng từ': formatDate(item.createdAt),
                    'Số phiếu': item.code || '-',
                    'Loại nghiệp vụ': item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi',
                    'Hình thức': item.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
                    'Đối tác / Người nộp - nhận': item.partnerName || '-',
                    'Thu vào (VNĐ)': item.type === 'RECEIPT' ? Number(item.amount || 0) : 0,
                    'Chi ra (VNĐ)': item.type === 'VOUCHER' ? Number(item.amount || 0) : 0,
                    'Trạng thái': item.status === 'POSTED' ? 'Đã ghi sổ' : 'Chờ ghi sổ',
                    'Ghi chú': item.note || '-'
                }));
                const ws = XLSX.utils.json_to_sheet(worksheetData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'DongTien');
                XLSX.writeFile(wb, `DLC_BaoCao_DongTien_${new Date().toISOString().slice(0, 10)}.xlsx`);
                showToast('success', 'Xuất Excel báo cáo dòng tiền thành công.');
                return;
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

    // Filter report categories by Domain and Search Term
    const availableCategories = canViewPricing() 
        ? MOCK_CATEGORIES 
        : MOCK_CATEGORIES.filter(cat => cat.id !== 'cash-flow-reports' && cat.id !== 'sales-reports');

    const domainCategories = selectedDomain === 'ALL'
        ? availableCategories
        : availableCategories.filter(cat => cat.domain === 'ALL' || cat.domain === selectedDomain);

    const filteredCategories = domainCategories.map((cat) => {
        // Resolve actual reports for favorites category
        let reportsList = cat.reports;
        if (cat.id === 'favorites') {
            reportsList = availableCategories.flatMap((c) => c.reports).filter((rep) => favorites.includes(rep.id));
            reportsList = reportsList.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
            if (selectedDomain !== 'ALL') {
                reportsList = reportsList.filter((r) => r.domain === selectedDomain);
            }
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


                        </div>

                        {/* Domain Segment Tabs */}
                        <div className={styles.domainTabs}>
                            {REPORT_DOMAINS.map((dom) => (
                                <button
                                    key={dom.id}
                                    type="button"
                                    className={`${styles.domainTabBtn} ${selectedDomain === dom.id ? styles.activeDomainTab : ''}`}
                                    onClick={() => setSelectedDomain(dom.id)}
                                >
                                    <i className={dom.icon}></i>
                                    <span>{dom.label}</span>
                                    {dom.role && <span className={styles.domainBadge}>{dom.role}</span>}
                                </button>
                            ))}
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
                                            {category.roleBadge && (
                                                <span className={styles.categoryRoleBadge}>
                                                    {category.roleBadge}
                                                </span>
                                            )}
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
                                <button className={styles.backBtn} onClick={() => { 
                                    if (location.state?.fromDashboard) {
                                        navigate('/dashboard');
                                    } else {
                                        setViewMode('list'); 
                                        setReportData([]); 
                                    }
                                }}>
                                    <i className="fas fa-arrow-left"></i> {location.state?.fromDashboard ? 'Quay lại Dashboard' : 'Quay lại danh sách báo cáo'}
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
                                {activeReport.id === 'cash-flow' ? (
                                    /* Báo cáo Sổ quỹ & Dòng tiền: Chuẩn MISA tinh gọn với đúng 3 trường thời gian duy nhất */
                                    <>
                                        <div className={styles.filterGroup}>
                                            <label>Kỳ báo cáo</label>
                                            <select
                                                className={styles.filterSelect}
                                                value={datePreset}
                                                onChange={(e) => handleDatePresetChange(e.target.value)}
                                            >
                                                {DATE_PRESET_OPTIONS.map((opt) => (
                                                    <option key={opt.id} value={opt.id}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.filterGroup}>
                                            <label>Từ ngày</label>
                                            <input
                                                type="date"
                                                className={styles.filterInput}
                                                value={filters.startDate}
                                                onChange={(e) => handleStartDateChange(e.target.value)}
                                            />
                                        </div>
                                        <div className={styles.filterGroup}>
                                            <label>Đến ngày</label>
                                            <input
                                                type="date"
                                                className={styles.filterInput}
                                                value={filters.endDate}
                                                onChange={(e) => handleEndDateChange(e.target.value)}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Warehouse Filter */}
                                        {activeReport.id !== 'debt' && (
                                            <div className={styles.filterGroup}>
                                                <label>Kho chứa</label>
                                                <SearchableSelect
                                                    className={styles.filterSelect}
                                                    value={filters.warehouseId}
                                                    onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                                                >
                                                    <option value="">Tất cả kho</option>
                                                    {warehouses.map((w) => (
                                                        <option key={w.id} value={w.id}>{w.warehouseCode} - {w.name}</option>
                                                    ))}
                                                </SearchableSelect>
                                            </div>
                                        )}

                                        {/* Date range filters */}
                                        {activeReport.id !== 'inventory-balance' && (
                                            <>
                                                <div className={styles.filterGroup}>
                                                    <label>Kỳ báo cáo</label>
                                                    <select
                                                        className={styles.filterSelect}
                                                        value={datePreset}
                                                        onChange={(e) => handleDatePresetChange(e.target.value)}
                                                    >
                                                        {DATE_PRESET_OPTIONS.map((opt) => (
                                                            <option key={opt.id} value={opt.id}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className={styles.filterGroup}>
                                                    <label>Từ ngày</label>
                                                    <input
                                                        type="date"
                                                        className={styles.filterInput}
                                                        value={filters.startDate}
                                                        onChange={(e) => handleStartDateChange(e.target.value)}
                                                    />
                                                </div>
                                                <div className={styles.filterGroup}>
                                                    <label>Đến ngày</label>
                                                    <input
                                                        type="date"
                                                        className={styles.filterInput}
                                                        value={filters.endDate}
                                                        onChange={(e) => handleEndDateChange(e.target.value)}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Partner Type Filter */}
                                        {activeReport.id === 'debt' && (
                                            <div className={styles.filterGroup}>
                                                <label>Loại đối tác</label>
                                                <SearchableSelect
                                                    className={styles.filterSelect}
                                                    value={filters.partnerType}
                                                    onChange={(e) => setFilters({ ...filters, partnerType: e.target.value })}
                                                >
                                                    <option value="ALL">Tất cả đối tác</option>
                                                    <option value="CUSTOMER">Khách hàng</option>
                                                    <option value="SUPPLIER">Nhà cung cấp</option>
                                                </SearchableSelect>
                                            </div>
                                        )}

                                        {/* Status Filter */}
                                        {activeReport.id === 'stock-transfers' && (
                                            <div className={styles.filterGroup}>
                                                <label>Trạng thái</label>
                                                <SearchableSelect
                                                    className={styles.filterSelect}
                                                    value={filters.status}
                                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                                >
                                                    <option value="">Tất cả</option>
                                                    <option value="COMPLETED">Hoàn thành</option>
                                                    <option value="PENDING">Chờ duyệt</option>
                                                    <option value="CANCELLED">Đã hủy</option>
                                                </SearchableSelect>
                                            </div>
                                        )}

                                        {/* Search keyword filter */}
                                        {activeReport.id !== 'debt' && (
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
                                        )}
                                    </>
                                )}

                                {/* Actions */}
                                <button className={styles.btnView} onClick={handleViewReport}>
                                    <i className="fas fa-sync-alt"></i> Xem báo cáo
                                </button>

                                <button className={styles.btnExport} onClick={handleExport} title="Xuất file Excel">
                                    <i className="fas fa-file-excel" style={{ color: 'var(--color-excel)' }}></i> Xuất khẩu
                                </button>

                                <button className={styles.btnPrint} onClick={() => window.print()} title="In ấn báo cáo">
                                    <i className="bi bi-printer"></i> In ấn
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
                                    <>
                                        {(() => {
                                            const totalElements = reportData.length;
                                            const totalPages = Math.ceil(totalElements / pageSize) || 1;
                                            const paginatedData = reportData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

                                            return (
                                                <>
                                                    <div className={styles.reportTableContainer}>
                                                        {/* 1. INVENTORY SUMMARY REPORT */}
                                                        {activeReport.id === 'inventory-summary' && (
                                                            <table className={`${styles.reportTable} ${styles.summaryTable}`}>
                                                                <thead>
                                                                    <tr>
                                                                        <th rowSpan="2" className={`${styles.fixedHeaderBold} ${styles.colWarehouse}`}>Kho</th>
                                                                        <th rowSpan="2" className={`${styles.fixedHeaderBold} ${styles.colProductCode}`}>Mã hàng</th>
                                                                        <th rowSpan="2" className={`${styles.fixedHeaderBold} ${styles.colProductName}`}>Tên hàng</th>
                                                                        <th rowSpan="2" className={`${styles.fixedHeaderBold} ${styles.colUnit}`}>ĐVT</th>
                                                                        <th colSpan={canViewPricing() ? 2 : 1} className={`${styles.textCenter} ${styles.summaryGroupHeader}`}>Tồn đầu kỳ</th>
                                                                        <th colSpan={canViewPricing() ? 2 : 1} className={`${styles.textCenter} ${styles.summaryGroupHeader}`}>Nhập trong kỳ</th>
                                                                        <th colSpan={canViewPricing() ? 2 : 1} className={`${styles.textCenter} ${styles.summaryGroupHeader}`}>Xuất trong kỳ</th>
                                                                        <th colSpan={canViewPricing() ? 2 : 1} className={`${styles.textCenter} ${styles.summaryGroupHeader}`}>Tồn cuối kỳ</th>
                                                                    </tr>
                                                                    <tr>
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className={`${styles.fontSemibold} ${styles.colWarehouse}`}>{item.warehouseName || '-'}</td>
                                                                            <td className={`${styles.fontSemibold} ${styles.colProductCode}`}>{item.productCode}</td>
                                                                            <td className={`${styles.fontSemibold} ${styles.colProductName}`}>{item.productName}</td>
                                                                            <td className={`${styles.fontSemibold} ${styles.colUnit}`}>{item.unitName || '-'}</td>
                                                                            <td className={`${styles.textRight} ${styles.groupBorderLeft}`} style={{ whiteSpace: 'nowrap' }}>{formatQuantity(item.openingQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.openingValue)}</td>}
                                                                            <td className={`${styles.textRight} ${styles.groupBorderLeft}`} style={{ whiteSpace: 'nowrap' }}>{formatQuantity(item.receiptQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.receiptValue)}</td>}
                                                                            <td className={`${styles.textRight} ${styles.groupBorderLeft}`} style={{ whiteSpace: 'nowrap' }}>{formatQuantity(item.issueQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.issueValue)}</td>}
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold} ${styles.groupBorderLeft}`} style={{ color: 'var(--misa-primary)', whiteSpace: 'nowrap' }}>{formatQuantity(item.endingQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.fontSemibold} ${styles.groupBorderRight}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.endingValue)}</td>}
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
                                                                        <th className={styles.colProductCode}>Mã hàng</th>
                                                                        <th className={styles.colProductName}>Tên hàng</th>
                                                                        <th className={styles.colUnit}>Đơn vị tính</th>
                                                                        <th className={styles.colWarehouse}>Kho chứa</th>
                                                                        <th className={styles.textRight}>Số lượng tồn</th>
                                                                        {canViewPricing() && <th className={styles.textRight}>Giá trị tồn</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className={`${styles.fontSemibold} ${styles.colProductCode}`}>{item.itemCode}</td>
                                                                            <td className={styles.colProductName}>{item.itemName}</td>
                                                                            <td className={styles.colUnit}>{item.unitName || '-'}</td>
                                                                            <td className={styles.colWarehouse}>{item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : '-'}</td>
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: 'var(--color-success)' }}>{formatQuantity(item.totalQuantity)}</td>
                                                                            {canViewPricing() && <td className={styles.textRight}>{formatCurrency(item.totalValue)}</td>}
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
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Ngày CT</th>
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Số chứng từ</th>
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Loại CT</th>
                                                                        <th className={styles.colProductCode}>Mã hàng</th>
                                                                        <th className={styles.colProductName}>Tên hàng</th>
                                                                        <th className={styles.colWarehouse}>Kho</th>
                                                                        <th className={styles.colUnit}>ĐVT</th>
                                                                        {canViewPricing() && <th className={styles.textRight}>Đơn giá</th>}
                                                                        <th className={styles.textRight}>Số lượng nhập</th>
                                                                        <th className={styles.textRight}>Số lượng xuất</th>
                                                                        <th className={styles.textRight}>Tồn sau CT</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.documentDate)}</td>
                                                                            <td className={styles.fontSemibold} style={{ whiteSpace: 'nowrap' }}>{item.documentNumber}</td>
                                                                            <td>
                                                                                <span className={`${styles.badge} ${item.documentType?.includes('NHAP') || item.documentType?.includes('IMPORT') ? styles.badgeImport : styles.badgeExport}`}>
                                                                                    {item.documentType}
                                                                                </span>
                                                                            </td>
                                                                            <td className={styles.colProductCode}>{item.productCode}</td>
                                                                            <td className={styles.colProductName}>{item.productName}</td>
                                                                            <td className={styles.colWarehouse}>{item.warehouseName}</td>
                                                                            <td className={styles.colUnit}>{item.unitName || '-'}</td>
                                                                            {canViewPricing() && <td className={styles.textRight}>{formatCurrency(item.unitPrice)}</td>}
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
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Ngày CT</th>
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Số chứng từ</th>
                                                                        <th className={styles.colProductCode}>Mã hàng</th>
                                                                        <th className={styles.colProductName}>Tên hàng</th>
                                                                        <th className={styles.colWarehouse}>Kho chuyển</th>
                                                                        <th className={styles.colWarehouse}>Kho nhận</th>
                                                                        <th className={styles.colUnit}>ĐVT</th>
                                                                        <th className={styles.textRight}>Số lượng</th>
                                                                        {canViewPricing() && <th className={styles.textRight}>Đơn giá</th>}
                                                                        {canViewPricing() && <th className={styles.textRight}>Thành tiền</th>}
                                                                        <th>Trạng thái</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.documentDate)}</td>
                                                                            <td className={styles.fontSemibold} style={{ whiteSpace: 'nowrap' }}>{item.documentNumber}</td>
                                                                            <td className={styles.colProductCode}>{item.itemCode}</td>
                                                                            <td className={styles.colProductName}>{item.itemName}</td>
                                                                            <td className={styles.colWarehouse}>{item.sourceWarehouse}</td>
                                                                            <td className={styles.colWarehouse}>{item.destinationWarehouse}</td>
                                                                            <td className={styles.colUnit}>{item.unitName}</td>
                                                                            <td className={styles.textRight}>{formatQuantity(item.quantity)}</td>
                                                                            {canViewPricing() && <td className={styles.textRight}>{formatCurrency(item.unitPrice)}</td>}
                                                                            {canViewPricing() && <td className={styles.textRight}>{formatCurrency(item.amount)}</td>}
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
                                                                        <th className={styles.colProductCode}>Mã đối tác</th>
                                                                        <th className={styles.colPartnerName}>Tên đối tác</th>
                                                                        <th>Phân loại</th>
                                                                        <th className={styles.textRight}>Dư đầu kỳ</th>
                                                                        <th className={styles.textRight}>Phát sinh tăng (Nợ)</th>
                                                                        <th className={styles.textRight}>Phát sinh giảm (Có)</th>
                                                                        <th className={styles.textRight}>Dư cuối kỳ (Nợ cuối)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className={`${styles.fontSemibold} ${styles.colProductCode}`}>{item.partnerCode}</td>
                                                                            <td className={styles.colPartnerName}>{item.partnerName}</td>
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

                                                        {/* 6. SALES & PROFIT REPORT */}
                                                        {activeReport.id === 'sales-profit' && (
                                                            <table className={styles.reportTable}>
                                                                <thead>
                                                                    <tr>
                                                                        <th className={styles.colProductCode}>Mã hàng</th>
                                                                        <th className={styles.colProductName}>Tên hàng</th>
                                                                        <th className={styles.colUnit}>ĐVT</th>
                                                                        <th className={styles.textRight}>Số lượng bán</th>
                                                                        <th className={styles.textRight}>Tổng doanh thu</th>
                                                                        <th className={styles.textRight}>Tổng giá vốn</th>
                                                                        <th className={styles.textRight}>Lợi nhuận gộp</th>
                                                                        <th className={styles.textRight}>Tỷ suất LN (%)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className={`${styles.fontSemibold} ${styles.colProductCode}`}>{item.sku}</td>
                                                                            <td className={styles.colProductName}>{item.variantName}</td>
                                                                            <td className={styles.colUnit}>{item.unitName || '-'}</td>
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: 'var(--color-primary)' }}>{formatQuantity(item.quantitySold)}</td>
                                                                            <td className={`${styles.textRight} ${styles.textSuccess}`}>{formatCurrency(item.salesAmount)}</td>
                                                                            <td className={styles.textRight}>{formatCurrency(item.costAmount)}</td>
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: item.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                                                {formatCurrency(item.grossProfit)}
                                                                            </td>
                                                                            <td className={styles.textRight}>
                                                                                {item.profitMarginPercent != null ? item.profitMarginPercent.toFixed(2) + '%' : '0%'}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {/* 7. CASH FLOW & CASH BOOK REPORT */}
                                                        {activeReport.id === 'cash-flow' && (
                                                            <>
                                                                {/* Summary KPI Cards for Cash Flow */}
                                                                <div className={styles.cashFlowKpiGrid}>
                                                                    <div className={styles.kpiCard}>
                                                                        <div className={styles.kpiIconBox} style={{ background: 'var(--wms-success-soft)', color: 'var(--wms-success)' }}>
                                                                            <i className="fas fa-arrow-down"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Tổng thu trong kỳ</span>
                                                                            <strong style={{ color: 'var(--wms-success)' }}>
                                                                                {formatCurrency(
                                                                                    reportData.reduce((acc, p) => p.type === 'RECEIPT' ? acc + Number(p.amount || 0) : acc, 0)
                                                                                )}
                                                                            </strong>
                                                                        </div>
                                                                    </div>

                                                                    <div className={styles.kpiCard}>
                                                                        <div className={styles.kpiIconBox} style={{ background: '#fef2f2', color: 'var(--wms-danger)' }}>
                                                                            <i className="fas fa-arrow-up"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Tổng chi trong kỳ</span>
                                                                            <strong style={{ color: 'var(--wms-danger)' }}>
                                                                                {formatCurrency(
                                                                                    reportData.reduce((acc, p) => p.type === 'VOUCHER' ? acc + Number(p.amount || 0) : acc, 0)
                                                                                )}
                                                                            </strong>
                                                                        </div>
                                                                    </div>

                                                                    <div className={styles.kpiCard}>
                                                                        <div className={styles.kpiIconBox} style={{ background: 'var(--color-primary-soft)', color: 'var(--wms-primary)' }}>
                                                                            <i className="fas fa-wallet"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Dòng tiền ròng (Thu - Chi)</span>
                                                                            {(() => {
                                                                                const rec = reportData.reduce((acc, p) => p.type === 'RECEIPT' ? acc + Number(p.amount || 0) : acc, 0);
                                                                                const vou = reportData.reduce((acc, p) => p.type === 'VOUCHER' ? acc + Number(p.amount || 0) : acc, 0);
                                                                                const net = rec - vou;
                                                                                return (
                                                                                    <strong style={{ color: net >= 0 ? 'var(--wms-success)' : 'var(--wms-danger)' }}>
                                                                                        {formatCurrency(net)}
                                                                                    </strong>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>

                                                                    <div className={styles.kpiCard}>
                                                                        <div className={styles.kpiIconBox} style={{ background: 'var(--wms-warning-soft)', color: '#d97706' }}>
                                                                            <i className="fas fa-university"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Tiền mặt & Ngân hàng</span>
                                                                            <strong style={{ fontSize: '13px', color: 'var(--color-text-strong)' }}>
                                                                                TM: {formatCurrency(reportData.reduce((acc, p) => p.paymentMethod === 'CASH' ? acc + Number(p.amount || 0) : acc, 0))}
                                                                                <br />
                                                                                NH: {formatCurrency(reportData.reduce((acc, p) => p.paymentMethod === 'BANK_TRANSFER' ? acc + Number(p.amount || 0) : acc, 0))}
                                                                            </strong>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <table className={styles.reportTable}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th style={{ width: '50px' }}>STT</th>
                                                                            <th style={{ width: '120px' }}>Ngày chứng từ</th>
                                                                            <th style={{ width: '130px' }}>Số chứng từ</th>
                                                                            <th style={{ width: '140px' }}>Loại nghiệp vụ</th>
                                                                            <th>Đối tác / Người nộp - nhận</th>
                                                                            <th style={{ width: '130px' }}>Hình thức</th>
                                                                            <th className={styles.textRight} style={{ width: '140px' }}>Thu vào (VNĐ)</th>
                                                                            <th className={styles.textRight} style={{ width: '140px' }}>Chi ra (VNĐ)</th>
                                                                            <th style={{ width: '130px' }}>Trạng thái</th>
                                                                            <th style={{ width: '200px' }}>Ghi chú</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {paginatedData.map((item, idx) => (
                                                                            <tr key={idx}>
                                                                                <td>{currentPage * pageSize + idx + 1}</td>
                                                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</td>
                                                                                <td className={styles.fontSemibold} style={{ color: 'var(--color-primary)' }}>{item.code || '-'}</td>
                                                                                <td>
                                                                                    <span style={{ fontWeight: 600, color: item.type === 'RECEIPT' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                                                        {item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className={styles.fontSemibold}>{item.partnerName || '-'}</td>
                                                                                <td>
                                                                                    <span className={styles.badge} style={{ background: item.paymentMethod === 'CASH' ? 'var(--wms-success-soft)' : 'var(--color-primary-soft)', color: item.paymentMethod === 'CASH' ? 'var(--wms-success)' : 'var(--wms-primary)' }}>
                                                                                        {item.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className={`${styles.textRight} ${styles.textSuccess}`} style={{ fontWeight: 600 }}>
                                                                                    {item.type === 'RECEIPT' ? formatCurrency(item.amount) : '-'}
                                                                                </td>
                                                                                <td className={`${styles.textRight} ${styles.textDanger}`} style={{ fontWeight: 600 }}>
                                                                                    {item.type === 'VOUCHER' ? formatCurrency(item.amount) : '-'}
                                                                                </td>
                                                                                <td>
                                                                                    <span className={`${styles.badge} ${item.status === 'POSTED' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                                                                        {item.status === 'POSTED' ? 'Đã ghi sổ' : 'Chờ ghi sổ'}
                                                                                    </span>
                                                                                </td>
                                                                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.note || '-'}>
                                                                                    {item.note || '-'}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </>
                                                        )}
                                                    </div>

                                                    {totalElements > 0 && (
                                                        <div className={styles.paginationWrapper}>
                                                            <Pagination
                                                                page={currentPage}
                                                                totalPages={totalPages}
                                                                totalElements={totalElements}
                                                                size={pageSize}
                                                                onPageChange={(p) => setCurrentPage(p)}
                                                                onSizeChange={(s) => {
                                                                    setPageSize(s);
                                                                    setCurrentPage(0);
                                                                }}
                                                                sizeOptions={[10, 20, 50, 100]}
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </>
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
