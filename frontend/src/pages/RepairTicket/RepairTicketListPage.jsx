import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as repairTicketApi from '../../api/repairTicketApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './RepairTicketListPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    SUBMITTED: { label: 'Chờ duyệt', tone: 'warning' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    POSTED: { label: 'Hoàn tất', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' },
    RECEIVED: { label: 'Đã tiếp nhận', tone: 'info' },
    REPAIRING: { label: 'Đang sửa', tone: 'warning' }
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
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có');

const readRepair = (item) => ({
    id: item.id,
    repairCode: item.repairCode || `SC-${item.id}`,
    warrantyCode: item.warrantyCode || item.warranty?.warrantyCode || (item.warrantyId ? `BH #${item.warrantyId}` : 'Chưa liên kết'),
    customerName: item.partnerName || item.customerName || item.partner?.name || item.warranty?.partner?.name || 'Khách lẻ',
    serialCode: item.serialCode || item.serialNumber || item.serialNumberValue || item.serialNumber?.serialNo || item.warranty?.serialNumber?.serialNo || 'Chưa có',
    productName: item.productName || item.variantName || item.warranty?.productName || item.warranty?.serialNumber?.variant?.variantName || 'Chưa rõ sản phẩm',
    receivedDate: formatDate(item.receivedDate),
    status: STATUS_META[item.repairStatus] || { label: item.repairStatus || 'Chưa rõ', tone: 'info' }
});

function RepairTicketListPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [tickets, setTickets] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleExport = () => {
        const headers = ['Mã phiếu sửa', 'Mã bảo hành', 'Khách hàng', 'Serial', 'Sản phẩm', 'Ngày tiếp nhận', 'Trạng thái'];
        const data = rows.map(item => [
            item.repairCode,
            item.warrantyCode,
            item.customerName,
            item.serialCode,
            item.productName,
            item.receivedDate,
            item.status.label
        ]);
        exportToExcel(headers, data, 'Danh_sach_phieu_sua_chua');
    };

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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách phiếu sửa chữa.');
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
                        <h1 className={styles.pageTitle}>Danh sách phiếu sửa chữa</h1>
                        <p className={styles.pageSubtitle}>Theo dõi tiến độ sửa chữa gắn với hồ sơ bảo hành và serial.</p>
                    </div>
                    <button className={styles.primaryButton} type="button" onClick={() => navigate('/repair-tickets/create')}>
                        <i className="bi bi-plus-lg"></i>
                        Tạo phiếu sửa
                    </button>
                </div>

                <div className={styles.statsGrid}>
                    <Stat icon="bi-clipboard2-check" label="Tổng phiếu" value={stats.total} tone="info" />
                    <Stat icon="bi-inbox" label="Đã tiếp nhận" value={stats.received} tone="info" />
                    <Stat icon="bi-tools" label="Đang sửa" value={stats.repairing} tone="warning" />
                    <Stat icon="bi-check2-circle" label="Hoàn tất" value={stats.done} tone="success" />
                </div>

                <div className={styles.filterPanel}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Tìm kiếm</span>
                            <input value={filters.keyword} onChange={(event) => setFilter('keyword', event.target.value)} placeholder="Mã phiếu, bảo hành, serial, khách hàng..." />
                        </label>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                                <option value="">Tất cả</option>
                                {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Từ ngày</span>
                            <input type="date" value={filters.fromDate} onChange={(event) => setFilter('fromDate', event.target.value)} />
                        </label>
                        <label className={styles.field}>
                            <span>Đến ngày</span>
                            <input type="date" value={filters.toDate} onChange={(event) => setFilter('toDate', event.target.value)} />
                        </label>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.outlineButton} type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>Làm mới</button>
                        <button className={styles.outlineButton} type="button" onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i>
                            Xuất Excel
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={loadTickets}>
                            <i className="bi bi-funnel"></i>
                            Lọc dữ liệu
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã phiếu sửa</th>
                                <th>Mã bảo hành</th>
                                <th>Khách hàng</th>
                                <th>Serial</th>
                                <th>Sản phẩm</th>
                                <th>Ngày tiếp nhận</th>
                                <th>Trạng thái</th>
                                <th className={styles.actionColumn}>Thao tác</th>
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
                                        <button className={styles.iconButton} type="button" title="Cập nhật" onClick={(event) => { event.stopPropagation(); navigate(`/repair-tickets/${ticket.id}/edit`); }}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className={styles.iconButton} type="button" title="Tạo phiếu xuất" onClick={(event) => { event.stopPropagation(); navigate(`/export-slips/create?type=WARRANTY_REPAIR&repairId=${ticket.id}`); }}>
                                            <i className="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan="8">
                                        {loading ? 'Đang tải danh sách phiếu sửa chữa...' : 'Chưa có phiếu sửa chữa phù hợp.'}
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
