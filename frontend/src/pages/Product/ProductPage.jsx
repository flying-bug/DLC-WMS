import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import axiosClient from '../../api/axiosClient';
import styles from './ProductPage.module.css';

const defaultFormData = {
    id: null,
    productCode: '',
    productName: '',
    productType: 'Hang hoa',
    categoryId: '',
    brandId: '',
    unitId: '',
    salePrice: 0,
    description: '',
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

const getPageContent = (response) => response.data?.content || [];

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
        try {
            const [unitRes, categoryRes, brandRes] = await Promise.all([
                axiosClient.get('/units?size=1000'),
                axiosClient.get('/product-categories?size=1000'),
                axiosClient.get('/brands?size=1000')
            ]);
            setUnits(getPageContent(unitRes));
            setCategories(getPageContent(categoryRes).filter((item) => item.status !== 'INACTIVE'));
            setBrands(getPageContent(brandRes).filter((item) => item.status !== 'INACTIVE'));
        } catch (error) {
            console.error('Loi lay du lieu danh muc san pham:', error);
            showToast('error', 'Khong the tai danh muc, thuong hieu hoac don vi tinh.');
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
            console.error('Loi lay danh sach hang hoa:', error);
            showToast('error', 'Khong the tai danh sach san pham.');
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
            productType: product.productType || 'Hang hoa',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
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
            productType: product.productType || 'Hang hoa',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
            active: product.active !== false
        }));
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const buildPayload = (data) => ({
        productCode: data.productCode.trim().toUpperCase(),
        productName: data.productName.trim(),
        productType: data.productType || 'Hang hoa',
        categoryId: Number(data.categoryId),
        brandId: Number(data.brandId),
        unitId: Number(data.unitId),
        salePrice: Number(data.salePrice || 0),
        description: data.description?.trim() || '',
        active: data.active,
        trackSerial: false,
        trackLot: false,
        isAssembly: false
    });

    const validateForm = () => {
        if (!formData.productCode.trim()) return 'Ma san pham khong duoc de trong.';
        if (!formData.productName.trim()) return 'Ten san pham khong duoc de trong.';
        if (!formData.categoryId) return 'Vui long chon danh muc.';
        if (!formData.brandId) return 'Vui long chon thuong hieu.';
        if (!formData.unitId) return 'Vui long chon don vi tinh.';
        if (formData.salePrice === '' || Number.isNaN(Number(formData.salePrice))) return 'Gia ban khong hop le.';
        if (Number(formData.salePrice) < 0) return 'Gia ban khong duoc am.';
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
                showToast('success', 'Cap nhat san pham thanh cong.');
            } else {
                await axiosClient.post('/products', payload);
                showToast('success', 'Them san pham thanh cong.');
            }
            await fetchProducts();
            if (closeAfterSave) {
                setShowModal(false);
            } else {
                resetAddForm();
            }
        } catch (error) {
            const message = getErrorMessage(error, 'Co loi xay ra khi luu san pham.');
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
            showToast('success', product.active ? 'Da ngung su dung san pham.' : 'Da kich hoat san pham.');
        } catch (error) {
            console.error('Loi cap nhat trang thai san pham:', error);
            showToast('error', getErrorMessage(error, 'Co loi xay ra khi cap nhat trang thai san pham.'));
        }
        setOpenDropdownId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Ban co chac chan muon xoa san pham nay khong?')) {
            try {
                await axiosClient.delete(`/products/${id}`);
                fetchProducts();
                showToast('success', 'Xoa san pham thanh cong.');
            } catch (error) {
                console.error('Loi xoa san pham:', error);
                showToast('error', getErrorMessage(error, 'Co loi xay ra khi xoa san pham.'));
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
            showToast('error', getErrorMessage(error, 'Khong the tai danh sach SKU.'));
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
        if (!variantForm.sku.trim()) return 'SKU khong duoc de trong.';
        if (!variantForm.variantName.trim()) return 'Ten SKU khong duoc de trong.';
        if (variantForm.salePrice === '' || Number.isNaN(Number(variantForm.salePrice))) return 'Gia ban khong hop le.';
        if (Number(variantForm.salePrice) < 0) return 'Gia ban khong duoc am.';
        if (Number(variantForm.costPrice || 0) < 0) return 'Gia von khong duoc am.';
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
                showToast('success', 'Cap nhat SKU thanh cong.');
            } else {
                await axiosClient.post(`/products/${selectedProduct.id}/variants`, payload);
                showToast('success', 'Them SKU thanh cong.');
            }
            resetVariantForm();
            await fetchVariants(selectedProduct.id);
        } catch (error) {
            const message = getErrorMessage(error, 'Co loi xay ra khi luu SKU.');
            setVariantError(message);
            showToast('error', message);
        }
    };

    const deleteVariant = async (variantId) => {
        if (!window.confirm('Ban co chac chan muon xoa SKU nay khong?')) return;
        try {
            await axiosClient.delete(`/products/${selectedProduct.id}/variants/${variantId}`);
            showToast('success', 'Xoa SKU thanh cong.');
            await fetchVariants(selectedProduct.id);
        } catch (error) {
            showToast('error', getErrorMessage(error, 'Co loi xay ra khi xoa SKU.'));
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
            showToast('success', 'Xuat Excel san pham thanh cong.');
        } catch (error) {
            console.error('Loi xuat Excel san pham:', error);
            showToast('error', getErrorMessage(error, 'Co loi xay ra khi xuat Excel san pham.'));
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
                        <h2>Hang hoa</h2>
                        <span className={styles.backLink} onClick={() => navigate('/dashboard')}>
                            <i className="fas fa-chevron-left"></i> Tat ca danh muc
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
                            <div className={styles.kpiLabel}>San pham sap het hang</div>
                        </div>
                    </div>
                    <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
                        <div className={styles.kpiIcon}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className={styles.kpiInfo}>
                            <div className={styles.kpiNumber}>{outOfStockCount}</div>
                            <div className={styles.kpiLabel}>San pham het hang</div>
                        </div>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <div className={styles.bulkDropdown}>
                            Thuc hien hang loat <i className="fas fa-chevron-down"></i>
                        </div>
                        <button className={styles.filterBtn}>
                            <i className="fas fa-filter"></i> Loc
                        </button>
                    </div>

                    <div className={styles.toolbarRight}>
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="Tim theo ma, ten san pham"
                                value={tempSearch}
                                onChange={(event) => setTempSearch(event.target.value)}
                                onKeyDown={handleSearch}
                            />
                            <i className="fas fa-search" onClick={handleSearchBtnClick}></i>
                        </div>
                        <button className={styles.iconBtn} onClick={fetchProducts} title="Tai lai">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className={styles.iconBtn} title="Xuat Excel" onClick={handleExportExcel}>
                            <i className="fas fa-file-excel"></i>
                        </button>
                        <button className={styles.iconBtn} title="Thiet lap cot">
                            <i className="fas fa-cog"></i>
                        </button>

                        <div className={styles.actionBtnGroup}>
                            <button className={styles.addBtn} onClick={handleOpenAdd}>
                                Them
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
                                <th style={{ width: '100px' }}>Hinh anh</th>
                                <th>Ma san pham</th>
                                <th>Ten san pham</th>
                                <th style={{ width: '150px' }}>Danh muc</th>
                                <th style={{ width: '140px' }}>Thuong hieu</th>
                                <th style={{ width: '120px' }}>Don vi tinh</th>
                                <th style={{ textAlign: 'right', width: '140px' }}>Gia ban</th>
                                <th style={{ textAlign: 'right', width: '120px' }}>Ton kho</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Chuc nang</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className={styles.spinner}></div> Dang tai danh sach san pham...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted-2)' }}>
                                        Khong tim thay san pham phu hop.
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
                                                <span className={styles.editLink} onClick={() => handleOpenEdit(item)}>Sua</span>
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
                                                            Quan ly SKU
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDuplicate(item)}>
                                                            Nhan ban
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDelete(item.id)}>
                                                            Xoa
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleToggleStatus(item)}>
                                                            {item.active ? 'Ngung su dung' : 'Su dung'}
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
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{isEdit ? 'Sua san pham' : 'Them san pham'}</h3>
                            <button className={styles.closeModalBtn} onClick={() => setShowModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {errorMsg && <div className={styles.modalError}>{errorMsg}</div>}

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Ma san pham <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        value={formData.productCode}
                                        onChange={(event) => setFormData({ ...formData, productCode: event.target.value })}
                                        placeholder="Vi du: VT00001"
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ten san pham <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        value={formData.productName}
                                        onChange={(event) => setFormData({ ...formData, productName: event.target.value })}
                                        placeholder="Ten day du cua san pham"
                                        className={styles.formInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Danh muc <span className={styles.required}>*</span></label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={(event) => setFormData({ ...formData, categoryId: event.target.value })}
                                        className={styles.formSelect}
                                    >
                                        <option value="">-- Chon danh muc --</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.code} - {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Thuong hieu <span className={styles.required}>*</span></label>
                                    <select
                                        value={formData.brandId}
                                        onChange={(event) => setFormData({ ...formData, brandId: event.target.value })}
                                        className={styles.formSelect}
                                    >
                                        <option value="">-- Chon thuong hieu --</option>
                                        {brands.map((brand) => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.code} - {brand.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Don vi tinh <span className={styles.required}>*</span></label>
                                    <select
                                        value={formData.unitId}
                                        onChange={(event) => setFormData({ ...formData, unitId: event.target.value })}
                                        className={styles.formSelect}
                                    >
                                        <option value="">-- Chon don vi tinh --</option>
                                        {units.map((unit) => (
                                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Gia ban <span className={styles.required}>*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={formData.salePrice}
                                        onChange={(event) => setFormData({ ...formData, salePrice: event.target.value })}
                                        placeholder="0"
                                        className={styles.formInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Mo ta</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                    placeholder="Mo ta thong so ky thuat, quy cach hoac ghi chu san pham..."
                                    rows="4"
                                    className={styles.formTextarea}
                                />
                            </div>

                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(event) => setFormData({ ...formData, active: event.target.checked })}
                                    />
                                    <span>Dang su dung</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Huy</button>
                            <div className={styles.footerRight}>
                                <button className={styles.saveBtn} onClick={() => handleSave(true)}>Cat</button>
                                <button className={styles.saveAddBtn} onClick={() => handleSave(false)}>Cat va Them</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showVariantModal && selectedProduct && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Quan ly SKU - {selectedProduct.productCode}</h3>
                            <button className={styles.closeModalBtn} onClick={() => setShowVariantModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {variantError && <div className={styles.modalError}>{variantError}</div>}

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>SKU <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        value={variantForm.sku}
                                        onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value })}
                                        className={styles.formInput}
                                        placeholder="Vi du: DELL-5420-I5-8G"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ten SKU <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        value={variantForm.variantName}
                                        onChange={(event) => setVariantForm({ ...variantForm, variantName: event.target.value })}
                                        className={styles.formInput}
                                        placeholder="Vi du: i5 / 8GB / 256GB"
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Gia von</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={variantForm.costPrice}
                                        onChange={(event) => setVariantForm({ ...variantForm, costPrice: event.target.value })}
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Gia ban <span className={styles.required}>*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={variantForm.salePrice}
                                        onChange={(event) => setVariantForm({ ...variantForm, salePrice: event.target.value })}
                                        className={styles.formInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Ma nha san xuat / Part number</label>
                                    <input
                                        type="text"
                                        value={variantForm.manufacturerPartNumber}
                                        onChange={(event) => setVariantForm({ ...variantForm, manufacturerPartNumber: event.target.value })}
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Trang thai</label>
                                    <label className={styles.checkboxLabel} style={{ minHeight: 34 }}>
                                        <input
                                            type="checkbox"
                                            checked={variantForm.active}
                                            onChange={(event) => setVariantForm({ ...variantForm, active: event.target.checked })}
                                        />
                                        <span>Dang su dung</span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Thong so JSON</label>
                                <textarea
                                    value={variantForm.specsJson}
                                    onChange={(event) => setVariantForm({ ...variantForm, specsJson: event.target.value })}
                                    rows="3"
                                    className={styles.formTextarea}
                                    placeholder='{"cpu":"i5","ram":"8GB","ssd":"256GB"}'
                                />
                            </div>

                            <div className={styles.footerRight} style={{ marginBottom: 16 }}>
                                <button className={styles.saveBtn} type="button" onClick={resetVariantForm}>Nhap lai</button>
                                <button className={styles.saveAddBtn} type="button" onClick={saveVariant}>
                                    {variantForm.id ? 'Cap nhat SKU' : 'Them SKU'}
                                </button>
                            </div>

                            <div className={styles.tableWrapper} style={{ minHeight: 0, border: '1px solid var(--color-border-soft)' }}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>SKU</th>
                                            <th>Ten SKU</th>
                                            <th style={{ textAlign: 'right' }}>Gia von</th>
                                            <th style={{ textAlign: 'right' }}>Gia ban</th>
                                            <th>Trang thai</th>
                                            <th style={{ textAlign: 'center' }}>Chuc nang</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingVariants ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Dang tai SKU...</td>
                                            </tr>
                                        ) : variants.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Chua co SKU.</td>
                                            </tr>
                                        ) : (
                                            variants.map((variant) => (
                                                <tr key={variant.id}>
                                                    <td className={styles.codeCell}>{variant.sku}</td>
                                                    <td>{variant.variantName}</td>
                                                    <td style={{ textAlign: 'right' }}>{formatCurrency(variant.costPrice)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(variant.salePrice)}</td>
                                                    <td>{variant.active === false ? 'Ngung su dung' : 'Dang su dung'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={styles.editLink} onClick={() => editVariant(variant)}>Sua</span>
                                                        <span style={{ margin: '0 8px', color: 'var(--color-border-field)' }}>|</span>
                                                        <span className={styles.editLink} onClick={() => deleteVariant(variant.id)}>Xoa</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowVariantModal(false)}>Dong</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default ProductPage;
