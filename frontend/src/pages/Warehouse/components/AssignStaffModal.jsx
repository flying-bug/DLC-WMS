import { useState, useEffect, useRef } from 'react';
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
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const searchUsers = async (keyword) => {
        setIsSearching(true);
        try {
            const res = await axiosClient.get('/users/search', { params: { keyword } });
            setUsers(res.data.data || []);
            setShowDropdown(true);
        } catch (err) {
            console.error('Lỗi tìm kiếm user:', err);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 2 && !userId) {
                searchUsers(searchTerm);
            } else {
                setUsers([]);
                setShowDropdown(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, userId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const handleSelectUser = (u) => {
        setUserId(u.id);
        setSearchTerm(`${u.fullName} (${u.username})`);
        setUsers([]);
        setShowDropdown(false);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Thêm Nhân Sự Kho</h2>
                    <button className={styles.modalClose} onClick={onClose} type="button">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div className={styles.modalBody}>
                        {error && <div className={styles.modalError}>{error}</div>}
                        
                        <div className={styles.formField} ref={dropdownRef}>
                            <label className={styles.fieldLabel}>
                                Chọn nhân viên <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            
                            {!userId ? (
                                <>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="text" 
                                            className={styles.fieldInput}
                                            placeholder="Nhập tên, username hoặc số điện thoại để tìm..." 
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => {
                                                if (users.length > 0) setShowDropdown(true);
                                            }}
                                        />
                                        {isSearching && (
                                            <i className="fas fa-spinner fa-spin" style={{ position: 'absolute', right: '12px', top: '10px', color: '#9ca3af' }}></i>
                                        )}
                                    </div>
                                    
                                    {showDropdown && users.length > 0 && (
                                        <ul className={styles.userDropdown}>
                                            {users.map(u => (
                                                <li key={u.id} onClick={() => handleSelectUser(u)}>
                                                    <div style={{ fontWeight: 500, color: '#111827' }}>{u.fullName} <span style={{ color: '#6b7280', fontWeight: 'normal' }}>({u.username})</span></div>
                                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{u.email || u.phone}</div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {showDropdown && searchTerm.length >= 2 && users.length === 0 && !isSearching && (
                                        <ul className={styles.userDropdown}>
                                            <li style={{ textAlign: 'center', color: '#6b7280', padding: '12px' }}>Không tìm thấy nhân viên nào phù hợp.</li>
                                        </ul>
                                    )}
                                </>
                            ) : (
                                <div className={styles.selectedUser}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fas fa-check-circle"></i>
                                        <span>Đã chọn: <strong>{searchTerm}</strong></span>
                                    </div>
                                    <button type="button" className={styles.changeUserBtn} onClick={() => {
                                        setUserId('');
                                        setSearchTerm('');
                                        setUsers([]);
                                    }}>
                                        Thay đổi
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={styles.formField}>
                            <label className={styles.fieldLabel}>
                                Vai trò
                            </label>
                            <div className={styles.rolesGrid}>
                                {roles.length > 0 ? (
                                    roles.map(role => {
                                        const isSelected = selectedRoleIds.includes(role.id);
                                        return (
                                            <label key={role.id} className={`${styles.roleItem} ${isSelected ? styles.roleItemActive : ''}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => handleRoleToggle(role.id)}
                                                />
                                                <div className={styles.roleInfo}>
                                                    <span className={styles.roleName}>{role.name}</span>
                                                    <span className={styles.roleCode}>{role.code}</span>
                                                </div>
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '16px', color: '#6b7280', fontStyle: 'italic', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px dashed #d1d5db' }}>
                                        Không có vai trò nào khả dụng cho phân hệ Kho. Vui lòng kiểm tra lại cấu hình phân quyền.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnCancel} onClick={onClose} disabled={loading}>
                            Hủy
                        </button>
                        <button type="submit" className={styles.btnSave} disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Xác nhận thêm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignStaffModal;
