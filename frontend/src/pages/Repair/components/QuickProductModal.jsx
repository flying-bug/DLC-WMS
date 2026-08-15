import React, { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './QuickProductModal.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


export default function QuickProductModal({ isOpen, onClose, onSaved, fixedType }) {
    const [formData, setFormData] = useState({
        productCode: '',
        productName: '',
        productType: fixedType || 'Hàng hóa',
        brandId: '',
        categoryId: '',
        unitId: '',
        salePrice: 0,
        isAssembly: fixedType === 'Thành phẩm'
    });

    const [options, setOptions] = useState({
        units: [],
        categories: [],
        brands: []
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');



    const loadOptions = async () => {
        try {
            const [units, categories, brands] = await Promise.all([
                axiosClient.get('/units?size=1000'),
                axiosClient.get('/product-categories?size=1000'),
                axiosClient.get('/brands?size=1000')
            ]);
            const extract = (res) => {
                const payload = res.data?.data ?? res.data;
                return payload?.content ?? payload ?? [];
            };

            const unitsData = extract(units);
            const categoriesData = extract(categories);
            const brandsData = extract(brands);

            setOptions({
                units: unitsData,
                categories: categoriesData,
                brands: brandsData
            });
            
            // Auto-select first item if available to speed up data entry, but ONLY for hidden fields when fixedType === 'Dịch vụ'
            setFormData(prev => ({
                ...prev,
                unitId: prev.unitId || '',
                categoryId: prev.categoryId || (fixedType === 'Dịch vụ' ? (categoriesData?.[0]?.id || '') : ''),
                brandId: prev.brandId || (fixedType === 'Dịch vụ' ? (brandsData?.[0]?.id || '') : '')
            }));
        } catch (e) {
            console.error(e);
            setError('Không tải được danh mục.');
        }
    };

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, productType: fixedType || 'Hàng hóa', isAssembly: fixedType === 'Thành phẩm' }));
            loadOptions();
        }
    }, [isOpen, fixedType]);

    const handleSave = async () => {
        if (!formData.productName.trim() || !formData.categoryId || !formData.unitId || !formData.brandId) {
            setError('Vui lòng nhập đủ các trường bắt buộc (*).');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const payload = {
                productCode: formData.productCode.trim() || null,
                productName: formData.productName.trim(),
                productType: formData.productType,
                brandId: Number(formData.brandId),
                categoryId: Number(formData.categoryId),
                unitId: Number(formData.unitId),
                salePrice: Number(formData.salePrice || 0),
                isAssembly: formData.productType === 'Thành phẩm',
                active: true,
                trackSerial: false,
                trackLot: false,
                stockQty: 0,
                stockValue: 0
            };
            
            const res = await axiosClient.post('/products', payload);
            const newProduct = res.data?.data || res.data;
            if (onSaved) {
                onSaved(newProduct);
            }
            onClose();
        } catch (e) {
            setError(e.response?.data?.userMessage || e.response?.data?.message || 'Có lỗi xảy ra khi tạo.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} dialogStyle={{ width: '600px' }}>
            <div className={styles.header}>
                <h2>Thêm nhanh {fixedType || 'Sản phẩm'}</h2>
                <button className={styles.closeBtn} onClick={onClose}>
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            <div className={styles.body}>
                {error && <div className={styles.errorAlert}><i className="bi bi-exclamation-circle-fill"></i> {error}</div>}
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Mã (Tự sinh nếu để trống)</label>
                        <input type="text" className="form-control" value={formData.productCode} onChange={e => setFormData({...formData, productCode: e.target.value})} placeholder="VD: SP001" />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Tên {fixedType?.toLowerCase() || 'sản phẩm'} <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} placeholder="Nhập tên..." />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Loại <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" value={formData.productType} disabled style={{ backgroundColor: '#f3f4f6' }} />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Giá bán</label>
                        <input type="text" inputMode="numeric" className="form-control" value={formData.salePrice ? new Intl.NumberFormat('vi-VN').format(formData.salePrice) : ''} onChange={e => setFormData({...formData, salePrice: e.target.value.replace(/\D/g, '')})} placeholder="0" />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Đơn vị <span className="text-danger">*</span></label>
                        <SearchableSelect className="form-select" value={formData.unitId} onChange={e => setFormData({...formData, unitId: e.target.value})}>
                            <option value="">Chọn đơn vị</option>
                            {options.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </SearchableSelect>
                    </div>

                    {fixedType !== 'Dịch vụ' && (
                        <>
                            <div className={styles.formGroup}>
                                <label>Danh mục <span className="text-danger">*</span></label>
                                <SearchableSelect className="form-select" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                                    <option value="">Chọn danh mục</option>
                                    {options.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SearchableSelect>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Thương hiệu <span className="text-danger">*</span></label>
                                <SearchableSelect className="form-select" value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})}>
                                    <option value="">Chọn thương hiệu</option>
                                    {options.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </SearchableSelect>
                            </div>
                        </>
                    )}

                </div>
            </div>

            <div className={styles.footer}>
                <button className="btn btn-outline-secondary" onClick={onClose}>Hủy</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    <i className="bi bi-check2-circle"></i> {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
            </div>
        </Modal>
    );
}
