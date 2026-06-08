import styles from './ForgotBrandPanel.module.css';
import { APP_NAME, COMPANY_NAME } from '../../../constants';

// Warehouse icon SVG inline
function WarehouseIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="white"
            viewBox="0 0 24 24" aria-hidden="true">
            <path d="M1 11l11-9 11 9v11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11z" stroke="white"
                strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            <path d="M9 22V12h6v10" stroke="white" strokeWidth="1.5"
                fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ForgotBrandPanel() {
    return (
        <div className={styles.panel}>
            {/* Decorative background blobs */}
            <div className={styles.blob1} aria-hidden="true" />
            <div className={styles.blob2} aria-hidden="true" />

            <div className={styles.content}>
                {/* Badge */}
                <div className={styles.badge}>SMART LOGISTICS SOLUTION</div>

                {/* Headline */}
                <h1 className={styles.headline}>
                    Quản lý kho hàng{' '}
                    <span className={styles.accent}>thông minh &amp; hiệu quả</span>
                </h1>

                <p className={styles.description}>
                    Tự động hóa quy trình, tối ưu không gian và gia tăng tốc độ xử lý
                    đơn hàng với hệ thống quản trị {COMPANY_NAME} thế hệ mới.
                </p>

                {/* Stats cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>99.9%</span>
                        <span className={styles.statLabel}>ĐỘ CHÍNH XÁC TỒN KHO</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>24/7</span>
                        <span className={styles.statLabel}>HỖ TRỢ KỸ THUẬT TRỰC TIẾP</span>
                    </div>
                </div>
            </div>

            {/* Logo bottom-left */}
            <div className={styles.logoMark} aria-label={APP_NAME}>
                <div className={styles.logoBox}>
                    <WarehouseIcon />
                </div>
                <div className={styles.logoText}>
                    <span className={styles.logoName}>DUY LONG</span>
                    <span className={styles.logoSub}>WAREHOUSE MANAGEMENT</span>
                </div>
            </div>
        </div>
    );
}

export default ForgotBrandPanel;
