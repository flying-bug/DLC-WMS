import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useGoBack from '../../hooks/useGoBack';
import axiosClient from '../../api/axiosClient';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { useToast } from '../../contexts/ToastContext';
import { ROLE_OPTIONS, normalizeRoleCode } from '../../utils/roleOptions';
import {
    PERMISSION_CATEGORIES,
    PERMISSION_ACTIONS,
    buildPermissionsFromCodes,
    extractCodesFromPermissions
} from '../../utils/permissionMatrixConfig';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import styles from './RolePermissionsPage.module.css';

function PermissionDetailPage() {
    const navigate = useNavigate();
    const goBack = useGoBack('/users');
    const { id } = useParams();
    const { showToast } = useToast();

    const [user, setUser] = useState(null);
    const [allSystemRoles, setAllSystemRoles] = useState([]);
    const [originalUserRoles, setOriginalUserRoles] = useState([]);
    

    const [permissions, setPermissions] = useState(() => buildPermissionsFromCodes([]));
    
    const [initialCodes, setInitialCodes] = useState([]);
    const [hasCustomPermissions, setHasCustomPermissions] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const userRes = await axiosClient.get(`/users/${id}`);
            const userData = userRes.data?.data;
            setUser(userData);
            
            const rolesRes = await axiosClient.get('/roles');
            const allRoles = rolesRes.data?.data || [];
            setAllSystemRoles(allRoles);

            if (userData) {
                const isSuperAdmin = userData.roles && userData.roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN');
                if (isSuperAdmin) {
                    showToast('warning', "Tài khoản Super Admin có toàn quyền hệ thống mặc định.");
                    setTimeout(() => navigate('/users', { replace: true }), 1500);
                    return;
                }

                setOriginalUserRoles(userData.roles || []);

                // Lấy quyền mặc định của (các) role mà user đang có
                let defaultCodes = [];
                if (userData.roles && userData.roles.length > 0) {
                    const userRoleCodes = new Set(
                        userData.roles.map(r => normalizeRoleCode(r))
                    );
                    const codeSet = new Set();
                    allRoles
                        .filter(r => userRoleCodes.has(normalizeRoleCode(r.code)))
                        .forEach(r => (r.permissions || []).forEach(p => codeSet.add(p.code)));
                    defaultCodes = Array.from(codeSet);
                }

                const hasCustom = userData.permissions && userData.permissions.length > 0;
                setHasCustomPermissions(hasCustom);
                
                const codesToApply = hasCustom ? userData.permissions : defaultCodes;
                setInitialCodes(codesToApply);
                setPermissions(buildPermissionsFromCodes(codesToApply));
            }
        } catch (error) {
            console.error("Lỗi lấy thông tin phân quyền:", error);
            showToast('error', 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const currentCodes = useMemo(() => {
        return extractCodesFromPermissions(permissions);
    }, [permissions]);

    const permissionsChanged = useMemo(() => {
        if (!initialCodes) return false;
        const setA = new Set(initialCodes);
        const setB = new Set(currentCodes);
        if (setA.size !== setB.size) return true;
        for (const code of setA) {
            if (!setB.has(code)) return true;
        }
        return false;
    }, [initialCodes, currentCodes]);
    
    const rolesChanged = useMemo(() => {
        if (!user || !originalUserRoles) return false;
        const currentRoles = user.roles || [];
        if (currentRoles.length !== originalUserRoles.length) return true;
        
        const setA = new Set(originalUserRoles.map(normalizeRoleCode));
        const setB = new Set(currentRoles.map(normalizeRoleCode));
        for (const role of setA) {
            if (!setB.has(role)) return true;
        }
        return false;
    }, [user, originalUserRoles]);

    const hasAnyUnsavedChanges = permissionsChanged || rolesChanged;

    // Trả về tập mã quyền mặc định của 1 role cụ thể (dựa trên dữ liệu role đã tải)
    const getDefaultCodesForRole = (roleCode) => {
        const role = allSystemRoles.find(r => normalizeRoleCode(r.code) === roleCode);
        return new Set((role?.permissions || []).map(p => p.code));
    };

    const handleToggleRole = (roleCode) => {
        if (!user) return;

        const currentRoles = user.roles || [];
        const isCurrentlySelected = currentRoles.some(r => normalizeRoleCode(r) === roleCode);
        const nextRoles = isCurrentlySelected
            ? currentRoles.filter(r => normalizeRoleCode(r) !== roleCode)
            : [...currentRoles, roleCode];

        setUser(prevUser => ({ ...prevUser, roles: nextRoles }));

        // Cập nhật ngay ma trận checkbox đang hiển thị: thêm role -> tick thêm đúng các
        // quyền mặc định của role đó; bỏ role -> chỉ bỏ tick những quyền CHỈ thuộc role vừa
        // gỡ (không đụng tới quyền do role khác đang giữ cấp, hay do admin tự tick tay thêm).
        // Áp dụng luôn cho cả trường hợp nhân viên đã có quyền tùy chỉnh riêng, vì trước đây
        // chỉ cập nhật khi CHƯA có tùy chỉnh khiến chọn thêm/bớt role không thấy hiệu lực gì.
        setPermissions(prevPermissions => {
            const currentCodes = new Set(extractCodesFromPermissions(prevPermissions));
            const toggledRoleCodes = getDefaultCodesForRole(roleCode);

            if (!isCurrentlySelected) {
                toggledRoleCodes.forEach(c => currentCodes.add(c));
            } else {
                const stillCoveredCodes = new Set();
                nextRoles.forEach(r => getDefaultCodesForRole(normalizeRoleCode(r)).forEach(c => stillCoveredCodes.add(c)));
                toggledRoleCodes.forEach(c => {
                    if (!stillCoveredCodes.has(c)) currentCodes.delete(c);
                });
            }

            return buildPermissionsFromCodes(Array.from(currentCodes));
        });
    };

    const handleCheck = (moduleKey, actionKey, checked) => {
        setPermissions(prev => {
            const modulePerms = { ...prev[moduleKey] };

            if (actionKey === 'full') {
                Object.keys(modulePerms).forEach(key => {
                    modulePerms[key] = checked;
                });
            } else {
                modulePerms[actionKey] = checked;
                if (!checked) {
                    modulePerms.full = false;
                } else {
                    const allOthersChecked = Object.keys(modulePerms)
                        .filter(key => key !== 'full')
                        .every(key => modulePerms[key]);
                    if (allOthersChecked) {
                        modulePerms.full = true;
                    }
                }
            }

            return { ...prev, [moduleKey]: modulePerms };
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            if (rolesChanged) {
                await axiosClient.put(`/users/${id}`, {
                    ...user,
                    phone: (user.phone || '').replace(/[\s.-]/g, '')
                });
            }
            
            const tickedCodes = extractCodesFromPermissions(permissions);
            const permissionRes = await axiosClient.put(`/users/${id}/permissions`, tickedCodes);
            const savedCodes = permissionRes.data?.data?.permissions || [];
            setInitialCodes(savedCodes);
            setPermissions(buildPermissionsFromCodes(savedCodes));
            setHasCustomPermissions(savedCodes.length > 0);

            await loadData();
            showToast('success', 'Cập nhật phân quyền thành công.');
        } catch (error) {
            console.error('Lỗi lưu phân quyền:', error);
            showToast('error', 'Thao tác thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (initialCodes) {
            setPermissions(buildPermissionsFromCodes(initialCodes));
        }
        if (user && originalUserRoles) {
            setUser(prev => ({ ...prev, roles: [...originalUserRoles] }));
        }
        showToast('info', 'Đã hủy các thay đổi chưa lưu.');
    };

    const handleConfirmReset = async () => {
        try {
            setSaving(true);
            // Để xóa tùy chỉnh riêng, gửi mảng rỗng
            await axiosClient.put(`/users/${id}/permissions`, []);
            showToast('success', 'Đã xóa tùy chỉnh cá nhân, tài khoản sẽ áp dụng theo quyền của vai trò.');
            setIsResetModalOpen(false);
            
            await loadData();
        } catch (error) {
            console.error('Lỗi xóa tùy chỉnh quyền:', error);
            showToast('error', 'Thao tác thất bại.');
        } finally {
            setSaving(false);
        }
    };

    const filteredCategories = PERMISSION_CATEGORIES;

    const renderCheckbox = (moduleKey, actionKey, featureName) => {
        if (permissions[moduleKey]?.[actionKey] === undefined) {
            return (
                <label className={styles.checkboxTarget}>
                    <input type="checkbox" className={styles.checkbox} disabled aria-label={`${actionKey} cho ${featureName} không khả dụng`} />
                </label>
            );
        }
        return (
            <label className={styles.checkboxTarget}>
                <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={permissions[moduleKey][actionKey]}
                    onChange={(e) => handleCheck(moduleKey, actionKey, e.target.checked)}
                    aria-label={`${actionKey} cho ${featureName}`}
                />
            </label>
        );
    };

    const userName = user ? user.fullName : "Đang tải...";

    return (
        <SuperAdminLayout>
            <div className={styles.page}>
                <div className={styles.main}>
                    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                        <button type="button" className={styles.breadcrumbItem} onClick={() => navigate('/users')}>
                            Quản lý người dùng
                        </button>
                        <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right" /></span>
                        <span className={styles.breadcrumbItem}>{userName}</span>
                        <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right" /></span>
                        <span className={styles.breadcrumbActive}>Phân quyền chi tiết</span>
                    </nav>

                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>Phân quyền chức năng cho nhân viên: {userName}</h1>
                            <p className={styles.pageSubtitle}>
                                Click vào các thẻ bên dưới để gán hoặc gỡ vai trò cho nhân viên này. 
                            </p>
                        </div>
                    </div>
                    
                    {/* Role Selector Grid */}
                    <div className={styles.roleSelectorGrid}>
                        {allSystemRoles.map(role => {
                            const normalized = normalizeRoleCode(role.code);
                            // Hide SUPER ADMIN from normal assignment UI to prevent accidental clicks
                            if (normalized === 'ROLE_SUPER_ADMIN' || normalized === 'SUPER_ADMIN') return null;
                            
                            const opt = ROLE_OPTIONS.find(o => o.value === normalized);
                            // Chỉ hiển thị các role được định nghĩa chính thức trong ROLE_OPTIONS
                            if (!opt) return null;
                            
                            const isSelected = user?.roles?.some(r => normalizeRoleCode(r) === normalized) || false;
                            const permCount = role.permissions ? role.permissions.length : 0;

                            return (
                                <button
                                    key={role.id}
                                    type="button"
                                    className={`${styles.roleCard} ${isSelected ? styles.roleCardActive : ''}`}
                                    onClick={() => handleToggleRole(normalized)}
                                    aria-pressed={isSelected}
                                >
                                    <div className={styles.roleCardHeader}>
                                        <div className={styles.roleCardIcon}>
                                            <i className={`bi ${opt.icon || 'bi-shield'}`} />
                                        </div>
                                        <span className={styles.roleBadge}>{permCount} quyền mặc định</span>
                                    </div>
                                    <div className={styles.roleCardName}>{role.name}</div>
                                    <div className={styles.roleCardDesc}>{role.description || opt.desc || role.code}</div>
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Info Banner */}
                    <div className={styles.infoBanner}>
                        {hasCustomPermissions ? (
                            <>
                                <i className="bi bi-person-gear" style={{ color: '#d97706' }} />
                                <div style={{ color: '#d97706' }}>
                                    <strong>Nhân viên này đang sử dụng quyền tùy chỉnh riêng.</strong> 
                                    {rolesChanged ? " Việc thay đổi vai trò ở trên sẽ được lưu lại, nhưng quyền hạn thao tác (ma trận bên dưới) vẫn đang áp dụng theo bộ quyền tùy chỉnh." 
                                    : " Các quyền mặc định của vai trò đã bị ghi đè. Bạn có thể xóa tùy chỉnh để sử dụng lại quyền mặc định của vai trò."}
                                </div>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-info-circle-fill" />
                                <div>
                                    <strong>Đang áp dụng quyền mặc định của vai trò:</strong> Bất kỳ thay đổi nào bạn thực hiện trên ma trận bên dưới và lưu lại sẽ ghi đè lên quyền mặc định và trở thành quyền tùy chỉnh riêng cho nhân viên này.
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.layout}>
                        <div className={styles.matrixPanel} style={{ width: '100%', marginLeft: 0 }}>
                            <div className={styles.matrixContent}>
                                {filteredCategories.length > 0 ? (
                                    <div style={{ overflowX: 'auto', padding: '0 12px 12px' }}>
                                        <ResponsiveTable
                                            columns={[
                                                {
                                                    title: 'CHỨC NĂNG',
                                                    width: 280,
                                                    render: (_, mod) => (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: 'var(--wms-primary)', fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap' }}>
                                                                <i className={`bi ${mod.categoryIcon} me-1`} /> {mod.categoryName}
                                                            </div>
                                                            <div className={styles.featureName}>
                                                                <div className={styles.featureIcon}>
                                                                    <i className={`bi ${mod.icon}`} />
                                                                </div>
                                                                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{mod.name}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                },
                                                ...PERMISSION_ACTIONS.map(action => ({
                                                    title: action.label.toUpperCase(),
                                                    align: 'center',
                                                    width: 100,
                                                    render: (_, mod) => renderCheckbox(mod.key, action.key, mod.name)
                                                }))
                                            ]}
                                            data={filteredCategories.flatMap(cat => cat.modules.map(mod => ({ ...mod, categoryName: cat.name, categoryIcon: cat.icon })))}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--wms-text-muted)' }}>
                                        <i className="bi bi-shield-lock" style={{ fontSize: '48px', color: '#e2e8f0', marginBottom: '16px', display: 'block' }}></i>
                                        Vui lòng chọn vai trò để xem các chức năng được phép.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <footer className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <button type="button" className="btnDefault" onClick={goBack}>
                            <i className="bi bi-arrow-left" /> Quay lại danh sách
                        </button>
                        {hasAnyUnsavedChanges && (
                            <span className={styles.unsavedBadge}>
                                <i className="bi bi-exclamation-circle-fill" /> Có thay đổi chưa lưu
                            </span>
                        )}
                    </div>
                    <div className={styles.footerRight}>
                        {hasCustomPermissions && (
                            <button type="button" className="btnDefault" disabled={saving} onClick={() => setIsResetModalOpen(true)}>
                                <i className="bi bi-arrow-counterclockwise" /> Dùng quyền theo vai trò (Xóa tùy chỉnh)
                            </button>
                        )}
                        <button type="button" className="btnDefault" disabled={!hasAnyUnsavedChanges || saving} onClick={handleCancel}>
                            Hủy thay đổi
                        </button>
                        <button type="button" className="btnPrimary" disabled={!hasAnyUnsavedChanges || saving} onClick={handleSave}>
                            {saving ? (
                                <><span className="spinner-border spinner-border-sm me-2" role="status" /> Đang lưu...</>
                            ) : (
                                <><i className="bi bi-check2-circle" /> Lưu thay đổi</>
                            )}
                        </button>
                    </div>
                </footer>

                {isResetModalOpen && (
                    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <div className={styles.modalIconWarn}>
                                    <i className="bi bi-exclamation-triangle" />
                                </div>
                                <h3 className={styles.modalTitle}>Xóa tùy chỉnh quyền?</h3>
                            </div>
                            <div className={styles.modalBody}>
                                Bạn có chắc chắn muốn xóa các phân quyền riêng của nhân viên <strong>{userName}</strong> không? Sau khi xóa, nhân viên sẽ sử dụng lại bộ quyền mặc định của các vai trò đang giữ.
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className="btnDefault" disabled={saving} onClick={() => setIsResetModalOpen(false)}>Hủy bỏ</button>
                                <button type="button" className="btnPrimary" disabled={saving} onClick={handleConfirmReset}>{saving ? 'Đang thực hiện...' : 'Xác nhận xóa'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}

export default PermissionDetailPage;
