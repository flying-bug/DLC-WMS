import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import * as repairTicketApi from '../../api/repairTicketApi';
import styles from './CreateRepairTicketPage.module.css';

const today = () => new Date().toLocaleDateString('sv-SE');
const unwrap = (response) => response?.data?.data ?? response?.data;

const readPartner = (warranty) => ({
    id: warranty.partnerId || warranty.partner?.id,
    name: warranty.partnerName || warranty.customerName || warranty.partner?.name || 'KhÃ¡ch láº»',
    phone: warranty.partnerPhone || warranty.customerPhone || warranty.partner?.phone || 'ChÆ°a cÃ³'
});

const readSerial = (warranty) => ({
    id: warranty.serialNumberId || warranty.serialNumber?.id,
    code: warranty.serialCode || warranty.serialNumber || warranty.serialNumberValue || warranty.serialNumber?.serialNo || warranty.serialNumber?.serialNumber || 'ChÆ°a cÃ³',
    productName: warranty.productName || warranty.variantName || warranty.serialNumber?.productName || warranty.serialNumber?.variant?.variantName || 'ChÆ°a rÃµ sáº£n pháº©m'
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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c thÃ´ng tin báº£o hÃ nh.');
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
            setError('Vui lÃ²ng chá»n báº£o hÃ nh vÃ  nháº­p mÃ´ táº£ lá»—i.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const response = await repairTicketApi.createRepairTicket(buildPayload());
            const created = unwrap(response);
            navigate(created?.id ? `/repair-tickets/${created.id}/edit` : `/warranties/${warrantyId}`);
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng táº¡o Ä‘Æ°á»£c phiáº¿u sá»­a chá»¯a.');
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
                            Quay láº¡i báº£o hÃ nh
                        </button>
                        <h1 className={styles.title}>Táº¡o phiáº¿u sá»­a chá»¯a</h1>
                        <p className={styles.subtitle}>Ghi nháº­n lá»—i, cháº©n Ä‘oÃ¡n ban Ä‘áº§u vÃ  linh kiá»‡n dá»± kiáº¿n cho há»“ sÆ¡ báº£o hÃ nh.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className="btn-misa-cancel" type="button" onClick={() => navigate(warrantyId ? `/warranties/${warrantyId}` : '/warranties')}>Há»§y</button>
                        <button className="btn-misa-save" type="button" onClick={submit} disabled={saving || !canSubmit}>
                            <i className="bi bi-check2"></i>
                            {saving ? 'Äang lÆ°u...' : 'LÆ°u phiáº¿u sá»­a'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.grid}>
                    <section className={styles.card}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-shield-check"></i>
                            Báº£o hÃ nh liÃªn káº¿t
                        </div>
                        {loadingWarranty ? (
                            <div className={styles.emptyBox}>Äang táº£i báº£o hÃ nh...</div>
                        ) : warranty ? (
                            <div className={styles.infoGrid}>
                                <InfoItem label="MÃ£ báº£o hÃ nh" value={warranty.warrantyCode} />
                                <InfoItem label="KhÃ¡ch hÃ ng" value={partner.name} />
                                <InfoItem label="Äiá»‡n thoáº¡i" value={partner.phone} />
                                <InfoItem label="Serial" value={serial.code} />
                                <InfoItem label="Sáº£n pháº©m" value={serial.productName} wide />
                            </div>
                        ) : (
                            <div className={styles.emptyBox}>Má»Ÿ mÃ n hÃ¬nh tá»« chi tiáº¿t báº£o hÃ nh Ä‘á»ƒ tá»± Ä‘á»™ng liÃªn káº¿t warrantyId.</div>
                        )}
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-file-earmark-medical"></i>
                            ThÃ´ng tin phiáº¿u
                        </div>
                        <div className="misa-form-row">
                            <div className="misa-form-group">
                                <label className="misa-label">MÃ£ phiáº¿u sá»­a</label>
                                <input className="misa-input" value={form.repairCode} onChange={(event) => updateForm('repairCode', event.target.value)} placeholder="Äá»ƒ trá»‘ng Ä‘á»ƒ tá»± sinh" />
                            </div>
                            <div className="misa-form-group">
                                <label className="misa-label">NgÃ y tiáº¿p nháº­n <span className="required">*</span></label>
                                <input type="date" className="misa-input" value={form.receivedDate} onChange={(event) => updateForm('receivedDate', event.target.value)} />
                            </div>
                        </div>
                        <div className="misa-form-row" style={{ marginTop: '12px' }}>
                            <div className="misa-form-group">
                                <label className="misa-label">Tráº¡ng thÃ¡i</label>
                                <select className="misa-select" value={form.repairStatus} onChange={(event) => updateForm('repairStatus', event.target.value)}>
                                    <option value="RECEIVED">ÄÃ£ tiáº¿p nháº­n</option>
                                    <option value="REPAIRING">Äang sá»­a</option>
                                    <option value="DRAFT">NhÃ¡p</option>
                                </select>
                            </div>
                            <div className="misa-form-group">
                                <label className="misa-label">NgÃ y dá»± kiáº¿n xong</label>
                                <input type="date" className="misa-input" value={form.expectedDate} onChange={(event) => updateForm('expectedDate', event.target.value)} />
                            </div>
                        </div>
                    </section>
                </div>

                <section className={styles.card} style={{ marginTop: '20px' }}>
                    <div className={styles.cardTitle}>
                        <i className="bi bi-clipboard2-pulse"></i>
                        Ná»™i dung sá»­a chá»¯a
                    </div>
                    <div className="misa-form-row">
                        <div className="misa-form-group">
                            <label className="misa-label">MÃ´ táº£ lá»—i khÃ¡ch bÃ¡o <span className="required">*</span></label>
                            <textarea className="misa-textarea" value={form.issueDescription} onChange={(event) => updateForm('issueDescription', event.target.value)} rows="3" placeholder="Nháº­p hiá»‡n tÆ°á»£ng lá»—i, thá»i Ä‘iá»ƒm phÃ¡t sinh..." />
                        </div>
                        <div className="misa-form-group">
                            <label className="misa-label">Cháº©n Ä‘oÃ¡n ban Ä‘áº§u</label>
                            <textarea className="misa-textarea" value={form.diagnosisNote} onChange={(event) => updateForm('diagnosisNote', event.target.value)} rows="3" placeholder="Nháº­p káº¿t quáº£ kiá»ƒm tra ban Ä‘áº§u..." />
                        </div>
                    </div>
                    <div className="misa-form-row" style={{ marginTop: '12px' }}>
                        <div className="misa-form-group">
                            <label className="misa-label">Ghi chÃº ná»™i bá»™</label>
                            <textarea className="misa-textarea" value={form.note} onChange={(event) => updateForm('note', event.target.value)} rows="2" placeholder="Ghi chÃº cho ká»¹ thuáº­t/kho..." />
                        </div>
                        <div className="misa-form-group">
                            <label className="misa-label">Chi phÃ­ dá»± kiáº¿n</label>
                            <input type="number" min="0" className="misa-input" value={form.repairCost} onChange={(event) => updateForm('repairCost', event.target.value)} />
                        </div>
                    </div>
                </section>

                <section className={styles.card} style={{ marginTop: '20px' }}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.cardTitle}>
                            <i className="bi bi-cpu"></i>
                            Linh kiá»‡n dá»± kiáº¿n
                        </div>
                        <button className={styles.outlineButton} type="button" onClick={addPart}>
                            <i className="bi bi-plus-lg"></i>
                            ThÃªm dÃ²ng
                        </button>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>SKU linh kiá»‡n</th>
                                    <th style={{ width: '120px' }}>Sá»‘ lÆ°á»£ng</th>
                                    <th>Ghi chÃº</th>
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
                                            <input className="misa-input" style={{ height: '32px', padding: '0 8px', fontSize: '13px' }} value={part.note} onChange={(event) => updatePart(part.localId, 'note', event.target.value)} placeholder="LÃ½ do thay/thÃªm linh kiá»‡n" />
                                        </td>
                                        <td className={styles.actionCell}>
                                            <button className={styles.iconButton} type="button" onClick={() => removePart(part.localId)} title="XÃ³a dÃ²ng">
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
            <strong className={styles.infoValue}>{value || 'ChÆ°a cÃ³'}</strong>
        </div>
    );
}

export default CreateRepairTicketPage;
