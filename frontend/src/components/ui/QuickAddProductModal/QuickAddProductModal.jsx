import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axiosClient from '../../../api/axiosClient';
import styles from './QuickAddProductModal.module.css';

const SearchableCategoryDropdown = ({ categories, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [rect, setRect] = useState(null);

    const updateRect = () => {
        if (dropdownRef.current) {
            const elRect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - elRect.bottom;
            const spaceAbove = elRect.top;

            setRect({
                top: elRect.top,
                bottom: elRect.bottom,
                left: elRect.left,
                width: elRect.width,
                openUpwards: spaceBelow < 250 && spaceAbove > spaceBelow
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                !(listRef.current && listRef.current.contains(event.target))) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateRect();
            window.addEventListener('scroll', updateRect, true);
            window.addEventListener('resize', updateRect);
            return () => {
                window.removeEventListener('scroll', updateRect, true);
                window.removeEventListener('resize', updateRect);
            };
        }
    }, [isOpen]);

    const selectedCat = categories.find(c => String(c.id) === String(value));

    const handleOpen = () => {
        setIsOpen(true);
        setSearchTerm(selectedCat ? selectedCat.name : '');
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const filteredCategories = categories.filter(cat =>
        (cat.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '180px' }}>
            <div
                onClick={handleOpen}
                style={{
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'text',
                    backgroundColor: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '32px'
                }}
            >
                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm danh mục..."
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', padding: 0 }}
                    />
                ) : (
                    selectedCat ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <span style={{ fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedCat.name}</span>
                            {selectedCat.description && <span style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedCat.description}</span>}
                        </div>
                    ) : (
                        <span style={{ color: '#9ca3af' }}>Tìm kiếm danh mục</span>
                    )
                )}
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#9ca3af', fontSize: '10px', marginLeft: '8px', flexShrink: 0 }}></i>
            </div>

            {isOpen && rect && createPortal(
                <div ref={listRef} style={{
                    position: 'fixed',
                    top: rect.openUpwards ? rect.top - 4 : rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                    zIndex: 9999999,
                    transform: rect.openUpwards ? 'translateY(-100%)' : 'none',
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                        <div
                            key={cat.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(cat.id);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: String(cat.id) === String(value) ? '#eff6ff' : 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = String(cat.id) === String(value) ? '#eff6ff' : 'transparent'}
                        >
                            <div style={{ fontWeight: 500, fontSize: '13px', color: '#111827' }}>
                                {cat.name}
                            </div>
                            {cat.description && (
                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {cat.description}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                            Không tìm thấy kết quả
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

const WAREHOUSE_PRODUCT_TYPES = ['Hàng hóa', 'Thành phẩm'];

const QuickAddProductModal = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    productType = 'Hàng hóa', 
    allowedProductTypes = ['Hàng hóa', 'Thành phẩm'],
    initialProductName = '',
    initialUnitName = '',
    initialCategoryName = '',
    initialWarrantyMonths = ''
}) => {
    const productTypeOptions = (Array.isArray(allowedProductTypes) && allowedProductTypes.length > 0
        ? allowedProductTypes
        : [productType])
        .filter((type) => WAREHOUSE_PRODUCT_TYPES.includes(type));
    const defaultProductType = productTypeOptions.includes(productType) ? productType : (productTypeOptions[0] || 'Hàng hóa');
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [selectedProductType, setSelectedProductType] = useState(defaultProductType);
    const [formData, setFormData] = useState({
        productName: initialProductName,
        categoryId: '',
        unitId: '',
        warrantyPeriodMonths: '',
        salePrice: ''
    });
    const [trackSerial, setTrackSerial] = useState(false);
    
    // Thêm state cho định mức cấu hình (BOM)
    const [bomLines, setBomLines] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchLookups = async () => {
        try {
            const [catRes, unitRes, brandRes] = await Promise.all([
                axiosClient.get('/product-categories?size=1000'),
                axiosClient.get('/units?size=1000'),
                axiosClient.get('/brands?size=1000')
            ]);
            
            const getPageContent = (response) => response?.data?.data?.content || response?.data?.content || response?.data?.data || response?.data || [];
            
            const cats = getPageContent(catRes);
            const fetchedCategories = cats.filter(c => c.status !== 'INACTIVE');
            setCategories(fetchedCategories);
            
            const unitsList = getPageContent(unitRes);
            setUnits(unitsList);
            
            setFormData(prev => {
                let newCatId = prev.categoryId;
                let newUnitId = prev.unitId;

                if (initialCategoryName && !newCatId) {
                    const matchedCat = fetchedCategories.find(c => c.name?.trim().toLowerCase() === initialCategoryName.trim().toLowerCase());
                    if (matchedCat) newCatId = String(matchedCat.id);
                }
                if (initialUnitName && !newUnitId) {
                    const matchedUnit = unitsList.find(u => u.name?.trim().toLowerCase() === initialUnitName.trim().toLowerCase());
                    if (matchedUnit) newUnitId = String(matchedUnit.id);
                }
                
                return { ...prev, categoryId: newCatId, unitId: newUnitId };
            });
            
            let brands = getPageContent(brandRes);
            let defaultBrand = brands.find(b => b.name.toLowerCase() === 'khác' || b.name.toLowerCase() === 'other');
            
            if (!defaultBrand) {
                try {
                    const newBrandRes = await axiosClient.post('/brands', { name: 'Khác', description: 'Thương hiệu mặc định', status: 'ACTIVE' });
                    defaultBrand = newBrandRes.data?.data || newBrandRes.data;
                } catch (e) {
                    console.error('Không thể tạo thương hiệu mặc định:', e);
                    defaultBrand = brands[0]; // fallback
                }
            }

            if (defaultBrand) {
                setFormData(fd => ({ ...fd, brandId: defaultBrand.id }));
            }
        } catch (error) {
            console.error('Lỗi lấy danh mục:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSelectedProductType(defaultProductType);
            setFormData({
                productName: initialProductName || '',
                categoryId: '',
                unitId: '',
                brandId: '',
                warrantyPeriodMonths: initialWarrantyMonths || '',
                salePrice: ''
            });
            setTrackSerial(false);
            setBomLines([]);
            setErrorMsg('');
            fetchLookups();
        }
    }, [isOpen, defaultProductType, initialProductName, initialUnitName, initialCategoryName, initialWarrantyMonths]);

    const effectiveProductType = selectedProductType || defaultProductType;
    const isAssemblyType = effectiveProductType === 'Thành phẩm';

    const handleProductTypeChange = (type) => {
        setSelectedProductType(type);
        setErrorMsg('');
        if (type !== 'Thành phẩm') {
            setBomLines([]);
        }
    };

    const handleAddBomLine = () => {
        setBomLines([...bomLines, { categoryId: '', note: '' }]);
    };

    const handleRemoveBomLine = (index) => {
        const newLines = [...bomLines];
        newLines.splice(index, 1);
        setBomLines(newLines);
    };

    const handleBomLineChange = (index, field, value) => {
        const newLines = [...bomLines];
        newLines[index] = { ...newLines[index], [field]: value };
        setBomLines(newLines);
    };

    const handleSave = async () => {
        if (!formData.productName.trim()) {
            setErrorMsg(`Vui lòng nhập tên ${effectiveProductType.toLowerCase()}.`);
            return;
        }
        if (!formData.categoryId) {
            setErrorMsg('Vui lòng chọn danh mục.');
            return;
        }
        if (!formData.unitId) {
            setErrorMsg('Vui lòng chọn đơn vị tính.');
            return;
        }

        // Validate BOM lines if there are any
        const validBomLines = isAssemblyType ? bomLines.filter(l => l.categoryId) : [];
        if (isAssemblyType && bomLines.length > 0 && validBomLines.length === 0) {
            setErrorMsg('Vui lòng chọn ít nhất một vai trò linh kiện cho định mức cấu hình.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            const payload = {
                productName: formData.productName.trim(),
                productType: effectiveProductType,
                categoryId: Number(formData.categoryId),
                unitId: Number(formData.unitId),
                brandId: formData.brandId ? Number(formData.brandId) : null,
                warrantyPeriodMonths: formData.warrantyPeriodMonths ? Number(formData.warrantyPeriodMonths) : 0,
                salePrice: formData.salePrice ? Number(formData.salePrice) : 0,
                trackSerial: trackSerial,
                isAssembly: isAssemblyType,
                active: true,
                minStockQty: 0
            };

            // Format BOM template
            if (isAssemblyType && validBomLines.length > 0) {
                const linesPayload = validBomLines.map(l => {
                    const selectedCat = categories.find(c => String(c.id) === String(l.categoryId));
                    return {
                        componentRole: selectedCat ? selectedCat.name : '',
                        categoryId: l.categoryId,
                        note: l.note || ''
                    };
                });
                payload.bomTemplate = JSON.stringify(linesPayload);
            } else {
                payload.bomTemplate = null;
            }

            const res = await axiosClient.post('/products', payload);
            const newProduct = res.data?.data || res.data;
            onSuccess(newProduct);
            onClose();
        } catch (error) {
            setErrorMsg(error.response?.data?.userMessage || error.response?.data?.message || `Có lỗi xảy ra khi thêm ${effectiveProductType.toLowerCase()}.`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="misa-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="misa-modal" style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="misa-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Thêm nhanh {effectiveProductType}</span>
                    <i className="fas fa-times" onClick={onClose} style={{ cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}></i>
                </div>
                
                <div className="misa-modal-body" style={{ padding: '20px 24px', backgroundColor: '#fff', overflowY: 'auto', flex: 1 }}>
                    {errorMsg && <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>{errorMsg}</div>}

                    {productTypeOptions.length > 1 && (
                        <div className={styles.typeSelector}>
                            {productTypeOptions.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={`${styles.typeOption} ${effectiveProductType === type ? styles.typeOptionActive : ''}`}
                                    onClick={() => handleProductTypeChange(type)}
                                >
                                    <i className={type === 'Thành phẩm' ? 'bi bi-pc-display' : 'bi bi-box'}></i>
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    <h5 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>1. Thông tin chung</h5>
                    <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        <div className={styles.field}>
                            <label>Tên {effectiveProductType.toLowerCase()} <span style={{color: 'red'}}>*</span></label>
                            <input 
                                type="text" 
                                value={formData.productName} 
                                onChange={e => setFormData(f => ({...f, productName: e.target.value}))} 
                                placeholder={`Nhập tên ${effectiveProductType.toLowerCase()}...`}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                            <div className={styles.field} style={{ flex: 1 }}>
                                <label>Danh mục <span style={{color: 'red'}}>*</span></label>
                                <select value={formData.categoryId} onChange={e => setFormData(f => ({...f, categoryId: e.target.value}))}>
                                    <option value="">Chọn danh mục</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.field} style={{ flex: 1 }}>
                                <label>Đơn vị tính <span style={{color: 'red'}}>*</span></label>
                                <select value={formData.unitId} onChange={e => setFormData(f => ({...f, unitId: e.target.value}))}>
                                    <option value="">Chọn ĐVT</option>
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                            <div className={styles.field} style={{ flex: 1 }}>
                                <label>Thời hạn bảo hành (Tháng)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={formData.warrantyPeriodMonths} 
                                    onChange={e => setFormData(f => ({...f, warrantyPeriodMonths: e.target.value}))} 
                                    placeholder="0"
                                />
                            </div>
                            <div className={styles.field} style={{ flex: 1 }}>
                                <label>Giá bán dự kiến</label>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.salePrice ? new Intl.NumberFormat('vi-VN').format(formData.salePrice) : ''} 
                                    onChange={e => setFormData(f => ({...f, salePrice: e.target.value.replace(/\D/g, '')}))} 
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                                type="checkbox" 
                                id="trackSerial"
                                checked={trackSerial}
                                onChange={(e) => setTrackSerial(e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="trackSerial" style={{ fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', color: '#374151', margin: 0 }}>
                                Có quản lý theo số Serial / IMEI
                            </label>
                        </div>
                    </div>

                    {isAssemblyType && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h5 style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>2. Định mức cấu hình (Tùy chọn)</h5>
                            </div>

                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', padding: '14px 16px', minHeight: '120px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {bomLines.map((line, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 12px', background: '#fff', border: '1px solid #e5e7eb',
                                            borderRadius: '8px', transition: 'all 0.2s ease',
                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                        }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; }}
                                        >
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: '28px', height: '28px', borderRadius: '50%', background: '#f3f4f6',
                                                    color: '#6b7280', fontSize: '12px', fontWeight: 600
                                                }}>
                                                    {idx + 1}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <SearchableCategoryDropdown
                                                            categories={categories}
                                                            value={line.categoryId || ''}
                                                            onChange={(newCatId) => handleBomLineChange(idx, 'categoryId', newCatId)}
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Ghi chú chi tiết (VD: Ổ chứa dữ liệu, Tản nhiệt nước...)"
                                                        value={line.note || ''}
                                                        onChange={(e) => handleBomLineChange(idx, 'note', e.target.value)}
                                                        style={{
                                                            width: '100%', border: 'none', borderBottom: '1px dashed #cbd5e1',
                                                            padding: '4px 6px', fontSize: '12px', outline: 'none',
                                                            background: 'transparent', color: '#4b5563', transition: 'border-color 0.2s'
                                                        }}
                                                        onFocus={(e) => { e.target.style.borderBottom = '1px solid #3b82f6'; e.target.style.color = '#111827'; }}
                                                        onBlur={(e) => { e.target.style.borderBottom = '1px dashed #cbd5e1'; e.target.style.color = '#4b5563'; }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveBomLine(idx)}
                                                style={{
                                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                                    color: '#9ca3af', fontSize: '15px', padding: '8px',
                                                    borderRadius: '6px', transition: 'all 0.2s', marginLeft: '8px'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
                                                title="Xóa danh mục"
                                            >
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={handleAddBomLine}
                                        style={{
                                            width: '100%', padding: '14px', border: '1px dashed #cbd5e1',
                                            borderRadius: '8px', background: '#f8fafc', color: '#3b82f6',
                                            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                    >
                                        <i className="bi bi-plus-circle" style={{ fontSize: '16px' }}></i> Thêm danh mục yêu cầu
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="misa-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '12px 20px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                    <button type="button" className="btn-misa-cancel" onClick={onClose}>Hủy</button>
                    <button type="button" className="btn-misa-primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Đang lưu...' : `Lưu ${effectiveProductType}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickAddProductModal;
