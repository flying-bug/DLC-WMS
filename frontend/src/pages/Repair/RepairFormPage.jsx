import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import * as repairApi from '../../api/repairApi';
import * as customerApi from '../../api/customerApi';
import axiosClient from '../../api/axiosClient';
import CustomerModal from '../Customer/components/CustomerModal';
import odooStyles from './OdooStyle.module.css';

/* â”€â”€â”€ Select styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const STAGES = ['DRAFT', 'CONFIRMED', 'UNDER_REPAIR', 'DONE'];
const STAGE_LABELS = {
    DRAFT: 'NhÃ¡p', QUOTATION: 'BÃ¡o giÃ¡', CONFIRMED: 'XÃ¡c nháº­n',
    UNDER_REPAIR: 'Äang sá»­a', DONE: 'HoÃ n táº¥t'
};
const EDITABLE_STATUSES = ['DRAFT', 'QUOTATION'];

/* â”€â”€â”€ Inline Row Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/**
 * Má»™t dÃ²ng "má»›i Ä‘ang nháº­p" trong báº£ng inline.
 * type: 'PART' | 'FEE'
 */
function NewInlineRow({ type, variants, onSave, onCancel, underWarranty }) {
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
                    <option value="ADD">Láº¯p thÃªm (ADD)</option>
                    <option value="REMOVE">Thu há»“i (REMOVE)</option>
                </select>
            </td>
            <td>
                <Select options={variants}
                    onChange={opt => setForm({ ...form, componentVariantId: opt ? opt.value : '' })}
                    placeholder="Chá»n sáº£n pháº©m/linh kiá»‡n..."
                    isClearable styles={selectStyles} menuPortalTarget={document.body}
                    noOptionsMessage={() => 'KhÃ´ng tÃ¬m tháº¥y'} />
            </td>
            <td>
                <input type="number" className="form-control form-control-sm" min="1" value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    style={{ width: '80px', fontSize: '12px' }} />
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
                    placeholder="Ghi chÃº..." style={{ fontSize: '12px' }} />
            </td>
            <td>
                <button className="btn btn-sm btn-success me-1" onClick={() => onSave(form)} title="LÆ°u dÃ²ng">
                    <i className="bi bi-check-lg"></i>
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onCancel} title="Há»§y">
                    <i className="bi bi-x-lg"></i>
                </button>
            </td>
        </tr>
    );

    return (
        <tr style={{ background: '#eff6ff' }}>
            <td colSpan="2">
                <input type="text" className="form-control form-control-sm" value={form.feeName}
                    onChange={e => setForm({ ...form, feeName: e.target.value })}
                    placeholder="TÃªn phÃ­ dá»‹ch vá»¥ (VD: CÃ´ng thá»£, Vá»‡ sinh...)" style={{ fontSize: '12px' }} />
            </td>
            <td>â€”</td>
            <td>
                <input type="number" className="form-control form-control-sm" value={isFree ? 0 : form.feeAmount}
                    disabled={isFree}
                    onChange={e => setForm({ ...form, feeAmount: e.target.value })}
                    style={{ width: '110px', fontSize: '12px' }} />
            </td>
            <td style={{ textAlign: 'center' }}>
                <input type="checkbox" checked={form.isFreeWarranty}
                    onChange={e => setForm({ ...form, isFreeWarranty: e.target.checked, feeAmount: e.target.checked ? 0 : form.feeAmount })} />
            </td>
            <td>
                <input type="text" className="form-control form-control-sm" value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="Ghi chÃº..." style={{ fontSize: '12px' }} />
            </td>
            <td>
                <button className="btn btn-sm btn-success me-1" onClick={() => onSave(form)} title="LÆ°u dÃ²ng">
                    <i className="bi bi-check-lg"></i>
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onCancel} title="Há»§y">
                    <i className="bi bi-x-lg"></i>
                </button>
            </td>
        </tr>
    );
}

