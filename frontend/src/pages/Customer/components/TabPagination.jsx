

const TabPagination = ({ page, setPage, totalPages, styles }) => {
    if (!totalPages || totalPages <= 1) return null;

    return (
        <div className={styles.pagination} style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
            <div className={styles.pageInfo} style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                Trang {page + 1} / {totalPages}
            </div>
            <div className={styles.pageNav} style={{ display: 'flex', gap: '8px' }}>
                <button 
                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '4px 12px', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? 'var(--color-text-muted)' : 'var(--color-text)' }}
                    disabled={page === 0} 
                    onClick={() => setPage(p => p - 1)}
                >
                    <i className="bi bi-chevron-left"></i> Trước
                </button>
                <button 
                    style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '4px 12px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: page >= totalPages - 1 ? 'var(--color-text-muted)' : 'var(--color-text)' }}
                    disabled={page >= totalPages - 1} 
                    onClick={() => setPage(p => p + 1)}
                >
                    Sau <i className="bi bi-chevron-right"></i>
                </button>
            </div>
        </div>
    );
};

export default TabPagination;
