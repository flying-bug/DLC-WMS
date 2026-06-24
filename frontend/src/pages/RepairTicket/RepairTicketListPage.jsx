import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as repairTicketApi from '../../api/repairTicketApi';
import styles from './RepairTicketListPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Nhap', tone: 'info' },
    SUBMITTED: { label: 'Cho duyet', tone: 'warning' },
    APPROVED: { label: 'Da duyet', tone: 'success' },
    POSTED: { label: 'Hoan tat', tone: 'success' },
    CANCELLED: { label: 'Da huy', tone: 'danger' },
    RECEIVED: { label: 'Da tiep nhan', tone: 'info' },
    REPAIRING: { label: 'Dang sua', tone: 'warning' }
};

const DEFAULT_FILTERS = {
    keyword: '',
    status: '',
    fromDate: '',
    toDate: ''
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const totalFromPayload = (payload, fallback) => payload?.totalElements ?? fallback;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chua co');

const readRepair = (item) => ({
    id: item.id,
    repairCode: item.repairCode || `SC-${item.id}`,
    warrantyCode: item.warrantyCode || item.warranty?.warrantyCode || (item.warrantyId ? `BH #${item.warrantyId}` : 'Chua lien ket'),
    customerName: item.partnerName || item.customerName || item.partner?.name || item.warranty?.partner?.name || 'Khach le',
    serialCode: item.serialCode || item.serialNumber || item.serialNumberValue || item.serialNumber?.serialNo || item.warranty?.serialNumber?.serialNo || 'Chua co',
    productName: item.productName || item.variantName || item.warranty?.productName || item.warranty?.serialNumber?.variant?.variantName || 'Chua ro san pham',
    receivedDate: formatDate(item.receivedDate),
    status: STATUS_META[item.repairStatus] || { label: item.repairStatus || 'Chua ro', tone: 'info' }
});

function RepairTicketListPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [tickets, setTickets] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadTickets = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await repairTicketApi.getRepairTickets({
                keyword: filters.keyword || undefined,
                status: filters.status || undefined,
                fromDate: filters.fromDate || undefined,
                toDate: filters.toDate || undefined,
                page: 0,
                size: 20
            });
            const payload = unwrap(response);
            const content = pageContent(payload);
            setTickets(content);
            setTotalElements(totalFromPayload(payload, content.length));
        } catch (err) {
            setTickets([]);
            setTotalElements(0);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Khong tai duoc danh sach phieu sua chua.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadTickets();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadTickets]);

    const rows = tickets.map(readRepair);
    const stats = useMemo(() => ({
        total: totalElements || tickets.length,
        received: tickets.filter((item) => item.repairStatus === 'RECEIVED').length,
        repairing: tickets.filter((item) => item.repairStatus === 'REPAIRING').length,
        done: tickets.filter((item) => item.repairStatus === 'POSTED').length
    }), [tickets, totalElements]);

    const setFilter = (field, value) => {
        setFilters((current) => ({ ...current, [field]: value }));
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Danh sach phieu sua chua</h1>
                        <p className={styles.pageSubtitle}>Theo doi tien do sua chua gan voi ho so bao hanh va serial.</p>
                    </div>
                    <button className={styles.primaryButton} type="button" onClick={() => navigate('/repair-tickets/create')}>
                        <i className="bi bi-plus-lg"></i>
                        Tao phieu sua
                    </button>
                </div>

                <div className={styles.statsGrid}>
                    <Stat icon="bi-clipboard2-check" label="Tong phieu" value={stats.total} tone="info" />
                    <Stat icon="bi-inbox" label="Da tiep nhan" value={stats.received} tone="info" />
                    <Stat icon="bi-tools" label="Dang sua" value={stats.repairing} tone="warning" />
                    <Stat icon="bi-check2-circle" label="Hoan tat" value={stats.done} tone="success" />
                </div>

                <div className={styles.filterPanel}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Tim kiem</span>
                            <input value={filters.keyword} onChange={(event) => setFilter('keyword', event.target.value)} placeholder="Ma phieu, bao hanh, serial, khach hang..." />
                        </label>
                        <label className={styles.field}>
                            <span>Trang thai</span>
                            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                                <option value="">Tat ca</option>
                                {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Tu ngay</span>
                            <input type="date" value={filters.fromDate} onChange={(event) => setFilter('fromDate', event.target.value)} />
                        </label>
                        <label className={styles.field}>
                            <span>Den ngay</span>
                            <input type="date" value={filters.toDate} onChange={(event) => setFilter('toDate', event.target.value)} />
                        </label>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.outlineButton} type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>Lam moi</button>
                        <button className={styles.primaryButton} type="button" onClick={loadTickets}>
                            <i className="bi bi-funnel"></i>
                            Loc du lieu
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Ma phieu sua</th>
                                <th>Ma bao hanh</th>
                                <th>Khach hang</th>
                                <th>Serial</th>
                                <th>San pham</th>
                                <th>Ngay tiep nhan</th>
                                <th>Trang thai</th>
                                <th className={styles.actionColumn}>Thao tac</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length > 0 ? rows.map((ticket) => (
                                <tr key={ticket.id} onClick={() => navigate(`/repair-tickets/${ticket.id}/edit`)}>
                                    <td><span className={styles.linkText}>{ticket.repairCode}</span></td>
                                    <td>{ticket.warrantyCode}</td>
                                    <td>{ticket.customerName}</td>
                                    <td>{ticket.serialCode}</td>
                                    <td className={styles.productCell}>{ticket.productName}</td>
                                    <td>{ticket.receivedDate}</td>
                                    <td><span className={`${styles.badge} ${styles[ticket.status.tone]}`}>{ticket.status.label}</span></td>
                                    <td className={styles.actionColumn}>
                                        <button className={styles.iconButton} type="button" title="Cap nhat" onClick={(event) => { event.stopPropagation(); navigate(`/repair-tickets/${ticket.id}/edit`); }}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className={styles.iconButton} type="button" title="Tao phieu xuat" onClick={(event) => { event.stopPropagation(); navigate(`/export-slips/create?type=WARRANTY_REPAIR&repairId=${ticket.id}`); }}>
                                            <i className="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan="8">
                                        {loading ? 'Dang tai danh sach phieu sua chua...' : 'Chua co phieu sua chua phu hop.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}

function Stat({ icon, label, value, tone }) {
    return (
        <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles[`${tone}Icon`]}`}><i className={`bi ${icon}`}></i></div>
            <div>
                <span className={styles.statLabel}>{label}</span>
                <strong className={styles.statValue}>{value}</strong>
            </div>
        </div>
    );
}

export default RepairTicketListPage;
