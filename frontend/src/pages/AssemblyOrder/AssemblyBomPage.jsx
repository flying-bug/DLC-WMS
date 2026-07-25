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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadBoms = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await assemblyApi.getAssemblyBoms({ status: statusFilter || undefined });
            setBoms(listFrom(unwrap(response)));
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

                <div className={styles.toolbar}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                <option value="">Tất cả</option>
                                <option value="APPROVED">Đã duyệt</option>
                                <option value="DRAFT">Nháp</option>
                                <option value="INACTIVE">Ngừng dùng</option>
                            </select>
                        </label>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => setStatusFilter('')}>Làm mới</button>
                        <button className={styles.primaryButton} type="button" onClick={loadBoms}>
                            <i className="bi bi-funnel"></i>
                            Lọc dữ liệu
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
                            {boms.length > 0 ? boms.map((bom) => {
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
                </div>

            </div>
        </AdminLayout>
    );

}

export default AssemblyBomPage;
