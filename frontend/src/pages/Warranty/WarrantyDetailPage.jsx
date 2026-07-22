import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import styles from './WarrantyDetailPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'NhÃ¡p', tone: 'info' },
    APPROVED: { label: 'CÃ²n hiá»‡u lá»±c', tone: 'success' },
    POSTED: { label: 'ÄÃ£ ghi nháº­n', tone: 'success' },
    CANCELLED: { label: 'ÄÃ£ há»§y', tone: 'danger' },
    EXPIRED: { label: 'Háº¿t háº¡n', tone: 'warning' },
    VOIDED: { label: 'KhÃ´ng há»£p lá»‡', tone: 'danger' }
};

const REPAIR_STATUS_META = {
    DRAFT: { label: 'NhÃ¡p', tone: 'info' },
    SUBMITTED: { label: 'Chá» duyá»‡t', tone: 'warning' },
    APPROVED: { label: 'ÄÃ£ duyá»‡t', tone: 'success' },
    POSTED: { label: 'HoÃ n táº¥t', tone: 'success' },
    CANCELLED: { label: 'ÄÃ£ há»§y', tone: 'danger' },
    RECEIVED: { label: 'ÄÃ£ tiáº¿p nháº­n', tone: 'info' },
    REPAIRING: { label: 'Äang sá»­a', tone: 'warning' }
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'ChÆ°a cÃ³');

const readPartner = (warranty) => ({
    id: warranty.partnerId || warranty.partner?.id,
    name: warranty.partnerName || warranty.customerName || warranty.partner?.name || 'KhÃ¡ch láº»',
    phone: warranty.partnerPhone || warranty.customerPhone || warranty.partner?.phone || 'ChÆ°a cÃ³',
    email: warranty.partnerEmail || warranty.partner?.email || 'ChÆ°a cÃ³',
    address: warranty.partnerAddress || warranty.partner?.address || 'ChÆ°a cÃ³'
});

const readSerial = (warranty) => ({
    id: warranty.serialNumberId || warranty.serialNumber?.id,
    code: warranty.serialCode || warranty.serialNumber || warranty.serialNumberValue || warranty.serialNumber?.serialNo || warranty.serialNumber?.serialNumber || 'ChÆ°a cÃ³',
    status: warranty.serialStatus || warranty.serialNumber?.status || 'ChÆ°a rÃµ',
    productName: warranty.productName || warranty.variantName || warranty.serialNumber?.productName || warranty.serialNumber?.variant?.variantName || 'ChÆ°a rÃµ sáº£n pháº©m',
    sku: warranty.sku || warranty.serialNumber?.sku || warranty.serialNumber?.variant?.sku || 'ChÆ°a cÃ³'
});

