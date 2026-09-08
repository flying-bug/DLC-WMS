import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './CreateEmployeePage.module.css';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { useToast } from '../../contexts/ToastContext';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const parseDisplayDateToIso = (value) => {
    const text = String(value || '').trim();
    if (!text) return null;
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (
        date.getFullYear() !== Number(year) ||
        date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day)
    ) {
        return null;
    }
    return `${year}-${month}-${day}`;
};

const ROLE_OPTIONS = [
    { value: 'ROLE_WAREHOUSE_CONTROLLER', label: 'Thủ kho (Warehouse Controller)', icon: 'bi-box-seam', desc: 'Nhập / Xuất / Chuyển kho / Kiểm kê, Quét mã Scanner' },
    { value: 'ROLE_TECHNICIAN', label: 'Kỹ thuật viên (Technician)', icon: 'bi-tools', desc: 'Lắp ráp PC theo BOM, Tiếp nhận Bảo hành & Sửa chữa' },
    { value: 'ROLE_ACCOUNTANT', label: 'Kế toán (Accountant)', icon: 'bi-receipt', desc: 'Phiếu nhập dự kiến, Đơn bán SO, Hóa đơn & Công nợ' },
    { value: 'ROLE_CASHIER_CONTROLLER', label: 'Thủ quỹ / Thu ngân (Cashier Controller)', icon: 'bi-cash-stack', desc: 'Lập Phiếu thu, Phiếu chi, Quản lý quỹ tiền mặt' },
    { value: 'ROLE_MANAGER', label: 'Quản lý điều hành (Manager)', icon: 'bi-person-badge', desc: 'Toàn quyền nghiệp vụ, phê duyệt đơn, xem Dashboard' },
    { value: 'ROLE_SUPER_ADMIN', label: 'Quản trị hệ thống (Super Admin)', icon: 'bi-shield-lock', desc: 'Quản lý tài khoản, Phân quyền ma trận, Backup CSDL' }
];

