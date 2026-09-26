import styles from './SortableHeader.module.css';

const ICONS = { asc: 'bi-arrow-up', desc: 'bi-arrow-down' };
const HINTS = {
    none: 'Bấm để sắp xếp giảm dần',
    desc: 'Đang giảm dần - bấm để sắp xếp tăng dần',
    asc: 'Đang tăng dần - bấm để bỏ sắp xếp',
};
const ALIGN_CLASS = { right: styles.alignRight, center: styles.alignCenter };

/**
 * Nội dung tiêu đề cột bấm được để sắp xếp. Đặt bên trong <th>; thẻ <th> nên có aria-sort={ariaSortOf(sort, sortKey)}.
 */
export default function SortableHeader({ label, sortKey, sort, onSort, align = 'left' }) {
    const direction = sort?.key === sortKey ? sort.direction : null;
    const className = [styles.button, direction ? styles.active : '', ALIGN_CLASS[align] || ''].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={className}
            onClick={(e) => {
                e.stopPropagation();
                onSort(sortKey);
            }}
            title={HINTS[direction || 'none']}
        >
            <span>{label}</span>
            <i className={`bi ${ICONS[direction] || 'bi-arrow-down-up'} ${styles.icon}`} aria-hidden="true"></i>
        </button>
    );
}
