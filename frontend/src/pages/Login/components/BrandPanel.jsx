import styles from './BrandPanel.module.css';
import { APP_NAME, COMPANY_NAME } from '../../../constants';

// Ảnh kho hàng — thay bằng import local khi có file ảnh thực
const WAREHOUSE_IMG_URL =
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80';

function BrandPanel() {
    return (
        <div className={styles.brandPanel}>
            <div className={styles.content}>
                {/* Logo */}
                <div className={styles.logoWrapper}>
                    <div className={styles.logoBox}>
                        {/* Icon kho / bánh răng */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            fill="white"
                            viewBox="0 0 24 24"
                            aria-label={`${APP_NAME} logo`}
                        >
                            <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-7 16v-1a7 7 0 0 1 14 0v1h-2v-1a5 5 0 0 0-10 0v1H5z" />
                        </svg>
                    </div>
                </div>

                {/* Tagline */}
                <h1 className={styles.title}>Quản lý kho hàng thông minh</h1>
                <p className={styles.subtitle}>
                    Hệ thống quản trị tài nguyên và điều phối vận hành {COMPANY_NAME}.
                    Giải pháp tối ưu hóa hiệu suất cho doanh nghiệp công nghệ hiện đại.
                </p>

                {/* Ảnh kho */}
                <div className={styles.imageWrapper}>
                    <img
                        src={WAREHOUSE_IMG_URL}
                        alt="Kho hàng Duy Long Computer"
                        className={styles.warehouseImage}
                        loading="lazy"
                    />
                </div>
            </div>
        </div>
    );
}

export default BrandPanel;
