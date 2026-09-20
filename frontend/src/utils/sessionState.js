// Lưu bộ lọc / từ khóa / số trang của các trang danh sách trong sessionStorage để bấm Quay lại (Back) thấy đúng trạng thái
// lúc rời đi. Phần thuần (không phụ thuộc React) để test được.

export const SESSION_STATE_PREFIX = 'dlc_list:';

export const sessionStateKey = (pathname, key) => `${SESSION_STATE_PREFIX}${pathname}:${key}`;

/** Đọc giá trị đã lưu khi shouldRestore, ngược lại (hoặc chưa có/lỗi) dùng giá trị khởi tạo. */
export function readSessionState(storage, storageKey, initialValue, shouldRestore) {
    if (shouldRestore) {
        try {
            const raw = storage.getItem(storageKey);
            if (raw !== null && raw !== undefined) return JSON.parse(raw);
        } catch {
            // dữ liệu lỗi: bỏ qua, dùng giá trị khởi tạo
        }
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
}

export function writeSessionState(storage, storageKey, value) {
    try {
        storage.setItem(storageKey, JSON.stringify(value));
    } catch {
        // đầy bộ nhớ/không được phép: không ảnh hưởng chức năng
    }
}

export function clearSessionStates(storage) {
    Object.keys(storage)
        .filter((key) => key.startsWith(SESSION_STATE_PREFIX))
        .forEach((key) => storage.removeItem(key));
}
