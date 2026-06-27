import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import styles from './WarrantyDetailPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    APPROVED: { label: 'Còn hiệu lực', tone: 'success' },
    POSTED: { label: 'Đã ghi nhận', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' },
    EXPIRED: { label: 'Hết hạn', tone: 'warning' },
    VOIDED: { label: 'Không hợp lệ', tone: 'danger' }
};

const REPAIR_STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    SUBMITTED: { label: 'Chờ duyệt', tone: 'warning' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    POSTED: { label: 'Hoàn tất', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' },
    RECEIVED: { label: 'Đã tiếp nhận', tone: 'info' },
    REPAIRING: { label: 'Đang sửa', tone: 'warning' }
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có');

const readPartner = (warranty) => ({
    id: warranty.partnerId || warranty.partner?.id,
    name: warranty.partnerName || warranty.customerName || warranty.partner?.name || 'Khách lẻ',
    phone: warranty.partnerPhone || warranty.customerPhone || warranty.partner?.phone || 'Chưa có',
    email: warranty.partnerEmail || warranty.partner?.email || 'Chưa có',
    address: warranty.partnerAddress || warranty.partner?.address || 'Chưa có'
});

const readSerial = (warranty) => ({
    id: warranty.serialNumberId || warranty.serialNumber?.id,
    code: warranty.serialCode || warranty.serialNumber || warranty.serialNumberValue || warranty.serialNumber?.serialNo || warranty.serialNumber?.serialNumber || 'Chưa có',
    status: warranty.serialStatus || warranty.serialNumber?.status || 'Chưa rõ',
    productName: warranty.productName || warranty.variantName || warranty.serialNumber?.productName || warranty.serialNumber?.variant?.variantName || 'Chưa rõ sản phẩm',
    sku: warranty.sku || warranty.serialNumber?.sku || warranty.serialNumber?.variant?.sku || 'Chưa có'
});

const statusMeta = (status, map) => map[status] || { label: status || 'Chưa rõ', tone: 'info' };

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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được chi tiết bảo hành.');
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
                            Danh sách bảo hành
                        </button>
                        <div className={styles.titleRow}>
                            <h1 className={styles.title}>{warranty?.warrantyCode || `Bảo hành #${id}`}</h1>
                            {warranty && <span className={`${styles.badge} ${styles[warrantyStatus.tone]}`}>{warrantyStatus.label}</span>}
                        </div>
                        <p className={styles.subtitle}>Hồ sơ serial, khách hàng, sửa chữa và phiếu xuất kho liên quan.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.outlineButton} type="button" onClick={() => navigate(`/repair-tickets/create?warrantyId=${id}`)}>
                            <i className="bi bi-tools"></i>
                            Tạo phiếu sửa
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY&warrantyId=${id}`)}>
                            <i className="bi bi-box-arrow-up-right"></i>
                            Tạo phiếu xuất
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                {loading && !warranty ? (
                    <div className={styles.emptyState}>Đang tải chi tiết bảo hành...</div>
                ) : warranty ? (
                    <>
                        <div className={styles.summaryGrid}>
                            <section className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-shield-check"></i>
                                    Thông tin bảo hành
                                </div>
                                <div className={styles.infoGrid}>
                                    <InfoItem label="Mã bảo hành" value={warranty.warrantyCode} />
                                    <InfoItem label="Ngày bắt đầu" value={formatDate(warranty.startDate)} />
                                    <InfoItem label="Ngày hết hạn" value={formatDate(warranty.endDate)} />
                                    <InfoItem label="Đơn bán hàng" value={warranty.salesOrderCode || (warranty.salesOrderId ? `SO #${warranty.salesOrderId}` : 'Chưa liên kết')} />
                                </div>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.cardTitle}>
                                    <i className="bi bi-person-vcard"></i>
                                    Khách hàng
                                </div>
                                <div className={styles.infoGrid}>
                                    <InfoItem label="Tên khách hàng" value={partner.name} />
                                    <InfoItem label="Số điện thoại" value={partner.phone} />
                                    <InfoItem label="Email" value={partner.email} />
                                    <InfoItem label="Địa chỉ" value={partner.address} />
                                </div>
                            </section>
                        </div>

                        <section className={styles.card}>
                            <div className={styles.cardTitle}>
                                <i className="bi bi-upc-scan"></i>
                                Thiết bị và serial
                            </div>
                            <div className={styles.deviceGrid}>
                                <InfoItem label="Serial" value={serial.code} />
                                <InfoItem label="SKU" value={serial.sku} />
                                <InfoItem label="Sản phẩm" value={serial.productName} />
                                <InfoItem label="Trạng thái serial" value={serial.status} />
                            </div>
                        </section>

                        <div className={styles.twoColumn}>
                            <section className={styles.card}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.cardTitle}>
                                        <i className="bi bi-tools"></i>
                                        Lịch sử sửa chữa
                                    </div>
                                    <button className={styles.smallButton} type="button" onClick={() => navigate(`/repair-tickets/create?warrantyId=${id}`)}>
                                        Tạo phiếu sửa
                                    </button>
                                </div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Mã phiếu</th>
                                            <th>Ngày nhận</th>
                                            <th>Trạng thái</th>
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
                                            <tr><td colSpan="3" className={styles.emptyCell}>Chưa có phiếu sửa chữa.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.cardTitle}>
                                        <i className="bi bi-box-arrow-up-right"></i>
                                        Phiếu xuất liên quan
                                    </div>
                                    <button className={styles.smallButton} type="button" onClick={() => navigate(`/export-slips/create?type=WARRANTY&warrantyId=${id}`)}>
                                        Tạo phiếu xuất
                                    </button>
                                </div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Số phiếu</th>
                                            <th>Ngày xuất</th>
                                            <th>Trạng thái</th>
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
                                            <tr><td colSpan="3" className={styles.emptyCell}>Chưa có phiếu xuất kho bảo hành.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>Không tìm thấy hồ sơ bảo hành.</div>
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

export default WarrantyDetailPage;
