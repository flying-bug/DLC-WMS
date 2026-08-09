import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getDashboardMetrics } from '../../api/reportApi';
import { readActiveWorkflow, saveActiveWorkflow } from '../../utils/workflowSession';
import styles from './WarehouseDashboard.module.css';

const WORKFLOWS = [
    {
        id: 'inbound',
        label: 'Nhập hàng',
        icon: 'fas fa-boxes',
        title: 'Mua và nhập hàng',
        description: 'Từ khai báo hàng hóa đến ghi nhận hàng thực nhập.',
        steps: [
            { title: 'Khai báo hàng hóa', description: 'Chỉ thực hiện khi mặt hàng chưa tồn tại.', path: '/products' },
            { title: 'Tạo đơn mua hàng', description: 'Chọn nhà cung cấp, hàng hóa và số lượng.', path: '/purchase-orders/create' },
            { title: 'Duyệt đơn mua', description: 'Kiểm tra đơn trước khi nhận hàng.', path: '/purchase-orders' },
            { title: 'Lập phiếu nhập kho', description: 'Ghi nhận số lượng thực nhận.', path: '/import-history/create' },
            { title: 'Theo dõi nhập kho', description: 'Kiểm tra chứng từ và tồn kho.', path: '/import-history' },
        ],
    },
    {
        id: 'outbound',
        label: 'Bán hàng',
        icon: 'bi bi-cart3',
        title: 'Bán và xuất hàng',
        description: 'Từ đơn bán đến xuất kho và theo dõi thanh toán.',
        steps: [
            { title: 'Tạo đơn bán hàng', description: 'Chọn khách hàng, hàng hóa và giá bán.', path: '/sales-orders/create' },
            { title: 'Duyệt đơn bán', description: 'Kiểm tra và xác nhận giữ hàng.', path: '/sales-orders' },
            { title: 'Lập phiếu xuất kho', description: 'Tạo chứng từ xuất theo đơn bán.', path: '/export-slips/create' },
            { title: 'Theo dõi xuất hàng', description: 'Kiểm tra giao hàng và chứng từ.', path: '/export-slips' },
            { title: 'Ghi nhận thu tiền', description: 'Theo dõi thanh toán và công nợ.', path: '/payments' },
        ],
    },
    {
        id: 'transfer',
        label: 'Chuyển kho',
        icon: 'fas fa-exchange-alt',
        title: 'Chuyển kho nội bộ',
        description: 'Điều chuyển và đối chiếu tồn giữa kho nguồn, kho đích.',
        steps: [
            { title: 'Kiểm tra tồn kho', description: 'Xác định hàng có thể điều chuyển.', path: '/reports' },
            { title: 'Tạo phiếu chuyển', description: 'Chọn kho nguồn, kho đích và hàng hóa.', path: '/transfer-history/create' },
            { title: 'Xác nhận điều chuyển', description: 'Hoàn tất chứng từ bàn giao.', path: '/transfer-history' },
            { title: 'Đối chiếu tồn kho', description: 'Kiểm tra số dư mới tại hai kho.', path: '/reports' },
        ],
    },
    {
        id: 'assembly',
        label: 'Lắp ráp',
        icon: 'fas fa-tools',
        title: 'Lắp ráp / Tháo dỡ',
        description: 'Từ cấu hình định mức đến biến động linh kiện, thành phẩm.',
        steps: [
            { title: 'Tạo cấu hình', description: 'Khai báo thành phẩm và định mức.', path: '/assembly-boms/create' },
            { title: 'Tạo lệnh', description: 'Chọn cấu hình, kho và số lượng.', path: '/assembly-orders/create' },
            { title: 'Thực hiện lệnh', description: 'Ghi nhận linh kiện sử dụng hoặc thu hồi.', path: '/assembly-orders' },
            { title: 'Kiểm tra tồn kho', description: 'Đối chiếu linh kiện và thành phẩm.', path: '/reports' },
        ],
    },
    {
        id: 'stocktake',
        label: 'Kiểm kê',
        icon: 'fas fa-clipboard-check',
        title: 'Kiểm kê kho',
        description: 'Ghi nhận số thực tế, đối chiếu và điều chỉnh tồn.',
        steps: [
            { title: 'Tạo đợt kiểm kê', description: 'Chọn kho và phạm vi hàng hóa.', path: '/stocktakes/create' },
            { title: 'Nhập số thực tế', description: 'Ghi nhận số lượng đếm được.', path: '/stocktakes' },
            { title: 'Đối chiếu chênh lệch', description: 'Kiểm tra nguyên nhân thừa thiếu.', path: '/stocktakes' },
            { title: 'Hoàn tất kiểm kê', description: 'Xác nhận và cập nhật số tồn.', path: '/stocktakes' },
        ],
    },
];

