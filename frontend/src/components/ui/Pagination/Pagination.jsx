import React from 'react';
import styles from './Pagination.module.css';

const Pagination = ({ 
    page, 
    totalPages, 
    totalElements, 
    size, 
    onPageChange, 
    onSizeChange,
    sizeOptions = [10, 20, 50, 100]
}) => {
    if (totalElements === 0) return null;

    const startElement = page * size + 1;
    const endElement = Math.min((page + 1) * size, totalElements);

    // Calculate which page numbers to show
    const getVisiblePages = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 2) {
                for (let i = 0; i < 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages - 1);
            } else if (page >= totalPages - 3) {
                pages.push(0);
                pages.push('...');
                for (let i = totalPages - 4; i < totalPages; i++) pages.push(i);
            } else {
                pages.push(0);
                pages.push('...');
                pages.push(page - 1);
                pages.push(page);
                pages.push(page + 1);
                pages.push('...');
                pages.push(totalPages - 1);
            }
        }
        return pages;
    };

    return (
        <div className={styles.pagination}>
            <div className={styles.pageInfo}>
                Hiển thị {startElement} - {endElement} trong tổng số {totalElements} bản ghi
            </div>
            <div className={styles.pageControls}>
                <button 
                    className={styles.pageNavBtn} 
                    disabled={page === 0} 
                    onClick={() => onPageChange(page - 1)}
                >
                    <i className="fas fa-chevron-left"></i>
                </button>
                
                {getVisiblePages().map((p, index) => {
                    if (p === '...') {
                        return <span key={`dots-${index}`} className={styles.pageDots}>...</span>;
                    }
                    return (
                        <button 
                            key={p} 
                            className={`${styles.pageBtn} ${page === p ? styles.active : ''}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p + 1}
                        </button>
                    );
                })}

                <button 
                    className={styles.pageNavBtn} 
                    disabled={page >= totalPages - 1} 
                    onClick={() => onPageChange(page + 1)}
                >
                    <i className="fas fa-chevron-right"></i>
                </button>
                
                <div className={styles.pageSizeSelect}>
                    <select 
                        value={size} 
                        onChange={(e) => {
                            if(onSizeChange) onSizeChange(Number(e.target.value));
                        }}
                    >
                        {sizeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt} bản ghi trên 1 trang</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
