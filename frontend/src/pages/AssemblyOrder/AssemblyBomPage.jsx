import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import { exportToExcel } from '../../utils/excelExport';
import * as assemblyApi from '../../api/assemblyOrderApi';
import styles from './AssemblyOrderPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    INACTIVE: { label: 'Ngừng dùng', tone: 'danger' }
};

const COLUMN_OPTIONS = [
    { id: 'bomCode', label: 'Mã cấu hình' },
    { id: 'bomName', label: 'Tên cấu hình' },
    { id: 'product', label: 'Thành phẩm' },
    { id: 'version', label: 'Phiên bản' },
    { id: 'itemCount', label: 'Số linh kiện' },
    { id: 'status', label: 'Trạng thái' }
];

const DEFAULT_COLUMNS = {
    bomCode: true,
    bomName: true,
    product: true,
    version: true,
    itemCount: true,
    status: true
};

function AssemblyBomPage() {
    const navigate = useNavigate();
    const [boms, setBoms] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [keywordFilter, setKeywordFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('dlc_assembly_bom_columns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const toggleColumn = (colId) => {
        setColumns(prev => {
            const next = { ...prev, [colId]: !prev[colId] };
            localStorage.setItem('dlc_assembly_bom_columns', JSON.stringify(next));
            return next;
        });
    };

    // Pagination states
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const loadBoms = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await assemblyApi.getAssemblyBoms({});
            setBoms(listFrom(unwrap(response)));
            setPage(1);
        } catch (err) {
            setBoms([]);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách cấu hình.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadBoms();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadBoms]);

    const stats = useMemo(() => ({
        total: boms.length,
        approved: boms.filter((item) => item.status === 'APPROVED').length,
        draft: boms.filter((item) => item.status === 'DRAFT').length,
        inactive: boms.filter((item) => item.status === 'INACTIVE').length
    }), [boms]);

    const openCreate = () => {
        navigate('/assembly-boms/create');
    };

    const openEdit = (bom) => {
        navigate(`/assembly-boms/${bom.id}`);
    };

    const filteredBoms = useMemo(() => {
        let result = boms;

        if (statusFilter) {
            result = result.filter(bom => bom.status === statusFilter);
        }

        if (keywordFilter) {
            const lower = keywordFilter.toLowerCase();
            result = result.filter(bom =>
                (bom.bomCode && bom.bomCode.toLowerCase().includes(lower)) ||
                (bom.bomName && bom.bomName.toLowerCase().includes(lower)) ||
                (bom.productCode && bom.productCode.toLowerCase().includes(lower)) ||
                (bom.productName && bom.productName.toLowerCase().includes(lower))
            );
        }
        return result;
    }, [boms, keywordFilter, statusFilter]);

    const handleExport = () => {
        if (filteredBoms.length === 0) {
            setError('Không có dữ liệu để xuất Excel');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const headers = COLUMN_OPTIONS.filter(c => columns[c.id]).map(c => c.label);
        const data = filteredBoms.map(bom => {
            const row = [];
            if (columns.bomCode) row.push(bom.bomCode);
            if (columns.bomName) row.push(bom.bomName);
            if (columns.product) row.push(`${bom.productCode || ''} - ${bom.productName || ''}`.trim() || '---');
            if (columns.version) row.push(Number(bom.versionNo || 0).toLocaleString('vi-VN'));
            if (columns.itemCount) row.push(bom.lines ? bom.lines.length : 0);
            if (columns.status) row.push(STATUS_META[bom.status]?.label || bom.status);
            return row;
        });

        exportToExcel(headers, data, 'Danh_sach_BOM');
        setSuccess('Xuất Excel thành công!');
        setTimeout(() => setSuccess(''), 3000);
    };

    // Client-side pagination logic
    const totalElements = filteredBoms.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const currentBoms = filteredBoms.slice((page - 1) * pageSize, page * pageSize);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Quản lý Cấu hình</h1>
                        <p className={styles.pageSubtitle}>Thiết lập định mức linh kiện cho thành phẩm trước khi lập lệnh lắp ráp hoặc tháo dỡ.</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.primaryButton} type="button" onClick={openCreate}>
                            <i className="bi bi-plus-lg"></i>
                            Tạo cấu hình
                        </button>
                    </div>
                </div>

                <div className={styles.summaryCards}>

                    <div
                        className={`${styles.summaryCard} ${statusFilter === 'APPROVED' ? styles.activeCardSuccess : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'APPROVED' ? '' : 'APPROVED'); setPage(1); }}
                    >
                        <div className={styles.iconSuccess}>
                            <i className="bi bi-check-circle-fill"></i>
                        </div>
                        <div className={styles.cardInfo}>
                            <h3>{stats.approved}</h3>
                            <p>Đã duyệt</p>
                        </div>
                    </div>
                    <div
                        className={`${styles.summaryCard} ${statusFilter === 'DRAFT' ? styles.activeCardSecondary : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT'); setPage(1); }}
                    >
                        <div className={styles.iconSecondary}>
                            <i className="bi bi-file-earmark-text-fill"></i>
                        </div>
                        <div className={styles.cardInfo}>
                            <h3>{stats.draft}</h3>
                            <p>Nháp</p>
                        </div>
                    </div>
                    <div
                        className={`${styles.summaryCard} ${statusFilter === 'INACTIVE' ? styles.activeCardDanger : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'INACTIVE' ? '' : 'INACTIVE'); setPage(1); }}
                    >
                        <div className={styles.iconDanger}>
                            <i className="bi bi-x-circle-fill"></i>
                        </div>
                        <div className={styles.cardInfo}>
                            <h3>{stats.inactive}</h3>
                            <p>Ngừng dùng</p>
                        </div>
                    </div>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.searchAndPopover}>
                        <div className={styles.searchBox}>
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Nhập từ khóa tìm kiếm mã/tên cấu hình..."
                                value={keywordFilter}
                                onChange={(e) => { setKeywordFilter(e.target.value); setPage(1); }}
                            />
                            {keywordFilter && (
                                <button className={styles.clearSearchBtn} onClick={() => { setKeywordFilter(''); setPage(1); }}>
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            )}
                        </div>


                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setStatusFilter(''); setKeywordFilter(''); setPage(1); }}
                            title="Tải lại"
                        >
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={handleExport}
                            title="Xuất tệp Excel"
                        >
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setShowSettingsModal(true)}
                            title="Thiết lập cột hiển thị"
                        >
                            <i className="bi bi-gear"></i>
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}
                {success && <div className={styles.successBox}>{success}</div>}

                <div className={styles.tablePanel}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {columns.bomCode && <th>Mã cấu hình</th>}
                                {columns.bomName && <th>Tên cấu hình</th>}
                                {columns.product && <th>Thành phẩm</th>}
                                {columns.version && <th>Phiên bản</th>}
                                {columns.itemCount && <th>Số linh kiện</th>}
                                {columns.status && <th>Trạng thái</th>}
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentBoms.length > 0 ? currentBoms.map((bom) => {
                                const status = STATUS_META[bom.status] || { label: bom.status || 'Chưa rõ', tone: 'info' };
                                return (
                                    <tr key={bom.id} onClick={() => openEdit(bom)}>
                                        {columns.bomCode && <td><span className={styles.linkText}>{bom.bomCode}</span></td>}
                                        {columns.bomName && <td>{bom.bomName}</td>}
                                        {columns.product && <td>{bom.productCode} - {bom.productName}</td>}
                                        {columns.version && <td>{Number(bom.versionNo || 0).toLocaleString('vi-VN')}</td>}
                                        {columns.itemCount && <td>{bom.lines?.length || 0}</td>}
                                        {columns.status && <td><span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span></td>}
                                        <td>
                                            <button className={styles.iconButton} type="button" title="Sửa BOM" onClick={(event) => { event.stopPropagation(); openEdit(bom); }}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan={Object.values(columns).filter(Boolean).length + 1}>{loading ? 'Đang tải danh sách cấu hình...' : 'Chưa có cấu hình phù hợp.'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Hiển thị</span>
                            <select
                                className="misa-select"
                                style={{ width: '70px', height: '32px', padding: '0 8px' }}
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span>trên tổng số {totalElements} bản ghi</span>
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pageControls}>
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className={styles.pageBtn}
                                >
                                    <i className="bi bi-chevron-left"></i> Trước
                                </button>

                                <div className={styles.paginationNumbers}>
                                    {getPageNumbers().map((num, idx) => (
                                        num === page ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                onBlur={(e) => e.target.value = page}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        let p = parseInt(e.target.value, 10);
                                                        if (!isNaN(p)) {
                                                            p = Math.max(1, Math.min(totalPages, p));
                                                            setPage(p);
                                                            e.target.blur();
                                                        } else {
                                                            e.target.value = page;
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span
                                                key={idx}
                                                className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                                                onClick={() => num !== '...' && setPage(num)}
                                            >
                                                {num}
                                            </span>
                                        )
                                    ))}
                                </div>

                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className={styles.pageBtn}
                                >
                                    Sau <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            <Modal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                ariaLabel="Thiết lập cột hiển thị"
            >
                <div className={styles.settingsModalHeader}>
                    <h3>Thiết lập cột hiển thị</h3>
                    <button className={styles.settingsModalCloseBtn} onClick={() => setShowSettingsModal(false)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className={styles.settingsModalBody}>
                    <div className={styles.checkboxGrid}>
                        {COLUMN_OPTIONS.map(col => (
                            <label key={col.id} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={columns[col.id]}
                                    onChange={() => toggleColumn(col.id)}
                                />
                                <span className={styles.checkboxText}>{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className={styles.settingsModalFooter}>
                    <button className={styles.btnSecondary} onClick={() => setColumns(DEFAULT_COLUMNS)}>
                        Đặt lại
                    </button>
                    <button className={styles.btnPrimary} onClick={() => setShowSettingsModal(false)}>
                        Hoàn tất
                    </button>
                </div>
            </Modal>
        </AdminLayout>
    );

}

export default AssemblyBomPage;