function CreateEmployeePage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState(['ROLE_WAREHOUSE_CONTROLLER']);
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        phone: '',
        email: '',
        dob: '',
        startDate: '',
        idCard: '',
        gender: 'male',
        address: ''
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleRole = (roleValue) => {
        setSelectedRoles(prev => {
            if (prev.includes(roleValue)) {
                if (prev.length === 1) {
                    showToast('warning', 'Tài khoản phải có ít nhất 1 vai trò.');
                    return prev;
                }
                return prev.filter(r => r !== roleValue);
            } else {
                return [...prev, roleValue];
            }
        });
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (!formData.username.trim()) {
            showToast('warning', 'Vui lòng nhập Tên đăng nhập (Username).');
            return;
        }
        if (!formData.fullName.trim()) {
            showToast('warning', 'Vui lòng nhập Họ và tên.');
            return;
        }
        if (!formData.phone.trim()) {
            showToast('warning', 'Vui lòng nhập Số điện thoại.');
            return;
        }
        if (!formData.email.trim()) {
            showToast('warning', 'Vui lòng nhập Địa chỉ Email.');
            return;
        }
        if (formData.idCard.trim()) {
            const cleanIdCard = formData.idCard.trim();
            if (!/^\d{9}$|^\d{12}$/.test(cleanIdCard)) {
                showToast('warning', 'Số CCCD/CMND không hợp lệ (phải gồm đúng 9 hoặc 12 chữ số).');
                return;
            }
        }
        const dob = formData.dob ? formData.dob : null;
        if (dob && new Date(dob) > new Date()) {
            showToast('warning', 'Ngày sinh không thể lớn hơn ngày hiện tại.');
            return;
        }
        if (!selectedRoles || selectedRoles.length === 0) {
            showToast('warning', 'Vui lòng chọn ít nhất 1 vai trò cho nhân viên.');
            return;
        }

        try {
            setIsSaving(true);
            const primaryRoleObj = ROLE_OPTIONS.find(r => r.value === selectedRoles[0]);
            const primaryRoleLabel = primaryRoleObj ? primaryRoleObj.label.split(' (')[0] : 'Nhân viên';

            const payload = {
                username: formData.username.trim(),
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.replace(/[\s.-]/g, ''),
                idCard: formData.idCard.trim() || 'Chưa cập nhật',
                dob,
                startDate: formData.startDate || null,
                gender: formData.gender,
                position: primaryRoleLabel,
                department: primaryRoleLabel,
                address: formData.address.trim(),
                status: 'APPROVED',
                roles: selectedRoles
            };

            await axiosClient.post('/users', payload);
            showToast('success', 'Thêm mới thành công.');
            setTimeout(() => {
                navigate('/users');
            }, 1500);
        } catch (error) {
            console.error('Lỗi khi lưu nhân viên:', error);
            let msg = error.response?.data?.userMessage ||
                error.response?.data?.message ||
                error.response?.data?.devMessage ||
                'Thao tác thất bại.';

            if (msg.includes(';')) {
                msg = msg.split(';').map(s => `• ${s.trim()}`).filter(s => s !== '•').join('\n');
            }
            showToast('error', msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SuperAdminLayout>
            <div className={styles.page}>
            {/* Main Content */}
            <div className={styles.main}>
                <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                    <button type="button" className={styles.breadcrumbLink} onClick={() => navigate('/users')}>Quản lý người dùng</button>
                    <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                    <span className={styles.active}>Thêm người dùng mới</span>
                </nav>

                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Thêm Nhân Viên Mới</h1>
                    <p className={styles.pageSubtitle}>Vui lòng hoàn thành biểu mẫu dưới đây để tạo hồ sơ nhân viên mới trong hệ thống.</p>
                </div>

                <form className={styles.formContainer} onSubmit={handleSave}>
                    {/* Card 1: Personal Info */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-person-lines-fill"></i> Thông tin cá nhân
                        </h2>

                        <div className={styles.grid2}>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="fullName">Họ và tên <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        id="fullName"
                                        className={styles.input}
                                        placeholder="Ví dụ: Nguyễn Văn A"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="username">Tên đăng nhập <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        id="username"
                                        className={styles.input}
                                        placeholder="Ví dụ: nva_staff"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="phone">Số điện thoại <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <i className={`bi bi-telephone ${styles.inputIcon}`}></i>
                                    <input
                                        type="tel"
                                        id="phone"
                                        className={`${styles.input} ${styles.inputWithIcon}`}
                                        placeholder="090x xxx xxx"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="email">Địa chỉ Email <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <i className={`bi bi-envelope ${styles.inputIcon}`}></i>
                                    <input
                                        type="email"
                                        id="email"
                                        className={`${styles.input} ${styles.inputWithIcon}`}
                                        placeholder="email@duylongcomputer.com"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="dob">Ngày sinh</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="date"
                                        id="dob"
                                        className={styles.input}
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="idCard">Số CCCD / CMND</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        id="idCard"
                                        className={styles.input}
                                        placeholder="Nhập 9 hoặc 12 số CCCD..."
                                        name="idCard"
                                        maxLength={12}
                                        value={formData.idCard}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                                            setFormData(prev => ({ ...prev, idCard: val }));
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Giới tính</label>
                                <div className={styles.radioGroup}>
                                    <label className={styles.radioLabel}>
                                        <input id="gender-male" type="radio" name="gender" value="male" className={styles.radioInput} checked={formData.gender === 'male'} onChange={handleChange} />
                                        Nam
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input id="gender-female" type="radio" name="gender" value="female" className={styles.radioInput} checked={formData.gender === 'female'} onChange={handleChange} />
                                        Nữ
                                    </label>
                                </div>
                            </div>

                            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                <label className={styles.label} htmlFor="address">Địa chỉ thường trú</label>
                                <div className={styles.inputWrapper}>
                                    <i className={`bi bi-house ${styles.inputIcon}`}></i>
                                    <input
                                        type="text"
                                        id="address"
                                        className={`${styles.input} ${styles.inputWithIcon}`}
                                        placeholder="Nhập địa chỉ đầy đủ (Số nhà, đường, phường/xã, quận/huyện...)"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Roles */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-shield-check"></i> Vai trò & Quyền hạn hệ thống
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                            Chọn một hoặc nhiều vai trò cho tài khoản. Hệ thống sẽ tự động gộp các quyền tương ứng.
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {ROLE_OPTIONS.map(role => {
                                const isChecked = selectedRoles.includes(role.value);
                                return (
                                    <div
                                        key={role.value}
                                        onClick={() => toggleRole(role.value)}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            border: `1.5px solid ${isChecked ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #e2e8f0)'}`,
                                            background: isChecked ? 'rgba(59, 130, 246, 0.06)' : 'var(--color-surface, #fff)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {}} // Handled by div onClick
                                            style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-primary, #3b82f6)' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: isChecked ? 'var(--color-primary, #1d4ed8)' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <i className={`bi ${role.icon}`}></i> {role.label}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)', marginTop: '4px', lineHeight: 1.4 }}>
                                                {role.desc}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.securityNote}>
                        <i className="bi bi-lock"></i> Mọi dữ liệu cá nhân được lưu trữ theo giao thức bảo mật và quy định hiện hành của Duy Long Computer.
                    </div>
                </form>

                {/* Sticky Actions Bar */}
                <div className={styles.actionsBar}>
                    <div className={styles.actionsContainer}>
                        <button type="button" className="btnDefault" onClick={() => navigate('/users')}>
                            Hủy bỏ
                        </button>
                        <button type="button" className="btnPrimary" onClick={handleSave} disabled={isSaving}>
                            <i className="bi bi-save"></i> {isSaving ? 'Đang lưu...' : 'Lưu người dùng'}
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </SuperAdminLayout>
    );
}

export default CreateEmployeePage;
