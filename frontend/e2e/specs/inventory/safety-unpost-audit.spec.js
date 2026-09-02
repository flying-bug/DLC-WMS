// @ts-check
import { test, expect } from '@playwright/test';
import { USERS, ROUTES } from './fixtures/test-data.js';

test.describe('Luồng 3: Bỏ ghi sổ an toàn & Chuông thông báo (Safety Unpost & Notification Navigation)', () => {

  test.beforeEach(async ({ page }) => {
    // Đăng nhập Quản lý
    await page.goto(ROUTES.LOGIN);
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(USERS.MANAGER.username);
    await page.locator('#password, input[name="password"]').fill(USERS.MANAGER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });
  });

  test('TC3.1 - Kiểm tra Chuông thông báo và danh sách thông báo hệ thống', async ({ page }) => {
    // 1. Tìm biểu tượng chuông thông báo ở header
    const bellBtn = page.locator('button[title*="Thông báo"], i.bi-bell, .bi-bell').first();
    await expect(bellBtn).toBeVisible();

    // 2. Click mở danh sách thông báo
    await bellBtn.click();
    await page.waitForTimeout(500);

    // 3. Kiểm tra danh sách thông báo xổ xuống
    const dropdown = page.locator('text=Thông báo').first();
    await expect(dropdown).toBeVisible();
  });

  test('TC3.2 - Kiểm tra thao tác xem chi tiết chứng từ và Nhật ký', async ({ page }) => {
    // 1. Mở chứng từ NK00004
    await page.goto('/warehouse-workspace/imports/6');
    await page.waitForTimeout(1000);

    // 2. Kiểm tra thông tin chứng từ tải thành công
    await expect(page.locator('text=NK00004').first()).toBeVisible();

    // 3. Kiểm tra các nút thao tác trên header
    const printBtn = page.locator('button:has-text("In phiếu"), button:has-text("Quay lại")').first();
    await expect(printBtn).toBeVisible();
  });

});
