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
    productType: 'Hàng hóa',
    categoryId: '',
    brandId: '',
    unitId: '',
    salePrice: 0,
    description: '',
    imageUrl: '',
    trackSerial: false,
    isAssembly: false,
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

const defaultBomLinesData = [
    { componentVariantId: '', componentRole: 'CPU - Bộ vi xử lý', quantity: '', note: '' },
    { componentVariantId: '', componentRole: 'MAINBOARD - Bo mạch chủ', quantity: '', note: '' },
    { componentVariantId: '', componentRole: 'RAM', quantity: '', note: '' },
    { componentVariantId: '', componentRole: 'HDD', quantity: '', note: '' },
    { componentVariantId: '', componentRole: 'SSD', quantity: '', note: '' },
    { componentVariantId: '', componentRole: 'VGA', quantity: '', note: '' },
    { componentVariantId: '', componentRole: 'Nguồn', quantity: '', note: '' }
];

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

    const [activeTab, setActiveTab] = useState('units');
    const [unitConversions, setUnitConversions] = useState([]);
    const [bomLines, setBomLines] = useState([]);
    const [allVariants, setAllVariants] = useState([]);
    const [warrantyQty, setWarrantyQty] = useState(0);
    const [warrantyUnit, setWarrantyUnit] = useState('Tháng');
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [showQuickAddCat, setShowQuickAddCat] = useState(false);
    const [quickCatForm, setQuickCatForm] = useState({ code: '', name: '' });
    const [savingCat, setSavingCat] = useState(false);

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


    const fetchAllVariants = useCallback(async () => {
        try {
            const res = await axiosClient.get('/products/variants?size=1000');
            const content = res.data?.data?.content || res.data?.content || [];
            setAllVariants(content);
        } catch (error) {
            console.error('Lỗi lấy danh sách SKU:', error);
        }
    }, []);

    useEffect(() => {
        fetchAllVariants();
    }, [fetchAllVariants]);

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
        categoryId: '',
        brandId: '',
        unitId: '',
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
        setUnitConversions([]);
        setBomLines([...defaultBomLinesData]);
        setActiveTab('units');
        setWarrantyQty(0);
        setWarrantyUnit('Tháng');
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
            imageUrl: product.imageUrl || '',
            trackSerial: Boolean(product.trackSerial),
            isAssembly: Boolean(product.isAssembly),
            active: product.active !== false
        }));
        setBomLines(product.bomLines || []);
        setUnitConversions(product.unitConversions || []);
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
            imageUrl: product.imageUrl || '',
            trackSerial: Boolean(product.trackSerial),
            isAssembly: Boolean(product.isAssembly),
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
        imageUrl: data.imageUrl || '',
        active: data.active,
        trackSerial: Boolean(data.trackSerial),
        trackLot: false,
        isAssembly: data.productType === 'Thành phẩm',
        bomLines: data.productType === 'Thành phẩm' ? bomLines.filter(line => line.componentVariantId).map(line => ({
            componentVariantId: Number(line.componentVariantId),
            componentRole: line.componentRole,
            quantity: Number(line.quantity || 0),
            note: line.note || ''
        })) : [],
        unitConversions: unitConversions.filter(uc => uc.unitId).map(uc => ({
            unitId: Number(uc.unitId),
            operator: uc.operator || 'DIVIDE',
            ratio: Number(uc.ratio || 1),
            note: uc.note || ''
        }))
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
            console.error('Lỗi parse specs:', e);
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
                        <button className={styles.iconBtn} title="Xuất Excel" onClick={handleExportExcel}>
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
                                <th style={{ width: '120px' }}>Loại</th>
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
                                        <td>{item.productType || '-'}</td>
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
                    <div className="misa-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                        <div className="misa-modal" style={{ width: '750px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                            {/* ── Modal Header ── */}
                            <div className="misa-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Thông tin vật tư, hàng hóa, dịch vụ</span>
                                    <div style={{ position: 'relative' }}>
                                        <span
                                            className={styles.productTypeBadge}
                                            onClick={(e) => { e.stopPropagation(); setShowTypeMenu(v => !v); }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <i className="fas fa-box" style={{ fontSize: '11px' }}></i> {formData.productType}
                                        </span>
                                        {showTypeMenu && (
                                            <div className={styles.typeMenu} onClick={(e) => e.stopPropagation()}>
                                                {['Hàng hóa', 'Thành phẩm', 'Dịch vụ'].map(type => (
                                                    <div
                                                        key={type}
                                                        className={styles.typeMenuItem + (formData.productType === type ? ' ' + styles.typeMenuItemActive : '')}
                                                        onClick={() => {
                                                            setFormData(fd => ({ ...fd, productType: type }));
                                                            setShowTypeMenu(false);
                                                            if (type !== 'Dịch vụ') setActiveTab('units');
                                                            if (type === 'Thành phẩm' && bomLines.length === 0) {
                                                                setBomLines([...defaultBomLinesData]);
                                                            }
                                                        }}
                                                    >
                                                        {type}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <i className="fas fa-question-circle" style={{ color: '#9ca3af', fontSize: '16px', cursor: 'pointer' }}></i>
                                    <i className="fas fa-times" onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}></i>
                                </div>
                            </div>

                            {/* ── Modal Body ── */}
                            <div className="misa-modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#fff' }}>
                                {errorMsg && <div className={styles.modalError} style={{ marginBottom: 12 }}>{errorMsg}</div>}

                                <div style={{ display: 'flex', gap: '20px' }}>
                                    {/* ─── Left form section ─── */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Row 1: Tên */}
                                        <div className={styles.formField}>
                                            <label className={styles.fieldLabel}>Tên <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                className={styles.fieldInput}
                                                value={formData.productName}
                                                onChange={(e) => setFormData(fd => ({ ...fd, productName: e.target.value }))}
                                                placeholder="Nhập tên vật tư, hàng hóa"
                                            />
                                        </div>

                                        {/* Row 2: Mã + (Danh mục OR Đơn vị tính chính for Dịch vụ) */}
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                            <div className={styles.formField} style={{ width: '38%', flexShrink: 0 }}>
                                                <label className={styles.fieldLabel}>Mã <span className="required">*</span></label>
                                                <input
                                                    type="text"
                                                    className={styles.fieldInput}
                                                    value={formData.productCode}
                                                    onChange={(e) => setFormData(fd => ({ ...fd, productCode: e.target.value }))}
                                                    disabled={isEdit}
                                                    placeholder="VT00001"
                                                />
                                            </div>

                                            {formData.productType !== 'Dịch vụ' ? (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Danh mục</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <select
                                                            className={styles.fieldInput}
                                                            value={formData.categoryId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, categoryId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn danh mục</option>
                                                            {categories.map(cat => (
                                                                <option key={cat.id} value={cat.id}>{cat.code ? `${cat.code} - ` : ''}{cat.name}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            className={styles.addInlineBtn}
                                                            title="Thêm nhanh danh mục"
                                                            type="button"
                                                            onClick={() => {
                                                                setShowQuickAddCat(v => !v);
                                                                setQuickCatForm({ code: '', name: '' });
                                                            }}
                                                        >+</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Đơn vị tính chính</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <select
                                                            className={styles.fieldInput}
                                                            value={formData.unitId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, unitId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn đơn vị tính</option>
                                                            {units.map(u => (
                                                                <option key={u.id} value={u.id}>{u.name}</option>
                                                            ))}
                                                        </select>
                                                        <button className={styles.addInlineBtn} title="Thêm đơn vị tính mới" type="button">+</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Add Cat Panel (only relevant if not Dịch vụ) */}
                                        {formData.productType !== 'Dịch vụ' && showQuickAddCat && (
                                            <div className={styles.quickAddPanel}>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Mã danh mục <span className="required">*</span></label>
                                                        <input
                                                            type="text"
                                                            className={styles.fieldInput}
                                                            style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickCatForm.code}
                                                            onChange={(e) => setQuickCatForm(f => ({ ...f, code: e.target.value }))}
                                                            placeholder="VD: DM001"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div style={{ flex: 2 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Tên danh mục <span className="required">*</span></label>
                                                        <input
                                                            type="text"
                                                            className={styles.fieldInput}
                                                            style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickCatForm.name}
                                                            onChange={(e) => setQuickCatForm(f => ({ ...f, name: e.target.value }))}
                                                            placeholder="Tên danh mục"
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (!quickCatForm.code.trim() || !quickCatForm.name.trim()) return;
                                                                    setSavingCat(true);
                                                                    try {
                                                                        const res = await axiosClient.post('/product-categories', { code: quickCatForm.code.trim().toUpperCase(), name: quickCatForm.name.trim(), status: 'ACTIVE' });
                                                                        const newCat = res.data?.data ?? res.data;
                                                                        setCategories(prev => [...prev, newCat]);
                                                                        setFormData(fd => ({ ...fd, categoryId: newCat.id }));
                                                                        setShowQuickAddCat(false);
                                                                        showToast('success', `Đã thêm danh mục "${newCat.name}"`);
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.userMessage || 'Không thể thêm danh mục.');
                                                                    } finally {
                                                                        setSavingCat(false);
                                                                    }
                                                                }
                                                                if (e.key === 'Escape') setShowQuickAddCat(false);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button type="button" className={styles.quickCancelBtn} onClick={() => setShowQuickAddCat(false)}>Hủy</button>
                                                    <button type="button" className={styles.quickSaveBtn} disabled={savingCat || !quickCatForm.code.trim() || !quickCatForm.name.trim()} onClick={async () => {
                                                        if (!quickCatForm.code.trim() || !quickCatForm.name.trim()) return;
                                                        setSavingCat(true);
                                                        try {
                                                            const res = await axiosClient.post('/product-categories', { code: quickCatForm.code.trim().toUpperCase(), name: quickCatForm.name.trim(), status: 'ACTIVE' });
                                                            const newCat = res.data?.data ?? res.data;
                                                            setCategories(prev => [...prev, newCat]);
                                                            setFormData(fd => ({ ...fd, categoryId: newCat.id }));
                                                            setShowQuickAddCat(false);
                                                            showToast('success', `Đã thêm danh mục "${newCat.name}"`);
                                                        } catch (err) {
                                                            showToast('error', err.response?.data?.userMessage || 'Không thể thêm danh mục.');
                                                        } finally {
                                                            setSavingCat(false);
                                                        }
                                                    }}>
                                                        {savingCat ? <i className="fas fa-spinner fa-spin"></i> : 'Lưu'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 3: Hàng hóa -> Đơn vị tính + Thương hiệu, Thành phẩm -> Đơn vị tính + Bảo hành, Dịch vụ -> Bảo hành + Giá */}
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                            {/* Đơn vị tính chính cho Hàng hóa / Thành phẩm */}
                                            {formData.productType !== 'Dịch vụ' && (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Đơn vị tính chính</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <select
                                                            className={styles.fieldInput}
                                                            value={formData.unitId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, unitId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn đơn vị tính</option>
                                                            {units.map(u => (
                                                                <option key={u.id} value={u.id}>{u.name}</option>
                                                            ))}
                                                        </select>
                                                        <button className={styles.addInlineBtn} title="Thêm đơn vị tính mới" type="button">+</button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Slot 2 of Row 3 */}
                                            {formData.productType === 'Hàng hóa' && (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Thương hiệu</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <select
                                                            className={styles.fieldInput}
                                                            value={formData.brandId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, brandId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn thương hiệu</option>
                                                            {brands && brands.map(b => (
                                                                <option key={b.id} value={b.id}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                        <button className={styles.addInlineBtn} title="Thêm nhanh thương hiệu" type="button">+</button>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.productType === 'Thành phẩm' && (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Thời hạn bảo hành</label>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input
                                                            type="number" min="0" className={styles.fieldInput} style={{ width: '80px', flexShrink: 0 }}
                                                            value={warrantyQty} onChange={(e) => setWarrantyQty(Number(e.target.value))}
                                                        />
                                                        <select
                                                            className={styles.fieldInput} style={{ width: '110px', flexShrink: 0 }}
                                                            value={warrantyUnit} onChange={(e) => setWarrantyUnit(e.target.value)}
                                                        >
                                                            <option value="Tháng">Tháng</option>
                                                            <option value="Năm">Năm</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.productType === 'Dịch vụ' && (
                                                <>
                                                    <div className={styles.formField} style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel}>Thời hạn bảo hành</label>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <input
                                                                type="number" min="0" className={styles.fieldInput} style={{ width: '80px', flexShrink: 0 }}
                                                                value={warrantyQty} onChange={(e) => setWarrantyQty(Number(e.target.value))}
                                                            />
                                                            <select
                                                                className={styles.fieldInput} style={{ width: '110px', flexShrink: 0 }}
                                                                value={warrantyUnit} onChange={(e) => setWarrantyUnit(e.target.value)}
                                                            >
                                                                <option value="Tháng">Tháng</option>
                                                                <option value="Năm">Năm</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className={styles.formField} style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel}>Giá dịch vụ</label>
                                                        <input
                                                            type="number" min="0" className={styles.fieldInput}
                                                            value={formData.salePrice} onChange={(e) => setFormData(fd => ({ ...fd, salePrice: e.target.value }))}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Row 4: Hàng hóa -> Tồn kho tối thiểu + Giá bán, Thành phẩm -> none, Dịch vụ -> none */}
                                        {formData.productType === 'Hàng hóa' && (
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Cảnh báo hết hàng</label>
                                                    <input
                                                        type="number" min="0" className={styles.fieldInput}
                                                        value={formData.minStockQty} onChange={(e) => setFormData(fd => ({ ...fd, minStockQty: e.target.value }))}
                                                        placeholder="0"
                                                    />
                                                </div>

                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Giá bán</label>
                                                    <input
                                                        type="number" min="0" className={styles.fieldInput}
                                                        value={formData.salePrice} onChange={(e) => setFormData(fd => ({ ...fd, salePrice: e.target.value }))}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 5: Hàng hóa -> Thời hạn bảo hành */}
                                        {formData.productType === 'Hàng hóa' && (
                                            <div className={styles.formField} style={{ marginTop: '12px' }}>
                                                <label className={styles.fieldLabel}>Thời hạn bảo hành</label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input
                                                        type="number" min="0" className={styles.fieldInput} style={{ width: '80px', flexShrink: 0 }}
                                                        value={warrantyQty} onChange={(e) => setWarrantyQty(Number(e.target.value))}
                                                    />
                                                    <select
                                                        className={styles.fieldInput} style={{ width: '110px', flexShrink: 0 }}
                                                        value={warrantyUnit} onChange={(e) => setWarrantyUnit(e.target.value)}
                                                    >
                                                        <option value="Tháng">Tháng</option>
                                                        <option value="Năm">Năm</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mô tả */}
                                        <div className={styles.formField} style={{ marginTop: '12px' }}>
                                            <label className={styles.fieldLabel}>Mô tả</label>
                                            <textarea
                                                className={styles.fieldInput}
                                                style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: '90px' }}
                                                value={formData.description}
                                                onChange={(e) => setFormData(fd => ({ ...fd, description: e.target.value }))}
                                                placeholder="Nhập thông tin chi tiết về sản phẩm..."
                                                rows="4"
                                            />
                                        </div>

                                        {/* Checkboxes: Serial */}
                                        {formData.productType !== 'Dịch vụ' && (
                                            <div className={styles.checkboxGroup} style={{ marginTop: '16px' }}>
                                                <label className={styles.checkboxLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.trackSerial}
                                                        onChange={(e) => setFormData(fd => ({ ...fd, trackSerial: e.target.checked }))}
                                                    />
                                                    <span>Quản lý theo Serial</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Right image section ─── */}
                                    <div style={{ width: '160px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ cursor: uploadingImage ? 'wait' : 'pointer', display: 'block', width: '100%' }}>
                                            <div className={styles.imageUploadBox}>
                                                {formData.imageUrl ? (
                                                    <img
                                                        src={formData.imageUrl}
                                                        alt="Ảnh sản phẩm"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                                                    />
                                                ) : (
                                                    <div className={styles.imageUploadPlaceholder}>
                                                        <i className="fas fa-image" style={{ fontSize: '36px', color: '#d1d5db', marginBottom: '8px' }}></i>
                                                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Tải ảnh lên</span>
                                                        <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '4px', lineHeight: 1.4 }}>Dung lượng tối đa 2MB (JPG, PNG)</span>
                                                    </div>
                                                )}
                                                {uploadingImage && (
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#3b82f6' }}></i>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/gif"
                                                onChange={handleProductImageUpload}
                                                disabled={uploadingImage}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                            <label style={{ cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>
                                                <i className="fas fa-pencil-alt" style={{ fontSize: '15px' }}></i>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                                    onChange={handleProductImageUpload}
                                                    disabled={uploadingImage}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            <span style={{ color: '#d1d5db' }}>|</span>
                                            <i
                                                className="fas fa-trash-alt"
                                                style={{ fontSize: '15px', color: '#6b7280', cursor: 'pointer' }}
                                                onClick={() => setFormData(fd => ({ ...fd, imageUrl: '' }))}
                                            ></i>
                                        </div>
                                    </div>
                                </div>

                                {/* ─── Tabs Section (Unit Conversions / BOM) ─── */}
                                {formData.productType !== 'Dịch vụ' && (
                                    <div style={{ marginTop: '24px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                            <button
                                                onClick={() => setActiveTab('units')}
                                                style={{
                                                    padding: '9px 18px', fontSize: '13px', border: 'none', cursor: 'pointer', background: 'transparent',
                                                    borderBottom: activeTab === 'units' ? '2px solid #2563eb' : '2px solid transparent',
                                                    color: activeTab === 'units' ? '#2563eb' : '#6b7280', fontWeight: activeTab === 'units' ? 600 : 400
                                                }}
                                            >
                                                Đơn vị chuyển đổi
                                            </button>
                                            {formData.productType === 'Thành phẩm' && (
                                                <button
                                                    onClick={() => setActiveTab('bom')}
                                                    style={{
                                                        padding: '9px 18px', fontSize: '13px', border: 'none', cursor: 'pointer', background: 'transparent',
                                                        borderBottom: activeTab === 'bom' ? '2px solid #2563eb' : '2px solid transparent',
                                                        color: activeTab === 'bom' ? '#2563eb' : '#6b7280', fontWeight: activeTab === 'bom' ? 600 : 400
                                                    }}
                                                >
                                                    Định mức cấu hình
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ padding: '14px 16px', minHeight: '120px' }}>
                                            {activeTab === 'units' && (
                                                <div>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                                                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #e5e7eb', width: '28%', fontWeight: 600 }}>Đơn vị chuyển đổi</th>
                                                                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #e5e7eb', width: '18%', fontWeight: 600 }}>Phép tính</th>
                                                                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #e5e7eb', width: '22%', fontWeight: 600 }}>Tỷ lệ</th>
                                                                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Ghi chú</th>
                                                                <th style={{ padding: '7px 10px', border: '1px solid #e5e7eb', width: '36px' }}></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {unitConversions.map((uc, idx) => (
                                                                <tr key={idx}>
                                                                    <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                                                                        <select
                                                                            value={uc.unitId}
                                                                            onChange={(e) => { const a = [...unitConversions]; a[idx].unitId = e.target.value; setUnitConversions(a); }}
                                                                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '3px', background: 'transparent' }}
                                                                        >
                                                                            <option value="">Chọn ĐV</option>
                                                                            {units.filter(u => String(u.id) !== String(formData.unitId)).map(u => (
                                                                                <option key={u.id} value={u.id}>{u.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                                                                        <select
                                                                            value={uc.operator}
                                                                            onChange={(e) => { const a = [...unitConversions]; a[idx].operator = e.target.value; setUnitConversions(a); }}
                                                                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '3px', background: 'transparent' }}
                                                                        >
                                                                            <option value="DIVIDE">Chia</option>
                                                                            <option value="MULTIPLY">Nhân</option>
                                                                        </select>
                                                                    </td>
                                                                    <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                                                                        <input
                                                                            type="number" min="0.0001" step="any"
                                                                            value={uc.ratio}
                                                                            onChange={(e) => { const a = [...unitConversions]; a[idx].ratio = e.target.value; setUnitConversions(a); }}
                                                                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '3px', background: 'transparent' }}
                                                                            placeholder="1.0"
                                                                        />
                                                                    </td>
                                                                    <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                                                                        <input
                                                                            type="text"
                                                                            value={uc.note}
                                                                            onChange={(e) => { const a = [...unitConversions]; a[idx].note = e.target.value; setUnitConversions(a); }}
                                                                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '3px', background: 'transparent' }}
                                                                            placeholder="Ghi chú"
                                                                        />
                                                                    </td>
                                                                    <td style={{ border: '1px solid #e5e7eb', textAlign: 'center', padding: '4px' }}>
                                                                        <button
                                                                            onClick={() => { const a = [...unitConversions]; a.splice(idx, 1); setUnitConversions(a); }}
                                                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}
                                                                        ><i className="fas fa-trash"></i></button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    <button
                                                        onClick={() => setUnitConversions([...unitConversions, { unitId: '', operator: 'DIVIDE', ratio: '', note: '' }])}
                                                        style={{ marginTop: '8px', padding: '5px 12px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', background: '#fff', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <i className="fas fa-plus" style={{ fontSize: '11px' }}></i> Thêm dòng
                                                    </button>
                                                </div>
                                            )}

                                            {activeTab === 'bom' && formData.productType === 'Thành phẩm' && (
                                                <div>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                                                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #e5e7eb', width: '30%', fontWeight: 600 }}>Cấu hình</th>
                                                                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #e5e7eb', width: '38%', fontWeight: 600 }}>Mã nguyên vật liệu</th>
                                                                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #e5e7eb', width: '18%', fontWeight: 600 }}>Số lượng</th>
                                                                <th style={{ padding: '7px 10px', border: '1px solid #e5e7eb', width: '36px' }}></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {bomLines.map((line, idx) => (
                                                                <tr key={idx}>
                                                                    <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                                                                        <input
                                                                            type="text"
                                                                            value={line.componentRole}
                                                                            onChange={(e) => { const a = [...bomLines]; a[idx].componentRole = e.target.value; setBomLines(a); }}
                                                                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '3px', background: 'transparent' }}
                                                                            placeholder="Nhập tên cấu hình..."
                                                                        />
                                                                    </td>
                                                                    <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                                                                        <select
                                                                            value={line.componentVariantId}
                                                                            onChange={(e) => { const a = [...bomLines]; a[idx].componentVariantId = e.target.value; setBomLines(a); }}
                                                                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '3px', background: 'transparent' }}
                                                                        >
                                                                            <option value="">-- Chọn linh kiện --</option>
                                                                            {allVariants.map(v => (
                                                                                <option key={v.id} value={v.id}>{v.sku} - {v.variantName}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                                                                        <input type="number" min="0" step="any" value={line.quantity}
                                                                            onChange={(e) => { const a = [...bomLines]; a[idx].quantity = e.target.value; setBomLines(a); }}
                                                                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', padding: '3px', background: 'transparent' }}
                                                                        />
                                                                    </td>
                                                                    <td style={{ border: '1px solid #e5e7eb', textAlign: 'center', padding: '4px' }}>
                                                                        <button
                                                                            onClick={() => { const a = [...bomLines]; a.splice(idx, 1); setBomLines(a); }}
                                                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}
                                                                        ><i className="fas fa-trash"></i></button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    <button
                                                        onClick={() => setBomLines([...bomLines, { componentVariantId: '', componentRole: '', quantity: '', note: '' }])}
                                                        style={{ marginTop: '8px', padding: '5px 12px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', background: '#fff', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                    >
                                                        <i className="fas fa-plus" style={{ fontSize: '11px' }}></i> Thêm linh kiện
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Modal Footer ── */}
                            <div className="misa-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                                <button className="btn-misa-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn-misa-draft" onClick={() => handleSave(true)}>Cất</button>
                                    <button className="btn-misa-save" onClick={() => handleSave(false)}>
                                        <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i>Cất và Thêm
                                    </button>
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
                                    <div className={styles.specHeader}>
                                        <label style={{ margin: 0 }}>Thông số kỹ thuật sản phẩm</label>
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
                                            {useRawJson ? 'Chuyển sang dạng Bảng nhập' : 'Chuyển sang nhập JSON trực tiếp'}
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
                                                        placeholder="Tên thông số (Ví dụ: RAM, CPU, DPI...)"
                                                        value={item.key}
                                                        onChange={(e) => handleSpecChange(item.id, 'key', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className={`misa-input ${styles.specValueInput}`}
                                                        placeholder="Giá trị (Ví dụ: 16GB, Core i7, 16000 DPI...)"
                                                        value={item.value}
                                                        onChange={(e) => handleSpecChange(item.id, 'value', e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.removeSpecBtn}
                                                        onClick={() => handleRemoveSpecRow(item.id)}
                                                        title="Xóa dòng"
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
                                                <i className="fas fa-plus" style={{ marginRight: 6 }}></i> Thêm dòng thông số
                                            </button>
                                        </div>
                                    )}
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
