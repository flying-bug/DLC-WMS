import styles from './UsersPage.module.css';

function UsersPage() {
    return (
        <div className={styles.page}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a href="#" className={styles.navLinkActive}>Quản lý người dùng</a>
                        <a href="#" className={styles.navLink}>Nhật ký hệ thống</a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="Tìm kiếm hệ thống..." />
                    </div>
                    <button className={styles.bellBtn}>
                        <i className="bi bi-bell" />
                        <span className={styles.bellDot}></span>
                    </button>
                    <div className={styles.userInfo}>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>Duy Long Admin</span>
                            <span className={styles.userRole}>QUẢN TRỊ VIÊN</span>
                        </div>
                        <img 
                            src="https://randomuser.me/api/portraits/men/32.jpg" 
                            alt="Admin Avatar" 
                            className={styles.avatarImg} 
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Quản lý tài khoản & Phân quyền</h1>
                        <p className={styles.pageSubtitle}>Quản lý vai trò, quyền hạn và trạng thái của nhân viên Duy Long Computer.</p>
                    </div>
                    <button className={styles.btnAdd}>
                        <i className="bi bi-person-plus" /> Thêm thành viên
                    </button>
                </div>

                {/* Stat Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconBlue}`}><i className="bi bi-people-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>TỔNG NHÂN SỰ</span>
                            <span className={`${styles.statValue} ${styles.textBlue}`}>10</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconGreen}`}><i className="bi bi-person-check-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>ĐANG LÀM VIỆC</span>
                            <span className={`${styles.statValue} ${styles.textGreen}`}>8</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconOrange}`}><i className="bi bi-person-lines-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>CHỜ PHÊ DUYỆT</span>
                            <span className={`${styles.statValue} ${styles.textOrange}`}>1</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconRed}`}><i className="bi bi-person-x-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>NGHỈ VIỆC</span>
                            <span className={`${styles.statValue} ${styles.textRed}`}>1</span>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableToolbar}>
                        <div className={styles.tableSearch}>
                            <i className="bi bi-search" />
                            <input type="text" placeholder="Tìm kiếm theo tên, mã hoặc email..." />
                        </div>
                        <button className={styles.btnFilter}>
                            <i className="bi bi-funnel" /> Bộ lọc
                        </button>
                    </div>

                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>AVATAR</th>
                                <th>HỌ VÀ TÊN</th>
                                <th>MÃ NHÂN VIÊN</th>
                                <th>BỘ PHẬN</th>
                                <th>VAI TRÒ</th>
                                <th>EMAIL</th>
                                <th>TRẠNG THÁI</th>
                                <th>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Row 1 */}
                            <tr>
                                <td><div className={`${styles.avatarCircle} ${styles.bgBlue}`}>AN</div></td>
                                <td><strong>An Nguyễn</strong></td>
                                <td>DLC-2024-001</td>
                                <td>Kế toán</td>
                                <td><span className={`${styles.roleBadge} ${styles.rolePrimary}`}>TRƯỞNG NHÓM</span></td>
                                <td>an.nguyen@duylong.vn</td>
                                <td><span className={`${styles.statusBadge} ${styles.statusActive}`}><i className="bi bi-circle-fill"></i> Đang hoạt động</span></td>
                                <td><button className={styles.btnAction}><i className="bi bi-three-dots-vertical"></i></button></td>
                            </tr>
                            {/* Row 2 */}
                            <tr>
                                <td><div className={`${styles.avatarCircle} ${styles.bgOrange}`}>BT</div></td>
                                <td><strong>Bình Trần</strong></td>
                                <td>DLC-2024-012</td>
                                <td>Kỹ thuật</td>
                                <td><span className={`${styles.roleBadge} ${styles.roleSecondary}`}>NHÂN VIÊN</span></td>
                                <td>binh.tran@duylong.vn</td>
                                <td><span className={`${styles.statusBadge} ${styles.statusPending}`}><i className="bi bi-circle-fill"></i> Chờ duyệt</span></td>
                                <td><button className={styles.btnAction}><i className="bi bi-three-dots-vertical"></i></button></td>
                            </tr>
                            {/* Row 3 */}
                            <tr>
                                <td><div className={`${styles.avatarCircle} ${styles.bgGray}`}>HL</div></td>
                                <td><strong>Hùng Lê</strong></td>
                                <td>DLC-2023-088</td>
                                <td>Kho</td>
                                <td><span className={`${styles.roleBadge} ${styles.roleSecondary}`}>NHÂN VIÊN</span></td>
                                <td>hung.le@duylong.vn</td>
                                <td><span className={`${styles.statusBadge} ${styles.statusInactive}`}><i className="bi bi-circle-fill"></i> Ngừng hoạt động</span></td>
                                <td><button className={styles.btnAction}><i className="bi bi-three-dots-vertical"></i></button></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>Hiển thị 1 đến 3 của 42 bản ghi</div>
                        <div className={styles.pageControls}>
                            <button className={styles.pageBtn}><i className="bi bi-chevron-left" /></button>
                            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
                            <button className={styles.pageBtn}>2</button>
                            <span className={styles.pageDots}>...</span>
                            <button className={styles.pageBtn}>4</button>
                            <button className={styles.pageBtn}><i className="bi bi-chevron-right" /></button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default UsersPage;
