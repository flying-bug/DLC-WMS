import React, { useState, useEffect, Fragment } from 'react';
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
    
    // State quản lý Expandable Table
    const [expandedVariants, setExpandedVariants] = useState({});
    const [variantTrees, setVariantTrees] = useState({});
    const [expandedSerials, setExpandedSerials] = useState({});

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
        // Reset states when warehouse changes
        setExpandedVariants({});
        setVariantTrees({});
        setExpandedSerials({});
    }, [warehouseId]);

    const [showBackorderedOnly, setShowBackorderedOnly] = useState(false);

    // Lọc dữ liệu theo search query và toggle
    const filteredInventory = inventory.filter(item => {
        const query = search.toLowerCase();
        const matchesSearch = (
            (item.productCode && item.productCode.toLowerCase().includes(query)) ||
            (item.productName && item.productName.toLowerCase().includes(query)) ||
            (item.sku && item.sku.toLowerCase().includes(query)) ||
            (item.variantName && item.variantName.toLowerCase().includes(query))
        );

        if (showBackorderedOnly) {
            return matchesSearch && item.availableQuantity < 0;
        }
        return matchesSearch;
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
    }, [search, showBackorderedOnly]);

    const toggleVariant = async (variantId) => {
        const isCurrentlyExpanded = expandedVariants[variantId];
        
        if (!isCurrentlyExpanded && !variantTrees[variantId]) {
            // Cần fetch dữ liệu
            setVariantTrees(prev => ({ ...prev, [variantId]: { loading: true, data: [] } }));
            try {
                const res = await warehouseApi.getSerialTree(warehouseId, variantId);
                setVariantTrees(prev => ({ 
                    ...prev, 
                    [variantId]: { loading: false, data: res.data.data || [] } 
                }));
            } catch (error) {
                console.error("Lỗi khi tải cây serial:", error);
                setVariantTrees(prev => ({ 
                    ...prev, 
                    [variantId]: { loading: false, data: [], error: true } 
                }));
            }
        }

        setExpandedVariants(prev => ({
            ...prev,
            [variantId]: !isCurrentlyExpanded
        }));
    };

    const toggleSerial = (serialNumber) => {
        setExpandedSerials(prev => ({
            ...prev,
            [serialNumber]: !prev[serialNumber]
        }));
    };

    const renderVariantTree = (variantId) => {
        const treeState = variantTrees[variantId];
        if (!treeState) return null;
        if (treeState.loading) {
            return <div className={styles.subLoading}>Đang tải danh sách Serial...</div>;
        }
        if (treeState.error) {
            return <div className={styles.subError}>Lỗi khi tải dữ liệu!</div>;
        }
        if (!treeState.data || treeState.data.length === 0) {
            return <div className={styles.subEmpty}>Không có Serial nào trong kho cho mặt hàng này.</div>;
        }

        const hasAnyComponents = treeState.data.some(t => t.components && t.components.length > 0);

        if (!hasAnyComponents) {
            return (
                <div className={styles.modernSerialContainer}>
                    <div className={styles.modernSerialHeader}>
                        <i className="bi bi-list-check" style={{ fontSize: '16px', color: 'var(--color-primary)' }}></i>
                        Danh sách {treeState.data.length} Serial khả dụng
                    </div>
                    <div className={styles.modernSerialGrid}>
                        {treeState.data.map((tree, idx) => (
                            <div key={tree.targetSerial} className={styles.modernSerialItem} title={tree.targetSerial}>
                                <div className={styles.modernSerialIcon}>
                                    <i className="bi bi-upc-scan"></i>
                                </div>
                                <div className={styles.modernSerialText}>
                                    {tree.targetSerial}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.treeContainer}>
                <table className={styles.treeTable}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Mã Serial</th>
                            <th>Cấu trúc</th>
                        </tr>
                    </thead>
                    <tbody>
                        {treeState.data.map(tree => {
                            const hasComponents = tree.components && tree.components.length > 0;
                            const isSerialExpanded = !!expandedSerials[tree.targetSerial];

                            return (
                                <Fragment key={tree.targetSerial}>
                                    <tr 
                                        className={`${styles.treeRow} ${hasComponents ? styles.clickableTreeRow : ''} ${isSerialExpanded ? styles.treeRowExpanded : ''}`}
                                        onClick={() => hasComponents && toggleSerial(tree.targetSerial)}
                                    >
                                        <td style={{ textAlign: 'center' }}>
                                            {hasComponents ? (
                                                <i className={`bi ${isSerialExpanded ? 'bi-dash-square' : 'bi-plus-square'}`} style={{ color: 'var(--color-primary)' }}></i>
                                            ) : (
                                                <i className="bi bi-dash" style={{ opacity: 0.3 }}></i>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: '600', color: hasComponents ? 'var(--color-primary)' : 'inherit' }}>
                                            {tree.targetSerial}
                                        </td>
                                        <td>
                                            {hasComponents ? (
                                                <span className={styles.typeBadge}>
                                                    Bao gồm {tree.components.length} linh kiện
                                                </span>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                                                    Đơn chiếc
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    
                                    {isSerialExpanded && hasComponents && (
                                        <tr className={styles.compRow}>
                                            <td colSpan="3" className={styles.compCell}>
                                                <div className={styles.compContainer}>
                                                    <table className={styles.compTable}>
                                                        <thead>
                                                            <tr>
                                                                <th>Serial Linh Kiện</th>
                                                                <th>Mã SKU</th>
                                                                <th>Tên Linh Kiện</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {tree.components.map((comp, idx) => (
                                                                <tr key={`${comp.componentSerial}-${idx}`}>
                                                                    <td><span className={styles.compSerialBadge}>{comp.componentSerial}</span></td>
                                                                    <td>{comp.componentSku}</td>
                                                                    <td>{comp.componentName}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm theo mã hàng, tên, SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <label className={styles.toggleFilter}>
                        <input
                            type="checkbox"
                            checked={showBackorderedOnly}
                            onChange={(e) => setShowBackorderedOnly(e.target.checked)}
                        />
                        <span className={styles.switchSlider}></span>
                        <span>Hàng đang nợ</span>
                    </label>
                </div>
                <button className={styles.iconBtn} onClick={fetchInventory} title="Làm mới">
                    <i className="bi bi-arrow-clockwise"></i>
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
                                <th style={{ width: '40px', textAlign: 'center' }}></th>
                                <th>Mã sản phẩm</th>
                                <th>Tên sản phẩm</th>
                                <th>Mã SKU</th>
                                <th>Phiên bản</th>
                                <th style={{ textAlign: 'right' }}>Tồn kho thực tế</th>
                                <th style={{ textAlign: 'right' }}>Đang giữ hàng</th>
                                <th style={{ textAlign: 'right' }}>Khả dụng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((item, idx) => {
                                const isExpanded = !!expandedVariants[item.variantId];
                                const isLowStock = item.availableQuantity <= 5;
                                
                                return (
                                    <Fragment key={`${item.sku}-${idx}`}>
                                        <tr className={`${styles.mainRow} ${isExpanded ? styles.mainRowExpanded : ''}`}>
                                            <td style={{ textAlign: 'center' }}>
                                                <button 
                                                    className={styles.expandBtn} 
                                                    onClick={() => toggleVariant(item.variantId)}
                                                    title={isExpanded ? "Thu gọn" : "Xem Serial"}
                                                >
                                                    <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                                                </button>
                                            </td>
                                            <td className={styles.codeCell}>{item.productCode}</td>
                                            <td>{item.productName}</td>
                                            <td 
                                                className={`${styles.skuCell} ${styles.clickableSku}`}
                                                onClick={() => toggleVariant(item.variantId)}
                                                title="Bấm để xem Serial"
                                            >
                                                {item.sku}
                                            </td>
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
                                        </tr>
                                        {isExpanded && (
                                            <tr className={styles.subRowWrapper}>
                                                <td colSpan="8" className={styles.subRowCell}>
                                                    {renderVariantTree(item.variantId)}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
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
