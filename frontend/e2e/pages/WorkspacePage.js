export class WorkspacePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.brandLogo = page.locator('text=Duy Long Computer').first();
    this.layoutElements = page.locator('header, aside, nav').first();
    this.warehouseIndicators = page.locator('text=/Đề nghị nhập kho|Nhập kho|Thủ kho/').first();
  }

  async verifyDashboardLoaded() {
    await this.page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });
    await this.brandLogo.waitFor({ state: 'visible' });
    await this.layoutElements.waitFor({ state: 'visible' });
  }

  async gotoWarehouseImports() {
    await this.page.goto('/warehouse-workspace?tab=imports');
    await this.warehouseIndicators.waitFor({ state: 'visible' });
  }
}
