import React, { useState, Fragment } from 'react';
import styles from './ResponsiveTable.module.css';
import SortableHeader from '../SortableHeader/SortableHeader';
import { ariaSortOf } from '../../../utils/clientSort';

// Columns that carry a selection control / row index rather than actual row content
// (checkbox, radio, STT/#) should never become the mobile card's title - they're
// rendered as small controls next to the title instead. See ResponsiveTable.jsx docs.
const META_COLUMN_KEYS = ['checkbox', 'radioSelect', 'select', 'stt', 'index'];

const isMetaColumn = (col) => {
    const key = col.key || col.dataIndex;
    if (key && META_COLUMN_KEYS.includes(key)) return true;
    if (typeof col.title === 'string' && ['STT', '#'].includes(col.title.trim())) return true;
    return false;
};

// Picks the first non-meta column to use as the mobile card title; falls back to
// column 0 if every column is a meta column (keeps old behaviour instead of crashing).
const getTitleColumnIndex = (columns) => {
    const idx = columns.findIndex((col) => !isMetaColumn(col));
    return idx === -1 ? 0 : idx;
};

/**
 * ResponsiveTable Component
 * Render standard HTML <table> on Desktop / Tablet (>= 768px).
 * Automatically converts rows into a clean Card List on Mobile (< 768px).
 * Sorting (optional): give a column `sortKey` and pass `sort` + `onSort` (see hooks/useClientSort.js);
 * its header becomes a button that cycles descending -> ascending -> off.
 */
