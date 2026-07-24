import React from 'react';
import styles from './SearchFilter.module.css';

/**
 * SearchFilter Component
 * Responsive Filter container for Search, Dropdowns, DatePickers, Action buttons.
 * Desktop: Horizontal single line
 * Tablet: 2 rows layout
 * Mobile: Vertical stack, Buttons pinned at bottom
 */
const SearchFilter = ({
    children,
    actions,
    onReset,
    className = ''
}) => {
    return (
        <div className={`${styles.filterContainer} ${className}`}>
            <div className={styles.filterInputs}>
                {children}
            </div>
            {(actions || onReset) && (
                <div className={styles.filterActions}>
                    {onReset && (
                        <button
                            type="button"
                            className={styles.resetBtn}
                            onClick={onReset}
                            title="Đặt lại bộ lọc"
                        >
                            <i className="fas fa-undo"></i>
                            <span className={styles.btnText}>Đặt lại</span>
                        </button>
                    )}
                    {actions}
                </div>
            )}
        </div>
    );
};

export default SearchFilter;
