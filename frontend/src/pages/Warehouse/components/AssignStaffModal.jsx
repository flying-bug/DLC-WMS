import { useState, useEffect } from 'react';
import warehouseStaffApi from '../../../api/warehouseStaffApi';
import axiosClient from '../../../api/axiosClient';
import styles from './AssignStaffModal.module.css';

const AssignStaffModal = ({ warehouseId, roles, onClose, onSuccess }) => {
    const [userId, setUserId] = useState('');
    const [selectedRoleIds, setSelectedRoleIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // User search
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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
        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 2) {
                searchUsers();
            } else {
                setUsers([]);
            }
        }, 500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

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
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Gán Quyền Nhân Sự Kho</h2>
                    <button className={styles.btnClose} onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorAlert}>{error}</div>}
                    
                    <div className={styles.formGroup}>
                        <label>Tìm nhân viên <span className={styles.required}>*</span></label>
                        <input 
                            type="text" 
                            className={styles.input}
                            placeholder="Nhập tên, username hoặc sđt để tìm..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {isSearching && <div className={styles.searchingText}>Đang tìm kiếm...</div>}
                        
                        {users.length > 0 && !userId && (
                            <ul className={styles.userDropdown}>
                                {users.map(u => (
                                    <li key={u.id} onClick={() => {
                                        setUserId(u.id);
                                        setSearchTerm(`${u.fullName} (${u.username})`);
                                        setUsers([]);
                                    }}>
                                        {u.fullName} - {u.email || u.phone}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {userId && (
                            <div className={styles.selectedUser}>
                                Đã chọn nhân viên
                                <button type="button" onClick={() => {
                                    setUserId('');
                                    setSearchTerm('');
                                }}>Thay đổi</button>
                            </div>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Vai trò <span className={styles.required}>*</span></label>
                        <div className={styles.rolesGrid}>
                            {roles.map(role => (
                                <label key={role.id} className={styles.roleItem}>
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
                        <button type="button" className={styles.btnCancel} onClick={onClose} disabled={loading}>
                            Hủy
                        </button>
                        <button type="submit" className={styles.btnSave} disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Xác nhận gán quyền'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignStaffModal;
