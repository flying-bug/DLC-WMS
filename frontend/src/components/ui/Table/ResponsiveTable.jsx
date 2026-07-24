import React from 'react';
import styles from './ResponsiveTable.module.css';

/**
 * ResponsiveTable Component
 * Render standard HTML <table> on Desktop / Tablet (>= 768px).
 * Automatically converts rows into a clean Card List on Mobile (< 768px).
 */
const ResponsiveTable = ({
    columns = [],
    data = [],
    keyField = 'id',
    emptyMessage = 'Không có dữ liệu',
    onRowClick,
    actions, // Function (row) => JSX or array of action elements
    loading = false
}) => {
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <span>Đang tải dữ liệu...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={styles.emptyContainer}>
                <i className="fas fa-inbox"></i>
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={styles.responsiveTableWrapper}>
            {/* Desktop & Tablet Table View */}
            <div className={styles.tableView}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={col.key || col.dataIndex || idx}
                                    style={{ width: col.width, textAlign: col.align || 'left' }}
                                    className={col.hideOnTablet ? styles.hideTablet : ''}
                                >
                                    {col.title}
                                </th>
                            ))}
                            {actions && <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rIdx) => {
                            const rowId = row[keyField] || rIdx;
                            return (
                                <tr
                                    key={rowId}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={onRowClick ? styles.clickableRow : ''}
                                >
                                    {columns.map((col, cIdx) => {
                                        const cellVal = col.render
                                            ? col.render(row[col.dataIndex], row, rIdx)
                                            : row[col.dataIndex];
                                        return (
                                            <td
                                                key={col.key || col.dataIndex || cIdx}
                                                style={{ textAlign: col.align || 'left' }}
                                                className={col.hideOnTablet ? styles.hideTablet : ''}
                                            >
                                                {cellVal}
                                            </td>
                                        );
                                    })}
                                    {actions && (
                                        <td
                                            style={{ textAlign: 'center' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className={styles.actionButtons}>
                                                {actions(row)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List View */}
            <div className={styles.cardListView}>
                {data.map((row, rIdx) => {
                    const rowId = row[keyField] || rIdx;
                    return (
                        <div
                            key={rowId}
                            className={styles.mobileCard}
                            onClick={() => onRowClick && onRowClick(row)}
                        >
                            <div className={styles.mobileCardBody}>
                                {columns.map((col, cIdx) => {
                                    const cellVal = col.render
                                        ? col.render(row[col.dataIndex], row, rIdx)
                                        : row[col.dataIndex];
                                    
                                    // Highlight first column as Title/Header of Card
                                    if (cIdx === 0) {
                                        return (
                                            <div key={cIdx} className={styles.mobileCardTitleRow}>
                                                <span className={styles.mobileCardTitle}>{cellVal}</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={cIdx} className={styles.mobileCardRow}>
                                            <span className={styles.mobileCardLabel}>{col.title}:</span>
                                            <span className={styles.mobileCardValue}>{cellVal}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {actions && (
                                <div
                                    className={styles.mobileCardActions}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {actions(row)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ResponsiveTable;