const ResponsiveTable = ({
    columns = [],
    data = [],
    emptyMessage = 'Không có dữ liệu',
    onRowClick,
    onRowDoubleClick,
    actions, // Function (row) => JSX or array of action elements
    loading = false,
    summaryRow, // JSX for desktop/tablet summary <tr>
    summaryMobile, // JSX for mobile summary <div>
    expandable, // { expandedRowRender: (row) => JSX, rowExpandable: (row) => boolean }
    subRowRender, // (row, idx) => JSX (always visible sub-row)
    rowClassName, // (row) => string
    keyField = 'id', // Default key field for rows
    sort, // { key, direction: 'asc' | 'desc' } | null - current sort, see hooks/useClientSort.js
    onSort // (sortKey) => void - makes columns with `sortKey` clickable
}) => {
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);
    const titleColIdx = getTitleColumnIndex(columns);

    const toggleExpand = (e, rowId) => {
        e.stopPropagation();
        setExpandedRowKeys(prev => 
            prev.includes(rowId) ? prev.filter(k => k !== rowId) : [...prev, rowId]
        );
    };

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
                <i className="bi bi-inbox"></i>
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
                            {expandable && <th style={{ width: 40 }} />}
                            {columns.map((col, idx) => {
                                const sortable = Boolean(col.sortKey && onSort);
                                return (
                                    <th
                                        key={col.key || col.dataIndex || idx}
                                        style={{ width: col.width, textAlign: col.align || 'left' }}
                                        className={col.hideOnTablet ? styles.hideTablet : ''}
                                        aria-sort={sortable ? ariaSortOf(sort, col.sortKey) : undefined}
                                    >
                                        {sortable
                                            ? <SortableHeader label={col.title} sortKey={col.sortKey} sort={sort} onSort={onSort} align={col.align} />
                                            : col.title}
                                    </th>
                                );
                            })}
                            {actions && <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rIdx) => {
                            const rowId = row[keyField] || rIdx;
                            const isExpandable = expandable && (!expandable.rowExpandable || expandable.rowExpandable(row));
                            const isExpanded = expandedRowKeys.includes(rowId);
                            
                            return (
                                <Fragment key={rowId}>
                                    <tr
                                        onClick={(e) => {
                                            if (onRowClick) onRowClick(row);
                                            else if (isExpandable) toggleExpand(e, rowId);
                                        }}
                                        onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row)}
                                        className={`${onRowClick || isExpandable ? styles.clickableRow : ''} ${rowClassName ? rowClassName(row) : ''}`}
                                    >
                                        {expandable && (
                                            <td style={{ textAlign: 'center' }} onClick={(e) => isExpandable && toggleExpand(e, rowId)}>
                                                {isExpandable && (
                                                    <button type="button" className={styles.expandBtn}>
                                                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                                    </button>
                                                )}
                                            </td>
                                        )}
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
                                    {isExpanded && expandable?.expandedRowRender && (
                                        <tr className={styles.expandedRow}>
                                            <td colSpan={columns.length + (actions ? 1 : 0) + (expandable ? 1 : 0)}>
                                                {expandable.expandedRowRender(row)}
                                            </td>
                                        </tr>
                                    )}
                                    {subRowRender && subRowRender(row, rIdx) && (
                                        <tr className={styles.expandedRow}>
                                            <td colSpan={columns.length + (actions ? 1 : 0) + (expandable ? 1 : 0)}>
                                                {subRowRender(row, rIdx)}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                        {summaryRow && summaryRow}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List View */}
            <div className={styles.cardListView}>
                {data.map((row, rIdx) => {
                    const rowId = row[keyField] || rIdx;
                    const isExpandable = expandable && (!expandable.rowExpandable || expandable.rowExpandable(row));
                    const isExpanded = expandedRowKeys.includes(rowId);

                    return (
                        <div
                            key={rowId}
                            className={`${styles.mobileCard} ${rowClassName ? rowClassName(row) : ''}`}
                            onClick={(e) => {
                                if (onRowClick) onRowClick(row);
                                else if (isExpandable) toggleExpand(e, rowId);
                            }}
                        >
                            <div className={styles.mobileCardBody}>
                                <div className={styles.mobileCardTitleRow}>
                                    {columns.map((col, cIdx) => {
                                        // Meta columns (checkbox / radio / STT) ride alongside the
                                        // title instead of taking it over - see isMetaColumn above.
                                        if (cIdx === titleColIdx || !isMetaColumn(col)) return null;
                                        const cellVal = col.render
                                            ? col.render(row[col.dataIndex], row, rIdx)
                                            : row[col.dataIndex];
                                        return (
                                            <span
                                                key={cIdx}
                                                className={styles.mobileCardMeta}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {cellVal}
                                            </span>
                                        );
                                    })}
                                    <span className={styles.mobileCardTitle}>
                                        {columns[titleColIdx]
                                            ? (columns[titleColIdx].render
                                                ? columns[titleColIdx].render(row[columns[titleColIdx].dataIndex], row, rIdx)
                                                : row[columns[titleColIdx].dataIndex])
                                            : null}
                                    </span>
                                </div>
                                {columns.map((col, cIdx) => {
                                    if (cIdx === titleColIdx || isMetaColumn(col)) return null;
                                    const cellVal = col.render
                                        ? col.render(row[col.dataIndex], row, rIdx)
                                        : row[col.dataIndex];

                                    return (
                                        <div key={cIdx} className={styles.mobileCardRow}>
                                            <span className={styles.mobileCardLabel}>{col.title}:</span>
                                            <div className={styles.mobileCardValue}>{cellVal}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {isExpanded && expandable?.expandedRowRender && (
                                <div className={styles.mobileExpandedArea}>
                                    {expandable.expandedRowRender(row)}
                                </div>
                            )}

                            {subRowRender && subRowRender(row, rIdx) && (
                                <div className={styles.mobileExpandedArea}>
                                    {subRowRender(row, rIdx)}
                                </div>
                            )}

                            {(actions || isExpandable) && (
                                <div
                                    className={styles.mobileCardActions}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {isExpandable && (
                                        <button type="button" className={styles.mobileExpandBtn} onClick={(e) => toggleExpand(e, rowId)}>
                                            {isExpanded ? 'Thu gọn' : 'Chi tiết'} <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                        </button>
                                    )}
                                    <div style={{ flex: 1 }}></div>
                                    {actions && actions(row)}
                                </div>
                            )}
                        </div>
                    );
                })}
                {summaryMobile && summaryMobile}
            </div>
        </div>
    );
};

export default ResponsiveTable;
