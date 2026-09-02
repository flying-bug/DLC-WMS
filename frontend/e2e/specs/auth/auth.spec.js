// @ts-check
import { test, expect } from '@playwright/test';
import { USERS, ROUTES } from '../../fixtures/test-data.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

test.describe('Luồng 1: Xác thực & Phân quyền Vai trò (Auth & Role Isolation)', () => {

  test('TC1.1 - Đăng nhập tài khoản Quản lý và chuyển đổi Workspace Persona', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const workspacePage = new WorkspacePage(page);

    await loginPage.goto(ROUTES.LOGIN);
    await expect(page).toHaveTitle(/Duy Long Computer/i);
    await loginPage.login(USERS.MANAGER.username, USERS.MANAGER.password);
    
    // Kiểm tra UI sau đăng nhập
    await workspacePage.verifyDashboardLoaded();
  });

  test('TC1.2 - Đăng nhập tài khoản Thủ kho và kiểm tra phân quyền kho (Warehouse Role)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const workspacePage = new WorkspacePage(page);

    await loginPage.goto(ROUTES.LOGIN);
    await loginPage.login(USERS.WAREHOUSE_STAFF.username, USERS.WAREHOUSE_STAFF.password);
    
    // Kiểm tra đăng nhập thành công và điều hướng
    await workspacePage.verifyDashboardLoaded();
    await workspacePage.gotoWarehouseImports();
  });

  test('TC1.3 - Thông báo lỗi khi nhập sai mật khẩu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto(ROUTES.LOGIN);
    await loginPage.login('admin', 'sai_mat_khau_123');
    
    // Xác nhận có thông báo lỗi
    await expect(loginPage.errorMessage.first()).toBeVisible({ timeout: 6000 });
  });

});