const OPERATION_GROUPS = [
    {
        id: 'assembly', label: 'Lắp ráp / Tháo dỡ', icon: 'fas fa-tools', position: 'top', area: 'assembly',
        actions: [
            { label: 'Tạo cấu hình', description: 'Khai báo định mức linh kiện', path: '/assembly-boms/create', icon: 'fas fa-sitemap' },
            { label: 'Tạo lệnh', description: 'Lập lệnh lắp ráp hoặc tháo dỡ', path: '/assembly-orders/create', icon: 'fas fa-file-medical' },
            { label: 'Theo dõi lệnh', description: 'Kiểm tra trạng thái thực hiện', path: '/assembly-orders', icon: 'fas fa-tasks' },
        ],
    },
    {
        id: 'outbound', label: 'Xuất kho', icon: 'fas fa-truck-loading', position: 'top', area: 'outbound',
        actions: [
            { label: 'Tạo đơn bán', description: 'Lập đơn cho khách hàng', path: '/sales-orders/create', icon: 'bi bi-cart-plus' },
            { label: 'Lập phiếu xuất', description: 'Ghi nhận hàng giao khỏi kho', path: '/export-slips/create', icon: 'fas fa-truck-loading' },
            { label: 'Thu chi', description: 'Theo dõi thanh toán và công nợ', path: '/payments', icon: 'bi bi-cash-coin' },
        ],
    },
    {
        id: 'transfer', label: 'Chuyển kho', icon: 'fas fa-exchange-alt', position: 'top', area: 'transfer',
        actions: [
            { label: 'Tạo phiếu chuyển', description: 'Điều chuyển hàng giữa hai kho', path: '/transfer-history/create', icon: 'fas fa-file-medical' },
            { label: 'Lịch sử chuyển', description: 'Theo dõi chứng từ điều chuyển', path: '/transfer-history', icon: 'fas fa-history' },
            { label: 'Báo cáo chuyển kho', description: 'Đối chiếu hàng đã điều chuyển', reportId: 'stock-transfers', icon: 'fas fa-chart-bar' },
        ],
    },
    {
        id: 'stocktake', label: 'Kiểm kê', icon: 'fas fa-clipboard-check', position: 'top', area: 'stocktake',
        actions: [
            { label: 'Tạo đợt kiểm kê', description: 'Mở đợt kiểm kê kho mới', path: '/stocktakes/create', icon: 'fas fa-clipboard-list' },
            { label: 'Theo dõi kiểm kê', description: 'Nhập số thực tế và đối chiếu', path: '/stocktakes', icon: 'fas fa-tasks' },
            { label: 'Báo cáo tồn kho', description: 'Kiểm tra số lượng tồn hiện tại', reportId: 'inventory-balance', icon: 'fas fa-chart-bar' },
        ],
    },
    {
        id: 'inbound', label: 'Nhập kho', icon: 'fas fa-dolly', position: 'bottom', area: 'inbound',
        actions: [
            { label: 'Thêm hàng hóa', description: 'Khai báo sản phẩm mới', path: '/products', icon: 'fas fa-box-open' },
            { label: 'Tạo đơn mua', description: 'Đặt hàng nhà cung cấp', path: '/purchase-orders/create', icon: 'bi bi-bag-plus' },
            { label: 'Lập phiếu nhập', description: 'Ghi nhận hàng thực nhận', path: '/import-history/create', icon: 'fas fa-dolly' },
        ],
    },
    {
        id: 'config', label: 'Quản lý cấu hình', icon: 'fas fa-sitemap', position: 'bottom', area: 'config',
        actions: [
            { label: 'Hàng hóa', description: 'Quản lý hàng hóa và dịch vụ', path: '/products', icon: 'fas fa-box' },
            { label: 'Kho', description: 'Thiết lập danh mục kho', path: '/warehouses', icon: 'fas fa-warehouse' },
            { label: 'Cấu hình BOM', description: 'Quản lý định mức lắp ráp', path: '/assembly-boms', icon: 'fas fa-sitemap' },
        ],
    },
];

