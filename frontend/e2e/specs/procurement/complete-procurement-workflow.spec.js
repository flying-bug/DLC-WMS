// @ts-check
import { test, expect } from '@playwright/test';
import { USERS, ROUTES } from './fixtures/test-data.js';

test.describe('KỊCH BẢN WORKFLOW TOÀN TRÌNH: Mua Hàng -> Quét Serial -> Nhập Kho -> Đối Soát & Nhật Ký', () => {

  test('Chạy toàn bộ luồng nghiệp vụ liên vai trò (Accountant -> Warehouse Controller -> Manager)', async ({ page }) => {
    
    // =========================================================================
    // GIAI ĐOẠN 1: KẾ TOÁN ĐĂNG NHẬP & KIỂM TRA ĐƠN MUA HÀNG (PO ĐÃ CHỐT GIÁ)
    // =========================================================================
    console.log('--- BƯỚC 1: Kế toán đăng nhập vào hệ thống ---');
    await page.goto(ROUTES.LOGIN);
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(USERS.ACCOUNTANT.username);
    await page.locator('#password, input[name="password"]').fill(USERS.ACCOUNTANT.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/main-dashboard|dashboard|purchase-orders/, { timeout: 10000 });
    await expect(page.locator('text=Duy Long Computer').first()).toBeVisible();

    console.log('--- BƯỚC 2: Kế toán kiểm tra danh sách Đơn mua hàng PO (Đã chốt giá với NCC) ---');
    await page.goto('/purchase-orders');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=/Đơn mua hàng|Đơn đặt hàng|PO/').first()).toBeVisible();

    console.log('--- BƯỚC 3: Kế toán kiểm tra danh sách Phiếu nhập kho ---');
    await page.goto('/import-history');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=/Nhập kho|Danh sách|Mã phiếu/').first()).toBeVisible();

    // Đăng xuất Kế toán
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // =========================================================================
    // GIAI ĐOẠN 2: THỦ KHO NHẬN HÀNG, QUÉT SERIAL & KIỂM ĐẾM TẠI WORKSPACE KHO
    // =========================================================================
    console.log('--- BƯỚC 4: Thủ kho đăng nhập vào Workspace Kho ---');
    await page.goto(ROUTES.LOGIN);
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(USERS.WAREHOUSE_STAFF.username);
    await page.locator('#password, input[name="password"]').fill(USERS.WAREHOUSE_STAFF.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });

    console.log('--- BƯỚC 5: Thủ kho mở Workspace Đề nghị nhập kho ---');
    await page.goto('/warehouse-workspace?tab=imports');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=/Đề nghị nhập kho|Phiếu nhập|Thủ kho/').first()).toBeVisible();

    console.log('--- BƯỚC 6: Thủ kho mở chi tiết phiếu NK00004 để kiểm đếm & quét serial ---');
    await page.goto('/warehouse-workspace/imports/6');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=NK00004').first()).toBeVisible();

    // Kiểm tra thông tin hiện vật trên bảng hàng hóa
    await expect(page.locator('text=/VGA-RTX4070TI-16G|Sản phẩm|Chiếc/').first()).toBeVisible();

    // Thao tác mở Modal Quản lý Serial
    const scanSerialBtn = page.locator('button:has-text("Quét Serial"), button:has-text("Nhập Serial"), button:has-text("Xem Serial")').first();
    if (await scanSerialBtn.isVisible()) {
      console.log('--- BƯỚC 7: Mở Modal Quét/Nhập mã Serial ---');
      await scanSerialBtn.click();
      await page.waitForTimeout(1000);
      const modal = page.locator('.modal, [role="dialog"], text=Danh sách Serial, text=Quản lý Serial').first();
      await expect(modal).toBeVisible();

      // Đóng modal serial
      const closeBtn = page.locator('.modal button:has-text("Đóng"), .modal button:has-text("Hủy"), .modal .btn-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Đăng xuất Thủ kho
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // =========================================================================
    // GIAI ĐOẠN 3: QUẢN LÝ / KẾ TOÁN ĐỐI SOÁT CHÊNH LỆCH & XEM NHẬT KÝ AUDIT
    // =========================================================================
    console.log('--- BƯỚC 8: Quản lý đăng nhập kiểm tra thông báo & nhật ký thao tác ---');
    await page.goto(ROUTES.LOGIN);
    await page.locator('#usernameOrEmail, input[name="usernameOrEmail"]').fill(USERS.MANAGER.username);
    await page.locator('#password, input[name="password"]').fill(USERS.MANAGER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/main-dashboard|dashboard|warehouse-workspace/, { timeout: 10000 });

    console.log('--- BƯỚC 9: Mở chuông thông báo xem cảnh báo nhập thiếu ---');
    const bellBtn = page.locator('button[title*="Thông báo"], i.bi-bell, .bi-bell').first();
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Thông báo').first()).toBeVisible();

    console.log('--- BƯỚC 10: Mở chi tiết chứng từ NK00004 xem toàn bộ Timeline Nhật ký ---');
    await page.goto('/warehouse-workspace/imports/6');
    await page.waitForTimeout(1500);

    // Xác nhận Banner Lịch sử Bỏ ghi sổ
    const unpostBanner = page.locator('text=/Lịch sử Bỏ ghi sổ|Bỏ ghi sổ bởi|Test nhap thieu/').first();
    await expect(unpostBanner).toBeVisible();

    // Xác nhận Banner Cảnh báo chênh lệch hàng thiếu
    const discrepancyBanner = page.locator('text=/Cảnh báo Chênh lệch|Thiếu: 2|Hàng thiếu/').first();
    await expect(discrepancyBanner).toBeVisible();

    // Cuộn xuống xem Toàn bộ Dòng thời gian Nhật ký Đa sự kiện
    const auditSection = page.locator('text=Nhật ký thao tác & Lịch sử chứng từ').first();
    await auditSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await expect(auditSection).toBeVisible();
    await expect(page.locator('text=/GHI SỔ KHO|BỎ GHI SỔ|TẠO CHỨNG TỪ/').first()).toBeVisible();

    console.log('🎉 TOÀN BỘ WORKFLOW LIÊN PHÂN HỆ ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  });

});
