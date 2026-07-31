import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './CreateEmployeePage.module.css';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import { useToast } from '../../contexts/ToastContext';

function CreateEmployeePage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        phone: '',
        email: '',
        dob: '',
        startDate: '',
        idCard: '',
        gender: 'male',
        position: '',
        department: '',
        address: '',
        systemRole: 'staff'
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
        if (formData.idCard.trim() && !/^\d+$/.test(formData.idCard.trim())) {
            showToast('warning', 'Số CCCD/CMND không hợp lệ (chỉ được nhập số).');
            return;
        }

        try {
            setIsSaving(true);
            const roles = formData.systemRole === 'admin' ? ['SUPER_ADMIN'] : ['STAFF'];
            const payload = {
                username: formData.username.trim(),
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.replace(/[\s.-]/g, ''),
                idCard: formData.idCard.trim() || 'Chưa cập nhật',
                dob: formData.dob || null,
                startDate: formData.startDate || null,
                gender: formData.gender,
                position: formData.position,
                department: formData.department,
                address: formData.address.trim(),
                status: 'APPROVED',
                roles: roles
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
        <div className={styles.page}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName} style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a onClick={() => navigate('/users')} className={styles.navLinkActive}>Quản lý người dùng</a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLink}>Nhật ký hệ thống</a>
                        <a onClick={() => navigate('/operations')} className={styles.navLink}>Trung tâm điều hành

                        </a>
                    </nav>
                </div>
                <div className={styles.headerRight}>

                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.breadcrumb}>


                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>Quản lý người dùng</span>
                    <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                    <span className={styles.active}>Thêm người dùng mới</span>
                </div>

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
                                <label className={styles.label}>Họ và tên <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
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
                                <label className={styles.label}>Tên đăng nhập <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
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
                                <label className={styles.label}>Số điện thoại <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <i className={`bi bi-telephone ${styles.inputIcon}`}></i>
                                    <input
                                        type="tel"
                                        className={`${styles.input} ${styles.inputWithIcon}`}
                                        placeholder="090x xxx xxx"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Địa chỉ Email <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <i className={`bi bi-envelope ${styles.inputIcon}`}></i>
                                    <input
                                        type="email"
                                        className={`${styles.input} ${styles.inputWithIcon}`}
                                        placeholder="email@duylongcomputer.com"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Ngày sinh</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>


                            <div className={styles.formGroup}>
                                <label className={styles.label}>Số CCCD</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        name="idCard"
                                        value={formData.idCard}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Giới tính</label>
                                <div className={styles.radioGroup}>
                                    <label className={styles.radioLabel}>
                                        <input type="radio" name="gender" value="male" className={styles.radioInput} checked={formData.gender === 'male'} onChange={handleChange} />
                                        Nam
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input type="radio" name="gender" value="female" className={styles.radioInput} checked={formData.gender === 'female'} onChange={handleChange} />
                                        Nữ
                                    </label>

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Job Info */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-briefcase"></i> Thông tin công việc & Phân quyền
                        </h2>
                        <div className={styles.grid2}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Chức danh nhân sự</label>
                                <div className={styles.inputWrapper}>
                                    <select className={`${styles.input} ${styles.select}`} name="position" value={formData.position} onChange={handleChange}>
                                        <option value="">Chọn chức danh</option>
                                        <option value="manager">Quản lý kho</option>
                                        <option value="staff">Nhân viên kho</option>
                                        <option value="technician">Kỹ thuật viên</option>

                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Phòng ban</label>
                                <div className={styles.inputWrapper}>
                                    <select className={`${styles.input} ${styles.select}`} name="department" value={formData.department} onChange={handleChange}>
                                        <option value="">Chọn phòng ban</option>
                                        <option value="warehouse">Kho bãi</option>
                                        <option value="technical">Kỹ thuật - Bảo hành</option>
                                        <option value="admin">Kế toán - Hành chính</option>
                                    </select>
                                </div>
                            </div>


                        </div>
                    </div>

                    {/* Card 3: Address */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-geo-alt"></i> Địa chỉ
                        </h2>
                        <div className={styles.grid1}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Địa chỉ thường trú</label>
                                <div className={styles.inputWrapper}>
                                    <i className={`bi bi-house ${styles.inputIcon}`}></i>
                                    <input
                                        type="text"
                                        className={`${styles.input} ${styles.inputWithIcon}`}
                                        placeholder="Nhập địa chỉ đầy đủ (Số nhà, đường, phường/xã...)"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
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
            </main>
        </div>
    );
}

export default CreateEmployeePage;
