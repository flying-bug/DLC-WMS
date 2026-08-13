import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import QuickAddProductModal from '../../components/ui/QuickAddProductModal/QuickAddProductModal';
import * as assemblyApi from '../../api/assemblyOrderApi';
import axiosClient from '../../api/axiosClient';
import { exportBomToExcel } from '../../utils/bomExcelExport';
import styles from './AssemblyOrderPage.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];

const defaultBomLine = { componentVariantId: '', categoryId: '', componentRole: '', quantity: '1', note: '', unitPrice: '', componentSku: '', componentName: '', warrantyMonths: '' };

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
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });
    const [inventoryBalances, setInventoryBalances] = useState([]);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(createDefaultForm());
    const [nextVersion, setNextVersion] = useState(null);
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);

    const isApproved = editing && form.status === 'APPROVED';
    const canEdit = !isApproved;

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    };

    const getStockInfo = (variantId) => {
        if (!variantId) return { available: 0, total: 0 };
        return inventoryBalances
            .filter(b => String(b.variantId) === String(variantId))
            .reduce((acc, b) => {
                const total = Number(b.totalQuantity || 0);
                const reserved = Number(b.totalReserved || 0);
                return {
                    total: acc.total + total,
                    available: acc.available + (total - reserved)
                };
            }, { available: 0, total: 0 });
    };

    // Variant Picker state
    const [pickingLineIndex, setPickingLineIndex] = useState(null);
    const [searchVariantQuery, setSearchVariantQuery] = useState('');

    const loadLookups = useCallback(async () => {
        try {
            setLoading(true);
            const [productResponse, variantResponse, balanceResponse] = await Promise.all([
                axiosClient.get('/products', { params: { page: 0, size: 500 } }),
                axiosClient.get('/products/variants', { params: { page: 0, size: 1000 } }),
                axiosClient.get('/reports/inventory-balance')
            ]);
            setProducts(listFrom(unwrap(productResponse)).filter((item) => item.active !== false));
            setVariants(listFrom(unwrap(variantResponse)).filter((item) => item.active !== false));
            setInventoryBalances(unwrap(balanceResponse) || []);
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách thành phẩm/SKU.');
        } finally {
            setLoading(false);
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
                    categoryId: '',
                    componentRole: line.componentRole || '',
                    quantity: String(Number(line.quantity || 1)),
                    templateNote: '',
                    note: line.note || '',
                    unitPrice: line.unitPrice != null ? line.unitPrice : '',
                    componentSku: line.componentSku || '',
                    componentName: line.componentName || '',
                    warrantyMonths: line.warrantyMonths != null ? line.warrantyMonths : ''
                })) : [{ ...defaultBomLine }]
            });
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được chi tiết cấu hình.');
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

    const handleProductChange = async (productId, productObj = null) => {
        setField('productId', productId);
        if (!productId) {
            setNextVersion(null);
            setForm((current) => ({ ...current, lines: [{ ...defaultBomLine }] }));
            return;
        }

        if (!form.id) {
            try {
                const res = await assemblyApi.getAssemblyBoms({ productId });
                const boms = unwrap(res) || [];
                let maxV = 0;
                boms.forEach(b => {
                    const v = Number(b.versionNo);
                    if (v > maxV) maxV = v;
                });
                setNextVersion(maxV + 1);
            } catch (err) {
                console.error("Lỗi lấy cấu hình cũ:", err);
                setNextVersion(null);
            }
        }

        const selectedProduct = productObj || products.find(p => String(p.id) === String(productId));
        if (selectedProduct && selectedProduct.bomTemplate) {
            try {
                const templateLines = JSON.parse(selectedProduct.bomTemplate);
                if (templateLines && templateLines.length > 0) {
                    const newLines = templateLines.map(line => ({
                        componentVariantId: line.componentVariantId ? String(line.componentVariantId) : '',
                        categoryId: line.categoryId ? String(line.categoryId) : '',
                        componentRole: line.componentRole || '',
                        quantity: String(Number(line.quantity || 1)),
                        templateNote: line.note || '',
                        note: '',
                        unitPrice: '',
                        componentSku: '',
                        componentName: '',
                        warrantyMonths: ''
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

    const handleSelectVariant = (variantIdStr) => {
        setForm(current => {
            const existingIndex = current.lines.findIndex((line, idx) => idx !== pickingLineIndex && String(line.componentVariantId) === variantIdStr);

            if (existingIndex !== -1) {
                const newLines = [...current.lines];
                const pickingLineQty = Number(newLines[pickingLineIndex].quantity || 1);
                const currentQty = Number(newLines[existingIndex].quantity || 1);

                // Tránh lỗi mutate state trực tiếp của React (tạo object mới cho existingIndex)
                newLines[existingIndex] = {
                    ...newLines[existingIndex],
                    quantity: currentQty + pickingLineQty
                };

                if (newLines[pickingLineIndex].componentRole) {
                    newLines[pickingLineIndex] = { ...newLines[pickingLineIndex], componentVariantId: '' };
                } else {
                    if (newLines.length > 1) {
                        newLines.splice(pickingLineIndex, 1);
                    } else {
                        newLines[pickingLineIndex] = { ...newLines[pickingLineIndex], componentVariantId: '' };
                    }
                }

                return { ...current, lines: newLines };
            } else {
                const newLines = [...current.lines];
                newLines[pickingLineIndex] = { ...newLines[pickingLineIndex], componentVariantId: variantIdStr };
                return { ...current, lines: newLines };
            }
        });
        setPickingLineIndex(null);
        setSearchVariantQuery('');
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

    const getCleanedLines = () => form.lines.filter(line => line.componentRole || line.componentVariantId);

    const validateForm = (cleanedLines) => {
        if (!form.productId) return 'Vui lòng chọn thành phẩm.';
        if (!form.bomName.trim()) return 'Vui lòng nhập tên cấu hình.';
        if (!form.versionNo || Number(form.versionNo) <= 0) return 'Phiên bản cấu hình phải lớn hơn 0.';
        if (!cleanedLines.length) return 'Cấu hình phải có ít nhất một linh kiện.';
        for (let index = 0; index < cleanedLines.length; index += 1) {
            const line = cleanedLines[index];
            if (!line.componentVariantId) return `Vui lòng chọn SKU linh kiện dòng ${index + 1}.`;
            if (!line.quantity || Number(line.quantity) <= 0) return `Định mức dòng ${index + 1} phải lớn hơn 0.`;
        }
        return '';
    };

    const buildPayload = (cleanedLines) => ({
        productId: Number(form.productId),
        bomCode: form.bomCode?.trim() || null,
        bomName: form.bomName?.trim(),
        versionNo: Number(form.versionNo),
        status: form.status,
        lines: cleanedLines.map((line) => ({
            componentVariantId: Number(line.componentVariantId),
            quantity: Number.parseFloat(line.quantity),
            note: line.note?.trim() || null,
            componentRole: line.componentRole || null,
            unitPrice: line.unitPrice !== '' ? Number(line.unitPrice) : null,
            componentSku: line.componentSku || null,
            componentName: line.componentName || null,
            warrantyMonths: line.warrantyMonths !== '' ? Number(line.warrantyMonths) : null
        }))
    });

    const saveBom = async (targetStatus = form.status, shouldNavigate = true) => {
        const cleanedLines = getCleanedLines();
        const validationMessage = validateForm(cleanedLines);
        if (validationMessage) {
            showToast('error', validationMessage);
            return false;
        }
        setSaving(true);
        try {
            const payload = buildPayload(cleanedLines);
            payload.status = targetStatus;

            let res;
            if (form.id) {
                res = await assemblyApi.updateAssemblyBom(form.id, payload);
            } else {
                res = await assemblyApi.createAssemblyBom(payload);
            }

            if (shouldNavigate) {
                navigate('/assembly-boms');
            } else {
                if (res && res.data && res.data.data) {
                    setForm(prev => ({ ...prev, id: res.data.data.id, bomCode: res.data.data.bomCode }));
                }
            }
            setSaving(false);
            return true;
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không lưu được cấu hình.');
            setSaving(false);
            return false;
        }
    };

    const handleExportExcel = async () => {
        const cleanedLines = getCleanedLines();
        if (cleanedLines.length === 0) {
            showToast('warning', 'Không có linh kiện nào trong cấu hình để xuất.');
            return;
        }

        // Tự động lưu nháp trước khi xuất Excel để tránh người dùng quên lưu
        if (canEdit) {
            const saved = await saveBom('DRAFT', false);
            if (!saved) return;
        }

        const data = cleanedLines.map(line => {
            const variant = variants.find(v => String(v.id) === String(line.componentVariantId));
            const quantity = Number(line.quantity) || 0;
            const price = line.unitPrice !== '' && line.unitPrice != null ? Number(line.unitPrice) : Number(variant?.salePrice || 0);
            return {
                sku: line.componentSku || variant?.sku || '---',
                name: line.componentName || (variant ? `${variant.productName}${variant.variantName && variant.variantName !== variant.productName ? ' / ' + variant.variantName : ''}` : '---'),
                warrantyMonths: line.warrantyMonths !== '' && line.warrantyMonths != null ? line.warrantyMonths : (variant?.warrantyMonths || 0),
                quantity: quantity,
                price: price,
                amount: quantity * price
            };
        });

        try {
            await exportBomToExcel(data, form.bomCode);
            showToast('success', 'Đã tải xuống file Excel cấu hình máy.');
        } catch (error) {
            showToast('error', 'Có lỗi khi tạo file Excel.');
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className={styles.page}>
                    <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu cấu hình...</div>
                </div>
            </AdminLayout>
        );
    }

    const selectedProductForCode = products.find(p => String(p.id) === String(form.productId));
    const generatedBomCode = (selectedProductForCode && !form.id && nextVersion !== null)
        ? `CH-${selectedProductForCode.productCode}-v${nextVersion}`
        : '';
    const displayBomCode = form.id ? form.bomCode : (form.bomCode || generatedBomCode);

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <button className="btn-back" type="button" onClick={() => navigate('/assembly-boms')} style={{ marginBottom: 12, background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                            <i className="bi bi-arrow-left"></i> Quay lại
                        </button>
                        <h1 className={styles.pageTitle}>{form.id ? `Cập nhật cấu hình ${displayBomCode ? displayBomCode : ''}`.trim() : `Tạo cấu hình ${displayBomCode ? displayBomCode : ''}`.trim()}</h1>
                        <p className={styles.pageSubtitle}>Thiết lập cấu hình máy định mức linh kiện cho thành phẩm.</p>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '24px' }}>

                    {!canEdit && (
                        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <i className="bi bi-shield-lock-fill" style={{ fontSize: '20px' }}></i>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Cấu hình đã được duyệt</h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Cấu hình này đã được duyệt và đang có hiệu lực. Bạn không thể chỉnh sửa cấu hình này để đảm bảo tính nhất quán của dữ liệu. Nếu cần thay đổi cấu hình, vui lòng tạo phiên bản cấu hình mới.</p>
                            </div>
                        </div>
                    )}

                    <div className={styles.formGrid}>
                        <label className={styles.field}>
                            <span>Thành phẩm <span style={{ color: 'red' }}>*</span></span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <SearchableSelect
                                        value={form.productId}
                                        onChange={(event) => handleProductChange(event.target.value)}
                                        disabled={!canEdit}
                                    >
                                        <option value="">Chọn thành phẩm</option>
                                        {products.filter(p => p.productType === 'Thành phẩm').map((product) => (
                                            <option key={product.id} value={product.id}>{product.productCode} - {product.productName}</option>
                                        ))}
                                    </SearchableSelect>
                                </div>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickAddModal(true)}
                                        className={styles.btnOutline}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', height: '100%', minHeight: '38px' }}
                                        title="Tạo thành phẩm mới"
                                    >
                                        <i className="bi bi-plus-lg" style={{ fontSize: '1.1rem' }}></i>
                                    </button>
                                )}
                            </div>
                        </label>
                        <label className={styles.field}>
                            <span>Mã cấu hình</span>
                            <input value={form.bomCode} onChange={(event) => setField('bomCode', event.target.value)} placeholder={generatedBomCode || "Mã cấu hình"} disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>Tên cấu hình <span style={{ color: 'red' }}>*</span></span>
                            <input value={form.bomName} onChange={(event) => setField('bomName', event.target.value)} placeholder="Ví dụ: Cấu hình PC văn phòng" disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>Phiên bản</span>
                            <input
                                className={styles.numberInput}
                                type="text"
                                value={form.id ? form.versionNo : (nextVersion !== null ? nextVersion : "Tự động sinh")}
                                disabled={true}
                                style={{ textAlign: 'left' }}
                            />
                        </label>
                    </div>

                    <div className={styles.bomBuilderContainer}>
                        <div className={styles.bomBuilderHeader}>
                            <h3 className={styles.bomBuilderTitle}>Chọn linh kiện xây cấu hình máy tính theo nhu cầu</h3>
                            <div className={styles.bomTotalCost}>
                                Chi phí dự tính: {form.lines.reduce((sum, line) => {
                                    const v = variants.find(v => String(v.id) === String(line.componentVariantId));
                                    const price = line.unitPrice !== '' && line.unitPrice != null ? Number(line.unitPrice) : (v ? Number(v.salePrice || 0) : 0);
                                    return sum + price * Number(line.quantity || 0);
                                }, 0).toLocaleString('vi-VN')} đ
                            </div>
                        </div>
                        <div className={styles.bomList}>
                            {form.lines.map((line, index) => {
                                const selectedVariant = variants.find(v => String(v.id) === String(line.componentVariantId));

                                let displayTemplateNote = line.templateNote;
                                if (editing && form.productId && products.length > 0) {
                                    const prod = products.find(p => String(p.id) === String(form.productId));
                                    if (prod && prod.bomTemplate) {
                                        try {
                                            const templateLines = JSON.parse(prod.bomTemplate);
                                            if (line.componentRole) {
                                                const tLine = templateLines.find(t => t.componentRole === line.componentRole);
                                                if (tLine && tLine.note) {
                                                    displayTemplateNote = tLine.note;
                                                }
                                            }
                                        } catch (e) {
                                            // ignore parse error
                                        }
                                    }
                                }

                                return (
                                    <div key={index} className={styles.bomLineCard}>
                                        <div className={styles.bomLineHeader} style={{ flexDirection: 'column', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937', textTransform: 'uppercase' }}>
                                                    {index + 1}. {line.componentRole || (selectedVariant ? selectedVariant.categoryName : 'Linh kiện tùy chọn')}
                                                </span>
                                                {displayTemplateNote && (
                                                    <div style={{ fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 500, border: '1px dashed #f59e0b', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.4, width: '100%', wordBreak: 'break-word' }}>
                                                        <i className="bi bi-pin-angle-fill" style={{ marginTop: '2px' }}></i>
                                                        <span><strong>Yêu cầu:</strong> {displayTemplateNote}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', alignItems: 'flex-start' }}>
                                                {selectedVariant && selectedVariant.categoryDescription && (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                                                        ({selectedVariant.categoryDescription})
                                                    </div>
                                                )}
                                                {line.componentRole && (
                                                    <span style={{ fontSize: '0.65rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                                                        Bắt buộc
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {selectedVariant ? (
                                            <div className={styles.bomLineContent}>
                                                <div className={styles.bomItemImgBox}>
                                                    {(() => {
                                                        const parentProduct = products.find(p => String(p.id) === String(selectedVariant.productId));
                                                        return parentProduct?.imageUrl ? (
                                                            <img src={parentProduct.imageUrl} alt={selectedVariant.variantName} />
                                                        ) : (
                                                            <i className="bi bi-box"></i>
                                                        );
                                                    })()}
                                                </div>
                                                <div className={styles.bomItemDetails}>
                                                    <div className={styles.bomItemTitle} title={`${selectedVariant.productName} ${(selectedVariant.variantName && selectedVariant.variantName !== selectedVariant.productName) ? `/ ${selectedVariant.variantName}` : ''}`}>
                                                        {selectedVariant.productName} {(selectedVariant.variantName && selectedVariant.variantName !== selectedVariant.productName) && `/ ${selectedVariant.variantName}`}
                                                    </div>
                                                    <div className={styles.bomItemMeta}>
                                                        <span>Bảo hành: <strong>{selectedVariant.warrantyMonths > 0 ? `${selectedVariant.warrantyMonths} Tháng` : 'Không bảo hành'}</strong></span>
                                                        <span className={styles.stockStatus}>Tồn kho: <strong style={{ color: Math.max(0, getStockInfo(selectedVariant.id).available) > 0 ? '#16a34a' : '#dc2626' }}>{Math.max(0, getStockInfo(selectedVariant.id).available).toLocaleString('vi-VN')}</strong></span>
                                                        <span>Mã SP: <strong>{selectedVariant.sku}</strong></span>
                                                    </div>
                                                    <div className={styles.bomExtraFields}>
                                                        <label>
                                                            Ghi chú:
                                                            <input type="text" className={styles.fullWidth} value={line.note} onChange={(event) => setLineField(index, 'note', event.target.value)} disabled={!canEdit} />
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className={styles.bomItemPriceGroup}>
                                                    <input
                                                        className={styles.bomItemQtyInput}
                                                        style={{ width: '110px', textAlign: 'right' }}
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={line.unitPrice !== '' && line.unitPrice != null ? Number(line.unitPrice).toLocaleString('vi-VN') : (selectedVariant?.salePrice != null ? Number(selectedVariant.salePrice).toLocaleString('vi-VN') : '0')}
                                                        onChange={(event) => setLineField(index, 'unitPrice', event.target.value.replace(/\D/g, ''))}
                                                        disabled={!canEdit}
                                                        title="Đơn giá"
                                                    /> <span style={{ fontSize: '0.85rem' }}>đ</span>
                                                    <span>x</span>
                                                    <input className={styles.bomItemQtyInput} type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLineField(index, 'quantity', event.target.value)} disabled={!canEdit} />
                                                    <span>=</span>
                                                    <span className={styles.bomItemTotal}>
                                                        {(Number(line.unitPrice !== '' && line.unitPrice != null ? line.unitPrice : (selectedVariant?.salePrice || 0)) * Number(line.quantity || 0)).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                {canEdit && (
                                                    <div className={styles.bomItemActions}>
                                                        <button className={`${styles.bomActionBtn} ${styles.edit}`} type="button" title="Đổi linh kiện" onClick={() => setPickingLineIndex(index)}>
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        {!line.componentRole && (
                                                            <button className={`${styles.bomActionBtn} ${styles.delete}`} type="button" title="Xóa" onClick={() => removeLine(index)}>
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.bomEmptySlot} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
                                                {line.componentRole && (
                                                    <div style={{ fontWeight: 600, color: '#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <i className="bi bi-info-circle" style={{ color: '#3b82f6' }}></i>
                                                            Cần chọn danh mục: <span style={{ color: '#1d4ed8' }}>{line.componentRole}</span>
                                                        </div>
                                                        {displayTemplateNote && (
                                                            <div style={{ color: '#92400e', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '6px', border: '1px dashed #f59e0b', maxWidth: '400px', textAlign: 'left', lineHeight: 1.4 }}>
                                                                <i className="bi bi-pin-angle-fill" style={{ marginTop: '2px' }}></i>
                                                                <span><strong>Yêu cầu:</strong> {displayTemplateNote}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {canEdit && (
                                                    <button
                                                        className={styles.chooseComponentBtn}
                                                        type="button"
                                                        onClick={() => setPickingLineIndex(index)}
                                                    >
                                                        + Chọn linh kiện...
                                                    </button>
                                                )}
                                                {canEdit && !line.componentRole && (
                                                    <button className={styles.deleteButton} type="button" title="Xóa dòng" onClick={() => removeLine(index)} style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {canEdit && (
                                <div style={{ marginTop: 8 }}>
                                    <button className={styles.addBomLineBtn} type="button" onClick={addLine}>
                                        <i className="bi bi-plus-circle"></i> Thêm linh kiện
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                        <button className="btn-misa-cancel" type="button" onClick={() => navigate('/assembly-boms')}>{canEdit ? 'Hủy bỏ' : 'Đóng'}</button>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                            <button className="btn-misa-cancel" style={{ border: '1px solid #10b981', color: '#10b981' }} type="button" onClick={handleExportExcel}>
                                <i className="bi bi-file-earmark-excel"></i>
                            </button>
                            {canEdit && (
                                <>
                                    <button className="btn-misa-draft" type="button" onClick={() => saveBom('DRAFT')} disabled={saving}>
                                        <i className="bi bi-save"></i> Lưu nháp
                                    </button>
                                    <button className="btn-misa-post" type="button" onClick={() => saveBom('APPROVED')} disabled={saving}>
                                        <i className="bi bi-check-circle"></i>
                                        {saving ? 'Đang lưu...' : 'Duyệt cấu hình'}
                                    </button>
                                </>
                            )}
                            {isApproved && (
                                <button className="btn-misa-draft" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }} type="button" onClick={() => {
                                    if (window.confirm('Bạn có chắc chắn muốn ngừng sử dụng cấu hình này?')) {
                                        saveBom('INACTIVE');
                                    }
                                }} disabled={saving}>
                                    <i className="bi bi-x-circle"></i> Ngừng sử dụng
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {pickingLineIndex !== null && (
                    <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
                        <div className={styles.modal} style={{ maxWidth: '800px', width: '90%' }}>
                            <div className={styles.modalHeader} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                                <button type="button" onClick={() => { setPickingLineIndex(null); setSearchVariantQuery(''); }} style={{ background: '#f3f4f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4b5563', transition: 'all 0.2s' }} title="Quay lại danh sách cấu hình">
                                    <i className="bi bi-arrow-left" style={{ fontSize: '18px' }}></i>
                                </button>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1f2937' }}>Tìm kiếm & Chọn linh kiện</h2>
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
                                        const parentProd = products.find(p => String(p.id) === String(v.productId));
                                        const type = v.productType || (parentProd ? parentProd.productType : null);
                                        if (type !== 'Hàng hóa') return false;

                                        const line = form.lines[pickingLineIndex];
                                        if (line && line.categoryId && String(v.categoryId) !== String(line.categoryId)) {
                                            return false;
                                        }
                                        if (!searchVariantQuery) return true;
                                        const q = searchVariantQuery.toLowerCase();
                                        return (v.sku || '').toLowerCase().includes(q)
                                            || (v.productName || '').toLowerCase().includes(q)
                                            || (v.variantName || '').toLowerCase().includes(q);
                                    }).map(variant => {
                                        const parentProduct = products.find(p => String(p.id) === String(variant.productId));
                                        return (
                                            <div key={variant.id} className={styles.variantPickerItem}>
                                                <div className={styles.variantPickerImg}>
                                                    {parentProduct?.imageUrl ? (
                                                        <img src={parentProduct.imageUrl} alt={variant.variantName} />
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
                                                        <span>Bảo hành: <strong>{variant.warrantyMonths > 0 ? `${variant.warrantyMonths} Tháng` : 'Không bảo hành'}</strong></span>
                                                        <span className={styles.stockStatus}>Tồn kho: <strong style={{ color: Math.max(0, getStockInfo(variant.id).available) > 0 ? '#16a34a' : '#dc2626' }}>{Math.max(0, getStockInfo(variant.id).available).toLocaleString('vi-VN')}</strong></span>
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
                                                            handleSelectVariant(String(variant.id));
                                                        }}
                                                    >
                                                        THÊM VÀO CẤU HÌNH <i className="bi bi-chevron-right"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {variants.length > 0 && variants.filter(v => {
                                        const parentProd = products.find(p => String(p.id) === String(v.productId));
                                        const type = v.productType || (parentProd ? parentProd.productType : null);
                                        if (type !== 'Hàng hóa') return false;

                                        const line = form.lines[pickingLineIndex];
                                        if (line && line.categoryId && String(v.categoryId) !== String(line.categoryId)) {
                                            return false;
                                        }
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



                <QuickAddProductModal
                    isOpen={showQuickAddModal}
                    onClose={() => setShowQuickAddModal(false)}
                    onSuccess={async (newProduct) => {
                        await loadLookups();
                        handleProductChange(newProduct.id, newProduct);
                        showToast('success', 'Thêm thành phẩm thành công!');
                    }}
                />

                {toast.isVisible && (
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

export default AssemblyBomFormPage;
