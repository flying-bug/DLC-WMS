import { useState, useEffect, useCallback } from 'react';
import * as assemblyOrderApi from '../../../api/assemblyOrderApi';
import styles from './AssemblyOrderSelectionModal.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];

const TYPE_META = {
    'ASSEMBLY': 'Láº¯p rÃ¡p',
    'DISASSEMBLY': 'ThÃ¡o dá»¡'
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
};

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
            console.error('Lá»—i khi táº£i lá»‡nh sáº£n xuáº¥t:', error);
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
                    <h2 className={styles.headerTitle}>Chá»n Lá»‡nh sáº£n xuáº¥t</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.filterBar}>
                        <div className={styles.filterGroup}>
                            <label>Tá»« khÃ³a</label>
                            <input 
                                type="text" 
                                className={styles.filterInput} 
                                placeholder="Nháº­p mÃ£ lá»‡nh..."
                                value={filters.keyword}
                                onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Tá»« ngÃ y</label>
                            <input 
                                type="date" 
                                className={styles.filterInput}
                                value={filters.fromDate}
                                onChange={e => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Äáº¿n ngÃ y</label>
                            <input 
                                type="date" 
                                className={styles.filterInput}
                                value={filters.toDate}
                                onChange={e => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                            />
                        </div>
                        <button className={styles.btnFetch} onClick={loadOrders}>
                            Láº¥y dá»¯ liá»‡u
                        </button>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.radioCell}></th>
                                    <th>MÃ£ lá»‡nh</th>
                                    <th>Loáº¡i</th>
                                    <th>BOM</th>
                                    <th>ThÃ nh pháº©m</th>
                                    <th>NgÃ y thá»±c hiá»‡n</th>
                                    <th>Tiáº¿n Ä‘á»™</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>Äang táº£i dá»¯ liá»‡u...</td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>KhÃ´ng tÃ¬m tháº¥y lá»‡nh sáº£n xuáº¥t nÃ o</td>
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
                                            <td>{order.bomCode || order.bomName || 'ChÆ°a cÃ³'}</td>
                                            <td>{order.targetName || order.targetSku || 'ChÆ°a cÃ³'}</td>
                                            <td>{formatDate(order.executionDate)}</td>
                                            <td>
                                                <span title={`ÄÃ£ thá»±c hiá»‡n: ${order.quantityProduced ?? 0} / ${order.quantity ?? 0}`}>
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
                        Tá»•ng sá»‘: <strong>{orders.length}</strong> báº£n ghi
                    </div>
                    <div className={styles.footerActions}>
                        <button className={styles.btnCancel} onClick={onClose}>Há»§y</button>
                        <button className={styles.btnConfirm} onClick={handleConfirm} disabled={!selectedOrderId}>Äá»“ng Ã½</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssemblyOrderSelectionModal;
