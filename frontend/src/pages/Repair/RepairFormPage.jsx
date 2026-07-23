import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import * as repairApi from '../../api/repairApi';
import * as customerApi from '../../api/customerApi';
import axiosClient from '../../api/axiosClient';
import CustomerModal from '../Customer/components/CustomerModal';
import QuickProductModal from './components/QuickProductModal';
import odooStyles from './OdooStyle.module.css';

/* ─── Select styles ─────────────────────────────────────────────── */
const selectStyles = {
    control: (base, state) => ({
        ...base, minHeight: '32px', height: '32px', fontSize: '13px',
        borderColor: state.isFocused ? '#017e84' : '#d1d5db',
        boxShadow: state.isFocused ? '0 0 0 1px #017e84' : 'none',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        borderRadius: 0, backgroundColor: 'transparent',
        '&:hover': { borderColor: state.isFocused ? '#017e84' : '#9ca3af' }
    }),
    valueContainer: (base) => ({ ...base, height: '32px', padding: '0' }),
    input: (base) => ({ ...base, margin: '0', padding: '0' }),
    indicatorSeparator: () => ({ display: 'none' }),
    indicatorsContainer: (base) => ({ ...base, height: '30px' }),
    menu: (base) => ({ ...base, fontSize: '13px', zIndex: 9999 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 })
};

/* ─── Constants ─────────────────────────────────────────────────── */
const STAGES = ['DRAFT', 'CONFIRMED', 'UNDER_REPAIR', 'DONE'];
const STAGE_LABELS = {
    DRAFT: 'Nháp', QUOTATION: 'Báo giá', CONFIRMED: 'Xác nhận',
    UNDER_REPAIR: 'Đang sửa', DONE: 'Hoàn tất'
};
const EDITABLE_STATUSES = ['DRAFT', 'QUOTATION'];

/* ─── Inline Row Component ──────────────────────────────────────── */
/**
 * Một dòng "mới đang nhập" trong bảng inline.
 * type: 'PART' | 'FEE'
 */
function NewInlineRow({ type, variants, onSave, onCancel, underWarranty, onQuickAdd }) {
    const [form, setForm] = useState(
        type === 'PART'
            ? { actionType: 'ADD', componentVariantId: '', quantity: 1, unitPrice: 0, isFreeWarranty: underWarranty || false, note: '' }
            : { feeName: '', feeAmount: 0, isFreeWarranty: underWarranty || false, note: '' }
    );

    const isFree = form.isFreeWarranty;

    if (type === 'PART') return (
        <tr style={{ background: '#f0fdf4' }}>
            <td>
                <select className="form-select form-select-sm" value={form.actionType}
                    onChange={e => setForm({ ...form, actionType: e.target.value })}
                    style={{ fontSize: '12px', padding: '2px 4px' }}>
                    <option value="ADD">Lắp thêm (ADD)</option>
                    <option value="REMOVE">Thu hồi (REMOVE)</option>
                </select>
            </td>
            <td>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ flex: 1 }}>
                        <Select options={variants}
                            onChange={opt => setForm({ ...form, componentVariantId: opt ? opt.value : '' })}
                            placeholder="Chọn sản phẩm/linh kiện..."
                            isClearable styles={selectStyles} menuPortalTarget={document.body}
                            noOptionsMessage={() => 'Không tìm thấy'} />
                    </div>
                    {onQuickAdd && (
                        <button type="button" onClick={() => onQuickAdd('Hàng hóa')}
                            style={{ width: '32px', height: '32px', border: '1px solid #ced4da', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            title="Thêm nhanh linh kiện">
                            <i className="bi bi-plus" style={{ fontSize: '18px', color: '#017e84' }}></i>
                        </button>
                    )}
                </div>
            </td>
            <td>
                <input type="number" className="form-control form-control-sm" min="1" value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    style={{ width: '80px', fontSize: '12px' }} />
            </td>
            <td>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {variants.find(v => v.value === form.componentVariantId)?.unitName || '—'}
                </span>
            </td>
            <td>
                <input type="number" className="form-control form-control-sm" value={isFree ? 0 : form.unitPrice}
                    disabled={isFree}
                    onChange={e => setForm({ ...form, unitPrice: e.target.value })}
                    style={{ width: '110px', fontSize: '12px' }} />
            </td>
            <td style={{ textAlign: 'center' }}>
                <input type="checkbox" checked={form.isFreeWarranty}
                    onChange={e => setForm({ ...form, isFreeWarranty: e.target.checked, unitPrice: e.target.checked ? 0 : form.unitPrice })} />
            </td>
            <td>
                <input type="text" className="form-control form-control-sm" value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="Ghi chú..." style={{ fontSize: '12px' }} />
            </td>
            <td>
                <button className="btn btn-sm btn-success me-1" onClick={() => onSave(form)} title="Lưu dòng">
                    <i className="bi bi-check-lg"></i>
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onCancel} title="Hủy">
                    <i className="bi bi-x-lg"></i>
                </button>
            </td>
        </tr>
    );

    return (
        <tr style={{ background: '#eff6ff' }}>
            <td colSpan="2">
                <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ flex: 1 }}>
                        <Select options={variants}
                            onChange={opt => setForm({ 
                                ...form, 
                                feeName: opt ? opt.productName : '', 
                                unitPrice: opt ? opt.salePrice : 0,
                                quantity: 1,
                                unitName: opt ? opt.unitName : '',
                                feeAmount: opt ? opt.salePrice : 0, 
                                isFreeWarranty: false 
                            })}
                            placeholder="Chọn dịch vụ..."
                            isClearable styles={selectStyles} menuPortalTarget={document.body}
                            noOptionsMessage={() => 'Không tìm thấy'} />
                    </div>
                    {onQuickAdd && (
                        <button type="button" onClick={() => onQuickAdd('Dịch vụ')}
                            style={{ width: '32px', height: '32px', border: '1px solid #ced4da', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            title="Thêm nhanh dịch vụ">
                            <i className="bi bi-plus" style={{ fontSize: '18px', color: '#017e84' }}></i>
                        </button>
                    )}
                </div>
            </td>
            <td>
                <input type="number" className="form-control form-control-sm" min="1" value={form.quantity || 1}
                    onChange={e => {
                        const q = e.target.value;
                        setForm({ ...form, quantity: q, feeAmount: q * (form.unitPrice || 0) });
                    }}
                    style={{ width: '80px', fontSize: '12px' }} />
            </td>
            <td style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {form.unitName || '—'}
                </span>
            </td>
            <td>
                <input type="number" className="form-control form-control-sm" value={isFree ? 0 : form.feeAmount}
                    disabled={isFree}
                    onChange={e => {
                        const amt = e.target.value;
                        setForm({ ...form, feeAmount: amt, unitPrice: (form.quantity > 0 ? amt / form.quantity : 0) });
                    }}
                    style={{ width: '110px', fontSize: '12px' }} />
            </td>
            <td style={{ textAlign: 'center' }}>
                <input type="checkbox" checked={form.isFreeWarranty}
                    onChange={e => setForm({ ...form, isFreeWarranty: e.target.checked, feeAmount: e.target.checked ? 0 : (form.quantity * (form.unitPrice || 0)) })} />
            </td>
            <td>
                <input type="text" className="form-control form-control-sm" value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="Ghi chú..." style={{ fontSize: '12px' }} />
            </td>
            <td>
                <button className="btn btn-sm btn-success me-1" onClick={() => onSave(form)} title="Lưu dòng">
                    <i className="bi bi-check-lg"></i>
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onCancel} title="Hủy">
                    <i className="bi bi-x-lg"></i>
                </button>
            </td>
        </tr>
    );
}