const statusMeta = (status, map) => map[status] || { label: status || 'ChÆ°a rÃµ', tone: 'info' };

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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c chi tiáº¿t báº£o hÃ nh.');
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
                            Danh sÃ¡ch báº£o hÃ nh
                        </button>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{warranty?.warrantyCode || `Báº£o hÃ nh #${id}`}</h1>
                            {warranty && <span className={`${styles.badge} ${styles[warrantyStatus.tone]}`}>{warrantyStatus.label}</span>}
                        </div>
                        <p className={styles.subtitle}>Há»“ sÆ¡ serial, khÃ¡ch hÃ ng, sá»­a chá»¯a vÃ  phiáº¿u xuáº¥t kho liÃªn quan.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.outlineButton} type="button" onClick={() => navigate(`/repairs/create?warrantyId=${id}`)}>
                            <i className="bi bi-tools"></i>
                            Táº¡o phiáº¿u sá»­a
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY&warrantyId=${id}`)}>
                            <i className="bi bi-box-arrow-up-right"></i>
                            Táº¡o phiáº¿u xuáº¥t
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                {loading && !warranty ? (
                    <div className={styles.emptyState}>Äang táº£i chi tiáº¿t báº£o hÃ nh...</div>
                ) : warranty ? (
                    <>
                        <div className={styles.summaryGrid}>
                            <section className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-shield-check"></i>
                                    ThÃ´ng tin báº£o hÃ nh
                                </div>
                                <div className={styles.infoGrid}>
                                    <InfoItem label="MÃ£ báº£o hÃ nh" value={warranty.warrantyCode} />
                                    <InfoItem label="NgÃ y báº¯t Ä‘áº§u" value={formatDate(warranty.startDate)} />
                                    <InfoItem label="NgÃ y háº¿t háº¡n" value={formatDate(warranty.endDate)} />
                                    <InfoItem label="ÄÆ¡n bÃ¡n hÃ ng" value={warranty.salesOrderCode || (warranty.salesOrderId ? `SO #${warranty.salesOrderId}` : 'ChÆ°a liÃªn káº¿t')} />
                                </div>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-person-vcard"></i>
                                    KhÃ¡ch hÃ ng
                                </div>
                                <div className={styles.infoGrid}>
                                    <InfoItem label="TÃªn khÃ¡ch hÃ ng" value={partner.name} />
                                    <InfoItem label="Sá»‘ Ä‘iá»‡n thoáº¡i" value={partner.phone} />
                                    <InfoItem label="Email" value={partner.email} />
                                    <InfoItem label="Äá»‹a chá»‰" value={partner.address} />
                                </div>
                            </section>
                        </div>

                        <section className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="bi bi-upc-scan"></i>
                                Thiáº¿t bá»‹ vÃ  serial
                            </div>
                            <div className={styles.deviceGrid}>
                                <InfoItem label="Serial" value={serial.code} />
                                <InfoItem label="SKU" value={serial.sku} />
                                <InfoItem label="Sáº£n pháº©m" value={serial.productName} />
                                <InfoItem label="Tráº¡ng thÃ¡i serial" value={serial.status} />
                            </div>
                        </section>

                        <div className={styles.twoColumn}>
                            <section className={styles.card}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.cardTitle}>
                                        <i className="bi bi-tools"></i>
                                        Lá»‹ch sá»­ sá»­a chá»¯a
                                    </div>
                                    <button className={styles.smallButton} type="button" onClick={() => navigate(`/repairs/create?warrantyId=${id}`)}>
                                        Táº¡o phiáº¿u sá»­a
                                    </button>
                                </div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>MÃ£ phiáº¿u</th>
                                            <th>NgÃ y nháº­n</th>
                                            <th>Tráº¡ng thÃ¡i</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {repairs.length > 0 ? repairs.map((repair) => {
                                            const repairStatus = statusMeta(repair.repairStatus, REPAIR_STATUS_META);
                                            return (
                                                <tr key={repair.id || repair.repairCode} onClick={() => navigate(`/repairs/${repair.id}`)}>
                                                    <td>{repair.repairCode || `SC-${repair.id}`}</td>
                                                    <td>{formatDate(repair.receivedDate)}</td>
                                                    <td><span className={`${styles.badge} ${styles[repairStatus.tone]}`}>{repairStatus.label}</span></td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="3" className={styles.emptyCell}>ChÆ°a cÃ³ phiáº¿u sá»­a chá»¯a.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.cardTitle}>
                                        <i className="bi bi-box-arrow-up-right"></i>
                                        Phiáº¿u xuáº¥t liÃªn quan
                                    </div>
                                    <button className={styles.smallButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY&warrantyId=${id}`)}>
                                        Táº¡o phiáº¿u xuáº¥t
                                    </button>
                                </div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Sá»‘ phiáº¿u</th>
                                            <th>NgÃ y xuáº¥t</th>
                                            <th>Tráº¡ng thÃ¡i</th>
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
                                            <tr><td colSpan="3" className={styles.emptyCell}>ChÆ°a cÃ³ phiáº¿u xuáº¥t kho báº£o hÃ nh.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ báº£o hÃ nh.</div>
                )}
            </div>
        </AdminLayout>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{label}</span>
            <strong className={styles.infoValue}>{value || 'ChÆ°a cÃ³'}</strong>
        </div>
    );
}

export default WarrantyDetailPage;
