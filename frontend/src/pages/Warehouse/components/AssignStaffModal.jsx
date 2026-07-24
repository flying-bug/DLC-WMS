import { useState, useEffect } from 'react';
import warehouseStaffApi from '../../../api/warehouseStaffApi';
import axiosClient from '../../../api/axiosClient';
import Modal from '../../../components/ui/Modal/Modal';
import Button from '../../../components/ui/Button/Button';
import styles from './AssignStaffModal.module.css';

const AssignStaffModal = ({ warehouseId, roles, userId: editUserId, staffs, onClose, onSuccess }) => {
    const [userId, setUserId] = useState(editUserId || '');
    const [selectedRoleIds, setSelectedRoleIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // User search
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const isEditMode = !!editUserId;

    useEffect(() => {
        if (isEditMode && staffs) {
            const staff = staffs.find(s => s.userId === editUserId);
            if (staff) {
                setSearchTerm(`${staff.fullName} (${staff.email})`);
                setSelectedRoleIds(staff.roles.map(r => r.id));
            }
        }
    }, [isEditMode, editUserId, staffs]);

    const searchUsers = async () => {
        setIsSearching(true);
        try {
            const res = await axiosClient.get('/users/search', { params: { keyword: searchTerm } });
            setUsers(res.data.data || []);
        } catch (err) {
            console.error('Lỗi tìm kiếm user:', err);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (isEditMode || !searchTerm.trim() || userId) return;

        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 2) {
                searchUsers();
            } else {
                setUsers([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, isEditMode, userId]);

    const handleRoleToggle = (roleId) => {
        setSelectedRoleIds(prev => 
            prev.includes(roleId) 
                ? prev.filter(id => id !== roleId)
                : [...prev, roleId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!userId) {
            setError('Vui lòng chọn một nhân viên.');
            return;
        }
        
        if (selectedRoleIds.length === 0) {
            setError('Vui lòng chọn ít nhất một vai trò.');
            return;
        }

        setLoading(true);
        try {
            await warehouseStaffApi.assignRoles(warehouseId, {
                userId: userId,
                roleIds: selectedRoleIds
            });
            onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Có lỗi xảy ra!');
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            dialogClassName={styles.modalDialog}
            ariaLabel={isEditMode ? "Sửa quyền nhân sự kho" : "Gán quyền nhân sự kho"}
        >
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <h2>{isEditMode ? 'Sửa quyền nhân sự kho' : 'Gán quyền nhân sự kho'}</h2>
                    <button type="button" className={styles.btnClose} onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorAlert}>{error}</div>}
                    
                    <div className={styles.formGroup}>
                        <label>Tìm nhân viên <span className={styles.required}>*</span></label>
                        <div className={styles.searchInputWrapper}>
                            <input 
                                type="text" 
                                className="misa-input"
                                placeholder={isEditMode ? '' : "Nhập tên, username hoặc sđt để tìm..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={isEditMode || userId !== ''}
                                style={{ width: '100%' }}
                            />
                            {isSearching && <span className={styles.searchingSpinner}><i className="bi bi-arrow-repeat spin"></i></span>}
                        </div>
                        
                        {users.length > 0 && !userId && !isEditMode && (
                            <ul className={styles.userDropdown}>
                                {users.map(u => {
                                    const contactInfo = u.email || u.phone;
                                    return (
                                    <li key={u.id} onClick={() => {
                                        setUserId(u.id);
                                        setSearchTerm(contactInfo ? `${u.fullName} - ${contactInfo}` : u.fullName);
                                        setUsers([]);
                                    }}>
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>{u.fullName}</span>
                                            {contactInfo && <span className={styles.userEmail}>{contactInfo}</span>}
                                        </div>
                                    </li>
                                    );
                                })}
                            </ul>
                        )}
                        {userId && !isEditMode && (
                            <div className={styles.selectedUserAction}>
                                <button type="button" className={styles.btnChangeUser} onClick={() => {
                                    setUserId('');
                                    setSearchTerm('');
                                }}>
                                    <i className="bi bi-arrow-counterclockwise"></i> Chọn nhân viên khác
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Vai trò <span className={styles.required}>*</span></label>
                        <div className={styles.rolesGrid}>
                            {roles.map(role => (
                                <label key={role.id} className={`${styles.roleItem} ${selectedRoleIds.includes(role.id) ? styles.selected : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedRoleIds.includes(role.id)}
                                        onChange={() => handleRoleToggle(role.id)}
                                    />
                                    <div className={styles.roleInfo}>
                                        <span className={styles.roleName}>{role.name}</span>
                                        <span className={styles.roleCode}>{role.code}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
                            Hủy bỏ
                        </Button>
                        <Button variant="primary" type="submit" isLoading={loading}>
                            {isEditMode ? 'Lưu thay đổi' : 'Xác nhận gán quyền'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default AssignStaffModal;
