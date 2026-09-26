// Sắp xếp danh sách ở phía trình duyệt cho các trang đã tải TOÀN BỘ bản ghi rồi mới tự chia trang
// (phiếu nhập/xuất, đơn bán/mua, chuyển kho, kiểm kê). Phần thuần (không phụ thuộc React) để test được.
//
// Mỗi cột sắp xếp khai báo: { get: (row) => giá trị GỐC (ngày ISO, số, chuỗi), type: 'date' | 'number' | 'text' }.
// Không sắp theo chuỗi đã định dạng để hiển thị (vd "26/09/2026") vì sẽ ra sai thứ tự.

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

const isEmpty = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

/** Chuyển giá trị ngày về số mili giây; không đọc được thì trả null (coi như trống). */
export function toTimestamp(value) {
    if (isEmpty(value)) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) {
        // LocalDate/LocalDateTime dạng mảng [năm, tháng, ngày, giờ, phút, giây]
        const [y, m = 1, d = 1, hh = 0, mm = 0, ss = 0] = value.map(Number);
        const time = new Date(y, m - 1, d, hh, mm, ss).getTime();
        return Number.isNaN(time) ? null : time;
    }
    const time = Date.parse(String(value));
    return Number.isNaN(time) ? null : time;
}

function normalize(value, type) {
    if (type === 'date') return toTimestamp(value);
    if (type === 'number') {
        if (isEmpty(value)) return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }
    return isEmpty(value) ? null : String(value).trim();
}

/** So sánh tăng dần hai giá trị đã chuẩn hóa (không trống) theo kiểu cột. Mã chứng từ so theo số: NK9 < NK10. */
export function compareByType(a, b, type = 'text') {
    if (type === 'date' || type === 'number') return a - b;
    return collator.compare(a, b);
}

/** Trả về mảng MỚI đã sắp xếp, không đổi mảng gốc. sort = { key, direction: 'asc' | 'desc' } hoặc null. */
export function sortRows(rows, columns, sort, getId = (row) => row?.id) {
    const list = Array.isArray(rows) ? rows : [];
    const column = sort && columns?.[sort.key];
    if (!column) return list;
    const factor = sort.direction === 'asc' ? 1 : -1;
    const type = column.type || 'text';

    return list
        .map((row, index) => ({ row, index, value: normalize(column.get(row), type), id: getId(row) }))
        .sort((x, y) => {
            // Ô trống luôn nằm cuối, bất kể chiều sắp xếp
            if (x.value === null || y.value === null) {
                if (x.value === null && y.value === null) return x.index - y.index;
                return x.value === null ? 1 : -1;
            }
            const primary = compareByType(x.value, y.value, type);
            if (primary !== 0) return primary * factor;
            // Trùng giá trị (vd cùng ngày): xếp tiếp theo id cùng chiều để thứ tự ổn định giữa các lần tải
            if (x.id !== undefined && x.id !== null && y.id !== undefined && y.id !== null && x.id !== y.id) {
                const byId = typeof x.id === 'number' && typeof y.id === 'number'
                    ? x.id - y.id
                    : collator.compare(String(x.id), String(y.id));
                if (byId !== 0) return byId * factor;
            }
            return x.index - y.index;
        })
        .map((entry) => entry.row);
}

/** Bấm tiêu đề cột: lần 1 giảm dần (mới nhất / số lớn nhất lên đầu) -> lần 2 tăng dần -> lần 3 bỏ sắp xếp. */
export function nextSort(current, key) {
    if (!current || current.key !== key) return { key, direction: 'desc' };
    if (current.direction === 'desc') return { key, direction: 'asc' };
    return null;
}

/** Giá trị thuộc tính aria-sort cho thẻ <th> của cột có thể sắp xếp. */
export function ariaSortOf(sort, key) {
    if (!sort || sort.key !== key) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
}
