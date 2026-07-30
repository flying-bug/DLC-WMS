import { useState, useEffect, useRef } from 'react';
import styles from './WarehouseFormModal.module.css';

/**
 * Modal tạo mới / chỉnh sửa kho.
 * Props:
 *   isOpen, onClose, onSave(data),
 *   isEdit (bool), initialData (object | null)
 */
function WarehouseFormModal({ isOpen, onClose, onSave, isEdit = false, initialData = null }) {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        address: '',
        type: 'STANDARD',
        status: 'APPROVED',
    });
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const suggestionRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                setFormData({
                    code: initialData.code || '',
                    name: initialData.name || '',
                    address: initialData.address || '',
                    type: initialData.type || 'STANDARD',
                    status: initialData.status || 'APPROVED',
                    version: initialData.version,
                });
            } else {
                setFormData({ code: '', name: '', address: '', type: 'STANDARD', status: 'APPROVED', version: null });
            }
            setErrorMsg('');
            setAddressSuggestions([]);
        }
    }, [isOpen, isEdit, initialData]);

    // Handle clicking outside suggestions
    useEffect(() => {
        function handleClickOutside(event) {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setAddressSuggestions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === 'address' && value.trim().length < 3) {
            setAddressSuggestions([]);
        }
        if (errorMsg) setErrorMsg('');
    };

    useEffect(() => {
        const query = formData.address?.trim();
        if (!isOpen || !query || query.length < 3) {
            return undefined;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setAddressLoading(true);
            try {
                // API Nominatim OpenStreetMap
                const params = new URLSearchParams({ 
                    q: query, 
                    format: 'json', 
                    addressdetails: '1', 
                    limit: '6', 
                    'accept-language': 'vi' 
                });
                const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'DLC-WMS-App/1.0' }
                });
                if (!response.ok) throw new Error('Address lookup failed');

                const data = await response.json();
                const suggestions = (data || []).map((item) => ({
                    id: item.place_id ? item.place_id.toString() : Math.random().toString(),
                    label: item.display_name,
                })).filter((item) => item.label);
                setAddressSuggestions(suggestions);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setAddressSuggestions([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setAddressLoading(false);
                }
            }
        }, 350);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [formData.address, isOpen]);

    const handleSubmit = async (e, closeAfterSave = true) => {
        if (e) e.preventDefault();
        
        // Validation
        if (!formData.name.trim()) {
            setErrorMsg('Tên kho là bắt buộc.');
            return;
        }
        if (formData.name.trim().length > 100) {
            setErrorMsg('Tên kho không được vượt quá 100 ký tự.');
            return;
        }
        if (formData.code && formData.code.trim().length > 50) {
            setErrorMsg('Mã kho không được vượt quá 50 ký tự.');
            return;
        }

        try {
            setSaving(true);
            const dataToSave = {
                ...formData,
                code: formData.code.trim() || undefined,
                name: formData.name.trim(),
                address: formData.address.trim(),
            };
            await onSave(dataToSave);
            
            if (!closeAfterSave) {
                setFormData({ code: '', name: '', address: '', type: 'STANDARD', status: 'APPROVED', version: null });
                setErrorMsg('');
            }
        } catch (error) {
            // Error handling done in parent component, just stop loading
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{isEdit ? 'Cập nhật kho' : 'Thêm kho mới'}</h2>
                    <button className={styles.modalClose} onClick={onClose} type="button">&times;</button>
                </div>
                
                <form onSubmit={(e) => handleSubmit(e, true)}>
                    <div className={styles.modalBody}>
                        {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}
                        
                        <div className={styles.formGroup}>
                            <label>Mã kho</label>
                            <input
                                type="text"
                                className={styles.inputField}
                                placeholder="Để trống để hệ thống tự động sinh (VD: KHO001)"
                                value={formData.code}
                                onChange={(e) => handleChange('code', e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label>Tên kho <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                className={styles.inputField}
                                placeholder="Nhập tên kho hàng"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                disabled={saving}
                                autoFocus
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Địa chỉ</label>
                            <div className={styles.addressField} ref={suggestionRef}>
                                <textarea
                                    className={styles.textareaField}
                                    placeholder="Nhập địa chỉ kho hàng (tối thiểu 3 ký tự để tìm kiếm)"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    disabled={saving}
                                />
                                {addressLoading && (
                                    <div className={styles.hint}>Đang tìm kiếm địa chỉ...</div>
                                )}
                                {addressSuggestions.length > 0 && (
                                    <div className={styles.suggestionList}>
                                        {addressSuggestions.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={styles.suggestionItem}
                                                onClick={() => {
                                                    handleChange('address', item.label);
                                                    setAddressSuggestions([]);
                                                }}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Loại kho</label>
                            <select
                                className={styles.selectField}
                                value={formData.type}
                                onChange={(e) => handleChange('type', e.target.value)}
                                disabled={saving}
                            >
                                <option value="STANDARD">Kho tiêu chuẩn</option>
                                <option value="SCRAP">Kho phế liệu (SCRAP)</option>
                                <option value="TRANSIT">Kho trung chuyển</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Trạng thái</label>
                            <select
                                className={styles.selectField}
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                disabled={saving}
                            >
                                <option value="APPROVED">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng sử dụng</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
                            Hủy
                        </button>
                        <div className={styles.rightButtons}>
                            {!isEdit && (
                                <button 
                                    type="button" 
                                    className={styles.btnSaveAndAdd} 
                                    onClick={(e) => handleSubmit(e, false)} 
                                    disabled={saving}
                                >
                                    {saving ? 'Đang xử lý...' : 'Lưu & Thêm tiếp'}
                                </button>
                            )}
                            <button type="submit" className={styles.btnSave} disabled={saving}>
                                {saving ? 'Đang xử lý...' : (isEdit ? 'Cập nhật' : 'Xác nhận')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default WarehouseFormModal;
