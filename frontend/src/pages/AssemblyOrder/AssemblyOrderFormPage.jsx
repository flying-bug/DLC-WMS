import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import Modal from '../../components/ui/Modal/Modal';
import Toast from '../../components/ui/Toast/Toast';
import * as assemblyApi from '../../api/assemblyOrderApi';
import * as warehouseApi from '../../api/warehouseApi';
import axiosClient from '../../api/axiosClient';
import styles from './AssemblyOrderFormPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toLocaleDateString('sv-SE');

const STATUS_META = {
    DRAFT: { label: 'Lưu tạm', code: 'info' },
    SUBMITTED: { label: 'Hoàn thành', code: 'success' },
    CANCELLED: { label: 'Đã hủy', code: 'danger' }
};

const defaultBomLine = { componentVariantId: '', quantity: '1', note: '' };

const createDefaultBomForm = () => ({
    productId: '',
    bomCode: '',
    bomName: '',
    versionNo: '1',
    status: 'APPROVED',
    lines: [{ ...defaultBomLine }]
});

function AssemblyOrderFormPage() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const editing = Boolean(id);
    const [boms, setBoms] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingBom, setSavingBom] = useState(false);
    
    // Modal states
    const [showBomModal, setShowBomModal] = useState(false);
    const [bomForm, setBomForm] = useState(createDefaultBomForm);
    const [bomError, setBomError] = useState('');
    
    // Toast state
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const [orderDetail, setOrderDetail] = useState(null);
    const [customLines, setCustomLines] = useState([]);
    const [customLinesDirty, setCustomLinesDirty] = useState(false);
    const [form, setForm] = useState(() => ({
        orderType: searchParams.get('type') === 'DISASSEMBLY' ? 'DISASSEMBLY' : 'ASSEMBLY',
        orderCode: (searchParams.get('type') === 'DISASSEMBLY' ? 'TD-' : 'LR-') + Date.now(),
        bomId: '',
        warehouseId: '',
        quantity: '1',
        status: 'DRAFT',
        executionDate: today(),
        note: ''
    }));

    const selectedBom = useMemo(() => boms.find((bom) => String(bom.id) === String(form.bomId)), [boms, form.bomId]);
    const isViewMode = searchParams.get('mode') === 'view';
    const canEdit = (!editing || ['DRAFT'].includes(form.status)) && !isViewMode;
    const status = STATUS_META[form.status] || { label: form.status || 'Chưa rõ', code: 'info' };

    const loadBaseData = useCallback(async () => {
        setLoading(true);
        try {
            const [bomResponse, warehouseResponse] = await Promise.all([
                assemblyApi.getAssemblyBoms({ status: 'APPROVED' }),
                warehouseApi.getWarehouses({ page: 0, size: 200 })
            ]);
            setBoms(listFrom(unwrap(bomResponse)));
            setWarehouses(listFrom(unwrap(warehouseResponse)));
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được dữ liệu BOM/kho.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadBomLookups = useCallback(async () => {
        try {
            const [productResponse, variantResponse] = await Promise.all([
                axiosClient.get('/products', { params: { page: 0, size: 500 } }),
                axiosClient.get('/products/variants', { params: { page: 0, size: 1000 } })
            ]);
            setProducts(listFrom(unwrap(productResponse)).filter((item) => item.active !== false));
            setVariants(listFrom(unwrap(variantResponse)).filter((item) => item.active !== false));
        } catch (err) {
            setBomError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách thành phẩm/SKU.');
        }
    }, []);

    const loadOrder = useCallback(async () => {
        if (!editing) {
            return;
        }
        setLoading(true);
        try {
            const order = unwrap(await assemblyApi.getAssemblyOrderById(id));
            setOrderDetail(order);
            setForm({
                orderType: order.orderType || 'ASSEMBLY',
                orderCode: order.orderCode || '',
                bomId: order.bomId || '',
                warehouseId: order.warehouseId || '',
                quantity: order.quantity || '1',
                status: order.status || 'DRAFT',
                executionDate: order.executionDate || today(),
                note: order.note || ''
            });
            
            if (searchParams.get('mode') !== 'view' && order.status === 'SUBMITTED') {
                showToast('error', 'Lệnh đã hoàn thành không được phép chỉnh sửa.');
                setSearchParams({ mode: 'view' }, { replace: true });
            }
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được chi tiết lệnh.');
        } finally {
            setLoading(false);
        }
    }, [editing, id, searchParams, setSearchParams]);

    useEffect(() => {
        loadBaseData();
        loadBomLookups();
        loadOrder();
    }, [loadBaseData, loadBomLookups, loadOrder]);

    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    
    useEffect(() => {
        if (editing && orderDetail?.lines && !customLinesDirty) {
            setCustomLines(orderDetail.lines.map(line => ({
                componentVariantId: line.componentVariantId,
                quantityRequired: line.quantityRequired,
                note: line.note || ''
            })));
        } else if (!editing && selectedBom && !customLinesDirty) {
            setCustomLines(selectedBom.lines.map(line => ({
                componentVariantId: line.componentVariantId,
                quantityRequired: Number(line.quantity || 0) * Number(form.quantity || 1),
                note: line.note || ''
            })));
        }
    }, [orderDetail, selectedBom, editing]);

    useEffect(() => {
        if (!editing && !customLinesDirty && selectedBom) {
             setCustomLines(selectedBom.lines.map(line => ({
                componentVariantId: line.componentVariantId,
                quantityRequired: Number(line.quantity || 0) * Number(form.quantity || 1),
                note: line.note || ''
            })));
        }
    }, [form.quantity]);

    const buildPayload = (overrideStatus = null) => ({
        orderCode: form.orderCode || null,
        bomId: Number(form.bomId),
        warehouseId: Number(form.warehouseId),
        quantity: Number(form.quantity),
        status: overrideStatus || form.status,
        executionDate: form.executionDate,
        note: form.note || null,
        createdBy: Number(sessionStorage.getItem('userId') || 1),
        lines: form.orderType === 'ASSEMBLY' && customLinesDirty ? customLines.map(line => ({
            componentVariantId: Number(line.componentVariantId),
            quantityRequired: Number(line.quantityRequired),
            note: line.note
        })) : undefined
    });

    const getPageTitle = () => {
        const typeText = form.orderType === 'DISASSEMBLY' ? 'tháo dỡ' : 'lắp ráp';
        const codeText = form.orderCode ? ` ${form.orderCode}` : '';
        if (!editing) return `Tạo lệnh ${typeText}${codeText}`;
        if (isViewMode) return `Chi tiết lệnh ${typeText}${codeText}`;
        return `Cập nhật lệnh ${typeText}${codeText}`;
    };

    const validate = () => {
        if (!form.bomId) return 'Vui lòng chọn BOM.';
        if (!form.warehouseId) return 'Vui lòng chọn kho thực hiện.';
        if (!form.quantity || Number(form.quantity) <= 0) return 'Số lượng phải lớn hơn 0.';
        if (!form.executionDate) return 'Vui lòng chọn ngày thực hiện.';
        return '';
    };

    const handleSubmit = async (event, overrideStatus = null) => {
        if (event) event.preventDefault();
        const validationMessage = validate();
        if (validationMessage) {
            showToast('error', validationMessage);
            return;
        }
        setSaving(true);
        try {
            const payload = buildPayload(overrideStatus);
            const response = editing
                ? await assemblyApi.updateAssemblyOrder(id, payload)
                : form.orderType === 'DISASSEMBLY'
                    ? await assemblyApi.createDisassemblyOrder(payload)
                    : await assemblyApi.createAssemblyOrder(payload);
            const saved = unwrap(response);
            showToast('success', editing ? 'Cập nhật lệnh thành công.' : 'Tạo lệnh thành công.');
            if (!editing && saved?.id) {
                setTimeout(() => navigate(`/assembly-orders/${saved.id}`), 1500);
            } else if (editing) {
                setTimeout(() => navigate('/assembly-orders'), 1500);
            }
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không lưu được lệnh lắp ráp/tháo dỡ.');
        } finally {
            setSaving(false);
        }
    };

    const setBomField = (field, value) => {
        setBomForm((current) => ({ ...current, [field]: value }));
        setBomError('');
    };

    const setBomLineField = (index, field, value) => {
        setBomForm((current) => ({
            ...current,
            lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line)
        }));
        setBomError('');
    };

    const addBomLine = () => {
        setBomForm((current) => ({
            ...current,
            lines: [...current.lines, { ...defaultBomLine }]
        }));
    };

    const removeBomLine = (index) => {
        setBomForm((current) => ({
            ...current,
            lines: current.lines.length === 1 ? current.lines : current.lines.filter((_, lineIndex) => lineIndex !== index)
        }));
    };

    const openBomModal = () => {
        setBomError('');
        setBomForm(createDefaultBomForm());
        setShowBomModal(true);
    };

    const validateBomForm = () => {
        if (!bomForm.productId) return 'Vui lòng chọn thành phẩm.';
        if (!bomForm.bomName.trim()) return 'Vui lòng nhập tên BOM.';
        if (!bomForm.versionNo || Number(bomForm.versionNo) <= 0) return 'Phiên bản BOM phải lớn hơn 0.';
        if (!bomForm.lines.length) return 'BOM phải có ít nhất một linh kiện.';
        for (let index = 0; index < bomForm.lines.length; index += 1) {
            const line = bomForm.lines[index];
            if (!line.componentVariantId) return `Vui lòng chọn SKU linh kiện dòng ${index + 1}.`;
            if (!line.quantity || Number(line.quantity) <= 0) return `Định mức dòng ${index + 1} phải lớn hơn 0.`;
            if (!Number.isInteger(Number(line.quantity))) return `Định mức dòng ${index + 1} phải là số nguyên.`;
        }
        return '';
    };

    const saveQuickBom = async () => {
        const validationMessage = validateBomForm();
        if (validationMessage) {
            setBomError(validationMessage);
            return;
        }
        setSavingBom(true);
        setBomError('');
        try {
            const payload = {
                productId: Number(bomForm.productId),
                bomCode: bomForm.bomCode.trim() || null,
                bomName: bomForm.bomName.trim(),
                versionNo: Number(bomForm.versionNo),
                status: 'APPROVED',
                lines: bomForm.lines.map((line) => ({
                    componentVariantId: Number(line.componentVariantId),
                    quantity: Number.parseInt(line.quantity, 10),
                    note: line.note?.trim() || null
                }))
            };
            const savedBom = unwrap(await assemblyApi.createAssemblyBom(payload));
            const refreshed = listFrom(unwrap(await assemblyApi.getAssemblyBoms({ status: 'APPROVED' })));
            setBoms(refreshed);
            setField('bomId', savedBom.id || '');
            setShowBomModal(false);
            showToast('success', 'Đã tạo BOM nhanh và tự động chọn vào lệnh.');
        } catch (err) {
            setBomError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tạo được BOM nhanh.');
        } finally {
            setSavingBom(false);
        }
    };

    const previewLines = editing && orderDetail?.lines?.length > 0
        ? orderDetail.lines.map(line => ({
            componentName: line.componentName,
            componentSku: line.componentSku,
            unitName: line.unitName,
            required: line.quantityRequired,
        }))
        : selectedBom?.lines?.map((line) => ({
            ...line,
            required: Number(line.quantity || 0) * Number(form.quantity || 0)
        })) || [];

    const targetItem = editing && orderDetail ? {
        name: orderDetail.targetName,
        sku: orderDetail.targetSku,
        quantity: Number(orderDetail.quantity || 0),
        unitName: selectedBom?.unitName || ''
    } : selectedBom ? {
        name: selectedBom.productName,
        sku: selectedBom.productCode,
        quantity: Number(form.quantity || 0),
        unitName: selectedBom.unitName
    } : null;
    
    const lossItems = form.orderType === 'DISASSEMBLY'
        ? (targetItem ? [targetItem] : [])
        : previewLines.map((line) => ({
            name: line.componentName,
            sku: line.componentSku,
            quantity: line.required,
            unitName: line.unitName
        }));
        
    const gainItems = form.orderType === 'DISASSEMBLY'
        ? previewLines.map((line) => ({
            name: line.componentName,
            sku: line.componentSku,
            quantity: line.required,
            unitName: line.unitName
        }))
        : (targetItem ? [targetItem] : []);

    return (
        <AdminLayout>
                <div className={styles.pageHeader}>
                    <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/assembly-orders'); }}>
                        <i className="bi bi-arrow-left"></i> {getPageTitle()}
                    </a>
                </div>
            <div className={styles.pageBody}>

                <div className={styles.mainContent}>
                    {/* LEFT COLUMN: FORM */}
                    <div className={styles.leftColumn}>
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Thông tin chung</h2>
                            
                            {editing && (
                                <div className={styles.detailGrid} style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div className={styles.detailItem}><span>Trạng thái</span><strong><span className={`${styles.badge} ${styles['badge' + status.code.charAt(0).toUpperCase() + status.code.slice(1)]}`}>{status.label}</span></strong></div>
                                    <div className={styles.detailItem}><span>Người tạo</span><strong>{orderDetail?.createdBy ? `ID: ${orderDetail.createdBy}` : 'Hệ thống'}</strong></div>
                                    <div className={styles.detailItem}><span>Ngày tạo</span><strong>{orderDetail?.createdAt ? new Date(orderDetail.createdAt).toLocaleString('vi-VN') : '---'}</strong></div>
                                </div>
                            )}

                            <div className={styles.cardBody}>
                                {!editing && (
                                    <div className="misa-form-row" style={{ marginBottom: '12px' }}>
                                        <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                            <label className="misa-label">Loại lệnh <span className="required">*</span></label>
                                            <input 
                                                className="misa-input" 
                                                value={form.orderType === 'ASSEMBLY' ? 'Lắp ráp' : 'Tháo dỡ'} 
                                                disabled 
                                                style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} 
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="misa-form-row">
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Mã lệnh</label>
                                        <input className="misa-input" value={form.orderCode} onChange={(event) => setField('orderCode', event.target.value)} placeholder="Để trống để tự sinh mã" disabled={!canEdit} />
                                    </div>
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Ngày thực hiện <span className="required">*</span></label>
                                        <input type="date" className="misa-input" value={form.executionDate} onChange={(event) => setField('executionDate', event.target.value)} disabled={!canEdit} />
                                    </div>
                                </div>

                                <div className="misa-form-row" style={{ marginTop: '12px' }}>
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Chọn Kho <span className="required">*</span></label>
                                        <select className="misa-input" value={form.warehouseId} onChange={(event) => setField('warehouseId', event.target.value)} disabled={!canEdit || loading}>
                                            <option value="">Chọn kho thực hiện</option>
                                            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.warehouseName}</option>)}
                                        </select>
                                    </div>
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Số lượng <span className="required">*</span></label>
                                        <input className="misa-input" style={{ textAlign: 'right' }} inputMode="decimal" type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} disabled={!canEdit} />
                                    </div>
                                </div>

                                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                                    <label className="misa-label">BOM (Định mức) <span className="required">*</span></label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select className="misa-input" style={{ flex: 1 }} value={form.bomId} onChange={(event) => setField('bomId', event.target.value)} disabled={!canEdit || loading}>
                                            <option value="">{loading ? 'Đang tải BOM...' : 'Chọn BOM đã duyệt'}</option>
                                            {boms.map((bom) => <option key={bom.id} value={bom.id}>{bom.bomCode} - {bom.bomName}</option>)}
                                        </select>
                                        <button className={styles.btnOutline} type="button" onClick={openBomModal} disabled={!canEdit} style={{ whiteSpace: 'nowrap', padding: '0 12px', height: '32px' }}>
                                            <i className="bi bi-plus-lg"></i> Tạo BOM
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                                    <label className="misa-label">Trạng thái lưu</label>
                                    <select className="misa-input" value={form.status} onChange={(event) => setField('status', event.target.value)} disabled={!canEdit} style={{ width: '50%' }}>
                                        <option value="DRAFT">Lưu tạm</option>
                                        <option value="SUBMITTED">Hoàn thành</option>
                                    </select>
                                </div>
                                
                                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                                    <label className="misa-label">Ghi chú</label>
                                    <textarea className="misa-input" style={{ resize: 'vertical' }} value={form.note} onChange={(event) => setField('note', event.target.value)} disabled={!canEdit} placeholder="Ghi chú nội bộ cho lệnh" rows={2} />
                                </div>
                            </div>
                        </div>
                        
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Chi tiết dòng nguyên liệu</h2>
                            
                            {form.orderType === 'ASSEMBLY' ? (
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginTop: '12px' }}>
                                    <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 600, color: '#374151' }}><i className="bi bi-tools"></i> Tùy chỉnh linh kiện xuất kho</div>
                                        {canEdit && (
                                            <button className={styles.btnOutline} type="button" onClick={() => {
                                                setCustomLines(prev => [...prev, { componentVariantId: '', quantityRequired: 1, note: '' }]);
                                                setCustomLinesDirty(true);
                                            }} style={{ padding: '4px 12px', fontSize: '13px' }}>
                                                <i className="bi bi-plus"></i> Thêm linh kiện
                                            </button>
                                        )}
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                                            <tr>
                                                <th style={{ padding: '8px 16px', fontWeight: '600' }}>SKU LINH KIỆN</th>
                                                <th style={{ padding: '8px 16px', fontWeight: '600', width: '120px', textAlign: 'right' }}>SỐ LƯỢNG</th>
                                                <th style={{ padding: '8px 16px', fontWeight: '600' }}>GHI CHÚ</th>
                                                {canEdit && <th style={{ padding: '8px 16px', width: '40px' }}></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customLines.length === 0 ? (
                                                <tr><td colSpan={canEdit ? 4 : 3} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Không có dữ liệu</td></tr>
                                            ) : customLines.map((line, idx) => (
                                                <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <select className="misa-input" style={{ height: '32px' }} value={line.componentVariantId} disabled={!canEdit} onChange={(e) => {
                                                            const arr = [...customLines];
                                                            arr[idx].componentVariantId = e.target.value;
                                                            setCustomLines(arr);
                                                            setCustomLinesDirty(true);
                                                        }}>
                                                            <option value="">Chọn linh kiện</option>
                                                            {variants.map(v => <option key={v.id} value={v.id}>{v.sku} - {v.productName} / {v.variantName}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <input className="misa-input" style={{ height: '32px', textAlign: 'right' }} type="number" min="0.0001" step="0.0001" value={line.quantityRequired} disabled={!canEdit} onChange={(e) => {
                                                            const arr = [...customLines];
                                                            arr[idx].quantityRequired = e.target.value;
                                                            setCustomLines(arr);
                                                            setCustomLinesDirty(true);
                                                        }} />
                                                    </td>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <input className="misa-input" style={{ height: '32px' }} value={line.note} disabled={!canEdit} onChange={(e) => {
                                                            const arr = [...customLines];
                                                            arr[idx].note = e.target.value;
                                                            setCustomLines(arr);
                                                            setCustomLinesDirty(true);
                                                        }} />
                                                    </td>
                                                    {canEdit && (
                                                        <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                                            <button type="button" onClick={() => {
                                                                setCustomLines(prev => prev.filter((_, i) => i !== idx));
                                                                setCustomLinesDirty(true);
                                                            }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className={styles.flowGridContainer}>
                                    <FlowPanel
                                        tone="loss"
                                        title="Nguyên liệu xuất (Bị trừ)"
                                        icon="bi-dash-circle-fill"
                                        emptyText={loading ? 'Đang tính toán...' : 'Chọn BOM để xem hàng bị trừ.'}
                                        items={lossItems}
                                    />
                                    <FlowPanel
                                        tone="gain"
                                        title="Sản phẩm nhập (Được cộng)"
                                        icon="bi-plus-circle-fill"
                                        emptyText={loading ? 'Đang tính toán...' : 'Chọn BOM để xem hàng được cộng.'}
                                        items={gainItems}
                                    />
                                </div>
                            )}

                        </div>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY */}
                    <div className={styles.rightColumn}>
                        <div className={styles.card} style={{ position: 'sticky', top: '24px' }}>
                            <h2 className={styles.cardTitle}>Tóm tắt cấu hình BOM</h2>
                            
                            <div className={styles.summaryList}>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Mã BOM</span>
                                    <span className={styles.summaryValue} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{selectedBom?.bomCode || '---'}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Phiên bản</span>
                                    <span className={styles.summaryValue}>{selectedBom?.versionNo || '---'}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Thành phẩm</span>
                                    <span className={styles.summaryValue}>{selectedBom?.productName || 'Chưa chọn'}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>Số linh kiện (SKU)</span>
                                    <span className={styles.summaryValue}>{previewLines.length}</span>
                                </div>
                                
                                <hr className={styles.divider} />
                                
                                <div className={styles.summaryItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                    <span className={styles.summaryLabel}>Tiến độ hiện tại:</span>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            height: '100%', 
                                            backgroundColor: 'var(--color-success)', 
                                            width: `${orderDetail ? Math.min(100, (Number(orderDetail.quantityProduced || 0) / Number(orderDetail.quantity || 1)) * 100) : 0}%` 
                                        }}></div>
                                    </div>
                                    <span className={styles.summaryValue} style={{ alignSelf: 'flex-end', fontSize: '12px' }}>
                                        {Number(orderDetail?.quantityProduced || 0).toLocaleString('vi-VN')} / {Number(form.quantity || 0).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.bottomBar}>
                <button className="btn-misa-cancel" type="button" onClick={() => navigate('/assembly-orders')}>
                    {canEdit ? 'Hủy bỏ' : 'Đóng'}
                </button>
                {canEdit && (
                    <div className={styles.actionButtons}>
                        <button className="btn-misa-draft" type="button" onClick={(e) => handleSubmit(e, 'DRAFT')} disabled={saving}>
                            <i className="bi bi-save"></i> Lưu tạm
                        </button>
                        <button className="btn-misa-post" type="button" onClick={(e) => handleSubmit(e, 'SUBMITTED')} disabled={saving}>
                            <i className="bi bi-check-circle"></i>
                            {saving ? 'Đang lưu...' : 'Hoàn thành lệnh'}
                        </button>
                    </div>
                )}
            </div>

            <Modal
                isOpen={showBomModal}
                onClose={() => setShowBomModal(false)}
                dialogStyle={{ width: '900px', maxWidth: '95vw', padding: 0 }}
            >
                {/* Custom Modal Header to match Image 1 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1f2937' }}>Tạo nhanh BOM</h2>
                    <button type="button" onClick={() => setShowBomModal(false)} style={{ background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div style={{ padding: '24px' }}>
                    {bomError && (
                        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
                            {bomError}
                        </div>
                    )}

                    <div className="misa-form-row">
                        <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                            <label className="misa-label">Thành phẩm</label>
                            <select className="misa-input" value={bomForm.productId} onChange={(event) => setBomField('productId', event.target.value)}>
                                <option value="">Chọn thành phẩm</option>
                                {products.filter(p => p.productType === 'Thành phẩm').map((product) => (
                                    <option key={product.id} value={product.id}>{product.productCode} - {product.productName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                            <label className="misa-label">Mã BOM</label>
                            <input className="misa-input" value={bomForm.bomCode} onChange={(event) => setBomField('bomCode', event.target.value)} placeholder="Để trống để tự sinh mã" />
                        </div>
                    </div>
                    <div className="misa-form-row" style={{ marginTop: '16px' }}>
                        <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                            <label className="misa-label">Tên BOM</label>
                            <input className="misa-input" value={bomForm.bomName} onChange={(event) => setBomField('bomName', event.target.value)} placeholder="Ví dụ: Cấu hình PC văn phòng" />
                        </div>
                        <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                            <label className="misa-label">Phiên bản</label>
                            <input className="misa-input" inputMode="decimal" type="number" min="0.01" step="0.01" value={bomForm.versionNo} onChange={(event) => setBomField('versionNo', event.target.value)} />
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                        <button className="btn-misa-cancel" type="button" onClick={addBomLine} style={{ padding: '6px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <i className="bi bi-plus"></i> Thêm linh kiện
                        </button>
                    </div>

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#f9fafb', fontSize: '12px', color: '#6b7280' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', width: '35%' }}>SKU LINH KIỆN</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', width: '20%' }}>ĐỊNH MỨC</th>
                                    <th style={{ padding: '12px 16px', fontWeight: '600', width: '35%' }}>GHI CHÚ</th>
                                    <th style={{ padding: '12px 16px', width: '10%', textAlign: 'center' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {bomForm.lines.map((line, index) => (
                                    <tr key={index} style={{ borderTop: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <select className="misa-input" style={{ height: '36px' }} value={line.componentVariantId} onChange={(event) => setBomLineField(index, 'componentVariantId', event.target.value)}>
                                                <option value="">Chọn SKU</option>
                                                {variants.map((variant) => (
                                                    <option key={variant.id} value={variant.id}>{variant.sku} - {variant.productName} / {variant.variantName}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input className="misa-input" style={{ height: '36px' }} inputMode="numeric" type="number" min="1" step="1" value={line.quantity} onChange={(event) => setBomLineField(index, 'quantity', event.target.value)} />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input className="misa-input" style={{ height: '36px' }} value={line.note} onChange={(event) => setBomLineField(index, 'note', event.target.value)} placeholder="Ghi chú dòng" />
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button type="button" onClick={() => removeBomLine(index)} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button className="btn-misa-cancel" type="button" onClick={() => setShowBomModal(false)} style={{ padding: '8px 24px', fontWeight: '600' }}>Hủy</button>
                        <button className="btn-misa-post" type="button" onClick={saveQuickBom} disabled={savingBom} style={{ padding: '8px 24px', fontWeight: '600', backgroundColor: '#0070cc' }}>
                            <i className="bi bi-download"></i>
                            {savingBom ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
}

function FlowPanel({ tone, title, icon, items, emptyText }) {
    const isLoss = tone === 'loss';
    return (
        <div style={{ 
            border: `1px solid ${isLoss ? '#fecaca' : '#bbf7d0'}`, 
            borderRadius: '8px', 
            overflow: 'hidden',
            backgroundColor: '#ffffff'
        }}>
            <div style={{ 
                padding: '12px 16px', 
                backgroundColor: isLoss ? '#fef2f2' : '#f0fdf4',
                color: isLoss ? '#991b1b' : '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                borderBottom: `1px solid ${isLoss ? '#fecaca' : '#bbf7d0'}`
            }}>
                <i className={`bi ${icon}`}></i>
                <span>{title}</span>
            </div>
            <div style={{ padding: '0' }}>
                {items.length > 0 ? items.map((item, index) => (
                    <div key={`${item.sku || item.name}-${index}`} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderBottom: index < items.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}>
                        <div>
                            <div style={{ fontWeight: 500, color: 'var(--color-text)', fontSize: '14px' }}>{item.name || 'Chưa có tên hàng'}</div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px' }}>{item.sku || 'Chưa có mã SKU'}</div>
                        </div>
                        <div style={{ 
                            fontWeight: 600, 
                            fontSize: '15px',
                            color: isLoss ? '#dc2626' : '#16a34a' 
                        }}>
                            {isLoss ? '-' : '+'}{Number(item.quantity || 0).toLocaleString('vi-VN')} {item.unitName || ''}
                        </div>
                    </div>
                )) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted-2)', fontStyle: 'italic', fontSize: '13px' }}>
                        {emptyText}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AssemblyOrderFormPage;
