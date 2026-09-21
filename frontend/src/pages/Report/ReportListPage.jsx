import { useState, useEffect, useMemo } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import { getMyWarehouses } from '../../api/warehouseApi';
import { useWorkspaceMode, WORKSPACE_MODES } from '../../contexts/WorkspaceModeContext';
import {
    getInventoryBalanceReport,
    getStockLedgerReport,
    getStockTransferReport,
    getDebtReport,
    getCashFlowReport,
    getInventorySummaryReport,
    getSalesProfitReport,
    getRepairProfitReport,
    exportReportExcel
} from '../../api/reportApi';
import styles from './ReportListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { getDateRangePreset, DATE_PRESET_OPTIONS } from '../../utils/datePresets';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import { canViewPricing, getAuthRoles, hasPermission } from '../../auth/session';

const REPORT_DOMAINS = [
    { id: 'ALL', label: 'Tất cả báo cáo', icon: 'bi bi-grid-3x3-gap' },
    { id: 'WAREHOUSE', label: 'Kho & Hàng hóa', icon: 'bi bi-boxes', role: 'Thủ kho' },
    { id: 'CASHIER', label: 'Quỹ & Dòng tiền', icon: 'bi bi-cash-stack', role: 'Thủ quỹ' },
    { id: 'SALES', label: 'Kinh doanh & Bán hàng', icon: 'bi bi-graph-up', role: 'Kế toán' },
];

const MOCK_CATEGORIES = [
    {
        id: 'favorites',
        title: 'Báo cáo yêu thích',
        icon: 'bi bi-star',
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
        icon: 'bi bi-boxes',
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
        icon: 'bi bi-list-ul',
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
        icon: 'bi bi-cash-stack',
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
        icon: 'bi bi-graph-up',
        domain: 'SALES',
        roleBadge: 'Kế toán',
        reports: [
            { id: 'sales-profit', name: 'Báo cáo Doanh thu & Lợi nhuận gộp bán hàng', desc: 'Thống kê lượng hàng bán ra, tổng doanh thu, giá vốn và lợi nhuận gộp theo từng mặt hàng.', domain: 'SALES' },
            { id: 'repair-profit', name: 'Báo cáo Doanh thu & Lợi nhuận sửa chữa', desc: 'Tổng hợp doanh thu linh kiện, dịch vụ, VAT, giá vốn FIFO và lợi nhuận theo từng lệnh sửa chữa hoàn thành.', domain: 'SALES' }
        ]
    }
];

