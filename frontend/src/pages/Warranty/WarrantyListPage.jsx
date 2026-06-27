import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './WarrantyListPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    APPROVED: { label: 'Còn hiệu lực', tone: 'success' },
    POSTED: { label: 'Đã ghi nhận', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' },
    EXPIRED: { label: 'Hết hạn', tone: 'warning' },
    VOIDED: { label: 'Không hợp lệ', tone: 'danger' }
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

const getPartnerName = (item) => item.partnerName || item.customerName || item.partner?.name || 'Khách lẻ';
const getPartnerPhone = (item) => item.partnerPhone || item.customerPhone || item.partner?.phone || '';
const getSerialCode = (item) => item.serialCode || item.serialNumber || item.serialNumberValue || item.serialNumber?.serialNo || item.serialNumber?.serialNumber || '';
const getProductName = (item) => item.productName || item.variantName || item.serialNumber?.productName || item.serialNumber?.variant?.variantName || 'Chưa rõ sản phẩm';

function WarrantyListPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [warranties, setWarranties] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleExport = () => {
        const headers = ['Mã bảo hành', 'Khách hàng', 'Số điện thoại', 'Serial', 'Sản phẩm', 'Ngày bắt đầu', 'Ngày hết hạn', 'Trạng thái'];
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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách bảo hành.');
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
        const status = STATUS_META[item.warrantyStatus] || { label: item.warrantyStatus || 'Chưa rõ', tone: 'info' };
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
                        <h1 className={styles.pageTitle}>Danh sách bảo hành</h1>
                        <p className={styles.pageSubtitle}>Theo dõi serial, khách hàng và trạng thái xử lý bảo hành.</p>
                    </div>
                    <button className={styles.primaryButton} type="button" onClick={() => navigate('/export-slips/create?type=WARRANTY')}>
                        <i className="bi bi-box-arrow-up-right"></i>
                        Tạo phiếu xuất bảo hành
                    </button>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.infoIcon}`}><i className="bi bi-shield-check"></i></div>
                        <div>
                            <span className={styles.statLabel}>Tổng hồ sơ</span>
                            <strong className={styles.statValue}>{stats.total}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.successIcon}`}><i className="bi bi-check2-circle"></i></div>
                        <div>
                            <span className={styles.statLabel}>Còn hiệu lực</span>
                            <strong className={styles.statValue}>{stats.active}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.warningIcon}`}><i className="bi bi-clock-history"></i></div>
                        <div>
                            <span className={styles.statLabel}>Hết hạn</span>
                            <strong className={styles.statValue}>{stats.expired}</strong>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.dangerIcon}`}><i className="bi bi-archive"></i></div>
                        <div>
                            <span className={styles.statLabel}>Đã đóng/hủy</span>
                            <strong className={styles.statValue}>{stats.closed}</strong>
                        </div>
                    </div>
                </div>

                <div className={styles.filterPanel}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Tìm kiếm</span>
                            <input
                                value={filters.keyword}
                                onChange={(event) => handleFilterChange('keyword', event.target.value)}
                                placeholder="Mã bảo hành, serial, khách hàng..."
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={filters.status} onChange={(event) => handleFilterChange('status', event.target.value)}>
                                <option value="">Tất cả</option>
                                {Object.entries(STATUS_META).map(([value, meta]) => (
                                    <option key={value} value={value}>{meta.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Từ ngày</span>
                            <input type="date" value={filters.fromDate} onChange={(event) => handleFilterChange('fromDate', event.target.value)} />
                        </label>
                        <label className={styles.field}>
                            <span>Đến ngày</span>
                            <input type="date" value={filters.toDate} onChange={(event) => handleFilterChange('toDate', event.target.value)} />
                        </label>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.outlineButton} type="button" onClick={resetFilters}>Làm mới</button>
                        <button className={styles.outlineButton} type="button" onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i>
                            Xuất Excel
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={loadWarranties}>
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
                                <th>Mã bảo hành</th>
                                <th>Khách hàng</th>
                                <th>Serial</th>
                                <th>Sản phẩm</th>
                                <th>Ngày bắt đầu</th>
                                <th>Ngày hết hạn</th>
                                <th>Trạng thái</th>
                                <th className={styles.actionColumn}>Thao tác</th>
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
                                    <td>{item.serialCode || 'Chưa có'}</td>
                                    <td className={styles.productCell}>{item.productName}</td>
                                    <td>{item.startDateText}</td>
                                    <td>{item.endDateText}</td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[item.statusTone]}`}>{item.statusLabel}</span>
                                    </td>
                                    <td className={styles.actionColumn}>
                                        <button className={styles.iconButton} type="button" title="Xem chi tiết" onClick={(event) => { event.stopPropagation(); navigate(`/warranties/${item.id}`); }}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button className={styles.iconButton} type="button" title="Tạo phiếu xuất" onClick={(event) => { event.stopPropagation(); navigate(`/export-slips/create?type=WARRANTY&warrantyId=${item.id}`); }}>
                                            <i className="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className={styles.emptyCell}>
                                        {loading ? 'Đang tải danh sách bảo hành...' : 'Chưa có phiếu bảo hành phù hợp.'}
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
