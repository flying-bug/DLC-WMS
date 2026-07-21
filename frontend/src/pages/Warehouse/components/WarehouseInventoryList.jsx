import { useState, useEffect } from 'react';
import * as warehouseApi from '../../../api/warehouseApi';
import styles from './WarehouseInventoryList.module.css';

const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0 ₫';
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
            console.error('Lỗi tải dữ liệu tồn kho:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
         
        fetchInventory();
         
    }, [warehouseId]);

    // Lọc dữ liệu theo search query
    const filteredInventory = inventory.filter(item => {
        const query = search.toLowerCase();
        return (
            (item.productCode && item.productCode.toLowerCase().includes(query)) ||
            (item.productName && item.productName.toLowerCase().includes(query)) ||
            (item.sku && item.sku.toLowerCase().includes(query)) ||
            (item.variantName && item.variantName.toLowerCase().includes(query))
        );
    });

    // Tính toán phân trang
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Reset trang hiện tại khi tìm kiếm thay đổi
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
                            placeholder="Tìm theo mã hàng, tên, SKU..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>
                <button className={styles.btnRefresh} onClick={fetchInventory} title="Làm mới">
                    <i className="fas fa-sync-alt"></i> Tải lại
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Đang tải dữ liệu tồn kho...</div>
                ) : filteredInventory.length === 0 ? (
                    <div className={styles.empty}>Không tìm thấy sản phẩm nào trong kho.</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>STT</th>
                                <th>Mã sản phẩm</th>
                                <th>Tên sản phẩm</th>
                                <th>Mã SKU</th>
                                <th>Phiên bản</th>
                                <th style={{ textAlign: 'right' }}>Tồn kho thực tế</th>
                                <th style={{ textAlign: 'right' }}>Đang giữ hàng</th>
                                <th style={{ textAlign: 'right' }}>Khả dụng</th>
                                <th style={{ textAlign: 'right' }}>Giá trị tồn</th>
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
                        Trước
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
