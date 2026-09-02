// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình kiểm thử tự động Playwright E2E cho DLC-WMS
 */
export default defineConfig({
  testDir: './e2e',
  /* Chạy tuần tự các test để tránh xung đột dữ liệu kho */
  fullyParallel: false,
  workers: 1,
  /* Báo cáo dạng HTML và list trên console */
  reporter: [['html', { open: 'never' }], ['list']],
  /* Cấu hình dùng chung cho tất cả các bài test */
  use: {
    /* URL máy chủ frontend */
    baseURL: 'http://localhost:5173',
    /* Thu thập trace khi test bị fail để xem lại từng bước */
    trace: 'on-first-retry',
    /* Tự động chụp ảnh khi test bị lỗi */
    screenshot: 'only-on-failure',
    /* Quay video khi test bị lỗi */
    video: 'retain-on-failure',
    /* Chờ tối đa cho mỗi thao tác */
    actionTimeout: 10000,
    navigationTimeout: 15000,
    /* Tự động chạy với trình duyệt Chromium */
    headless: false,
    /* Thêm độ trễ nhẹ giữa các thao tác (giúp quan sát trực tiếp rõ ràng) */
    launchOptions: {
      slowMo: 250,
    },
  },

  /* Cấu hình dự án chạy với Chrome/Chromium */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        /* Lưu ý: Mặc định dùng auth của Manager. Các luồng khác sẽ tự override */
        storageState: 'e2e/.auth/manager.json',
      },
      dependencies: ['setup'],
    },
  ],
});
