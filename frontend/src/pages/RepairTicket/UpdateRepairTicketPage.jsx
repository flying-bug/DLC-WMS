import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as repairTicketApi from '../../api/repairTicketApi';
import styles from './UpdateRepairTicketPage.module.css';

const STATUS_OPTIONS = [
    { value: 'RECEIVED', label: 'Đã tiếp nhận' },
    { value: 'REPAIRING', label: 'Đang sửa' },
    { value: 'POSTED', label: 'Hoàn tất' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'SUBMITTED', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' }
];

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có');
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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được phiếu sửa chữa.');
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
    const warrantyCode = ticket?.warrantyCode || ticket?.warranty?.warrantyCode || (warrantyId ? `BH #${warrantyId}` : 'Chưa liên kết');
    const serialCode = ticket?.serialCode || ticket?.serialNumber || ticket?.serialNumberValue || ticket?.serialNumber?.serialNo || ticket?.warranty?.serialNumber?.serialNo || 'Chưa có';
    const productName = ticket?.productName || ticket?.variantName || ticket?.warranty?.productName || ticket?.warranty?.serialNumber?.variant?.variantName || 'Chưa rõ sản phẩm';
    const customerName = ticket?.partnerName || ticket?.customerName || ticket?.partner?.name || ticket?.warranty?.partner?.name || 'Khách lẻ';
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
            setError('Vui lòng nhập ngày tiếp nhận và mô tả lỗi.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await repairTicketApi.updateRepairTicket(id, buildPayload());
            await loadTicket();
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không cập nhật được phiếu sửa chữa.');
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
                            Danh sách phiếu sửa
                        </button>
                        <h1 className={styles.title}>{ticket?.repairCode || `Phiếu sửa #${id}`}</h1>
                        <p className={styles.subtitle}>Cập nhật chẩn đoán, kết quả sửa chữa và theo dõi phiếu xuất linh kiện.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className="btn-misa-draft" type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY_REPAIR&repairId=${id}${warrantyId ? `&warrantyId=${warrantyId}` : ''}`)}>
                            <i className="bi bi-box-arrow-up-right"></i>
                            Tạo phiếu xuất
                        </button>
                        <button className="btn-misa-save" type="button" onClick={submit} disabled={saving || !canSubmit}>
                            <i className="bi bi-check2"></i>
                            {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                {loading && !ticket ? (
                    <div className={styles.emptyState}>Đang tải phiếu sửa chữa...</div>
                ) : ticket ? (
                    <>
                        <section className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="bi bi-info-circle"></i>
                                Thông tin liên kết
                            </div>
                            <div className={styles.infoGrid}>
                                <InfoItem label="Bảo hành" value={warrantyCode} />
                                <InfoItem label="Khách hàng" value={customerName} />
                                <InfoItem label="Serial" value={serialCode} />
                                <InfoItem label="Sản phẩm" value={productName} />
                            </div>
                        </section>

                        <section className={styles.card} style={{ marginTop: '20px' }}>
                            <div className={styles.cardTitle}>
                                <i className="bi bi-clipboard2-pulse"></i>
                                Nội dung xử lý
                            </div>
                            <div className="misa-form-row">
                                <div className="misa-form-group">
                                    <label className="misa-label">Mã phiếu sửa</label>
                                    <input className="misa-input" value={form.repairCode} onChange={(event) => updateForm('repairCode', event.target.value)} />
                                </div>
                                <div className="misa-form-group">
                                    <label className="misa-label">Trạng thái</label>
                                    <select className="misa-select" value={form.repairStatus} onChange={(event) => updateForm('repairStatus', event.target.value)}>
                                        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="misa-form-row" style={{ marginTop: '12px' }}>
                                <div className="misa-form-group">
                                    <label className="misa-label">Ngày tiếp nhận <span className="required">*</span></label>
                                    <input type="date" className="misa-input" value={form.receivedDate} onChange={(event) => updateForm('receivedDate', event.target.value)} />
                                </div>
                                <div className="misa-form-group">
                                    <label className="misa-label">Ngày dự kiến xong</label>
                                    <input type="date" className="misa-input" value={form.expectedDate} onChange={(event) => updateForm('expectedDate', event.target.value)} />
                                </div>
                            </div>
                            <div className="misa-form-row" style={{ marginTop: '12px' }}>
                                <div className="misa-form-group">
                                    <label className="misa-label">Ngày hoàn tất</label>
                                    <input type="date" className="misa-input" value={form.completedDate} onChange={(event) => updateForm('completedDate', event.target.value)} />
                                </div>
                                <div className="misa-form-group">
                                    <label className="misa-label">Chi phí sửa chữa</label>
                                    <input type="number" min="0" className="misa-input" value={form.repairCost} onChange={(event) => updateForm('repairCost', event.target.value)} />
                                </div>
                            </div>
                            <div className="misa-form-group" style={{ marginTop: '12px' }}>
                                <label className="misa-label">Mô tả lỗi <span className="required">*</span></label>
                                <textarea className="misa-textarea" rows="3" value={form.issueDescription} onChange={(event) => updateForm('issueDescription', event.target.value)} />
                            </div>
                            <div className="misa-form-row" style={{ marginTop: '12px' }}>
                                <div className="misa-form-group">
                                    <label className="misa-label">Chẩn đoán</label>
                                    <textarea className="misa-textarea" rows="3" value={form.diagnosisNote} onChange={(event) => updateForm('diagnosisNote', event.target.value)} />
                                </div>
                                <div className="misa-form-group">
                                    <label className="misa-label">Kết quả sửa chữa</label>
                                    <textarea className="misa-textarea" rows="3" value={form.resolutionNote} onChange={(event) => updateForm('resolutionNote', event.target.value)} />
                                </div>
                            </div>
                            <div className="misa-form-group" style={{ marginTop: '12px' }}>
                                <label className="misa-label">Ghi chú nội bộ</label>
                                <textarea className="misa-textarea" rows="2" value={form.note} onChange={(event) => updateForm('note', event.target.value)} />
                            </div>
                        </section>

                        <section className={styles.card} style={{ marginTop: '20px' }}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-box-arrow-up-right"></i>
                                    Phiếu xuất linh kiện
                                </div>
                                <button className={styles.outlineButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY_REPAIR&repairId=${id}${warrantyId ? `&warrantyId=${warrantyId}` : ''}`)}>
                                    Tạo phiếu xuất
                                </button>
                            </div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Số phiếu</th>
                                        <th>Ngày xuất</th>
                                        <th>Trạng thái</th>
                                        <th>Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockIssues.length > 0 ? stockIssues.map((issue) => (
                                        <tr key={issue.id || issue.docCode} onClick={() => navigate(`/export-slips/${issue.id}/edit`)} style={{ cursor: 'pointer' }}>
                                            <td>{issue.docCode || `XK-${issue.id}`}</td>
                                            <td>{formatDate(issue.docDate)}</td>
                                            <td>{issue.status || 'Chưa rõ'}</td>
                                            <td>{issue.note || 'Không có ghi chú'}</td>
                                        </tr>
                                    )) : (
                                        <tr><td className={styles.emptyCell} colSpan="4">Chưa có phiếu xuất linh kiện.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>
                    </>
                ) : (
                    <div className={styles.emptyState}>Không tìm thấy phiếu sửa chữa.</div>
                )}
            </div>
        </AdminLayout>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{label}</span>
            <strong className={styles.infoValue}>{value || 'Chưa có'}</strong>
        </div>
    );
}

export default UpdateRepairTicketPage;
