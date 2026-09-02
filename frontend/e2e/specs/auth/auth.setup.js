// @ts-check
import { test as setup } from '@playwright/test';
import { USERS, ROUTES } from '../../fixtures/test-data.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { WorkspacePage } from '../../pages/WorkspacePage.js';

const managerFile = 'e2e/.auth/manager.json';
const warehouseFile = 'e2e/.auth/warehouse.json';

setup('authenticate as manager', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const workspacePage = new WorkspacePage(page);

  await loginPage.goto(ROUTES.LOGIN);
  await loginPage.login(USERS.MANAGER.username, USERS.MANAGER.password);
  await workspacePage.verifyDashboardLoaded();
  
  await page.context().storageState({ path: managerFile });
});

setup('authenticate as warehouse controller', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const workspacePage = new WorkspacePage(page);

  await loginPage.goto(ROUTES.LOGIN);
  await loginPage.login(USERS.WAREHOUSE_STAFF.username, USERS.WAREHOUSE_STAFF.password);
  await workspacePage.verifyDashboardLoaded();
  
  await page.context().storageState({ path: warehouseFile });
});
