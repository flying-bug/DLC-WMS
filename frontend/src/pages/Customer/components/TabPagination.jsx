

const TabPagination = ({ page, setPage, totalPages, styles }) => {
    return (
        <div className={styles.pagination}>
            <div className={styles.pageInfo}>
                Trang {page + 1} / {totalPages || 1}
            </div>
            <div className={styles.pageNav}>
                <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <i className="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    );
};

export default TabPagination;
