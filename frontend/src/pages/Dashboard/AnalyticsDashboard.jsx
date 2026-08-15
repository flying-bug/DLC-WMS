import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Modal from '../../components/ui/Modal/Modal';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ComposedChart
} from 'recharts';
import { getDashboardMetrics } from '../../api/reportApi';
import { formatDateOnly, formatDateTime as utilsFormatDateTime } from '../../utils/dateFormat';
import styles from './AnalyticsDashboard.module.css';

const money = (value) =>
    `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const quantity = (value) =>
    Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

const formatDate = (value) => (value ? formatDateOnly(value) : 'Chưa có');

const formatDateTime = (value) => {
    if (!value) return 'Chưa có';
    // Remove any trailing Z or offset to force it to be treated as local time
    const localValue = String(value).replace(/[zZ].*|[+-]\d{2}:?\d{2}$/, '');
    return utilsFormatDateTime(localValue);
};

const shortMoney = (value) => {
    const amount = Number(value || 0);
    if (Math.abs(amount) >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (Math.abs(amount) >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
        return `${(amount / 1_000).toFixed(1)}K`;
    }
    return amount.toLocaleString('vi-VN');
};

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};

const KPI_SPARKLINES = {
    inventory: [{ v: 82 }, { v: 88 }, { v: 90 }, { v: 96 }, { v: 104 }, { v: 110 }],
    purchaseOrders: [{ v: 2 }, { v: 4 }, { v: 5 }, { v: 7 }, { v: 8 }, { v: 9 }],
    salesOrders: [{ v: 1 }, { v: 2 }, { v: 4 }, { v: 5 }, { v: 7 }, { v: 8 }],
    lowStock: [{ v: 9 }, { v: 8 }, { v: 7 }, { v: 6 }, { v: 6 }, { v: 5 }],
    repairs: [{ v: 1 }, { v: 2 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 4 }]
};

const ORDER_STATUS_LABELS = {
    DRAFT: 'Nháp',
    APPROVED: 'Đã duyệt',
    POSTED: 'Ghi sổ',
    CANCELLED: 'Đã hủy'
};

const REPAIR_STATUS_LABELS = {
    DRAFT: 'Nháp',
    QUOTATION: 'Báo giá',
    CONFIRMED: 'Đã xác nhận sửa chữa',
    UNDER_REPAIR: 'Đang sửa chữa',
    DONE: 'Hoàn tất',
    CANCELLED: 'Đã hủy'
};

const STATUS_LABELS = {
    ...ORDER_STATUS_LABELS,
    ...REPAIR_STATUS_LABELS,
    SUBMITTED: 'Hoàn thành'
};

const getTransactionStatusMeta = (status) => {
    const normalized = String(status || '').toUpperCase();
    switch (normalized) {
        case 'DRAFT':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#d1d5db' };
        case 'QUOTATION':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fdba74' };
        case 'CONFIRMED':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#93c5fd' };
        case 'UNDER_REPAIR':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fcd34d' };
        case 'APPROVED':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
        case 'POSTED':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe' };
        case 'SUBMITTED':
        case 'DONE':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#ccfbf1', color: '#0f766e', borderColor: '#5eead4' };
        case 'CANCELLED':
            return { label: STATUS_LABELS[normalized] || status, backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' };
        default:
            return { label: STATUS_LABELS[normalized] || status || 'Không rõ', backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' };
    }
};

const getTransactionIconMeta = (entityType) => {
    switch (entityType) {
        case 'PURCHASE_ORDER':
            return { icon: 'fas fa-box-open', backgroundColor: '#ffedd5', color: '#ea580c' };
        case 'SALES_ORDER':
            return { icon: 'fas fa-truck-loading', backgroundColor: '#dbeafe', color: '#2563eb' };
        case 'IMPORT_DOCUMENT':
            return { icon: 'fas fa-arrow-down', backgroundColor: '#dcfce7', color: '#16a34a' };
        case 'EXPORT_DOCUMENT':
            return { icon: 'fas fa-arrow-up', backgroundColor: '#e0f2fe', color: '#0284c7' };
        case 'ASSEMBLY_ORDER':
            return { icon: 'fas fa-cogs', backgroundColor: '#ede9fe', color: '#7c3aed' };
        case 'DISASSEMBLY_ORDER':
            return { icon: 'fas fa-tools', backgroundColor: '#fee2e2', color: '#dc2626' };
        case 'WARRANTY_REPAIR':
            return { icon: 'fas fa-shield-alt', backgroundColor: '#dbeafe', color: '#1d4ed8' };
        case 'REPAIR':
            return { icon: 'fas fa-wrench', backgroundColor: '#fef3c7', color: '#b45309' };
        default:
            return { icon: 'fas fa-history', backgroundColor: '#f3f4f6', color: '#4b5563' };
    }
};

function AnalyticsDashboard() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeDetail, setActiveDetail] = useState(null);
    const [inventoryFlowRange, setInventoryFlowRange] = useState('7days');
    const [categoryScope, setCategoryScope] = useState('all');
    const [financeRange, setFinanceRange] = useState(String(currentYear));

    const handleRowClick = (transaction) => {
        if (!transaction.entityId) return;
        switch(transaction.entityType) {
            case 'IMPORT_DOCUMENT':
                navigate(`/import-slips/${transaction.entityId}/edit`);
                break;
            case 'EXPORT_DOCUMENT':
                navigate(`/export-slips/${transaction.entityId}/edit`);
                break;
            case 'PURCHASE_ORDER':
                navigate(`/purchase-orders/${transaction.entityId}`);
                break;
            case 'SALES_ORDER':
                navigate(`/sales-orders/${transaction.entityId}`);
                break;
            case 'ASSEMBLY_ORDER':
            case 'DISASSEMBLY_ORDER':
                navigate(`/assembly-orders/${transaction.entityId}?mode=view`);
                break;
            case 'WARRANTY_REPAIR':
                navigate(`/warranties/${transaction.entityId}`);
                break;
            case 'REPAIR':
                navigate(`/repairs/${transaction.entityId}/edit`);
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadDashboard = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await getDashboardMetrics({
                    inventoryFlowRange,
                    categoryScope,
                    financeRange
                });
                if (isMounted) {
                    setDashboard(unwrap(response));
                }
            } catch (err) {
                if (isMounted) {
                    setError(err?.response?.data?.userMessage || 'Không thể tải dữ liệu dashboard.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadDashboard();
        return () => {
            isMounted = false;
        };
    }, [inventoryFlowRange, categoryScope, financeRange]);

    const finishedGoodInventoryItems = dashboard?.finishedGoodInventoryItems || [];
    const approvedPurchaseOrders = dashboard?.approvedPurchaseOrders || [];
    const approvedSalesOrders = dashboard?.approvedSalesOrders || [];
    const configuredLowStockProducts = dashboard?.configuredLowStockProducts || [];
    const confirmedWarrantyRepairs = dashboard?.confirmedWarrantyRepairs || [];
    const recentTransactions = dashboard?.recentTransactions || [];

    const trafficData = (dashboard?.inventoryFlow7Days || []).map((item) => ({
        name: item.label,
        nhap: Number(item.importQuantity || 0),
        xuat: Number(item.exportQuantity || 0)
    }));

    const pieColors = ['var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#0f766e'];
    const categoryData = (dashboard?.categoryInventoryBreakdown || []).map((item, index) => ({
        name: item.categoryName,
        value: Number(item.inventoryValue || 0),
        percentage: Number(item.percentage || 0),
        color: pieColors[index % pieColors.length]
    }));

    const financeData = (dashboard?.financeOverview || []).map((item) => ({
        month: item.label,
        thu: Number(item.receipts || 0),
        chi: Number(item.vouchers || 0),
        congNo: Number(item.closingDebt || 0)
    }));

    const topInventoryItems = finishedGoodInventoryItems.slice(0, 5);
    const maxTopQuantity = topInventoryItems.reduce((max, item) => Math.max(max, Number(item.quantity || 0)), 0) || 1;

    const pendingTasks = [
        configuredLowStockProducts[0]
            ? {
                id: `low-${configuredLowStockProducts[0].productId}`,
                title: `${configuredLowStockProducts[0].productName} đang dưới ngưỡng tồn`,
                time: `Tồn ${quantity(configuredLowStockProducts[0].stockQty)} / Mức cảnh báo ${quantity(configuredLowStockProducts[0].minStockQty)}`,
                icon: 'fas fa-exclamation-triangle',
                color: 'red',
                onClick: () => setActiveDetail('lowStock')
            }
            : null,
        confirmedWarrantyRepairs[0]
            ? {
                id: `repair-${confirmedWarrantyRepairs[0].id}`,
                title: `${confirmedWarrantyRepairs[0].repairCode} đang chờ xử lý bảo hành`,
                time: confirmedWarrantyRepairs[0].partnerName || 'Chưa có khách hàng',
                icon: 'fas fa-tools',
                color: 'purple',
                onClick: () => setActiveDetail('repairs')
            }
            : null,
        approvedPurchaseOrders[0]
            ? {
                id: `po-${approvedPurchaseOrders[0].id}`,
                title: `${approvedPurchaseOrders[0].code} đã duyệt, chờ nhập hàng`,
                time: approvedPurchaseOrders[0].partnerName || 'Chưa có nhà cung cấp',
                icon: 'fas fa-box-open',
                color: 'orange',
                onClick: () => setActiveDetail('purchaseOrders')
            }
            : null
    ].filter(Boolean);

    const kpis = [
        {
            key: 'purchaseOrders',
            title: 'Đơn mua',
            value: quantity(dashboard?.approvedPurchaseOrdersCount || 0),
            icon: 'fas fa-box-open',
            color: 'orange',
            trend: 'Các đơn mua đang ở trạng thái đã duyệt',
            data: KPI_SPARKLINES.purchaseOrders
        },
        {
            key: 'backorderedSalesOrders',
            title: 'Đơn chờ nhập',
            value: quantity(dashboard?.backorderedSalesOrdersCount || 0),
            icon: 'fas fa-hourglass-half',
            color: 'primary',
            trend: 'Đơn bán duyệt nhưng chờ nhập hàng',
            data: KPI_SPARKLINES.salesOrders,
            onClick: () => navigate('/sales-orders?status=APPROVED&backordered=true')
        },
        {
            key: 'salesOrders',
            title: 'Đơn bán',
            value: quantity(dashboard?.approvedSalesOrdersCount || 0),
            icon: 'fas fa-truck-loading',
            color: 'green',
            trend: 'Các đơn bán đang ở trạng thái đã duyệt',
            data: KPI_SPARKLINES.salesOrders
        },
        {
            key: 'lowStock',
            title: 'Sắp hết hàng',
            value: `${quantity(dashboard?.configuredLowStockProductsCount || 0)} SP`,
            icon: 'fas fa-exclamation-triangle',
            color: 'red',
            trend: `${configuredLowStockProducts.length} sản phẩm hiện đang dưới mức cảnh báo`,
            data: KPI_SPARKLINES.lowStock
        },
        {
            key: 'repairs',
            title: 'Chờ bảo hành',
            value: `${quantity(dashboard?.confirmedWarrantyRepairsCount || 0)} đơn`,
            icon: 'fas fa-tools',
            color: 'purple',
            trend: 'Các đơn bảo hành đã xác nhận sửa chữa',
            data: KPI_SPARKLINES.repairs
        }
    ];

    const renderDetailTable = (columns, rows, emptyMessage, onRowClick) => (
        rows.length > 0 ? (
            <div className={styles.detailTableWrap}>
                <table className={styles.detailTable}>
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    style={column.align ? { textAlign: column.align } : undefined}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.id || row.variantId || row.productId || row.code}
                                className={onRowClick ? styles.clickableRow : undefined}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        style={column.align ? { textAlign: column.align } : undefined}
                                    >
                                        {column.render ? column.render(row) : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className={styles.detailEmpty}>{emptyMessage}</div>
        )
    );

    const renderActiveDetail = () => {
        if (activeDetail === 'inventory') {
            return renderDetailTable(
                [
                    { key: 'sku', label: 'SKU' },
                    { key: 'productName', label: 'Tên thành phẩm', render: (row) => row.variantName || row.productName },
                    { key: 'unitName', label: 'ĐVT' },
                    { key: 'quantity', label: 'Tồn kho', align: 'right', render: (row) => quantity(row.quantity) },
                    { key: 'inventoryValue', label: 'Giá trị tồn', align: 'right', render: (row) => money(row.inventoryValue) }
                ],
                finishedGoodInventoryItems,
                'Chưa có thành phẩm tồn kho trong các kho tiêu chuẩn.'
            );
        }

        if (activeDetail === 'purchaseOrders') {
            return renderDetailTable(
                [
                    { key: 'code', label: 'Mã đơn' },
                    { key: 'documentDate', label: 'Ngày đơn', render: (row) => formatDate(row.documentDate) },
                    { key: 'partnerName', label: 'Nhà cung cấp' },
                    { key: 'totalAmount', label: 'Tổng tiền', align: 'right', render: (row) => money(row.totalAmount) },
                    { key: 'status', label: 'Trạng thái', render: (row) => ORDER_STATUS_LABELS[row.status] || row.status }
                ],
                approvedPurchaseOrders,
                'Không có đơn mua đã duyệt.',
                (row) => navigate(`/purchase-orders/${row.id}`)
            );
        }

        if (activeDetail === 'salesOrders') {
            return renderDetailTable(
                [
                    { key: 'code', label: 'Mã đơn' },
                    { key: 'documentDate', label: 'Ngày đơn', render: (row) => formatDate(row.documentDate) },
                    { key: 'partnerName', label: 'Khách hàng' },
                    { key: 'warehouseName', label: 'Kho' },
                    { key: 'totalAmount', label: 'Tổng tiền', align: 'right', render: (row) => money(row.totalAmount) },
                    { key: 'status', label: 'Trạng thái', render: (row) => ORDER_STATUS_LABELS[row.status] || row.status }
                ],
                approvedSalesOrders,
                'Không có đơn bán đã duyệt.',
                (row) => navigate(`/sales-orders/${row.id}`)
            );
        }

        if (activeDetail === 'lowStock') {
            return renderDetailTable(
                [
                    { key: 'productCode', label: 'Mã hàng' },
                    { key: 'productName', label: 'Tên sản phẩm' },
                    { key: 'unitName', label: 'ĐVT' },
                    { key: 'stockQty', label: 'Tồn hiện tại', align: 'right', render: (row) => quantity(row.stockQty) },
                    { key: 'minStockQty', label: 'Mức cảnh báo', align: 'right', render: (row) => quantity(row.minStockQty) }
                ],
                configuredLowStockProducts,
                'Không có sản phẩm nào đang ở mức sắp hết hàng.'
            );
        }

        if (activeDetail === 'repairs') {
            return renderDetailTable(
                [
                    { key: 'repairCode', label: 'Mã phiếu' },
                    { key: 'receivedDate', label: 'Ngày tiếp nhận', render: (row) => formatDate(row.receivedDate) },
                    { key: 'partnerName', label: 'Khách hàng' },
                    { key: 'productName', label: 'Thiết bị' },
                    { key: 'repairStatus', label: 'Trạng thái', render: (row) => REPAIR_STATUS_LABELS[row.repairStatus] || row.repairStatus }
                ],
                confirmedWarrantyRepairs,
                'Không có đơn sửa chữa bảo hành ở trạng thái đã xác nhận sửa chữa.',
                (row) => navigate(`/repairs/${row.id}/edit`)
            );
        }

        return null;
    };

    const detailTitles = {
        inventory: 'Danh sách thành phẩm tồn kho',
        purchaseOrders: 'Danh sách đơn mua đã duyệt',
        salesOrders: 'Danh sách đơn bán đã duyệt',
        lowStock: 'Danh sách sản phẩm sắp hết hàng',
        repairs: 'Danh sách đơn sửa chữa bảo hành đã xác nhận'
    };

    return (
        <AdminLayout activeTab="main-dashboard">
            <div className={styles.dashboardWrapper}>
                <div className={styles.pageHeader}>
                    <div>
                        <h2 className={styles.pageTitle}>Tổng Quan Hoạt Động</h2>
                        <p className={styles.pageSubtitle}>Các chỉ số chính đang được lấy trực tiếp từ dữ liệu hệ thống.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className="btn-misa-outline" onClick={() => navigate('/import-history')}>
                            <i className="fas fa-plus"></i> Phiếu Nhập
                        </button>
                        <button className="btn-misa-primary" onClick={() => navigate('/export-slips')}>
                            <i className="fas fa-paper-plane"></i> Xuất Kho Mới
                        </button>
                    </div>
                </div>

                {error ? <div className={styles.errorBanner}>{error}</div> : null}

                <div className={styles.kpiGrid}>
                    {kpis.map((kpi) => {
                        const lineColors = {
                            primary: 'var(--color-primary)',
                            orange: '#f59e0b',
                            green: '#10b981',
                            red: '#ef4444',
                            purple: '#9333ea'
                        };

                        return (
                            <div
                                key={kpi.key}
                                className={`${styles.kpiCard} ${styles[kpi.color]} ${loading ? styles.kpiCardDisabled : ''}`}
                                onClick={() => {
                                    if (loading) return;
                                    if (kpi.onClick) {
                                        kpi.onClick();
                                    } else {
                                        setActiveDetail(kpi.key);
                                    }
                                }}
                            >
                                <div className={styles.kpiTop}>
                                    <div className={styles.kpiInfo}>
                                        <p className={styles.kpiTitle}>{kpi.title}</p>
                                        <h3 className={styles.kpiValue}>{loading ? '...' : kpi.value}</h3>
                                        <p className={styles.kpiTrend}>
                                            <i className="fas fa-chart-line" style={{ marginRight: 4 }}></i>
                                            {loading ? 'Đang tải dữ liệu...' : kpi.trend}
                                        </p>
                                    </div>
                                    <div className={styles.kpiIconWrapper}>
                                        <i className={kpi.icon}></i>
                                    </div>
                                </div>
                                <div className={styles.kpiSparkline}>
                                    <ResponsiveContainer width="100%" height={50}>
                                        <LineChart data={kpi.data}>
                                            <Line
                                                type="monotone"
                                                dataKey="v"
                                                stroke={lineColors[kpi.color]}
                                                strokeWidth={3}
                                                dot={false}
                                                isAnimationActive={true}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={styles.chartsGrid}>
                    <div className={styles.mainChartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Lưu Lượng Nhập / Xuất Kho</h3>
                            <select className={styles.chartFilter} value={inventoryFlowRange} onChange={(e) => setInventoryFlowRange(e.target.value)}>
                                <option value="7days">7 ngày qua</option>
                                <option value="thisMonth">Tháng này</option>
                                <option value="lastMonth">Tháng trước</option>
                            </select>
                        </div>
                        <div className={styles.chartBody}>
                            {trafficData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={trafficData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => quantity(value)}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                                        <Bar dataKey="nhap" name="SL Nhap Kho" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="xuat" name="SL Xuat Kho" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.detailEmpty}>Chưa có dữ liệu nhập xuất theo bộ lọc này.</div>
                            )}
                        </div>
                    </div>

                    <div className={styles.pieChartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Cơ Cấu Giá Trị Tồn Kho</h3>
                            <select className={styles.chartFilter} value={categoryScope} onChange={(e) => setCategoryScope(e.target.value)}>
                                <option value="all">Tất cả hàng hóa</option>
                                <option value="finished">Chỉ thành phẩm</option>
                                <option value="nonFinished">Khác thành phẩm</option>
                            </select>
                        </div>
                        <div className={styles.chartBody} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingBottom: '30px' }}>
                            {categoryData.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={(value, _name, context) => {
                                                    const payload = context?.payload;
                                                    return [`${money(value)} (${payload?.percentage || 0}%)`, 'Giá trị tồn'];
                                                }}
                                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className={styles.pieLegend}>
                                        {categoryData.map((item, index) => (
                                            <div key={index} className={styles.legendItem}>
                                                <span className={styles.legendDot} style={{ backgroundColor: item.color }}></span>
                                                <span className={styles.legendText}>{item.name} <strong style={{ color: 'var(--color-text-strong)' }}>{item.percentage}%</strong></span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.detailEmpty}>Chưa có dữ liệu cơ cấu tồn kho theo bộ lọc này.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.fullWidthGrid}>
                    <div className={styles.mainChartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Báo Cáo Thu Chi & Công Nợ</h3>
                            <select className={styles.chartFilter} value={financeRange} onChange={(e) => setFinanceRange(e.target.value)}>
                                <option value={String(currentYear)}>Năm {currentYear}</option>
                                <option value={String(previousYear)}>Năm {previousYear}</option>
                                <option value="quarter">Quý hiện tại</option>
                            </select>
                        </div>
                        <div className={styles.chartBody}>
                            {financeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={320}>
                                    <ComposedChart data={financeData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                        <YAxis yAxisId="left" tickFormatter={(value) => shortMoney(value)} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => shortMoney(value)} axisLine={false} tickLine={false} tick={{ fill: '#ea580c', fontSize: 13 }} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => money(value)}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                                        <Bar yAxisId="left" dataKey="thu" name="Tổng Thu" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar yAxisId="left" dataKey="chi" name="Tổng Chi" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Line yAxisId="right" type="monotone" dataKey="congNo" name="Công nợ phải thu" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: '#ea580c' }} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.detailEmpty}>Chưa có dữ liệu thu chi công nợ theo bộ lọc này.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.bottomGrid}>
                    <div className={styles.transactionsCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Hoạt Động Gần Đây</h3>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={`misa-table ${styles.txTable}`}>
                                <thead>
                                    <tr>
                                        <th>Loại GD</th>
                                        <th>Mã đơn</th>
                                        <th>Đối tác / Khách hàng</th>
                                        <th>Trạng thái</th>
                                        <th>Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.length > 0 ? recentTransactions.map((transaction, index) => (
                                        <tr 
                                            key={`${transaction.entityType}-${transaction.entityId}-${index}`}
                                            onClick={() => handleRowClick(transaction)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <div className={styles.txType}>
                                                    <div
                                                        className={styles.typeIcon}
                                                        style={{
                                                            backgroundColor: getTransactionIconMeta(transaction.entityType).backgroundColor,
                                                            color: getTransactionIconMeta(transaction.entityType).color
                                                        }}
                                                    >
                                                        <i className={getTransactionIconMeta(transaction.entityType).icon}></i>
                                                    </div>
                                                    <span>{transaction.transactionType || 'Hệ thống'}</span>
                                                </div>
                                            </td>
                                            <td className={styles.txId}>{transaction.code || 'Chưa có mã'}</td>
                                            <td><span className={styles.txPartner}>{transaction.partnerName || 'Khách lẻ / nội bộ'}</span></td>
                                            <td>
                                                <span
                                                    className="status-badge"
                                                    style={{
                                                        backgroundColor: getTransactionStatusMeta(transaction.status).backgroundColor,
                                                        color: getTransactionStatusMeta(transaction.status).color,
                                                        border: `1px solid ${getTransactionStatusMeta(transaction.status).borderColor}`
                                                    }}
                                                >
                                                    {getTransactionStatusMeta(transaction.status).label}
                                                </span>
                                            </td>
                                            <td className={styles.txTime}>{formatDateTime(transaction.createdAt)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className={styles.detailEmpty}>Chưa có giao dịch gần đây.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={styles.rightColumnStack}>
                        <div className={styles.topProductsCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Top 5 Thành Phẩm Tồn Nhiều</h3>
                                <button className={styles.viewAllBtn} onClick={() => setActiveDetail('inventory')}>
                                    Xem tất cả <i className="fas fa-arrow-right" style={{ marginLeft: '4px' }}></i>
                                </button>
                            </div>
                            <div className={styles.topProductsList}>
                                {topInventoryItems.length > 0 ? topInventoryItems.map((item, index) => {
                                    const colors = ['primary', 'green', 'orange', 'purple', 'slate'];
                                    const color = colors[index % colors.length];
                                    return (
                                        <div key={item.variantId} className={styles.productItem}>
                                            <div className={styles.productHeader}>
                                                <div className={styles.productInfo}>
                                                    <span className={styles.productName}>{item.variantName || item.productName}</span>
                                                    <span className={styles.productSku}>{item.sku}</span>
                                                </div>
                                                <div className={styles.productSold}>{quantity(item.quantity)}</div>
                                            </div>
                                            <div className={styles.productProgressBg}>
                                                <div
                                                    className={`${styles.productProgressFill} ${styles[`bg${color.charAt(0).toUpperCase()}${color.slice(1)}`]}`}
                                                    style={{ '--target-width': `${(Number(item.quantity || 0) / maxTopQuantity) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className={styles.detailEmpty}>Chưa có dữ liệu tồn kho thành phẩm.</div>
                                )}
                            </div>
                        </div>

                        <div className={styles.pendingTasksCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Việc Cần Xử Lý</h3>
                            </div>
                            <div className={styles.taskList}>
                                {pendingTasks.length > 0 ? pendingTasks.map((task) => (
                                    <div key={task.id} className={styles.taskItem} onClick={task.onClick}>
                                        <div className={`${styles.taskIcon} ${styles[`bg${task.color.charAt(0).toUpperCase()}${task.color.slice(1)}Soft`]}`}>
                                            <i className={task.icon}></i>
                                        </div>
                                        <div className={styles.taskInfo}>
                                            <p className={styles.taskTitle}>{task.title}</p>
                                            <span className={styles.taskTime}>{task.time}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className={styles.detailEmpty}>Hiện chưa có việc nào nổi bật cần xử lý.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={!!activeDetail}
                onClose={() => setActiveDetail(null)}
                ariaLabel={detailTitles[activeDetail] || 'Chi tiết dashboard'}
                dialogStyle={{ maxWidth: '1100px', width: '92vw' }}
            >
                <div className={styles.detailModalHeader}>
                    <div>
                        <h3 className={styles.detailModalTitle}>{detailTitles[activeDetail]}</h3>
                        <p className={styles.detailModalSubtitle}>Danh sách được lấy theo đúng tiêu chí đang hiển thị trên thẻ KPI.</p>
                    </div>
                    <button className={styles.detailModalClose} onClick={() => setActiveDetail(null)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className={styles.detailModalBody}>
                    {renderActiveDetail()}
                </div>
            </Modal>
        </AdminLayout>
    );
}

export default AnalyticsDashboard;