const REPORT_ITEMS = [
    { id: 'inventory-summary', label: 'Tổng hợp Nhập – Xuất – Tồn', description: 'Biến động số lượng và giá trị trong kỳ', icon: 'fas fa-chart-area' },
    { id: 'inventory-balance', label: 'Tồn kho hiện tại', description: 'Số lượng và giá trị tồn theo kho', icon: 'fas fa-boxes' },
    { id: 'stock-ledger', label: 'Sổ chi tiết hàng hóa', description: 'Theo dõi từng chứng từ nhập xuất', icon: 'fas fa-book-open' },
    { id: 'stock-transfers', label: 'Chuyển kho nội bộ', description: 'Đối chiếu hàng giữa các kho', icon: 'fas fa-exchange-alt' },
    { id: 'debt', label: 'Công nợ đối tác', description: 'Phải thu và phải trả theo đối tác', icon: 'fas fa-file-invoice-dollar' },
];

const EMPTY_METRICS = {
    totalInventoryValue: 0,
    totalImportThisMonth: 0,
    totalExportThisMonth: 0,
    totalCustomerDebt: 0,
    totalSupplierDebt: 0,
    lowStockItemsCount: 0,
    outOfStockItemsCount: 0,
    newWarrantyTickets: 0,
};

const unwrap = response => response?.data?.data ?? response?.data ?? null;
const toNumber = value => Number(value || 0);
const formatCurrency = value => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
}).format(toNumber(value));
function WarehouseDashboard() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState(EMPTY_METRICS);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [activeOperationId, setActiveOperationId] = useState(null);
    const [activeWorkflowId, setActiveWorkflowId] = useState(() => {
        const storedWorkflowId = readActiveWorkflow()?.workflowId;
        return WORKFLOWS.some(item => item.id === storedWorkflowId) ? storedWorkflowId : 'inbound';
    });

    const activeWorkflow = WORKFLOWS.find(item => item.id === activeWorkflowId) || WORKFLOWS[0];
    const activeOperation = OPERATION_GROUPS.find(item => item.id === activeOperationId) || null;
    const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date());
    const importValue = toNumber(metrics.totalImportThisMonth);
    const exportValue = toNumber(metrics.totalExportThisMonth);
    const movementMax = Math.max(importValue, exportValue, 1);
    const stockAlertCount = toNumber(metrics.lowStockItemsCount) + toNumber(metrics.outOfStockItemsCount);

    const fetchMetrics = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await getDashboardMetrics();
            const payload = unwrap(response);
            setMetrics({ ...EMPTY_METRICS, ...(payload || {}) });
            setLoadError('');
        } catch (error) {
            console.error('Không thể tải dữ liệu tổng quan:', error);
            setLoadError(error.response?.data?.userMessage || 'Không thể tải số liệu tổng quan.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    const displayMetric = (value, formatter = valueToFormat => String(valueToFormat)) => {
        if (loading || loadError) return '—';
        return formatter(value);
    };

    const openWorkflowStep = (workflow, stepIndex = 0) => {
        saveActiveWorkflow(workflow, stepIndex);
        navigate(workflow.steps[stepIndex].path);
    };

    const openOperationAction = action => {
        if (action.reportId) {
            navigate('/reports', { state: { reportId: action.reportId, fromDashboard: true } });
            return;
        }
        navigate(action.path);
    };

    const summaryItems = [
        {
            label: 'Giá trị tồn kho',
            value: displayMetric(metrics.totalInventoryValue, formatCurrency),
            note: 'Giá vốn hàng đang lưu kho',
            path: '/reports',
            icon: 'fas fa-cubes',
            tone: 'blue',
        },
        {
            label: 'Nhập kho tháng này',
            value: displayMetric(metrics.totalImportThisMonth, formatCurrency),
            note: `Giá trị nhập · ${monthLabel}`,
            path: '/import-history',
            icon: 'fas fa-arrow-down',
            tone: 'green',
        },
        {
            label: 'Xuất kho tháng này',
            value: displayMetric(metrics.totalExportThisMonth, formatCurrency),
            note: `Giá trị xuất · ${monthLabel}`,
            path: '/export-slips',
            icon: 'fas fa-arrow-up',
            tone: 'orange',
        },
        {
            label: 'Phải thu khách hàng',
            value: displayMetric(metrics.totalCustomerDebt, formatCurrency),
            note: 'Công nợ cần thu',
            path: '/payments',
            icon: 'fas fa-hand-holding-usd',
            tone: 'violet',
        },
        {
            label: 'Phải trả nhà cung cấp',
            value: displayMetric(metrics.totalSupplierDebt, formatCurrency),
            note: 'Công nợ cần thanh toán',
            path: '/payments',
            icon: 'fas fa-file-invoice-dollar',
            tone: 'red',
        },
        {
            label: 'Hàng hóa cần chú ý',
            value: displayMetric(stockAlertCount, value => `${value} cảnh báo tồn`),
            note: loading || loadError
                ? 'Chưa có dữ liệu cảnh báo'
                : `${toNumber(metrics.lowStockItemsCount)} hàng sắp hết · ${toNumber(metrics.outOfStockItemsCount)} hàng hết`,
            path: '/products',
            icon: 'fas fa-exclamation-triangle',
            tone: 'yellow',
            compact: true,
        },
    ];

    return (
        <AdminLayout>
            <div className={styles.dashboardPage}>
                <header className={styles.pageHeader}>
                    <div>
                        <p className={styles.eyebrow}>Trung tâm vận hành</p>
                        <h1>Tổng quan kho hàng</h1>
                        <p>Theo dõi nhập xuất, hàng hóa và công nợ trên cùng một màn hình.</p>
                    </div>
                    <div className={styles.headerMeta}>
                        <span><i className="far fa-calendar-alt" aria-hidden="true"></i>{monthLabel}</span>
                        <button type="button" onClick={() => fetchMetrics(true)} disabled={refreshing}>
                            <i className={`fas fa-sync-alt ${refreshing ? styles.spinning : ''}`} aria-hidden="true"></i>
                            <span>{refreshing ? 'Đang cập nhật' : 'Làm mới'}</span>
                        </button>
                    </div>
                </header>

                {loadError && (
                    <div className={styles.errorBanner} role="alert">
                        <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                        <span>{loadError} Các chức năng nhanh vẫn có thể sử dụng bình thường.</span>
                        <button type="button" onClick={() => fetchMetrics()}>Thử lại</button>
                    </div>
                )}

                <section className={`${styles.panel} ${styles.snapshotPanel}`}>
                    <div className={styles.snapshotHeading}>
                        <div>
                            <p className={styles.panelKicker}>Số liệu tức thời</p>
                            <h2>Tình hình kho tháng này</h2>
                        </div>
                        <span>Đơn vị tính: VND</span>
                    </div>
                    <div className={styles.summaryGrid} aria-label="Chỉ số tổng quan">
                        {summaryItems.map(item => (
                            <button type="button" key={item.label} className={styles.summaryCard} onClick={() => navigate(item.path)}>
                                <span className={`${styles.summaryIcon} ${styles[item.tone]}`}><i className={item.icon} aria-hidden="true"></i></span>
                                <span className={styles.summaryCopy}>
                                    <small>{item.label}</small>
                                    <strong
                                        className={item.compact ? styles.summaryValueCompact : ''}
                                        title={item.compact ? `${item.value}. Đây là số cảnh báo tồn, không phải tổng số hàng hóa.` : item.value}
                                    >
                                        {item.value}
                                    </strong>
                                    <span>{item.note}</span>
                                </span>
                                <i className={`fas fa-chevron-right ${styles.summaryArrow}`} aria-hidden="true"></i>
                            </button>
                        ))}
                    </div>
                </section>

                <div className={styles.overviewGrid}>
                    <section className={`${styles.panel} ${styles.movementPanel}`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelKicker}>Luân chuyển hàng hóa</p>
                                <h2>Nhập – xuất trong tháng</h2>
                            </div>
                            <button type="button" className={styles.textButton} onClick={() => navigate('/reports', { state: { reportId: 'inventory-summary', fromDashboard: true } })}>
                                Xem báo cáo <i className="fas fa-arrow-right" aria-hidden="true"></i>
                            </button>
                        </div>

                        <div className={styles.movementRows}>
                            <div className={styles.movementRow}>
                                <div><span className={`${styles.legendDot} ${styles.green}`}></span><strong>Nhập kho</strong><small>{formatCurrency(importValue)}</small></div>
                                <span className={styles.barTrack}><span className={styles.importBar} style={{ width: loading || loadError ? '0%' : `${(importValue / movementMax) * 100}%` }}></span></span>
                            </div>
                            <div className={styles.movementRow}>
                                <div><span className={`${styles.legendDot} ${styles.orange}`}></span><strong>Xuất kho</strong><small>{formatCurrency(exportValue)}</small></div>
                                <span className={styles.barTrack}><span className={styles.exportBar} style={{ width: loading || loadError ? '0%' : `${(exportValue / movementMax) * 100}%` }}></span></span>
                            </div>
                        </div>

                        <div className={styles.movementFooter}>
                            <span>Chênh lệch giá trị nhập – xuất</span>
                            <strong>{displayMetric(importValue - exportValue, formatCurrency)}</strong>
                        </div>
                    </section>

                    <section className={`${styles.panel} ${styles.inventoryPanel}`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelKicker}>Tình trạng hàng hóa</p>
                                <h2>Hàng hóa cần chú ý</h2>
                            </div>
                            <button type="button" className={styles.iconLink} onClick={() => navigate('/products')} aria-label="Mở danh sách hàng hóa">
                                <i className="fas fa-arrow-right" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div className={styles.alertStats}>
                            <button type="button" onClick={() => navigate('/products')}>
                                <span className={styles.warningIcon}><i className="fas fa-battery-quarter" aria-hidden="true"></i></span>
                                <span><strong>{displayMetric(metrics.lowStockItemsCount)}</strong><small>Sắp hết hàng</small></span>
                            </button>
                            <button type="button" onClick={() => navigate('/products')}>
                                <span className={styles.dangerIcon}><i className="fas fa-box-open" aria-hidden="true"></i></span>
                                <span><strong>{displayMetric(metrics.outOfStockItemsCount)}</strong><small>Đã hết hàng</small></span>
                            </button>
                        </div>
                        <div className={styles.warrantyRow}>
                            <span><i className="fas fa-shield-alt" aria-hidden="true"></i> Phiếu bảo hành mới trong tháng</span>
                            <button type="button" onClick={() => navigate('/warranties')}>{displayMetric(metrics.newWarrantyTickets)} <i className="fas fa-chevron-right" aria-hidden="true"></i></button>
                        </div>
                    </section>
                </div>

                <div className={styles.detailGrid}>
                    <section className={`${styles.panel} ${styles.quickPanel}`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelKicker}>Bản đồ nghiệp vụ</p>
                                <h2>Thao tác theo công việc</h2>
                                <span className={styles.panelDescription}>Chọn nghiệp vụ để mở các chức năng thường dùng.</span>
                            </div>
                        </div>
                        <div className={styles.operationMap}>
                            {OPERATION_GROUPS.map(operation => (
                                <button
                                    type="button"
                                    key={operation.id}
                                    className={`${styles.operationNode} ${styles[`${operation.position}Node`]} ${activeOperation?.id === operation.id ? styles.operationNodeActive : ''}`}
                                    style={{ gridArea: operation.area }}
                                    aria-pressed={activeOperation?.id === operation.id}
                                    onClick={() => setActiveOperationId(operation.id)}
                                >
                                    <span><i className={operation.icon} aria-hidden="true"></i></span>
                                    <strong>{operation.label}</strong>
                                </button>
                            ))}
                        </div>
                        {activeOperation ? (
                            <div className={styles.operationActions}>
                                <div className={styles.operationActionsHeader}>
                                    <span><i className={activeOperation.icon} aria-hidden="true"></i></span>
                                    <div><small>Chức năng nhanh</small><strong>{activeOperation.label}</strong></div>
                                </div>
                                <div className={styles.operationActionGrid}>
                                    {activeOperation.actions.map(action => (
                                        <button type="button" key={action.label} onClick={() => openOperationAction(action)}>
                                            <span><i className={action.icon} aria-hidden="true"></i></span>
                                            <span><strong>{action.label}</strong><small>{action.description}</small></span>
                                            <i className="fas fa-chevron-right" aria-hidden="true"></i>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={`${styles.operationActions} ${styles.operationActionsEmpty}`}>
                                <span><i className="fas fa-hand-pointer" aria-hidden="true"></i></span>
                                <div>
                                    <strong>Chưa chọn nghiệp vụ</strong>
                                    <small>Chọn một nghiệp vụ trên bản đồ để xem các chức năng nhanh.</small>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className={`${styles.panel} ${styles.financePanel}`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelKicker}>Tài chính & tra cứu</p>
                                <h2>Thu chi và báo cáo</h2>
                            </div>
                            <button type="button" className={styles.textButton} onClick={() => navigate('/payments')}>Mở thu chi <i className="fas fa-arrow-right" aria-hidden="true"></i></button>
                        </div>
                        <div className={styles.debtList}>
                            <button type="button" onClick={() => navigate('/payments')}>
                                <span className={`${styles.debtIcon} ${styles.violet}`}><i className="fas fa-arrow-down" aria-hidden="true"></i></span>
                                <span><small>Khách hàng còn phải trả</small><strong>{displayMetric(metrics.totalCustomerDebt, formatCurrency)}</strong></span>
                            </button>
                            <button type="button" onClick={() => navigate('/payments')}>
                                <span className={`${styles.debtIcon} ${styles.red}`}><i className="fas fa-arrow-up" aria-hidden="true"></i></span>
                                <span><small>Cần trả nhà cung cấp</small><strong>{displayMetric(metrics.totalSupplierDebt, formatCurrency)}</strong></span>
                            </button>
                        </div>
                        <div className={styles.reportSectionHeader}>
                            <div><strong>Báo cáo thường dùng</strong><span>Tra cứu nhanh số liệu kho và công nợ</span></div>
                            <button type="button" onClick={() => navigate('/reports')} aria-label="Mở tất cả báo cáo">
                                Tất cả <i className="fas fa-arrow-right" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div className={styles.reportList}>
                            {REPORT_ITEMS.map(report => (
                                <button
                                    type="button"
                                    key={report.id}
                                    onClick={() => navigate('/reports', { state: { reportId: report.id, fromDashboard: true } })}
                                >
                                    <span><i className={report.icon} aria-hidden="true"></i></span>
                                    <span><strong>{report.label}</strong><small>{report.description}</small></span>
                                    <i className="fas fa-chevron-right" aria-hidden="true"></i>
                                </button>
                            ))}
                        </div>
                    </section>

                </div>

                <section className={`${styles.panel} ${styles.workflowPanel}`}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelKicker}>Hướng dẫn thao tác</p>
                            <h2>Quy trình nghiệp vụ</h2>
                            <span className={styles.panelDescription}>Chọn một luồng khi cần hệ thống nhắc bước tiếp theo xuyên suốt các màn hình.</span>
                        </div>
                    </div>
                    <div className={styles.workflowLayout}>
                        <div className={styles.workflowSelector} role="tablist" aria-label="Chọn quy trình nghiệp vụ">
                            {WORKFLOWS.map(workflow => (
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeWorkflow.id === workflow.id}
                                    key={workflow.id}
                                    className={activeWorkflow.id === workflow.id ? styles.workflowActive : ''}
                                    onClick={() => setActiveWorkflowId(workflow.id)}
                                >
                                    <i className={workflow.icon} aria-hidden="true"></i>
                                    <span>{workflow.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.workflowPreview} role="tabpanel">
                            <div className={styles.workflowIntro}>
                                <div><strong>{activeWorkflow.title}</strong><span>{activeWorkflow.description}</span></div>
                                <button type="button" onClick={() => openWorkflowStep(activeWorkflow, 0)}>Bắt đầu <i className="fas fa-arrow-right" aria-hidden="true"></i></button>
                            </div>
                            <ol className={styles.workflowSteps} style={{ '--workflow-step-count': activeWorkflow.steps.length }}>
                                {activeWorkflow.steps.map((step, index) => (
                                    <li key={`${activeWorkflow.id}-${step.title}`}>
                                        <button type="button" onClick={() => openWorkflowStep(activeWorkflow, index)}>
                                            <span>{index + 1}</span>
                                            <strong>{step.title}</strong>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

export default WarehouseDashboard;