/* ─── Main Component ─────────────────────────────────────────────── */
function RepairFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id;

    const [repair, setRepair] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        repairCode: '', partnerId: '', productId: '', serialNumberId: '',
        issueDescription: '', solutionDescription: '',
        underWarranty: false, invoiceMethod: 'after_repair',
        receivedDate: '', expectedDate: ''
    });

    // Code validation
    const [codeError, setCodeError] = useState('');
    const [codeChecking, setCodeChecking] = useState(false);
    const codeCheckTimer = useRef(null);

    // Data sources
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    // variantOptions: dùng cho dropdown linh kiện trong bảng vì DB yêu cầu componentVariantId
    const [variantOptions, setVariantOptions] = useState([]);
    const [currentUserInfo, setCurrentUserInfo] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // Inline editing state
    const [addingType, setAddingType] = useState(null); // 'PART' | 'FEE' | null
    const [showQuickProductModal, setShowQuickProductModal] = useState(false);
    const [quickProductType, setQuickProductType] = useState('Thành phẩm');
    // For isNew: pending items before save
    const [pendingLines, setPendingLines] = useState([]);
    const [pendingFees, setPendingFees] = useState([]);

    /* ── Loaders ─────────────────────────────────────────── */
    const loadRepair = useCallback(async () => {
        if (isNew) return;
        setLoading(true);
        try {
            const res = await repairApi.getRepairById(id);
            const data = res.data?.data;
            setRepair(data);
            setFormData({
                repairCode: data.repairCode || '',
                partnerId: data.partnerId || '',
                productId: data.productId || '',
                warehouseId: data.warehouseId || '',
                serialNumberId: data.serialNumberId || '',
                issueDescription: data.issueDescription || '',
                solutionDescription: data.solutionDescription || '',
                underWarranty: data.underWarranty || false,
                invoiceMethod: data.invoiceMethod || 'after_repair',
                receivedDate: data.receivedDate || '',
                expectedDate: data.expectedDate || ''
            });
        } catch (err) {
            console.error(err);
            alert('Lỗi tải thông tin lệnh sửa chữa');
        } finally {
            setLoading(false);
        }
    }, [id, isNew]);

    const loadCustomers = useCallback(async () => {
        try {
            const res = await customerApi.searchCustomers('', '', '', 0, 200);
            setCustomers(res.data?.data?.content || res.data?.content || []);
        } catch (e) { console.error(e); }
    }, []);

    const loadProducts = useCallback(async () => {
        try {
            const res = await axiosClient.get('/products?size=1000');
            const content = res.data?.data?.content || res.data?.content || [];
            setProducts(content);
        } catch (e) { console.error(e); }
    }, []);

    const loadWarehouses = useCallback(async () => {
        try {
            const res = await axiosClient.get('/warehouses?size=1000');
            const content = res.data?.data?.content || res.data?.content || [];
            const activeWarehouses = content.filter(w => w.status === 'APPROVED' && w.code !== 'SCRAP');
            setWarehouses(activeWarehouses);
        } catch (e) { console.error(e); }
    }, []);

    const loadVariants = useCallback(async () => {
        try {
            const res = await axiosClient.get('/products/variants?size=2000');
            const content = res.data?.data?.content || res.data?.content || [];
            setVariantOptions(content.map(v => ({
                value: v.id,
                label: [v.sku, v.productName, v.variantName].filter(Boolean).join(' - '),
                productType: v.productType,
                salePrice: v.salePrice,
                productName: v.productName,
                unitName: v.unitName
            })));
        } catch (e) { console.error(e); }
    }, []);

    const loadCurrentUser = useCallback(async () => {
        try {
            const res = await axiosClient.get('/users/me');
            setCurrentUserInfo(res.data?.data || null);
        } catch (e) { console.error(e); }
    }, []);

    /* ── Initial code generation for new form ─── */
    useEffect(() => {
        if (isNew && !formData.repairCode) {
            // Hiển thị placeholder SC-XXXXX — backend sẽ tạo mã thật khi lưu nếu mã trống
            // Hoặc ta gọi check-code để sinh mã hợp lệ
            axiosClient.get('/repairs', { params: { page: 0, size: 1 } })
                .then(res => {
                    const total = res.data?.data?.totalElements || 0;
                    const nextNum = total + 1;
                    setFormData(prev => ({ ...prev, repairCode: `SC-${String(nextNum).padStart(5, '0')}` }));
                })
                .catch(() => {
                    setFormData(prev => ({ ...prev, repairCode: 'SC-00001' }));
                });
        }
    }, [isNew]);

    useEffect(() => {
        loadRepair();
        loadCustomers();
        loadProducts();
        loadWarehouses();
        loadVariants();
        if (isNew) loadCurrentUser();
    }, [loadRepair, loadCustomers, loadProducts, loadVariants, loadCurrentUser, isNew]);

    /* ── Code check debounce (chỉ báo lỗi khi trùng, không hiện "hợp lệ") ── */
    const handleCodeChange = (value) => {
        setFormData(prev => ({ ...prev, repairCode: value }));
        setCodeError('');
        if (codeCheckTimer.current) clearTimeout(codeCheckTimer.current);
        if (!value.trim()) return;
        setCodeChecking(true);
        codeCheckTimer.current = setTimeout(async () => {
            try {
                const res = await repairApi.checkRepairCode(value.trim());
                const exists = res.data?.data?.exists;
                if (exists) setCodeError('Mã phiếu sửa chữa đã trùng. Vui lòng thay đổi mã khác.');
                // Không hiện thông báo "hợp lệ" — check ngầm
            } catch (e) {
                console.error(e);
            } finally {
                setCodeChecking(false);
            }
        }, 500);
    };

    /* ── Save ────────────────────────────────────── */
    const handleSave = async () => {
        if (codeError) { alert('Mã lệnh bị trùng. Vui lòng sửa lại mã.'); return; }
        if (!formData.partnerId) { alert('Vui lòng chọn Khách hàng.'); return; }
        if (!formData.productId) { alert('Vui lòng chọn Sản phẩm cần sửa.'); return; }

        setSaving(true);
        try {
            const payload = {
                repairCode: formData.repairCode || undefined,
                partnerId: Number(formData.partnerId),
                productId: Number(formData.productId),
                warehouseId: formData.warehouseId ? Number(formData.warehouseId) : null,
                serialNumberId: formData.serialNumberId ? Number(formData.serialNumberId) : null,
                issueDescription: formData.issueDescription || null,
                solutionDescription: formData.solutionDescription || null,
                underWarranty: formData.underWarranty,
                invoiceMethod: formData.invoiceMethod,
                receivedDate: formData.receivedDate || null,
                expectedDate: formData.expectedDate || null
            };

            if (isNew) {
                const res = await repairApi.createRepair(payload);
                const newId = res.data?.data?.id;
                // Gọi API tuần tự cho các dòng pending
                for (const line of pendingLines) {
                    await repairApi.addRepairLine(newId, {
                        actionType: line.actionType,
                        componentVariantId: Number(line.componentVariantId),
                        quantity: Number(line.quantity),
                        unitPrice: Number(line.unitPrice),
                        isFreeWarranty: line.isFreeWarranty,
                        note: line.note || null
                    });
                }
                for (const fee of pendingFees) {
                    await repairApi.addRepairFee(newId, {
                        feeName: fee.feeName,
                        feeAmount: Number(fee.feeAmount),
                        isFreeWarranty: fee.isFreeWarranty,
                        note: fee.note || null
                    });
                }
                setPendingLines([]);
                setPendingFees([]);
                navigate(`/repairs/${newId}`, { replace: true });
            } else {
                await repairApi.updateRepair(id, payload);
                await loadRepair();
                alert('Đã lưu thành công!');
            }
        } catch (err) {
            alert('Lưu thất bại: ' + (err.response?.data?.userMessage || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleStatusTransition = async (targetStatus) => {
        if (!window.confirm(`Xác nhận chuyển trạng thái sang "${STAGE_LABELS[targetStatus] || targetStatus}"?`)) return;
        try {
            await repairApi.updateRepairStatus(id, { status: targetStatus });
            await loadRepair();
        } catch (err) {
            alert('Lỗi chuyển trạng thái: ' + (err.response?.data?.userMessage || err.message));
        }
    };

    /* ── Inline save handlers ────────────────────── */
    const handleSaveLine = async (form) => {
        if (!form.componentVariantId) { alert('Vui lòng chọn sản phẩm/linh kiện.'); return; }
        const linePayload = {
            actionType: form.actionType,
            componentVariantId: Number(form.componentVariantId),
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
            isFreeWarranty: form.isFreeWarranty,
            note: form.note || null
        };
        if (isNew) {
            // Lưu tạm — dùng variantOptions để tìm nhãn
            const variant = variantOptions.find(p => p.value === form.componentVariantId);
            const variantLabel = variant?.label || `ID: ${form.componentVariantId}`;
            setPendingLines(prev => [...prev, { ...linePayload, _label: variantLabel, _unitName: variant?.unitName, _key: Date.now() }]);
            setAddingType(null);
        } else {
            try {
                await repairApi.addRepairLine(id, linePayload);
                setAddingType(null);
                await loadRepair();
            } catch (err) {
                alert(err.response?.data?.userMessage || 'Có lỗi xảy ra khi thêm linh kiện');
            }
        }
    };

    const handleSaveFee = async (form) => {
        if (!form.feeName) { alert('Vui lòng nhập tên phí.'); return; }
        const feePayload = {
            feeName: form.feeName.trim(),
            feeAmount: Number(form.feeAmount),
            quantity: Number(form.quantity || 1),
            unitName: form.unitName || null,
            isFreeWarranty: form.isFreeWarranty,
            note: form.note || null
        };
        if (isNew) {
            setPendingFees(prev => [...prev, { ...feePayload, _key: Date.now() }]);
            setAddingType(null);
        } else {
            try {
                await repairApi.addRepairFee(id, feePayload);
                setAddingType(null);
                await loadRepair();
            } catch (err) {
                alert(err.response?.data?.userMessage || 'Có lỗi xảy ra khi thêm phí');
            }
        }
    };

    const handleDeleteLine = async (lineId) => {
        if (!window.confirm('Xóa dòng linh kiện này?')) return;
        try {
            await repairApi.deleteRepairLine(id, lineId);
            await loadRepair();
        } catch (err) {
            alert(err.response?.data?.userMessage || 'Lỗi xóa linh kiện');
        }
    };

    const handleDeleteFee = async (feeId) => {
        if (!window.confirm('Xóa dòng phí dịch vụ này?')) return;
        try {
            await repairApi.deleteRepairFee(id, feeId);
            await loadRepair();
        } catch (err) {
            alert(err.response?.data?.userMessage || 'Lỗi xóa phí');
        }
    };

    /* ── Computed ────────────────────────────────── */
    // Khi isNew, currentStatus luôn là DRAFT để pipeline hiển thị đúng
    const currentStatus = repair?.repairStatus || 'DRAFT';
    const isEditable = isNew || EDITABLE_STATUSES.includes(currentStatus);

    const lines = repair?.lines || [];
    const fees = repair?.fees || [];

    /* ── Pipeline ────────────────────────────────── */
    const renderPipeline = () => {
        let effectiveStatus = currentStatus;
        if (currentStatus === 'QUOTATION') effectiveStatus = 'DRAFT';
        if (currentStatus === 'CANCELLED') effectiveStatus = 'CANCELLED';
        const currentIndex = STAGES.indexOf(effectiveStatus);
        return (
            <div className={odooStyles.pipeline}>
                {STAGES.map((stage, idx) => {
                    let cls = odooStyles.pipelineStage;
                    if (stage === effectiveStatus) cls += ` ${odooStyles.active}`;
                    else if (idx < currentIndex) cls += ` ${odooStyles.past}`;
                    return <div key={stage} className={cls}>{STAGE_LABELS[stage]}</div>;
                })}
                {currentStatus === 'CANCELLED' && (
                    <div className={odooStyles.pipelineStage} style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
                        Đã hủy
                    </div>
                )}
            </div>
        );
    };

    /* ─────────────────────────── RENDER ─────────── */
    return (
        <AdminLayout>
            <div className={odooStyles.odooLayout}>
                {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    <i className="bi bi-arrow-repeat me-2"></i>Đang tải...
                </div>}

                {/* Status Bar */}
                <div className={odooStyles.odooStatusBar}>
                    <div className={odooStyles.odooActions}>
                        {isEditable && (
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !!codeError}>
                                {saving ? <><i className="bi bi-hourglass-split me-1"></i>Đang lưu...</> : (isNew ? 'Lưu mới' : 'Lưu')}
                            </button>
                        )}

                        {/* Workflow buttons */}
                        {!isNew && currentStatus === 'DRAFT' && (
                            <>
                                <button className="btn btn-secondary" onClick={() => handleStatusTransition('CONFIRMED')}>
                                    <i className="bi bi-check-circle me-1"></i>Xác nhận Lệnh
                                </button>
                                <button className="btn btn-outline-secondary" onClick={() => handleStatusTransition('QUOTATION')}>
                                    <i className="bi bi-send me-1"></i>Gửi báo giá
                                </button>
                            </>
                        )}
                        {!isNew && currentStatus === 'QUOTATION' && (
                            <button className="btn btn-secondary" onClick={() => handleStatusTransition('CONFIRMED')}>
                                <i className="bi bi-check-circle me-1"></i>Xác nhận Lệnh
                            </button>
                        )}
                        {!isNew && currentStatus === 'CONFIRMED' && (
                            <button className="btn btn-warning text-white" onClick={() => handleStatusTransition('UNDER_REPAIR')}>
                                <i className="bi bi-tools me-1"></i>Bắt đầu sửa
                            </button>
                        )}
                        {!isNew && currentStatus === 'UNDER_REPAIR' && (
                            <button className="btn btn-success" onClick={() => handleStatusTransition('DONE')}>
                                <i className="bi bi-check2-all me-1"></i>Hoàn tất
                            </button>
                        )}
                        {!isNew && !['DONE', 'CANCELLED'].includes(currentStatus) && (
                            <button className="btn btn-outline-danger" onClick={() => handleStatusTransition('CANCELLED')}>
                                <i className="bi bi-x-circle me-1"></i>Hủy lệnh
                            </button>
                        )}

                        {!isNew && ['CONFIRMED', 'UNDER_REPAIR', 'DONE'].includes(currentStatus) && (
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', paddingLeft: '24px' }}>
                                <button className="btn btn-outline-info" onClick={() => navigate('/export-slips', { state: { filterDocCode: 'REP-EX-' + repair.repairCode } })}>
                                    <i className="bi bi-box-arrow-up-right me-1"></i>Phiếu xuất kho
                                </button>
                                <button className="btn btn-outline-info" onClick={() => navigate('/import-history', { state: { filterDocCode: 'REP-SCRAP-' + repair.repairCode } })}>
                                    <i className="bi bi-box-arrow-in-down-left me-1"></i>Phiếu nhập Scrap
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Pipeline luôn hiển thị, kể cả khi tạo mới (DRAFT) */}
                    {renderPipeline()}
                </div>

                <div className={odooStyles.odooSheet}>
                    {/* Back arrow + Title / Repair Code */}
                    <div className={odooStyles.odooTitleContainer} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Nút quay lại danh sách */}
                            <button
                                onClick={() => navigate('/repairs')}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                                    color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: '14px', borderRadius: '4px', flexShrink: 0
                                }}
                                title="Quay lại danh sách"
                                onMouseEnter={e => e.currentTarget.style.color = '#017e84'}
                                onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                            >
                                <i className="bi bi-arrow-left" style={{ fontSize: '18px' }}></i>
                            </button>

                            {isNew ? (
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={formData.repairCode}
                                        onChange={e => handleCodeChange(e.target.value)}
                                        style={{
                                            fontSize: '2rem', fontWeight: 'bold', border: 'none',
                                            borderBottom: codeError ? '2px solid #dc2626' : '2px dashed #d1d5db',
                                            outline: 'none', width: '100%', color: '#212529', background: 'transparent'
                                        }}
                                        placeholder="Mã lệnh sửa chữa"
                                    />
                                    {codeError && <small style={{ color: '#dc2626', display: 'block', marginTop: '4px' }}><i className="bi bi-exclamation-circle me-1"></i>{codeError}</small>}
                                </div>
                            ) : (
                                <h1 className={odooStyles.odooTitle}>{repair?.repairCode}</h1>
                            )}
                        </div>
                    </div>

                    {/* Form Body */}
                    <div className="row g-4">
                        {/* ── Cột trái ── */}
                        <div className="col-md-6">
                            {/* Khách hàng */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>
                                    Khách hàng <span className="text-danger">*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <Select
                                            isDisabled={!isEditable}
                                            options={customers.map(c => ({
                                                value: c.id,
                                                label: [c.phone, c.name].filter(Boolean).join(' - '),
                                                phone: c.phone, name: c.name
                                            }))}
                                            value={(() => {
                                                const c = customers.find(x => String(x.id) === String(formData.partnerId));
                                                if (!c) return null;
                                                return { value: c.id, label: [c.phone, c.name].filter(Boolean).join(' - ') };
                                            })()}
                                            onChange={opt => setFormData({ ...formData, partnerId: opt ? opt.value : '' })}
                                            placeholder="Chọn khách hàng..."
                                            isClearable styles={selectStyles} menuPortalTarget={document.body}
                                            noOptionsMessage={() => 'Không tìm thấy'}
                                        />

                                    </div>
                                    {isEditable && (
                                        <button type="button" onClick={() => setShowCustomerModal(true)}
                                            style={{ width: '28px', height: '28px', border: '1px solid #ced4da', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Thêm nhanh khách hàng">
                                            <i className="bi bi-plus" style={{ fontSize: '18px', color: '#017e84' }}></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Sản phẩm */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>
                                    Sản phẩm cần sửa <span className="text-danger">*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <Select
                                            isDisabled={!isEditable}
                                            options={products.filter(p => p.productType === 'Thành phẩm').map(p => ({
                                                value: p.id,
                                                label: [p.productCode, p.productName].filter(Boolean).join(' - ')
                                            }))}
                                            value={(() => {
                                                const p = products.find(x => String(x.id) === String(formData.productId));
                                                if (!p) return null;
                                                return { value: p.id, label: [p.productCode, p.productName].filter(Boolean).join(' - ') };
                                            })()}
                                            onChange={opt => setFormData({ ...formData, productId: opt ? opt.value : '' })}
                                            placeholder="Chọn sản phẩm..."
                                            isClearable styles={selectStyles} menuPortalTarget={document.body}
                                            noOptionsMessage={() => 'Không tìm thấy'}
                                        />
                                    </div>
                                    {isEditable && (
                                        <button type="button" onClick={() => { setQuickProductType('Thành phẩm'); setShowQuickProductModal(true); }}
                                            style={{ width: '28px', height: '28px', border: '1px solid #ced4da', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Thêm nhanh thành phẩm">
                                            <i className="bi bi-plus" style={{ fontSize: '18px', color: '#017e84' }}></i>
                                        </button>
                                    )}
                                </div>

                            </div>

                            {/* Kho xuất linh kiện */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>
                                    Kho thực hiện <span className="text-danger">*</span>
                                </label>
                                <Select
                                    isDisabled={!isEditable}
                                    options={warehouses.map(w => ({
                                        value: w.id,
                                        label: [w.code, w.name].filter(Boolean).join(' - ')
                                    }))}
                                    value={(() => {
                                        const w = warehouses.find(x => String(x.id) === String(formData.warehouseId));
                                        if (!w) return null;
                                        return { value: w.id, label: [w.code, w.name].filter(Boolean).join(' - ') };
                                    })()}
                                    onChange={opt => setFormData({ ...formData, warehouseId: opt ? opt.value : '' })}
                                    placeholder="Chọn kho..."
                                    isClearable styles={selectStyles} menuPortalTarget={document.body}
                                    noOptionsMessage={() => 'Không tìm thấy'}
                                />
                            </div>

                            {/* Trong bảo hành */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Trong bảo hành</label>
                                <div style={{ flex: 1, paddingTop: '4px' }}>
                                    <input type="checkbox" id="underWarranty" disabled={!isEditable}
                                        checked={formData.underWarranty}
                                        onChange={e => setFormData({ ...formData, underWarranty: e.target.checked })} />
                                    <label htmlFor="underWarranty" style={{ marginLeft: '8px', cursor: 'pointer', color: '#017e84', fontWeight: '500' }}>
                                        Thiết bị đang trong hạn bảo hành
                                    </label>
                                </div>
                            </div>

                            {/* Mô tả lỗi */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Mô tả lỗi</label>
                                <textarea className={odooStyles.odooTextarea} rows="3"
                                    disabled={!isEditable}
                                    value={formData.issueDescription}
                                    onChange={e => setFormData({ ...formData, issueDescription: e.target.value })}
                                    placeholder="Mô tả chi tiết tình trạng lỗi của thiết bị" />
                            </div>
                        </div>

                        {/* ── Cột phải ── */}
                        <div className="col-md-6">
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Ngày tiếp nhận</label>
                                <input type="date" className={odooStyles.odooFormInput}
                                    disabled={!isEditable}
                                    value={formData.receivedDate || new Date().toISOString().split('T')[0]}
                                    onChange={e => setFormData({ ...formData, receivedDate: e.target.value })} />
                            </div>

                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Ngày dự kiến hoàn trả</label>
                                <input type="date" className={odooStyles.odooFormInput}
                                    disabled={!isEditable}
                                    value={formData.expectedDate}
                                    onChange={e => setFormData({ ...formData, expectedDate: e.target.value })} />
                            </div>

                            {repair?.completedDate && (
                                <div className={odooStyles.odooFormGroup}>
                                    <label className={odooStyles.odooFormLabel}>Ngày hoàn tất</label>
                                    <div className={odooStyles.odooFormValue} style={{ color: '#16a34a', fontWeight: '500' }}>
                                        <i className="bi bi-calendar-check me-1"></i>
                                        {new Date(repair.completedDate).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            )}

                            {/* Người chịu trách nhiệm */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Người chịu trách nhiệm</label>
                                <div className={odooStyles.odooFormValue} style={{ display: 'flex', alignItems: 'center', color: '#4b5563' }}>
                                    {isNew 
                                        ? (currentUserInfo?.fullName || currentUserInfo?.username || '—') 
                                        : (repair?.createdBy ? `ID: ${repair.createdBy}` : '—')}
                                </div>
                            </div>

                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Phương thức hóa đơn</label>
                                <select className={odooStyles.odooFormInput}
                                    disabled={!isEditable}
                                    value={formData.invoiceMethod}
                                    onChange={e => setFormData({ ...formData, invoiceMethod: e.target.value })}>
                                    <option value="none">Không xuất hóa đơn</option>
                                    <option value="b4repair">Trước khi sửa</option>
                                    <option value="after_repair">Sau khi sửa</option>
                                </select>
                            </div>

                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Tổng chi phí</label>
                                <div className={odooStyles.odooFormValue} style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#017e84' }}>
                                    {(() => {
                                        if (repair?.totalAmount !== undefined) {
                                            return Number(repair.totalAmount).toLocaleString('vi-VN') + ' ₫';
                                        }
                                        const t = pendingLines.filter(l => l.actionType === 'ADD').reduce((s, l) => s + Number(l.unitPrice) * Number(l.quantity), 0)
                                            + pendingFees.reduce((s, f) => s + Number(f.feeAmount), 0);
                                        return t.toLocaleString('vi-VN') + ' ₫';
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Inline Table: Linh kiện + Phí dịch vụ ── */}
                    <div className={odooStyles.odooNotebook} style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h6 style={{ margin: 0, fontWeight: '700', color: '#374151', fontSize: '14px' }}>
                                <i className="bi bi-list-ul me-2" style={{ color: '#017e84' }}></i>
                                Linh kiện & Phí dịch vụ
                            </h6>
                            {isEditable && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-sm btn-outline-primary"
                                        onClick={() => setAddingType('PART')}
                                        disabled={addingType !== null}
                                        style={{ fontSize: '12px' }}>
                                        <i className="bi bi-plus-lg me-1"></i>Thêm linh kiện
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary"
                                        onClick={() => setAddingType('FEE')}
                                        disabled={addingType !== null}
                                        style={{ fontSize: '12px' }}>
                                        <i className="bi bi-plus-lg me-1"></i>Thêm phí dịch vụ
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <th style={thStyle}>Loại</th>
                                        <th style={thStyle}>Sản phẩm / Linh kiện / Phí dịch vụ</th>
                                        <th style={thStyle}>Số lượng</th>
                                        <th style={thStyle}>ĐVT</th>
                                        <th style={thStyle}>Tiền sửa chữa</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>Bảo hành</th>
                                        <th style={thStyle}>Ghi chú</th>
                                        {isEditable && <th style={thStyle}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Dòng pending (khi tạo mới) */}
                                    {pendingLines.map((line, idx) => (
                                        <tr key={line._key || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={tdStyle}>
                                                <span style={getActionBadge(line.actionType)}>{line.actionType === 'ADD' ? 'Lắp thêm' : 'Thu hồi'}</span>
                                            </td>
                                            <td style={tdStyle}>{line._label || `Variant ID: ${line.componentVariantId}`}</td>
                                            <td style={tdStyle}>{line.quantity}</td>
                                            <td style={tdStyle}>{line._unitName || variantOptions.find(v => v.value === line.componentVariantId)?.unitName || '—'}</td>
                                            <td style={tdStyle}>{Number(line.unitPrice).toLocaleString('vi-VN')} ₫</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{line.isFreeWarranty ? '✓' : ''}</td>
                                            <td style={tdStyle}>{line.note || '—'}</td>
                                            <td style={tdStyle}>
                                                <button className="btn btn-sm btn-link text-danger p-0"
                                                    onClick={() => setPendingLines(prev => prev.filter((_, i) => i !== idx))}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingFees.map((fee, idx) => (
                                        <tr key={fee._key || idx} style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                                            <td style={tdStyle}><span style={feeBadgeStyle}>Phí DV</span></td>
                                            <td style={tdStyle}>{fee.feeName}</td>
                                            <td style={tdStyle}>{fee.quantity || 1}</td>
                                            <td style={tdStyle}>{fee.unitName || '—'}</td>
                                            <td style={tdStyle}>{Number(fee.feeAmount).toLocaleString('vi-VN')} ₫</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{fee.isFreeWarranty ? '✓' : ''}</td>
                                            <td style={tdStyle}>{fee.note || '—'}</td>
                                            <td style={tdStyle}>
                                                <button className="btn btn-sm btn-link text-danger p-0"
                                                    onClick={() => setPendingFees(prev => prev.filter((_, i) => i !== idx))}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Dòng từ DB (khi đang edit) */}
                                    {lines.map(line => (
                                        <tr key={`line-${line.id}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={tdStyle}>
                                                <span style={getActionBadge(line.actionType)}>
                                                    {line.actionType === 'ADD' ? 'Lắp thêm' : 'Thu hồi'}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                {line.componentName || `ID: ${line.componentVariantId}`}
                                            </td>
                                            <td style={tdStyle}>{Number(line.quantity).toLocaleString('vi-VN')}</td>
                                            <td style={tdStyle}>{variantOptions.find(v => v.value === line.componentVariantId)?.unitName || '—'}</td>
                                            <td style={tdStyle}>{Number(line.unitPrice).toLocaleString('vi-VN')} ₫</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {line.isFreeWarranty && <i className="bi bi-shield-check" style={{ color: '#16a34a' }}></i>}
                                            </td>
                                            <td style={tdStyle}>{line.note || '—'}</td>
                                            {isEditable && (
                                                <td style={tdStyle}>
                                                    <button className="btn btn-sm btn-link text-danger p-0"
                                                        onClick={() => handleDeleteLine(line.id)}
                                                        title="Xóa linh kiện">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}

                                    {fees.map(fee => (
                                        <tr key={`fee-${fee.id}`} style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                                            <td style={tdStyle}><span style={feeBadgeStyle}>Phí DV</span></td>
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: '500' }}>{fee.feeName}</div>
                                            </td>
                                            <td style={tdStyle}>{fee.quantity || 1}</td>
                                            <td style={tdStyle}>{fee.unitName || '—'}</td>
                                            <td style={tdStyle}>{Number(fee.feeAmount).toLocaleString('vi-VN')} ₫</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {fee.isFreeWarranty && <i className="bi bi-shield-check" style={{ color: '#16a34a' }}></i>}
                                            </td>
                                            <td style={tdStyle}>{fee.note || '—'}</td>
                                            {isEditable && (
                                                <td style={tdStyle}>
                                                    <button className="btn btn-sm btn-link text-danger p-0"
                                                        onClick={() => handleDeleteFee(fee.id)}
                                                        title="Xóa phí dịch vụ">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}

                                    {/* Dòng nhập inline mới */}
                                    {addingType === 'PART' && (
                                        <NewInlineRow type="PART" variants={variantOptions.filter(v => v.productType === 'Hàng hóa')}
                                            onSave={handleSaveLine} onCancel={() => setAddingType(null)}
                                            underWarranty={formData.underWarranty}
                                            onQuickAdd={(type) => { setQuickProductType(type); setShowQuickProductModal(true); }} />
                                    )}
                                    {addingType === 'FEE' && (
                                        <NewInlineRow type="FEE" variants={variantOptions.filter(v => v.productType === 'Dịch vụ')}
                                            onSave={handleSaveFee} onCancel={() => setAddingType(null)}
                                            underWarranty={formData.underWarranty}
                                            onQuickAdd={(type) => { setQuickProductType(type); setShowQuickProductModal(true); }} />
                                    )}

                                    {/* Empty state */}
                                    {lines.length === 0 && fees.length === 0 && pendingLines.length === 0 && pendingFees.length === 0 && addingType === null && (
                                        <tr>
                                            <td colSpan={isEditable ? 8 : 7}
                                                style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                                                <i className="bi bi-box-seam" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}></i>
                                                Chưa có linh kiện hay phí dịch vụ.
                                                {isEditable && <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                                    Bấm <b>+ Thêm linh kiện</b> hoặc <b>+ Thêm phí dịch vụ</b> để bắt đầu.
                                                </div>}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <CustomerModal
                isOpen={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                onSaved={async (newCustomer) => {
                    await loadCustomers();
                    if (newCustomer?.id) setFormData(prev => ({ ...prev, partnerId: newCustomer.id }));
                    setShowCustomerModal(false);
                }}
            />

            <QuickProductModal
                isOpen={showQuickProductModal}
                fixedType={quickProductType}
                onClose={() => setShowQuickProductModal(false)}
                onSaved={() => {
                    loadProducts();
                    loadVariants();
                    setShowQuickProductModal(false);
                }}
            />
        </AdminLayout>
    );
}

/* ── Inline styles helpers ─── */
const thStyle = {
    padding: '8px 12px', fontWeight: '600', fontSize: '12px',
    color: '#6b7280', textAlign: 'left', whiteSpace: 'nowrap'
};
const tdStyle = {
    padding: '8px 12px', fontSize: '13px', verticalAlign: 'middle'
};
const getActionBadge = (type) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
    fontSize: '11px', fontWeight: '600',
    ...(type === 'ADD'
        ? { background: '#dcfce7', color: '#15803d' }
        : { background: '#fef9c3', color: '#854d0e' })
});
const feeBadgeStyle = {
    display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
    fontSize: '11px', fontWeight: '600', background: '#eff6ff', color: '#1d4ed8'
};

export default RepairFormPage;
