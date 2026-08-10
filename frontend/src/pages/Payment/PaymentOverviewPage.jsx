import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './PaymentManagementPage.module.css';

function PaymentOverviewPage() {
    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <div className={styles.breadcrumb}>Thu chi</div>
                        <h1 className={styles.pageTitle}>Tổng quan thu chi</h1>
                    </div>
                </div>
                <div className={styles.topGrid} style={{ display: 'block' }}>
                    <section className={styles.card} style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <i className="bi bi-bar-chart-line" style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                        <h3 style={{ color: '#64748b' }}>Tổng quan Thu chi đang được cập nhật</h3>
                        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Vui lòng chọn Phiếu Thu hoặc Phiếu Chi ở menu để thao tác.</p>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}

export default PaymentOverviewPage;
