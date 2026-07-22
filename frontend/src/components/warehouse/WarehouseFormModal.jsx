import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import styles from './WarehouseFormModal.module.css';

/**
 * Modal táº¡o má»›i / chá»‰nh sá»­a kho.
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
                // Sá»­ dá»¥ng API Nominatim cá»§a OpenStreetMap Ä‘á»ƒ há»— trá»£ tiáº¿ng Viá»‡t
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
        if (!isEdit && !formData.code.trim()) {
            setErrorMsg('MÃ£ kho lÃ  báº¯t buá»™c.');
            return;
        }
        if (!formData.name.trim()) {
            setErrorMsg('TÃªn kho lÃ  báº¯t buá»™c.');
            return;
        }

        setSaving(true);
        try {
            await onSave(formData, closeAfterSave);
            if (closeAfterSave) {
                onClose();
            } else {
                // Reset form Ä‘á»ƒ thÃªm tiáº¿p
                setFormData({ code: '', name: '', address: '', status: 'APPROVED' });
            }
        } catch (err) {
            const msg =
                err.response?.data?.userMessage ||
                err.response?.data?.message ||
                'CÃ³ lá»—i xáº£y ra khi lÆ°u.';
            setErrorMsg(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            ariaLabel={isEdit ? 'Sá»­a thÃ´ng tin kho' : 'ThÃªm kho má»›i'}
            dialogStyle={{ maxWidth: '650px', width: '100%' }}
        >
            <div className={styles.modalHeader}>
                <h3>{isEdit ? 'Sá»­a thÃ´ng tin kho' : 'ThÃªm kho má»›i'}</h3>
                <div className={styles.modalIcons}>
                    <i className="fas fa-times" onClick={onClose}></i>
                </div>
            </div>

            <div className={styles.modalBody}>
                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                <div className={styles.formRow}>
                    {/* MÃ£ kho */}
                    <div className={styles.formGroup}>
                        <label>MÃ£ kho <span className={styles.required}>*</span></label>
                        <input
                            id="warehouse-code"
                            type="text"
                            className={styles.inputField}
                            value={formData.code}
                            onChange={(e) => handleChange('code', e.target.value)}
                            disabled={isEdit} // Read-only khi chá»‰nh sá»­a
                            autoFocus={!isEdit}
                            maxLength={50}
                        />
                        {isEdit && <small className={styles.hint}>MÃ£ kho khÃ´ng thá»ƒ thay Ä‘á»•i sau khi táº¡o.</small>}
                    </div>

                    {/* TÃªn kho */}
                    <div className={styles.formGroup}>
                        <label>TÃªn kho <span className={styles.required}>*</span></label>
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

                {/* Äá»‹a chá»‰ */}
                <div className={styles.formGroup}>
                    <label>Äá»‹a chá»‰</label>
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
                                    <div className={styles.suggestionMeta}>Äang tÃ¬m Ä‘á»‹a chá»‰...</div>
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
                    <label>Tráº¡ng thÃ¡i</label>
                    <select
                        id="warehouse-status"
                        className={styles.inputField}
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                    >
                        <option value="APPROVED">Äang hoáº¡t Ä‘á»™ng</option>
                        <option value="INACTIVE">Ngá»«ng sá»­ dá»¥ng</option>
                    </select>
                </div>
            </div>

            <div className={styles.modalFooter}>
                <button className={styles.btnCancel} onClick={onClose} disabled={saving}>Há»§y bá»</button>
                <div className={styles.rightButtons}>
                    {!isEdit && (
                        <button className={styles.btnSaveAndAdd} onClick={() => handleSubmit(false)} disabled={saving}>
                            LÆ°u & ThÃªm tiáº¿p
                        </button>
                    )}
                    <button className={styles.btnSave} onClick={() => handleSubmit(true)} disabled={saving}>
                        {saving ? 'Äang lÆ°u...' : 'LÆ°u kho'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default WarehouseFormModal;
