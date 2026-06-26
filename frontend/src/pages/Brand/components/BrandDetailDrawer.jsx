import { useState } from 'react';
import styles from './BrandDetailDrawer.module.css';

const BrandDetailDrawer = ({ isOpen, onClose, brand, onEdit }) => {
    const [isSkuOpen, setIsSkuOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    if (!isOpen || !brand) return null;

    const mockSkus = [
        { id: 1, code: 'SKU-SAM-01', name: 'Galaxy S23 Ultra', stock: 150, status: 'Sẵn hàng' },
        { id: 2, code: 'SKU-SAM-02', name: 'Galaxy Watch 6', stock: 45, status: 'Sẵn hàng' },
        { id: 3, code: 'SKU-SAM-03', name: 'Neo QLED 8K', stock: 12, status: 'Sắp hết' },
    ];

    const mockHistory = [
        { id: 1, action: 'Cập nhật thông tin hotline', by: 'Admin', time: '12/05/2023 14:30' },
        { id: 2, action: 'Thay đổi mô tả thương hiệu', by: 'Manager', time: '10/05/2023 09:15' },
        { id: 3, action: 'Cập nhật website chính thức', by: 'Admin', time: '01/05/2023 10:00' },
    ];

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2>Chi tiết Thương hiệu</h2>
                        <span className={`${styles.statusBadge} ${brand.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}`}>
                            {brand.status === 'ACTIVE' ? 'HOẠT ĐỘNG' : 'NGỪNG HỢP TÁC'}
                        </span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Brand Info Card */}
                    <div className={styles.brandCard}>
                        <div className={styles.brandHeader}>
                            <div className={styles.brandIcon}>
                                <i className={`fas ${brand.icon || 'fa-building'}`}></i>
                            </div>
                            <div className={styles.brandTitle}>
                                <h3>{brand.name}</h3>
                                <span className={styles.brandCode}>Mã: {brand.code}</span>
                            </div>
                        </div>
                        <p className={styles.brandDescription}>
                            {brand.description || 'Chưa có mô tả chi tiết cho thương hiệu này.'}
                        </p>
                        
                        <div className={styles.contactInfo}>
                            <div className={styles.contactItem}>
                                <span className={styles.contactLabel}>HOTLINE</span>
                                <span className={styles.contactValue}>1800 588889</span>
                            </div>
                            <div className={styles.contactItem}>
                                <span className={styles.contactLabel}>EMAIL</span>
                                <a href={`mailto:support@${brand.name.toLowerCase().replace(/\s/g, '')}.vn`} className={styles.contactLink}>
                                    support@{brand.name.toLowerCase().replace(/\s/g, '')}.vn
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* SKU Accordion */}
                    <div className={styles.accordion}>
                        <div className={styles.accordionHeader} onClick={() => setIsSkuOpen(!isSkuOpen)}>
                            <h4>Danh sách SKUs (24)</h4>
                            <i className={`bi bi-chevron-${isSkuOpen ? 'up' : 'down'}`}></i>
                        </div>
                        {isSkuOpen && (
                            <div className={styles.accordionContent}>
                                <table className={styles.skuTable}>
                                    <thead>
                                        <tr>
                                            <th>MÃ SKU</th>
                                            <th>TÊN SẢN PHẨM</th>
                                            <th>TỒN KHO</th>
                                            <th>TRẠNG THÁI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mockSkus.map(sku => (
                                            <tr key={sku.id}>
                                                <td>{sku.code}</td>
                                                <td>{sku.name}</td>
                                                <td>{sku.stock}</td>
                                                <td className={sku.status === 'Sẵn hàng' ? styles.textSuccess : styles.textDanger}>
                                                    {sku.status}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button className={styles.btnViewAll}>Xem tất cả 24 SKUs</button>
                            </div>
                        )}
                    </div>

                    {/* History Accordion */}
                    <div className={styles.accordion}>
                        <div className={styles.accordionHeader} onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
                            <h4>Lịch sử thay đổi</h4>
                            <i className={`bi bi-chevron-${isHistoryOpen ? 'up' : 'down'}`}></i>
                        </div>
                        {isHistoryOpen && (
                            <div className={styles.accordionContent}>
                                <div className={styles.historyList}>
                                    {mockHistory.map(history => (
                                        <div key={history.id} className={styles.historyItem}>
                                            <div className={styles.historyAction}>{history.action}</div>
                                            <div className={styles.historyMeta}>
                                                bởi {history.by} • {history.time}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.btnDanger}>Vô hiệu hóa</button>
                    <div className={styles.footerRight}>
                        <button className={styles.btnPrimary} onClick={onEdit}>Chỉnh sửa</button>
                        <button className={styles.btnSecondary} onClick={onClose}>Đóng</button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BrandDetailDrawer;
