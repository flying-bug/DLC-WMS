import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Select from 'react-select';
import CustomerQuickCreateDrawer from '../Customer/components/CustomerQuickCreateDrawer';
import * as repairApi from '../../api/repairApi';
import { searchCustomers } from '../../api/customerApi';
import { searchProductVariants } from '../../api/productApi';
import styles from './RepairPage.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const unwrap = (res) => res?.data?.data ?? res?.data;
const listFrom = (payload) => payload?.content ?? (Array.isArray(payload) ? payload : []);
const fmtDate = (val) => val ? new Date(val).toLocaleDateString('vi-VN') : '—';
const fmtMoney = (n) => `${Number(n ?? 0).toLocaleString('vi-VN')} đ`;

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_ORDER = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'UNDER_REPAIR', 'TESTING', 'DONE'];
const STATUS_LABELS_VN = {
    DRAFT: 'Nháp', QUOTATION: 'Báo giá', CONFIRMED: 'Xác nhận',
    UNDER_REPAIR: 'Đang sửa', TESTING: 'Kiểm tra', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy'
};

const WORKFLOW_TRANSITIONS = {
    DRAFT:        [{ label: 'Chuyển sang Báo giá', next: 'QUOTATION' }],
    QUOTATION:    [{ label: 'Xác nhận lệnh',       next: 'CONFIRMED' }],
    CONFIRMED:    [{ label: 'Bắt đầu sửa chữa',   next: 'UNDER_REPAIR' }],
    UNDER_REPAIR: [{ label: 'Kiểm tra / Test',     next: 'TESTING' }],
    TESTING:      [{ label: 'Hoàn tất lệnh',       next: 'DONE' }],
};

const INVOICE_METHOD_LABELS = {
    none: 'Không xuất hóa đơn',
    b4repair: 'Trước sửa chữa',
    after_repair: 'Sau sửa chữa',
};

// ── Badge Component ───────────────────────────────────────────────────────────
// ── Empty Add-Line Form state ─────────────────────────────────────────────────
const emptyLine = () => ({
    localId: crypto.randomUUID(),
    componentVariantId: '',
    actionType: 'ADD',
    quantity: '1',
    unitPrice: '0',
    isFreeWarranty: false,
    serialNumberId: '',
    note: '',
});

const emptyFee = () => ({
    localId: crypto.randomUUID(),
    feeName: '',
    feeAmount: '0',
    isFreeWarranty: false,
    note: '',
});

