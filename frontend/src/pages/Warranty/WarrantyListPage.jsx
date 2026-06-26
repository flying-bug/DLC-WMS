import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import styles from './WarrantyListPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Nhap', tone: 'info' },
    APPROVED: { label: 'Con hieu luc', tone: 'success' },
    POSTED: { label: 'Da ghi nhan', tone: 'success' },
    CANCELLED: { label: 'Da huy', tone: 'danger' },
    EXPIRED: { label: 'Het han', tone: 'warning' },
    VOIDED: { label: 'Khong hop le', tone: 'danger' }
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

const getPartnerName = (item) => item.partnerName || item.customerName || item.partner?.name || 'Khach le';
const getPartnerPhone = (item) => item.partnerPhone || item.customerPhone || item.partner?.phone || '';
const getSerialCode = (item) => item.serialCode || item.serialNumber || item.serialNumberValue || item.serialNumber?.serialNo || item.serialNumber?.serialNumber || '';
const getProductName = (item) => item.productName || item.variantName || item.serialNumber?.productName || item.serialNumber?.variant?.variantName || 'Chua ro san pham';

function WarrantyListPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [warranties, setWarranties] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadWarranties = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await warrantyApi.getWarranties({
                keyword: filters.keyword || undefined,
                status: filters.status || undefined,
                fromDate: filters.fromDate || undefined,
                toDate: filters.toDate || undefined,
                page: 0,
                size: 20
            });
            const payload = unwrap(response);
            const content = pageContent(payload);
            setWarranties(content);
            setTotalElements(totalFromPayload(payload, content.length));
        } catch (err) {
            setWarranties([]);
            setTotalElements(0);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Khong tai duoc danh sach bao hanh.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadWarranties();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadWarranties]);

    const stats = useMemo(() => {
        const active = warranties.filter((item) => item.warrantyStatus === 'APPROVED').length;
        const expired = warranties.filter((item) => item.warrantyStatus === 'EXPIRED').length;
        const closed = warranties.filter((item) => ['POSTED', 'CANCELLED', 'VOIDED'].includes(item.warrantyStatus)).length;

        return {
            total: totalElements || warranties.length,
            active,
            expired,
            closed
        };
    }, [totalElements, warranties]);

    const rows = warranties.map((item) => {
        const status = STATUS_META[item.warrantyStatus] || { label: item.warrantyStatus || 'Chua ro', tone: 'info' };
        return {
            ...item,
            customerName: getPartnerName(item),
            customerPhone: getPartnerPhone(item),
            serialCode: getSerialCode(item),
            productName: getProductName(item),
            startDateText: formatDate(item.startDate),
            endDateText: formatDate(item.endDate),
            statusLabel: status.label,
            statusTone: status.tone
        };
    });

    const handleFilterChange = (field, value) => {
        setFilters((current) => ({ ...current, [field]: value }));
    };

    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Danh sach bao hanh</h1>
                        <p className={styles.pageSubtitle}>Theo doi serial, khach hang va trang thai xu ly bao hanh.</p>
                    </div>
                    <button className={styles.primaryButton} type="button" onClick={() => navigate('/export-slips/create?type=WARRANTY')}>
                        <i className="bi bi-box-arrow-up-right"></i>
                        Tao phieu xuat bao hanh
                    </button>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.infoIcon}`}><i className="bi bi-shield-check"></i></div>
                        <div>
                            <span className={styles.statLabel}>Tong ho so</span>
                            <strong className={styles.statValue}>{stats.total}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.successIcon}`}><i className="bi bi-check2-circle"></i></div>
                        <div>
                            <span className={styles.statLabel}>Con hieu luc</span>
                            <strong className={styles.statValue}>{stats.active}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.warningIcon}`}><i className="bi bi-clock-history"></i></div>
                        <div>
                            <span className={styles.statLabel}>Het han</span>
                            <strong className={styles.statValue}>{stats.expired}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.dangerIcon}`}><i className="bi bi-archive"></i></div>
                        <div>
                            <span className={styles.statLabel}>Da dong/huy</span>
                            <strong className={styles.statValue}>{stats.closed}</strong>
                        </div>
                    </div>
                </div>

                <div className={styles.filterPanel}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Tim kiem</span>
                            <input
                                value={filters.keyword}
                                onChange={(event) => handleFilterChange('keyword', event.target.value)}
                                placeholder="Ma bao hanh, serial, khach hang..."
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Trang thai</span>
                            <select value={filters.status} onChange={(event) => handleFilterChange('status', event.target.value)}>
                                <option value="">Tat ca</option>
                                {Object.entries(STATUS_META).map(([value, meta]) => (
                                    <option key={value} value={value}>{meta.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Tu ngay</span>
                            <input type="date" value={filters.fromDate} onChange={(event) => handleFilterChange('fromDate', event.target.value)} />
                        </label>
                        <label className={styles.field}>
                            <span>Den ngay</span>
                            <input type="date" value={filters.toDate} onChange={(event) => handleFilterChange('toDate', event.target.value)} />
                        </label>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.outlineButton} type="button" onClick={resetFilters}>Lam moi</button>
                        <button className={styles.primaryButton} type="button" onClick={loadWarranties}>
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
                                <th>Ma bao hanh</th>
                                <th>Khach hang</th>
                                <th>Serial</th>
                                <th>San pham</th>
                                <th>Ngay bat dau</th>
                                <th>Ngay het han</th>
                                <th>Trang thai</th>
                                <th className={styles.actionColumn}>Thao tac</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length > 0 ? rows.map((item) => (
                                <tr key={item.id} onClick={() => navigate(`/warranties/${item.id}`)}>
                                    <td>
                                        <button className={styles.linkButton} type="button" onClick={(event) => { event.stopPropagation(); navigate(`/warranties/${item.id}`); }}>
                                            {item.warrantyCode || `BH-${item.id}`}
                                        </button>
                                    </td>
                                    <td>
                                        <div className={styles.mainText}>{item.customerName}</div>
                                        {item.customerPhone && <div className={styles.subText}>{item.customerPhone}</div>}
                                    </td>
                                    <td>{item.serialCode || 'Chua co'}</td>
                                    <td className={styles.productCell}>{item.productName}</td>
                                    <td>{item.startDateText}</td>
                                    <td>{item.endDateText}</td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[item.statusTone]}`}>{item.statusLabel}</span>
                                    </td>
                                    <td className={styles.actionColumn}>
                                        <button className={styles.iconButton} type="button" title="Xem chi tiet" onClick={(event) => { event.stopPropagation(); navigate(`/warranties/${item.id}`); }}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button className={styles.iconButton} type="button" title="Tao phieu xuat" onClick={(event) => { event.stopPropagation(); navigate(`/export-slips/create?type=WARRANTY&warrantyId=${item.id}`); }}>
                                            <i className="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className={styles.emptyCell}>
                                        {loading ? 'Dang tai danh sach bao hanh...' : 'Chua co phieu bao hanh phu hop.'}
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

export default WarrantyListPage;
