// @ts-check
import { test, expect } from '@playwright/test';
import { USERS, ROUTES } from './fixtures/test-data.js';

test.describe('Luồng 2: Mua hàng, Quét Serial & Nhập kho (Inbound Procurement Flow)', () => {

  test.beforeEach(async ({ page }) => {
    // Đăng nhập tài khoản Quản lý trước mỗi bài test
    await page.goto(ROUTES.LOGIN);
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(USERS.MANAGER.username);
    await page.locator('#password, input[name="password"]').fill(USERS.MANAGER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });
  });

  test('TC2.1 - Truy cập Workspace Thủ kho và xem danh sách Đề nghị nhập kho', async ({ page }) => {
    // 1. Chuyển sang Workspace Thủ kho
    await page.goto('/warehouse-workspace?tab=imports');
    await page.waitForTimeout(1000);

    // 2. Xác nhận giao diện hiển thị
    await expect(page.locator('text=/Đề nghị nhập kho|Nhập kho|Thủ kho/').first()).toBeVisible();
  });

  test('TC2.2 - Mở chi tiết phiếu kiểm đếm kho NK00004 và kiểm tra Banners cảnh báo', async ({ page }) => {
    // 1. Mở thẳng màn hình kiểm đếm của chứng từ NK00004 (ID 6)
    await page.goto('/warehouse-workspace/imports/6');
    await page.waitForTimeout(1000);

    // 2. Xác nhận thông tin chứng từ tải thành công
    await expect(page.locator('text=NK00004').first()).toBeVisible();

    // 3. Kiểm tra sự hiện diện của Banner Lịch sử Bỏ ghi sổ
    const unpostBanner = page.locator('text=/Lịch sử Bỏ ghi sổ|Bỏ ghi sổ bởi|Test nhap thieu/').first();
    await expect(unpostBanner).toBeVisible();

    // 4. Kiểm tra sự hiện diện của Banner Cảnh báo Chênh lệch kiểm nhận (Hàng thiếu / Hàng lỗi)
    const discrepancyBanner = page.locator('text=/Cảnh báo Chênh lệch|Thiếu: 2|Hàng thiếu/').first();
    await expect(discrepancyBanner).toBeVisible();

    // 5. Cuộn xuống cuối trang và kiểm tra Khối Nhật ký thao tác & Lịch sử chứng từ (Audit Log Timeline)
    const auditTimeline = page.locator('text=Nhật ký thao tác & Lịch sử chứng từ').first();
    await auditTimeline.scrollIntoViewIfNeeded();
    await expect(auditTimeline).toBeVisible();
    await expect(page.locator('text=/GHI SỔ KHO|BỎ GHI SỔ|TẠO CHỨNG TỪ/').first()).toBeVisible();
  });

});
