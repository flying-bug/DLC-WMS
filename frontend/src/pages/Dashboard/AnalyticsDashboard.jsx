import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import styles from './AnalyticsDashboard.module.css';

function AnalyticsDashboard() {
    const navigate = useNavigate();

    // KPI Data with sparkline trend data
    const kpis = [
        { title: 'Tổng Tồn Kho', value: '1.25 Tỷ ₫', icon: 'fas fa-wallet', color: 'primary', trend: '+5.4% so với tuần trước', data: [{ v: 100 }, { v: 120 }, { v: 110 }, { v: 140 }, { v: 130 }, { v: 160 }] },
        { title: 'Đơn Nhập (PO)', value: '12', icon: 'fas fa-box-open', color: 'orange', trend: '2 đơn cần duyệt gấp', data: [{ v: 5 }, { v: 8 }, { v: 12 }, { v: 7 }, { v: 15 }, { v: 12 }] },
        { title: 'Đơn Xuất (SO)', value: '8', icon: 'fas fa-truck-loading', color: 'green', trend: 'Tiến độ giao: 80%', data: [{ v: 4 }, { v: 6 }, { v: 5 }, { v: 8 }, { v: 6 }, { v: 8 }] },
        { title: 'Sắp Hết Hàng', value: '5 SKU', icon: 'fas fa-exclamation-triangle', color: 'red', trend: 'Mức nguy hiểm!', data: [{ v: 2 }, { v: 3 }, { v: 2 }, { v: 4 }, { v: 5 }, { v: 5 }] },
        { title: 'Chờ Bảo Hành', value: '18 Máy', icon: 'fas fa-tools', color: 'purple', trend: '3 ca trễ hẹn (SLA)', data: [{ v: 4 }, { v: 7 }, { v: 12 }, { v: 10 }, { v: 15 }, { v: 18 }] }
    ];

    // Bar Chart Data (Inbound vs Outbound over 7 days)
    const trafficData = [
        { name: 'T2', nhap: 4000, xuat: 2400 },
        { name: 'T3', nhap: 3000, xuat: 1398 },
        { name: 'T4', nhap: 2000, xuat: 3800 },
        { name: 'T5', nhap: 2780, xuat: 3908 },
        { name: 'T6', nhap: 1890, xuat: 4800 },
        { name: 'T7', nhap: 2390, xuat: 3800 },
        { name: 'CN', nhap: 3490, xuat: 4300 },
    ];

    // Pie Chart Data (Inventory by Category)
    const categoryData = [
        { name: 'Thiết bị điện tử', value: 45, color: 'var(--color-primary)' },
        { name: 'Đồ gia dụng', value: 30, color: '#10b981' },
        { name: 'Phụ kiện', value: 15, color: '#f59e0b' },
        { name: 'Khác', value: 10, color: '#64748b' },
    ];

    // Top Selling Products Data
    const topProducts = [
        { name: 'Laptop Dell XPS 15 9500', sku: 'LAP-DELL-01', sold: 125, max: 150, color: 'primary' },
        { name: 'Màn hình máy tính LG 27"', sku: 'MON-LG-27', sold: 98, max: 150, color: 'green' },
        { name: 'Bàn phím cơ không dây Keychron', sku: 'KBD-KC-K8', sold: 76, max: 150, color: 'orange' },
        { name: 'Chuột không dây Logitech MX', sku: 'MOU-LOG-MX', sold: 65, max: 150, color: 'purple' },
        { name: 'Tai nghe chống ồn Sony WH', sku: 'HP-SONY-01', sold: 42, max: 150, color: 'slate' }
    ];

    // Finance Data (Thu Chi & Công Nợ)
    const financeData = [
        { month: 'Tháng 1', thu: 150, chi: 120, congNo: 50 },
        { month: 'Tháng 2', thu: 200, chi: 180, congNo: 70 },
        { month: 'Tháng 3', thu: 180, chi: 150, congNo: 40 },
        { month: 'Tháng 4', thu: 250, chi: 190, congNo: 60 },
        { month: 'Tháng 5', thu: 300, chi: 220, congNo: 30 },
        { month: 'Tháng 6', thu: 280, chi: 200, congNo: 80 },
        { month: 'Tháng 7', thu: 350, chi: 250, congNo: 45 },
    ];

    // Recent Transactions Data
    const recentTransactions = [
        { id: 'PO-20260801', type: 'Nhập kho', partner: 'Công ty TNHH ABC', status: 'Hoàn thành', time: '5 phút trước', icon: 'fas fa-arrow-down', statusClass: 'status-approved' },
        { id: 'SO-20260802', type: 'Xuất kho', partner: 'Đại lý Cấp 1 Nam Sài Gòn', status: 'Đang lấy hàng', time: '1 giờ trước', icon: 'fas fa-arrow-up', statusClass: 'status-draft' },
        { id: 'PO-20260803', type: 'Nhập kho', partner: 'NCC Toàn Cầu', status: 'Chờ thanh toán', time: '2 giờ trước', icon: 'fas fa-arrow-down', statusClass: 'status-warning' },
        { id: 'SO-20260804', type: 'Xuất kho', partner: 'Cửa hàng Tiện lợi Q1', status: 'Hoàn thành', time: 'Hôm qua', icon: 'fas fa-arrow-up', statusClass: 'status-approved' },
        { id: 'SO-20260805', type: 'Xuất kho', partner: 'Chi nhánh Miền Bắc', status: 'Đã Hủy', time: '2 ngày trước', icon: 'fas fa-arrow-up', statusClass: 'status-inactive' },
        { id: 'SO-20260806', type: 'Xuất kho', partner: 'Đại lý Cấp 2 Tân Bình', status: 'Đang giao', time: '2 ngày trước', icon: 'fas fa-arrow-up', statusClass: 'status-draft' },
        { id: 'PO-20260807', type: 'Nhập kho', partner: 'NPP Samsung VN', status: 'Hoàn thành', time: '3 ngày trước', icon: 'fas fa-arrow-down', statusClass: 'status-approved' },
        { id: 'SO-20260808', type: 'Xuất kho', partner: 'CH Phụ kiện Đống Đa', status: 'Hoàn thành', time: '3 ngày trước', icon: 'fas fa-arrow-up', statusClass: 'status-approved' }
    ];

    // Pending Tasks (Warranty & Alerts)
    const pendingTasks = [
        { id: 1, title: 'Đơn sửa chữa màn hình LG quá hạn', type: 'repair', time: 'Quá hạn 1 ngày', icon: 'fas fa-wrench', color: 'red' },
        { id: 2, title: 'Nhập kho lô hàng Apple (Chờ duyệt)', type: 'import', time: '2 giờ trước', icon: 'fas fa-box-open', color: 'orange' },
        { id: 3, title: 'Yêu cầu bảo hành từ ĐL Nam Sài Gòn', type: 'warranty', time: 'Vừa xong', icon: 'fas fa-shield-alt', color: 'blue' }
    ];

    return (
        <AdminLayout activeTab="main-dashboard">
            <div className={styles.dashboardWrapper}>

                {/* Header Section */}
                <div className={styles.pageHeader}>
                    <div>
                        <h2 className={styles.pageTitle}>Tổng Quan Hoạt Động</h2>
                        <p className={styles.pageSubtitle}>Phân tích hoạt động kho và các giao dịch đang diễn ra</p>
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

                {/* KPI Cards Row with Sparklines */}
                <div className={styles.kpiGrid}>
                    {kpis.map((kpi, idx) => {
                        const lineColors = { primary: 'var(--color-primary)', blue: '#3b82f6', orange: '#f59e0b', green: '#10b981', red: '#ef4444', purple: '#9333ea' };
                        return (
                            <div key={idx} className={`${styles.kpiCard} ${styles[kpi.color]}`}>
                                <div className={styles.kpiTop}>
                                    <div className={styles.kpiInfo}>
                                        <p className={styles.kpiTitle}>{kpi.title}</p>
                                        <h3 className={styles.kpiValue}>{kpi.value}</h3>
                                        <p className={styles.kpiTrend}>
                                            <i className="fas fa-chart-line" style={{ marginRight: 4 }}></i> {kpi.trend}
                                        </p>
                                    </div>
                                    <div className={styles.kpiIconWrapper}>
                                        <i className={kpi.icon}></i>
                                    </div>
                                </div>
                                <div className={styles.kpiSparkline}>
                                    <ResponsiveContainer width="100%" height={50}>
                                        <LineChart data={kpi.data}>
                                            <Line type="monotone" dataKey="v" stroke={lineColors[kpi.color]} strokeWidth={3} dot={false} isAnimationActive={true} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Middle Charts Row */}
                <div className={styles.chartsGrid}>
                    {/* Bar Chart - Inbound vs Outbound */}
                    <div className={styles.mainChartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Lưu Lượng Nhập / Xuất Kho</h3>
                            <select className={styles.chartFilter}>
                                <option value="7days">7 Ngày Qua</option>
                                <option value="thisMonth">Tháng Này</option>
                                <option value="lastMonth">Tháng Trước</option>
                            </select>
                        </div>
                        <div className={styles.chartBody}>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={trafficData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                                    <Bar dataKey="nhap" name="SL Nhập Kho" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                    <Bar dataKey="xuat" name="SL Xuất Kho" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart - Categories */}
                    <div className={styles.pieChartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Cơ Cấu Giá Trị Tồn Kho</h3>
                            <select className={styles.chartFilter}>
                                <option value="all">Tất Cả Kho</option>
                                <option value="kho1">Kho Linh Kiện</option>
                                <option value="kho2">Kho Thành Phẩm</option>
                            </select>
                        </div>
                        <div className={styles.chartBody} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingBottom: '30px' }}>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => `${value}%`} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className={styles.pieLegend}>
                                {categoryData.map((item, idx) => (
                                    <div key={idx} className={styles.legendItem}>
                                        <span className={styles.legendDot} style={{ backgroundColor: item.color }}></span>
                                        <span className={styles.legendText}>{item.name} <strong style={{ color: 'var(--color-text-strong)' }}>{item.value}%</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Charts Row */}
                <div className={styles.fullWidthGrid}>
                    <div className={styles.mainChartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Báo Cáo Thu Chi & Công Nợ</h3>
                            <select className={styles.chartFilter}>
                                <option value="2026">Năm 2026</option>
                                <option value="2025">Năm 2025</option>
                                <option value="quarter">Theo Quý (2026)</option>
                            </select>
                        </div>
                        <div className={styles.chartBody}>
                            <ResponsiveContainer width="100%" height={320}>
                                <ComposedChart data={financeData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                    <YAxis yAxisId="left" tickFormatter={(value) => `${value}M`} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}M`} axisLine={false} tickLine={false} tick={{ fill: '#ea580c', fontSize: 13 }} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#f3f4f6' }}
                                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => `${value} Triệu VNĐ`}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                                    <Bar yAxisId="left" dataKey="thu" name="Tổng Thu" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar yAxisId="left" dataKey="chi" name="Tổng Chi" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Line yAxisId="right" type="monotone" dataKey="congNo" name="Dư Nợ (Phải Thu)" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: '#ea580c' }} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className={styles.bottomGrid}>

                    {/* Left Column - Recent Transactions */}
                    <div className={styles.transactionsCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Giao Dịch Gần Đây</h3>
                            <button className={styles.viewAllBtn}>Tất cả <i className="fas fa-arrow-right" style={{ marginLeft: '4px' }}></i></button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={`misa-table ${styles.txTable}`}>
                                <thead>
                                    <tr>
                                        <th>Loại GD</th>
                                        <th>Mã Đơn</th>
                                        <th>Đối tác / Khách hàng</th>
                                        <th>Trạng thái</th>
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
                                            <td><span className={styles.txPartner}>{tx.partner}</span></td>
                                            <td>
                                                <span className={`status-badge ${tx.statusClass === 'status-warning' ? styles.statusWarning : tx.statusClass}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className={styles.txTime}>{tx.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column Stack */}
                    <div className={styles.rightColumnStack}>
                        {/* Top Products */}
                        <div className={styles.topProductsCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Top 5 Hàng Xuất Kho Nhiều</h3>
                                <select className={styles.chartFilter}>
                                    <option value="thisMonth">Tháng này</option>
                                    <option value="thisWeek">Tuần này</option>
                                    <option value="thisYear">Năm nay</option>
                                </select>
                            </div>
                            <div className={styles.topProductsList}>
                                {topProducts.map((prod, idx) => (
                                    <div key={idx} className={styles.productItem}>
                                        <div className={styles.productHeader}>
                                            <div className={styles.productInfo}>
                                                <span className={styles.productName}>{prod.name}</span>
                                                <span className={styles.productSku}>{prod.sku}</span>
                                            </div>
                                            <div className={styles.productSold}>{prod.sold} / {prod.max}</div>
                                        </div>
                                        <div className={styles.productProgressBg}>
                                            <div className={`${styles.productProgressFill} ${styles['bg' + prod.color.charAt(0).toUpperCase() + prod.color.slice(1)]}`} style={{ '--target-width': `${(prod.sold / prod.max) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pending Tasks (Warranty/Repairs) */}
                        <div className={styles.pendingTasksCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Việc Cần Xử Lý (Bảo Hành/Sửa Chữa)</h3>
                            </div>
                            <div className={styles.taskList}>
                                {pendingTasks.map((task) => (
                                    <div key={task.id} className={styles.taskItem}>
                                        <div className={`${styles.taskIcon} ${styles['bg' + task.color.charAt(0).toUpperCase() + task.color.slice(1) + 'Soft']}`}>
                                            <i className={task.icon} style={{ color: task.color === 'blue' ? 'var(--color-primary)' : '' }}></i>
                                        </div>
                                        <div className={styles.taskInfo}>
                                            <p className={styles.taskTitle}>{task.title}</p>
                                            <span className={styles.taskTime}>{task.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </AdminLayout>
    );
}

export default AnalyticsDashboard;
