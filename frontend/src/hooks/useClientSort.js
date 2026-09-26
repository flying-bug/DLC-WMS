import { useCallback, useMemo } from 'react';
import useSessionState from './useSessionState';
import { nextSort, sortRows } from '../utils/clientSort';

/**
 * Sắp xếp danh sách đã tải hết về trình duyệt theo cột người dùng bấm (xem utils/clientSort.js).
 * - `columns`: { [key]: { get: (row) => giá trị gốc, type: 'date' | 'number' | 'text' } }, khai báo ở mức module
 *   để không tạo lại mỗi lần render.
 * - `options.onChange`: gọi khi người dùng đổi cách sắp xếp (vd đưa về trang 1).
 * - Cách sắp xếp được nhớ giống số trang (useSessionState) nên bấm Quay lại vẫn thấy đúng các dòng lúc rời đi.
 */
export default function useClientSort(rows, columns, { onChange, storageKey = 'sort' } = {}) {
    const [savedSort, setSort] = useSessionState(storageKey, null);
    const sort = savedSort && columns[savedSort.key] ? savedSort : null;
    const sortKey = sort?.key;
    const sortDirection = sort?.direction;

    const sortedRows = useMemo(
        () => sortRows(rows, columns, sortKey ? { key: sortKey, direction: sortDirection } : null),
        [rows, columns, sortKey, sortDirection]
    );

    const toggleSort = useCallback((key) => {
        setSort((current) => nextSort(current, key));
        onChange?.();
    }, [setSort, onChange]);

    return { sortedRows, sort, toggleSort };
}
