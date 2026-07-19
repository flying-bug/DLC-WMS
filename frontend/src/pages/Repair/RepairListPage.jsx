import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as repairApi from '../../api/repairApi';
import styles from './RepairPage.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
    DRAFT:        { label: 'Nháp',        cls: 'badgeInfo' },
    QUOTATION:    { label: 'Báo giá',     cls: 'badgeWarning' },
    CONFIRMED:    { label: 'Chờ duyệt',   cls: 'badgeWarning' },
    UNDER_REPAIR: { label: 'Đang sửa',    cls: 'badgeWarning' },
    TESTING:      { label: 'Kiểm tra',    cls: 'badgeWarning' },
    DONE:         { label: 'Hoàn thành',  cls: 'badgeSuccess' },
    CANCELLED:    { label: 'Đã hủy',      cls: 'badgeDanger' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const unwrap = (res) => res?.data?.data ?? res?.data;
const listFrom = (payload) => payload?.content ?? (Array.isArray(payload) ? payload : []);

/** Hiển thị thời gian tương đối: Hôm nay, 3 ngày trước, 1 tuần trước… */
function relativeDate(val) {
    if (!val) return '—';
    const date = new Date(val);
    if (isNaN(date)) return '—';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 tuần trước';
    if (diffWeeks < 5) return `${diffWeeks} tuần trước`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} tháng trước`;
    return `${Math.floor(diffMonths / 12)} năm trước`;
}

/** Màu sắc tương đối theo khoảng thời gian */
function relativeDateColor(val) {
    if (!val) return undefined;
    const diffDays = Math.floor((new Date() - new Date(val)) / 86400000);
    if (diffDays === 0) return 'var(--color-text-strong)';
    if (diffDays < 7)  return 'var(--color-primary)';
    return '#f97316'; // màu cam cho lâu hơn
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const s = STATUS_MAP[status] || { label: status, cls: 'badgeInfo' };
    return <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────
function RepairListPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [repairs, setRepairs] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // Filters - đúng theo thứ tự hình: Từ ngày | Đến ngày | Trạng thái | Tìm kiếm
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        status: '',
        keyword: '',
    });
    const [pendingFilters, setPendingFilters] = useState({ ...filters });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);

    // Quick-view modal
    const [selectedRepair, setSelectedRepair] = useState(null);

    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });
    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

    // ── Load ──────────────────────────────────────────────────────────────────
    const loadRepairs = useCallback(async (appliedFilters = filters) => {
        setLoading(true);
        setError('');
        try {
            const res = await repairApi.getRepairs({
                keyword:  appliedFilters.keyword  || undefined,
                status:   appliedFilters.status   || undefined,
                fromDate: appliedFilters.fromDate || undefined,
                toDate:   appliedFilters.toDate   || undefined,
                page: currentPage - 1,
                size: pageSize,
            });
            const payload = unwrap(res);
            // Handle both Page<> and plain array
            if (payload?.content) {
                setRepairs(payload.content);
                setTotalElements(payload.totalElements ?? payload.content.length);
            } else {
                const arr = Array.isArray(payload) ? payload : [];
                setRepairs(arr);
                setTotalElements(arr.length);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách lệnh sửa chữa.');
            setRepairs([]);
            setTotalElements(0);
        } finally {
            setLoading(false);
        }
    }, [filters, currentPage, pageSize]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadRepairs(); }, [loadRepairs]);

    useEffect(() => {
        if (location.state?.toastMessage) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            showToast(location.state.toastType || 'success', location.state.toastMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleApplyFilter = () => {
        setFilters({ ...pendingFilters });
        setCurrentPage(1);
        setSelectedIds([]);
    };

    const handleResetFilter = () => {
        const empty = { fromDate: '', toDate: '', status: '', keyword: '' };
        setPendingFilters(empty);
        setFilters(empty);
        setCurrentPage(1);
        setSelectedIds([]);
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? repairs.map(r => r.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── Pagination ────────────────────────────────────────────────────────────
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const startItem = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalElements);

    return (
        <AdminLayout>
            <div className={styles.pageBody}>

                {/* ── Title + Thêm mới ── */}
                <div className={styles.pageTitleContainer}>
                    <h1 className={styles.pageTitle}>Danh sách Sửa chữa</h1>
                    <button className={styles.btnPrimary} onClick={() => navigate('/repair-tickets/create')}>
                        <i className="bi bi-plus" /> Thêm mới
                    </button>
                </div>

                {/* ── Filter Bar (hình: TỪ NGÀY | ĐẾN NGÀY | TRẠNG THÁI | TÌM KIẾM | icon) ── */}
                <div className={styles.filterBar}>
                    {/* Từ ngày */}
                    <div className={styles.filterBarField}>
                        <label className={styles.filterBarLabel}>TỪ NGÀY</label>
                        <input
                            type="date"
                            className={styles.filterBarInput}
                            value={pendingFilters.fromDate}
                            onChange={e => setPendingFilters(p => ({ ...p, fromDate: e.target.value }))}
                        />
                    </div>

                    {/* Đến ngày */}
                    <div className={styles.filterBarField}>
                        <label className={styles.filterBarLabel}>ĐẾN NGÀY</label>
                        <input
                            type="date"
                            className={styles.filterBarInput}
                            value={pendingFilters.toDate}
                            onChange={e => setPendingFilters(p => ({ ...p, toDate: e.target.value }))}
                        />
                    </div>

                    {/* Trạng thái phiếu */}
                    <div className={styles.filterBarField}>
                        <label className={styles.filterBarLabel}>TRẠNG THÁI PHIẾU</label>
                        <select
                            className={styles.filterBarSelect}
                            value={pendingFilters.status}
                            onChange={e => setPendingFilters(p => ({ ...p, status: e.target.value }))}
                        >
                            <option value="">Tất cả</option>
                            <option value="DRAFT">Nháp</option>
                            <option value="QUOTATION">Báo giá</option>
                            <option value="CONFIRMED">Chờ duyệt</option>
                            <option value="UNDER_REPAIR">Đang sửa</option>
                            <option value="TESTING">Kiểm tra</option>
                            <option value="DONE">Hoàn thành</option>
                            <option value="CANCELLED">Đã hủy</option>
                        </select>
                    </div>

                    {/* Tìm kiếm */}
                    <div className={styles.filterBarField} style={{ flex: 1 }}>
                        <label className={styles.filterBarLabel}>&nbsp;</label>
                        <div className={styles.filterBarSearch}>
                            <input
                                type="text"
                                className={styles.filterBarSearchInput}
                                placeholder="Tìm kiếm..."
                                value={pendingFilters.keyword}
                                onChange={e => setPendingFilters(p => ({ ...p, keyword: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleApplyFilter()}
                            />
                        </div>
                    </div>

                    {/* Filter icon button */}
                    <div className={styles.filterBarField} style={{ justifyContent: 'flex-end' }}>
                        <label className={styles.filterBarLabel}>&nbsp;</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className={styles.filterIconBtn}
                                title="Lọc dữ liệu"
                                onClick={handleApplyFilter}
                            >
                                <i className="bi bi-funnel" />
                            </button>
                            <button
                                className={styles.filterIconBtnOutline}
                                title="Làm mới"
                                onClick={handleResetFilter}
                            >
                                <i className="bi bi-arrow-counterclockwise" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Error state ── */}
                {error && (
                    <div className={styles.emptyState}>
                        <i className={`bi bi-exclamation-triangle ${styles.emptyIcon}`} />
                        <div className={styles.emptyText}>{error}</div>
                    </div>
                )}

                {/* ── Table ── */}
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={repairs.length > 0 && selectedIds.length === repairs.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th style={{ width: '130px' }}>MÃ SỬA CHỮA</th>
                                <th style={{ width: '140px' }}>NGÀY TIẾP NHẬN</th>
                                <th>SẢN PHẨM SỬA CHỮA</th>
                                <th style={{ width: '160px' }}>KHÁCH HÀNG</th>
                                <th style={{ width: '140px' }}>NGƯỜI TIẾP NHẬN</th>
                                <th style={{ width: '130px' }}>ĐƠN HÀNG</th>
                                <th style={{ width: '120px' }}>TRẠNG THÁI</th>
                                <th style={{ width: '70px', textAlign: 'center' }}>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className={styles.emptyState} style={{ padding: '48px' }}>
                                            <div className={styles.emptyText}>Đang tải dữ liệu...</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : repairs.length > 0 ? repairs.map(r => (
                                <tr
                                    key={r.id}
                                    onClick={() => setSelectedRepair(r)}
                                    className={selectedRepair?.id === r.id ? styles.activeRow : ''}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {/* Checkbox */}
                                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={selectedIds.includes(r.id)}
                                            onChange={e => handleSelectRow(e, r.id)}
                                        />
                                    </td>

                                    {/* Mã sửa chữa */}
                                    <td>
                                        <a
                                            href="#"
                                            className={styles.link}
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/repair-tickets/${r.id}/edit`); }}
                                        >
                                            {r.repairCode}
                                        </a>
                                    </td>

                                    {/* Ngày tiếp nhận - dạng tương đối như hình */}
                                    <td>
                                        <span style={{ color: relativeDateColor(r.receivedDate), fontWeight: 500 }}>
                                            {relativeDate(r.receivedDate)}
                                        </span>
                                    </td>

                                    {/* Sản phẩm */}
                                    <td>
                                        <span style={{ color: 'var(--color-text-strong)' }}>
                                            {r.productId ? `[SP-${r.productId}] Sản phẩm #${r.productId}` : '—'}
                                        </span>
                                    </td>

                                    {/* Khách hàng */}
                                    <td>
                                        {r.partnerId ? `Khách hàng #${r.partnerId}` : '—'}
                                    </td>

                                    {/* Người tiếp nhận */}
                                    <td>
                                        <span className={styles.assigneeCell}>
                                            {r.createdBy ? `Nhân viên #${r.createdBy}` : '—'}
                                        </span>
                                    </td>

                                    {/* Đơn hàng */}
                                    <td>
                                        <span style={{ color: 'var(--color-text-muted-2)' }}>—</span>
                                    </td>

                                    {/* Trạng thái */}
                                    <td>
                                        <StatusBadge status={r.repairStatus} />
                                    </td>

                                    {/* Thao tác */}
                                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                        <button
                                            className={styles.actionEyeBtn}
                                            title="Xem chi tiết"
                                            onClick={() => setSelectedRepair(r)}
                                        >
                                            <i className="bi bi-eye" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9}>
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`} />
                                            <div className={styles.emptyText}>Không tìm thấy lệnh sửa chữa nào</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* ── Pagination – giống hình: "Hiển thị 1-4 trên tổng số 120 bản ghi" | "< Trang 1/30 >" ── */}
                    <div className={styles.paginationBar}>
                        <span className={styles.paginationInfo}>
                            {totalElements === 0
                                ? 'Không có bản ghi'
                                : `Hiển thị ${startItem}-${endItem} trên tổng số ${totalElements} bản ghi`}
                        </span>
                        <div className={styles.paginationControls}>
                            <button
                                className={styles.pageBtnSimple}
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                <i className="bi bi-chevron-left" />
                            </button>
                            <span className={styles.pageInfo}>Trang {currentPage} / {totalPages}</span>
                            <button
                                className={styles.pageBtnSimple}
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                <i className="bi bi-chevron-right" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Quick View Modal ── */}
                {selectedRepair && (
                    <RepairQuickViewModal
                        repair={selectedRepair}
                        onClose={() => setSelectedRepair(null)}
                        onEdit={() => navigate(`/repair-tickets/${selectedRepair.id}/edit`)}
                        onStatusChange={() => { loadRepairs(); setSelectedRepair(null); }}
                        showToast={showToast}
                    />
                )}

                <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
            </div>
        </AdminLayout>
    );
}

// ── Quick View Modal (click vào row) ─────────────────────────────────────────
function RepairQuickViewModal({ repair, onClose, onEdit, onStatusChange, showToast }) {
    const [activeTab, setActiveTab] = useState('lines');
    const [lines, setLines] = useState([]);
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const WORKFLOW = {
        DRAFT:        [{ label: 'Chuyển sang Báo giá', next: 'QUOTATION' }],
        QUOTATION:    [{ label: 'Xác nhận lệnh',       next: 'CONFIRMED' }],
        CONFIRMED:    [{ label: 'Bắt đầu sửa chữa',   next: 'UNDER_REPAIR' }],
        UNDER_REPAIR: [{ label: 'Kiểm tra / Test',     next: 'TESTING' }],
        TESTING:      [{ label: 'Hoàn tất lệnh',       next: 'DONE' }],
    };
    const STATUS_LABELS = {
        DRAFT: 'Nháp', QUOTATION: 'Báo giá', CONFIRMED: 'Xác nhận',
        UNDER_REPAIR: 'Đang sửa', TESTING: 'Kiểm tra', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy'
    };
    const STATUS_ORDER = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'UNDER_REPAIR', 'TESTING', 'DONE'];
    const canCancel = !['DONE', 'CANCELLED'].includes(repair.repairStatus);
    const transitions = WORKFLOW[repair.repairStatus] ?? [];
    const currentIdx = STATUS_ORDER.indexOf(repair.repairStatus);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [lRes, fRes] = await Promise.allSettled([
                repairApi.getRepairLines(repair.id),
                repairApi.getRepairFees(repair.id),
            ]);
            if (lRes.status === 'fulfilled') setLines(listFrom(unwrap(lRes.value)) ?? []);
            if (fRes.status === 'fulfilled') setFees(listFrom(unwrap(fRes.value)) ?? []);
            setLoading(false);
        };
        load();
    }, [repair.id]);

    const handleStatusUpdate = async (next) => {
        setActionLoading(true);
        try {
            await repairApi.updateRepairStatus(repair.id, next);
            showToast('success', `Chuyển sang "${STATUS_LABELS[next]}" thành công!`);
            onStatusChange?.();
        } catch (err) {
            showToast('error', err.response?.data?.message || err.response?.data?.userMessage || 'Không thể chuyển trạng thái.');
        } finally {
            setActionLoading(false);
            setConfirmAction(null);
        }
    };

    const fmtDate = (val) => val ? new Date(val).toLocaleDateString('vi-VN') : '—';
    const fmtMoney = (n) => `${Number(n ?? 0).toLocaleString('vi-VN')} đ`;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '1040px' }}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        <i className="bi bi-tools" style={{ color: 'var(--color-primary)' }} />
                        Chi tiết: {repair.repairCode}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {transitions.map(t => (
                            <button key={t.next} className={styles.btnPrimary} style={{ padding: '6px 14px', fontSize: '13px' }}
                                disabled={actionLoading}
                                onClick={() => setConfirmAction({ label: t.label, fn: () => handleStatusUpdate(t.next) })}
                            >{t.label}</button>
                        ))}
                        {canCancel && (
                            <button className={styles.btnOutline} style={{ padding: '6px 14px', fontSize: '13px' }}
                                disabled={actionLoading}
                                onClick={() => setConfirmAction({ label: 'Hủy lệnh sửa chữa', fn: () => handleStatusUpdate('CANCELLED') })}
                            >Hủy lệnh</button>
                        )}
                        <button className={styles.btnOutline} style={{ padding: '6px 14px', fontSize: '13px' }} onClick={onEdit}>
                            <i className="bi bi-pencil" /> Chỉnh sửa
                        </button>
                        <button className={styles.modalClose} onClick={onClose}>&times;</button>
                    </div>
                </div>

                <div className={styles.modalBody}>
                    {/* Status Stepper */}
                    {repair.repairStatus !== 'CANCELLED' ? (
                        <div className={styles.statusBar}>
                            {STATUS_ORDER.map((s, i) => {
                                let cls = styles.statusStep;
                                if (i < currentIdx) cls += ' ' + styles.statusStepDone;
                                if (i === currentIdx) cls += ' ' + styles.statusStepActive;
                                return <div key={s} className={cls}>{STATUS_LABELS[s]}</div>;
                            })}
                        </div>
                    ) : (
                        <div className={styles.statusBar}>
                            <div className={`${styles.statusStep} ${styles.statusStepCancelled}`}>Đã hủy</div>
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className={styles.detailGrid}>
                        <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                            {[
                                { label: 'Mã lệnh', value: repair.repairCode, blue: true },
                                { label: 'Khách hàng', value: repair.partnerId ? `Khách hàng #${repair.partnerId}` : '—' },
                                { label: 'Sản phẩm', value: repair.productId ? `[SP-${repair.productId}] Sản phẩm #${repair.productId}` : '—' },
                                { label: 'Số Serial máy', value: repair.serialNumberId ?? '—' },
                                { label: 'Mô tả lỗi', value: repair.issueDescription || '—' },
                            ].map(item => (
                                <div key={item.label} className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{item.label}</span>
                                    <span className={`${styles.detailValue} ${item.blue ? styles.textBlue : ''}`}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.detailRight}>
                            {[
                                { label: 'Ngày tiếp nhận', value: fmtDate(repair.receivedDate) },
                                { label: 'Dự kiến hoàn tất', value: fmtDate(repair.expectedDate) },
                                { label: 'Bảo hành', value: repair.underWarranty ? 'Có' : 'Không' },
                                { label: 'Phương thức HĐ', value: { none: 'Không xuất', b4repair: 'Trước sửa', after_repair: 'Sau sửa' }[repair.invoiceMethod] ?? '—' },
                                { label: 'Tổng chi phí', value: fmtMoney(repair.totalAmount), blue: true },
                            ].map(item => (
                                <div key={item.label} className={styles.detailRightRow}>
                                    <span className={styles.detailRightLabel}>{item.label}</span>
                                    <span className={`${styles.detailRightValue} ${item.blue ? styles.textBlue : ''}`}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabBar}>
                        {[{ key: 'lines', label: 'Linh kiện (Parts)' }, { key: 'fees', label: 'Phí dịch vụ (Fees)' }, { key: 'notes', label: 'Ghi chú' }].map(t => (
                            <button key={t.key} className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`} onClick={() => setActiveTab(t.key)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Lines Tab */}
                    {activeTab === 'lines' && (
                        loading ? <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted-2)' }}>Đang tải...</p> : (
                            <table className={styles.detailTable}>
                                <thead><tr>
                                    <th>#</th><th>Loại</th><th>Mã biến thể</th>
                                    <th className={styles.textRight}>Số lượng</th>
                                    <th className={styles.textRight}>Đơn giá</th>
                                    <th className={styles.textCenter}>Bảo hành</th>
                                    <th>Ghi chú</th>
                                </tr></thead>
                                <tbody>
                                    {lines.length > 0 ? lines.map((l, i) => (
                                        <tr key={l.id}>
                                            <td>{i + 1}</td>
                                            <td><span className={`${styles.badge} ${l.actionType === 'ADD' ? styles.badgeInfo : styles.badgeWarning}`}>{l.actionType === 'ADD' ? 'Lắp thêm' : 'Thu hồi'}</span></td>
                                            <td className={styles.textBlue}>#{l.componentVariantId}</td>
                                            <td className={styles.textRight}>{Number(l.quantity).toLocaleString('vi-VN')}</td>
                                            <td className={styles.textRight}>{l.isFreeWarranty ? <span className={`${styles.badge} ${styles.badgeSuccess}`}>Miễn phí</span> : fmtMoney(l.unitPrice)}</td>
                                            <td className={styles.textCenter}>{l.isFreeWarranty ? <i className="bi bi-shield-check" style={{ color: 'var(--color-success-strong)' }} /> : '—'}</td>
                                            <td>{l.note || '—'}</td>
                                        </tr>
                                    )) : <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted-2)' }}>Chưa có linh kiện nào</td></tr>}
                                </tbody>
                            </table>
                        )
                    )}

                    {/* Fees Tab */}
                    {activeTab === 'fees' && (
                        loading ? <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted-2)' }}>Đang tải...</p> : (
                            <table className={styles.detailTable}>
                                <thead><tr>
                                    <th>#</th><th>Tên phí dịch vụ</th>
                                    <th className={styles.textRight}>Số tiền</th>
                                    <th className={styles.textCenter}>Bảo hành</th>
                                    <th>Ghi chú</th>
                                </tr></thead>
                                <tbody>
                                    {fees.length > 0 ? fees.map((f, i) => (
                                        <tr key={f.id}>
                                            <td>{i + 1}</td>
                                            <td>{f.feeName}</td>
                                            <td className={styles.textRight}>{f.isFreeWarranty ? <span className={`${styles.badge} ${styles.badgeSuccess}`}>Miễn phí</span> : fmtMoney(f.feeAmount)}</td>
                                            <td className={styles.textCenter}>{f.isFreeWarranty ? <i className="bi bi-shield-check" style={{ color: 'var(--color-success-strong)' }} /> : '—'}</td>
                                            <td>{f.note || '—'}</td>
                                        </tr>
                                    )) : <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted-2)' }}>Chưa có phí dịch vụ nào</td></tr>}
                                </tbody>
                            </table>
                        )
                    )}

                    {/* Notes Tab */}
                    {activeTab === 'notes' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                { label: 'Ghi chú sửa chữa', value: repair.note },
                                { label: 'Ghi chú chẩn đoán', value: repair.diagnosisNote },
                                { label: 'Giải pháp xử lý', value: repair.solutionDescription },
                            ].map(item => (
                                <div key={item.label} className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{item.label}</span>
                                    <span className={styles.detailValue}>{item.value || '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Total row */}
                    {activeTab === 'lines' && lines.length > 0 && (
                        <div className={styles.detailFooter}>
                            <span style={{ color: 'var(--color-text-muted-2)' }}>Tổng chi phí lệnh:</span>
                            <span className={styles.textBlue}>{fmtMoney(repair.totalAmount)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            {confirmAction && (
                <ConfirmModal
                    isOpen={!!confirmAction}
                    title="Xác nhận thao tác"
                    message={`Bạn có chắc chắn muốn "${confirmAction.label}" cho lệnh ${repair.repairCode}?`}
                    onConfirm={() => confirmAction.fn()}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
}

export default RepairListPage;
