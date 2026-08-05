import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as assemblyApi from '../../api/assemblyOrderApi';
import styles from './AssemblyOrderPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    INACTIVE: { label: 'Ngừng dùng', tone: 'danger' }
};

function AssemblyBomPage() {
    const navigate = useNavigate();
    const [boms, setBoms] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [keywordFilter, setKeywordFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pagination states
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const loadBoms = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await assemblyApi.getAssemblyBoms({ status: statusFilter || undefined });
            setBoms(listFrom(unwrap(response)));
            setPage(1);
        } catch (err) {
            setBoms([]);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách BOM.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

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
    }, [boms, keywordFilter]);

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
                        <h1 className={styles.pageTitle}>Quản lý BOM</h1>
                        <p className={styles.pageSubtitle}>Thiết lập định mức linh kiện cho thành phẩm trước khi lập lệnh lắp ráp hoặc tháo dỡ.</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.primaryButton} type="button" onClick={openCreate}>
                            <i className="bi bi-plus-lg"></i>
                            Tạo BOM
                        </button>
                    </div>
                </div>

                <div className={styles.detailGrid}>
                    <div className={styles.detailItem}><span>Tổng BOM</span><strong>{stats.total}</strong></div>
                    <div className={styles.detailItem}><span>Đã duyệt</span><strong>{stats.approved}</strong></div>
                    <div className={styles.detailItem}><span>Nháp</span><strong>{stats.draft}</strong></div>
                    <div className={styles.detailItem}><span>Ngừng dùng</span><strong>{stats.inactive}</strong></div>
                </div>

                <div className={styles.toolbar} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className={styles.filterGrid} style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '300px' }}>
                        <label className={styles.field} style={{ flex: 2 }}>
                            <span>Tìm kiếm (Mã/Tên BOM, Mã/Tên thành phẩm)</span>
                            <input
                                type="text"
                                placeholder="Nhập từ khóa tìm kiếm..."
                                value={keywordFilter}
                                onChange={(e) => { setKeywordFilter(e.target.value); setPage(1); }}
                                style={{ height: '38px' }}
                            />
                        </label>
                        <label className={styles.field} style={{ flex: 1 }}>
                            <span>Trạng thái</span>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ height: '38px' }}>
                                <option value="">Tất cả</option>
                                <option value="APPROVED">Đã duyệt</option>
                                <option value="DRAFT">Nháp</option>
                                <option value="INACTIVE">Ngừng dùng</option>
                            </select>
                        </label>
                    </div>
                    <div className={styles.actions} style={{ margin: 0, paddingBottom: '2px' }}>
                        <button className={styles.secondaryButton} type="button" onClick={() => { setStatusFilter(''); setKeywordFilter(''); setPage(1); }}>
                            Làm mới
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={loadBoms}>
                            <i className="bi bi-arrow-clockwise"></i>
                            Tải lại
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}
                {success && <div className={styles.successBox}>{success}</div>}

                <div className={styles.tablePanel}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã BOM</th>
                                <th>Tên BOM</th>
                                <th>Thành phẩm</th>
                                <th>Phiên bản</th>
                                <th>Số linh kiện</th>
                                <th>Trạng thái</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentBoms.length > 0 ? currentBoms.map((bom) => {
                                const status = STATUS_META[bom.status] || { label: bom.status || 'Chưa rõ', tone: 'info' };
                                return (
                                    <tr key={bom.id} onClick={() => openEdit(bom)}>
                                        <td><span className={styles.linkText}>{bom.bomCode}</span></td>
                                        <td>{bom.bomName}</td>
                                        <td>{bom.productCode} - {bom.productName}</td>
                                        <td>{Number(bom.versionNo || 0).toLocaleString('vi-VN')}</td>
                                        <td>{bom.lines?.length || 0}</td>
                                        <td><span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span></td>
                                        <td>
                                            <button className={styles.iconButton} type="button" title="Sửa BOM" onClick={(event) => { event.stopPropagation(); openEdit(bom); }}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan="7">{loading ? 'Đang tải danh sách BOM...' : 'Chưa có BOM phù hợp.'}</td>
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
        </AdminLayout>
    );

}

export default AssemblyBomPage;