// ── Main Component ────────────────────────────────────────────────────────────
function RepairDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isCreate = !id;

    const [repair, setRepair] = useState(null);
    const [lines, setLines] = useState([]);
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('lines');
    const [confirmAction, setConfirmAction] = useState(null); // { label, fn }

    const [form, setForm] = useState({
        partnerId: '',
        productId: '',
        serialNumberId: '',
        issueDescription: '',
        underWarranty: false,
        invoiceMethod: 'after_repair',
        note: '',
        diagnosisNote: '',
        solutionDescription: '',
    });

    const [addingLine, setAddingLine] = useState(false);
    const [newLine, setNewLine] = useState(emptyLine());
    const [addingFee, setAddingFee] = useState(false);
    const [newFee, setNewFee] = useState(emptyFee());

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);

    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });
    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

    const setField = (f, v) => setForm(p => ({ ...p, [f]: v }));

    // ── Load data ─────────────────────────────────────────────────────────────
    const loadRepair = useCallback(async () => {
        if (isCreate) return;
        setLoading(true);
        try {
            const res = await repairApi.getRepairById(id);
            const data = unwrap(res);
            setRepair(data);
            setForm({
                partnerId:           data.partnerId         ?? '',
                productId:           data.productId         ?? '',
                serialNumberId:      data.serialNumberId    ?? '',
                issueDescription:    data.issueDescription  ?? '',
                underWarranty:       data.underWarranty     ?? false,
                invoiceMethod:       data.invoiceMethod     ?? 'after_repair',
                note:                data.note              ?? '',
                diagnosisNote:       data.diagnosisNote     ?? '',
                solutionDescription: data.solutionDescription ?? '',
            });
        } catch {
            showToast('error', 'Không thể tải thông tin lệnh sửa chữa.');
        } finally {
            setLoading(false);
        }
    }, [id, isCreate]);

    const loadLines = useCallback(async () => {
        if (isCreate) return;
        try { setLines(listFrom(unwrap(await repairApi.getRepairLines(id))) ?? []); } catch { setLines([]); }
    }, [id, isCreate]);

    const loadFees = useCallback(async () => {
        if (isCreate) return;
        try { setFees(listFrom(unwrap(await repairApi.getRepairFees(id))) ?? []); } catch { setFees([]); }
    }, [id, isCreate]);

    const loadOptions = useCallback(async () => {
        try {
            const custRes = await searchCustomers('', '', '', 0, 100);
            setCustomers(listFrom(unwrap(custRes)));
            const prodRes = await searchProductVariants('', 0, 100);
            setProducts(listFrom(unwrap(prodRes)));
        } catch (error) {
            console.error("Failed to load options", error);
            setCustomers([]);
            setProducts([]);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadRepair();
        loadLines();
        loadFees();
        loadOptions();
    }, [loadRepair, loadLines, loadFees, loadOptions]);

    // ── Derived state ─────────────────────────────────────────────────────────
    const canEdit = isCreate || (repair && ['DRAFT', 'QUOTATION'].includes(repair.repairStatus));
    const canCancel = repair && !['DONE', 'CANCELLED'].includes(repair.repairStatus);
    const transitions = repair ? (WORKFLOW_TRANSITIONS[repair.repairStatus] ?? []) : [];
    const currentStatusIdx = repair ? STATUS_ORDER.indexOf(repair.repairStatus) : -1;

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        if (!form.partnerId) { showToast('error', 'Vui lòng nhập ID khách hàng.'); return false; }
        if (!form.productId) { showToast('error', 'Vui lòng nhập ID sản phẩm cần sửa.'); return false; }
        if (!form.issueDescription?.trim()) { showToast('error', 'Vui lòng mô tả lỗi của thiết bị.'); return false; }
        if (!form.invoiceMethod) { showToast('error', 'Vui lòng chọn phương thức hóa đơn.'); return false; }
        return true;
    };

    // ── Save / Create ─────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                partnerId:        Number(form.partnerId),
                productId:        Number(form.productId),
                serialNumberId:   form.serialNumberId ? Number(form.serialNumberId) : null,
                issueDescription: form.issueDescription.trim(),
                underWarranty:    form.underWarranty,
                invoiceMethod:    form.invoiceMethod,
            };
            if (isCreate) {
                const res = await repairApi.createRepair(payload);
                const created = unwrap(res);
                showToast('success', 'Tạo lệnh sửa chữa thành công!');
                setTimeout(() => navigate(`/repair-tickets/${created.id}/edit`, { state: { toastMessage: 'Lệnh sửa chữa đã được tạo!', toastType: 'success' } }), 800);
            } else {
                await repairApi.updateRepair(id, payload);
                showToast('success', 'Đã lưu lệnh sửa chữa!');
                loadRepair();
            }
        } catch (err) {
            showToast('error', err.response?.data?.message || err.response?.data?.userMessage || 'Lưu lệnh thất bại.');
        } finally {
            setSaving(false);
        }
    };

    // ── Status update ─────────────────────────────────────────────────────────
    const handleStatusUpdate = async (next) => {
        setActionLoading(true);
        try {
            await repairApi.updateRepairStatus(id, next);
            showToast('success', `Chuyển sang "${STATUS_LABELS_VN[next]}" thành công!`);
            loadRepair();
        } catch (err) {
            showToast('error', err.response?.data?.message || err.response?.data?.userMessage || 'Không thể chuyển trạng thái.');
        } finally {
            setActionLoading(false);
            setConfirmAction(null);
        }
    };

    // ── Add Line ──────────────────────────────────────────────────────────────
    const handleAddLine = async () => {
        if (!newLine.componentVariantId) { showToast('error', 'Vui lòng nhập mã biến thể linh kiện.'); return; }
        setActionLoading(true);
        try {
            await repairApi.addRepairLine(id, {
                componentVariantId: Number(newLine.componentVariantId),
                actionType:         newLine.actionType,
                quantity:           Number(newLine.quantity),
                unitPrice:          newLine.isFreeWarranty ? 0 : Number(newLine.unitPrice),
                isFreeWarranty:     newLine.isFreeWarranty,
                serialNumberId:     newLine.serialNumberId ? Number(newLine.serialNumberId) : null,
                note:               newLine.note || null,
            });
            showToast('success', 'Đã thêm linh kiện!');
            setNewLine(emptyLine());
            setAddingLine(false);
            loadLines();
            loadRepair();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Thêm linh kiện thất bại.');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Add Fee ───────────────────────────────────────────────────────────────
    const handleAddFee = async () => {
        if (!newFee.feeName?.trim()) { showToast('error', 'Vui lòng nhập tên phí dịch vụ.'); return; }
        setActionLoading(true);
        try {
            await repairApi.addRepairFee(id, {
                feeName:        newFee.feeName.trim(),
                feeAmount:      newFee.isFreeWarranty ? 0 : Number(newFee.feeAmount),
                isFreeWarranty: newFee.isFreeWarranty,
                note:           newFee.note || null,
            });
            showToast('success', 'Đã thêm phí dịch vụ!');
            setNewFee(emptyFee());
            setAddingFee(false);
            loadFees();
            loadRepair();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Thêm phí thất bại.');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AdminLayout>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f9f9f9', minWidth: 0 }}>
                {/* Odoo Control Panel */}
                <div className={styles.o_control_panel}>
                    <div className={styles.o_cp_left}>
                        {isCreate ? (
                            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu lệnh sửa chữa'}
                            </button>
                        ) : (
                            <>
                                {canEdit && (
                                    <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                )}
                                {transitions.map(t => (
                                    <button
                                        key={t.next}
                                        className={styles.btnOutline}
                                        disabled={actionLoading}
                                        onClick={() => setConfirmAction({ label: t.label, fn: () => handleStatusUpdate(t.next) })}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                                {canCancel && (
                                    <button
                                        className={styles.btnOutline}
                                        disabled={actionLoading}
                                        onClick={() => setConfirmAction({ label: 'Hủy sửa chữa', fn: () => handleStatusUpdate('CANCELLED') })}
                                    >
                                        Hủy sửa chữa
                                    </button>
                                )}
                            </>
                        )}
                        <button className={styles.btnOutline} onClick={() => navigate('/repair-tickets')}>
                            Quay lại
                        </button>
                    </div>
                    <div className={styles.o_cp_right}>
                        {!isCreate && repair && repair.repairStatus !== 'CANCELLED' && (
                            <div className={styles.statusBar} style={{ marginBottom: 0 }}>
                                {STATUS_ORDER.map((s, i) => {
                                    let cls = styles.statusStep;
                                    if (i < currentStatusIdx) cls += ' ' + styles.statusStepDone;
                                    if (i === currentStatusIdx) cls += ' ' + styles.statusStepActive;
                                    return <div key={s} className={cls}>{STATUS_LABELS_VN[s]}</div>;
                                })}
                            </div>
                        )}
                        {repair?.repairStatus === 'CANCELLED' && (
                            <div className={styles.statusBar} style={{ marginBottom: 0 }}>
                                <div className={`${styles.statusStep} ${styles.statusStepCancelled}`}>Đã hủy</div>
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className={styles.emptyState}><div className={styles.emptyText}>Đang tải dữ liệu...</div></div>
                ) : (
                    <div className={styles.o_form_sheet_bg} style={{ flex: 1, overflowY: 'auto' }}>
                        <div className={styles.o_form_sheet}>
                            {/* Title */}
                            <div className={styles.o_form_title}>
                                <span className={styles.o_form_label_small}>MÃ LỆNH SỬA CHỮA</span>
                                <div className={styles.o_form_title_large}>
                                    <i className="bi bi-star" style={{ color: '#ffb300', marginRight: '12px', fontSize: '24px' }} />
                                    <span>{isCreate ? 'Mới' : (repair?.repairCode ?? '...')}</span>
                                </div>
                            </div>

                            {/* 2-Column Form */}
                            <div className={styles.o_form_group}>
                                {/* Left Column */}
                                <div className={styles.o_inner_group}>
                                    <div className={styles.o_cell}>
                                        <label className={styles.o_field_label}>Khách hàng</label>
                                        <div className={styles.o_field_value} style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            {canEdit ? (
                                                <>
                                                    <div style={{ flex: 1 }}>
                                                        <Select
                                                            options={customers.map(c => ({ value: c.id, label: `[${c.partnerCode}] ${c.name} - ${c.phone}` }))}
                                                            value={customers.find(c => c.id === Number(form.partnerId)) ? { value: form.partnerId, label: `[${customers.find(c => c.id === Number(form.partnerId))?.partnerCode}] ${customers.find(c => c.id === Number(form.partnerId))?.name}` } : null}
                                                            onChange={val => setField('partnerId', val?.value || '')}
                                                            placeholder="Chọn khách hàng..."
                                                            isClearable
                                                            styles={{ control: (base) => ({ ...base, border: 'none', borderBottom: '1px solid #ccc', borderRadius: 0, boxShadow: 'none', minHeight: '32px' }) }}
                                                        />
                                                    </div>
                                                    <button type="button" className={styles.btnOutline} style={{ padding: '0 8px' }} onClick={() => setIsCustomerDrawerOpen(true)}>
                                                        <i className="bi bi-plus-lg"></i>
                                                    </button>
                                                </>
                                            ) : (
                                                <span>{form.partnerId ? (customers.find(c => c.id === Number(form.partnerId))?.name || `Khách hàng #${form.partnerId}`) : '—'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.o_cell}>
                                        <label className={styles.o_field_label}>Sản phẩm cần sửa</label>
                                        <div className={styles.o_field_value} style={{ width: '100%' }}>
                                            {canEdit ? (
                                                <Select
                                                    options={products.map(p => ({ value: p.id, label: `[${p.variantCode}] ${p.productName}` }))}
                                                    value={products.find(p => p.id === Number(form.productId)) ? { value: form.productId, label: `[${products.find(p => p.id === Number(form.productId))?.variantCode}] ${products.find(p => p.id === Number(form.productId))?.productName}` } : null}
                                                    onChange={val => setField('productId', val?.value || '')}
                                                    placeholder="Chọn sản phẩm..."
                                                    isClearable
                                                    styles={{ control: (base) => ({ ...base, border: 'none', borderBottom: '1px solid #ccc', borderRadius: 0, boxShadow: 'none', minHeight: '32px' }) }}
                                                />
                                            ) : (
                                                <span>{form.productId ? (products.find(p => p.id === Number(form.productId))?.productName || `[SP-${form.productId}] Sản phẩm #${form.productId}`) : '—'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.o_cell}>
                                        <label className={styles.o_field_label}>Số Serial máy</label>
                                        <div className={styles.o_field_value}>
                                            {canEdit ? (
                                                <input
                                                    type="number"
                                                    className={styles.o_input_borderless}
                                                    value={form.serialNumberId}
                                                    onChange={e => setField('serialNumberId', e.target.value)}
                                                    placeholder="Tùy chọn..."
                                                />
                                            ) : (
                                                <span>{form.serialNumberId || '—'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.o_cell}>
                                        <label className={styles.o_field_label}>Đang bảo hành</label>
                                        <div className={styles.o_field_value}>
                                            <input
                                                type="checkbox"
                                                className={styles.o_checkbox}
                                                checked={form.underWarranty}
                                                onChange={e => canEdit && setField('underWarranty', e.target.checked)}
                                                disabled={!canEdit}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.o_cell} style={{ alignItems: 'flex-start', paddingTop: '8px' }}>
                                        <label className={styles.o_field_label}>Mô tả lỗi</label>
                                        <div className={styles.o_field_value}>
                                            {canEdit ? (
                                                <textarea
                                                    className={styles.o_input_borderless}
                                                    style={{ resize: 'vertical', minHeight: '60px', padding: '4px 0' }}
                                                    value={form.issueDescription}
                                                    onChange={e => setField('issueDescription', e.target.value)}
                                                    placeholder="Chi tiết lỗi..."
                                                />
                                            ) : (
                                                <span style={{ whiteSpace: 'pre-wrap' }}>{form.issueDescription || '—'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className={styles.o_inner_group}>
                                    <div className={styles.o_cell}>
                                        <label className={styles.o_field_label}>Ngày tiếp nhận</label>
                                        <div className={styles.o_field_value}>
                                            <span>{isCreate ? fmtDate(new Date()) : fmtDate(repair?.receivedDate)}</span>
                                        </div>
                                    </div>
                                    <div className={styles.o_cell}>
                                        <label className={styles.o_field_label}>Người phụ trách</label>
                                        <div className={styles.o_field_value}>
                                            <span>{isCreate ? `Nhân viên #${localStorage.getItem('userId') || '1'}` : (repair?.createdBy ? `Nhân viên #${repair.createdBy}` : '—')}</span>
                                        </div>
                                    </div>
                                    <div className={styles.o_cell}>
                                        <label className={styles.o_field_label}>Phương thức HĐ</label>
                                        <div className={styles.o_field_value}>
                                            {canEdit ? (
                                                <select
                                                    className={styles.o_input_borderless}
                                                    value={form.invoiceMethod}
                                                    onChange={e => setField('invoiceMethod', e.target.value)}
                                                >
                                                    <option value="none">Không xuất hóa đơn</option>
                                                    <option value="b4repair">Trước sửa chữa</option>
                                                    <option value="after_repair">Sau sửa chữa</option>
                                                </select>
                                            ) : (
                                                <span>{INVOICE_METHOD_LABELS[form.invoiceMethod]}</span>
                                            )}
                                        </div>
                                    </div>
                                    {!isCreate && repair && (
                                        <>
                                            <div className={styles.o_cell}>
                                                <label className={styles.o_field_label}>Tổng chi phí</label>
                                                <div className={styles.o_field_value}>
                                                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmtMoney(repair.totalAmount)}</span>
                                                </div>
                                            </div>
                                            <div className={styles.o_cell}>
                                                <label className={styles.o_field_label}>Dự kiến / Thực tế hoàn tất</label>
                                                <div className={styles.o_field_value}>
                                                    <span>{fmtDate(repair.expectedDate)} / {fmtDate(repair.completedDate)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Notebook Tabs */}
                            {isCreate ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '14px', borderTop: '1px solid var(--color-border)' }}>
                                    <i className="bi bi-info-circle" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }} />
                                    Lưu lệnh để bắt đầu thêm linh kiện và ghi chú.
                                </div>
                            ) : (
                                <div className={styles.o_notebook}>
                                    <div className={styles.o_notebook_headers}>
                                        <button className={activeTab === 'lines' ? styles.o_nav_link_active : styles.o_nav_link} onClick={() => setActiveTab('lines')}>Linh kiện</button>
                                        <button className={activeTab === 'fees' ? styles.o_nav_link_active : styles.o_nav_link} onClick={() => setActiveTab('fees')}>Phí dịch vụ</button>
                                        <button className={activeTab === 'notes' ? styles.o_nav_link_active : styles.o_nav_link} onClick={() => setActiveTab('notes')}>Ghi chú sửa chữa</button>
                                    </div>
                                    
                                    <div className={styles.o_notebook_content} style={{ minHeight: '200px' }}>
                                        {/* Tab: Lines */}
                                        {activeTab === 'lines' && (
                                            <>
                                                <table className={styles.o_list_view_table}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '130px' }}>Loại thao tác</th>
                                                            <th>Sản phẩm (Biến thể)</th>
                                                            <th style={{ width: '100px', textAlign: 'right' }}>SL dự kiến</th>
                                                            <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                                                            <th style={{ width: '100px', textAlign: 'center' }}>Đã sử dụng</th>
                                                            <th style={{ width: '100px', textAlign: 'center' }}>Bảo hành</th>
                                                            {canEdit && <th style={{ width: '40px', textAlign: 'center' }}><i className="bi bi-sliders" /></th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {lines.map((l) => (
                                                            <tr key={l.id}>
                                                                <td>{l.actionType === 'ADD' ? 'Thêm mới linh kiện' : 'Thu hồi'}</td>
                                                                <td className={styles.textBlue}>[{l.componentVariantId}] Biến thể #{l.componentVariantId}</td>
                                                                <td className={styles.textRight}>{Number(l.quantity).toLocaleString('vi-VN')}</td>
                                                                <td className={styles.textRight}>{l.isFreeWarranty ? '0 đ' : fmtMoney(l.unitPrice)}</td>
                                                                <td className={styles.textCenter}><input type="checkbox" disabled checked={false} /></td>
                                                                <td className={styles.textCenter}>{l.isFreeWarranty ? <i className="bi bi-check-circle-fill" style={{color: 'var(--color-success)'}}/> : ''}</td>
                                                                {canEdit && <td className={styles.textCenter}><i className="bi bi-three-dots" style={{cursor: 'pointer'}} /></td>}
                                                            </tr>
                                                        ))}
                                                        
                                                        {/* Add new line row */}
                                                        {canEdit && addingLine && (
                                                            <tr style={{ backgroundColor: '#fffbe6' }}>
                                                                <td>
                                                                    <select className={styles.addLineSelect} value={newLine.actionType} onChange={e => setNewLine(p => ({ ...p, actionType: e.target.value }))}>
                                                                        <option value="ADD">Thêm mới</option>
                                                                        <option value="REMOVE">Thu hồi</option>
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <input type="number" className={styles.addLineInput} placeholder="ID linh kiện..." value={newLine.componentVariantId} onChange={e => setNewLine(p => ({ ...p, componentVariantId: e.target.value }))} autoFocus />
                                                                </td>
                                                                <td>
                                                                    <input type="number" className={styles.addLineInput} style={{ textAlign: 'right' }} value={newLine.quantity} onChange={e => setNewLine(p => ({ ...p, quantity: e.target.value }))} min="0.0001" step="0.0001" />
                                                                </td>
                                                                <td>
                                                                    <input type="number" className={styles.addLineInput} style={{ textAlign: 'right' }} value={newLine.unitPrice} onChange={e => setNewLine(p => ({ ...p, unitPrice: e.target.value }))} disabled={newLine.isFreeWarranty} min="0" />
                                                                </td>
                                                                <td colSpan={2} className={styles.textCenter}>
                                                                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                                                        <input type="checkbox" checked={newLine.isFreeWarranty} onChange={e => setNewLine(p => ({ ...p, isFreeWarranty: e.target.checked }))} /> BH Miễn phí
                                                                    </label>
                                                                </td>
                                                                <td style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                    <button className={styles.iconBtnPrimary} onClick={handleAddLine} disabled={actionLoading}><i className="bi bi-check-lg" /></button>
                                                                    <button className={styles.iconBtnDanger} onClick={() => { setAddingLine(false); setNewLine(emptyLine()); }}><i className="bi bi-x-lg" /></button>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                {canEdit && !addingLine && (
                                                    <div style={{ marginTop: '12px' }}>
                                                        <a href="#" className={styles.link} onClick={e => { e.preventDefault(); setAddingLine(true); }}>Thêm một dòng</a>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Tab: Fees */}
                                        {activeTab === 'fees' && (
                                            <>
                                                <table className={styles.o_list_view_table}>
                                                    <thead>
                                                        <tr>
                                                            <th>Tên phí dịch vụ</th>
                                                            <th style={{ width: '140px', textAlign: 'right' }}>Số tiền</th>
                                                            <th style={{ width: '100px', textAlign: 'center' }}>Bảo hành</th>
                                                            <th>Ghi chú</th>
                                                            {canEdit && <th style={{ width: '40px', textAlign: 'center' }}><i className="bi bi-sliders" /></th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {fees.map((f) => (
                                                            <tr key={f.id}>
                                                                <td>{f.feeName}</td>
                                                                <td className={styles.textRight}>{f.isFreeWarranty ? '0 đ' : fmtMoney(f.feeAmount)}</td>
                                                                <td className={styles.textCenter}>{f.isFreeWarranty ? <i className="bi bi-check-circle-fill" style={{color: 'var(--color-success)'}}/> : ''}</td>
                                                                <td>{f.note || '—'}</td>
                                                                {canEdit && <td className={styles.textCenter}><i className="bi bi-three-dots" style={{cursor: 'pointer'}} /></td>}
                                                            </tr>
                                                        ))}
                                                        {canEdit && addingFee && (
                                                            <tr style={{ backgroundColor: '#fffbe6' }}>
                                                                <td><input type="text" className={styles.addLineInput} placeholder="Tên phí..." value={newFee.feeName} onChange={e => setNewFee(p => ({ ...p, feeName: e.target.value }))} autoFocus /></td>
                                                                <td><input type="number" className={styles.addLineInput} style={{ textAlign: 'right' }} value={newFee.feeAmount} onChange={e => setNewFee(p => ({ ...p, feeAmount: e.target.value }))} disabled={newFee.isFreeWarranty} min="0" /></td>
                                                                <td className={styles.textCenter}><input type="checkbox" checked={newFee.isFreeWarranty} onChange={e => setNewFee(p => ({ ...p, isFreeWarranty: e.target.checked }))} /></td>
                                                                <td><input type="text" className={styles.addLineInput} placeholder="Ghi chú..." value={newFee.note} onChange={e => setNewFee(p => ({ ...p, note: e.target.value }))} /></td>
                                                                <td style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                    <button className={styles.iconBtnPrimary} onClick={handleAddFee} disabled={actionLoading}><i className="bi bi-check-lg" /></button>
                                                                    <button className={styles.iconBtnDanger} onClick={() => { setAddingFee(false); setNewFee(emptyFee()); }}><i className="bi bi-x-lg" /></button>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                {canEdit && !addingFee && (
                                                    <div style={{ marginTop: '12px' }}>
                                                        <a href="#" className={styles.link} onClick={e => { e.preventDefault(); setAddingFee(true); }}>Thêm phí dịch vụ</a>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Tab: Notes */}
                                        {activeTab === 'notes' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                <div className={styles.o_cell} style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                                                    <label className={styles.o_form_label_small}>Ghi chú chẩn đoán (Nội bộ)</label>
                                                    {canEdit ? (
                                                        <textarea className={styles.formTextarea} style={{ border: 'none', borderBottom: '1px solid #ccc', minHeight: '60px' }} value={form.diagnosisNote} onChange={e => setField('diagnosisNote', e.target.value)} placeholder="Nhập ghi chú..." />
                                                    ) : (
                                                        <p style={{ margin: 0 }}>{form.diagnosisNote || '—'}</p>
                                                    )}
                                                </div>
                                                <div className={styles.o_cell} style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                                                    <label className={styles.o_form_label_small}>Giải pháp xử lý</label>
                                                    {canEdit ? (
                                                        <textarea className={styles.formTextarea} style={{ border: 'none', borderBottom: '1px solid #ccc', minHeight: '60px' }} value={form.solutionDescription} onChange={e => setField('solutionDescription', e.target.value)} placeholder="Nhập giải pháp..." />
                                                    ) : (
                                                        <p style={{ margin: 0 }}>{form.solutionDescription || '—'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Modal */}
            {confirmAction && (
                <ConfirmModal
                    isOpen={!!confirmAction}
                    title="Xác nhận thao tác"
                    message={`Bạn có chắc chắn muốn "${confirmAction.label}"?`}
                    onConfirm={() => { confirmAction.fn(); }}
                    onCancel={() => setConfirmAction(null)}
                />
            )}

            <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />

            {/* Customer Quick Create Drawer */}
            <CustomerQuickCreateDrawer
                isOpen={isCustomerDrawerOpen}
                onClose={() => setIsCustomerDrawerOpen(false)}
                onSaved={(newCustomer) => {
                    setIsCustomerDrawerOpen(false);
                    loadOptions().then(() => setField('partnerId', newCustomer.id));
                    showToast('success', 'Thêm khách hàng thành công!');
                }}
            />
        </AdminLayout>
    );
}

export default RepairDetailPage;
