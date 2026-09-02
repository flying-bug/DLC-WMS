export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('#usernameOrEmail, input[name="usernameOrEmail"]');
    this.passwordInput = page.locator('#password, input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('text=không chính xác').or(page.locator('.toast')).or(page.locator('[role="alert"]')).or(page.locator('text=thất bại'));
  }

  async goto(loginUrl = '/login') {
    await this.page.goto(loginUrl);
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
