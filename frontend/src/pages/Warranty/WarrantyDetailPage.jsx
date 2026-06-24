import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import styles from './WarrantyDetailPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Nhap', tone: 'info' },
    APPROVED: { label: 'Con hieu luc', tone: 'success' },
    POSTED: { label: 'Da ghi nhan', tone: 'success' },
    CANCELLED: { label: 'Da huy', tone: 'danger' },
    EXPIRED: { label: 'Het han', tone: 'warning' },
    VOIDED: { label: 'Khong hop le', tone: 'danger' }
};

const REPAIR_STATUS_META = {
    DRAFT: { label: 'Nhap', tone: 'info' },
    SUBMITTED: { label: 'Cho duyet', tone: 'warning' },
    APPROVED: { label: 'Da duyet', tone: 'success' },
    POSTED: { label: 'Hoan tat', tone: 'success' },
    CANCELLED: { label: 'Da huy', tone: 'danger' },
    RECEIVED: { label: 'Da tiep nhan', tone: 'info' },
    REPAIRING: { label: 'Dang sua', tone: 'warning' }
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chua co');

const readPartner = (warranty) => ({
    id: warranty.partnerId || warranty.partner?.id,
    name: warranty.partnerName || warranty.customerName || warranty.partner?.name || 'Khach le',
    phone: warranty.partnerPhone || warranty.customerPhone || warranty.partner?.phone || 'Chua co',
    email: warranty.partnerEmail || warranty.partner?.email || 'Chua co',
    address: warranty.partnerAddress || warranty.partner?.address || 'Chua co'
});

const readSerial = (warranty) => ({
    id: warranty.serialNumberId || warranty.serialNumber?.id,
    code: warranty.serialCode || warranty.serialNumber || warranty.serialNumberValue || warranty.serialNumber?.serialNo || warranty.serialNumber?.serialNumber || 'Chua co',
    status: warranty.serialStatus || warranty.serialNumber?.status || 'Chua ro',
    productName: warranty.productName || warranty.variantName || warranty.serialNumber?.productName || warranty.serialNumber?.variant?.variantName || 'Chua ro san pham',
    sku: warranty.sku || warranty.serialNumber?.sku || warranty.serialNumber?.variant?.sku || 'Chua co'
});

const statusMeta = (status, map) => map[status] || { label: status || 'Chua ro', tone: 'info' };

function WarrantyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [warranty, setWarranty] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadWarranty = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await warrantyApi.getWarrantyById(id);
            setWarranty(unwrap(response));
        } catch (err) {
            setWarranty(null);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Khong tai duoc chi tiet bao hanh.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadWarranty();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadWarranty]);

    const partner = useMemo(() => readPartner(warranty || {}), [warranty]);
    const serial = useMemo(() => readSerial(warranty || {}), [warranty]);
    const repairs = warranty?.repairs || warranty?.repairHistory || [];
    const stockIssues = warranty?.stockIssues || warranty?.exportSlips || warranty?.inventoryDocuments || [];
    const warrantyStatus = statusMeta(warranty?.warrantyStatus, STATUS_META);

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <div>
                        <button className={styles.backButton} type="button" onClick={() => navigate('/warranties')}>
                            <i className="bi bi-arrow-left"></i>
                            Danh sach bao hanh
                        </button>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{warranty?.warrantyCode || `Bao hanh #${id}`}</h1>
                            {warranty && <span className={`${styles.badge} ${styles[warrantyStatus.tone]}`}>{warrantyStatus.label}</span>}
                        </div>
                        <p className={styles.subtitle}>Ho so serial, khach hang, sua chua va phieu xuat kho lien quan.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.outlineButton} type="button" onClick={() => navigate(`/repair-tickets/create?warrantyId=${id}`)}>
                            <i className="bi bi-tools"></i>
                            Tao phieu sua
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY&warrantyId=${id}`)}>
                            <i className="bi bi-box-arrow-up-right"></i>
                            Tao phieu xuat
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                {loading && !warranty ? (
                    <div className={styles.emptyState}>Dang tai chi tiet bao hanh...</div>
                ) : warranty ? (
                    <>
                        <div className={styles.summaryGrid}>
                            <section className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-shield-check"></i>
                                    Thong tin bao hanh
                                </div>
                                <div className={styles.infoGrid}>
                                    <InfoItem label="Ma bao hanh" value={warranty.warrantyCode} />
                                    <InfoItem label="Ngay bat dau" value={formatDate(warranty.startDate)} />
                                    <InfoItem label="Ngay het han" value={formatDate(warranty.endDate)} />
                                    <InfoItem label="Don ban hang" value={warranty.salesOrderCode || (warranty.salesOrderId ? `SO #${warranty.salesOrderId}` : 'Chua lien ket')} />
                                </div>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-person-vcard"></i>
                                    Khach hang
                                </div>
                                <div className={styles.infoGrid}>
                                    <InfoItem label="Ten khach hang" value={partner.name} />
                                    <InfoItem label="So dien thoai" value={partner.phone} />
                                    <InfoItem label="Email" value={partner.email} />
                                    <InfoItem label="Dia chi" value={partner.address} />
                                </div>
                            </section>
                        </div>

                        <section className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="bi bi-upc-scan"></i>
                                Thiet bi va serial
                            </div>
                            <div className={styles.deviceGrid}>
                                <InfoItem label="Serial" value={serial.code} />
                                <InfoItem label="SKU" value={serial.sku} />
                                <InfoItem label="San pham" value={serial.productName} />
                                <InfoItem label="Trang thai serial" value={serial.status} />
                            </div>
                        </section>

                        <div className={styles.twoColumn}>
                            <section className={styles.card}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.cardTitle}>
                                        <i className="bi bi-tools"></i>
                                        Lich su sua chua
                                    </div>
                                    <button className={styles.smallButton} type="button" onClick={() => navigate(`/repair-tickets/create?warrantyId=${id}`)}>
                                        Tao phieu sua
                                    </button>
                                </div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Ma phieu</th>
                                            <th>Ngay nhan</th>
                                            <th>Trang thai</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {repairs.length > 0 ? repairs.map((repair) => {
                                            const repairStatus = statusMeta(repair.repairStatus, REPAIR_STATUS_META);
                                            return (
                                                <tr key={repair.id || repair.repairCode} onClick={() => navigate(`/repair-tickets/${repair.id}/edit`)}>
                                                    <td>{repair.repairCode || `SC-${repair.id}`}</td>
                                                    <td>{formatDate(repair.receivedDate)}</td>
                                                    <td><span className={`${styles.badge} ${styles[repairStatus.tone]}`}>{repairStatus.label}</span></td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="3" className={styles.emptyCell}>Chua co phieu sua chua.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.cardTitle}>
                                        <i className="bi bi-box-arrow-up-right"></i>
                                        Phieu xuat lien quan
                                    </div>
                                    <button className={styles.smallButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY&warrantyId=${id}`)}>
                                        Tao phieu xuat
                                    </button>
                                </div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>So phieu</th>
                                            <th>Ngay xuat</th>
                                            <th>Trang thai</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockIssues.length > 0 ? stockIssues.map((issue) => {
                                            const issueStatus = statusMeta(issue.status, STATUS_META);
                                            return (
                                                <tr key={issue.id || issue.docCode} onClick={() => navigate(`/export-slips/${issue.id}/edit`)}>
                                                    <td>{issue.docCode || `XK-${issue.id}`}</td>
                                                    <td>{formatDate(issue.docDate)}</td>
                                                    <td><span className={`${styles.badge} ${styles[issueStatus.tone]}`}>{issueStatus.label}</span></td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="3" className={styles.emptyCell}>Chua co phieu xuat kho bao hanh.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>Khong tim thay ho so bao hanh.</div>
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

export default WarrantyDetailPage;
