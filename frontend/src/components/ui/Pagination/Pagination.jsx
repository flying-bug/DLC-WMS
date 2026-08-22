import styles from './Pagination.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const Pagination = ({ 
    page = 0, 
    totalPages = 1, 
    totalElements = 0, 
    size = 20, 
    onPageChange, 
    onSizeChange,
    sizeOptions = [10, 20, 50, 100]
}) => {
    // Calculate which page numbers to show
    const getVisiblePages = () => {
        const pages = [];
        const maxPages = Math.max(1, totalPages);
        if (maxPages <= 7) {
            for (let i = 0; i < maxPages; i++) pages.push(i);
        } else {
            if (page <= 3) {
                for (let i = 0; i < 5; i++) pages.push(i);
                pages.push('...');
                pages.push(maxPages - 1);
            } else if (page >= maxPages - 4) {
                pages.push(0);
                pages.push('...');
                for (let i = maxPages - 5; i < maxPages; i++) pages.push(i);
            } else {
                pages.push(0);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(maxPages - 1);
            }
        }
        return pages;
    };

    return (
        <div className={styles.pagination}>
            <div className={styles.pageInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Hiển thị</span>
                    <select 
                        style={{ height: '32px', minWidth: '60px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', backgroundColor: '#fff', fontSize: '13px', cursor: 'pointer' }}
                        value={size} 
                        onChange={(e) => {
                            if(onSizeChange) onSizeChange(Number(e.target.value));
                        }}
                    >
                        {sizeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <span>bản ghi / trang (Tổng số <strong>{totalElements}</strong> bản ghi)</span>
                </div>
            </div>
            
            <div className={styles.pageControls}>
                <button 
                    disabled={page === 0} 
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    className={styles.pageNavBtn}
                    style={{ width: 'auto', padding: '0 12px', gap: '6px', border: 'none', background: 'none' }}
                >
                    <i className="bi bi-chevron-left"></i>
                    <span>Trước</span>
                </button>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                    {getVisiblePages().map((p, index) => {
                        if (p === '...') {
                            return <span key={`dots-${index}`} className={styles.pageDots}>...</span>;
                        }
                        return page === p ? (
                            <input
                                key={`input-${index}`}
                                className={`${styles.pageBtn} ${styles.active}`}
                                style={{ width: '32px', textAlign: 'center', padding: '0', border: 'none', outline: 'none' }}
                                defaultValue={p + 1}
                                title="Nhập số trang và nhấn Enter"
                                onBlur={(e) => e.target.value = p + 1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        let newPage = parseInt(e.target.value, 10);
                                        if (!isNaN(newPage)) {
                                            newPage = Math.max(1, Math.min(totalPages, newPage));
                                            onPageChange(newPage - 1);
                                            e.target.blur();
                                        } else {
                                            e.target.value = p + 1;
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <button 
                                key={`btn-${index}`} 
                                className={`${styles.pageBtn}`}
                                onClick={() => onPageChange(p)}
                            >
                                {p + 1}
                            </button>
                        );
                    })}
                </div>

                <button 
                    disabled={page >= totalPages - 1} 
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    className={styles.pageNavBtn}
                    style={{ width: 'auto', padding: '0 12px', gap: '6px', border: 'none', background: 'none' }}
                >
                    <span>Sau</span>
                    <i className="bi bi-chevron-right"></i>
                </button>
            </div>
        </div>
    );
};

export default Pagination;
