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
    productType: 'HÃ ng hÃ³a',
    categoryId: '',
    brandId: '',
    unitId: '',
    salePrice: 0,
    description: '',
    imageUrl: '',
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

let globalSpecIdCounter = 1;

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
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [variantForm, setVariantForm] = useState(defaultVariantData);
    const [variantError, setVariantError] = useState('');
    const [loadingVariants, setLoadingVariants] = useState(false);
    const [specList, setSpecList] = useState([{ id: 1, key: '', value: '' }]);
    const [useRawJson, setUseRawJson] = useState(false);

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
        const lookupRequests = [
            { key: 'units', label: 'Ä‘Æ¡n vá»‹ tÃ­nh', request: axiosClient.get('/units?size=1000') },
            { key: 'categories', label: 'danh má»¥c', request: axiosClient.get('/product-categories?size=1000') },
            { key: 'brands', label: 'thÆ°Æ¡ng hiá»‡u', request: axiosClient.get('/brands?size=1000') }
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
            console.error('Lá»—i láº¥y dá»¯ liá»‡u danh má»¥c sáº£n pháº©m:', error);
            showToast('error', failedLabels.length
                ? `KhÃ´ng thá»ƒ táº£i ${failedLabels.join(', ')}. Vui lÃ²ng kiá»ƒm tra quyá»n xem.`
                : 'KhÃ´ng thá»ƒ táº£i danh má»¥c, thÆ°Æ¡ng hiá»‡u hoáº·c Ä‘Æ¡n vá»‹ tÃ­nh.');
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
            console.error('Lá»—i láº¥y danh sÃ¡ch hÃ ng hÃ³a:', error);
            showToast('error', 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch sáº£n pháº©m.');
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
            productType: product.productType || 'HÃ ng hÃ³a',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
            imageUrl: product.imageUrl || '',
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
            productType: product.productType || 'HÃ ng hÃ³a',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
            imageUrl: product.imageUrl || '',
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
        productType: data.productType || 'HÃ ng hÃ³a',
        categoryId: Number(data.categoryId),
        brandId: Number(data.brandId),
        unitId: Number(data.unitId),
        salePrice: Number(data.salePrice || 0),
        description: data.description?.trim() || '',
        imageUrl: data.imageUrl || '',
        active: data.active,
        trackSerial: Boolean(data.trackSerial),
        trackLot: false,
        isAssembly: false
    });

    const handleProductImageUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('folder', 'products');

        try {
            setUploadingImage(true);
            setErrorMsg('');
            const response = await axiosClient.post('/uploads/images', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = response.data?.data?.secureUrl || response.data?.data?.url || '';
            setFormData((current) => ({ ...current, imageUrl }));
        } catch (error) {
            setErrorMsg(getErrorMessage(error, 'Khong the tai anh san pham.'));
        } finally {
            setUploadingImage(false);
        }
    };

    const validateForm = () => {
        if (!formData.productCode.trim()) return 'MÃ£ sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.';
        if (!formData.productName.trim()) return 'TÃªn sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.';
        if (!formData.categoryId) return 'Vui lÃ²ng chá»n danh má»¥c.';
        if (!formData.brandId) return 'Vui lÃ²ng chá»n thÆ°Æ¡ng hiá»‡u.';
        if (!formData.unitId) return 'Vui lÃ²ng chá»n Ä‘Æ¡n vá»‹ tÃ­nh.';
        if (formData.salePrice === '' || Number.isNaN(Number(formData.salePrice))) return 'GiÃ¡ bÃ¡n khÃ´ng há»£p lá»‡.';
        if (Number(formData.salePrice) < 0) return 'GiÃ¡ bÃ¡n khÃ´ng Ä‘Æ°á»£c Ã¢m.';
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
                showToast('success', 'Cáº­p nháº­t sáº£n pháº©m thÃ nh cÃ´ng.');
            } else {
                await axiosClient.post('/products', payload);
                showToast('success', 'ThÃªm sáº£n pháº©m thÃ nh cÃ´ng.');
            }
            await fetchProducts();
            if (closeAfterSave) {
                setShowModal(false);
            } else {
                resetAddForm();
            }
        } catch (error) {
            const message = getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi lÆ°u sáº£n pháº©m.');
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
            showToast('success', product.active ? 'ÄÃ£ ngá»«ng sá»­ dá»¥ng sáº£n pháº©m.' : 'ÄÃ£ kÃ­ch hoáº¡t sáº£n pháº©m.');
        } catch (error) {
            console.error('Lá»—i cáº­p nháº­t tráº¡ng thÃ¡i sáº£n pháº©m:', error);
            showToast('error', getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi cáº­p nháº­t tráº¡ng thÃ¡i sáº£n pháº©m.'));
        }
        setOpenDropdownId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a sáº£n pháº©m nÃ y khÃ´ng?')) {
            try {
                await axiosClient.delete(`/products/${id}`);
                fetchProducts();
                showToast('success', 'XÃ³a sáº£n pháº©m thÃ nh cÃ´ng.');
            } catch (error) {
                console.error('Lá»—i xÃ³a sáº£n pháº©m:', error);
                showToast('error', getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi xÃ³a sáº£n pháº©m.'));
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
            showToast('error', getErrorMessage(error, 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch SKU.'));
        } finally {
            setLoadingVariants(false);
        }
    };

    const parseSpecsToList = (jsonStr) => {
        if (!jsonStr) return [{ id: globalSpecIdCounter++, key: '', value: '' }];
        try {
            const obj = JSON.parse(jsonStr);
            if (typeof obj === 'object' && obj !== null) {
                const entries = Object.entries(obj);
                if (entries.length > 0) {
                    return entries.map(([key, value]) => ({
                        id: globalSpecIdCounter++,
                        key,
                        value: String(value)
                    }));
                }
            }
        } catch (e) {
            console.error('Lá»—i parse specs:', e);
        }
        return [{ id: globalSpecIdCounter++, key: '', value: '' }];
    };

    const buildSpecsJsonFromList = (list) => {
        const result = {};
        list.forEach(item => {
            if (item.key && item.key.trim()) {
                result[item.key.trim()] = item.value ? item.value.trim() : '';
            }
        });
        return Object.keys(result).length > 0 ? JSON.stringify(result) : '';
    };

    const handleAddSpecRow = () => {
        setSpecList(prev => [...prev, { id: globalSpecIdCounter++, key: '', value: '' }]);
    };

    const handleRemoveSpecRow = (id) => {
        setSpecList(prev => {
            const filtered = prev.filter(item => item.id !== id);
            return filtered.length > 0 ? filtered : [{ id: globalSpecIdCounter++, key: '', value: '' }];
        });
    };

    const handleSpecChange = (id, field, value) => {
        setSpecList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const openVariantModal = async (product) => {
        setSelectedProduct(product);
        setVariantForm({
            ...defaultVariantData,
            sku: product.productCode || '',
            variantName: product.productName || '',
            salePrice: Number(product.salePrice || 0)
        });
        setSpecList([{ id: globalSpecIdCounter++, key: '', value: '' }]);
        setUseRawJson(false);
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
        setSpecList(parseSpecsToList(variant.specsJson));
        setUseRawJson(false);
        setVariantError('');
    };

    const resetVariantForm = () => {
        setVariantForm({
            ...defaultVariantData,
            sku: selectedProduct?.productCode || '',
            variantName: selectedProduct?.productName || '',
            salePrice: Number(selectedProduct?.salePrice || 0)
        });
        setSpecList([{ id: globalSpecIdCounter++, key: '', value: '' }]);
        setUseRawJson(false);
        setVariantError('');
    };

    const validateVariantForm = () => {
        if (!variantForm.sku.trim()) return 'SKU khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.';
        if (!variantForm.variantName.trim()) return 'TÃªn SKU khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.';
        if (variantForm.salePrice === '' || Number.isNaN(Number(variantForm.salePrice))) return 'GiÃ¡ bÃ¡n khÃ´ng há»£p lá»‡.';
        if (Number(variantForm.salePrice) < 0) return 'GiÃ¡ bÃ¡n khÃ´ng Ä‘Æ°á»£c Ã¢m.';
        if (Number(variantForm.costPrice || 0) < 0) return 'GiÃ¡ vá»‘n khÃ´ng Ä‘Æ°á»£c Ã¢m.';
        return '';
    };

    const saveVariant = async () => {
        const validationMessage = validateVariantForm();
        if (validationMessage) {
            setVariantError(validationMessage);
            return;
        }
        try {
            const specsJsonPayload = useRawJson
                ? (variantForm.specsJson?.trim() || '')
                : buildSpecsJsonFromList(specList);

            const payload = {
                sku: variantForm.sku.trim().toUpperCase(),
                variantName: variantForm.variantName.trim(),
                costPrice: Number(variantForm.costPrice || 0),
                salePrice: Number(variantForm.salePrice || 0),
                manufacturerPartNumber: variantForm.manufacturerPartNumber?.trim() || '',
                specsJson: specsJsonPayload,
                active: variantForm.active
            };
            if (variantForm.id) {
                await axiosClient.put(`/products/${selectedProduct.id}/variants/${variantForm.id}`, payload);
                showToast('success', 'Cáº­p nháº­t SKU thÃ nh cÃ´ng.');
            } else {
                await axiosClient.post(`/products/${selectedProduct.id}/variants`, payload);
                showToast('success', 'ThÃªm SKU thÃ nh cÃ´ng.');
            }
            resetVariantForm();
            await fetchVariants(selectedProduct.id);
        } catch (error) {
            const message = getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi lÆ°u SKU.');
            setVariantError(message);
            showToast('error', message);
        }
    };

    const deleteVariant = async (variantId) => {
        if (!window.confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a SKU nÃ y khÃ´ng?')) return;
        try {
            await axiosClient.delete(`/products/${selectedProduct.id}/variants/${variantId}`);
            showToast('success', 'XÃ³a SKU thÃ nh cÃ´ng.');
            await fetchVariants(selectedProduct.id);
        } catch (error) {
            showToast('error', getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi xÃ³a SKU.'));
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
            showToast('success', 'Xuáº¥t Excel sáº£n pháº©m thÃ nh cÃ´ng.');
        } catch (error) {
            console.error('Lá»—i xuáº¥t Excel sáº£n pháº©m:', error);
            showToast('error', getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi xuáº¥t Excel sáº£n pháº©m.'));
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
                        <h2>HÃ ng hÃ³a</h2>
                        <span className={styles.backLink} onClick={() => navigate('/dashboard')}>
                            <i className="fas fa-chevron-left"></i> Táº¥t cáº£ danh má»¥c
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
                            <div className={styles.kpiLabel}>Sáº£n pháº©m sáº¯p háº¿t hÃ ng</div>
                        </div>
                    </div>
                    <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
                        <div className={styles.kpiIcon}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className={styles.kpiInfo}>
                            <div className={styles.kpiNumber}>{outOfStockCount}</div>
                            <div className={styles.kpiLabel}>Sáº£n pháº©m háº¿t hÃ ng</div>
                        </div>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <div className={styles.bulkDropdown}>
                            Thá»±c hiá»‡n hÃ ng loáº¡t <i className="fas fa-chevron-down"></i>
                        </div>
                        <button className={styles.filterBtn}>
                            <i className="fas fa-filter"></i> Lá»c
                        </button>
                    </div>

                    <div className={styles.toolbarRight}>
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="TÃ¬m theo mÃ£, tÃªn sáº£n pháº©m"
                                value={tempSearch}
                                onChange={(event) => setTempSearch(event.target.value)}
                                onKeyDown={handleSearch}
                            />
                            <i className="fas fa-search" onClick={handleSearchBtnClick}></i>
                        </div>
                        <button className={styles.iconBtn} onClick={fetchProducts} title="Táº£i láº¡i">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className={styles.iconBtn} title="Xuáº¥t Excel" onClick={handleExportExcel}>
                            <i className="fas fa-file-excel"></i>
                        </button>
                        <button className={styles.iconBtn} title="Thiáº¿t láº­p cá»™t">
                            <i className="fas fa-cog"></i>
                        </button>

                        <div className={styles.actionBtnGroup}>
                            <button className={styles.addBtn} onClick={handleOpenAdd}>
                                ThÃªm
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
                                <th style={{ width: '100px' }}>HÃ¬nh áº£nh</th>
                                <th>MÃ£ sáº£n pháº©m</th>
                                <th>TÃªn sáº£n pháº©m</th>
                                <th style={{ width: '150px' }}>Danh má»¥c</th>
                                <th style={{ width: '140px' }}>ThÆ°Æ¡ng hiá»‡u</th>
                                <th style={{ width: '120px' }}>ÄÆ¡n vá»‹ tÃ­nh</th>
                                <th style={{ textAlign: 'right', width: '140px' }}>GiÃ¡ bÃ¡n</th>
                                <th style={{ textAlign: 'right', width: '120px' }}>Tá»“n kho</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Chá»©c nÄƒng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className={styles.spinner}></div> Äang táº£i danh sÃ¡ch sáº£n pháº©m...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted-2)' }}>
                                        KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m phÃ¹ há»£p.
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
                                                <span className={styles.editLink} onClick={() => handleOpenEdit(item)}>Sá»­a</span>
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
                                                            Quáº£n lÃ½ SKU
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDuplicate(item)}>
                                                            NhÃ¢n báº£n
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDelete(item.id)}>
                                                            XÃ³a
                                                        </div>
                                                        <div className={styles.dropdownItem} onClick={() => handleToggleStatus(item)}>
                                                            {item.active ? 'Ngá»«ng sá»­ dá»¥ng' : 'Sá»­ dá»¥ng'}
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
                                <h3>{isEdit ? 'Sá»­a sáº£n pháº©m' : 'ThÃªm sáº£n pháº©m'}</h3>
                                <i className="fas fa-times" onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                            </div>

                            <div className="misa-modal-body">
                                {errorMsg && <div className={styles.modalError}>{errorMsg}</div>}

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>MÃ£ sáº£n pháº©m <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.productCode}
                                            onChange={(event) => setFormData({ ...formData, productCode: event.target.value })}
                                            placeholder="VÃ­ dá»¥: VT00001"
                                            className="misa-input"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>TÃªn sáº£n pháº©m <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.productName}
                                            onChange={(event) => setFormData({ ...formData, productName: event.target.value })}
                                            placeholder="TÃªn Ä‘áº§y Ä‘á»§ cá»§a sáº£n pháº©m"
                                            className="misa-input"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Danh má»¥c <span className="required">*</span></label>
                                        <select
                                            value={formData.categoryId}
                                            onChange={(event) => setFormData({ ...formData, categoryId: event.target.value })}
                                            className="misa-select"
                                        >
                                            <option value="">-- Chá»n danh má»¥c --</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.code} - {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="misa-form-group">
                                        <label>ThÆ°Æ¡ng hiá»‡u <span className="required">*</span></label>
                                        <select
                                            value={formData.brandId}
                                            onChange={(event) => setFormData({ ...formData, brandId: event.target.value })}
                                            className="misa-select"
                                        >
                                            <option value="">-- Chá»n thÆ°Æ¡ng hiá»‡u --</option>
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
                                        <label>ÄÆ¡n vá»‹ tÃ­nh <span className="required">*</span></label>
                                        <select
                                            value={formData.unitId}
                                            onChange={(event) => setFormData({ ...formData, unitId: event.target.value })}
                                            className="misa-select"
                                        >
                                            <option value="">-- Chá»n Ä‘Æ¡n vá»‹ tÃ­nh --</option>
                                            {units.map((unit) => (
                                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="misa-form-group">
                                        <label>GiÃ¡ bÃ¡n <span className="required">*</span></label>
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

                                <div className={styles.imageUploadRow}>
                                    <div className={styles.imagePreview}>
                                        {formData.imageUrl ? (
                                            <img src={formData.imageUrl} alt={formData.productName || 'Anh san pham'} />
                                        ) : (
                                            <i className="fas fa-image"></i>
                                        )}
                                    </div>
                                    <div className={styles.imageUploadControls}>
                                        <label className={styles.imageUploadBtn}>
                                            <i className={uploadingImage ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'}></i>
                                            {uploadingImage ? 'Dang tai anh...' : 'Tai anh len Cloudinary'}
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/gif"
                                                onChange={handleProductImageUpload}
                                                disabled={uploadingImage}
                                            />
                                        </label>
                                        {formData.imageUrl && (
                                            <button
                                                type="button"
                                                className={styles.removeImageBtn}
                                                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                            >
                                                Xoa anh
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="misa-form-group">
                                    <label>MÃ´ táº£</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                        placeholder="MÃ´ táº£ thÃ´ng sá»‘ ká»¹ thuáº­t, quy cÃ¡ch hoáº·c ghi chÃº sáº£n pháº©m..."
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
                                        <span>Quáº£n lÃ½ theo Serial</span>
                                    </label>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.active}
                                            onChange={(event) => setFormData({ ...formData, active: event.target.checked })}
                                        />
                                        <span>Äang sá»­ dá»¥ng</span>
                                    </label>
                                </div>
                            </div>

                            <div className="misa-modal-footer">
                                <button className="btn-misa-cancel" onClick={() => setShowModal(false)}>Há»§y</button>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button className="btn-misa-draft" onClick={() => handleSave(false)}>Cáº¥t vÃ  ThÃªm</button>
                                    <button className="btn-misa-save" onClick={() => handleSave(true)}>Cáº¥t</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showVariantModal && selectedProduct && (
                    <div className="misa-modal-overlay">
                        <div className="misa-modal" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh' }}>
                            <div className="misa-modal-header">
                                <h3>Quáº£n lÃ½ SKU - {selectedProduct.productCode}</h3>
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
                                            placeholder="VÃ­ dá»¥: DELL-5420-I5-8G"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>TÃªn SKU <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={variantForm.variantName}
                                            onChange={(event) => setVariantForm({ ...variantForm, variantName: event.target.value })}
                                            className="misa-input"
                                            placeholder="VÃ­ dá»¥: i5 / 8GB / 256GB"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>GiÃ¡ vá»‘n</label>
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
                                        <label>GiÃ¡ bÃ¡n <span className="required">*</span></label>
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
                                        <label>MÃ£ nhÃ  sáº£n xuáº¥t / Part number</label>
                                        <input
                                            type="text"
                                            value={variantForm.manufacturerPartNumber}
                                            onChange={(event) => setVariantForm({ ...variantForm, manufacturerPartNumber: event.target.value })}
                                            className="misa-input"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Tráº¡ng thÃ¡i</label>
                                        <label className={styles.checkboxLabel} style={{ minHeight: 34 }}>
                                            <input
                                                type="checkbox"
                                                checked={variantForm.active}
                                                onChange={(event) => setVariantForm({ ...variantForm, active: event.target.checked })}
                                            />
                                            <span>Äang sá»­ dá»¥ng</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="misa-form-group">
                                    <div className={styles.specHeader}>
                                        <label style={{ margin: 0 }}>ThÃ´ng sá»‘ ká»¹ thuáº­t sáº£n pháº©m</label>
                                        <button
                                            type="button"
                                            className={styles.toggleJsonBtn}
                                            onClick={() => {
                                                if (!useRawJson) {
                                                    setVariantForm(prev => ({ ...prev, specsJson: buildSpecsJsonFromList(specList) }));
                                                } else {
                                                    setSpecList(parseSpecsToList(variantForm.specsJson));
                                                }
                                                setUseRawJson(!useRawJson);
                                            }}
                                        >
                                            {useRawJson ? 'Chuyá»ƒn sang dáº¡ng Báº£ng nháº­p' : 'Chuyá»ƒn sang nháº­p JSON trá»±c tiáº¿p'}
                                        </button>
                                    </div>

                                    {useRawJson ? (
                                        <textarea
                                            value={variantForm.specsJson}
                                            onChange={(event) => setVariantForm({ ...variantForm, specsJson: event.target.value })}
                                            rows="3"
                                            className="misa-input"
                                            placeholder='{"cpu":"i5","ram":"8GB","ssd":"256GB"}'
                                            style={{ fontFamily: 'inherit', resize: 'vertical' }}
                                        />
                                    ) : (
                                        <div className={styles.specRowContainer}>
                                            {specList.map((item) => (
                                                <div key={item.id} className={styles.specRow}>
                                                    <input
                                                        type="text"
                                                        className={`misa-input ${styles.specKeyInput}`}
                                                        placeholder="TÃªn thÃ´ng sá»‘ (VÃ­ dá»¥: RAM, CPU, DPI...)"
                                                        value={item.key}
                                                        onChange={(e) => handleSpecChange(item.id, 'key', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className={`misa-input ${styles.specValueInput}`}
                                                        placeholder="GiÃ¡ trá»‹ (VÃ­ dá»¥: 16GB, Core i7, 16000 DPI...)"
                                                        value={item.value}
                                                        onChange={(e) => handleSpecChange(item.id, 'value', e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.removeSpecBtn}
                                                        onClick={() => handleRemoveSpecRow(item.id)}
                                                        title="XÃ³a dÃ²ng"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                className={styles.addSpecBtn}
                                                onClick={handleAddSpecRow}
                                            >
                                                <i className="fas fa-plus" style={{ marginRight: 6 }}></i> ThÃªm dÃ²ng thÃ´ng sá»‘
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: 16 }}>
                                    <button className="btn-misa-cancel" type="button" onClick={resetVariantForm}>Nháº­p láº¡i</button>
                                    <button className="btn-misa-save" type="button" onClick={saveVariant}>
                                        {variantForm.id ? 'Cáº­p nháº­t SKU' : 'ThÃªm SKU'}
                                    </button>
                                </div>

                                <div className={styles.tableWrapper} style={{ minHeight: 0, border: '1px solid var(--color-border-soft)' }}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>SKU</th>
                                                <th>TÃªn SKU</th>
                                                <th style={{ textAlign: 'right' }}>GiÃ¡ vá»‘n</th>
                                                <th style={{ textAlign: 'right' }}>GiÃ¡ bÃ¡n</th>
                                                <th>Tráº¡ng thÃ¡i</th>
                                                <th style={{ textAlign: 'center' }}>Chá»©c nÄƒng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingVariants ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Äang táº£i SKU...</td>
                                                </tr>
                                            ) : variants.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>ChÆ°a cÃ³ SKU.</td>
                                                </tr>
                                            ) : (
                                                variants.map((variant) => (
                                                    <tr key={variant.id}>
                                                        <td className={styles.codeCell}>{variant.sku}</td>
                                                        <td>{variant.variantName}</td>
                                                        <td style={{ textAlign: 'right' }}>{formatCurrency(variant.costPrice)}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(variant.salePrice)}</td>
                                                        <td>{variant.active === false ? 'Ngá»«ng sá»­ dá»¥ng' : 'Äang sá»­ dá»¥ng'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={styles.editLink} onClick={() => editVariant(variant)}>Sá»­a</span>
                                                            <span style={{ margin: '0 8px', color: 'var(--color-border-field)' }}>|</span>
                                                            <span className={styles.editLink} onClick={() => deleteVariant(variant.id)}>XÃ³a</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="misa-modal-footer">
                                <button className="btn-misa-cancel" onClick={() => setShowVariantModal(false)}>ÄÃ³ng</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default ProductPage;
