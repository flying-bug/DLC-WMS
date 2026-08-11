import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../Modal/Modal';
import styles from './EmployeeDrawer.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


function EmployeeDrawer({ isOpen, onClose, user, onSave }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(() => user ? { ...user } : null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const drawerRef = useRef(null);
    const closeButtonRef = useRef(null);

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

    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || showConfirmModal) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (event.key !== 'Tab' || !drawerRef.current) return;
            const focusableElements = Array.from(drawerRef.current.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
            ));
            if (focusableElements.length === 0) {
                event.preventDefault();
                drawerRef.current.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, showConfirmModal]);

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
            setSaveError(error?.response?.data?.userMessage || error?.message || 'Không lưu được thay đổi.');
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
            <h3 className={styles.sectionTitle}>Chi tiết liên hệ</h3>
            <div className={styles.detailGrid}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Email công việc</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={styles.input} aria-label="Email công việc" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Số điện thoại</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={styles.input} aria-label="Số điện thoại" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Email công việc</span>
                            <span className={styles.detailValue}>{formData.email}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Số điện thoại</span>
                            <span className={styles.detailValue}>{formData.phone}</span>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.divider} />

            <h3 className={styles.sectionTitle}>Cơ cấu tổ chức</h3>
            <div className={styles.detailGrid}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Bộ phận</label>
                            <SearchableSelect name="department" value={formData.department} onChange={handleChange} className={`${styles.input} ${styles.select}`} aria-label="Bộ phận">
                                <option value="Phòng Kỹ thuật & Bảo hành">Phòng Kỹ thuật & Bảo hành</option>
                                <option value="Phòng Kinh doanh">Phòng Kinh doanh</option>
                                <option value="Kho bãi">Kho bãi</option>
                                <option value="Kế toán - Hành chính">Kế toán - Hành chính</option>
                            </SearchableSelect>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Chức danh</label>
                            <SearchableSelect name="position" value={formData.position} onChange={handleChange} className={`${styles.input} ${styles.select}`} aria-label="Chức danh">
                                <option value="Trưởng nhóm Kỹ thuật">Trưởng nhóm Kỹ thuật</option>
                                <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                                <option value="Nhân viên kinh doanh">Nhân viên kinh doanh</option>
                                <option value="Nhân viên kho">Nhân viên kho</option>
                            </SearchableSelect>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Bộ phận</span>
                            <span className={styles.detailValue}>{formData.department}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Chức danh</span>
                            <span className={styles.detailValue}>{formData.position}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const renderEmployeeInfoTab = () => (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>
            <div className={styles.detailGrid2}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Ngày sinh</label>
                            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={styles.input} aria-label="Ngày sinh" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Giới tính</label>
                            <SearchableSelect name="gender" value={formData.gender} onChange={handleChange} className={`${styles.input} ${styles.select}`} aria-label="Giới tính">
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </SearchableSelect>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Ngày sinh</span>
                            <span className={styles.detailValue}>{formData.dob}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Giới tính</span>
                            <span className={styles.detailValue}>{formData.gender}</span>
                        </div>
                    </>
                )}
            </div>
            <div className={styles.detailGrid} style={{ marginTop: '16px' }}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Địa chỉ thường trú</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className={styles.input} aria-label="Địa chỉ thường trú" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Số CMND/CCCD</label>
                            <input type="text" name="idCard" value={formData.idCard} onChange={handleChange} className={styles.input} aria-label="Số CMND hoặc CCCD" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Địa chỉ thường trú</span>
                            <span className={styles.detailValue}>{formData.address}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Số CMND/CCCD</span>
                            <span className={styles.detailValue}>{formData.idCard}</span>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.divider} />

            <h3 className={styles.sectionTitle}>Thông tin công việc</h3>
            <div className={styles.detailGrid2}>
                {isEditMode ? (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Ngày chính thức</label>
                            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={styles.input} aria-label="Ngày chính thức" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.detailLabel}>Loại hợp đồng</label>
                            <SearchableSelect name="contractType" value={formData.contractType} onChange={handleChange} className={`${styles.input} ${styles.select}`} aria-label="Loại hợp đồng">
                                <option value="Chính thức">Chính thức</option>
                                <option value="Thử việc">Thử việc</option>
                                <option value="Thời vụ">Thời vụ</option>
                            </SearchableSelect>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Ngày chính thức</span>
                            <span className={styles.detailValue}>{formData.startDate}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Loại hợp đồng</span>
                            <span className={styles.detailValue}>{formData.contractType}</span>
                        </div>
                    </>
                )}
            </div>
            <div className={styles.detailGrid} style={{ marginTop: '16px' }}>
                {isEditMode ? (
                    <div className={styles.formGroup}>
                        <label className={styles.detailLabel}>Trạng thái</label>
                        <SearchableSelect name="statusLabel" value={formData.statusLabel} onChange={handleChange} className={`${styles.input} ${styles.select}`} aria-label="Trạng thái">
                            <option value="Đang hoạt động">Đang hoạt động</option>
                            <option value="Chờ duyệt">Chờ duyệt</option>
                            <option value="Ngừng hoạt động">Ngừng hoạt động</option>
                        </SearchableSelect>
                    </div>
                ) : (
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Trạng thái</span>
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
            <h3 className={styles.sectionTitle}>Phân quyền hệ thống</h3>
            {isEditMode ? (
                <>
                    <p className={styles.roleText}>Chọn vai trò phù hợp cho nhân viên này để thiết lập các quyền hạn truy cập tương ứng.</p>

                    <label className={`${styles.roleCard} ${formData.systemRole === 'admin' ? styles.roleCardActive : ''}`}>
                        <input type="radio" name="systemRole" value="admin" checked={formData.systemRole === 'admin'} onChange={handleChange} className={styles.roleRadio} />
                        <div className={styles.roleContent}>
                            <span className={styles.roleTitle}>Quản lý hệ thống</span>
                            <span className={styles.roleDesc}>Toàn quyền sử dụng tất cả các tính năng và nghiệp vụ trên hệ thống.</span>
                        </div>
                    </label>

                    <label className={`${styles.roleCard} ${formData.systemRole === 'user' ? styles.roleCardActive : ''}`}>
                        <input type="radio" name="systemRole" value="user" checked={formData.systemRole === 'user'} onChange={handleChange} className={styles.roleRadio} />
                        <div className={styles.roleContent}>
                            <span className={styles.roleTitle}>Người sử dụng hệ thống</span>
                            <span className={styles.roleDesc}>Người dùng chỉ sử dụng một số tính năng, nghiệp vụ được phân quyền cụ thể.</span>
                        </div>
                    </label>
                </>
            ) : (
                <>
                    {formData.systemRole === 'admin' ? (
                        <div className={`${styles.roleCard} ${styles.roleCardActive}`} style={{ cursor: 'default' }}>
                            <i className="bi bi-shield-check" style={{ color: 'var(--color-primary-navy)', fontSize: '18px', marginTop: '2px' }}></i>
                            <div className={styles.roleContent}>
                                <span className={styles.roleTitle}>Quản lý hệ thống</span>
                                <span className={styles.roleDesc}>Toàn quyền sử dụng tất cả các tính năng và nghiệp vụ trên hệ thống.</span>
                            </div>
                        </div>
                    ) : (
                        <div className={`${styles.roleCard} ${styles.roleCardActive}`} style={{ cursor: 'default' }}>
                            <i className="bi bi-person-check" style={{ color: 'var(--color-primary-navy)', fontSize: '18px', marginTop: '2px' }}></i>
                            <div className={styles.roleContent}>
                                <span className={styles.roleTitle}>Người sử dụng hệ thống</span>
                                <span className={styles.roleDesc}>Được cấp quyền sử dụng các tính năng cơ bản.</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className={styles.roleNotice}>
                <i className="bi bi-info-circle"></i>
                <span>Vai trò {formData.systemRole === 'admin' ? 'Quản lý hệ thống' : 'Người sử dụng hệ thống'} cho phép người dùng này truy cập các module tương ứng.</span>
            </div>
        </div>
    );

    return (
        <>
            <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} onClick={onClose} aria-hidden="true" />
            <div
                ref={drawerRef}
                className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="employee-drawer-title"
                aria-hidden={!isOpen}
                tabIndex={-1}
                {...(!isOpen ? { inert: '' } : {})}
            >
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <div className={styles.userInfo}>
                            {formData.imageUrl ? (
                                <img src={formData.imageUrl} className={styles.avatarImage} alt={formData.name} />
                            ) : (
                                <div className={styles.avatar}>{formData.initials}</div>
                            )}
                            <div className={styles.userDetails}>
                                <h2 id="employee-drawer-title" className={styles.userName}>{formData.name}</h2>
                                <span className={styles.userCode}>Mã NV: {formData.code}</span>
                                <div className={styles.badges}>
                                    <span className={styles.statusBadge} style={formData.status !== 'active' ? { background: 'var(--status-warning-bg)', color: 'var(--color-warning-dark)' } : {}}>
                                        <i className="bi bi-circle-fill"></i> {formData.statusLabel}
                                    </span>
                                    <span className={styles.roleBadge}>{formData.roleBadge}</span>
                                </div>
                            </div>
                        </div>
                        <button ref={closeButtonRef} type="button" className={styles.btnClose} onClick={onClose} aria-label="Đóng thông tin nhân viên">
                            <i className="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                    </div>

                    <div className={styles.tabs} role="tablist" aria-label="Nhóm thông tin nhân viên">
                        <button id="drawer-tab-general" type="button" role="tab" aria-selected={activeTab === 'general'} className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('general')}>Thông tin chung</button>
                        <button id="drawer-tab-employee" type="button" role="tab" aria-selected={activeTab === 'employee'} className={`${styles.tabBtn} ${activeTab === 'employee' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('employee')}>Thông tin nhân viên</button>
                        <button id="drawer-tab-role" type="button" role="tab" aria-selected={activeTab === 'role'} className={`${styles.tabBtn} ${activeTab === 'role' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('role')}>Chức năng/Vai trò</button>
                    </div>
                </div>

                <div className={styles.body} role="tabpanel" aria-labelledby={`drawer-tab-${activeTab}`}>
                    {saveError && (
                        <div className={styles.errorAlert} role="alert">
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
                            <button type="button" className="btnDefault" onClick={handleCancel}>Hủy</button>
                            <button type="button" className="btnPrimary" onClick={handleInitialSave} disabled={saving}>Lưu thay đổi</button>
                        </>
                    ) : (
                        <button type="button" className="btnDefault" onClick={() => setIsEditMode(true)}>Chỉnh sửa</button>
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
                            <h3 className={styles.modalTitle}>Xác nhận cấp quyền Quản trị tối cao</h3>
                        </div>
                        <p className={styles.modalText}>
                            Bạn đang cấp Toàn quyền quản lý hệ thống cho nhân viên <strong>{formData.name}</strong>. Người này sẽ có quyền xem, sửa, xóa mọi dữ liệu và thay đổi cấu hình hệ thống. Bạn có chắc chắn muốn thực hiện không?
                        </p>
                        <div className={styles.modalActions}>
                            <button className="btnDefault" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                            <button className="btnDanger" onClick={handleConfirmAdmin} disabled={saving}>Xác nhận cấp quyền</button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <div className={`${styles.modalIcon} ${styles.modalIconInfo}`}>
                                <i className="bi bi-question-circle"></i>
                            </div>
                            <h3 className={styles.modalTitle}>Xác nhận chuyển sang thiết lập quyền chi tiết</h3>
                        </div>
                        <p className={styles.modalText}>
                            Bạn đã chọn vai trò Người sử dụng hệ thống. Hệ thống sẽ chuyển sang màn hình thiết lập quyền hạn chi tiết cho từng chức năng. Bạn có muốn tiếp tục không?
                        </p>
                        <div className={styles.modalActions}>
                            <button className="btnDefault" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                            <button className="btnPrimary" onClick={handleConfirmUser} disabled={saving}>Tiếp tục</button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}

export default EmployeeDrawer;
