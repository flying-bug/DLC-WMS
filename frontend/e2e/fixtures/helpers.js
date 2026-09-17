// @ts-check
import { expect } from '@playwright/test';
import { USERS, ROUTES } from './test-data.js';

/**
 * Đăng nhập bằng một user trong fixture USERS (vd. USERS.ACCOUNTANT).
 * Dùng chung cho mọi kịch bản thay vì lặp lại 4 dòng login ở từng test.
 */
export async function login(page, user) {
    // Xóa session cũ trước — nếu đang đăng nhập sẵn, PublicRoute sẽ tự động
    // điều hướng khỏi /login khiến form đăng nhập không bao giờ xuất hiện
    // (quan trọng khi 1 test cần đổi vai trò giữa chừng, ví dụ Kế toán -> Quản lý).
    await page.goto(ROUTES.LOGIN).catch(() => {});
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    }).catch(() => {});
    await page.goto(ROUTES.LOGIN);
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(user.username);
    await page.locator('#password, input[name="password"]').fill(user.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });
}

/** Đăng xuất bằng cách xóa storage (nhanh hơn thao tác qua UI). */
export async function logout(page) {
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

/**
 * Chọn 1 giá trị trong ô react-select (NCC, khách hàng...) bằng bàn phím thay
 * vì click chuột — vì menu render qua portal (document.body) có thể bị các
 * lớp UI khác (sidebar cố định...) chặn pointer event, còn gõ lọc + Enter thì
 * luôn ăn chắc vì react-select tự cuộn cao option đầu tiên còn lại.
 */
export async function selectReactSelect(page, inputId, filterText) {
    const input = page.locator(`#${inputId}`);
    await input.click();
    await input.fill(filterText);
    await expect(page.getByRole('listbox').getByRole('option').first()).toBeVisible({ timeout: 5000 });
    await input.press('Enter');
}

/**
 * Chọn 1 dòng trong popover dạng bảng (ProductGridSelect / WarehouseGridSelect):
 * bấm ô trigger theo `triggerId`, gõ từ khóa vào ô "Tìm nhanh...", rồi bấm vào
 * dòng kết quả có chứa `optionText`.
 */
export async function selectGridOption(page, triggerId, searchText, optionText) {
    await page.locator(`#${triggerId}`).click();
    await page.getByPlaceholder(/Tìm nhanh mã hoặc tên (hàng|kho)/).fill(searchText);
    await page.locator('table tr', { hasText: optionText }).first().click();
}

/**
 * Quét/nhập một mã Serial vào modal "Quản lý & Đối soát Serial Number Thực Tế"
 * (dùng chung cho cả phiếu nhập và phiếu xuất). Modal này đôi khi không nhận
 * phím Enter ngay lần đầu (độ trễ debounce của input quét mã), nên hàm luôn
 * bấm hẳn nút "+ Nhận" và chờ số đếm tăng lên để chắc chắn ăn nhập.
 */
export async function scanSerialInModal(page, serial, expectedCount) {
    const input = page.getByPlaceholder(/Bắn súng mã vạch|Bắn súng mã/);
    await input.fill(serial);
    await page.getByRole('button', { name: /Nhận/ }).click();
    await expect(page.getByText(`Đã quét thực tế: ${expectedCount} /`)).toBeVisible({ timeout: 5000 });
}

/** Đóng modal serial bằng nút "Xác nhận SL thực nhận (N)". */
export async function confirmSerialModal(page, count) {
    await page.getByRole('button', { name: new RegExp(`Xác nhận SL thực nhận \\(${count}\\)`) }).click();
}

/** Ngày hôm nay dạng yyyy-mm-dd, dùng cho input[type=date]. */
export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

/** Cộng/trừ N ngày so với hôm nay, trả về yyyy-mm-dd (cho input[type=date]). */
export function isoDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Cộng/trừ N ngày so với hôm nay, trả về dd/MM/yyyy (cho các ô DatePicker dạng text). */
export function displayDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
}
