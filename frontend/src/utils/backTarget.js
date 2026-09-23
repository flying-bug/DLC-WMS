// Quyết định nút "Quay lại" đi đâu: ưu tiên lùi lại trang trước đó trong ứng dụng; chỉ khi không còn trang trước
// (mở thẳng bằng URL, F5 ở trang đầu tiên...) mới dùng returnUrl truyền kèm hoặc đường dẫn dự phòng.
export function resolveBackTarget({ hasPrevious, returnUrl, fallback, forceBackTo }) {
    if (forceBackTo) return { type: 'replace', to: forceBackTo };
    if (hasPrevious) return { type: 'back' };
    return { type: 'replace', to: returnUrl || fallback };
}

// React Router (BrowserRouter) ghi idx vào history.state: idx > 0 nghĩa là đã có ít nhất một trang trước trong ứng dụng.
export function hasPreviousAppPage(historyState) {
    return Number(historyState?.idx) > 0;
}
