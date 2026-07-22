import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../Modal/Modal';
import styles from './EmployeeDrawer.module.css';

function EmployeeDrawer({ isOpen, onClose, user, onSave }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(() => user ? { ...user } : null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Sync formData when user prop changes
    useEffect(() => {
        if (user) {
             
            setFormData({ ...user });
        }
         
    }, [user?.id]);

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setIsEditMode(false);
                setActiveTab('general');
                setShowConfirmModal(false);
                setSaveError('');
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!user || !formData) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (saveError) setSaveError('');
    };

    const normalizePhone = (value) => (value || '').replace(/[\s.-]/g, '');

    const saveCurrentForm = async () => {
        setSaving(true);
        setSaveError('');
        try {
            if (onSave) {
                await onSave({
                    ...formData,
                    phone: normalizePhone(formData.phone),
                });
            }
            setIsEditMode(false);
            setShowConfirmModal(false);
            onClose();
        } catch (error) {
            setSaveError(error?.response?.data?.userMessage || error?.message || 'KhÃ´ng lÆ°u Ä‘Æ°á»£c thay Ä‘á»•i.');
        } finally {
            setSaving(false);
        }
    };

    const handleInitialSave = async () => {
        if (formData.systemRole !== user.systemRole) {
            setShowConfirmModal(true);
            return;
        }
        await saveCurrentForm();
    };

    const handleConfirmAdmin = async () => {
        await saveCurrentForm();
    };

    const handleConfirmUser = async () => {
        await saveCurrentForm();
        navigate(`/users/${formData.id}/permissions`);
    };

    const handleCancel = () => {
        setFormData({ ...user }); // reset
        setIsEditMode(false);
        setSaveError('');
    };

    const renderGeneralTab = () => (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Chi tiáº¿t liÃªn há»‡</h3>
            <div className={styles.detailGrid}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Email cÃ´ng viá»‡c</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Sá»‘ Ä‘iá»‡n thoáº¡i</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={styles.input} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Email cÃ´ng viá»‡c</span>
                            <span className={styles.detailValue}>{formData.email}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Sá»‘ Ä‘iá»‡n thoáº¡i</span>
                            <span className={styles.detailValue}>{formData.phone}</span>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.divider} />

            <h3 className={styles.sectionTitle}>CÆ¡ cáº¥u tá»• chá»©c</h3>
            <div className={styles.detailGrid}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Bá»™ pháº­n</label>
                            <select name="department" value={formData.department} onChange={handleChange} className={`${styles.input} ${styles.select}`}>
                                <option value="PhÃ²ng Ká»¹ thuáº­t & Báº£o hÃ nh">PhÃ²ng Ká»¹ thuáº­t & Báº£o hÃ nh</option>
                                <option value="PhÃ²ng Kinh doanh">PhÃ²ng Kinh doanh</option>
                                <option value="Kho bÃ£i">Kho bÃ£i</option>
                                <option value="Káº¿ toÃ¡n - HÃ nh chÃ­nh">Káº¿ toÃ¡n - HÃ nh chÃ­nh</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Chá»©c danh</label>
                            <select name="position" value={formData.position} onChange={handleChange} className={`${styles.input} ${styles.select}`}>
                                <option value="TrÆ°á»Ÿng nhÃ³m Ká»¹ thuáº­t">TrÆ°á»Ÿng nhÃ³m Ká»¹ thuáº­t</option>
                                <option value="Ká»¹ thuáº­t viÃªn">Ká»¹ thuáº­t viÃªn</option>
                                <option value="NhÃ¢n viÃªn kinh doanh">NhÃ¢n viÃªn kinh doanh</option>
                                <option value="NhÃ¢n viÃªn kho">NhÃ¢n viÃªn kho</option>
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Bá»™ pháº­n</span>
                            <span className={styles.detailValue}>{formData.department}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Chá»©c danh</span>
                            <span className={styles.detailValue}>{formData.position}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const renderEmployeeInfoTab = () => (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>ThÃ´ng tin cÃ¡ nhÃ¢n</h3>
            <div className={styles.detailGrid2}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>NgÃ y sinh</label>
                            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Giá»›i tÃ­nh</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className={`${styles.input} ${styles.select}`}>
                                <option value="Nam">Nam</option>
                                <option value="Ná»¯">Ná»¯</option>
                                <option value="KhÃ¡c">KhÃ¡c</option>
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>NgÃ y sinh</span>
                            <span className={styles.detailValue}>{formData.dob}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Giá»›i tÃ­nh</span>
                            <span className={styles.detailValue}>{formData.gender}</span>
                        </div>
                    </>
                )}
            </div>
            <div className={styles.detailGrid} style={{ marginTop: '16px' }}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Äá»‹a chá»‰ thÆ°á»ng trÃº</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Sá»‘ CMND/CCCD</label>
                            <input type="text" name="idCard" value={formData.idCard} onChange={handleChange} className={styles.input} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Äá»‹a chá»‰ thÆ°á»ng trÃº</span>
                            <span className={styles.detailValue}>{formData.address}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Sá»‘ CMND/CCCD</span>
                            <span className={styles.detailValue}>{formData.idCard}</span>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.divider} />

            <h3 className={styles.sectionTitle}>ThÃ´ng tin cÃ´ng viá»‡c</h3>
            <div className={styles.detailGrid2}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>NgÃ y chÃ­nh thá»©c</label>
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Loáº¡i há»£p Ä‘á»“ng</label>
                            <select name="contractType" value={formData.contractType} onChange={handleChange} className={`${styles.input} ${styles.select}`}>
                                <option value="ChÃ­nh thá»©c">ChÃ­nh thá»©c</option>
                                <option value="Thá»­ viá»‡c">Thá»­ viá»‡c</option>
                                <option value="Thá»i vá»¥">Thá»i vá»¥</option>
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>NgÃ y chÃ­nh thá»©c</span>
                            <span className={styles.detailValue}>{formData.startDate}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Loáº¡i há»£p Ä‘á»“ng</span>
                            <span className={styles.detailValue}>{formData.contractType}</span>
                        </div>
                    </>
                )}
            </div>
            <div className={styles.detailGrid} style={{ marginTop: '16px' }}>
                {isEditMode ? (
                    <div className={styles.formGroup}>
                        <label className={styles.detailLabel}>Tráº¡ng thÃ¡i</label>
                        <select name="statusLabel" value={formData.statusLabel} onChange={handleChange} className={`${styles.input} ${styles.select}`}>
                            <option value="Äang hoáº¡t Ä‘á»™ng">Äang hoáº¡t Ä‘á»™ng</option>
                            <option value="Chá» duyá»‡t">Chá» duyá»‡t</option>
                            <option value="Ngá»«ng hoáº¡t Ä‘á»™ng">Ngá»«ng hoáº¡t Ä‘á»™ng</option>
                        </select>
                    </div>
                ) : (
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Tráº¡ng thÃ¡i</span>
                        <span className={styles.detailValue}>
                            <i className="bi bi-circle-fill" style={{ fontSize: '8px', color: formData.status === 'active' ? 'var(--color-success)' : 'var(--color-warning-dark)', marginRight: '6px' }}></i>
                            {formData.statusLabel}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    const renderRoleTab = () => (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>PhÃ¢n quyá»n há»‡ thá»‘ng</h3>
            {isEditMode ? (
                <>
                    <p className={styles.roleText}>Chá»n vai trÃ² phÃ¹ há»£p cho nhÃ¢n viÃªn nÃ y Ä‘á»ƒ thiáº¿t láº­p cÃ¡c quyá»n háº¡n truy cáº­p tÆ°Æ¡ng á»©ng.</p>

                    <label className={`${styles.roleCard} ${formData.systemRole === 'admin' ? styles.roleCardActive : ''}`}>
                        <input type="radio" name="systemRole" value="admin" checked={formData.systemRole === 'admin'} onChange={handleChange} className={styles.roleRadio} />
                        <div className={styles.roleContent}>
                            <span className={styles.roleTitle}>Quáº£n lÃ½ há»‡ thá»‘ng</span>
                            <span className={styles.roleDesc}>ToÃ n quyá»n sá»­ dá»¥ng táº¥t cáº£ cÃ¡c tÃ­nh nÄƒng vÃ  nghiá»‡p vá»¥ trÃªn há»‡ thá»‘ng.</span>
                        </div>
                    </label>

                    <label className={`${styles.roleCard} ${formData.systemRole === 'user' ? styles.roleCardActive : ''}`}>
                        <input type="radio" name="systemRole" value="user" checked={formData.systemRole === 'user'} onChange={handleChange} className={styles.roleRadio} />
                        <div className={styles.roleContent}>
                            <span className={styles.roleTitle}>NgÆ°á»i sá»­ dá»¥ng há»‡ thá»‘ng</span>
                            <span className={styles.roleDesc}>NgÆ°á»i dÃ¹ng chá»‰ sá»­ dá»¥ng má»™t sá»‘ tÃ­nh nÄƒng, nghiá»‡p vá»¥ Ä‘Æ°á»£c phÃ¢n quyá»n cá»¥ thá»ƒ.</span>
                        </div>
                    </label>
                </>
            ) : (
                <>
                    {formData.systemRole === 'admin' ? (
                        <div className={`${styles.roleCard} ${styles.roleCardActive}`} style={{ cursor: 'default' }}>
                            <i className="bi bi-shield-check" style={{ color: 'var(--color-primary-navy)', fontSize: '18px', marginTop: '2px' }}></i>
                            <div className={styles.roleContent}>
                                <span className={styles.roleTitle}>Quáº£n lÃ½ há»‡ thá»‘ng</span>
                                <span className={styles.roleDesc}>ToÃ n quyá»n sá»­ dá»¥ng táº¥t cáº£ cÃ¡c tÃ­nh nÄƒng vÃ  nghiá»‡p vá»¥ trÃªn há»‡ thá»‘ng.</span>
                            </div>
                        </div>
                    ) : (
                        <div className={`${styles.roleCard} ${styles.roleCardActive}`} style={{ cursor: 'default' }}>
                            <i className="bi bi-person-check" style={{ color: 'var(--color-primary-navy)', fontSize: '18px', marginTop: '2px' }}></i>
                            <div className={styles.roleContent}>
                                <span className={styles.roleTitle}>NgÆ°á»i sá»­ dá»¥ng há»‡ thá»‘ng</span>
                                <span className={styles.roleDesc}>ÄÆ°á»£c cáº¥p quyá»n sá»­ dá»¥ng cÃ¡c tÃ­nh nÄƒng cÆ¡ báº£n.</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className={styles.roleNotice}>
                <i className="bi bi-info-circle"></i>
                <span>Vai trÃ² {formData.systemRole === 'admin' ? 'Quáº£n lÃ½ há»‡ thá»‘ng' : 'NgÆ°á»i sá»­ dá»¥ng há»‡ thá»‘ng'} cho phÃ©p ngÆ°á»i dÃ¹ng nÃ y truy cáº­p cÃ¡c module tÆ°Æ¡ng á»©ng.</span>
            </div>
        </div>
    );

    return (
        <>
            <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} onClick={onClose} />
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <div className={styles.userInfo}>
                            <div className={styles.avatar}>{formData.initials}</div>
                            <div className={styles.userDetails}>
                                <h2 className={styles.userName}>{formData.name}</h2>
                                <span className={styles.userCode}>MÃ£ NV: {formData.code}</span>
                                <div className={styles.badges}>
                                    <span className={styles.statusBadge} style={formData.status !== 'active' ? { background: 'var(--status-warning-bg)', color: 'var(--color-warning-dark)' } : {}}>
                                        <i className="bi bi-circle-fill"></i> {formData.statusLabel}
                                    </span>
                                    <span className={styles.roleBadge}>{formData.roleBadge}</span>
                                </div>
                            </div>
                        </div>
                        <button className={styles.btnClose} onClick={onClose}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className={styles.tabs}>
                        <button className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('general')}>ThÃ´ng tin chung</button>
                        <button className={`${styles.tabBtn} ${activeTab === 'employee' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('employee')}>ThÃ´ng tin nhÃ¢n viÃªn</button>
                        <button className={`${styles.tabBtn} ${activeTab === 'role' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('role')}>Chá»©c nÄƒng/Vai trÃ²</button>
                    </div>
                </div>

                <div className={styles.body}>
                    {saveError && (
                        <div className={styles.errorAlert}>
                            <i className="bi bi-exclamation-triangle"></i>
                            <span>{saveError}</span>
                        </div>
                    )}
                    {activeTab === 'general' && renderGeneralTab()}
                    {activeTab === 'employee' && renderEmployeeInfoTab()}
                    {activeTab === 'role' && renderRoleTab()}
                </div>

                <div className={styles.footer}>
                    {isEditMode ? (
                        <>
                            <button className={styles.btnCancel} onClick={handleCancel}>Há»§y</button>
                            <button className={styles.btnSave} onClick={handleInitialSave} disabled={saving}>LÆ°u thay Ä‘á»•i</button>
                        </>
                    ) : (
                        <button className={styles.btnCancel} onClick={() => setIsEditMode(true)}>Chá»‰nh sá»­a</button>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} dialogClassName={styles.confirmDialog}>
                {formData.systemRole === 'admin' ? (
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <div className={`${styles.modalIcon} ${styles.modalIconWarning}`}>
                                <i className="bi bi-exclamation-triangle"></i>
                            </div>
                            <h3 className={styles.modalTitle}>XÃ¡c nháº­n cáº¥p quyá»n Quáº£n trá»‹ tá»‘i cao</h3>
                        </div>
                        <p className={styles.modalText}>
                            Báº¡n Ä‘ang cáº¥p ToÃ n quyá»n quáº£n lÃ½ há»‡ thá»‘ng cho nhÃ¢n viÃªn <strong>{formData.name}</strong>. NgÆ°á»i nÃ y sáº½ cÃ³ quyá»n xem, sá»­a, xÃ³a má»i dá»¯ liá»‡u vÃ  thay Ä‘á»•i cáº¥u hÃ¬nh há»‡ thá»‘ng. Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n thá»±c hiá»‡n khÃ´ng?
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnCancel} onClick={() => setShowConfirmModal(false)}>Há»§y</button>
                            <button className={`${styles.btnSave} ${styles.btnDanger}`} onClick={handleConfirmAdmin} disabled={saving}>XÃ¡c nháº­n cáº¥p quyá»n</button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <div className={`${styles.modalIcon} ${styles.modalIconInfo}`}>
                                <i className="bi bi-question-circle"></i>
                            </div>
                            <h3 className={styles.modalTitle}>XÃ¡c nháº­n chuyá»ƒn sang thiáº¿t láº­p quyá»n chi tiáº¿t</h3>
                        </div>
                        <p className={styles.modalText}>
                            Báº¡n Ä‘Ã£ chá»n vai trÃ² NgÆ°á»i sá»­ dá»¥ng há»‡ thá»‘ng. Há»‡ thá»‘ng sáº½ chuyá»ƒn sang mÃ n hÃ¬nh thiáº¿t láº­p quyá»n háº¡n chi tiáº¿t cho tá»«ng chá»©c nÄƒng. Báº¡n cÃ³ muá»‘n tiáº¿p tá»¥c khÃ´ng?
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnCancel} onClick={() => setShowConfirmModal(false)}>Há»§y</button>
                            <button className={styles.btnSave} onClick={handleConfirmUser} disabled={saving}>Tiáº¿p tá»¥c</button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}

export default EmployeeDrawer;