/* â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    // variantOptions: dÃ¹ng cho dropdown linh kiá»‡n trong báº£ng vÃ¬ DB yÃªu cáº§u componentVariantId
    const [variantOptions, setVariantOptions] = useState([]);
    const [currentUserInfo, setCurrentUserInfo] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // Inline editing state
    const [addingType, setAddingType] = useState(null); // 'PART' | 'FEE' | null
    // For isNew: pending items before save
    const [pendingLines, setPendingLines] = useState([]);
    const [pendingFees, setPendingFees] = useState([]);

    /* â”€â”€ Loaders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
            alert('Lá»—i táº£i thÃ´ng tin lá»‡nh sá»­a chá»¯a');
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
                label: [v.sku, v.productName, v.variantName].filter(Boolean).join(' - ')
            })));
        } catch (e) { console.error(e); }
    }, []);

    const loadCurrentUser = useCallback(async () => {
        try {
            const res = await axiosClient.get('/users/me');
            setCurrentUserInfo(res.data?.data || null);
        } catch (e) { console.error(e); }
    }, []);

    /* â”€â”€ Initial code generation for new form â”€â”€â”€ */
    useEffect(() => {
        if (isNew && !formData.repairCode) {
            // Hiá»ƒn thá»‹ placeholder SC-XXXXX â€” backend sáº½ táº¡o mÃ£ tháº­t khi lÆ°u náº¿u mÃ£ trá»‘ng
            // Hoáº·c ta gá»i check-code Ä‘á»ƒ sinh mÃ£ há»£p lá»‡
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

    /* â”€â”€ Code check debounce (chá»‰ bÃ¡o lá»—i khi trÃ¹ng, khÃ´ng hiá»‡n "há»£p lá»‡") â”€â”€ */
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
                if (exists) setCodeError('MÃ£ phiáº¿u sá»­a chá»¯a Ä‘Ã£ trÃ¹ng. Vui lÃ²ng thay Ä‘á»•i mÃ£ khÃ¡c.');
                // KhÃ´ng hiá»‡n thÃ´ng bÃ¡o "há»£p lá»‡" â€” check ngáº§m
            } catch (e) {
                console.error(e);
            } finally {
                setCodeChecking(false);
            }
        }, 500);
    };

    /* â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const handleSave = async () => {
        if (codeError) { alert('MÃ£ lá»‡nh bá»‹ trÃ¹ng. Vui lÃ²ng sá»­a láº¡i mÃ£.'); return; }
        if (!formData.partnerId) { alert('Vui lÃ²ng chá»n KhÃ¡ch hÃ ng.'); return; }
        if (!formData.productId) { alert('Vui lÃ²ng chá»n Sáº£n pháº©m cáº§n sá»­a.'); return; }

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
                // Gá»i API tuáº§n tá»± cho cÃ¡c dÃ²ng pending
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
                alert('ÄÃ£ lÆ°u thÃ nh cÃ´ng!');
            }
        } catch (err) {
            alert('LÆ°u tháº¥t báº¡i: ' + (err.response?.data?.userMessage || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleStatusTransition = async (targetStatus) => {
        if (!window.confirm(`XÃ¡c nháº­n chuyá»ƒn tráº¡ng thÃ¡i sang "${STAGE_LABELS[targetStatus] || targetStatus}"?`)) return;
        try {
            await repairApi.updateRepairStatus(id, { status: targetStatus });
            await loadRepair();
        } catch (err) {
            alert('Lá»—i chuyá»ƒn tráº¡ng thÃ¡i: ' + (err.response?.data?.userMessage || err.message));
        }
    };

    /* â”€â”€ Inline save handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const handleSaveLine = async (form) => {
        if (!form.componentVariantId) { alert('Vui lÃ²ng chá»n sáº£n pháº©m/linh kiá»‡n.'); return; }
        const linePayload = {
            actionType: form.actionType,
            componentVariantId: Number(form.componentVariantId),
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
            isFreeWarranty: form.isFreeWarranty,
            note: form.note || null
        };
        if (isNew) {
            // LÆ°u táº¡m â€” dÃ¹ng variantOptions Ä‘á»ƒ tÃ¬m nhÃ£n
            const variantLabel = variantOptions.find(p => p.value === form.componentVariantId)?.label || `ID: ${form.componentVariantId}`;
            setPendingLines(prev => [...prev, { ...linePayload, _label: variantLabel, _key: Date.now() }]);
            setAddingType(null);
        } else {
            try {
                await repairApi.addRepairLine(id, linePayload);
                setAddingType(null);
                await loadRepair();
            } catch (err) {
                alert(err.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi thÃªm linh kiá»‡n');
            }
        }
    };

    const handleSaveFee = async (form) => {
        if (!form.feeName) { alert('Vui lÃ²ng nháº­p tÃªn phÃ­.'); return; }
        const feePayload = {
            feeName: form.feeName,
            feeAmount: Number(form.feeAmount),
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
                alert(err.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi thÃªm phÃ­');
            }
        }
    };

    const handleDeleteLine = async (lineId) => {
        if (!window.confirm('XÃ³a dÃ²ng linh kiá»‡n nÃ y?')) return;
        try {
            await repairApi.deleteRepairLine(id, lineId);
            await loadRepair();
        } catch (err) {
            alert(err.response?.data?.userMessage || 'Lá»—i xÃ³a linh kiá»‡n');
        }
    };

    const handleDeleteFee = async (feeId) => {
        if (!window.confirm('XÃ³a dÃ²ng phÃ­ dá»‹ch vá»¥ nÃ y?')) return;
        try {
            await repairApi.deleteRepairFee(id, feeId);
            await loadRepair();
        } catch (err) {
            alert(err.response?.data?.userMessage || 'Lá»—i xÃ³a phÃ­');
        }
    };

    /* â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    // Khi isNew, currentStatus luÃ´n lÃ  DRAFT Ä‘á»ƒ pipeline hiá»ƒn thá»‹ Ä‘Ãºng
    const currentStatus = repair?.repairStatus || 'DRAFT';
    const isEditable = isNew || EDITABLE_STATUSES.includes(currentStatus);

    const lines = repair?.lines || [];
    const fees = repair?.fees || [];

    /* â”€â”€ Pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
                        ÄÃ£ há»§y
                    </div>
                )}
            </div>
        );
    };

    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    return (
        <AdminLayout>
            <div className={odooStyles.odooLayout}>
                {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    <i className="bi bi-arrow-repeat me-2"></i>Äang táº£i...
                </div>}

                {/* Status Bar */}
                <div className={odooStyles.odooStatusBar}>
                    <div className={odooStyles.odooActions}>
                        {isEditable && (
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !!codeError}>
                                {saving ? <><i className="bi bi-hourglass-split me-1"></i>Äang lÆ°u...</> : (isNew ? 'LÆ°u má»›i' : 'LÆ°u')}
                            </button>
                        )}

                        {/* Workflow buttons */}
                        {!isNew && currentStatus === 'DRAFT' && (
                            <>
                                <button className="btn btn-secondary" onClick={() => handleStatusTransition('CONFIRMED')}>
                                    <i className="bi bi-check-circle me-1"></i>XÃ¡c nháº­n Lá»‡nh
                                </button>
                                <button className="btn btn-outline-secondary" onClick={() => handleStatusTransition('QUOTATION')}>
                                    <i className="bi bi-send me-1"></i>Gá»­i bÃ¡o giÃ¡
                                </button>
                            </>
                        )}
                        {!isNew && currentStatus === 'QUOTATION' && (
                            <button className="btn btn-secondary" onClick={() => handleStatusTransition('CONFIRMED')}>
                                <i className="bi bi-check-circle me-1"></i>XÃ¡c nháº­n Lá»‡nh
                            </button>
                        )}
                        {!isNew && currentStatus === 'CONFIRMED' && (
                            <button className="btn btn-warning text-white" onClick={() => handleStatusTransition('UNDER_REPAIR')}>
                                <i className="bi bi-tools me-1"></i>Báº¯t Ä‘áº§u sá»­a
                            </button>
                        )}
                        {!isNew && currentStatus === 'UNDER_REPAIR' && (
                            <button className="btn btn-success" onClick={() => handleStatusTransition('DONE')}>
                                <i className="bi bi-check2-all me-1"></i>HoÃ n táº¥t
                            </button>
                        )}
                        {!isNew && !['DONE', 'CANCELLED'].includes(currentStatus) && (
                            <button className="btn btn-outline-danger" onClick={() => handleStatusTransition('CANCELLED')}>
                                <i className="bi bi-x-circle me-1"></i>Há»§y lá»‡nh
                            </button>
                        )}

                        {!isNew && ['CONFIRMED', 'UNDER_REPAIR', 'DONE'].includes(currentStatus) && (
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', paddingLeft: '24px' }}>
                                <button className="btn btn-outline-info" onClick={() => navigate('/export-slips', { state: { filterDocCode: 'REP-EX-' + repair.repairCode } })}>
                                    <i className="bi bi-box-arrow-up-right me-1"></i>Phiáº¿u xuáº¥t kho
                                </button>
                                <button className="btn btn-outline-info" onClick={() => navigate('/import-history', { state: { filterDocCode: 'REP-SCRAP-' + repair.repairCode } })}>
                                    <i className="bi bi-box-arrow-in-down-left me-1"></i>Phiáº¿u nháº­p Scrap
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Pipeline luÃ´n hiá»ƒn thá»‹, ká»ƒ cáº£ khi táº¡o má»›i (DRAFT) */}
                    {renderPipeline()}
                </div>

                <div className={odooStyles.odooSheet}>
                    {/* Back arrow + Title / Repair Code */}
                    <div className={odooStyles.odooTitleContainer} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* NÃºt quay láº¡i danh sÃ¡ch */}
                            <button
                                onClick={() => navigate('/repairs')}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                                    color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: '14px', borderRadius: '4px', flexShrink: 0
                                }}
                                title="Quay láº¡i danh sÃ¡ch"
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
                                        placeholder="MÃ£ lá»‡nh sá»­a chá»¯a"
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
                        {/* â”€â”€ Cá»™t trÃ¡i â”€â”€ */}
                        <div className="col-md-6">
                            {/* KhÃ¡ch hÃ ng */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>
                                    KhÃ¡ch hÃ ng <span className="text-danger">*</span>
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
                                            placeholder="Chá»n khÃ¡ch hÃ ng..."
                                            isClearable styles={selectStyles} menuPortalTarget={document.body}
                                            noOptionsMessage={() => 'KhÃ´ng tÃ¬m tháº¥y'}
                                        />

                                    </div>
                                    {isEditable && (
                                        <button type="button" onClick={() => setShowCustomerModal(true)}
                                            style={{ width: '28px', height: '28px', border: '1px solid #ced4da', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="ThÃªm nhanh khÃ¡ch hÃ ng">
                                            <i className="bi bi-plus" style={{ fontSize: '18px', color: '#017e84' }}></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Sáº£n pháº©m */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>
                                    Sáº£n pháº©m cáº§n sá»­a <span className="text-danger">*</span>
                                </label>
                                <Select
                                    isDisabled={!isEditable}
                                    options={products.map(p => ({
                                        value: p.id,
                                        label: [p.productCode, p.productName].filter(Boolean).join(' - ')
                                    }))}
                                    value={(() => {
                                        const p = products.find(x => String(x.id) === String(formData.productId));
                                        if (!p) return null;
                                        return { value: p.id, label: [p.productCode, p.productName].filter(Boolean).join(' - ') };
                                    })()}
                                    onChange={opt => setFormData({ ...formData, productId: opt ? opt.value : '' })}
                                    placeholder="Chá»n sáº£n pháº©m..."
                                    isClearable styles={selectStyles} menuPortalTarget={document.body}
                                    noOptionsMessage={() => 'KhÃ´ng tÃ¬m tháº¥y'}
                                />

                            </div>

                            {/* Kho xuáº¥t linh kiá»‡n */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>
                                    Kho thá»±c hiá»‡n <span className="text-danger">*</span>
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
                                    placeholder="Chá»n kho..."
                                    isClearable styles={selectStyles} menuPortalTarget={document.body}
                                    noOptionsMessage={() => 'KhÃ´ng tÃ¬m tháº¥y'}
                                />
                            </div>

                            {/* Trong báº£o hÃ nh */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Trong báº£o hÃ nh</label>
                                <div style={{ flex: 1, paddingTop: '4px' }}>
                                    <input type="checkbox" id="underWarranty" disabled={!isEditable}
                                        checked={formData.underWarranty}
                                        onChange={e => setFormData({ ...formData, underWarranty: e.target.checked })} />
                                    <label htmlFor="underWarranty" style={{ marginLeft: '8px', cursor: 'pointer', color: '#017e84', fontWeight: '500' }}>
                                        Thiáº¿t bá»‹ Ä‘ang trong háº¡n báº£o hÃ nh
                                    </label>
                                </div>
                            </div>

                            {/* MÃ´ táº£ lá»—i */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>MÃ´ táº£ lá»—i</label>
                                <textarea className={odooStyles.odooTextarea} rows="3"
                                    disabled={!isEditable}
                                    value={formData.issueDescription}
                                    onChange={e => setFormData({ ...formData, issueDescription: e.target.value })}
                                    placeholder="MÃ´ táº£ chi tiáº¿t tÃ¬nh tráº¡ng lá»—i cá»§a thiáº¿t bá»‹" />
                            </div>
                        </div>

                        {/* â”€â”€ Cá»™t pháº£i â”€â”€ */}
                        <div className="col-md-6">
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>NgÃ y tiáº¿p nháº­n</label>
                                <input type="date" className={odooStyles.odooFormInput}
                                    disabled={!isEditable}
                                    value={formData.receivedDate || new Date().toISOString().split('T')[0]}
                                    onChange={e => setFormData({ ...formData, receivedDate: e.target.value })} />
                            </div>

                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>NgÃ y dá»± kiáº¿n hoÃ n tráº£</label>
                                <input type="date" className={odooStyles.odooFormInput}
                                    disabled={!isEditable}
                                    value={formData.expectedDate}
                                    onChange={e => setFormData({ ...formData, expectedDate: e.target.value })} />
                            </div>

                            {repair?.completedDate && (
                                <div className={odooStyles.odooFormGroup}>
                                    <label className={odooStyles.odooFormLabel}>NgÃ y hoÃ n táº¥t</label>
                                    <div className={odooStyles.odooFormValue} style={{ color: '#16a34a', fontWeight: '500' }}>
                                        <i className="bi bi-calendar-check me-1"></i>
                                        {new Date(repair.completedDate).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            )}

                            {/* NgÆ°á»i chá»‹u trÃ¡ch nhiá»‡m */}
                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>NgÆ°á»i chá»‹u trÃ¡ch nhiá»‡m</label>
                                <div className={odooStyles.odooFormValue} style={{ display: 'flex', alignItems: 'center', color: '#4b5563' }}>
                                    {isNew 
                                        ? (currentUserInfo?.fullName || currentUserInfo?.username || 'â€”') 
                                        : (repair?.createdBy ? `ID: ${repair.createdBy}` : 'â€”')}
                                </div>
                            </div>

                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>PhÆ°Æ¡ng thá»©c hÃ³a Ä‘Æ¡n</label>
                                <select className={odooStyles.odooFormInput}
                                    disabled={!isEditable}
                                    value={formData.invoiceMethod}
                                    onChange={e => setFormData({ ...formData, invoiceMethod: e.target.value })}>
                                    <option value="none">KhÃ´ng xuáº¥t hÃ³a Ä‘Æ¡n</option>
                                    <option value="b4repair">TrÆ°á»›c khi sá»­a</option>
                                    <option value="after_repair">Sau khi sá»­a</option>
                                </select>
                            </div>

                            <div className={odooStyles.odooFormGroup}>
                                <label className={odooStyles.odooFormLabel}>Tá»•ng chi phÃ­</label>
                                <div className={odooStyles.odooFormValue} style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#017e84' }}>
                                    {(() => {
                                        if (repair?.totalAmount !== undefined) {
                                            return Number(repair.totalAmount).toLocaleString('vi-VN') + ' â‚«';
                                        }
                                        const t = pendingLines.filter(l => l.actionType === 'ADD').reduce((s, l) => s + Number(l.unitPrice) * Number(l.quantity), 0)
                                            + pendingFees.reduce((s, f) => s + Number(f.feeAmount), 0);
                                        return t.toLocaleString('vi-VN') + ' â‚«';
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* â”€â”€ Inline Table: Linh kiá»‡n + PhÃ­ dá»‹ch vá»¥ â”€â”€ */}
                    <div className={odooStyles.odooNotebook} style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h6 style={{ margin: 0, fontWeight: '700', color: '#374151', fontSize: '14px' }}>
                                <i className="bi bi-list-ul me-2" style={{ color: '#017e84' }}></i>
                                Linh kiá»‡n & PhÃ­ dá»‹ch vá»¥
                            </h6>
                            {isEditable && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-sm btn-outline-primary"
                                        onClick={() => setAddingType('PART')}
                                        disabled={addingType !== null}
                                        style={{ fontSize: '12px' }}>
                                        <i className="bi bi-plus-lg me-1"></i>ThÃªm linh kiá»‡n
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary"
                                        onClick={() => setAddingType('FEE')}
                                        disabled={addingType !== null}
                                        style={{ fontSize: '12px' }}>
                                        <i className="bi bi-plus-lg me-1"></i>ThÃªm phÃ­ dá»‹ch vá»¥
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <th style={thStyle}>Loáº¡i</th>
                                        <th style={thStyle}>Sáº£n pháº©m / Linh kiá»‡n / PhÃ­ dá»‹ch vá»¥</th>
                                        <th style={thStyle}>Sá»‘ lÆ°á»£ng</th>
                                        <th style={thStyle}>Tiá»n sá»­a chá»¯a</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>Báº£o hÃ nh</th>
                                        <th style={thStyle}>Ghi chÃº</th>
                                        {isEditable && <th style={thStyle}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* DÃ²ng pending (khi táº¡o má»›i) */}
                                    {pendingLines.map((line, idx) => (
                                        <tr key={line._key || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={tdStyle}>
                                                <span style={getActionBadge(line.actionType)}>{line.actionType === 'ADD' ? 'Láº¯p thÃªm' : 'Thu há»“i'}</span>
                                            </td>
                                            <td style={tdStyle}>{line._label || `Variant ID: ${line.componentVariantId}`}</td>
                                            <td style={tdStyle}>{line.quantity}</td>
                                            <td style={tdStyle}>{Number(line.unitPrice).toLocaleString('vi-VN')} â‚«</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{line.isFreeWarranty ? 'âœ“' : ''}</td>
                                            <td style={tdStyle}>{line.note || 'â€”'}</td>
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
                                            <td style={tdStyle}><span style={feeBadgeStyle}>PhÃ­ DV</span></td>
                                            <td style={tdStyle}>{fee.feeName}</td>
                                            <td style={tdStyle}>â€”</td>
                                            <td style={tdStyle}>{Number(fee.feeAmount).toLocaleString('vi-VN')} â‚«</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{fee.isFreeWarranty ? 'âœ“' : ''}</td>
                                            <td style={tdStyle}>{fee.note || 'â€”'}</td>
                                            <td style={tdStyle}>
                                                <button className="btn btn-sm btn-link text-danger p-0"
                                                    onClick={() => setPendingFees(prev => prev.filter((_, i) => i !== idx))}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* DÃ²ng tá»« DB (khi Ä‘ang edit) */}
                                    {lines.map(line => (
                                        <tr key={`line-${line.id}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={tdStyle}>
                                                <span style={getActionBadge(line.actionType)}>
                                                    {line.actionType === 'ADD' ? 'Láº¯p thÃªm' : 'Thu há»“i'}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                {line.componentName || `ID: ${line.componentVariantId}`}
                                            </td>
                                            <td style={tdStyle}>{Number(line.quantity).toLocaleString('vi-VN')}</td>
                                            <td style={tdStyle}>{Number(line.unitPrice).toLocaleString('vi-VN')} â‚«</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {line.isFreeWarranty && <i className="bi bi-shield-check" style={{ color: '#16a34a' }}></i>}
                                            </td>
                                            <td style={tdStyle}>{line.note || 'â€”'}</td>
                                            {isEditable && (
                                                <td style={tdStyle}>
                                                    <button className="btn btn-sm btn-link text-danger p-0"
                                                        onClick={() => handleDeleteLine(line.id)}
                                                        title="XÃ³a linh kiá»‡n">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}

                                    {fees.map(fee => (
                                        <tr key={`fee-${fee.id}`} style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                                            <td style={tdStyle}><span style={feeBadgeStyle}>PhÃ­ DV</span></td>
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: '500' }}>{fee.feeName}</div>
                                            </td>
                                            <td style={tdStyle}>â€”</td>
                                            <td style={tdStyle}>{Number(fee.feeAmount).toLocaleString('vi-VN')} â‚«</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {fee.isFreeWarranty && <i className="bi bi-shield-check" style={{ color: '#16a34a' }}></i>}
                                            </td>
                                            <td style={tdStyle}>{fee.note || 'â€”'}</td>
                                            {isEditable && (
                                                <td style={tdStyle}>
                                                    <button className="btn btn-sm btn-link text-danger p-0"
                                                        onClick={() => handleDeleteFee(fee.id)}
                                                        title="XÃ³a phÃ­ dá»‹ch vá»¥">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}

                                    {/* DÃ²ng nháº­p inline má»›i */}
                                    {addingType === 'PART' && (
                                        <NewInlineRow type="PART" variants={variantOptions}
                                            onSave={handleSaveLine} onCancel={() => setAddingType(null)}
                                            underWarranty={formData.underWarranty} />
                                    )}
                                    {addingType === 'FEE' && (
                                        <NewInlineRow type="FEE" variants={variantOptions}
                                            onSave={handleSaveFee} onCancel={() => setAddingType(null)}
                                            underWarranty={formData.underWarranty} />
                                    )}

                                    {/* Empty state */}
                                    {lines.length === 0 && fees.length === 0 && pendingLines.length === 0 && pendingFees.length === 0 && addingType === null && (
                                        <tr>
                                            <td colSpan={isEditable ? 7 : 6}
                                                style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                                                <i className="bi bi-box-seam" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}></i>
                                                ChÆ°a cÃ³ linh kiá»‡n hay phÃ­ dá»‹ch vá»¥.
                                                {isEditable && <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                                    Báº¥m <b>+ ThÃªm linh kiá»‡n</b> hoáº·c <b>+ ThÃªm phÃ­ dá»‹ch vá»¥</b> Ä‘á»ƒ báº¯t Ä‘áº§u.
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
                editData={null}
                onClose={() => setShowCustomerModal(false)}
                onSaved={async (newCustomer) => {
                    await loadCustomers();
                    if (newCustomer?.id) setFormData(prev => ({ ...prev, partnerId: newCustomer.id }));
                    setShowCustomerModal(false);
                }}
            />
        </AdminLayout>
    );
}

/* â”€â”€ Inline styles helpers â”€â”€â”€ */
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
