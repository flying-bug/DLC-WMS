import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import axiosClient from '../../api/axiosClient';
import styles from './ProductPage.module.css';

const ProductPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSearch, setTempSearch] = useState('');
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        productCode: '',
        productName: '',
        productType: 'Hàng hóa',
        unitId: '',
        taxReductionStatus: 'Chưa xác định',
        stockQty: 0,
        stockValue: 0,
        imageUrl: '',
        description: '',
        active: true
    });
    const [errorMsg, setErrorMsg] = useState('');
    
    // Dropdown state for rows
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // KPIs
    const [outOfStockCount, setOutOfStockCount] = useState(0);
    const [lowStockCount, setLowStockCount] = useState(0);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Load list of Units for dropdown inside Modal
    const fetchUnits = async () => {
        try {
            const res = await axiosClient.get('/units?size=1000');
            setUnits(res.data.content || []);
        } catch (error) {
            console.error('Lỗi lấy danh sách đơn vị tính:', error);
        }
    };

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/products?page=${page}&size=${size}${searchTerm ? `&search=${searchTerm}` : ''}`);
            const content = res.data.content || [];
            setProducts(content);
            setTotalPages(res.data.totalPages || 0);
            setTotalElements(res.data.totalElements || 0);

            // Calculate KPIs locally based on fetched list (for prototype presentation)
            let outOfStock = 0;
            let lowStock = 0;
            content.forEach(p => {
                const qty = p.stockQty || 0;
                if (qty <= 0) {
                    outOfStock++;
                } else if (qty < 10) {
                    lowStock++;
                }
            });
            setOutOfStockCount(outOfStock);
            setLowStockCount(lowStock);

        } catch (error) {
            console.error("Lỗi lấy danh sách hàng hóa:", error);
        } finally {
            setLoading(false);
        }
    }, [page, size, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUnits();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchProducts]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setPage(0);
            setSearchTerm(tempSearch);
        }
    };

    const handleSearchBtnClick = () => {
        setPage(0);
        setSearchTerm(tempSearch);
    };

    const handleOpenAdd = () => {
        setIsEdit(false);
        setFormData({
            id: null,
            productCode: '',
            productName: '',
            productType: 'Hàng hóa',
            unitId: units[0]?.id || '',
            taxReductionStatus: 'Chưa xác định',
            stockQty: 0,
            stockValue: 0,
            imageUrl: '',
            description: '',
            active: true
        });
        setErrorMsg('');
        setShowModal(true);
    };

    const handleOpenEdit = (product) => {
        setIsEdit(true);
        setFormData({
            id: product.id,
            productCode: product.productCode,
            productName: product.productName,
            productType: product.productType || 'Hàng hóa',
            unitId: product.unitId || '',
            taxReductionStatus: product.taxReductionStatus || 'Chưa xác định',
            stockQty: product.stockQty || 0,
            stockValue: product.stockValue || 0,
            imageUrl: product.imageUrl || '',
            description: product.description || '',
            active: product.active !== false
        });
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const handleDuplicate = (product) => {
        setIsEdit(false);
        setFormData({
            id: null,
            productCode: `${product.productCode}-CP`,
            productName: `${product.productName} - Copy`,
            productType: product.productType || 'Hàng hóa',
            unitId: product.unitId || '',
            taxReductionStatus: product.taxReductionStatus || 'Chưa xác định',
            stockQty: product.stockQty || 0,
            stockValue: product.stockValue || 0,
            imageUrl: product.imageUrl || '',
            description: product.description || '',
            active: product.active !== false
        });
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const handleToggleStatus = async (product) => {
        const newActive = !product.active;
        try {
            await axiosClient.put(`/products/${product.id}`, { ...product, active: newActive });
            fetchProducts();
        } catch (error) {
            console.error("Lỗi thay đổi trạng thái hoạt động:", error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái hoạt động!');
        }
        setOpenDropdownId(null);
    };

    const handleSave = async (closeAfterSave = true) => {
        if (!formData.productCode.trim()) {
            setErrorMsg('Mã hàng hóa/dịch vụ không được để trống.');
            return;
        }
        if (!formData.productName.trim()) {
            setErrorMsg('Tên hàng hóa/dịch vụ không được để trống.');
            return;
        }

        try {
            if (isEdit) {
                await axiosClient.put(`/products/${formData.id}`, formData);
            } else {
                await axiosClient.post('/products', formData);
            }
            fetchProducts();
            if (closeAfterSave) {
                setShowModal(false);
            } else {
                // Keep modal open to add next item
                setFormData({
                    id: null,
                    productCode: '',
                    productName: '',
                    productType: 'Hàng hóa',
                    unitId: units[0]?.id || '',
                    taxReductionStatus: 'Chưa xác định',
                    stockQty: 0,
                    stockValue: 0,
                    imageUrl: '',
                    description: '',
                    active: true
                });
                setIsEdit(false);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra khi lưu.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa hàng hóa/dịch vụ này không?')) {
            try {
                await axiosClient.delete(`/products/${id}`);
                fetchProducts();
            } catch (error) {
                console.error("Lỗi xóa hàng hóa/dịch vụ:", error);
                alert('Có lỗi xảy ra khi xóa!');
            }
        }
        setOpenDropdownId(null);
    };

    const formatCurrency = (val) => {
        if (!val) return '0';
        return new Intl.NumberFormat('vi-VN').format(val);
    };

    const formatQuantity = (val) => {
        if (val === undefined || val === null) return '0,00';
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(val);
    };

    return (
        <AdminLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <h2>Hàng hóa, dịch vụ</h2>
                        <span className={styles.backLink} onClick={() => navigate('/dashboard')}>
                            <i className="fas fa-chevron-left"></i> Tất cả danh mục
                        </span>
                    </div>
                </div>

                {/* KPI Overview Cards */}
                <div className={styles.kpiContainer}>
                    <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
                        <div className={styles.kpiIcon}>
                            <i className="fas fa-box-open"></i>
                        </div>
                        <div className={styles.kpiInfo}>
                            <div className={styles.kpiNumber}>{lowStockCount}</div>
                            <div className={styles.kpiLabel}>Hàng hóa sắp hết hàng</div>
                        </div>
                    </div>
                    <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
                        <div className={styles.kpiIcon}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className={styles.kpiInfo}>
                            <div className={styles.kpiNumber}>{outOfStockCount}</div>
                            <div className={styles.kpiLabel}>Hàng hóa hết hàng</div>
                        </div>
                    </div>
                </div>

                {/* Grid & Table Control Toolbar */}
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <div className={styles.bulkDropdown}>
                            Thực hiện hàng loạt <i className="fas fa-chevron-down"></i>
                        </div>
                        <button className={styles.filterBtn}>
                            <i className="fas fa-filter"></i> Lọc
                        </button>
                    </div>

                    <div className={styles.toolbarRight}>
                        <div className={styles.searchBox}>
                            <input 
                                type="text" 
                                placeholder="Tìm theo mã, tên hàng hóa" 
                                value={tempSearch}
                                onChange={(e) => setTempSearch(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                            <i className="fas fa-search" onClick={handleSearchBtnClick}></i>
                        </div>
                        <button className={styles.iconBtn} onClick={fetchProducts} title="Tải lại">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className={styles.iconBtn} title="Xuất Excel">
                            <i className="fas fa-file-excel"></i>
                        </button>
                        <button className={styles.iconBtn} title="Thiết lập cột">
                            <i className="fas fa-cog"></i>
                        </button>
                        
                        <div className={styles.actionBtnGroup}>
                            <button className={styles.addBtn} onClick={handleOpenAdd}>
                                Thêm
                            </button>
                            <button className={styles.addMoreDropdownBtn}>
                                <i className="fas fa-chevron-down"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input type="checkbox" />
                                </th>
                                <th style={{ width: '100px' }}>Hình ảnh</th>
                                <th>Mã</th>
                                <th>Tên</th>
                                <th style={{ width: '200px' }}>Giảm thuế theo quy định</th>
                                <th style={{ width: '120px' }}>Tính chất</th>
                                <th style={{ textAlign: 'right', width: '120px' }}>Số lượng tồn</th>
                                <th style={{ textAlign: 'right', width: '150px' }}>Giá trị tồn</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Chức năng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className={styles.spinner}></div> Đang tải danh sách hàng hóa...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        Không tìm thấy hàng hóa, dịch vụ nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                products.map((item) => (
                                    <tr key={item.id} className={!item.active ? styles.inactiveRow : ''}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input type="checkbox" />
                                        </td>
                                        <td>
                                            <div className={styles.imageCell}>
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.productName} className={styles.productImg} />
                                                ) : (
                                                    <div className={styles.noImage}>
                                                        <i className="fas fa-image"></i>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.codeCell}>{item.productCode}</td>
                                        <td className={styles.nameCell} title={item.productName}>{item.productName}</td>
                                        <td>{item.taxReductionStatus}</td>
                                        <td>{item.productType}</td>
                                        <td style={{ textAlign: 'right' }}>{formatQuantity(item.stockQty)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.stockValue)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.actionCell}>
                                                <span className={styles.editLink} onClick={() => handleOpenEdit(item)}>Sửa</span>
                                                <button 
                                                    className={styles.dropdownBtn} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                                                    }}
                                                >
                                                    <i className="fas fa-caret-down"></i>
                                                </button>
                                                
                                                {openDropdownId === item.id && (
                                                    <div className={styles.dropdownMenu}>
                                                        <div className={styles.dropdownItem} onClick={() => handleDuplicate(item)}>
                                                            Nhân bản
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDelete(item.id)}>
                                                            Xóa
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleToggleStatus(item)}>
                                                            {item.active ? 'Ngừng sử dụng' : 'Sử dụng'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                <div className={styles.pagination}>
                    <div className={styles.pageInfo}>
                        Tổng số: <strong>{totalElements}</strong> bản ghi
                    </div>
                    <div className={styles.pageControls}>
                        <select 
                            value={size} 
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(0);
                            }}
                            className={styles.sizeSelect}
                        >
                            <option value={10}>10 bản ghi trên 1 trang</option>
                            <option value={20}>20 bản ghi trên 1 trang</option>
                            <option value={50}>50 bản ghi trên 1 trang</option>
                            <option value={100}>100 bản ghi trên 1 trang</option>
                        </select>

                        <div className={styles.pageNav}>
                            <button 
                                className={styles.pageNavBtn} 
                                disabled={page === 0}
                                onClick={() => setPage(page - 1)}
                            >
                                Trước
                            </button>
                            <span className={styles.pageNumber}>
                                Trang <strong>{page + 1}</strong> / {totalPages || 1}
                            </span>
                            <button 
                                className={styles.pageNavBtn} 
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(page + 1)}
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{isEdit ? 'Sửa hàng hóa, dịch vụ' : 'Thêm hàng hóa, dịch vụ'}</h3>
                            <button className={styles.closeModalBtn} onClick={() => setShowModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {errorMsg && <div className={styles.modalError}>{errorMsg}</div>}
                            
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Mã hàng hóa/dịch vụ <span className={styles.required}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={formData.productCode} 
                                        onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                                        placeholder="Ví dụ: VT00001"
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Tên hàng hóa/dịch vụ <span className={styles.required}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={formData.productName} 
                                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                        placeholder="Tên đầy đủ của sản phẩm/dịch vụ"
                                        className={styles.formInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Tính chất</label>
                                    <select 
                                        value={formData.productType} 
                                        onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                                        className={styles.formSelect}
                                    >
                                        <option value="Hàng hóa">Hàng hóa</option>
                                        <option value="Dịch vụ">Dịch vụ</option>
                                        <option value="Thành phẩm">Thành phẩm</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Đơn vị tính</label>
                                    <select 
                                        value={formData.unitId} 
                                        onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                                        className={styles.formSelect}
                                    >
                                        <option value="">-- Chọn đơn vị tính --</option>
                                        {units.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Giảm thuế theo quy định</label>
                                    <select 
                                        value={formData.taxReductionStatus} 
                                        onChange={(e) => setFormData({ ...formData, taxReductionStatus: e.target.value })}
                                        className={styles.formSelect}
                                    >
                                        <option value="Chưa xác định">Chưa xác định</option>
                                        <option value="Giảm">Giảm</option>
                                        <option value="Không giảm">Không giảm</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ảnh đại diện (URL)</label>
                                    <input 
                                        type="text" 
                                        value={formData.imageUrl} 
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="https://example.com/image.png"
                                        className={styles.formInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Số lượng tồn</label>
                                    <input 
                                        type="number" 
                                        value={formData.stockQty} 
                                        onChange={(e) => setFormData({ ...formData, stockQty: Number(e.target.value) })}
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Giá trị tồn (VND)</label>
                                    <input 
                                        type="number" 
                                        value={formData.stockValue} 
                                        onChange={(e) => setFormData({ ...formData, stockValue: Number(e.target.value) })}
                                        className={styles.formInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Mô tả chi tiết</label>
                                <textarea 
                                    value={formData.description} 
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mô tả thông số kỹ thuật hoặc ghi chú khác..."
                                    rows="3"
                                    className={styles.formTextarea}
                                />
                            </div>

                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.active} 
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                    <span>Đang sử dụng</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Hủy</button>
                            <div className={styles.footerRight}>
                                <button className={styles.saveBtn} onClick={() => handleSave(true)}>Cất</button>
                                <button className={styles.saveAddBtn} onClick={() => handleSave(false)}>Cất và Thêm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default ProductPage;
