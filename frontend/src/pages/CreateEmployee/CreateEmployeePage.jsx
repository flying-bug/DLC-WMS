import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import styles from './CreateEmployeePage.module.css';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';

function CreateEmployeePage() {
    const navigate = useNavigate();
    const [submitError, setSubmitError] = useState('');
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
        isAdmin: false
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
        setSubmitError('');
        
        if (!formData.username.trim()) {
            setSubmitError('Vui lÃ²ng nháº­p TÃªn Ä‘Äƒng nháº­p (Username).');
            return;
        }
        if (!formData.fullName.trim()) {
            setSubmitError('Vui lÃ²ng nháº­p Há» vÃ  tÃªn.');
            return;
        }
        if (!formData.phone.trim()) {
            setSubmitError('Vui lÃ²ng nháº­p Sá»‘ Ä‘iá»‡n thoáº¡i.');
            return;
        }
        if (!formData.email.trim()) {
            setSubmitError('Vui lÃ²ng nháº­p Äá»‹a chá»‰ Email.');
            return;
        }
        if (!formData.idCard.trim()) {
            setSubmitError('Vui lÃ²ng nháº­p Sá»‘ CCCD.');
            return;
        }

        try {
            setIsSaving(true);
            const roles = formData.isAdmin ? ['SUPER_ADMIN'] : ['STAFF'];
            const payload = {
                username: formData.username.trim(),
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.replace(/[\s.-]/g, ''),
                idCard: formData.idCard.trim(),
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
            navigate('/users');
        } catch (error) {
            console.error('Lá»—i khi lÆ°u nhÃ¢n viÃªn:', error);
            setSubmitError(
                error.response?.data?.userMessage ||
                error.response?.data?.message ||
                error.response?.data?.devMessage ||
                'CÃ³ lá»—i xáº£y ra khi táº¡o tÃ i khoáº£n nhÃ¢n viÃªn.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a href="/dashboard" className={styles.navLink} onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Tá»•ng quan</a>
                        <a href="/users" className={styles.navLinkActive} onClick={(e) => { e.preventDefault(); navigate('/users'); }}>NgÆ°á»i dÃ¹ng</a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="TÃ¬m kiáº¿m tÃ i nguyÃªn..." />
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
                    <span onClick={() => navigate('/dashboard')}>Báº£ng Ä‘iá»u khiá»ƒn</span>
                    <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                    <span onClick={() => navigate('/users')}>Quáº£n lÃ½ ngÆ°á»i dÃ¹ng</span>
                    <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                    <span className={styles.active}>ThÃªm ngÆ°á»i dÃ¹ng má»›i</span>
                </div>

                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>ThÃªm NhÃ¢n ViÃªn Má»›i</h1>
                    <p className={styles.pageSubtitle}>Vui lÃ²ng hoÃ n thÃ nh biá»ƒu máº«u dÆ°á»›i Ä‘Ã¢y Ä‘á»ƒ táº¡o há»“ sÆ¡ nhÃ¢n viÃªn má»›i trong há»‡ thá»‘ng.</p>
                </div>

                {submitError && (
                    <div className={styles.errorBanner} role="alert">
                        <i className="bi bi-exclamation-triangle"></i>
                        <span>{submitError}</span>
                    </div>
                )}

                <form className={styles.formContainer} onSubmit={handleSave}>
                    {/* Card 1: Personal Info */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-person-lines-fill"></i> ThÃ´ng tin cÃ¡ nhÃ¢n
                        </h2>
                        
                        <div className={styles.grid2}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Há» vÃ  tÃªn <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        placeholder="VÃ­ dá»¥: Nguyá»…n VÄƒn A"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>TÃªn Ä‘Äƒng nháº­p (Username) <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        placeholder="VÃ­ dá»¥: nva_staff"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Sá»‘ Ä‘iá»‡n thoáº¡i <span className={styles.required}>*</span></label>
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
                                <label className={styles.label}>Äá»‹a chá»‰ Email <span className={styles.required}>*</span></label>
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
                                <label className={styles.label}>NgÃ y sinh</label>
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
                                <label className={styles.label}>NgÃ y vÃ o lÃ m viá»‡c chÃ­nh thá»©c</label>
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
                                <label className={styles.label}>Sá»‘ CCCD <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        placeholder="VÃ­ dá»¥: 001xxxxxxxx"
                                        name="idCard"
                                        value={formData.idCard}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Giá»›i tÃ­nh</label>
                                <div className={styles.radioGroup}>
                                    <label className={styles.radioLabel}>
                                        <input type="radio" name="gender" value="male" className={styles.radioInput} checked={formData.gender === 'male'} onChange={handleChange} />
                                        Nam
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input type="radio" name="gender" value="female" className={styles.radioInput} checked={formData.gender === 'female'} onChange={handleChange} />
                                        Ná»¯
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input type="radio" name="gender" value="other" className={styles.radioInput} checked={formData.gender === 'other'} onChange={handleChange} />
                                        KhÃ¡c
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Job Info */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-briefcase"></i> ThÃ´ng tin cÃ´ng viá»‡c
                        </h2>
                        <div className={styles.grid2}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Chá»©c danh nhÃ¢n sá»±</label>
                                <div className={styles.inputWrapper}>
                                    <select className={`${styles.input} ${styles.select}`} name="position" value={formData.position} onChange={handleChange}>
                                        <option value="">Chá»n chá»©c danh</option>
                                        <option value="manager">Quáº£n lÃ½ kho</option>
                                        <option value="staff">NhÃ¢n viÃªn kho</option>
                                        <option value="technician">Ká»¹ thuáº­t viÃªn</option>
                                        <option value="accountant">Káº¿ toÃ¡n</option>
                                        <option value="sales">BÃ¡n hÃ ng</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>PhÃ²ng ban</label>
                                <div className={styles.inputWrapper}>
                                    <select className={`${styles.input} ${styles.select}`} name="department" value={formData.department} onChange={handleChange}>
                                        <option value="">Chá»n phÃ²ng ban</option>
                                        <option value="store">Cá»­a hÃ ng / BÃ¡n hÃ ng</option>
                                        <option value="warehouse">Kho bÃ£i</option>
                                        <option value="technical">Ká»¹ thuáº­t - Báº£o hÃ nh</option>
                                        <option value="admin">Káº¿ toÃ¡n - HÃ nh chÃ­nh</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Address */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-geo-alt"></i> Äá»‹a chá»‰
                        </h2>
                        <div className={styles.grid1}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Äá»‹a chá»‰ thÆ°á»ng trÃº</label>
                                <div className={styles.inputWrapper}>
                                    <i className={`bi bi-house ${styles.inputIcon}`}></i>
                                    <input 
                                        type="text" 
                                        className={`${styles.input} ${styles.inputWithIcon}`} 
                                        placeholder="Nháº­p Ä‘á»‹a chá»‰ Ä‘áº§y Ä‘á»§ (Sá»‘ nhÃ , Ä‘Æ°á»ng, phÆ°á»ng/xÃ£...)"
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
                            <span className={styles.checkboxTitle}>Thiáº¿t láº­p tÃ i khoáº£n quáº£n lÃ½ há»‡ thá»‘ng (Super Admin)</span>
                            <span className={styles.checkboxDesc}>Cho phÃ©p nhÃ¢n viÃªn nÃ y cÃ³ toÃ n quyá»n quáº£n trá»‹ há»‡ thá»‘ng Duy Long Computer.</span>
                        </div>
                    </label>
                    
                    <div className={styles.securityNote}>
                        <i className="bi bi-lock"></i> Má»i dá»¯ liá»‡u cÃ¡ nhÃ¢n Ä‘Æ°á»£c lÆ°u trá»¯ theo giao thá»©c báº£o máº­t vÃ  quy Ä‘á»‹nh hiá»‡n hÃ nh cá»§a Duy Long Computer.
                    </div>
                </form>
            </main>

            {/* Sticky Actions Bar */}
            <div className={styles.actionsBar}>
                <div className={styles.actionsContainer}>
                    <button type="button" className={styles.btnCancel} onClick={() => navigate('/users')}>
                        Há»§y bá»
                    </button>
                    <button type="button" className={styles.btnSave} onClick={handleSave} disabled={isSaving}>
                        <i className="bi bi-save"></i> {isSaving ? 'Äang lÆ°u...' : 'LÆ°u ngÆ°á»i dÃ¹ng'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateEmployeePage;
