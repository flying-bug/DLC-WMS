import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as repairTicketApi from '../../api/repairTicketApi';
import styles from './UpdateRepairTicketPage.module.css';

const STATUS_OPTIONS = [
    { value: 'RECEIVED', label: 'Da tiep nhan' },
    { value: 'REPAIRING', label: 'Dang sua' },
    { value: 'POSTED', label: 'Hoan tat' },
    { value: 'CANCELLED', label: 'Da huy' },
    { value: 'DRAFT', label: 'Nhap' },
    { value: 'SUBMITTED', label: 'Cho duyet' },
    { value: 'APPROVED', label: 'Da duyet' }
];

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chua co');
const toInputDate = (value) => (value ? String(value).slice(0, 10) : '');

const emptyForm = {
    repairCode: '',
    receivedDate: '',
    repairStatus: 'RECEIVED',
    issueDescription: '',
    diagnosisNote: '',
    resolutionNote: '',
    expectedDate: '',
    completedDate: '',
    repairCost: 0,
    note: ''
};

function UpdateRepairTicketPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadTicket = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await repairTicketApi.getRepairTicketById(id);
            const data = unwrap(response);
            setTicket(data);
            setForm({
                repairCode: data.repairCode || '',
                receivedDate: toInputDate(data.receivedDate),
                repairStatus: data.repairStatus || 'RECEIVED',
                issueDescription: data.issueDescription || '',
                diagnosisNote: data.diagnosisNote || '',
                resolutionNote: data.resolutionNote || '',
                expectedDate: toInputDate(data.expectedDate),
                completedDate: toInputDate(data.completedDate),
                repairCost: Number(data.repairCost || 0),
                note: data.note || ''
            });
        } catch (err) {
            setTicket(null);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Khong tai duoc phieu sua chua.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadTicket();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadTicket]);

    const warrantyId = ticket?.warrantyId || ticket?.warranty?.id;
    const warrantyCode = ticket?.warrantyCode || ticket?.warranty?.warrantyCode || (warrantyId ? `BH #${warrantyId}` : 'Chua lien ket');
    const serialCode = ticket?.serialCode || ticket?.serialNumber || ticket?.serialNumberValue || ticket?.serialNumber?.serialNo || ticket?.warranty?.serialNumber?.serialNo || 'Chua co';
    const productName = ticket?.productName || ticket?.variantName || ticket?.warranty?.productName || ticket?.warranty?.serialNumber?.variant?.variantName || 'Chua ro san pham';
    const customerName = ticket?.partnerName || ticket?.customerName || ticket?.partner?.name || ticket?.warranty?.partner?.name || 'Khach le';
    const stockIssues = useMemo(() => ticket?.stockIssues || ticket?.exportSlips || ticket?.inventoryDocuments || [], [ticket]);
    const canSubmit = Boolean(form.receivedDate && form.issueDescription.trim());

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const buildPayload = () => ({
        repairCode: form.repairCode || undefined,
        warrantyId: warrantyId ? Number(warrantyId) : undefined,
        partnerId: ticket?.partnerId || ticket?.partner?.id,
        serialNumberId: ticket?.serialNumberId || ticket?.serialNumber?.id,
        receivedDate: form.receivedDate,
        repairStatus: form.repairStatus,
        issueDescription: form.issueDescription.trim(),
        diagnosisNote: form.diagnosisNote.trim(),
        resolutionNote: form.resolutionNote.trim(),
        expectedDate: form.expectedDate || undefined,
        completedDate: form.completedDate || undefined,
        repairCost: Number(form.repairCost || 0),
        note: form.note.trim()
    });

    const submit = async () => {
        if (!canSubmit) {
            setError('Vui long nhap ngay tiep nhan va mo ta loi.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await repairTicketApi.updateRepairTicket(id, buildPayload());
            await loadTicket();
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Khong cap nhat duoc phieu sua chua.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <div>
                        <button className={styles.backButton} type="button" onClick={() => navigate('/repair-tickets')}>
                            <i className="bi bi-arrow-left"></i>
                            Danh sach phieu sua
                        </button>
                        <h1 className={styles.title}>{ticket?.repairCode || `Phieu sua #${id}`}</h1>
                        <p className={styles.subtitle}>Cap nhat chan doan, ket qua sua chua va theo doi phieu xuat linh kien.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.outlineButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY_REPAIR&repairId=${id}${warrantyId ? `&warrantyId=${warrantyId}` : ''}`)}>
                            <i className="bi bi-box-arrow-up-right"></i>
                            Tao phieu xuat
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={submit} disabled={saving || !canSubmit}>
                            <i className="bi bi-check2"></i>
                            {saving ? 'Dang luu...' : 'Luu cap nhat'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                {loading && !ticket ? (
                    <div className={styles.emptyState}>Dang tai phieu sua chua...</div>
                ) : ticket ? (
                    <>
                        <section className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="bi bi-info-circle"></i>
                                Thong tin lien ket
                            </div>
                            <div className={styles.infoGrid}>
                                <InfoItem label="Bao hanh" value={warrantyCode} />
                                <InfoItem label="Khach hang" value={customerName} />
                                <InfoItem label="Serial" value={serialCode} />
                                <InfoItem label="San pham" value={productName} />
                            </div>
                        </section>

                        <section className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="bi bi-clipboard2-pulse"></i>
                                Noi dung xu ly
                            </div>
                            <div className={styles.formGrid}>
                                <label className={styles.field}>
                                    <span>Ma phieu sua</span>
                                    <input value={form.repairCode} onChange={(event) => updateForm('repairCode', event.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span>Trang thai</span>
                                    <select value={form.repairStatus} onChange={(event) => updateForm('repairStatus', event.target.value)}>
                                        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </label>
                                <label className={styles.field}>
                                    <span>Ngay tiep nhan</span>
                                    <input type="date" value={form.receivedDate} onChange={(event) => updateForm('receivedDate', event.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span>Ngay du kien xong</span>
                                    <input type="date" value={form.expectedDate} onChange={(event) => updateForm('expectedDate', event.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span>Ngay hoan tat</span>
                                    <input type="date" value={form.completedDate} onChange={(event) => updateForm('completedDate', event.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span>Chi phi sua chua</span>
                                    <input type="number" min="0" value={form.repairCost} onChange={(event) => updateForm('repairCost', event.target.value)} />
                                </label>
                                <label className={`${styles.field} ${styles.fullWidth}`}>
                                    <span>Mo ta loi</span>
                                    <textarea rows="3" value={form.issueDescription} onChange={(event) => updateForm('issueDescription', event.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span>Chan doan</span>
                                    <textarea rows="4" value={form.diagnosisNote} onChange={(event) => updateForm('diagnosisNote', event.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span>Ket qua sua chua</span>
                                    <textarea rows="4" value={form.resolutionNote} onChange={(event) => updateForm('resolutionNote', event.target.value)} />
                                </label>
                                <label className={`${styles.field} ${styles.fullWidth}`}>
                                    <span>Ghi chu noi bo</span>
                                    <textarea rows="3" value={form.note} onChange={(event) => updateForm('note', event.target.value)} />
                                </label>
                            </div>
                        </section>

                        <section className={styles.card}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-box-arrow-up-right"></i>
                                    Phieu xuat linh kien
                                </div>
                                <button className={styles.outlineButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY_REPAIR&repairId=${id}${warrantyId ? `&warrantyId=${warrantyId}` : ''}`)}>
                                    Tao phieu xuat
                                </button>
                            </div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>So phieu</th>
                                        <th>Ngay xuat</th>
                                        <th>Trang thai</th>
                                        <th>Ghi chu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockIssues.length > 0 ? stockIssues.map((issue) => (
                                        <tr key={issue.id || issue.docCode} onClick={() => navigate(`/export-slips/${issue.id}/edit`)}>
                                            <td>{issue.docCode || `XK-${issue.id}`}</td>
                                            <td>{formatDate(issue.docDate)}</td>
                                            <td>{issue.status || 'Chua ro'}</td>
                                            <td>{issue.note || 'Khong co ghi chu'}</td>
                                        </tr>
                                    )) : (
                                        <tr><td className={styles.emptyCell} colSpan="4">Chua co phieu xuat linh kien.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>
                    </>
                ) : (
                    <div className={styles.emptyState}>Khong tim thay phieu sua chua.</div>
                )}
            </div>
        </AdminLayout>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{label}</span>
            <strong className={styles.infoValue}>{value || 'Chua co'}</strong>
        </div>
    );
}

export default UpdateRepairTicketPage;
