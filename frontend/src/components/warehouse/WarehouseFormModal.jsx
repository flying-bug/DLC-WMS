import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
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
        status: 'APPROVED',
    });
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [addressLoading, setAddressLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                 
                setFormData({
                    code: initialData.code || '',
                    name: initialData.name || '',
                    address: initialData.address || '',
                    status: initialData.status || 'APPROVED',
                    version: initialData.version,
                });
            } else {
                setFormData({ code: '', name: '', address: '', status: 'APPROVED', version: null });
            }
            setErrorMsg('');
        }
    }, [isOpen, isEdit, initialData]);

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
                // Sử dụng API Nominatim của OpenStreetMap để hỗ trợ tiếng Việt
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

    const handleSubmit = async (closeAfterSave = true) => {
        // Validation
        if (!formData.name.trim()) {
            setErrorMsg('Tên kho là bắt buộc.');
            return;
        }

        setSaving(true);
        try {
            await onSave(formData, closeAfterSave);
            if (closeAfterSave) {
                onClose();
            } else {
                // Reset form để thêm tiếp
                setFormData({ code: '', name: '', address: '', status: 'APPROVED' });
            }
        } catch (err) {
            const msg =
                err.response?.data?.userMessage ||
                err.response?.data?.message ||
                'Có lỗi xảy ra khi lưu.';
            setErrorMsg(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            ariaLabel={isEdit ? 'Sửa thông tin kho' : 'Thêm kho mới'}
            dialogStyle={{ maxWidth: '650px', width: '100%' }}
        >
            <div className={styles.modalHeader}>
                <h3>{isEdit ? 'Sửa thông tin kho' : 'Thêm kho mới'}</h3>
                <div className={styles.modalIcons}>
                    <i className="fas fa-times" onClick={onClose}></i>
                </div>
            </div>

            <div className={styles.modalBody}>
                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                <div className={styles.formRow}>
                    {/* Mã kho */}
                    {isEdit && (
                        <div className={styles.formGroup}>
                            <label>Mã kho</label>
                            <input
                                id="warehouse-code"
                                type="text"
                                className={styles.inputField}
                                value={formData.code}
                                disabled={true}
                                maxLength={50}
                            />
                            <small className={styles.hint}>Mã kho không thể thay đổi sau khi tạo.</small>
                        </div>
                    )}

                    {/* Tên kho */}
                    <div className={styles.formGroup}>
                        <label>Tên kho <span className={styles.required}>*</span></label>
                        <input
                            id="warehouse-name"
                            type="text"
                            className={styles.inputField}
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            autoFocus={isEdit}
                            maxLength={100}
                        />
                    </div>
                </div>

                {/* Địa chỉ */}
                <div className={styles.formGroup}>
                    <label>Địa chỉ</label>
                    <div className={styles.addressField}>
                        <textarea
                            id="warehouse-address"
                            className={styles.textareaField}
                            rows="3"
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            onBlur={() => window.setTimeout(() => setAddressSuggestions([]), 150)}
                        />
                        {(addressLoading || addressSuggestions.length > 0) && (
                            <div className={styles.suggestionList}>
                                {addressLoading && (
                                    <div className={styles.suggestionMeta}>Đang tìm địa chỉ...</div>
                                )}
                                {addressSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.id}
                                        type="button"
                                        className={styles.suggestionItem}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => {
                                            handleChange('address', suggestion.label);
                                            setAddressSuggestions([]);
                                        }}
                                    >
                                        {suggestion.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label>Trạng thái</label>
                    <select
                        id="warehouse-status"
                        className={styles.inputField}
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                    >
                        <option value="APPROVED">Đang hoạt động</option>
                        <option value="INACTIVE">Ngừng sử dụng</option>
                    </select>
                </div>
            </div>

            <div className={styles.modalFooter}>
                <button className={styles.btnCancel} onClick={onClose} disabled={saving}>Hủy bỏ</button>
                <div className={styles.rightButtons}>
                    {!isEdit && (
                        <button className={styles.btnSaveAndAdd} onClick={() => handleSubmit(false)} disabled={saving}>
                            Lưu & Thêm tiếp
                        </button>
                    )}
                    <button className={styles.btnSave} onClick={() => handleSubmit(true)} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu kho'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default WarehouseFormModal;