const ReportListPage = () => {
    const roles = getAuthRoles().map(r => String(r || '').toUpperCase());
    const isSuperAdminOrAccountant = roles.some(r =>
        ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'MANAGER', 'ROLE_MANAGER', 'ACCOUNTANT', 'ROLE_ACCOUNTANT'].includes(r)
    );

    const allowedDomains = useMemo(() => {
        const domains = new Set(['ALL']);
        if (isSuperAdminOrAccountant) {
            domains.add('WAREHOUSE');
            domains.add('CASHIER');
            domains.add('SALES');
        } else {
            if (roles.some(r => r.includes('WAREHOUSE_CONTROLLER'))) domains.add('WAREHOUSE');
            if (roles.some(r => r.includes('CASHIER_CONTROLLER'))) domains.add('CASHIER');
            if (roles.some(r => r.includes('SALES'))) domains.add('SALES');

            if (hasPermission(['report_summary:view', 'report_balance:view', 'report_ledger:view', 'report_transfer:view'])) domains.add('WAREHOUSE');
            if (hasPermission(['report_debt:view', 'payment:view'])) domains.add('CASHIER');
            if (hasPermission(['report_sales:view'])) domains.add('SALES');
        }
        return domains;
    }, [roles, isSuperAdminOrAccountant]);

    const availableDomains = useMemo(() => REPORT_DOMAINS.filter(d => allowedDomains.has(d.id)), [allowedDomains]);

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
    const [cashFlowSummary, setCashFlowSummary] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // Filter inputs
    const [datePreset, setDatePreset] = useState('THIS_MONTH');
    const [filters, setFilters] = useState(() => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const defaultRange = getDateRangePreset('THIS_MONTH');
        let initialEndDate = defaultRange?.toDate || '';
        if (initialEndDate && initialEndDate > todayStr) {
            initialEndDate = todayStr;
        }

        return {
            warehouseId: '',
            startDate: defaultRange?.fromDate || '',
            endDate: initialEndDate,
            search: '',
            partnerType: '', // '', CUSTOMER, SUPPLIER
            status: '',
            transactionType: '', // For stock-ledger
            paymentMethod: ''
        };
    });

    const handleDatePresetChange = (presetKey) => {
        setDatePreset(presetKey);
        if (presetKey === 'ALL') {
            setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
        } else if (presetKey !== 'CUSTOM') {
            const range = getDateRangePreset(presetKey);
            if (range) {
                const todayStr = new Date().toLocaleDateString('en-CA');
                let newEndDate = range.toDate || '';
                // Cap the end date to today if it exceeds today
                if (newEndDate && newEndDate > todayStr) {
                    newEndDate = todayStr;
                }

                setFilters(prev => ({
                    ...prev,
                    startDate: range.fromDate || '',
                    endDate: newEndDate
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
                const res = await getMyWarehouses();
                const content = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.content || res.data?.content || []);
                setWarehouses(content);
                if (content.length === 1) {
                    setFilters(prev => ({ ...prev, warehouseId: content[0].id }));
                }
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
    const handleViewReport = async ({ silent } = {}) => {
        if (!activeReport) return;
        if (!silent) setLoading(true);
        if (!silent) setCurrentPage(0);

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
                    params.partnerType = filters.partnerType !== '' ? filters.partnerType : undefined;
                    response = await getDebtReport(params);
                    break;
                case 'sales-profit':
                    response = await getSalesProfitReport(params);
                    break;
                case 'repair-profit':
                    response = await getRepairProfitReport(params);
                    break;
                case 'cash-flow':
                    params.paymentMethod = filters.paymentMethod || undefined;
                    response = await getCashFlowReport(params);
                    break;
                default:
                    throw new Error('Loại báo cáo không hợp lệ');
            }

            let data = response.data?.data || response.data || [];
            if (activeReport.id === 'cash-flow') {
                setCashFlowSummary(data);
                data = data.transactions || [];
            } else {
                setCashFlowSummary(null);
            }

            // local filtering for stock-ledger transaction type
            if (activeReport.id === 'stock-ledger' && filters.transactionType && filters.transactionType !== '') {
                data = data.filter(item => {
                    const t = item.documentType;
                    switch (filters.transactionType) {
                        case 'PO': return t === 'IN_PO';
                        case 'SO': return t === 'EX_SO';
                        case 'TRF': return t === 'IN_TRF' || t === 'EX_TRF';
                        case 'ADJ': return t === 'IN_ADJ' || t === 'EX_ADJ';
                        case 'REPAIR': return t === 'IN_REPAIR' || t === 'EX_REPAIR';
                        case 'BUILD': return t === 'IN_BUILD' || t === 'EX_BUILD';
                        case 'OTHER': return !['IN_PO', 'EX_SO', 'IN_TRF', 'EX_TRF', 'IN_ADJ', 'EX_ADJ', 'IN_REPAIR', 'EX_REPAIR', 'IN_BUILD', 'EX_BUILD'].includes(t);
                        default: return true;
                    }
                });
            }

            setReportData(data);
        } catch (err) {
            console.error('Lỗi khi lấy dữ liệu báo cáo:', err);
            showToast('error', err.response?.data?.userMessage || 'Không thể tải dữ liệu báo cáo.');
            setReportData([]);
            setCashFlowSummary(null);
        } finally {
            if (!silent) setLoading(false);
        }
    };
    useRealtimeRefresh(['INVENTORY_BALANCE', 'IMPORT_DOCUMENT', 'EXPORT_DOCUMENT', 'STOCK_TRANSFER', 'PAYMENT', 'SALES_ORDER', 'PARTNER'], handleViewReport, { enabled: viewMode === 'detail' && !!activeReport });

    // Auto-fetch data on switching to a report or changing filters
    useEffect(() => {
        if (viewMode === 'detail' && activeReport) {

            handleViewReport();
        }

    }, [viewMode, activeReport, filters.warehouseId, filters.startDate, filters.endDate, filters.partnerType, filters.status, filters.transactionType, filters.paymentMethod, debouncedSearch]);

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
        if ((!reportData || reportData.length === 0) && activeReport.id !== 'cash-flow') {
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
                params.partnerType = filters.partnerType !== '' ? filters.partnerType : undefined;
            } else if (activeReport.id === 'cash-flow') {
                params.paymentMethod = filters.paymentMethod || undefined;
            }

            await exportReportExcel(activeReport.id, params);
            showToast('success', 'Xuất Excel báo cáo thành công.');
        } catch (error) {
            console.error('Lỗi xuất Excel:', error);
            showToast('error', 'Có lỗi xảy ra khi xuất Excel báo cáo!');
        }
    };

    // Filter report categories by Domain and Search Term
    const baseCategories = canViewPricing()
        ? MOCK_CATEGORIES
        : MOCK_CATEGORIES.filter(cat => cat.id !== 'cash-flow-reports' && cat.id !== 'sales-reports');

    const allowedCategories = baseCategories.filter(cat => allowedDomains.has(cat.domain) || cat.domain === 'ALL');

    const domainCategories = selectedDomain === 'ALL'
        ? allowedCategories
        : allowedCategories.filter(cat => cat.domain === 'ALL' || cat.domain === selectedDomain);

    const filteredCategories = domainCategories.map((cat) => {
        // Resolve actual reports for favorites category
        let reportsList = cat.reports;
        if (cat.id === 'favorites') {
            reportsList = baseCategories.flatMap((c) => c.reports).filter((rep) => favorites.includes(rep.id));
            reportsList = reportsList.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
            if (selectedDomain !== 'ALL') {
                reportsList = reportsList.filter((r) => r.domain === selectedDomain);
            }
        }

        // Further restrict reports inside categories by what's actually allowed
        reportsList = reportsList.filter(r => allowedDomains.has(r.domain));

        const matchedReports = reportsList.filter(
            (r) =>
                r.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                r.desc.toLowerCase().includes(searchTerm.trim().toLowerCase())
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



                        {/* Filter and search controls */}
                        <div className={styles.toolbar}>
                            <div className={styles.searchBox}>
                                <i className="bi bi-search"></i>
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên hoặc mô tả báo cáo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <i className={`bi bi-x ${styles.clearIcon}`} onClick={() => setSearchTerm('')}></i>
                                )}
                            </div>
                        </div>

                        {/* Report Categories Grid */}
                        <div className={styles.categoriesGrid}>
                            {filteredCategories.length === 0 ? (
                                <div className={styles.noResults}>
                                    <i className="bi bi-zoom-out"></i>
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
                                                            <i className={`bi ${favorites.includes(report.id) ? 'bi-star-fill' : 'bi-star'} ${styles.starIcon}`}></i>
                                                        </button>
                                                        <i className={`bi bi-chevron-right ${styles.chevronIcon}`}></i>
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
                                    <i className="bi bi-arrow-left"></i> {location.state?.fromDashboard ? 'Quay lại Dashboard' : 'Quay lại danh sách báo cáo'}
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
                            <div className={styles.filterSection}>
                                <div className={styles.searchAndFilters}>
                                    {/* Search Box - FIRST! */}
                                    {(
                                        <div className={styles.searchBox}>
                                            <i className="bi bi-search"></i>
                                            <input
                                                type="text"
                                                className={styles.searchInput}
                                                placeholder={activeReport.id === 'cash-flow'
                                                    ? "Mã phiếu, đối tác, ghi chú..."
                                                    : activeReport.id === 'debt'
                                                        ? "Mã hoặc tên đối tác..."
                                                        : activeReport.id === 'repair-profit'
                                                            ? "Mã lệnh hoặc khách hàng..."
                                                            : "Tìm tên, mã mặt hàng..."}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleViewReport(); }}
                                                value={filters.search}
                                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                            />
                                            {filters.search && (
                                                <button className={styles.clearSearchBtn} onClick={() => setFilters({ ...filters, search: '' })}>
                                                    <i className="bi bi-x-circle-fill"></i>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {activeReport.id === 'inventory-balance' && warehouses.length > 1 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Kho hàng:</span>
                                            <select
                                                value={filters.warehouseId}
                                                onChange={(e) => setFilters(prev => ({ ...prev, warehouseId: e.target.value }))}
                                                style={{
                                                    padding: '7px 12px',
                                                    border: '1px solid var(--color-border-field)',
                                                    borderRadius: '4px',
                                                    fontSize: '13.5px',
                                                    minWidth: '200px',
                                                    outline: 'none',
                                                    backgroundColor: 'var(--color-surface)',
                                                    color: 'var(--color-text-strong)'
                                                }}
                                            >
                                                <option value="">Tất cả các kho</option>
                                                {warehouses.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className={styles.filterActions}>
                                    <button className={styles.iconBtn} onClick={handleViewReport} title="Tải lại / Xem báo cáo">
                                        <i className="bi bi-arrow-clockwise"></i>
                                    </button>

                                    {activeReport.id !== 'inventory-balance' && (
                                        <FilterPopover
                                            filters={{
                                                preset: datePreset,
                                                fromDate: filters.startDate,
                                                toDate: filters.endDate,
                                                warehouseId: filters.warehouseId,
                                                status: filters.status,
                                                transactionType: filters.transactionType,
                                                partnerType: filters.partnerType,
                                                paymentMethod: filters.paymentMethod
                                            }}
                                            showDateRange={activeReport.id !== 'inventory-balance'}
                                            warehouses={!['debt', 'cash-flow'].includes(activeReport.id) ? warehouses : []}
                                            statusOptions={
                                                activeReport.id === 'stock-transfers' ? [
                                                    { value: 'APPROVED', label: 'Đã duyệt, chờ xuất' },
                                                    { value: 'IN_TRANSIT', label: 'Đang chuyển' },
                                                    { value: 'POSTED', label: 'Hoàn thành' },
                                                    { value: 'CANCELLED', label: 'Đã hủy' }
                                                ] : []
                                            }
                                            customSelects={[
                                                ...(activeReport.id === 'stock-ledger' ? [{
                                                    key: 'transactionType',
                                                    label: 'Loại nghiệp vụ',
                                                    defaultOption: 'Tất cả nghiệp vụ',
                                                    options: [
                                                        { value: 'PO', label: 'Mua hàng' },
                                                        { value: 'SO', label: 'Bán hàng' },
                                                        { value: 'TRF', label: 'Chuyển kho' },
                                                        { value: 'ADJ', label: 'Kiểm kê' },
                                                        { value: 'REPAIR', label: 'Sửa chữa' },
                                                        { value: 'BUILD', label: 'Lắp ráp/ Tháo dỡ' },
                                                        { value: 'OTHER', label: 'Khác' }
                                                    ]
                                                }] : []),
                                                ...(activeReport.id === 'debt' ? [{
                                                    key: 'partnerType',
                                                    label: 'Loại đối tác',
                                                    defaultOption: 'Tất cả đối tác',
                                                    options: [
                                                        { value: 'CUSTOMER', label: 'Khách hàng' },
                                                        { value: 'SUPPLIER', label: 'Nhà cung cấp' }
                                                    ]
                                                }] : []),
                                                ...(activeReport.id === 'cash-flow' ? [{
                                                    key: 'paymentMethod',
                                                    label: 'Phương thức',
                                                    defaultOption: 'Tất cả phương thức',
                                                    options: [
                                                        { value: 'CASH', label: 'Tiền mặt' },
                                                        { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }
                                                    ]
                                                }] : [])
                                            ]}
                                            onApply={(newFilters) => {
                                                if (newFilters.preset) handleDatePresetChange(newFilters.preset);
                                                setFilters(prev => ({
                                                    ...prev,
                                                    startDate: newFilters.fromDate || prev.startDate,
                                                    endDate: newFilters.toDate || prev.endDate,
                                                    warehouseId: newFilters.warehouseId || '',
                                                    status: newFilters.status || '',
                                                    transactionType: newFilters.transactionType || '',
                                                    partnerType: newFilters.partnerType || '',
                                                    paymentMethod: newFilters.paymentMethod || ''
                                                }));
                                            }}
                                            onReset={() => {
                                                handleDatePresetChange('THIS_MONTH');
                                                setFilters(prev => ({
                                                    ...prev,
                                                    warehouseId: '',
                                                    status: '',
                                                    transactionType: '',
                                                    partnerType: '',
                                                    paymentMethod: '',
                                                    search: ''
                                                }));
                                            }}
                                        />
                                    )}

                                    <button className={styles.iconBtn} onClick={handleExport} title="Xuất file Excel">
                                        <i className="bi bi-file-earmark-excel"></i>
                                    </button>

                                    <button className={styles.iconBtn} onClick={() => window.print()} title="In ấn báo cáo">
                                        <i className="bi bi-printer"></i>
                                    </button>
                                </div>
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
                                ) : reportData.length === 0 && activeReport.id !== 'cash-flow' ? (
                                    <div className={styles.noDataContainer}>
                                        <i className="bi bi-folder2-open"></i>
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
                                                            <table className={`${styles.reportTable} ${styles.summaryTable} ${styles.boldTable}`}>
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
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                        <th className={`${styles.textRight} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Số lượng</th>
                                                                        {canViewPricing() && <th className={`${styles.textRight} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>Giá trị</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className={`${styles.fontSemibold} ${styles.colWarehouse}`}>{item.warehouseName || '-'}</td>
                                                                            <td className={`${styles.fontSemibold} ${styles.colProductCode}`}>{item.productCode}</td>
                                                                            <td className={`${styles.fontSemibold} ${styles.colProductName}`}>{item.productName}</td>
                                                                            <td className={`${styles.fontSemibold} ${styles.colUnit}`}>{item.unitName || '-'}</td>
                                                                            <td className={`${styles.textRight} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ whiteSpace: 'nowrap' }}>{formatQuantity(item.openingQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.openingValue)}</td>}
                                                                            <td className={`${styles.textRight} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ whiteSpace: 'nowrap' }}>{formatQuantity(item.receiptQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.receiptValue)}</td>}
                                                                            <td className={`${styles.textRight} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ whiteSpace: 'nowrap' }}>{formatQuantity(item.issueQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.issueValue)}</td>}
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold} ${styles.groupBorderLeft} ${styles.lightBorderRight}`} style={{ color: 'var(--misa-primary)', whiteSpace: 'nowrap' }}>{formatQuantity(item.endingQuantity)}</td>
                                                                            {canViewPricing() && <td className={`${styles.textRight} ${styles.fontSemibold} ${styles.groupBorderRight} ${styles.lightBorderLeft}`} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.endingValue)}</td>}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {/* 2. INVENTORY BALANCE REPORT */}
                                                        {activeReport.id === 'inventory-balance' && (
                                                            <table className={`${styles.reportTable} ${styles.boldTable}`}>
                                                                <thead>
                                                                    <tr>
                                                                        <th className={styles.colProductCode}>Mã hàng</th>
                                                                        <th className={styles.colProductName}>Tên hàng</th>
                                                                        <th className={styles.colUnit}>Đơn vị tính</th>
                                                                        <th className={styles.colWarehouse}>Kho chứa</th>
                                                                        <th className={styles.textRight}>Tồn thực tế</th>
                                                                        <th className={styles.textRight}>Đang giữ</th>
                                                                        <th className={styles.textRight}>Khả dụng</th>
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
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`}>{formatQuantity(item.totalQuantity)}</td>
                                                                            <td className={styles.textRight}>{formatQuantity(item.totalReserved)}</td>
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: Number(item.availableQuantity || 0) < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{formatQuantity(item.availableQuantity)}</td>
                                                                            {canViewPricing() && <td className={styles.textRight}>{formatCurrency(item.totalValue)}</td>}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {/* 3. STOCK LEDGER REPORT */}
                                                        {activeReport.id === 'stock-ledger' && (
                                                            <table className={`${styles.reportTable} ${styles.boldTable} ${styles.stockLedgerTable}`}>
                                                                <colgroup>
                                                                    <col style={{ width: canViewPricing() ? '8%' : '9%' }} />
                                                                    <col style={{ width: canViewPricing() ? '6%' : '7%' }} />
                                                                    <col style={{ width: canViewPricing() ? '9%' : '11%' }} />
                                                                    <col style={{ width: canViewPricing() ? '6%' : '7%' }} />
                                                                    <col style={{ width: canViewPricing() ? '14%' : '19%' }} />
                                                                    <col style={{ width: canViewPricing() ? '6%' : '8%' }} />
                                                                    <col style={{ width: canViewPricing() ? '4%' : '5%' }} />
                                                                    {canViewPricing() && <col style={{ width: '7%' }} />}
                                                                    <col style={{ width: canViewPricing() ? '4%' : '6%' }} />
                                                                    {canViewPricing() && <col style={{ width: '7%' }} />}
                                                                    <col style={{ width: canViewPricing() ? '4%' : '6%' }} />
                                                                    {canViewPricing() && <col style={{ width: '7%' }} />}
                                                                    <col style={{ width: canViewPricing() ? '6%' : '8%' }} />
                                                                    <col style={{ width: canViewPricing() ? '6%' : '8%' }} />
                                                                </colgroup>
                                                                <thead>
                                                                    <tr>
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Ngày ghi sổ</th>
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Số chứng từ</th>
                                                                        <th style={{ whiteSpace: 'nowrap' }}>Nghiệp vụ</th>
                                                                        <th className={styles.colProductCode}>Mã hàng</th>
                                                                        <th className={styles.colProductName}>Tên hàng</th>
                                                                        <th className={styles.colWarehouse}>Kho</th>
                                                                        <th className={styles.colUnit}>ĐVT</th>
                                                                        {canViewPricing() && <th className={styles.textRight} style={{ whiteSpace: 'nowrap' }}>Đơn giá vốn</th>}
                                                                        <th className={styles.textRight} style={{ width: '70px', minWidth: '70px' }}>SL Nhập</th>
                                                                        {canViewPricing() && <th className={styles.textRight} style={{ whiteSpace: 'nowrap' }}>Tiền nhập</th>}
                                                                        <th className={styles.textRight} style={{ width: '70px', minWidth: '70px' }}>SL Xuất</th>
                                                                        {canViewPricing() && <th className={styles.textRight} style={{ whiteSpace: 'nowrap' }}>Tiền xuất</th>}
                                                                        <th className={styles.textRight} style={{ whiteSpace: 'nowrap' }}>Tồn trước giao dịch</th>
                                                                        <th className={styles.textRight} style={{ whiteSpace: 'nowrap' }}>Tồn sau giao dịch</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item, idx) => (
                                                                        <tr key={item.ledgerId || idx}>
                                                                            <td title={`Ngày chứng từ: ${formatDate(item.documentDate)}`}>{formatDate(item.movementAt)}</td>
                                                                            <td className={styles.fontSemibold} title={item.documentNumber}>{item.documentNumber}</td>
                                                                            <td>
                                                                                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                                                                    {(() => {
                                                                                        const t = item.documentType;
                                                                                        if (item.movementType === 'UNPOST_EXPORT') return 'Hoàn tác xuất kho';
                                                                                        if (item.movementType === 'UNPOST_IMPORT') return 'Hoàn tác nhập kho';
                                                                                        if (t === 'IN_PO') return 'Mua hàng';
                                                                                        if (t === 'EX_SO') return 'Bán hàng';
                                                                                        if (t === 'IN_RET') return 'Khách trả hàng';
                                                                                        if (t === 'EX_RET') return 'Trả hàng NCC';
                                                                                        if (t === 'IN_TRF') return 'Nhận chuyển kho';
                                                                                        if (t === 'EX_TRF') return 'Xuất chuyển kho';
                                                                                        if (t === 'IN_ADJ') return 'Nhập kiểm kê';
                                                                                        if (t === 'EX_ADJ') return 'Xuất kiểm kê';
                                                                                        if (t === 'IN_REPAIR') return 'Nhập sau sửa chữa';
                                                                                        if (t === 'EX_REPAIR') return 'Xuất sửa chữa';
                                                                                        if (t === 'IN_BUILD') return 'Nhập lắp ráp';
                                                                                        if (t === 'EX_BUILD') return 'Xuất lắp ráp/tháo dỡ';
                                                                                        return t;
                                                                                    })()}
                                                                                </span>
                                                                            </td>
                                                                            <td className={styles.colProductCode} title={item.productCode}>{item.productCode}</td>
                                                                            <td className={styles.colProductName} title={item.productName}>{item.productName}</td>
                                                                            <td className={styles.colWarehouse} title={item.warehouseName}>{item.warehouseName}</td>
                                                                            <td className={styles.colUnit}>{item.unitName || '-'}</td>
                                                                            {canViewPricing() && <td className={styles.textRight} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.unitPrice)}</td>}
                                                                            <td className={`${styles.textRight} ${styles.textSuccess}`}>{item.quantityIn > 0 ? formatQuantity(item.quantityIn) : '-'}</td>
                                                                            {canViewPricing() && <td className={styles.textRight}>{item.quantityIn > 0 ? formatCurrency(item.amountIn) : '-'}</td>}
                                                                            <td className={`${styles.textRight} ${styles.textDanger}`}>{item.quantityOut > 0 ? formatQuantity(item.quantityOut) : '-'}</td>
                                                                            {canViewPricing() && <td className={styles.textRight}>{item.quantityOut > 0 ? formatCurrency(item.amountOut) : '-'}</td>}
                                                                            <td className={styles.textRight}>{formatQuantity(item.balanceBefore)}</td>
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`}>{formatQuantity(item.balanceAfter)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {/* 4. STOCK TRANSFERS REPORT */}
                                                        {activeReport.id === 'stock-transfers' && (
                                                            <table className={`${styles.reportTable} ${styles.boldTable}`}>
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
                                                                                <span className={`${styles.badge} ${item.status === 'POSTED' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                                                                    {item.status === 'POSTED' ? 'Hoàn thành'
                                                                                        : item.status === 'IN_TRANSIT' ? 'Đang chuyển'
                                                                                            : item.status === 'APPROVED' ? 'Đã duyệt, chờ xuất'
                                                                                                : item.status === 'CANCELLED' ? 'Đã hủy' : item.status}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {/* 5. DEBT REPORT */}
                                                        {activeReport.id === 'debt' && (
                                                            <table className={`${styles.reportTable} ${styles.boldTable}`}>
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
                                                            <table className={`${styles.reportTable} ${styles.boldTable}`}>
                                                                <thead>
                                                                    <tr>
                                                                        <th className={styles.colProductCode}>Mã hàng</th>
                                                                        <th className={styles.colProductName}>Tên hàng</th>
                                                                        <th className={styles.colUnit}>ĐVT</th>
                                                                        <th className={styles.textRight}>Số lượng bán</th>
                                                                        <th className={styles.textRight}>Tổng doanh thu</th>
                                                                        <th className={styles.textRight}>VAT</th>
                                                                        <th className={styles.textRight}>Tổng sau VAT</th>
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
                                                                            <td className={styles.textRight}>{formatCurrency(item.vatAmount)}</td>
                                                                            <td className={styles.textRight}>{formatCurrency(item.totalAmount)}</td>
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

                                                        {activeReport.id === 'repair-profit' && (
                                                            <table className={`${styles.reportTable} ${styles.boldTable}`}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Mã lệnh</th>
                                                                        <th>Ngày hoàn thành</th>
                                                                        <th>Khách hàng</th>
                                                                        <th className={styles.textRight}>Doanh thu linh kiện</th>
                                                                        <th className={styles.textRight}>Doanh thu dịch vụ</th>
                                                                        <th className={styles.textRight}>VAT</th>
                                                                        <th className={styles.textRight}>Giá vốn FIFO</th>
                                                                        <th className={styles.textRight}>Lợi nhuận gộp</th>
                                                                        <th className={styles.textRight}>Tỷ suất LN (%)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {paginatedData.map((item) => (
                                                                        <tr key={item.repairId}>
                                                                            <td className={styles.fontSemibold}>{item.repairCode}</td>
                                                                            <td>{formatDateOnly(item.completedDate)}</td>
                                                                            <td>{item.partnerName || '-'}</td>
                                                                            <td className={`${styles.textRight} ${styles.textSuccess}`}>{formatCurrency(item.partsRevenue)}</td>
                                                                            <td className={`${styles.textRight} ${styles.textSuccess}`}>{formatCurrency(item.serviceRevenue)}</td>
                                                                            <td className={styles.textRight}>{formatCurrency(item.vatAmount)}</td>
                                                                            <td className={styles.textRight}>{formatCurrency(item.costAmount)}</td>
                                                                            <td className={`${styles.textRight} ${styles.fontSemibold}`} style={{ color: item.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                                                {formatCurrency(item.grossProfit)}
                                                                            </td>
                                                                            <td className={styles.textRight}>{Number(item.profitMarginPercent || 0).toFixed(2)}%</td>
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
                                                                            <i className="bi bi-arrow-down"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Tổng thu trong kỳ</span>
                                                                            <strong style={{ color: 'var(--wms-success)' }}>
                                                                                {formatCurrency(cashFlowSummary?.totalReceipts || 0)}
                                                                            </strong>
                                                                        </div>
                                                                    </div>

                                                                    <div className={styles.kpiCard}>
                                                                        <div className={styles.kpiIconBox} style={{ background: '#fef2f2', color: 'var(--wms-danger)' }}>
                                                                            <i className="bi bi-arrow-up"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Tổng chi trong kỳ</span>
                                                                            <strong style={{ color: 'var(--wms-danger)' }}>
                                                                                {formatCurrency(cashFlowSummary?.totalVouchers || 0)}
                                                                            </strong>
                                                                        </div>
                                                                    </div>

                                                                    <div className={styles.kpiCard}>
                                                                        <div className={styles.kpiIconBox} style={{ background: 'var(--color-primary-soft)', color: 'var(--wms-primary)' }}>
                                                                            <i className="bi bi-wallet2"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Dòng tiền ròng (Thu - Chi)</span>
                                                                            {(() => {
                                                                                const rec = Number(cashFlowSummary?.totalReceipts || 0);
                                                                                const vou = Number(cashFlowSummary?.totalVouchers || 0);
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
                                                                            <i className="bi bi-bank"></i>
                                                                        </div>
                                                                        <div className={styles.kpiDetails}>
                                                                            <span>Tiền mặt & Ngân hàng</span>
                                                                            <strong style={{ fontSize: '13px', color: 'var(--color-text-strong)' }}>
                                                                                Tiền mặt: {formatCurrency(cashFlowSummary?.closingCash || 0)}
                                                                                <br />
                                                                                Ngân hàng: {formatCurrency(cashFlowSummary?.closingBank || 0)}
                                                                            </strong>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <table className={`${styles.reportTable} ${styles.boldTable}`}>
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
                                                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.postedAt)}</td>
                                                                                <td className={styles.fontSemibold} style={{ color: 'var(--color-primary)' }}>{item.code || '-'}</td>
                                                                                <td>
                                                                                    <span style={{ color: 'var(--color-text-strong)' }}>
                                                                                        {item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className={styles.fontSemibold}>{item.partnerName || '-'}</td>
                                                                                <td>
                                                                                    <span style={{ color: 'var(--color-text-strong)' }}>
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
                                                                                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                                                        Đã ghi sổ
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
