// @ts-check
import { test, expect } from '@playwright/test';
import { USERS, ROUTES } from '../../fixtures/test-data.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

test.describe('Luồng 1: Xác thực & Phân quyền Vai trò (Auth & Role Isolation)', () => {

  test('TC1.1 - Đăng nhập tài khoản Quản lý và chuyển đổi Workspace Persona', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const workspacePage = new WorkspacePage(page);

    await test.step('Mở trang đăng nhập hệ thống', async () => {
      await loginPage.goto(ROUTES.LOGIN);
      await expect(page).toHaveTitle(/Duy Long Computer/i);
    });

    await test.step('Đăng nhập bằng tài khoản Quản lý', async () => {
      await loginPage.login(USERS.MANAGER.username, USERS.MANAGER.password);
    });

    await test.step('Kiểm tra giao diện Workspace hiển thị đúng sau khi đăng nhập', async () => {
      await workspacePage.verifyDashboardLoaded();
    });
  });

  test('TC1.2 - Đăng nhập tài khoản Thủ kho và kiểm tra phân quyền kho (Warehouse Role)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const workspacePage = new WorkspacePage(page);

    await test.step('Đăng nhập bằng tài khoản Thủ kho', async () => {
      await loginPage.goto(ROUTES.LOGIN);
      await loginPage.login(USERS.WAREHOUSE_STAFF.username, USERS.WAREHOUSE_STAFF.password);
    });

    await test.step('Xác nhận đăng nhập thành công', async () => {
      await workspacePage.verifyDashboardLoaded();
    });

    await test.step('Kiểm tra quyền truy cập phân hệ Nhập kho', async () => {
      await workspacePage.gotoWarehouseImports();
    });
  });

  test('TC1.3 - Thông báo lỗi khi nhập sai mật khẩu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await test.step('Đăng nhập với mật khẩu sai', async () => {
      await loginPage.goto(ROUTES.LOGIN);
      await loginPage.login('admin', 'sai_mat_khau_123');
    });

    await test.step('Xác minh hệ thống cảnh báo lỗi', async () => {
      await expect(loginPage.errorMessage.first()).toBeVisible({ timeout: 6000 });
    });
  });

});
