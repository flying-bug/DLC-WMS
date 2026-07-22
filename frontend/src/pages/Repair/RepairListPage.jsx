import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as repairApi from '../../api/repairApi';
import styles from './RepairListPage.module.css';

const STATUS_LABELS = {
    DRAFT: 'NhÃ¡p',
    QUOTATION: 'BÃ¡o giÃ¡',
    CONFIRMED: 'ÄÃ£ xÃ¡c nháº­n',
    UNDER_REPAIR: 'Äang sá»­a chá»¯a',
    DONE: 'HoÃ n táº¥t',
    CANCELLED: 'ÄÃ£ há»§y'
};

const STATUS_COLORS = {
    DRAFT: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
    QUOTATION: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    CONFIRMED: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    UNDER_REPAIR: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    DONE: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    CANCELLED: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
};

function RepairListPage() {
    const navigate = useNavigate();
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ keyword: '', status: '' });
    const [pagination, setPagination] = useState({ totalElements: 0, totalPages: 0, page: 0 });

    const loadRepairs = useCallback(async (page = 0) => {
        setLoading(true);
        try {
            const res = await repairApi.getRepairs({
                keyword: filters.keyword || undefined,
                status: filters.status || undefined,
                page,
                size: 20
            });
            const pageData = res.data?.data;
            setRepairs(pageData?.content || []);
            setPagination({
                totalElements: pageData?.totalElements || 0,
                totalPages: pageData?.totalPages || 0,
                page: pageData?.number || 0
            });
        } catch (error) {
            console.error("Error loading repairs:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadRepairs(0);
    }, [loadRepairs]);

    const formatMoney = (val) => {
        if (!val && val !== 0) return '0 â‚«';
        return Number(val).toLocaleString('vi-VN') + ' â‚«';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') loadRepairs(0);
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Lá»‡nh Sá»­a Chá»¯a</h1>
                        <p className={styles.pageSubtitle}>Quáº£n lÃ½ vÃ²ng Ä‘á»i tiáº¿p nháº­n, bÃ¡o giÃ¡ vÃ  sá»­a chá»¯a thiáº¿t bá»‹.</p>
                    </div>
                    <button className={styles.primaryButton} onClick={() => navigate('/repairs/create')}>
                        <i className="bi bi-plus-lg"></i> Táº¡o lá»‡nh má»›i
                    </button>
                </div>

                <div className={styles.filterPanel}>
                    <label className={styles.filterField}>
                        <span>TÃ¬m kiáº¿m</span>
                        <input
                            placeholder="MÃ£ lá»‡nh, tÃªn khÃ¡ch hÃ ng..."
                            value={filters.keyword}
                            onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                            onKeyDown={handleKeyDown}
                        />
                    </label>
                    <label className={styles.filterField}>
                        <span>Tráº¡ng thÃ¡i</span>
                        <select
                            value={filters.status}
                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">Táº¥t cáº£</option>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <button className={styles.searchBtn} onClick={() => loadRepairs(0)}>
                        <i className="bi bi-search"></i> Lá»c
                    </button>
                    <button className={styles.searchBtn} style={{ background: '#f3f4f6', color: '#374151' }}
                        onClick={() => { setFilters({ keyword: '', status: '' }); }}>
                        <i className="bi bi-arrow-clockwise"></i> LÃ m má»›i
                    </button>
                </div>

                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>MÃ£ Lá»‡nh</th>
                                <th>NgÃ y tiáº¿p nháº­n</th>
                                <th>NgÃ y dá»± kiáº¿n</th>
                                <th>Sáº£n pháº©m / Thiáº¿t bá»‹</th>
                                <th>KhÃ¡ch hÃ ng</th>
                                <th>Báº£o hÃ nh</th>
                                <th>Tá»•ng tiá»n</th>
                                <th>Tráº¡ng thÃ¡i</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center py-4">
                                    <i className="bi bi-arrow-repeat me-2" style={{ animation: 'spin 1s linear infinite' }}></i>Äang táº£i...
                                </td></tr>
                            ) : repairs.length === 0 ? (
                                <tr><td colSpan="8" className="text-center py-4" style={{ color: '#9ca3af' }}>
                                    <i className="bi bi-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}></i>
                                    KhÃ´ng cÃ³ dá»¯ liá»‡u.
                                </td></tr>
                            ) : (
                                repairs.map(repair => {
                                    const statusColor = STATUS_COLORS[repair.repairStatus] || STATUS_COLORS.DRAFT;
                                    return (
                                        <tr key={repair.id} onClick={() => navigate(`/repairs/${repair.id}`)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <span className={styles.linkText} style={{ fontWeight: '600', color: '#017e84' }}>
                                                    {repair.repairCode}
                                                </span>
                                            </td>
                                            <td>{formatDate(repair.receivedDate)}</td>
                                            <td>{formatDate(repair.expectedDate)}</td>
                                            <td>
                                                {repair.productName
                                                    ? <span title={`ID: ${repair.productId}`}>{repair.productName}</span>
                                                    : (repair.productId ? `ID: ${repair.productId}` : '-')}
                                            </td>
                                            <td>
                                                {repair.partnerName
                                                    ? <span title={repair.partnerPhone || ''}>{repair.partnerName}</span>
                                                    : (repair.partnerId ? `ID: ${repair.partnerId}` : '-')}
                                            </td>
                                            <td>
                                                {repair.underWarranty
                                                    ? <span style={{ color: '#16a34a', fontWeight: '500' }}><i className="bi bi-shield-check me-1"></i>CÃ³</span>
                                                    : <span style={{ color: '#9ca3af' }}>KhÃ´ng</span>}
                                            </td>
                                            <td style={{ fontWeight: '500' }}>{formatMoney(repair.totalAmount)}</td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                                                    background: statusColor.bg, color: statusColor.color,
                                                    border: `1px solid ${statusColor.border}`
                                                }}>
                                                    {STATUS_LABELS[repair.repairStatus] || repair.repairStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                        {Array.from({ length: pagination.totalPages }, (_, i) => (
                            <button key={i}
                                onClick={() => loadRepairs(i)}
                                style={{
                                    padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db',
                                    background: pagination.page === i ? '#017e84' : '#fff',
                                    color: pagination.page === i ? '#fff' : '#374151',
                                    cursor: 'pointer', fontWeight: '500'
                                }}>
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '12px', color: '#6b7280', fontSize: '13px', textAlign: 'right' }}>
                    Tá»•ng: <strong>{pagination.totalElements}</strong> lá»‡nh
                </div>
            </div>
        </AdminLayout>
    );
}

export default RepairListPage;
