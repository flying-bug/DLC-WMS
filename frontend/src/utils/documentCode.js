/**
 * Mã chứng từ gửi lên khi LƯU phiếu tạo mới.
 *
 * Màn tạo mới chỉ hiển thị mã dự kiến (API /next-code không cấp số). Nếu người dùng giữ nguyên mã gợi ý thì không gửi
 * mã, để backend cấp số tại thời điểm lưu: mở form rồi bỏ không làm nhảy mã, và hai người tạo cùng lúc không bị trùng.
 * Người dùng tự nhập mã khác thì gửi nguyên mã đó.
 *
 * @param {string} code          mã đang có trên form
 * @param {string} suggestedCode mã dự kiến lấy từ /next-code (rỗng khi sửa phiếu có sẵn)
 * @returns {string|undefined}
 */
export function codeForSave(code, suggestedCode) {
  const value = String(code ?? '').trim();
  if (!value) return undefined;
  if (suggestedCode && value === String(suggestedCode).trim()) return undefined;
  return value;
}
