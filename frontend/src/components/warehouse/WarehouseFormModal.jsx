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
                // eslint-disable-next-line react-hooks/set-state-in-effect
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
                const params = new URLSearchParams({ q: query, lang: 'vi', limit: '6' });
                const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('Address lookup failed');

                const data = await response.json();
                const suggestions = (data.features || []).map((feature) => {
                    const props = feature.properties || {};
                    const parts = [
                        props.name,
                        props.street,
                        props.district,
                        props.city,
                        props.state,
                        props.country,
                    ].filter(Boolean);
                    return {
                        id: `${props.osm_type || 'place'}-${props.osm_id || parts.join('-')}`,
                        label: [...new Set(parts)].join(', '),
                    };
                }).filter((item) => item.label);
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
        if (!isEdit && !formData.code.trim()) {
            setErrorMsg('Mã kho là bắt buộc.');
            return;
        }
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
        <Modal isOpen={isOpen} onClose={onClose} ariaLabel={isEdit ? 'Sửa thông tin kho' : 'Thêm kho mới'}>
            <div className={styles.modalHeader}>
                <h3>{isEdit ? 'Sửa thông tin kho' : 'Thêm kho mới'}</h3>
                <div className={styles.modalIcons}>
                    <i className="fas fa-times" onClick={onClose}></i>
                </div>
            </div>

            <div className={styles.modalBody}>
                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                {/* Mã kho */}
                <div className={styles.formGroup}>
                    <label>Mã kho <span className={styles.required}>*</span></label>
                    <input
                        id="warehouse-code"
                        type="text"
                        className={styles.inputField}
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value)}
                        disabled={isEdit} // Read-only khi chỉnh sửa
                        autoFocus={!isEdit}
                        maxLength={50}
                    />
                    {isEdit && <small className={styles.hint}>Mã kho không thể thay đổi sau khi tạo.</small>}
                </div>

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

                {isEdit && (
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
                )}
                {/* Loại kho – Cố định read-only */}
                <div className={styles.formGroup}>
                    <label>Loại kho</label>
                    <input
                        id="warehouse-type"
                        value="Kho tiêu chuẩn"
                        disabled={true}
                        className={styles.inputField}
                    />
                    <small className={styles.hint}>Mặc định là Kho tiêu chuẩn, không thể thay đổi.</small>
                </div>
            </div>

            <div className={styles.modalFooter}>
                <button className={styles.btnCancel} onClick={onClose} disabled={saving}>Hủy</button>
                <div className={styles.rightButtons}>
                    <button className={styles.btnSave} onClick={() => handleSubmit(true)} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Cất'}
                    </button>
                    {!isEdit && (
                        <button className={styles.btnSaveAndAdd} onClick={() => handleSubmit(false)} disabled={saving}>
                            Cất và Thêm
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default WarehouseFormModal;
