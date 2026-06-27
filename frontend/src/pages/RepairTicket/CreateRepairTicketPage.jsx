import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import * as repairTicketApi from '../../api/repairTicketApi';
import styles from './CreateRepairTicketPage.module.css';

const today = () => new Date().toISOString().slice(0, 10);
const unwrap = (response) => response?.data?.data ?? response?.data;

const readPartner = (warranty) => ({
    id: warranty.partnerId || warranty.partner?.id,
    name: warranty.partnerName || warranty.customerName || warranty.partner?.name || 'Khách lẻ',
    phone: warranty.partnerPhone || warranty.customerPhone || warranty.partner?.phone || 'Chưa có'
});

const readSerial = (warranty) => ({
    id: warranty.serialNumberId || warranty.serialNumber?.id,
    code: warranty.serialCode || warranty.serialNumber || warranty.serialNumberValue || warranty.serialNumber?.serialNo || warranty.serialNumber?.serialNumber || 'Chưa có',
    productName: warranty.productName || warranty.variantName || warranty.serialNumber?.productName || warranty.serialNumber?.variant?.variantName || 'Chưa rõ sản phẩm'
});

function CreateRepairTicketPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const warrantyId = searchParams.get('warrantyId') || '';
    const [warranty, setWarranty] = useState(null);
    const [loadingWarranty, setLoadingWarranty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        repairCode: '',
        receivedDate: today(),
        repairStatus: 'RECEIVED',
        issueDescription: '',
        diagnosisNote: '',
        expectedDate: '',
        repairCost: 0,
        note: ''
    });
    const [parts, setParts] = useState([{ localId: crypto.randomUUID(), sku: '', quantity: 1, note: '' }]);

    const loadWarranty = useCallback(async () => {
        if (!warrantyId) {
            return;
        }
        setLoadingWarranty(true);
        setError('');
        try {
            const response = await warrantyApi.getWarrantyById(warrantyId);
            setWarranty(unwrap(response));
        } catch (err) {
            setWarranty(null);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được thông tin bảo hành.');
        } finally {
            setLoadingWarranty(false);
        }
    }, [warrantyId]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadWarranty();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadWarranty]);

    const partner = useMemo(() => readPartner(warranty || {}), [warranty]);
    const serial = useMemo(() => readSerial(warranty || {}), [warranty]);
    const canSubmit = Boolean(warrantyId && warranty && form.receivedDate && form.issueDescription.trim());

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const updatePart = (localId, field, value) => {
        setParts((current) => current.map((part) => part.localId === localId ? { ...part, [field]: value } : part));
    };

    const addPart = () => {
        setParts((current) => [...current, { localId: crypto.randomUUID(), sku: '', quantity: 1, note: '' }]);
    };

    const removePart = (localId) => {
        setParts((current) => current.length > 1 ? current.filter((part) => part.localId !== localId) : current);
    };

    const buildPayload = () => ({
        repairCode: form.repairCode || undefined,
        warrantyId: Number(warrantyId),
        partnerId: Number(partner.id),
        serialNumberId: Number(serial.id),
        receivedDate: form.receivedDate,
        repairStatus: form.repairStatus,
        issueDescription: form.issueDescription.trim(),
        diagnosisNote: form.diagnosisNote.trim(),
        expectedDate: form.expectedDate || undefined,
        repairCost: Number(form.repairCost || 0),
        note: form.note.trim(),
        requestedParts: parts
            .filter((part) => part.sku.trim())
            .map((part) => ({
                sku: part.sku.trim().toUpperCase(),
                quantity: Number(part.quantity || 0),
                note: part.note.trim()
            }))
    });

    const submit = async () => {
        if (!canSubmit) {
            setError('Vui lòng chọn bảo hành và nhập mô tả lỗi.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const response = await repairTicketApi.createRepairTicket(buildPayload());
            const created = unwrap(response);
            navigate(created?.id ? `/repair-tickets/${created.id}/edit` : `/warranties/${warrantyId}`);
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tạo được phiếu sửa chữa.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <div>
                        <button className={styles.backButton} type="button" onClick={() => navigate(warrantyId ? `/warranties/${warrantyId}` : '/warranties')}>
                            <i className="bi bi-arrow-left"></i>
                            Quay lại bảo hành
                        </button>
                        <h1 className={styles.title}>Tạo phiếu sửa chữa</h1>
                        <p className={styles.subtitle}>Ghi nhận lỗi, chẩn đoán ban đầu và linh kiện dự kiến cho hồ sơ bảo hành.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className="btn-misa-cancel" type="button" onClick={() => navigate(warrantyId ? `/warranties/${warrantyId}` : '/warranties')}>Hủy</button>
                        <button className="btn-misa-save" type="button" onClick={submit} disabled={saving || !canSubmit}>
                            <i className="bi bi-check2"></i>
                            {saving ? 'Đang lưu...' : 'Lưu phiếu sửa'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.grid}>
                    <section className={styles.card}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-shield-check"></i>
                            Bảo hành liên kết
                        </div>
                        {loadingWarranty ? (
                            <div className={styles.emptyBox}>Đang tải bảo hành...</div>
                        ) : warranty ? (
                            <div className={styles.infoGrid}>
                                <InfoItem label="Mã bảo hành" value={warranty.warrantyCode} />
                                <InfoItem label="Khách hàng" value={partner.name} />
                                <InfoItem label="Điện thoại" value={partner.phone} />
                                <InfoItem label="Serial" value={serial.code} />
                                <InfoItem label="Sản phẩm" value={serial.productName} wide />
                            </div>
                        ) : (
                            <div className={styles.emptyBox}>Mở màn hình từ chi tiết bảo hành để tự động liên kết warrantyId.</div>
                        )}
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-file-earmark-medical"></i>
                            Thông tin phiếu
                        </div>
                        <div className="misa-form-row">
                            <div className="misa-form-group">
                                <label className="misa-label">Mã phiếu sửa</label>
                                <input className="misa-input" value={form.repairCode} onChange={(event) => updateForm('repairCode', event.target.value)} placeholder="Để trống để tự sinh" />
                            </div>
                            <div className="misa-form-group">
                                <label className="misa-label">Ngày tiếp nhận <span className="required">*</span></label>
                                <input type="date" className="misa-input" value={form.receivedDate} onChange={(event) => updateForm('receivedDate', event.target.value)} />
                            </div>
                        </div>
                        <div className="misa-form-row" style={{ marginTop: '12px' }}>
                            <div className="misa-form-group">
                                <label className="misa-label">Trạng thái</label>
                                <select className="misa-select" value={form.repairStatus} onChange={(event) => updateForm('repairStatus', event.target.value)}>
                                    <option value="RECEIVED">Đã tiếp nhận</option>
                                    <option value="REPAIRING">Đang sửa</option>
                                    <option value="DRAFT">Nháp</option>
                                </select>
                            </div>
                            <div className="misa-form-group">
                                <label className="misa-label">Ngày dự kiến xong</label>
                                <input type="date" className="misa-input" value={form.expectedDate} onChange={(event) => updateForm('expectedDate', event.target.value)} />
                            </div>
                        </div>
                    </section>
                </div>

                <section className={styles.card} style={{ marginTop: '20px' }}>
                    <div className={styles.cardTitle}>
                        <i className="bi bi-clipboard2-pulse"></i>
                        Nội dung sửa chữa
                    </div>
                    <div className="misa-form-row">
                        <div className="misa-form-group">
                            <label className="misa-label">Mô tả lỗi khách báo <span className="required">*</span></label>
                            <textarea className="misa-textarea" value={form.issueDescription} onChange={(event) => updateForm('issueDescription', event.target.value)} rows="3" placeholder="Nhập hiện tượng lỗi, thời điểm phát sinh..." />
                        </div>
                        <div className="misa-form-group">
                            <label className="misa-label">Chẩn đoán ban đầu</label>
                            <textarea className="misa-textarea" value={form.diagnosisNote} onChange={(event) => updateForm('diagnosisNote', event.target.value)} rows="3" placeholder="Nhập kết quả kiểm tra ban đầu..." />
                        </div>
                    </div>
                    <div className="misa-form-row" style={{ marginTop: '12px' }}>
                        <div className="misa-form-group">
                            <label className="misa-label">Ghi chú nội bộ</label>
                            <textarea className="misa-textarea" value={form.note} onChange={(event) => updateForm('note', event.target.value)} rows="2" placeholder="Ghi chú cho kỹ thuật/kho..." />
                        </div>
                        <div className="misa-form-group">
                            <label className="misa-label">Chi phí dự kiến</label>
                            <input type="number" min="0" className="misa-input" value={form.repairCost} onChange={(event) => updateForm('repairCost', event.target.value)} />
                        </div>
                    </div>
                </section>

                <section className={styles.card} style={{ marginTop: '20px' }}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-cpu"></i>
                            Linh kiện dự kiến
                        </div>
                        <button className={styles.outlineButton} type="button" onClick={addPart}>
                            <i className="bi bi-plus-lg"></i>
                            Thêm dòng
                        </button>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>SKU linh kiện</th>
                                    <th style={{ width: '120px' }}>Số lượng</th>
                                    <th>Ghi chú</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {parts.map((part) => (
                                    <tr key={part.localId}>
                                        <td>
                                            <input className="misa-input" style={{ height: '32px', padding: '0 8px', fontSize: '13px' }} value={part.sku} onChange={(event) => updatePart(part.localId, 'sku', event.target.value)} placeholder="VD: RAM-8GB" />
                                        </td>
                                        <td>
                                            <input type="number" min="1" className="misa-input" style={{ height: '32px', padding: '0 8px', textAlign: 'center', fontSize: '13px' }} value={part.quantity} onChange={(event) => updatePart(part.localId, 'quantity', event.target.value)} />
                                        </td>
                                        <td>
                                            <input className="misa-input" style={{ height: '32px', padding: '0 8px', fontSize: '13px' }} value={part.note} onChange={(event) => updatePart(part.localId, 'note', event.target.value)} placeholder="Lý do thay/thêm linh kiện" />
                                        </td>
                                        <td className={styles.actionCell}>
                                            <button className={styles.iconButton} type="button" onClick={() => removePart(part.localId)} title="Xóa dòng">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

function InfoItem({ label, value, wide = false }) {
    return (
        <div className={wide ? styles.infoItemWide : styles.infoItem}>
            <span className={styles.infoLabel}>{label}</span>
            <strong className={styles.infoValue}>{value || 'Chưa có'}</strong>
        </div>
    );
}

export default CreateRepairTicketPage;
