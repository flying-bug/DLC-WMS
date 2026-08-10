import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './PaymentOverviewPage.module.css';

function PaymentOverviewPage() {
    const navigate = useNavigate();

    const processItems = [
        { label: 'Khách hàng', icon: 'fas fa-user-friends', action: () => navigate('/customers') },
        { label: 'Phiếu Thu', icon: 'fas fa-arrow-down', action: () => navigate('/payments/receipt') },
        { label: 'Phải thu KH', icon: 'fas fa-file-invoice', action: () => navigate('/reports') },
        { label: 'Sổ quỹ', icon: 'fas fa-wallet', action: () => navigate('/payments') },
        { label: 'Phải trả NCC', icon: 'fas fa-file-invoice-dollar', action: () => navigate('/reports') },
        { label: 'Phiếu Chi', icon: 'fas fa-arrow-up', action: () => navigate('/payments/expense') },
    ];

    const toolbarItems = [
        { label: 'Đối tác', icon: 'fas fa-handshake', action: () => navigate('/customers') },
        { label: 'Đơn mua hàng', icon: 'fas fa-shopping-cart', action: () => navigate('/purchase-orders') },
        { label: 'Đơn bán hàng', icon: 'fas fa-store', action: () => navigate('/sales-orders') },
        { label: 'Kiểm kê', icon: 'fas fa-clipboard-check', action: () => navigate('/stocktakes') }
    ];

    const reportItems = [
        { id: 'cash-ledger', name: 'Sổ chi tiết quỹ tiền mặt' },
        { id: 'debt-customer', name: 'Tổng hợp công nợ phải thu' },
        { id: 'debt-supplier', name: 'Tổng hợp công nợ phải trả' },
        { id: 'cash-flow', name: 'Báo cáo lưu chuyển tiền tệ' },
        { id: 'payment-history', name: 'Lịch sử thanh toán' }
    ];

    return (
        <AdminLayout activeTab="finance">
            <div className={styles.dashboardContainer}>
                <section className={styles.mainProcess}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.eyebrow}>Quy trình vận hành</p>
                            <h3 className={styles.sectionTitle}>Nghiệp vụ Thu Chi</h3>
                        </div>
                    </div>

                    <div className={styles.processDiagram}>
                        <div className={styles.flowLine}></div>
                        {processItems.map((item, index) => (
                            <button
                                className={styles.node}
                                key={item.label}
                                onClick={item.action}
                                type="button"
                                style={{ '--delay': `${index * 40}ms` }}
                            >
                                <span className={styles.iconWrapper}>
                                    <i className={item.icon}></i>
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.bottomToolbar}>
                        {toolbarItems.map((item) => (
                            <button className={styles.toolbarItem} key={item.label} onClick={item.action} type="button">
                                <i className={item.icon}></i>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <aside className={styles.reportsArea}>
                    <div className={styles.reportHeader}>
                        <p className={styles.eyebrow}>Theo dõi nhanh</p>
                        <h3 className={styles.sectionTitle}>Báo cáo Thu Chi</h3>
                    </div>
                    <ul className={styles.reportList}>
                        {reportItems.map((report) => (
                            <li key={report.id} onClick={() => navigate('/reports', { state: { reportId: report.id, fromDashboard: true } })} style={{ cursor: 'pointer' }}>
                                <i className="fas fa-chart-bar"></i>
                                <span>{report.name}</span>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.allReports}>
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/reports'); }}>
                            Tất cả báo cáo
                            <i className="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </aside>
            </div>
        </AdminLayout>
    );
}

export default PaymentOverviewPage;
