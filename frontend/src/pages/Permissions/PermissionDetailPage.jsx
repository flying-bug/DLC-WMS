import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import styles from './PermissionDetailPage.module.css';

function PermissionDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [activeCategory, setActiveCategory] = useState('warehouse');

    // Initial state matching the UC list
    const [permissions, setPermissions] = useState({
        // Quáº£n lÃ½ kho
        import: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        export: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        transfer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        stocktake: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        assembly: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

        // Danh má»¥c
        product: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        product_category: { full: false, view: false, add: false, edit: false, delete: false },
        brand: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        unit: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        customer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        supplier: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        warehouse_master: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

        // BÃ¡o cÃ¡o
        report_balance: { full: false, view: false, export: false },
        report_ledger: { full: false, view: false, export: false },
        report_summary: { full: false, view: false, export: false },

        // Quáº£n trá»‹ há»‡ thá»‘ng
        account: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        auth: { full: false, view: false, edit: false },
        audit: { full: false, view: false, export: false }
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch user
                const userRes = await axiosClient.get(`/users/${id}`);
                const userData = userRes.data?.data;
                setUser(userData);

                // Set initial permission matrix based on saved permissions or roles
                if (userData) {
                    const hasStaff = userData.roles && userData.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF');
                    if (!hasStaff) {
                        alert("Chá»‰ tÃ i khoáº£n NhÃ¢n viÃªn (STAFF) má»›i Ä‘Æ°á»£c phÃ©p phÃ¢n quyá»n Ä‘á»™ng.");
                        navigate('/users');
                        return;
                    }
                    setPermissions(prev => {
                        const newPerms = { ...prev };

                        // 1. If user already has explicit permissions, populate them
                        if (userData.permissions && userData.permissions.length > 0) {
                            userData.permissions.forEach(code => {
                                const [mod, act] = code.split(':');
                                if (newPerms[mod] && newPerms[mod][act] !== undefined) {
                                    newPerms[mod][act] = true;
                                }
                            });
                        } else if (userData.roles) {
                            // 2. Otherwise fallback to default permissions based on roles
                            const hasAdmin = userData.roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN');
                            const hasManager = userData.roles.some(r => r === 'MANAGER' || r === 'ROLE_MANAGER');
                            const hasStaff = userData.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF');

                            if (hasAdmin) {
                                Object.keys(newPerms).forEach(mod => {
                                    Object.keys(newPerms[mod]).forEach(act => {
                                        newPerms[mod][act] = true;
                                    });
                                });
                            } else if (hasManager) {
                                Object.keys(newPerms).forEach(mod => {
                                    const isSystem = ['account', 'auth', 'audit'].includes(mod);
                                    Object.keys(newPerms[mod]).forEach(act => {
                                        newPerms[mod][act] = !isSystem;
                                    });
                                });
                            } else if (hasStaff) {
                                Object.keys(newPerms).forEach(mod => {
                                    const isWarehouse = ['import', 'export', 'transfer', 'stocktake', 'assembly'].includes(mod);
                                    Object.keys(newPerms[mod]).forEach(act => {
                                        newPerms[mod][act] = isWarehouse;
                                    });
                                });
                            }
                        }

                        // For each module, determine if all actions are checked to set 'full' checkbox
                        Object.keys(newPerms).forEach(mod => {
                            const allOthersChecked = Object.keys(newPerms[mod])
                                .filter(key => key !== 'full')
                                .every(key => newPerms[mod][key]);
                            newPerms[mod].full = allOthersChecked;
                        });

                        return newPerms;
                    });
                }
            } catch (error) {
                console.error("Lá»—i láº¥y thÃ´ng tin phÃ¢n quyá»n:", error);
            }
        };

        loadData();
    }, [id, navigate]);

    const handleCheck = (module, action, checked) => {
        setPermissions(prev => {
            const modulePerms = { ...prev[module] };

            if (action === 'full') {
                Object.keys(modulePerms).forEach(key => {
                    modulePerms[key] = checked;
                });
            } else {
                modulePerms[action] = checked;

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

            return { ...prev, [module]: modulePerms };
        });
    };

    const handleSave = async () => {
        try {
            // Compile list of ticked permission codes
            const tickedCodes = [];
            Object.keys(permissions).forEach(mod => {
                Object.keys(permissions[mod]).forEach(act => {
                    // Skip the 'full' helper checkbox
                    if (act !== 'full' && permissions[mod][act]) {
                        tickedCodes.push(`${mod}:${act}`);
                    }
                });
            });

            await axiosClient.put(`/users/${id}/permissions`, tickedCodes);
            alert('Cáº­p nháº­t phÃ¢n quyá»n thÃ nh cÃ´ng!');
            navigate('/users');
        } catch (error) {
            console.error('Lá»—i lÆ°u phÃ¢n quyá»n:', error);
            alert('CÃ³ lá»—i xáº£y ra khi lÆ°u phÃ¢n quyá»n.');
        }
    };

    const renderCheckbox = (module, action) => {
        if (permissions[module][action] === undefined) {
            return <input type="checkbox" className={styles.checkbox} disabled style={{ opacity: 0.3 }} />;
        }
        return (
            <input
                type="checkbox"
                className={styles.checkbox}
                checked={permissions[module][action]}
                onChange={(e) => handleCheck(module, action, e.target.checked)}
            />
        );
    };

    const renderRow = (module, name, icon) => (
        <tr className={styles.tableRow} key={module}>
            <td>
                <div className={styles.featureName}>
                    <div className={styles.featureIcon}><i className={`bi ${icon}`}></i></div>
                    {name}
                </div>
            </td>
            <td>{renderCheckbox(module, 'full')}</td>
            <td>{renderCheckbox(module, 'view')}</td>
            <td>{renderCheckbox(module, 'add')}</td>
            <td>{renderCheckbox(module, 'edit')}</td>
            <td>{renderCheckbox(module, 'delete')}</td>
            <td>{renderCheckbox(module, 'export')}</td>
            <td>{renderCheckbox(module, 'print')}</td>
        </tr>
    );

    const renderTableBody = () => {
        switch(activeCategory) {
            case 'warehouse':
                return (
                    <>
                        {renderRow('warehouse_master', 'Danh má»¥c kho bÃ£i', 'bi-houses')}
                        {renderRow('import', 'Nháº­p kho', 'bi-box-arrow-in-right')}
                        {renderRow('export', 'Xuáº¥t kho', 'bi-box-arrow-right')}
                        {renderRow('transfer', 'Chuyá»ƒn kho', 'bi-arrow-left-right')}
                        {renderRow('stocktake', 'Kiá»ƒm kÃª kho', 'bi-clipboard2-check')}
                        {renderRow('assembly', 'ÄÃ³ng gÃ³i / ThÃ¡o dá»¡', 'bi-box-seam')}
                    </>
                );
            case 'master_data':
                return (
                    <>
                        {renderRow('product', 'Sáº£n pháº©m', 'bi-tags')}
                        {renderRow('product_category', 'Danh má»¥c sáº£n pháº©m', 'bi-folder')}
                        {renderRow('brand', 'ThÆ°Æ¡ng hiá»‡u', 'bi-bookmark-star')}
                        {renderRow('unit', 'ÄÆ¡n vá»‹ tÃ­nh', 'bi-rulers')}
                        {renderRow('customer', 'KhÃ¡ch hÃ ng', 'bi-person-vcard')}
                        {renderRow('supplier', 'NhÃ  cung cáº¥p', 'bi-truck')}
                    </>
                );
            case 'reports':
                return (
                    <>
                        {renderRow('report_balance', 'Tá»“n kho hiá»‡n táº¡i', 'bi-bar-chart')}
                        {renderRow('report_ledger', 'Sá»• kho', 'bi-journal-text')}
                        {renderRow('report_summary', 'BÃ¡o cÃ¡o tá»•ng há»£p', 'bi-file-earmark-bar-graph')}
                    </>
                );
            case 'system':
                return (
                    <>
                        {renderRow('account', 'Quáº£n lÃ½ tÃ i khoáº£n', 'bi-people')}
                        {renderRow('auth', 'PhÃ¢n quyá»n', 'bi-shield-lock')}
                        {renderRow('audit', 'Nháº­t kÃ½ há»‡ thá»‘ng', 'bi-journal-medical')}
                    </>
                );
            default:
                return null;
        }
    };

    const userName = user ? user.fullName : "Äang táº£i...";
    const userRolesDisplay = user && user.roles ? user.roles.join(', ') : 'ChÆ°a cÃ³ vai trÃ²';

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>DUY LONG COMPUTER</div>
                    <div className={styles.breadcrumb}>
                        <span className={styles.breadcrumbItem} onClick={() => navigate('/users')}>Quáº£n lÃ½ ngÆ°á»i dÃ¹ng</span>
                        <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                        <span className={styles.breadcrumbItem}>{userName}</span>
                        <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                        <span className={styles.breadcrumbActive}>PhÃ¢n quyá»n chi tiáº¿t</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="TÃ¬m kiáº¿m chá»©c nÄƒng..." />
                    </div>
                    <button className={styles.headerRightBtn}><i className="bi bi-bell"></i></button>
                    <button className={styles.headerRightBtn}><i className="bi bi-question-circle"></i></button>
                    <UserProfileDropdown />
                </div>
            </header>

            {/* Main */}
            <main className={styles.main}>
                <h1 className={styles.pageTitle}>PhÃ¢n quyá»n chá»©c nÄƒng cho nhÃ¢n viÃªn: {userName}</h1>
                <p className={styles.pageSubtitle}>Vai trÃ² hiá»‡n táº¡i: {userRolesDisplay}</p>

                <div className={styles.layout}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>DANH Má»¤C MODULE</div>
                        <div className={`${styles.menuItem} ${activeCategory === 'warehouse' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('warehouse')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-box-seam"></i> Quáº£n lÃ½ kho</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </div>
                        <div className={`${styles.menuItem} ${activeCategory === 'master_data' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('master_data')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-database"></i> Danh má»¥c</div>
                            {activeCategory === 'master_data' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </div>
                        <div className={`${styles.menuItem} ${activeCategory === 'reports' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('reports')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-bar-chart"></i> BÃ¡o cÃ¡o</div>
                            {activeCategory === 'reports' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </div>
                        <div className={`${styles.menuItem} ${activeCategory === 'system' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('system')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-gear"></i> Quáº£n trá»‹ há»‡ thá»‘ng</div>
                            {activeCategory === 'system' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </div>
                    </div>

                    {/* Matrix Content */}
                    <div className={styles.matrixContent}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>CHá»¨C NÄ‚NG CHI TIáº¾T</th>
                                    <th>ToÃ n quyá»n</th>
                                    <th>Xem</th>
                                    <th>ThÃªm</th>
                                    <th>Sá»­a</th>
                                    <th>XÃ³a</th>
                                    <th>Xuáº¥t Excel</th>
                                    <th>In</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderTableBody()}
                            </tbody>
                        </table>

                        <div className={styles.legend}>
                            <div className={styles.legendLeft}>
                                <div className={styles.legendItem}>
                                    <div className={`${styles.legendIcon} ${styles.legendIconSelected}`}></div>
                                    <span>ÄÃ£ chá»n</span>
                                </div>
                                <div className={styles.legendItem}>
                                    <div className={`${styles.legendIcon} ${styles.legendIconUnselected}`}></div>
                                    <span>ChÆ°a chá»n</span>
                                </div>
                            </div>
                            <div className={styles.legendRight}>
                                <i className="bi bi-info-circle"></i> Äá»‘i vá»›i nghiá»‡p vá»¥ nÃ o khÃ´ng cho sá»­ dá»¥ng sáº½ lÃ m má» vÃ  khÃ´ng thá»ƒ tick
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Actions */}
            <div className={styles.footer}>
                <button className={styles.btnCancel} onClick={() => navigate('/users')}>Há»§y</button>
                <button className={styles.btnSave} onClick={handleSave}>
                    <i className="bi bi-save"></i> LÆ°u thay Ä‘á»•i
                </button>
            </div>
        </div>
    );
}

export default PermissionDetailPage;
