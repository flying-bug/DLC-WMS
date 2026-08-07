import { useState, useEffect, useCallback } from 'react';
import * as assemblyOrderApi from '../../../api/assemblyOrderApi';
import styles from './AssemblyOrderSelectionModal.module.css';
import { formatDateOnly } from '../../../utils/dateFormat';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];

const TYPE_META = {
    'ASSEMBLY': 'Lắp ráp',
    'DISASSEMBLY': 'Tháo dỡ'
};

const formatDate = formatDateOnly;

const AssemblyOrderSelectionModal = ({ isOpen, onClose, onSelect }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [filters, setFilters] = useState({
        keyword: '',
        fromDate: '',
        toDate: ''
    });

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const payload = {
                size: 100,
                page: 0
            };
            if (filters.keyword) payload.keyword = filters.keyword;
            if (filters.fromDate) payload.fromDate = filters.fromDate;
            if (filters.toDate) payload.toDate = filters.toDate;

            const res = await assemblyOrderApi.getAssemblyOrders(payload);
            setOrders(pageContent(unwrap(res)));
        } catch (error) {
            console.error('Lỗi khi tải lệnh sản xuất:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (isOpen) {
             
            loadOrders();
        } else {
            setSelectedOrderId(null);
        }
    }, [isOpen, loadOrders]);

    const handleConfirm = () => {
        if (!selectedOrderId) return;
        const selectedOrder = orders.find(o => String(o.id) === String(selectedOrderId));
        if (selectedOrder) {
            onSelect(selectedOrder);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.headerTitle}>Chọn Lệnh sản xuất</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.filterBar}>
                        <div className={styles.filterGroup}>
                            <label>Từ khóa</label>
                            <input 
                                type="text" 
                                className={styles.filterInput} 
                                placeholder="Nhập mã lệnh..."
                                value={filters.keyword}
                                onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Từ ngày</label>
                            <input 
                                type="date" 
                                className={styles.filterInput}
                                value={filters.fromDate}
                                onChange={e => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Đến ngày</label>
                            <input 
                                type="date" 
                                className={styles.filterInput}
                                value={filters.toDate}
                                onChange={e => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                            />
                        </div>
                        <button className={styles.btnFetch} onClick={loadOrders}>
                            Lấy dữ liệu
                        </button>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.radioCell}></th>
                                    <th>Mã lệnh</th>
                                    <th>Loại</th>
                                    <th>Cấu hình</th>
                                    <th>Thành phẩm</th>
                                    <th>Ngày thực hiện</th>
                                    <th>Tiến độ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>Đang tải dữ liệu...</td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>Không tìm thấy lệnh sản xuất nào</td>
                                    </tr>
                                ) : (
                                    orders.map(order => (
                                        <tr 
                                            key={order.id} 
                                            className={String(selectedOrderId) === String(order.id) ? styles.selected : ''}
                                            onClick={() => setSelectedOrderId(order.id)}
                                        >
                                            <td className={styles.radioCell}>
                                                <input 
                                                    type="radio" 
                                                    name="selectedAssemblyOrder" 
                                                    checked={String(selectedOrderId) === String(order.id)} 
                                                    onChange={() => setSelectedOrderId(order.id)} 
                                                />
                                            </td>
                                            <td style={{ color: '#2563eb', fontWeight: 500 }}>{order.orderCode}</td>
                                            <td>{TYPE_META[order.orderType] || order.orderType}</td>
                                            <td>{order.bomCode || order.bomName || 'Chưa có'}</td>
                                            <td>{order.targetName || order.targetSku || 'Chưa có'}</td>
                                            <td>{formatDate(order.executionDate)}</td>
                                            <td>
                                                <span title={`Đã thực hiện: ${order.quantityProduced ?? 0} / ${order.quantity ?? 0}`}>
                                                    {Number(order.quantityProduced ?? 0).toLocaleString('vi-VN')} / {Number(order.quantity ?? 0).toLocaleString('vi-VN')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={styles.footer}>
                    <div className={styles.recordCount}>
                        Tổng số: <strong>{orders.length}</strong> bản ghi
                    </div>
                    <div className={styles.footerActions}>
                        <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                        <button className={styles.btnConfirm} onClick={handleConfirm} disabled={!selectedOrderId}>Đồng ý</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssemblyOrderSelectionModal;
