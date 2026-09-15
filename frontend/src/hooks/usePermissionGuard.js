/**
 * usePermissionGuard — Hook chặn quyền ngay tại nút bấm.
 *
 * Cách dùng:
 *   const guard = usePermissionGuard();
 *
 *   // Trong onClick:
 *   onClick={(e) => { e.stopPropagation(); guard('warehouse_master:edit', () => handleEdit(item)); }}
 *
 *   // Hoặc kiểm tra permission trước (không có callback):
 *   if (!guard.check('product:delete')) return;
 *
 * Khi không có quyền: tự động dispatch event 'app:permission-denied'
 * → AdminLayout lắng nghe và hiển thị toast cảnh báo toàn cục.
 */
import { hasPermission } from '../auth/session';

export const PERMISSION_DENIED_EVENT = 'app:permission-denied';

/**
 * Dispatch sự kiện từ chối quyền (dùng internal hoặc trong các utility khác)
 * @param {string} [message] - Thông báo tuỳ chỉnh (không bắt buộc)
 */
export function dispatchPermissionDenied(message) {
    window.dispatchEvent(
        new CustomEvent(PERMISSION_DENIED_EVENT, {
            detail: { message: message || 'Bạn không có quyền thực hiện thao tác này.' }
        })
    );
}

/**
 * Custom hook trả về hàm `guard`.
 *
 * @returns {Function} guard(permissionOrPermissions, callback?, message?)
 *   - permissionOrPermissions: string | string[]  — permission cần check
 *   - callback: Function | undefined              — hàm thực thi nếu có quyền
 *   - message: string | undefined                 — thông báo lỗi tuỳ chỉnh
 *   - Trả về: boolean — true nếu có quyền, false nếu không
 */
export default function usePermissionGuard() {
    /**
     * @param {string|string[]} permissionOrPermissions
     * @param {Function} [callback]
     * @param {string} [message]
     * @returns {boolean}
     */
    function guard(permissionOrPermissions, callback, message) {
        const allowed = hasPermission(permissionOrPermissions);
        if (!allowed) {
            dispatchPermissionDenied(message);
            return false;
        }
        if (typeof callback === 'function') {
            callback();
        }
        return true;
    }

    /**
     * Kiểm tra quyền không thực hiện callback (dùng để disable/ẩn nút)
     * @param {string|string[]} permissionOrPermissions
     * @returns {boolean}
     */
    guard.check = (permissionOrPermissions) => hasPermission(permissionOrPermissions);

    return guard;
}
