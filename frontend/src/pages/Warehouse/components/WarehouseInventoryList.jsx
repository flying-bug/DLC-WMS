import { useState, useEffect } from 'react';
import * as warehouseApi from '../../../api/warehouseApi';
import styles from './WarehouseInventoryList.module.css';

const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0 â‚«';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatNumber = (value) => {
    if (value === undefined || value === null) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
};

const WarehouseInventoryList = ({ warehouseId }) => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await warehouseApi.getWarehouseInventory(warehouseId);
            setInventory(res.data.data || []);
        } catch (error) {
            console.error('Lá»—i táº£i dá»¯ liá»‡u tá»“n kho:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
         
        fetchInventory();
         
    }, [warehouseId]);

    // Lá»c dá»¯ liá»‡u theo search query
    const filteredInventory = inventory.filter(item => {
        const query = search.toLowerCase();
        return (
            (item.productCode && item.productCode.toLowerCase().includes(query)) ||
            (item.productName && item.productName.toLowerCase().includes(query)) ||
            (item.sku && item.sku.toLowerCase().includes(query)) ||
            (item.variantName && item.variantName.toLowerCase().includes(query))
        );
    });

    // TÃ­nh toÃ¡n phÃ¢n trang
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Reset trang hiá»‡n táº¡i khi tÃ¬m kiáº¿m thay Ä‘á»•i
    useEffect(() => {
         
        setCurrentPage(1);
    }, [search]);

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <div className={styles.searchWrapper}>
                        <i className="fas fa-search"></i>
                        <input 
                            type="text" 
                            placeholder="TÃ¬m theo mÃ£ hÃ ng, tÃªn, SKU..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>
                <button className={styles.btnRefresh} onClick={fetchInventory} title="LÃ m má»›i">
                    <i className="fas fa-sync-alt"></i> Táº£i láº¡i
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Äang táº£i dá»¯ liá»‡u tá»“n kho...</div>
                ) : filteredInventory.length === 0 ? (
                    <div className={styles.empty}>KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m nÃ o trong kho.</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>STT</th>
                                <th>MÃ£ sáº£n pháº©m</th>
                                <th>TÃªn sáº£n pháº©m</th>
                                <th>MÃ£ SKU</th>
                                <th>PhiÃªn báº£n</th>
                                <th style={{ textAlign: 'right' }}>Tá»“n kho thá»±c táº¿</th>
                                <th style={{ textAlign: 'right' }}>Äang giá»¯ hÃ ng</th>
                                <th style={{ textAlign: 'right' }}>Kháº£ dá»¥ng</th>
                                <th style={{ textAlign: 'right' }}>GiÃ¡ trá»‹ tá»“n</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((item, idx) => {
                                const stt = indexOfFirstItem + idx + 1;
                                const isLowStock = item.availableQuantity <= 5;
                                return (
                                    <tr key={`${item.sku}-${idx}`}>
                                        <td>{stt}</td>
                                        <td className={styles.codeCell}>{item.productCode}</td>
                                        <td>{item.productName}</td>
                                        <td className={styles.skuCell}>{item.sku}</td>
                                        <td>{item.variantName}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                            {formatNumber(item.quantityOnHand)}
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                                            {formatNumber(item.quantityReserved)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={`${styles.qtyBadge} ${isLowStock ? styles.lowStock : styles.normalStock}`}>
                                                {formatNumber(item.availableQuantity)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '500', color: 'var(--color-primary, #002b6b)' }}>
                                            {formatCurrency(item.inventoryValue)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={styles.pageBtn}
                    >
                        TrÆ°á»›c
                    </button>
                    <span className={styles.pageInfo}>Trang {currentPage} / {totalPages}</span>
                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={styles.pageBtn}
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
};

export default WarehouseInventoryList;
