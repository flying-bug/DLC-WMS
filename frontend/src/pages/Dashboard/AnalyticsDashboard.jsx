import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line 
} from 'recharts';
import styles from './AnalyticsDashboard.module.css';
import { getDashboardMetrics } from '../../api/reportApi';

function AnalyticsDashboard() {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                const res = await getDashboardMetrics();
                if (res.data?.success) {
                    setDashboardData(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard metrics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const formatVND = (value) => {
        if (value == null) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatNumber = (value) => {
        if (value == null) return '0';
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    // Extract Data
    const totalInventoryValue = dashboardData?.totalInventoryValue || 0;
    const totalImportThisMonth = dashboardData?.totalImportThisMonth || 0;
    const totalExportThisMonth = dashboardData?.totalExportThisMonth || 0;
    const lowStockItemsCount = dashboardData?.lowStockItemsCount || 0;
    const newWarrantyTickets = dashboardData?.newWarrantyTickets || 0;

    // KPI Data
    const kpis = [
        { title: 'Tổng Giá Trị Tồn Kho', value: formatVND(totalInventoryValue), icon: 'fas fa-wallet', color: 'primary', trend: 'Giá trị thực tế' },
        { title: 'Giá Trị Nhập Trong Tháng', value: formatVND(totalImportThisMonth), icon: 'fas fa-box-open', color: 'orange', trend: 'Tháng hiện tại' },
        { title: 'Giá Trị Xuất Trong Tháng', value: formatVND(totalExportThisMonth), icon: 'fas fa-truck-loading', color: 'green', trend: 'Tháng hiện tại' },
        { title: 'Mặt Hàng Sắp Hết', value: formatNumber(lowStockItemsCount) + ' SKU', icon: 'fas fa-exclamation-triangle', color: 'red', trend: 'Cần nhập hàng' },
        { title: 'Chờ Bảo Hành', value: formatNumber(newWarrantyTickets) + ' Máy', icon: 'fas fa-tools', color: 'purple', trend: 'Cần xử lý' }
    ];

    // Pie Chart Data -> Map from inventoryValues
    const COLORS = ['var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', '#9333ea', '#64748b'];
    let categoryData;
    if (dashboardData?.inventoryValues && dashboardData.inventoryValues.length > 0) {
        // Sort descending by value and take top 5
        const sorted = [...dashboardData.inventoryValues].sort((a, b) => b.inventoryValue - a.inventoryValue);
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5).reduce((sum, item) => sum + item.inventoryValue, 0);
        
        categoryData = top5.map((item, index) => ({
            name: item.productName || 'Sản phẩm',
            value: item.inventoryValue,
            color: COLORS[index % COLORS.length]
        }));
        
        if (others > 0) {
            categoryData.push({
                name: 'Khác',
                value: others,
                color: '#64748b'
            });
        }
    } else {
        categoryData = [
            { name: 'Chưa có dữ liệu', value: 100, color: '#e5e7eb' }
        ];
    }


    // Low Stock Products
    const lowStockProducts = dashboardData?.lowStockItems?.slice(0, 5).map((item, idx) => ({
        name: item.productName,
        warehouse: item.warehouseName,
        current: item.currentStockQuantity,
        min: item.minimumStockLevel,
        color: ['primary', 'green', 'orange', 'purple', 'slate'][idx % 5]
    })) || [];

    // Recent Transactions Data
    const recentTransactions = dashboardData?.recentActivities?.map(act => ({
        id: act.description || 'Hoạt động',
        type: act.action,
        user: act.user,
        time: act.timestamp ? new Date(act.timestamp).toLocaleString('vi-VN') : '',
        icon: act.action?.toLowerCase().includes('xuất') ? 'fas fa-arrow-up' : 'fas fa-arrow-down',
    })) || [];

    return (
        <AdminLayout activeTab="main-dashboard">
            <div className={styles.dashboardWrapper}>
                
                {/* Header Section */}
                <div className={styles.pageHeader}>
                    <div>
                        <h2 className={styles.pageTitle}>Tổng Quan Hoạt Động</h2>
                        <p className={styles.pageSubtitle}>Phân tích hoạt động kho và các giao dịch đang diễn ra</p>
                    </div>
                    {/* Bỏ buttons phiếu nhập, phiếu xuất theo yêu cầu */}
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        <i className="fas fa-spinner fa-spin fa-2x"></i>
                        <p style={{ marginTop: '10px' }}>Đang tải dữ liệu tổng quan...</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards Row */}
                        <div className={styles.kpiGrid}>
                            {kpis.map((kpi, idx) => {
                                return (
                                    <div key={idx} className={`${styles.kpiCard} ${styles[kpi.color]}`} style={{ minHeight: '120px' }}>
                                        <div className={styles.kpiTop}>
                                            <div className={styles.kpiInfo}>
                                                <p className={styles.kpiTitle}>{kpi.title}</p>
                                                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>{kpi.value}</h3>
                                                <p className={styles.kpiTrend}>
                                                    <i className="fas fa-info-circle" style={{marginRight: 4}}></i> {kpi.trend}
                                                </p>
                                            </div>
                                            <div className={styles.kpiIconWrapper}>
                                                <i className={kpi.icon}></i>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Middle Charts Row */}
                        <div className={styles.chartsGrid}>
                            
                            {/* Pie Chart - Categories */}
                            <div className={styles.pieChartCard} style={{ gridColumn: 'span 12' }}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.cardTitle}>Top Sản Phẩm Giá Trị Tồn Kho Cao Nhất</h3>
                                </div>
                                <div className={styles.chartBody} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingBottom: '30px', minHeight: '300px'}}>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(value) => formatVND(value)} contentStyle={{borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className={styles.pieLegend}>
                                        {categoryData.map((item, idx) => (
                                            <div key={idx} className={styles.legendItem}>
                                                <span className={styles.legendDot} style={{backgroundColor: item.color}}></span>
                                                <span className={styles.legendText}>{item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row */}
                        <div className={styles.bottomGrid}>
                            
                            {/* Left Column - Recent Transactions */}
                            <div className={styles.transactionsCard}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.cardTitle}>Hoạt Động Gần Đây</h3>
                                </div>
                                <div className={styles.tableWrapper}>
                                    <table className={`misa-table ${styles.txTable}`}>
                                        <thead>
                                            <tr>
                                                <th>Thao tác</th>
                                                <th>Mô tả</th>
                                                <th>Người dùng</th>
                                                <th>Thời gian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTransactions.map((tx, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className={styles.txType}>
                                                            <div className={`${styles.typeIcon} ${tx.icon.includes('down') ? styles.typeIn : styles.typeOut}`}>
                                                                <i className={tx.icon}></i>
                                                            </div>
                                                            <span>{tx.type}</span>
                                                        </div>
                                                    </td>
                                                    <td className={styles.txId}>{tx.id}</td>
                                                    <td><span className={styles.txPartner}>{tx.user}</span></td>
                                                    <td className={styles.txTime}>{tx.time}</td>
                                                </tr>
                                            ))}
                                            {recentTransactions.length === 0 && (
                                                <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Chưa có hoạt động nào</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right Column Stack */}
                            <div className={styles.rightColumnStack}>
                                {/* Low Stock */}
                                <div className={styles.topProductsCard}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>Cảnh Báo Tồn Kho Thấp</h3>
                                    </div>
                                    <div className={styles.topProductsList}>
                                        {lowStockProducts.map((prod, idx) => (
                                            <div key={idx} className={styles.productItem}>
                                                <div className={styles.productHeader}>
                                                    <div className={styles.productInfo}>
                                                        <span className={styles.productName}>{prod.name}</span>
                                                        <span className={styles.productSku}>{prod.warehouse}</span>
                                                    </div>
                                                    <div className={styles.productSold} style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                                        {formatNumber(prod.current)} / {formatNumber(prod.min)} (Min)
                                                    </div>
                                                </div>
                                                <div className={styles.productProgressBg}>
                                                    <div className={`${styles.productProgressFill} ${styles['bgRed']}`} style={{'--target-width': `${Math.min((prod.current / (prod.min || 1)) * 100, 100)}%`}}></div>
                                                </div>
                                            </div>
                                        ))}
                                        {lowStockProducts.length === 0 && (
                                            <div style={{textAlign: 'center', padding: '20px', color: '#6b7280'}}>Kho hiện đang an toàn</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </>
                )}
            </div>
        </AdminLayout>
    );
}

export default AnalyticsDashboard;
