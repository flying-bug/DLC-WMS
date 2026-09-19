import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useGoBack from '../../hooks/useGoBack';
import axiosClient from '../../api/axiosClient';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import { useToast } from '../../contexts/ToastContext';
import { ROLE_OPTIONS, normalizeRoleCode } from '../../utils/roleOptions';
import {
    PERMISSION_CATEGORIES,
    PERMISSION_ACTIONS,
    buildPermissionsFromCodes,
    extractCodesFromPermissions
} from '../../utils/permissionMatrixConfig';
import styles from './RolePermissionsPage.module.css';

function RolePermissionsPage() {
    const navigate = useNavigate();
    const goBack = useGoBack('/users');
    const { showToast } = useToast();

    const [roles, setRoles] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('warehouse');
    const [permissions, setPermissions] = useState(() => buildPermissionsFromCodes([]));
    const [initialCodes, setInitialCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // Fetch roles from backend
    const fetchRoles = useCallback(async (selectId = null) => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/roles');
            const data = res.data?.data || [];
            setRoles(data);

            if (data.length > 0) {
                // Keep current selected role or default to first
                const targetRole = selectId
                    ? data.find(r => r.id === selectId) || data[0]
                    : data[0];
                setSelectedRoleId(targetRole.id);
                const currentCodes = (targetRole.permissions || []).map(p => p.code);
                setInitialCodes(currentCodes);
                setPermissions(buildPermissionsFromCodes(currentCodes));
            }
        } catch (err) {
            console.error('Lỗi khi tải danh sách vai trò:', err);
            showToast('error', 'Không thể tải danh sách vai trò hệ thống.');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    // Current selected role object
    const selectedRole = useMemo(() => {
        return roles.find(r => r.id === selectedRoleId) || null;
    }, [roles, selectedRoleId]);

    // Check for unsaved changes
    const currentCodes = useMemo(() => {
        return extractCodesFromPermissions(permissions);
    }, [permissions]);

    const hasUnsavedChanges = useMemo(() => {
        if (!initialCodes) return false;
        const setA = new Set(initialCodes);
        const setB = new Set(currentCodes);
        if (setA.size !== setB.size) return true;
        for (const code of setA) {
            if (!setB.has(code)) return true;
        }
        return false;
    }, [initialCodes, currentCodes]);

    // Role selection handler
    const handleSelectRole = (role) => {
        if (role.id === selectedRoleId) return;
        if (hasUnsavedChanges) {
            const confirmLeave = window.confirm(
                'Bạn có thay đổi phân quyền chưa lưu. Bạn có chắc muốn chuyển sang vai trò khác không?'
            );
            if (!confirmLeave) return;
        }

        setSelectedRoleId(role.id);
        const codes = (role.permissions || []).map(p => p.code);
        setInitialCodes(codes);
        setPermissions(buildPermissionsFromCodes(codes));
    };

    // Checkbox toggle handler
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

    // Save permissions
    const handleSave = async () => {
        if (!selectedRoleId) return;
        try {
            setSaving(true);
            const tickedCodes = extractCodesFromPermissions(permissions);
            const res = await axiosClient.put(`/roles/${selectedRoleId}/permissions`, tickedCodes);
            const updatedRole = res.data?.data;

            // Update in local roles array
            setRoles(prev => prev.map(r => (r.id === selectedRoleId ? updatedRole : r)));
            const newCodes = (updatedRole.permissions || []).map(p => p.code);
            setInitialCodes(newCodes);
            setPermissions(buildPermissionsFromCodes(newCodes));

            showToast('success', `Đã lưu phân quyền cho vai trò "${selectedRole?.name || ''}" thành công.`);
        } catch (err) {
            console.error('Lỗi khi lưu phân quyền vai trò:', err);
            showToast('error', 'Lưu phân quyền vai trò thất bại. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    // Cancel / Discard changes
    const handleCancel = () => {
        if (initialCodes) {
            setPermissions(buildPermissionsFromCodes(initialCodes));
            showToast('info', 'Đã hủy các thay đổi chưa lưu.');
        }
    };

    // Reset role to default permissions
    const handleConfirmReset = async () => {
        if (!selectedRoleId) return;
        try {
            setSaving(true);
            const res = await axiosClient.post(`/roles/${selectedRoleId}/permissions/reset`);
            const resetRole = res.data?.data;

            setRoles(prev => prev.map(r => (r.id === selectedRoleId ? resetRole : r)));
            const newCodes = (resetRole.permissions || []).map(p => p.code);
            setInitialCodes(newCodes);
            setPermissions(buildPermissionsFromCodes(newCodes));

            showToast('success', `Đã khôi phục bộ quyền mặc định cho vai trò "${selectedRole?.name || ''}".`);
            setIsResetModalOpen(false);
        } catch (err) {
            console.error('Lỗi khi khôi phục quyền mặc định:', err);
            showToast('error', 'Khôi phục quyền mặc định thất bại.');
        } finally {
            setSaving(false);
        }
    };

    // Active category object
    const currentCategoryObj = useMemo(() => {
        return PERMISSION_CATEGORIES.find(c => c.key === activeCategory) || PERMISSION_CATEGORIES[0];
    }, [activeCategory]);

    // Checkbox renderer
    const renderCheckbox = (moduleKey, actionKey, featureName) => {
        if (permissions[moduleKey]?.[actionKey] === undefined) {
            return (
                <label className={styles.checkboxTarget}>
                    <input
                        type="checkbox"
                        className={styles.checkbox}
                        disabled
                        aria-label={`${actionKey} cho ${featureName} không khả dụng`}
                    />
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

    return (
        <SuperAdminLayout>
            <div className={styles.page}>
                <div className={styles.main}>
                    {/* Breadcrumb */}
                    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                        <button type="button" className={styles.breadcrumbItem} onClick={() => navigate('/users')}>
                            Quản lý người dùng
                        </button>
                        <span className={styles.breadcrumbSeparator}>
                            <i className="bi bi-chevron-right" aria-hidden="true" />
                        </span>
                        <span className={styles.breadcrumbActive}>Phân quyền theo vai trò</span>
                    </nav>

                    {/* Page Header */}
                    <div className={styles.pageHeader}>
                        <div>
                            <h1 className={styles.pageTitle}>Cấu hình Phân quyền theo Vai trò</h1>
                            <p className={styles.pageSubtitle}>
                                Thiết lập các quyền chức năng cho từng vai trò trong hệ thống. Nhân viên giữ vai trò sẽ tự động được cấp các quyền tương ứng.
                            </p>
                        </div>
                    </div>

                    {/* Role Selector Grid */}
                    <div className={styles.roleSelectorGrid}>
                        {roles.map(role => {
                            const normalized = normalizeRoleCode(role.code);
                            const opt = ROLE_OPTIONS.find(o => o.value === normalized) || {};
                            const isSelected = role.id === selectedRoleId;
                            const permCount = role.permissions ? role.permissions.length : 0;

                            return (
                                <button
                                    key={role.id}
                                    type="button"
                                    className={`${styles.roleCard} ${isSelected ? styles.roleCardActive : ''}`}
                                    onClick={() => handleSelectRole(role)}
                                    aria-pressed={isSelected}
                                >
                                    <div className={styles.roleCardHeader}>
                                        <div className={styles.roleCardIcon}>
                                            <i className={`bi ${opt.icon || 'bi-shield'}`} />
                                        </div>
                                        <span className={styles.roleBadge}>{permCount} quyền</span>
                                    </div>
                                    <div className={styles.roleCardName}>{role.name}</div>
                                    <div className={styles.roleCardDesc}>{role.description || opt.desc || role.code}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Multi-role Notice Banner */}
                    <div className={styles.infoBanner}>
                        <i className="bi bi-info-circle-fill" aria-hidden="true" />
                        <div>
                            <strong>Cơ chế Gộp quyền Đa vai trò (Multi-Role):</strong> Một nhân viên có thể được gán cùng lúc nhiều vai trò (ví dụ: vừa <em>Thủ kho</em> vừa <em>Kế toán</em>). Hệ thống sẽ tự động <strong>gộp (union) toàn bộ quyền</strong> của tất cả các vai trò được tick, cho phép nhân viên thực hiện đầy đủ công việc của cả 2 vị trí.
                        </div>
                    </div>

                    {/* Layout: Sidebar + Matrix */}
                    <div className={styles.layout}>
                        {/* Sidebar: Categories */}
                        <nav className={styles.sidebar} aria-label="Danh mục module">
                            <div className={styles.sidebarHeader}>DANH MỤC MODULE</div>
                            {PERMISSION_CATEGORIES.map(cat => {
                                const isActive = activeCategory === cat.key;
                                return (
                                    <button
                                        key={cat.key}
                                        type="button"
                                        aria-pressed={isActive}
                                        className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                                        onClick={() => setActiveCategory(cat.key)}
                                    >
                                        <div className={styles.menuItemLeft}>
                                            <i className={`bi ${cat.icon}`} /> {cat.name}
                                        </div>
                                        <i className="bi bi-chevron-right" style={{ fontSize: '12px' }} />
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Matrix Content */}
                        <div className={styles.matrixPanel}>
                            <div className={styles.matrixContent}>
                                <ResponsiveTable
                                    columns={[
                                        {
                                            title: `CHỨC NĂNG (${currentCategoryObj.name})`,
                                            render: (_, mod) => (
                                                <div className={styles.featureName}>
                                                    <div className={styles.featureIcon}>
                                                        <i className={`bi ${mod.icon}`} />
                                                    </div>
                                                    <span>{mod.name}</span>
                                                </div>
                                            )
                                        },
                                        ...PERMISSION_ACTIONS.map(action => ({
                                            title: action.label.toUpperCase(),
                                            align: 'center',
                                            render: (_, mod) => renderCheckbox(mod.key, action.key, mod.name)
                                        }))
                                    ]}
                                    data={currentCategoryObj.modules}
                                    keyField="key"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions Bar */}
                <footer className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <button
                            type="button"
                            className="btnDefault"
                            onClick={goBack}
                        >
                            <i className="bi bi-arrow-left" /> Quay lại danh sách nhân viên
                        </button>
                        {hasUnsavedChanges && (
                            <span className={styles.unsavedBadge}>
                                <i className="bi bi-exclamation-circle-fill" /> Có thay đổi chưa lưu
                            </span>
                        )}
                    </div>
                    <div className={styles.footerRight}>
                        <button
                            type="button"
                            className="btnDefault"
                            disabled={saving}
                            onClick={() => setIsResetModalOpen(true)}
                        >
                            <i className="bi bi-arrow-counterclockwise" /> Khôi phục mặc định
                        </button>
                        <button
                            type="button"
                            className="btnDefault"
                            disabled={!hasUnsavedChanges || saving}
                            onClick={handleCancel}
                        >
                            Hủy thay đổi
                        </button>
                        <button
                            type="button"
                            className="btnPrimary"
                            disabled={!hasUnsavedChanges || saving}
                            onClick={handleSave}
                        >
                            {saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2-circle" /> Lưu phân quyền vai trò
                                </>
                            )}
                        </button>
                    </div>
                </footer>

                {/* Reset Confirmation Modal */}
                {isResetModalOpen && (
                    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
                        <div className={styles.modalContent}>
                            <div className={styles.modalHeader}>
                                <div className={styles.modalIconWarn}>
                                    <i className="bi bi-exclamation-triangle" />
                                </div>
                                <h3 className={styles.modalTitle}>Khôi phục quyền mặc định?</h3>
                            </div>
                            <div className={styles.modalBody}>
                                Bạn có chắc chắn muốn khôi phục bộ quyền ban đầu của vai trò <strong>{selectedRole?.name}</strong> không? Các tùy chỉnh quyền trước đó sẽ bị ghi đè theo cấu hình chuẩn của hệ thống.
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className="btnDefault"
                                    disabled={saving}
                                    onClick={() => setIsResetModalOpen(false)}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="button"
                                    className="btnPrimary"
                                    disabled={saving}
                                    onClick={handleConfirmReset}
                                >
                                    {saving ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}

export default RolePermissionsPage;
