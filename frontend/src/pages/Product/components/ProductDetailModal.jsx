import { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { canViewPricing } from '../../../auth/session';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './ProductDetailModal.module.css';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
}).format(Number(value || 0));

const formatQuantity = (value) => new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 4
}).format(Number(value || 0));

const yesNo = (value) => value ? 'Có' : 'Không';

const ProductDetailModal = ({ product, onClose, onEdit }) => {
    const [variants, setVariants] = useState([]);
    const [loadingVariants, setLoadingVariants] = useState(false);
    const showPricing = canViewPricing();

    useEffect(() => {
        let active = true;

        const loadVariants = async () => {
            if (!product?.id) return;
            setLoadingVariants(true);
            try {
                const response = await axiosClient.get(`/products/${product.id}/variants`);
                if (active) setVariants(response.data || []);
            } catch (error) {
                if (active) setVariants([]);
                console.error('Không thể tải danh sách SKU:', error);
            } finally {
                if (active) setLoadingVariants(false);
            }
        };

        loadVariants();
        return () => {
            active = false;
        };
    }, [product?.id]);

    if (!product) return null;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            dialogStyle={{ maxWidth: '920px', padding: 0, borderRadius: '10px' }}
            ariaLabel={`Chi tiết sản phẩm ${product.productName}`}
        >
            <div className={styles.modal}>
                <header className={styles.header}>
                    <div className={styles.titleGroup}>
                        <div className={styles.titleIcon}><i className="bi bi-box-seam"></i></div>
                        <div>
                            <h2>{product.productName}</h2>
                            <span>{product.productCode || '-'}</span>
                        </div>
                    </div>
                    <button type="button" className={styles.closeButton} onClick={onClose} title="Đóng">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </header>

                <div className={styles.body}>
                    <section className={styles.heroSection}>
                        <div className={styles.imageBox}>
                            {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.productName} />
                            ) : (
                                <i className="bi bi-image"></i>
                            )}
                        </div>
                        <div className={styles.heroInfo}>
                            <div className={styles.statusRow}>
                                <span className={`${styles.status} ${product.active ? styles.statusActive : styles.statusInactive}`}>
                                    {product.active ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                                </span>
                                <span className={styles.type}>{product.productType || '-'}</span>
                            </div>
                            <div className={styles.metrics}>
                                <div>
                                    <span>Tồn kho</span>
                                    <strong>{formatQuantity(product.stockQty)} {product.unitName || ''}</strong>
                                </div>
                                {showPricing && (
                                    <div>
                                        <span>Giá bán</span>
                                        <strong>{formatCurrency(product.salePrice)}</strong>
                                    </div>
                                )}
                                <div>
                                    <span>Bảo hành</span>
                                    <strong>{product.warrantyPeriod || (product.warrantyPeriodMonths ? `${product.warrantyPeriodMonths} tháng` : 'Không')}</strong>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h3>Thông tin sản phẩm</h3>
                        <div className={styles.infoGrid}>
                            <div><span>Mã sản phẩm</span><strong>{product.productCode || '-'}</strong></div>
                            <div><span>Danh mục</span><strong>{product.categoryName || '-'}</strong></div>
                            <div><span>Thương hiệu</span><strong>{product.brandName || '-'}</strong></div>
                            <div><span>Đơn vị tính chính</span><strong>{product.unitName || '-'}</strong></div>
                            <div><span>Theo dõi serial</span><strong>{yesNo(product.trackSerial)}</strong></div>
                            <div><span>Theo dõi lô</span><strong>{yesNo(product.trackLot)}</strong></div>
                            <div><span>Tồn tối thiểu</span><strong>{formatQuantity(product.minStockQty)}</strong></div>
                            <div><span>Trạng thái giảm thuế</span><strong>{product.taxReductionStatus || '-'}</strong></div>
                        </div>
                    </section>

                    {product.unitConversions && product.unitConversions.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeading}>
                                <h3>Đơn vị tính chuyển đổi</h3>
                                <span>{product.unitConversions.length} ĐVT phụ</span>
                            </div>
                            <div className={styles.variantTableWrap}>
                                <table className={styles.variantTable}>
                                    <thead>
                                        <tr>
                                            <th>Đơn vị chuyển đổi</th>
                                            <th>Phép tính</th>
                                            <th>Tỷ lệ chuyển đổi</th>
                                            <th>Quy đổi tương đương</th>
                                            <th>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {product.unitConversions.map((conv, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 600 }}>{conv.unitName || '-'}</td>
                                                <td>{conv.operator === 'DIVIDE' || conv.operator === '/' ? 'Chia (/)' : 'Nhân (*)'}</td>
                                                <td>{conv.ratio}</td>
                                                <td style={{ color: 'var(--color-primary)' }}>
                                                    {conv.operator === 'DIVIDE' || conv.operator === '/'
                                                        ? `1 ${conv.unitName} = 1/${conv.ratio} ${product.unitName}`
                                                        : `1 ${conv.unitName} = ${conv.ratio} ${product.unitName}`}
                                                </td>
                                                <td>{conv.note || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {product.description && (
                        <section className={styles.section}>
                            <h3>Mô tả</h3>
                            <p className={styles.description}>{product.description}</p>
                        </section>
                    )}

                    <section className={styles.section}>
                        <div className={styles.sectionHeading}>
                            <h3>Danh sách SKU</h3>
                            <span>{variants.length} SKU</span>
                        </div>
                        {loadingVariants ? (
                            <div className={styles.loading}>Đang tải SKU...</div>
                        ) : variants.length === 0 ? (
                            <div className={styles.empty}>Chưa có SKU</div>
                        ) : (
                            <div className={styles.variantTableWrap}>
                                <table className={styles.variantTable}>
                                    <thead>
                                        <tr>
                                            <th>SKU</th>
                                            <th>Tên biến thể</th>
                                            {showPricing && <th>Giá bán</th>}
                                            <th>Bảo hành</th>
                                            <th>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((variant) => (
                                            <tr key={variant.id}>
                                                <td className={styles.code}>{variant.sku || '-'}</td>
                                                <td>{variant.variantName || '-'}</td>
                                                {showPricing && <td>{formatCurrency(variant.salePrice)}</td>}
                                                <td>{variant.warrantyMonths ? `${variant.warrantyMonths} tháng` : 'Không'}</td>
                                                <td>{variant.active === false ? 'Ngừng sử dụng' : 'Đang sử dụng'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                <footer className={styles.footer}>
                    <button type="button" className={styles.secondaryButton} onClick={onClose}>Đóng</button>
                    <button type="button" className={styles.primaryButton} onClick={() => { onClose(); onEdit(product); }}>
                        <i className="bi bi-pencil"></i> Chỉnh sửa
                    </button>
                </footer>
            </div>
        </Modal>
    );
};

export default ProductDetailModal;
