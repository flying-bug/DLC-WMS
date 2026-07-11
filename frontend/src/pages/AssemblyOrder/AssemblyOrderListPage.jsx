import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as assemblyApi from '../../api/assemblyOrderApi';
import * as warehouseApi from '../../api/warehouseApi';
import styles from './AssemblyOrderPage.module.css';

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    SUBMITTED: { label: 'Chờ duyệt', tone: 'warning' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    POSTED: { label: 'Đã ghi sổ', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' }
};

const TYPE_META = {
    ASSEMBLY: 'Lắp ráp',
    DISASSEMBLY: 'Tháo dỡ'
};

const DEFAULT_FILTERS = {
    keyword: '',
    orderType: '',
    status: '',
    warehouseId: '',
    fromDate: '',
    toDate: ''
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có');

function AssemblyOrderListPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [orders, setOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadWarehouses = useCallback(async () => {
        try {
            const response = await warehouseApi.getWarehouses({ page: 0, size: 200 });
            setWarehouses(listFrom(unwrap(response)));
        } catch {
            setWarehouses([]);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await assemblyApi.getAssemblyOrders({
                keyword: filters.keyword || undefined,
                orderType: filters.orderType || undefined,
                status: filters.status || undefined,
                warehouseId: filters.warehouseId || undefined,
                fromDate: filters.fromDate || undefined,
                toDate: filters.toDate || undefined
            });
            setOrders(listFrom(unwrap(response)));
        } catch (err) {
            setOrders([]);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được lịch sử lắp ráp/tháo dỡ.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadWarehouses();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadWarehouses]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadOrders();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadOrders]);

    const stats = useMemo(() => ({
        total: orders.length,
        assembly: orders.filter((item) => item.orderType === 'ASSEMBLY').length,
        disassembly: orders.filter((item) => item.orderType === 'DISASSEMBLY').length
    }), [orders]);

    const setFilter = (field, value) => {
        setFilters((current) => ({ ...current, [field]: value }));
    };

    const warehouseName = (id) => {
        const warehouse = warehouses.find((item) => String(item.id) === String(id));
        return warehouse?.name || warehouse?.warehouseName || (id ? `Kho #${id}` : 'Chưa chọn');
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Lịch sử lắp ráp / tháo dỡ</h1>
                        <p className={styles.pageSubtitle}>Theo dõi các lệnh tạo máy thành phẩm và rã linh kiện theo BOM.</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => navigate('/assembly-orders/create?type=DISASSEMBLY')}>
                            <i className="bi bi-box-arrow-down"></i>
                            Tạo tháo dỡ
                        </button>
                        <button className={styles.primaryButton} type="button" onClick={() => navigate('/assembly-orders/create?type=ASSEMBLY')}>
                            <i className="bi bi-plus-lg"></i>
                            Tạo lắp ráp
                        </button>
                    </div>
                </div>

                <div className={styles.detailGrid}>
                    <div className={styles.detailItem}><span>Tổng lệnh</span><strong>{stats.total}</strong></div>
                    <div className={styles.detailItem}><span>Lệnh lắp ráp</span><strong>{stats.assembly}</strong></div>
                    <div className={styles.detailItem}><span>Lệnh tháo dỡ</span><strong>{stats.disassembly}</strong></div>
                    <div className={styles.detailItem}><span>Đang hiển thị</span><strong>{loading ? 'Đang tải' : `${orders.length} dòng`}</strong></div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Tìm kiếm</span>
                            <input value={filters.keyword} onChange={(event) => setFilter('keyword', event.target.value)} placeholder="Mã lệnh, BOM, SKU..." />
                        </label>
                        <label className={styles.field}>
                            <span>Loại lệnh</span>
                            <select value={filters.orderType} onChange={(event) => setFilter('orderType', event.target.value)}>
                                <option value="">Tất cả</option>
                                <option value="ASSEMBLY">Lắp ráp</option>
                                <option value="DISASSEMBLY">Tháo dỡ</option>
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                                <option value="">Tất cả</option>
                                {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Kho</span>
                            <select value={filters.warehouseId} onChange={(event) => setFilter('warehouseId', event.target.value)}>
                                <option value="">Tất cả</option>
                                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.warehouseName}</option>)}
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
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>Làm mới</button>
                        <button className={styles.primaryButton} type="button" onClick={loadOrders}>
                            <i className="bi bi-funnel"></i>
                            Lọc dữ liệu
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.tablePanel}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã lệnh</th>
                                <th>Loại</th>
                                <th>BOM</th>
                                <th>Thành phẩm</th>
                                <th>Kho</th>
                                <th>Số lượng</th>
                                <th>Tiến độ</th>
                                <th>Ngày thực hiện</th>
                                <th>Trạng thái</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length > 0 ? orders.map((order) => {
                                const status = STATUS_META[order.status] || { label: order.status || 'Chưa rõ', tone: 'info' };
                                return (
                                    <tr key={order.id} onClick={() => navigate(`/assembly-orders/${order.id}`)}>
                                        <td><span className={styles.linkText}>{order.orderCode}</span></td>
                                        <td>{TYPE_META[order.orderType] || order.orderType}</td>
                                        <td>{order.bomCode || order.bomName || 'Chưa có'}</td>
                                        <td>{order.targetName || order.targetSku || 'Chưa có'}</td>
                                        <td>{warehouseName(order.warehouseId)}</td>
                                        <td>{Number(order.quantity || 0).toLocaleString('vi-VN')}</td>
                                        <td>
                                            <span title={`Đã thực hiện: ${order.quantityProduced ?? 0} / ${order.quantity ?? 0}`}>
                                                {Number(order.quantityProduced ?? 0).toLocaleString('vi-VN')} / {Number(order.quantity ?? 0).toLocaleString('vi-VN')}
                                            </span>
                                        </td>
                                        <td>{formatDate(order.executionDate)}</td>
                                        <td><span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span></td>
                                        <td>
                                            <button className={styles.iconButton} type="button" title="Xem chi tiết" onClick={(event) => { event.stopPropagation(); navigate(`/assembly-orders/${order.id}`); }}>
                                                <i className="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan="9">{loading ? 'Đang tải lịch sử...' : 'Chưa có lệnh lắp ráp/tháo dỡ phù hợp.'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}

export default AssemblyOrderListPage;
