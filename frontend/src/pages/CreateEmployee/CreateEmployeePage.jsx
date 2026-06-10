import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateEmployeePage.module.css';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';

function CreateEmployeePage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        employeeCode: '',
        phone: '',
        email: '',
        dob: '',
        startDate: '',
        idCard: '',
        gender: 'male',
        position: '',
        department: '',
        address: '',
        isAdmin: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        // TODO: Validate and submit logic
        console.log('Saved data:', formData);
        navigate('/users');
    };

    return (
        <div className={styles.page}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a href="/dashboard" className={styles.navLink} onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Tổng quan</a>
                        <a href="/users" className={styles.navLinkActive} onClick={(e) => { e.preventDefault(); navigate('/users'); }}>Người dùng</a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="Tìm kiếm tài nguyên..." />
                    </div>
                    <button className={styles.bellBtn}>
                        <i className="bi bi-bell" />
                        <span className={styles.bellDot}></span>
                    </button>
                    <button className={styles.bellBtn}><i className="bi bi-question-circle"></i></button>
                    <button className={styles.bellBtn}><i className="bi bi-gear"></i></button>
                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.breadcrumb}>
                    <span onClick={() => navigate('/dashboard')}>Bảng điều khiển</span>
                    <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                    <span onClick={() => navigate('/users')}>Quản lý người dùng</span>
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
                                <label className={styles.label}>Mã nhân viên</label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        placeholder="DLC-10024"
                                        name="employeeCode"
                                        value={formData.employeeCode}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Số điện thoại</label>
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
                                <label className={styles.label}>Địa chỉ Email</label>
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
                                <label className={styles.label}>Ngày vào làm việc chính thức</label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="date" 
                                        className={styles.input} 
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Số CCCD <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        placeholder="Ví dụ: 001xxxxxxxx"
                                        name="idCard"
                                        value={formData.idCard}
                                        onChange={handleChange}
                                        required
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
                                    <label className={styles.radioLabel}>
                                        <input type="radio" name="gender" value="other" className={styles.radioInput} checked={formData.gender === 'other'} onChange={handleChange} />
                                        Khác
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Job Info */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-briefcase"></i> Thông tin công việc
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
                                        <option value="accountant">Kế toán</option>
                                        <option value="sales">Bán hàng</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Phòng ban</label>
                                <div className={styles.inputWrapper}>
                                    <select className={`${styles.input} ${styles.select}`} name="department" value={formData.department} onChange={handleChange}>
                                        <option value="">Chọn phòng ban</option>
                                        <option value="store">Cửa hàng / Bán hàng</option>
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

                    {/* Card 4: System Access */}
                    <label className={styles.checkboxCard}>
                        <input 
                            type="checkbox" 
                            className={styles.checkboxInput} 
                            name="isAdmin"
                            checked={formData.isAdmin}
                            onChange={handleChange}
                        />
                        <div className={styles.checkboxContent}>
                            <span className={styles.checkboxTitle}>Thiết lập tài khoản quản lý hệ thống</span>
                            <span className={styles.checkboxDesc}>Cho phép nhân viên này truy cập vào các tính năng quản trị và cổng thông tin.</span>
                        </div>
                    </label>
                    
                    <div className={styles.securityNote}>
                        <i className="bi bi-lock"></i> Mọi dữ liệu cá nhân được lưu trữ theo giao thức bảo mật và quy định hiện hành của Duy Long Computer.
                    </div>
                </form>
            </main>

            {/* Sticky Actions Bar */}
            <div className={styles.actionsBar}>
                <div className={styles.actionsContainer}>
                    <button type="button" className={styles.btnCancel} onClick={() => navigate('/users')}>
                        Hủy bỏ
                    </button>
                    <button type="button" className={styles.btnSave} onClick={handleSave}>
                        <i className="bi bi-save"></i> Lưu người dùng
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateEmployeePage;
