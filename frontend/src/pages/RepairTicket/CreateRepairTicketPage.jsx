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
    name: warranty.partnerName || warranty.customerName || warranty.partner?.name || 'Khach le',
    phone: warranty.partnerPhone || warranty.customerPhone || warranty.partner?.phone || 'Chua co'
});

const readSerial = (warranty) => ({
    id: warranty.serialNumberId || warranty.serialNumber?.id,
    code: warranty.serialCode || warranty.serialNumber || warranty.serialNumberValue || warranty.serialNumber?.serialNo || warranty.serialNumber?.serialNumber || 'Chua co',
    productName: warranty.productName || warranty.variantName || warranty.serialNumber?.productName || warranty.serialNumber?.variant?.variantName || 'Chua ro san pham'
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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Khong tai duoc thong tin bao hanh.');
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
            setError('Vui long chon bao hanh va nhap mo ta loi.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const response = await repairTicketApi.createRepairTicket(buildPayload());
            const created = unwrap(response);
            navigate(created?.id ? `/repair-tickets/${created.id}/edit` : `/warranties/${warrantyId}`);
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Khong tao duoc phieu sua chua.');
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
                            Quay lai bao hanh
                        </button>
                        <h1 className={styles.title}>Tao phieu sua chua</h1>
                        <p className={styles.subtitle}>Ghi nhan loi, chan doan ban dau va linh kien du kien cho ho so bao hanh.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.outlineButton} type="button" onClick={() => navigate(warrantyId ? `/warranties/${warrantyId}` : '/warranties')}>Huy</button>
                        <button className={styles.primaryButton} type="button" onClick={submit} disabled={saving || !canSubmit}>
                            <i className="bi bi-check2"></i>
                            {saving ? 'Dang luu...' : 'Luu phieu sua'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.grid}>
                    <section className={styles.card}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-shield-check"></i>
                            Bao hanh lien ket
                        </div>
                        {loadingWarranty ? (
                            <div className={styles.emptyBox}>Dang tai bao hanh...</div>
                        ) : warranty ? (
                            <div className={styles.infoGrid}>
                                <InfoItem label="Ma bao hanh" value={warranty.warrantyCode} />
                                <InfoItem label="Khach hang" value={partner.name} />
                                <InfoItem label="Dien thoai" value={partner.phone} />
                                <InfoItem label="Serial" value={serial.code} />
                                <InfoItem label="San pham" value={serial.productName} wide />
                            </div>
                        ) : (
                            <div className={styles.emptyBox}>Mo man hinh tu chi tiet bao hanh de tu dong lien ket warrantyId.</div>
                        )}
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-file-earmark-medical"></i>
                            Thong tin phieu
                        </div>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>Ma phieu sua</span>
                                <input value={form.repairCode} onChange={(event) => updateForm('repairCode', event.target.value)} placeholder="De trong de tu sinh" />
                            </label>
                            <label className={styles.field}>
                                <span>Ngay tiep nhan</span>
                                <input type="date" value={form.receivedDate} onChange={(event) => updateForm('receivedDate', event.target.value)} />
                            </label>
                            <label className={styles.field}>
                                <span>Trang thai</span>
                                <select value={form.repairStatus} onChange={(event) => updateForm('repairStatus', event.target.value)}>
                                    <option value="RECEIVED">Da tiep nhan</option>
                                    <option value="REPAIRING">Dang sua</option>
                                    <option value="DRAFT">Nhap</option>
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>Ngay du kien xong</span>
                                <input type="date" value={form.expectedDate} onChange={(event) => updateForm('expectedDate', event.target.value)} />
                            </label>
                        </div>
                    </section>
                </div>

                <section className={styles.card}>
                    <div className={styles.cardTitle}>
                        <i className="bi bi-clipboard2-pulse"></i>
                        Noi dung sua chua
                    </div>
                    <div className={styles.textGrid}>
                        <label className={styles.field}>
                            <span>Mo ta loi khach bao</span>
                            <textarea value={form.issueDescription} onChange={(event) => updateForm('issueDescription', event.target.value)} rows="4" placeholder="Nhap hien tuong loi, thoi diem phat sinh..." />
                        </label>
                        <label className={styles.field}>
                            <span>Chan doan ban dau</span>
                            <textarea value={form.diagnosisNote} onChange={(event) => updateForm('diagnosisNote', event.target.value)} rows="4" placeholder="Nhap ket qua kiem tra ban dau..." />
                        </label>
                        <label className={styles.field}>
                            <span>Ghi chu noi bo</span>
                            <textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} rows="3" placeholder="Ghi chu cho ky thuat/kho..." />
                        </label>
                        <label className={styles.field}>
                            <span>Chi phi du kien</span>
                            <input type="number" min="0" value={form.repairCost} onChange={(event) => updateForm('repairCost', event.target.value)} />
                        </label>
                    </div>
                </section>

                <section className={styles.card}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-cpu"></i>
                            Linh kien du kien
                        </div>
                        <button className={styles.outlineButton} type="button" onClick={addPart}>
                            <i className="bi bi-plus-lg"></i>
                            Them dong
                        </button>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>SKU linh kien</th>
                                    <th>So luong</th>
                                    <th>Ghi chu</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {parts.map((part) => (
                                    <tr key={part.localId}>
                                        <td><input value={part.sku} onChange={(event) => updatePart(part.localId, 'sku', event.target.value)} placeholder="VD: RAM-8GB" /></td>
                                        <td><input type="number" min="1" value={part.quantity} onChange={(event) => updatePart(part.localId, 'quantity', event.target.value)} /></td>
                                        <td><input value={part.note} onChange={(event) => updatePart(part.localId, 'note', event.target.value)} placeholder="Ly do thay/them linh kien" /></td>
                                        <td className={styles.actionCell}>
                                            <button className={styles.iconButton} type="button" onClick={() => removePart(part.localId)} title="Xoa dong">
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
            <strong className={styles.infoValue}>{value || 'Chua co'}</strong>
        </div>
    );
}

export default CreateRepairTicketPage;
