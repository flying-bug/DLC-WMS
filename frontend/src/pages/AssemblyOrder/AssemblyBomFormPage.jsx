import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as assemblyApi from '../../api/assemblyOrderApi';
import axiosClient from '../../api/axiosClient';
import styles from './AssemblyOrderPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];

const defaultBomLine = { componentVariantId: '', quantity: '1', note: '' };

const createDefaultForm = () => ({
    id: null,
    productId: '',
    bomCode: '',
    bomName: '',
    versionNo: '1',
    status: 'APPROVED',
    lines: [{ ...defaultBomLine }]
});

function AssemblyBomFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const editing = Boolean(id);

    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(createDefaultForm());
    
    // Variant Picker state
    const [pickingLineIndex, setPickingLineIndex] = useState(null);
    const [searchVariantQuery, setSearchVariantQuery] = useState('');
    const [error, setError] = useState('');

    const loadLookups = useCallback(async () => {
        try {
            const [productResponse, variantResponse] = await Promise.all([
                axiosClient.get('/products', { params: { page: 0, size: 500 } }),
                axiosClient.get('/products/variants', { params: { page: 0, size: 1000 } })
            ]);
            setProducts(listFrom(unwrap(productResponse)).filter((item) => item.active !== false));
            setVariants(listFrom(unwrap(variantResponse)).filter((item) => item.active !== false));
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách thành phẩm/SKU.');
        }
    }, []);

    const loadBom = useCallback(async () => {
        if (!editing) return;
        setLoading(true);
        try {
            const bom = unwrap(await assemblyApi.getAssemblyBomById(id));
            setForm({
                id: bom.id,
                productId: bom.productId || '',
                bomCode: bom.bomCode || '',
                bomName: bom.bomName || '',
                versionNo: bom.versionNo || '1',
                status: bom.status || 'APPROVED',
                lines: bom.lines?.length ? bom.lines.map((line) => ({
                    componentVariantId: line.componentVariantId || '',
                    quantity: String(Number(line.quantity || 1)),
                    note: line.note || ''
                })) : [{ ...defaultBomLine }]
            });
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được chi tiết BOM.');
        } finally {
            setLoading(false);
        }
    }, [editing, id]);

    useEffect(() => {
        loadLookups();
        loadBom();
    }, [loadLookups, loadBom]);

    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleProductChange = async (productId) => {
        setField('productId', productId);
        if (!productId) {
            setForm((current) => ({ ...current, lines: [{ ...defaultBomLine }] }));
            return;
        }

        const selectedProduct = products.find(p => String(p.id) === String(productId));
        if (selectedProduct && selectedProduct.bomTemplate) {
            try {
                const templateLines = JSON.parse(selectedProduct.bomTemplate);
                if (templateLines && templateLines.length > 0) {
                    const newLines = templateLines.map(line => ({
                        componentVariantId: line.componentVariantId ? String(line.componentVariantId) : '',
                        quantity: String(Number(line.quantity || 1)),
                        note: line.note || ''
                    }));
                    
                    setForm((current) => ({ ...current, lines: newLines }));
                    return;
                }
            } catch (err) {
                console.error("Lỗi parse khung cấu hình", err);
            }
        }
        
        setForm((current) => ({ ...current, lines: [{ ...defaultBomLine }] }));
    };

    const setLineField = (index, field, value) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line)
        }));
    };

    const addLine = () => {
        setForm((current) => ({
            ...current,
            lines: [...current.lines, { ...defaultBomLine }]
        }));
    };

    const removeLine = (index) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.length === 1 ? current.lines : current.lines.filter((_, lineIndex) => lineIndex !== index)
        }));
    };

    const validateForm = () => {
        if (!form.productId) return 'Vui lòng chọn thành phẩm.';
        if (!form.bomName.trim()) return 'Vui lòng nhập tên BOM.';
        if (!form.versionNo || Number(form.versionNo) <= 0) return 'Phiên bản BOM phải lớn hơn 0.';
        if (!form.lines.length) return 'BOM phải có ít nhất một linh kiện.';
        for (let index = 0; index < form.lines.length; index += 1) {
            const line = form.lines[index];
            if (!line.componentVariantId) return `Vui lòng chọn SKU linh kiện dòng ${index + 1}.`;
            if (!line.quantity || Number(line.quantity) <= 0) return `Định mức dòng ${index + 1} phải lớn hơn 0.`;
            if (!Number.isInteger(Number(line.quantity))) return `Định mức dòng ${index + 1} phải là số nguyên.`;
        }
        return '';
    };

    const buildPayload = () => ({
        productId: Number(form.productId),
        bomCode: form.bomCode?.trim() || null,
        bomName: form.bomName?.trim(),
        versionNo: Number(form.versionNo),
        status: form.status,
        lines: form.lines.map((line) => ({
            componentVariantId: Number(line.componentVariantId),
            quantity: Number.parseInt(line.quantity, 10),
            note: line.note?.trim() || null
        }))
    });

    const saveBom = async () => {
        const validationMessage = validateForm();
        if (validationMessage) {
            setError(validationMessage);
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (form.id) {
                await assemblyApi.updateAssemblyBom(form.id, buildPayload());
            } else {
                await assemblyApi.createAssemblyBom(buildPayload());
            }
            navigate('/assembly-boms');
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không lưu được BOM.');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className={styles.page}>
                    <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu BOM...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <button className="btn-back" type="button" onClick={() => navigate('/assembly-boms')} style={{ marginBottom: 12, background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                            <i className="bi bi-arrow-left"></i> Quay lại
                        </button>
                        <h1 className={styles.pageTitle}>{form.id ? 'Cập nhật BOM' : 'Tạo BOM'}</h1>
                        <p className={styles.pageSubtitle}>Thiết lập cấu hình BOM định mức linh kiện cho thành phẩm.</p>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '24px' }}>
                    {error && <div className={styles.errorBox} style={{ marginBottom: '20px' }}>{error}</div>}
                    <div className={styles.formGrid}>
                        <label className={styles.field}>
                            <span>Thành phẩm</span>
                            <select value={form.productId} onChange={(event) => handleProductChange(event.target.value)}>
                                <option value="">Chọn thành phẩm</option>
                                {products.filter(p => p.productType === 'Thành phẩm').map((product) => (
                                    <option key={product.id} value={product.id}>{product.productCode} - {product.productName}</option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Mã BOM</span>
                            <input value={form.bomCode} onChange={(event) => setField('bomCode', event.target.value)} placeholder="Để trống để tự sinh mã" />
                        </label>
                        <label className={styles.field}>
                            <span>Tên BOM</span>
                            <input value={form.bomName} onChange={(event) => setField('bomName', event.target.value)} placeholder="Ví dụ: Cấu hình PC văn phòng" />
                        </label>
                        <label className={styles.field}>
                            <span>Phiên bản</span>
                            <input className={styles.numberInput} inputMode="decimal" type="number" min="0.01" step="0.01" value={form.versionNo} onChange={(event) => setField('versionNo', event.target.value)} />
                        </label>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                                <option value="DRAFT">Nháp</option>
                                <option value="APPROVED">Đã duyệt</option>
                                <option value="INACTIVE">Ngừng dùng</option>
                            </select>
                        </label>
                    </div>

                    <div className={styles.bomBuilderContainer}>
                        <div className={styles.bomBuilderHeader}>
                            <h3 className={styles.bomBuilderTitle}>Chọn linh kiện xây cấu hình máy tính theo nhu cầu</h3>
                            <div className={styles.bomTotalCost}>
                                Chi phí dự tính: {form.lines.reduce((sum, line) => {
                                    const v = variants.find(v => String(v.id) === String(line.componentVariantId));
                                    return sum + (v ? Number(v.salePrice || 0) : 0) * Number(line.quantity || 0);
                                }, 0).toLocaleString('vi-VN')} đ
                            </div>
                        </div>
                        <div className={styles.bomList}>
                            {form.lines.map((line, index) => {
                                const selectedVariant = variants.find(v => String(v.id) === String(line.componentVariantId));
                                
                                return (
                                    <div key={index} className={styles.bomLineCard}>
                                        <div className={styles.bomLineHeader} style={{ flexDirection: 'column', justifyContent: 'center' }}>
                                            <div>{index + 1}. {selectedVariant ? (selectedVariant.categoryName || 'Linh kiện') : 'Linh kiện'}</div>
                                            {selectedVariant && selectedVariant.categoryDescription && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 'normal' }}>
                                                    ({selectedVariant.categoryDescription})
                                                </div>
                                            )}
                                        </div>
                                        
                                        {selectedVariant ? (
                                            <div className={styles.bomLineContent}>
                                                <div className={styles.bomItemImgBox}>
                                                    {selectedVariant.imageUrl ? (
                                                        <img src={selectedVariant.imageUrl} alt={selectedVariant.variantName} />
                                                    ) : (
                                                        <i className="bi bi-box"></i>
                                                    )}
                                                </div>
                                                <div className={styles.bomItemDetails}>
                                                    <div className={styles.bomItemTitle} title={`${selectedVariant.productName} ${(selectedVariant.variantName && selectedVariant.variantName !== selectedVariant.productName) ? `/ ${selectedVariant.variantName}` : ''}`}>
                                                        {selectedVariant.productName} {(selectedVariant.variantName && selectedVariant.variantName !== selectedVariant.productName) && `/ ${selectedVariant.variantName}`}
                                                    </div>
                                                    <div className={styles.bomItemMeta}>
                                                        <span>Bảo hành: <strong>{selectedVariant.warranty || '36 Tháng'}</strong></span>
                                                        <span className={styles.stockStatus}>Kho hàng: <strong>{Number(selectedVariant.stockQty || 0) > 0 ? 'Còn hàng' : 'Hết hàng'}</strong></span>
                                                        <span>Mã SP: <strong>{selectedVariant.sku}</strong></span>
                                                    </div>
                                                    <div className={styles.bomExtraFields}>
                                                        <label>
                                                            Ghi chú:
                                                            <input type="text" className={styles.fullWidth} value={line.note} onChange={(event) => setLineField(index, 'note', event.target.value)} />
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className={styles.bomItemPriceGroup}>
                                                    <span className={styles.bomItemPrice}>{Number(selectedVariant.salePrice || 0).toLocaleString('vi-VN')}</span>
                                                    <span>x</span>
                                                    <input className={styles.bomItemQtyInput} type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLineField(index, 'quantity', event.target.value)} />
                                                    <span>=</span>
                                                    <span className={styles.bomItemTotal}>
                                                        {(Number(selectedVariant.salePrice || 0) * Number(line.quantity || 0)).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                <div className={styles.bomItemActions}>
                                                    <button className={`${styles.bomActionBtn} ${styles.edit}`} type="button" title="Đổi linh kiện" onClick={() => setLineField(index, 'componentVariantId', '')}>
                                                        <i className="bi bi-pencil-square"></i>
                                                    </button>
                                                    <button className={`${styles.bomActionBtn} ${styles.delete}`} type="button" title="Xóa" onClick={() => removeLine(index)}>
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.bomEmptySlot}>
                                                <button
                                                    className={styles.chooseComponentBtn}
                                                    type="button"
                                                    onClick={() => setPickingLineIndex(index)}
                                                >
                                                    + Chọn linh kiện...
                                                </button>
                                                <button className={styles.deleteButton} type="button" title="Xóa dòng" onClick={() => removeLine(index)}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            <div style={{ marginTop: 8 }}>
                                <button className={styles.addBomLineBtn} type="button" onClick={addLine}>
                                    <i className="bi bi-plus-circle"></i> Thêm linh kiện
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                        <button className={styles.secondaryButton} type="button" onClick={() => navigate('/assembly-boms')}>Hủy</button>
                        <button className={styles.primaryButton} type="button" onClick={saveBom} disabled={saving}>
                            <i className="bi bi-save"></i>
                            {saving ? 'Đang cất...' : 'Cất'}
                        </button>
                    </div>
                </div>

                {pickingLineIndex !== null && (
                    <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
                        <div className={styles.modal} style={{ maxWidth: '800px', width: '90%' }}>
                            <div className={styles.modalHeader}>
                                <h2>Chọn linh kiện</h2>
                                <button className={styles.iconButton} type="button" title="Đóng" onClick={() => { setPickingLineIndex(null); setSearchVariantQuery(''); }}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                            <div className={styles.modalBody} style={{ padding: 0 }}>
                                <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', background: '#f8fafc' }}>
                                    <input 
                                        type="text" 
                                        className="misa-input" 
                                        style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                                        placeholder="Tìm kiếm linh kiện theo tên, mã sản phẩm..." 
                                        value={searchVariantQuery}
                                        onChange={(e) => setSearchVariantQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div style={{ maxHeight: '60vh', overflowY: 'auto', background: '#fff' }}>
                                    {variants.filter(v => {
                                        if (!searchVariantQuery) return true;
                                        const q = searchVariantQuery.toLowerCase();
                                        return (v.sku || '').toLowerCase().includes(q) 
                                            || (v.productName || '').toLowerCase().includes(q)
                                            || (v.variantName || '').toLowerCase().includes(q);
                                    }).map(variant => (
                                        <div key={variant.id} className={styles.variantPickerItem}>
                                            <div className={styles.variantPickerImg}>
                                                {variant.imageUrl ? (
                                                    <img src={variant.imageUrl} alt={variant.variantName} />
                                                ) : (
                                                    <i className="bi bi-box"></i>
                                                )}
                                            </div>
                                            <div className={styles.variantPickerInfo}>
                                                <div className={styles.variantPickerTitle}>
                                                    {variant.productName} {(variant.variantName && variant.variantName !== variant.productName) && `/ ${variant.variantName}`}
                                                </div>
                                                <div className={styles.bomItemMeta}>
                                                    <span>Mã SP: <strong>{variant.sku}</strong></span>
                                                    <span>Bảo hành: <strong>{variant.warranty || '36 Tháng'}</strong></span>
                                                    <span className={styles.stockStatus}>Kho hàng: <strong>{Number(variant.stockQty || 0) > 0 ? 'Còn hàng' : 'Hết hàng'}</strong></span>
                                                </div>
                                                <div className={styles.variantPickerPrice}>
                                                    {Number(variant.salePrice || 0).toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                            <div className={styles.variantPickerAction}>
                                                <button 
                                                    className={styles.primaryButton}
                                                    type="button"
                                                    onClick={() => {
                                                        setLineField(pickingLineIndex, 'componentVariantId', String(variant.id));
                                                        setPickingLineIndex(null);
                                                        setSearchVariantQuery('');
                                                    }}
                                                >
                                                    THÊM VÀO CẤU HÌNH <i className="bi bi-chevron-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {variants.length > 0 && variants.filter(v => {
                                        if (!searchVariantQuery) return true;
                                        const q = searchVariantQuery.toLowerCase();
                                        return (v.sku || '').toLowerCase().includes(q) 
                                            || (v.productName || '').toLowerCase().includes(q)
                                            || (v.variantName || '').toLowerCase().includes(q);
                                    }).length === 0 && (
                                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            Không tìm thấy linh kiện phù hợp với "{searchVariantQuery}"
                                        </div>
                                    )}
                                    {variants.length === 0 && (
                                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            Không có linh kiện nào
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}

export default AssemblyBomFormPage;
