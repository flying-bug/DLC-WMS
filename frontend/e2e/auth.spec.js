// @ts-check
import { test, expect } from '@playwright/test';
import { USERS, ROUTES } from './fixtures/test-data.js';

test.describe('Luồng 1: Xác thực & Phân quyền Vai trò (Auth & Role Isolation)', () => {

  test('TC1.1 - Đăng nhập tài khoản Quản lý và chuyển đổi Workspace Persona', async ({ page }) => {
    // 1. Mở trang đăng nhập
    await page.goto(ROUTES.LOGIN);
    await expect(page).toHaveTitle(/Duy Long Computer/i);

    // 2. Điền thông tin đăng nhập Quản lý
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(USERS.MANAGER.username);
    await page.locator('#password, input[name="password"]').fill(USERS.MANAGER.password);
    await page.locator('button[type="submit"]').click();

    // 3. Chờ chuyển hướng thành công vào hệ thống
    await page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });
    await expect(page.locator('text=Duy Long Computer').first()).toBeVisible();

    // 4. Kiểm tra Header và Sidebar sẵn sàng
    await expect(page.locator('header, aside, nav').first()).toBeVisible();
  });

  test('TC1.2 - Đăng nhập tài khoản Thủ kho và kiểm tra phân quyền kho (Warehouse Role)', async ({ page }) => {
    // 1. Mở trang đăng nhập
    await page.goto(ROUTES.LOGIN);

    // 2. Đăng nhập với quyền Thủ kho
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(USERS.WAREHOUSE_STAFF.username);
    await page.locator('#password, input[name="password"]').fill(USERS.WAREHOUSE_STAFF.password);
    await page.locator('button[type="submit"]').click();

    // 3. Xác nhận đăng nhập thành công
    await page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });
    await expect(page.locator('text=Duy Long Computer').first()).toBeVisible();

    // 4. Kiểm tra điều hướng vào Workspace Thủ kho
    await page.goto('/warehouse-workspace?tab=imports');
    await expect(page.locator('text=/Đề nghị nhập kho|Nhập kho|Thủ kho/').first()).toBeVisible();
  });

  test('TC1.3 - Thông báo lỗi khi nhập sai mật khẩu', async ({ page }) => {
    await page.goto(ROUTES.LOGIN);

    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill('admin');
    await page.locator('#password, input[name="password"]').fill('sai_mat_khau_123');
    await page.locator('button[type="submit"]').click();

    // Xác nhận có thông báo lỗi
    const errorNotice = page.locator('text=không chính xác').or(page.locator('.toast')).or(page.locator('[role="alert"]')).or(page.locator('text=thất bại'));
    await expect(errorNotice.first()).toBeVisible({ timeout: 6000 });
  });

});
