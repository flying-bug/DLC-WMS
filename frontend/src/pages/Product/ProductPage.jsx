import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import axiosClient from '../../api/axiosClient';
import { exportToExcel } from '../../utils/excelExport';
import styles from './ProductPage.module.css';

const defaultFormData = {
    id: null,
    productCode: '',
    productName: '',
    productType: 'Hàng hóa',
    categoryId: '',
    brandId: '',
    unitId: '',
    salePrice: 0,
    description: '',
    trackSerial: false,
    active: true
};

const defaultVariantData = {
    id: null,
    sku: '',
    variantName: '',
    costPrice: 0,
    salePrice: 0,
    manufacturerPartNumber: '',
    specsJson: '',
    active: true
};

const getPageContent = (response) => {
    const payload = response.data?.data ?? response.data;
    return payload?.content ?? payload ?? [];
};

const ProductPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSearch, setTempSearch] = useState('');

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState(defaultFormData);
    const [errorMsg, setErrorMsg] = useState('');
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [variantForm, setVariantForm] = useState(defaultVariantData);
    const [variantError, setVariantError] = useState('');
    const [loadingVariants, setLoadingVariants] = useState(false);

    const [outOfStockCount, setOutOfStockCount] = useState(0);
    const [lowStockCount, setLowStockCount] = useState(0);

    const handleExport = () => {
        const headers = ['Mã sản phẩm', 'Tên sản phẩm', 'Danh mục', 'Thương hiệu', 'Đơn vị tính', 'Giá bán', 'Tồn kho', 'Trạng thái'];
        const data = products.map(item => [
            item.productCode,
            item.productName,
            item.categoryName || '',
            item.brandName || '',
            item.unitName || '',
            item.salePrice,
            item.stockQty || 0,
            item.active ? 'Đang hoạt động' : 'Ngừng hoạt động'
        ]);
        exportToExcel(headers, data, 'Danh_sach_san_pham');
    };

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    const getErrorMessage = (error, fallback) => (
        error.response?.data?.userMessage ||
        error.response?.data?.message ||
        fallback
    );

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchLookups = useCallback(async () => {
        const lookupRequests = [
            { key: 'units', label: 'đơn vị tính', request: axiosClient.get('/units?size=1000') },
            { key: 'categories', label: 'danh mục', request: axiosClient.get('/product-categories?size=1000') },
            { key: 'brands', label: 'thương hiệu', request: axiosClient.get('/brands?size=1000') }
        ];

        try {
            const [unitRes, categoryRes, brandRes] = await Promise.all(lookupRequests.map((item) => item.request));
            setUnits(getPageContent(unitRes));
            setCategories(getPageContent(categoryRes).filter((item) => item.status !== 'INACTIVE'));
            setBrands(getPageContent(brandRes).filter((item) => item.status !== 'INACTIVE'));
        } catch (error) {
            const results = await Promise.allSettled(lookupRequests.map((item) => item.request));
            const failedLabels = results
                .map((result, index) => result.status === 'rejected' ? lookupRequests[index].label : null)
                .filter(Boolean);
            console.error('Lỗi lấy dữ liệu danh mục sản phẩm:', error);
            showToast('error', failedLabels.length
                ? `Không thể tải ${failedLabels.join(', ')}. Vui lòng kiểm tra quyền xem.`
                : 'Không thể tải danh mục, thương hiệu hoặc đơn vị tính.');
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const searchQuery = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const res = await axiosClient.get(`/products?page=${page}&size=${size}${searchQuery}`);
            const content = res.data.content || [];
            setProducts(content);
            setTotalPages(res.data.totalPages || 0);
            setTotalElements(res.data.totalElements || 0);

            let outOfStock = 0;
            let lowStock = 0;
            content.forEach((product) => {
                const qty = Number(product.stockQty || 0);
                if (qty <= 0) {
                    outOfStock++;
                } else if (qty < 10) {
                    lowStock++;
                }
            });
            setOutOfStockCount(outOfStock);
            setLowStockCount(lowStock);
        } catch (error) {
            console.error('Lỗi lấy danh sách hàng hóa:', error);
            showToast('error', 'Không thể tải danh sách sản phẩm.');
        } finally {
            setLoading(false);
        }
    }, [page, size, searchTerm]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            fetchLookups();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchLookups]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            fetchProducts();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchProducts]);

    const buildInitialFormData = (overrides = {}) => ({
        ...defaultFormData,
        categoryId: categories[0]?.id || '',
        brandId: brands[0]?.id || '',
        unitId: units[0]?.id || '',
        ...overrides
    });

    const handleSearch = (event) => {
        if (event.key === 'Enter') {
            setPage(0);
            setSearchTerm(tempSearch.trim());
        }
    };

    const handleSearchBtnClick = () => {
        setPage(0);
        setSearchTerm(tempSearch.trim());
    };

    const handleOpenAdd = () => {
        setIsEdit(false);
        setFormData(buildInitialFormData());
        setErrorMsg('');
        setShowModal(true);
    };

    const handleOpenEdit = (product) => {
        setIsEdit(true);
        setFormData(buildInitialFormData({
            id: product.id,
            productCode: product.productCode || '',
            productName: product.productName || '',
            productType: product.productType || 'Hàng hóa',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
            trackSerial: Boolean(product.trackSerial),
            active: product.active !== false
        }));
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const handleDuplicate = (product) => {
        setIsEdit(false);
        setFormData(buildInitialFormData({
            productCode: `${product.productCode}-CP`,
            productName: `${product.productName} - Copy`,
            productType: product.productType || 'Hàng hóa',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
            trackSerial: Boolean(product.trackSerial),
            active: product.active !== false
        }));
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const buildPayload = (data) => ({
        productCode: data.productCode.trim().toUpperCase(),
        productName: data.productName.trim(),
        productType: data.productType || 'Hàng hóa',
        categoryId: Number(data.categoryId),
        brandId: Number(data.brandId),
        unitId: Number(data.unitId),
        salePrice: Number(data.salePrice || 0),
        description: data.description?.trim() || '',
        active: data.active,
        trackSerial: Boolean(data.trackSerial),
        trackLot: false,
        isAssembly: false
    });

    const validateForm = () => {
        if (!formData.productCode.trim()) return 'Mã sản phẩm không được để trống.';
        if (!formData.productName.trim()) return 'Tên sản phẩm không được để trống.';
        if (!formData.categoryId) return 'Vui lòng chọn danh mục.';
        if (!formData.brandId) return 'Vui lòng chọn thương hiệu.';
        if (!formData.unitId) return 'Vui lòng chọn đơn vị tính.';
        if (formData.salePrice === '' || Number.isNaN(Number(formData.salePrice))) return 'Giá bán không hợp lệ.';
        if (Number(formData.salePrice) < 0) return 'Giá bán không được âm.';
        return '';
    };

    const resetAddForm = () => {
        setFormData(buildInitialFormData());
        setIsEdit(false);
    };

    const handleSave = async (closeAfterSave = true) => {
        const validationMessage = validateForm();
        if (validationMessage) {
            setErrorMsg(validationMessage);
            return;
        }

        try {
            const payload = buildPayload(formData);
            if (isEdit) {
                await axiosClient.put(`/products/${formData.id}`, payload);
                showToast('success', 'Cập nhật sản phẩm thành công.');
            } else {
                await axiosClient.post('/products', payload);
                showToast('success', 'Thêm sản phẩm thành công.');
            }
            await fetchProducts();
            if (closeAfterSave) {
                setShowModal(false);
            } else {
                resetAddForm();
            }
        } catch (error) {
            const message = getErrorMessage(error, 'Có lỗi xảy ra khi lưu sản phẩm.');
            setErrorMsg(message);
            showToast('error', message);
        }
    };

    const handleToggleStatus = async (product) => {
        try {
            const payload = buildPayload({
                ...product,
                active: !product.active,
                salePrice: Number(product.salePrice || 0)
            });
            await axiosClient.put(`/products/${product.id}`, payload);
            fetchProducts();
            showToast('success', product.active ? 'Đã ngừng sử dụng sản phẩm.' : 'Đã kích hoạt sản phẩm.');
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái sản phẩm:', error);
            showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật trạng thái sản phẩm.'));
        }
        setOpenDropdownId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) {
            try {
                await axiosClient.delete(`/products/${id}`);
                fetchProducts();
                showToast('success', 'Xóa sản phẩm thành công.');
            } catch (error) {
                console.error('Lỗi xóa sản phẩm:', error);
                showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi xóa sản phẩm.'));
            }
        }
        setOpenDropdownId(null);
    };

    const fetchVariants = async (productId) => {
        try {
            setLoadingVariants(true);
            const res = await axiosClient.get(`/products/${productId}/variants`);
            setVariants(res.data || []);
        } catch (error) {
            showToast('error', getErrorMessage(error, 'Không thể tải danh sách SKU.'));
        } finally {
            setLoadingVariants(false);
        }
    };

    const openVariantModal = async (product) => {
        setSelectedProduct(product);
        setVariantForm({
            ...defaultVariantData,
            sku: product.productCode || '',
            variantName: product.productName || '',
            salePrice: Number(product.salePrice || 0)
        });
        setVariantError('');
        setShowVariantModal(true);
        setOpenDropdownId(null);
        await fetchVariants(product.id);
    };

    const editVariant = (variant) => {
        setVariantForm({
            id: variant.id,
            sku: variant.sku || '',
            variantName: variant.variantName || '',
            costPrice: Number(variant.costPrice || 0),
            salePrice: Number(variant.salePrice || 0),
            manufacturerPartNumber: variant.manufacturerPartNumber || '',
            specsJson: variant.specsJson || '',
            active: variant.active !== false
        });
        setVariantError('');
    };

    const resetVariantForm = () => {
        setVariantForm({
            ...defaultVariantData,
            sku: selectedProduct?.productCode || '',
            variantName: selectedProduct?.productName || '',
            salePrice: Number(selectedProduct?.salePrice || 0)
        });
        setVariantError('');
    };

    const validateVariantForm = () => {
        if (!variantForm.sku.trim()) return 'SKU không được để trống.';
        if (!variantForm.variantName.trim()) return 'Tên SKU không được để trống.';
        if (variantForm.salePrice === '' || Number.isNaN(Number(variantForm.salePrice))) return 'Giá bán không hợp lệ.';
        if (Number(variantForm.salePrice) < 0) return 'Giá bán không được âm.';
        if (Number(variantForm.costPrice || 0) < 0) return 'Giá vốn không được âm.';
        return '';
    };

    const saveVariant = async () => {
        const validationMessage = validateVariantForm();
        if (validationMessage) {
            setVariantError(validationMessage);
            return;
        }
        try {
            const payload = {
                sku: variantForm.sku.trim().toUpperCase(),
                variantName: variantForm.variantName.trim(),
                costPrice: Number(variantForm.costPrice || 0),
                salePrice: Number(variantForm.salePrice || 0),
                manufacturerPartNumber: variantForm.manufacturerPartNumber?.trim() || '',
                specsJson: variantForm.specsJson?.trim() || '',
                active: variantForm.active
            };
            if (variantForm.id) {
                await axiosClient.put(`/products/${selectedProduct.id}/variants/${variantForm.id}`, payload);
                showToast('success', 'Cập nhật SKU thành công.');
            } else {
                await axiosClient.post(`/products/${selectedProduct.id}/variants`, payload);
                showToast('success', 'Thêm SKU thành công.');
            }
            resetVariantForm();
            await fetchVariants(selectedProduct.id);
        } catch (error) {
            const message = getErrorMessage(error, 'Có lỗi xảy ra khi lưu SKU.');
            setVariantError(message);
            showToast('error', message);
        }
    };

    const deleteVariant = async (variantId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa SKU này không?')) return;
        try {
            await axiosClient.delete(`/products/${selectedProduct.id}/variants/${variantId}`);
            showToast('success', 'Xóa SKU thành công.');
            await fetchVariants(selectedProduct.id);
        } catch (error) {
            showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi xóa SKU.'));
        }
    };

    const buildTimestamp = () => {
        const now = new Date();
        return now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
    };

    const handleExportExcel = async () => {
        try {
            const res = await axiosClient.get('/products/export', {
                params: { search: searchTerm || undefined },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DLC_WMS_Danh_Sach_San_Pham_${buildTimestamp()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast('success', 'Xuất Excel sản phẩm thành công.');
        } catch (error) {
            console.error('Lỗi xuất Excel sản phẩm:', error);
            showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi xuất Excel sản phẩm.'));
        }
    };

    const formatCurrency = (value) => {
        const amount = Number(value || 0);
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatQuantity = (value) => {
        if (value === undefined || value === null) return '0,00';
        return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(value);
    };

    return (
        <AdminLayout>
            <Toast
                isVisible={toast.isVisible}
                type={toast.type}
                message={toast.message}
                onClose={() => setToast((current) => ({ ...current, isVisible: false }))}
            />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <h2>Hàng hóa</h2>
                        <span className={styles.backLink} onClick={() => navigate('/dashboard')}>
                            <i className="fas fa-chevron-left"></i> Tất cả danh mục
                        </span>
                    </div>
                </div>

                <div className={styles.kpiContainer}>
                    <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
                        <div className={styles.kpiIcon}>
                            <i className="fas fa-box-open"></i>
                        </div>
                        <div className={styles.kpiInfo}>
                            <div className={styles.kpiNumber}>{lowStockCount}</div>
                            <div className={styles.kpiLabel}>Sản phẩm sắp hết hàng</div>
                        </div>
                    </div>
                    <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
                        <div className={styles.kpiIcon}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className={styles.kpiInfo}>
                            <div className={styles.kpiNumber}>{outOfStockCount}</div>
                            <div className={styles.kpiLabel}>Sản phẩm hết hàng</div>
                        </div>
                    </div>
                </div>

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
                                placeholder="Tìm theo mã, tên sản phẩm"
                                value={tempSearch}
                                onChange={(event) => setTempSearch(event.target.value)}
                                onKeyDown={handleSearch}
                            />
                            <i className="fas fa-search" onClick={handleSearchBtnClick}></i>
                        </div>
                        <button className={styles.iconBtn} onClick={fetchProducts} title="Tải lại">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className={styles.iconBtn} title="Xuất Excel" onClick={handleExport}>
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

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input type="checkbox" />
                                </th>
                                <th style={{ width: '100px' }}>Hình ảnh</th>
                                <th>Mã sản phẩm</th>
                                <th>Tên sản phẩm</th>
                                <th style={{ width: '150px' }}>Danh mục</th>
                                <th style={{ width: '140px' }}>Thương hiệu</th>
                                <th style={{ width: '120px' }}>Đơn vị tính</th>
                                <th style={{ textAlign: 'right', width: '140px' }}>Giá bán</th>
                                <th style={{ textAlign: 'right', width: '120px' }}>Tồn kho</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Chức năng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className={styles.spinner}></div> Đang tải danh sách sản phẩm...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted-2)' }}>
                                        Không tìm thấy sản phẩm phù hợp.
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
                                        <td>{item.categoryName || '-'}</td>
                                        <td>{item.brandName || '-'}</td>
                                        <td>{item.unitName || '-'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.salePrice)}</td>
                                        <td style={{ textAlign: 'right' }}>{formatQuantity(item.stockQty)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.actionCell}>
                                                <span className={styles.editLink} onClick={() => handleOpenEdit(item)}>Sửa</span>
                                                <button
                                                    className={styles.dropdownBtn}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                                                    }}
                                                >
                                                    <i className="fas fa-caret-down"></i>
                                                </button>

                                                {openDropdownId === item.id && (
                                                    <div className={styles.dropdownMenu}>
                                                        <div className={styles.dropdownItem} onClick={() => openVariantModal(item)}>
                                                            Quản lý SKU
                                                        </div>
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

                <div className={styles.pagination}>
                    <div className={styles.pageInfo}>
                        Tong so: <strong>{totalElements}</strong> ban ghi
                    </div>
                    <div className={styles.pageControls}>
                        <select
                            value={size}
                            onChange={(event) => {
                                setSize(Number(event.target.value));
                                setPage(0);
                            }}
                            className={styles.sizeSelect}
                        >
                            <option value={10}>10 ban ghi tren 1 trang</option>
                            <option value={20}>20 ban ghi tren 1 trang</option>
                            <option value={50}>50 ban ghi tren 1 trang</option>
                            <option value={100}>100 ban ghi tren 1 trang</option>
                        </select>

                        <div className={styles.pageNav}>
                            <button
                                className={styles.pageNavBtn}
                                disabled={page === 0}
                                onClick={() => setPage(page - 1)}
                            >
                                Truoc
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

                {showModal && (
                    <div className="misa-modal-overlay">
                        <div className="misa-modal" style={{ width: '800px', maxWidth: '90%' }}>
                            <div className="misa-modal-header">
                                <h3>{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
                                <i className="fas fa-times" onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                            </div>

                            <div className="misa-modal-body">
                                {errorMsg && <div className={styles.modalError}>{errorMsg}</div>}

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Mã sản phẩm <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.productCode}
                                            onChange={(event) => setFormData({ ...formData, productCode: event.target.value })}
                                            placeholder="Ví dụ: VT00001"
                                            className="misa-input"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Tên sản phẩm <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.productName}
                                            onChange={(event) => setFormData({ ...formData, productName: event.target.value })}
                                            placeholder="Tên đầy đủ của sản phẩm"
                                            className="misa-input"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Danh mục <span className="required">*</span></label>
                                        <select
                                            value={formData.categoryId}
                                            onChange={(event) => setFormData({ ...formData, categoryId: event.target.value })}
                                            className="misa-select"
                                        >
                                            <option value="">-- Chọn danh mục --</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.code} - {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Thương hiệu <span className="required">*</span></label>
                                        <select
                                            value={formData.brandId}
                                            onChange={(event) => setFormData({ ...formData, brandId: event.target.value })}
                                            className="misa-select"
                                        >
                                            <option value="">-- Chọn thương hiệu --</option>
                                            {brands.map((brand) => (
                                                <option key={brand.id} value={brand.id}>
                                                    {brand.code} - {brand.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Đơn vị tính <span className="required">*</span></label>
                                        <select
                                            value={formData.unitId}
                                            onChange={(event) => setFormData({ ...formData, unitId: event.target.value })}
                                            className="misa-select"
                                        >
                                            <option value="">-- Chọn đơn vị tính --</option>
                                            {units.map((unit) => (
                                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Giá bán <span className="required">*</span></label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={formData.salePrice}
                                            onChange={(event) => setFormData({ ...formData, salePrice: event.target.value })}
                                            placeholder="0"
                                            className="misa-input"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-group">
                                    <label>Mô tả</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                        placeholder="Mô tả thông số kỹ thuật, quy cách hoặc ghi chú sản phẩm..."
                                        rows="4"
                                        className="misa-input"
                                        style={{ minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                </div>

                                <div className={styles.checkboxGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.trackSerial}
                                            onChange={(event) => setFormData({ ...formData, trackSerial: event.target.checked })}
                                        />
                                        <span>Quản lý theo Serial</span>
                                    </label>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.active}
                                            onChange={(event) => setFormData({ ...formData, active: event.target.checked })}
                                        />
                                        <span>Đang sử dụng</span>
                                    </label>
                                </div>
                            </div>

                            <div className="misa-modal-footer">
                                <button className="btn-misa-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button className="btn-misa-draft" onClick={() => handleSave(false)}>Cất và Thêm</button>
                                    <button className="btn-misa-save" onClick={() => handleSave(true)}>Cất</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showVariantModal && selectedProduct && (
                    <div className="misa-modal-overlay">
                        <div className="misa-modal" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh' }}>
                            <div className="misa-modal-header">
                                <h3>Quản lý SKU - {selectedProduct.productCode}</h3>
                                <i className="fas fa-times" onClick={() => setShowVariantModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                            </div>

                            <div className="misa-modal-body">
                                {variantError && <div className={styles.modalError}>{variantError}</div>}

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>SKU <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={variantForm.sku}
                                            onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value })}
                                            className="misa-input"
                                            placeholder="Ví dụ: DELL-5420-I5-8G"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Tên SKU <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={variantForm.variantName}
                                            onChange={(event) => setVariantForm({ ...variantForm, variantName: event.target.value })}
                                            className="misa-input"
                                            placeholder="Ví dụ: i5 / 8GB / 256GB"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Giá vốn</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={variantForm.costPrice}
                                            onChange={(event) => setVariantForm({ ...variantForm, costPrice: event.target.value })}
                                            className="misa-input"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Giá bán <span className="required">*</span></label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={variantForm.salePrice}
                                            onChange={(event) => setVariantForm({ ...variantForm, salePrice: event.target.value })}
                                            className="misa-input"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Mã nhà sản xuất / Part number</label>
                                        <input
                                            type="text"
                                            value={variantForm.manufacturerPartNumber}
                                            onChange={(event) => setVariantForm({ ...variantForm, manufacturerPartNumber: event.target.value })}
                                            className="misa-input"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Trạng thái</label>
                                        <label className={styles.checkboxLabel} style={{ minHeight: 34 }}>
                                            <input
                                                type="checkbox"
                                                checked={variantForm.active}
                                                onChange={(event) => setVariantForm({ ...variantForm, active: event.target.checked })}
                                            />
                                            <span>Đang sử dụng</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="misa-form-group">
                                    <label>Thông số JSON</label>
                                    <textarea
                                        value={variantForm.specsJson}
                                        onChange={(event) => setVariantForm({ ...variantForm, specsJson: event.target.value })}
                                        rows="3"
                                        className="misa-input"
                                        placeholder='{"cpu":"i5","ram":"8GB","ssd":"256GB"}'
                                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: 16 }}>
                                    <button className="btn-misa-cancel" type="button" onClick={resetVariantForm}>Nhập lại</button>
                                    <button className="btn-misa-save" type="button" onClick={saveVariant}>
                                        {variantForm.id ? 'Cập nhật SKU' : 'Thêm SKU'}
                                    </button>
                                </div>

                                <div className={styles.tableWrapper} style={{ minHeight: 0, border: '1px solid var(--color-border-soft)' }}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>SKU</th>
                                                <th>Tên SKU</th>
                                                <th style={{ textAlign: 'right' }}>Giá vốn</th>
                                                <th style={{ textAlign: 'right' }}>Giá bán</th>
                                                <th>Trạng thái</th>
                                                <th style={{ textAlign: 'center' }}>Chức năng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingVariants ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Đang tải SKU...</td>
                                                </tr>
                                            ) : variants.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Chưa có SKU.</td>
                                                </tr>
                                            ) : (
                                                variants.map((variant) => (
                                                    <tr key={variant.id}>
                                                        <td className={styles.codeCell}>{variant.sku}</td>
                                                        <td>{variant.variantName}</td>
                                                        <td style={{ textAlign: 'right' }}>{formatCurrency(variant.costPrice)}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(variant.salePrice)}</td>
                                                        <td>{variant.active === false ? 'Ngừng sử dụng' : 'Đang sử dụng'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={styles.editLink} onClick={() => editVariant(variant)}>Sửa</span>
                                                            <span style={{ margin: '0 8px', color: 'var(--color-border-field)' }}>|</span>
                                                            <span className={styles.editLink} onClick={() => deleteVariant(variant.id)}>Xóa</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="misa-modal-footer">
                                <button className="btn-misa-cancel" onClick={() => setShowVariantModal(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default ProductPage;
