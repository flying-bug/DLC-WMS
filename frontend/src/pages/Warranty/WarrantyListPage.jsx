import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './WarrantyListPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'NhÃ¡p', tone: 'info' },
    APPROVED: { label: 'CÃ²n hiá»‡u lá»±c', tone: 'success' },
    POSTED: { label: 'ÄÃ£ ghi nháº­n', tone: 'success' },
    CANCELLED: { label: 'ÄÃ£ há»§y', tone: 'danger' },
    EXPIRED: { label: 'Háº¿t háº¡n', tone: 'warning' },
    VOIDED: { label: 'KhÃ´ng há»£p lá»‡', tone: 'danger' }
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
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'ChÆ°a cÃ³');

const getPartnerName = (item) => item.partnerName || item.customerName || item.partner?.name || 'KhÃ¡ch láº»';
const getPartnerPhone = (item) => item.partnerPhone || item.customerPhone || item.partner?.phone || '';
const getSerialCode = (item) => item.serialCode || item.serialNumber || item.serialNumberValue || item.serialNumber?.serialNo || item.serialNumber?.serialNumber || '';
const getProductName = (item) => item.productName || item.variantName || item.serialNumber?.productName || item.serialNumber?.variant?.variantName || 'ChÆ°a rÃµ sáº£n pháº©m';

function WarrantyListPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [warranties, setWarranties] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleExport = () => {
        const headers = ['MÃ£ báº£o hÃ nh', 'KhÃ¡ch hÃ ng', 'Sá»‘ Ä‘iá»‡n thoáº¡i', 'Serial', 'Sáº£n pháº©m', 'NgÃ y báº¯t Ä‘áº§u', 'NgÃ y háº¿t háº¡n', 'Tráº¡ng thÃ¡i'];
        const data = rows.map(item => [
            item.warrantyCode || `BH-${item.id}`,
            item.customerName,
            item.customerPhone,
            item.serialCode || '',
            item.productName,
            item.startDateText,
            item.endDateText,
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_bao_hanh');
    };

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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch báº£o hÃ nh.');
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
        const status = STATUS_META[item.warrantyStatus] || { label: item.warrantyStatus || 'ChÆ°a rÃµ', tone: 'info' };
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
                        <h1 className={styles.pageTitle}>Danh sÃ¡ch báº£o hÃ nh</h1>
                        <p className={styles.pageSubtitle}>Theo dÃµi serial, khÃ¡ch hÃ ng vÃ  tráº¡ng thÃ¡i xá»­ lÃ½ báº£o hÃ nh.</p>
                    </div>
                    <button className={styles.primaryButton} type="button" onClick={() => navigate('/export-slips/create?type=WARRANTY')}>
                        <i className="bi bi-box-arrow-up-right"></i>
                        Táº¡o phiáº¿u xuáº¥t báº£o hÃ nh
                    </button>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.infoIcon}`}><i className="bi bi-shield-check"></i></div>
                        <div>
                            <span className={styles.statLabel}>Tá»•ng há»“ sÆ¡</span>
                            <strong className={styles.statValue}>{stats.total}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.successIcon}`}><i className="bi bi-check2-circle"></i></div>
                        <div>
                            <span className={styles.statLabel}>CÃ²n hiá»‡u lá»±c</span>
                            <strong className={styles.statValue}>{stats.active}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.warningIcon}`}><i className="bi bi-clock-history"></i></div>
                        <div>
                            <span className={styles.statLabel}>Háº¿t háº¡n</span>
                            <strong className={styles.statValue}>{stats.expired}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.dangerIcon}`}><i className="bi bi-archive"></i></div>
                        <div>
                            <span className={styles.statLabel}>ÄÃ£ Ä‘Ã³ng/há»§y</span>
                            <strong className={styles.statValue}>{stats.closed}</strong>
                        </div>
                    </div>
                </div>

                <div className={styles.filterPanel}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>TÃ¬m kiáº¿m</span>
                            <input
                                value={filters.keyword}
                                onChange={(event) => handleFilterChange('keyword', event.target.value)}
                                placeholder="MÃ£ báº£o hÃ nh, serial, khÃ¡ch hÃ ng..."
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Tráº¡ng thÃ¡i</span>
                            <select value={filters.status} onChange={(event) => handleFilterChange('status', event.target.value)}>
                                <option value="">Táº¥t cáº£</option>
                                {Object.entries(STATUS_META).map(([value, meta]) => (
                                    <option key={value} value={value}>{meta.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Tá»« ngÃ y</span>
                            <input type="date" value={filters.fromDate} onChange={(event) => handleFilterChange('fromDate', event.target.value)} />
                        </label>
                        <label className={styles.field}>
                            <span>Äáº¿n ngÃ y</span>
                            <input type="date" value={filters.toDate} onChange={(event) => handleFilterChange('toDate', event.target.value)} />
                        </label>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.outlineButton} type="button" onClick={resetFilters}>LÃ m má»›i</button>
                        <button className={styles.outlineButton} type="button" onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i>
                            Xuáº¥t Excel
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={loadWarranties}>
                            <i className="bi bi-funnel"></i>
                            Lá»c dá»¯ liá»‡u
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>MÃ£ báº£o hÃ nh</th>
                                <th>KhÃ¡ch hÃ ng</th>
                                <th>Serial</th>
                                <th>Sáº£n pháº©m</th>
                                <th>NgÃ y báº¯t Ä‘áº§u</th>
                                <th>NgÃ y háº¿t háº¡n</th>
                                <th>Tráº¡ng thÃ¡i</th>
                                <th className={styles.actionColumn}>Thao tÃ¡c</th>
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
                                    <td>{item.serialCode || 'ChÆ°a cÃ³'}</td>
                                    <td className={styles.productCell}>{item.productName}</td>
                                    <td>{item.startDateText}</td>
                                    <td>{item.endDateText}</td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[item.statusTone]}`}>{item.statusLabel}</span>
                                    </td>
                                    <td className={styles.actionColumn}>
                                        <button className={styles.iconButton} type="button" title="Xem chi tiáº¿t" onClick={(event) => { event.stopPropagation(); navigate(`/warranties/${item.id}`); }}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button className={styles.iconButton} type="button" title="Táº¡o phiáº¿u xuáº¥t" onClick={(event) => { event.stopPropagation(); navigate(`/export-slips/create?type=WARRANTY&warrantyId=${item.id}`); }}>
                                            <i className="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className={styles.emptyCell}>
                                        {loading ? 'Äang táº£i danh sÃ¡ch báº£o hÃ nh...' : 'ChÆ°a cÃ³ phiáº¿u báº£o hÃ nh phÃ¹ há»£p.'}
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
