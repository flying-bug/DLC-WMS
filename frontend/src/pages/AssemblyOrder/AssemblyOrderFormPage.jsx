import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as assemblyApi from '../../api/assemblyOrderApi';
import * as warehouseApi from '../../api/warehouseApi';
import axiosClient from '../../api/axiosClient';
import styles from './AssemblyOrderPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    SUBMITTED: { label: 'Chờ duyệt', tone: 'warning' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    POSTED: { label: 'Đã ghi sổ', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' }
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
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editing = Boolean(id);
    const [boms, setBoms] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingBom, setSavingBom] = useState(false);
    const [showBomModal, setShowBomModal] = useState(false);
    const [bomForm, setBomForm] = useState(createDefaultBomForm);
    const [bomError, setBomError] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [orderDetail, setOrderDetail] = useState(null);
    const [form, setForm] = useState({
        orderType: searchParams.get('type') === 'DISASSEMBLY' ? 'DISASSEMBLY' : 'ASSEMBLY',
        orderCode: '',
        bomId: '',
        warehouseId: '',
        quantity: '1',
        status: 'DRAFT',
        executionDate: today(),
        note: ''
    });

    const selectedBom = useMemo(() => boms.find((bom) => String(bom.id) === String(form.bomId)), [boms, form.bomId]);
    const canEdit = !editing || ['DRAFT', 'SUBMITTED'].includes(form.status);
    const status = STATUS_META[form.status] || { label: form.status || 'Chưa rõ', tone: 'info' };

    const loadBaseData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [bomResponse, warehouseResponse] = await Promise.all([
                assemblyApi.getAssemblyBoms({ status: 'APPROVED' }),
                warehouseApi.getWarehouses({ page: 0, size: 200 })
            ]);
            setBoms(listFrom(unwrap(bomResponse)));
            setWarehouses(listFrom(unwrap(warehouseResponse)));
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được dữ liệu BOM/kho.');
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
        setError('');
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
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được chi tiết lệnh.');
        } finally {
            setLoading(false);
        }
    }, [editing, id]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadBaseData();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadBaseData]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadBomLookups();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadBomLookups]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadOrder();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadOrder]);

    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setSuccess('');
    };

    const buildPayload = () => ({
        orderCode: form.orderCode || null,
        bomId: Number(form.bomId),
        warehouseId: Number(form.warehouseId),
        quantity: Number(form.quantity),
        status: form.status,
        executionDate: form.executionDate,
        note: form.note || null,
        createdBy: Number(localStorage.getItem('userId') || 1)
    });

    const validate = () => {
        if (!form.bomId) return 'Vui lòng chọn BOM.';
        if (!form.warehouseId) return 'Vui lòng chọn kho thực hiện.';
        if (!form.quantity || Number(form.quantity) <= 0) return 'Số lượng phải lớn hơn 0.';
        if (!form.executionDate) return 'Vui lòng chọn ngày thực hiện.';
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationMessage = validate();
        if (validationMessage) {
            setError(validationMessage);
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const payload = buildPayload();
            const response = editing
                ? await assemblyApi.updateAssemblyOrder(id, payload)
                : form.orderType === 'DISASSEMBLY'
                    ? await assemblyApi.createDisassemblyOrder(payload)
                    : await assemblyApi.createAssemblyOrder(payload);
            const saved = unwrap(response);
            setSuccess(editing ? 'Cập nhật lệnh thành công.' : 'Tạo lệnh thành công.');
            if (!editing && saved?.id) {
                navigate(`/assembly-orders/${saved.id}`);
            }
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không lưu được lệnh lắp ráp/tháo dỡ.');
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
            setSuccess('Đã tạo BOM nhanh và chọn vào lệnh.');
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
            <form className={styles.page} onSubmit={handleSubmit}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>{editing ? 'Chi tiết lệnh lắp ráp / tháo dỡ' : 'Tạo lệnh lắp ráp / tháo dỡ'}</h1>
                        <p className={styles.pageSubtitle}>{editing ? 'Cập nhật thông tin lệnh khi còn ở trạng thái nháp hoặc chờ duyệt.' : 'Chọn BOM, kho và số lượng để hệ thống tính danh sách linh kiện.'}</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => navigate('/assembly-orders')}>Quay lại</button>
                        {canEdit && (
                            <button className={styles.primaryButton} type="submit" disabled={saving}>
                                <i className="bi bi-save"></i>
                                {saving ? 'Đang lưu...' : 'Lưu lệnh'}
                            </button>
                        )}
                    </div>
                </div>

                {editing && (
                    <div className={styles.detailGrid}>
                        <div className={styles.detailItem}><span>Mã lệnh</span><strong>{form.orderCode}</strong></div>
                        <div className={styles.detailItem}><span>Loại lệnh</span><strong>{form.orderType === 'DISASSEMBLY' ? 'Tháo dỡ' : 'Lắp ráp'}</strong></div>
                        <div className={styles.detailItem}><span>Trạng thái</span><strong><span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span></strong></div>
                        <div className={styles.detailItem}><span>Quyền cập nhật</span><strong>{canEdit ? 'Cho phép' : 'Đã khóa'}</strong></div>
                        <div className={styles.detailItem}><span>Ngày tạo</span><strong>{orderDetail?.createdAt ? new Date(orderDetail.createdAt).toLocaleString('vi-VN') : 'Chưa có'}</strong></div>
                        <div className={styles.detailItem}><span>Người tạo</span><strong>{orderDetail?.createdBy ? `ID: ${orderDetail.createdBy}` : 'Hệ thống'}</strong></div>
                    </div>
                )}

                {error && <div className={styles.errorBox}>{error}</div>}
                {success && <div className={styles.successBox}>{success}</div>}

                <div className={styles.formPanel}>
                    <div className={styles.formGrid}>
                        {!editing && (
                            <label className={styles.field}>
                                <span>Loại lệnh</span>
                                <select value={form.orderType} onChange={(event) => setField('orderType', event.target.value)} disabled={loading}>
                                    <option value="ASSEMBLY">Lắp ráp</option>
                                    <option value="DISASSEMBLY">Tháo dỡ</option>
                                </select>
                            </label>
                        )}
                        <label className={styles.field}>
                            <span>Mã lệnh</span>
                            <input value={form.orderCode} onChange={(event) => setField('orderCode', event.target.value)} placeholder="Để trống để tự sinh mã" disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>BOM</span>
                            <div className={styles.inlineField}>
                                <select value={form.bomId} onChange={(event) => setField('bomId', event.target.value)} disabled={!canEdit || loading}>
                                    <option value="">{loading ? 'Đang tải BOM...' : 'Chọn BOM đã duyệt'}</option>
                                    {boms.map((bom) => <option key={bom.id} value={bom.id}>{bom.bomCode} - {bom.bomName}</option>)}
                                </select>
                                <button className={styles.secondaryButton} type="button" onClick={openBomModal} disabled={!canEdit}>
                                    <i className="bi bi-plus-lg"></i>
                                    Tạo nhanh
                                </button>
                            </div>
                        </label>
                        <label className={styles.field}>
                            <span>Kho</span>
                            <select value={form.warehouseId} onChange={(event) => setField('warehouseId', event.target.value)} disabled={!canEdit || loading}>
                                <option value="">Chọn kho</option>
                                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.warehouseName}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Số lượng</span>
                            <input className={styles.numberInput} inputMode="decimal" type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>Ngày thực hiện</span>
                            <input type="date" value={form.executionDate} onChange={(event) => setField('executionDate', event.target.value)} disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={form.status} onChange={(event) => setField('status', event.target.value)} disabled={!canEdit}>
                                <option value="DRAFT">Nháp</option>
                                <option value="SUBMITTED">Chờ duyệt</option>
                            </select>
                        </label>
                        <label className={`${styles.field} ${styles.full}`}>
                            <span>Ghi chú</span>
                            <textarea value={form.note} onChange={(event) => setField('note', event.target.value)} disabled={!canEdit} placeholder="Ghi chú nội bộ cho lệnh" />
                        </label>
                    </div>
                </div>

                <div className={styles.detailGrid}>
                    <div className={styles.detailItem}><span>Thành phẩm</span><strong>{selectedBom?.productName || 'Chưa chọn BOM'}</strong></div>
                    <div className={styles.detailItem}><span>Mã BOM</span><strong>{selectedBom?.bomCode || 'Chưa chọn'}</strong></div>
                    <div className={styles.detailItem}><span>Phiên bản</span><strong>{selectedBom?.versionNo || 'Chưa có'}</strong></div>
                    <div className={styles.detailItem}><span>Số linh kiện</span><strong>{previewLines.length}</strong></div>
                </div>

                <div className={styles.flowGrid}>
                    <FlowPanel
                        tone="loss"
                        title="Bị trừ khỏi kho"
                        icon="bi-dash-lg"
                        emptyText={loading ? 'Đang tải BOM...' : 'Chọn BOM để xem hàng bị trừ.'}
                        items={lossItems}
                    />
                    <FlowPanel
                        tone="gain"
                        title="Được cộng vào kho"
                        icon="bi-plus-lg"
                        emptyText={loading ? 'Đang tải BOM...' : 'Chọn BOM để xem hàng được cộng.'}
                        items={gainItems}
                    />
                </div>

                {showBomModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>Tạo nhanh BOM</h2>
                                <button className={styles.iconButton} type="button" title="Đóng" onClick={() => setShowBomModal(false)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            <div className={styles.modalBody}>
                                {bomError && <div className={styles.errorBox}>{bomError}</div>}

                                <div className={styles.formGrid}>
                                    <label className={styles.field}>
                                        <span>Thành phẩm</span>
                                        <select value={bomForm.productId} onChange={(event) => setBomField('productId', event.target.value)}>
                                            <option value="">Chọn thành phẩm</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>{product.productCode} - {product.productName}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>Mã BOM</span>
                                        <input value={bomForm.bomCode} onChange={(event) => setBomField('bomCode', event.target.value)} placeholder="Để trống để tự sinh mã" />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Tên BOM</span>
                                        <input value={bomForm.bomName} onChange={(event) => setBomField('bomName', event.target.value)} placeholder="Ví dụ: Cấu hình PC văn phòng" />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Phiên bản</span>
                                        <input className={styles.numberInput} inputMode="decimal" type="number" min="0.01" step="0.01" value={bomForm.versionNo} onChange={(event) => setBomField('versionNo', event.target.value)} />
                                    </label>
                                </div>

                                <div className={styles.lineActions}>
                                    <button className={styles.secondaryButton} type="button" onClick={addBomLine}>
                                        <i className="bi bi-plus-lg"></i>
                                        Thêm linh kiện
                                    </button>
                                </div>

                                <div className={styles.tablePanel}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>SKU linh kiện</th>
                                                <th>Định mức</th>
                                                <th>Ghi chú</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bomForm.lines.map((line, index) => (
                                                <tr key={`${index}-${line.componentVariantId}`}>
                                                    <td>
                                                        <select value={line.componentVariantId} onChange={(event) => setBomLineField(index, 'componentVariantId', event.target.value)}>
                                                            <option value="">Chọn SKU</option>
                                                            {variants.map((variant) => (
                                                                <option key={variant.id} value={variant.id}>{variant.sku} - {variant.productName} / {variant.variantName}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input className={styles.numberInput} inputMode="numeric" type="number" min="1" step="1" value={line.quantity} onChange={(event) => setBomLineField(index, 'quantity', event.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input value={line.note} onChange={(event) => setBomLineField(index, 'note', event.target.value)} placeholder="Ghi chú dòng" />
                                                    </td>
                                                    <td>
                                                        <button className={styles.deleteButton} type="button" title="Xóa dòng" onClick={() => removeBomLine(index)}>
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button className={styles.secondaryButton} type="button" onClick={() => setShowBomModal(false)}>Hủy</button>
                                <button className={styles.primaryButton} type="button" onClick={saveQuickBom} disabled={savingBom}>
                                    <i className="bi bi-save"></i>
                                    {savingBom ? 'Đang cất...' : 'Cất và chọn'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </AdminLayout>
    );
}

function FlowPanel({ tone, title, icon, items, emptyText }) {
    const isLoss = tone === 'loss';
    return (
        <div className={`${styles.flowPanel} ${isLoss ? styles.lossPanel : styles.gainPanel}`}>
            <div className={`${styles.flowPanelHeader} ${isLoss ? styles.lossHeader : styles.gainHeader}`}>
                <i className={`bi ${icon}`}></i>
                <span>{title}</span>
            </div>
            <div className={styles.flowList}>
                {items.length > 0 ? items.map((item, index) => (
                    <div className={styles.flowRow} key={`${item.sku || item.name}-${index}`}>
                        <div className={styles.flowName}>
                            <strong>{item.name || 'Chưa có tên hàng'}</strong>
                            <span className={styles.flowSku}>{item.sku || 'Chưa có mã'}</span>
                        </div>
                        <div className={`${styles.flowQty} ${isLoss ? styles.lossQty : styles.gainQty}`}>
                            {isLoss ? '-' : '+'}{Number(item.quantity || 0).toLocaleString('vi-VN')} {item.unitName || ''}
                        </div>
                    </div>
                )) : (
                    <div className={styles.emptyCell}>{emptyText}</div>
                )}
            </div>
        </div>
    );
}

export default AssemblyOrderFormPage;
