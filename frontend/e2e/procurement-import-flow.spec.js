// @ts-check
import { test, expect } from '@playwright/test';
import { USERS } from './fixtures/test-data.js';
import { login, scanSerialInModal, confirmSerialModal, isoDateOffset, selectReactSelect, selectGridOption } from './fixtures/helpers.js';

/**
 * Luồng Mua hàng & Nhập kho (Procurement -> Import).
 * Dữ liệu seed dùng chung: NCC00003 (Acer Tech), sản phẩm quản lý serial
 * LAP-G16-I9-4080, kho KHO001. Xem docs/SYSTEM_ROLES_AND_WORKFLOW_SPEC.md
 * mục 4 cho vòng đời chứng từ và docs/BUSINESS_RULES.md mục IV cho các
 * business rule BR-19..BR-23 được test ở đây (map sang mã lỗi INV_ERR_xxx
 * trong SystemMessage.java).
 */

const SUPPLIER_TEXT = 'NCC00003';
const SERIAL_PRODUCT_SKU = 'LAP-G16-I9-4080';
const WAREHOUSE_CODE = 'KHO001';

/** Tạo 1 đơn mua hàng với 1 dòng sản phẩm serial, trả về mã PO vừa tạo. */
async function createPurchaseOrder(page, { quantity = 1, unitPrice = 15000000, approve = true } = {}) {
  await page.goto('/purchase-orders/create');
  await expect(page.getByText(/Tạo đơn mua hàng mới: PO\d+/)).toBeVisible({ timeout: 10000 });
  const poCodeText = await page.getByText(/Tạo đơn mua hàng mới: PO\d+/).innerText();
  const poCode = poCodeText.match(/PO\d+/)[0];

  await selectReactSelect(page, 'po-supplierId', SUPPLIER_TEXT);
  await selectGridOption(page, 'po-line-product-0', SERIAL_PRODUCT_SKU, SERIAL_PRODUCT_SKU);

  const qtyInput = page.locator('#po-line-qty-0');
  await qtyInput.fill(String(quantity));
  await page.locator('#po-line-price-0').fill(String(unitPrice));

  if (approve) {
    await page.getByRole('button', { name: 'Lưu & Duyệt ngay' }).click();
    await expect(page.getByText(new RegExp(`Tạo và duyệt đơn ${poCode} thành công`))).toBeVisible({ timeout: 10000 });
  } else {
    await page.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(page.getByText(new RegExp(`${poCode}`))).toBeVisible({ timeout: 10000 });
  }
  return poCode;
}

test.describe('Luồng Mua hàng & Nhập kho (Procurement & Import)', () => {

  test('PO-01: Kế toán tạo và duyệt đơn mua hàng thành công (happy path)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const poCode = await createPurchaseOrder(page, { quantity: 2, unitPrice: 10000000 });
    await page.goto('/purchase-orders');
    await expect(page.getByText(poCode, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('NK-01: Kế toán tạo phiếu nhập nháp từ PO đã duyệt, Thủ kho quét đủ serial và ghi sổ thành công', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const poCode = await createPurchaseOrder(page, { quantity: 2, unitPrice: 12000000 });

    await page.goto('/purchase-orders');
    await page.getByText(poCode, { exact: true }).click();
    await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
    await expect(page.getByText(/Tạo phiếu nhập kho NK\d+/)).toBeVisible({ timeout: 10000 });

    // Kế toán chỉ lập phiếu dự kiến (không có quyền import:post) — hàng chưa
    // thực về kho nên chưa quét serial ở đây, chỉ Lưu tạm.
    await expect(page.getByRole('button', { name: 'Lưu và ghi sổ' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Lưu tạm' }).click();
    const nkCode = (await page.getByText(/Mã phiếu: NK\d+/).innerText()).match(/NK\d+/)[0];

    // Thủ kho nhận hàng thực tế: mở phiếu nháp vừa tạo, quét đủ serial và ghi sổ.
    await login(page, USERS.WAREHOUSE_STAFF);
    await page.goto('/warehouse-workspace?tab=imports');
    await page.getByText(nkCode, { exact: true }).click();
    await expect(page).toHaveURL(/\/warehouse-workspace\/imports\/\d+/);

    await page.getByRole('button', { name: /Quét serial/ }).click();
    const s1 = `E2E-${Date.now()}-1`;
    const s2 = `E2E-${Date.now()}-2`;
    await scanSerialInModal(page, s1, 1);
    await scanSerialInModal(page, s2, 2);
    await confirmSerialModal(page, 2);

    await page.getByRole('button', { name: 'Xác nhận Ghi sổ kho' }).click();
    await page.getByRole('button', { name: 'Ghi sổ ngay' }).click();
    await expect(page.getByText('Ghi sổ kho thành công! Thẻ kho và số lượng tồn đã được cập nhật.')).toBeVisible({ timeout: 10000 });
  });

  test('NK-02: Thủ kho không thể ghi sổ khi chưa quét đủ số lượng serial khai báo (BR-20 / INV_ERR_042)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const poCode = await createPurchaseOrder(page, { quantity: 2, unitPrice: 9000000 });

    await page.goto('/purchase-orders');
    await page.getByText(poCode, { exact: true }).click();
    await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
    await expect(page.getByText(/Tạo phiếu nhập kho NK\d+/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Lưu tạm' }).click();
    const nkCode = (await page.getByText(/Mã phiếu: NK\d+/).innerText()).match(/NK\d+/)[0];

    await login(page, USERS.WAREHOUSE_STAFF);
    await page.goto('/warehouse-workspace?tab=imports');
    await page.getByText(nkCode, { exact: true }).click();
    await expect(page).toHaveURL(/\/warehouse-workspace\/imports\/\d+/);

    // Chỉ quét 1/2 serial rồi hủy modal — ghi sổ phải bị chặn với cảnh báo
    // thiếu serial (validate ngay trước khi gọi API ghi sổ).
    await page.getByRole('button', { name: /Quét serial/ }).click();
    await scanSerialInModal(page, `E2E-${Date.now()}-partial`, 1);
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();

    await page.getByRole('button', { name: 'Xác nhận Ghi sổ kho' }).click();
    await page.getByRole('button', { name: 'Ghi sổ ngay' }).click();
    await expect(page.getByText(/Vui lòng quét đủ 2 mã serial/)).toBeVisible({ timeout: 10000 });
  });

  test('NK-03: Không thể lưu phiếu khi dòng hàng chưa chọn sản phẩm (BR-19)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    await page.goto('/import-history/create');
    await expect(page.getByText(/Tạo phiếu nhập kho NK\d+/)).toBeVisible({ timeout: 10000 });

    // Loại phiếu mặc định "Nhập kho mua hàng" còn đòi hỏi chọn chứng từ tham
    // chiếu (1 rule khác, không phải cái đang test) — đổi sang "Khác" để bỏ
    // qua yêu cầu đó, tập trung đúng vào rule: dòng hàng chưa chọn sản phẩm.
    await page.getByText('Nhập kho mua hàng', { exact: true }).click();
    await page.getByText('Khác', { exact: true }).click();
    await selectReactSelect(page, 'import-warehouseId', WAREHOUSE_CODE);

    // Không chọn sản phẩm cho dòng hàng mặc định, thử lưu tạm — phải báo lỗi.
    await page.getByRole('button', { name: 'Lưu tạm' }).click();
    await expect(page.getByText(/Vui lòng chọn hàng hóa/i)).toBeVisible({ timeout: 10000 });
  });

  test('PO-02: Hạn công nợ không được nhỏ hơn ngày lập đơn (PO_ERR_003)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    await page.goto('/purchase-orders/create');
    await expect(page.getByText(/Tạo đơn mua hàng mới: PO\d+/)).toBeVisible({ timeout: 10000 });

    await selectReactSelect(page, 'po-supplierId', SUPPLIER_TEXT);
    await selectGridOption(page, 'po-line-product-0', SERIAL_PRODUCT_SKU, SERIAL_PRODUCT_SKU);
    await page.locator('#po-line-qty-0').fill('1');
    await page.locator('#po-line-price-0').fill('5000000');

    await page.locator('#po-paymentDueDate').fill(isoDateOffset(-5));

    await page.getByRole('button', { name: 'Lưu & Duyệt ngay' }).click();
    await expect(page.getByText(/Hạn công nợ không được nhỏ hơn ngày lập đơn/)).toBeVisible({ timeout: 10000 });
  });

  test('PO-03: Không thể duyệt lại một đơn mua hàng đã được duyệt (PO_ERR_002)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const poCode = await createPurchaseOrder(page, { quantity: 1, unitPrice: 8000000 });

    await page.goto('/purchase-orders');
    await page.getByText(poCode, { exact: true }).click();
    await expect(page.getByText('Đã duyệt')).toBeVisible({ timeout: 10000 });
    // Nút "Duyệt đơn" chỉ hiển thị khi đơn ở trạng thái Nháp — sau khi duyệt
    // xong nút phải biến mất, đảm bảo người dùng không thể bấm duyệt 2 lần.
    await expect(page.getByRole('button', { name: 'Duyệt đơn' })).toHaveCount(0);
  });

  test('PO-04: Không thể sửa một đơn mua hàng đã được duyệt (PO_ERR_004)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const poCode = await createPurchaseOrder(page, { quantity: 1, unitPrice: 7000000 });

    await page.goto('/purchase-orders');
    await page.getByText(poCode, { exact: true }).click();
    await expect(page.getByText('Đã duyệt')).toBeVisible({ timeout: 10000 });
    // Trang chi tiết của PO đã duyệt không còn cung cấp thao tác "Sửa đơn".
    await expect(page.getByRole('button', { name: /^Sửa/ })).toHaveCount(0);
  });

  test('NK-04: Số lượng nhập không được vượt quá số lượng còn lại trên PO (INV_ERR_047)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const poCode = await createPurchaseOrder(page, { quantity: 1, unitPrice: 6000000 });

    await page.goto('/purchase-orders');
    await page.getByText(poCode, { exact: true }).click();
    await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
    await expect(page.getByText(/Tạo phiếu nhập kho NK\d+/)).toBeVisible({ timeout: 10000 });

    // PO chỉ đặt 1 chiếc, sửa số lượng nhập lên 5 rồi thử lưu tạm — validate
    // số lượng vượt PO chạy ngay cả khi chỉ lưu nháp (không cần ghi sổ để
    // kiểm tra, vì Kế toán không còn quyền import:post).
    const qtyInput = page.locator('#import-line-qty-0');
    await qtyInput.fill('5');
    await page.getByRole('button', { name: 'Lưu tạm' }).click();
    await expect(page.getByText(/vượt quá số lượng còn lại/i)).toBeVisible({ timeout: 10000 });
  });

  test('NK-05: Từ chối serial trùng đã tồn tại trong kho (BR-21)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);

    // Lô 1: Kế toán tạo phiếu nhập nháp, Thủ kho quét 1 serial cố định và ghi sổ.
    const poCode1 = await createPurchaseOrder(page, { quantity: 1, unitPrice: 11000000 });
    await page.goto('/purchase-orders');
    await page.getByText(poCode1, { exact: true }).click();
    await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
    await expect(page.getByText(/Tạo phiếu nhập kho NK\d+/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Lưu tạm' }).click();
    const nkCode1 = (await page.getByText(/Mã phiếu: NK\d+/).innerText()).match(/NK\d+/)[0];

    const dupSerial = `E2E-DUP-${Date.now()}`;
    await login(page, USERS.WAREHOUSE_STAFF);
    await page.goto('/warehouse-workspace?tab=imports');
    await page.getByText(nkCode1, { exact: true }).click();
    await expect(page).toHaveURL(/\/warehouse-workspace\/imports\/\d+/);
    await page.getByRole('button', { name: /Quét serial/ }).click();
    await scanSerialInModal(page, dupSerial, 1);
    await confirmSerialModal(page, 1);
    await page.getByRole('button', { name: 'Xác nhận Ghi sổ kho' }).click();
    await page.getByRole('button', { name: 'Ghi sổ ngay' }).click();
    await expect(page.getByText('Ghi sổ kho thành công! Thẻ kho và số lượng tồn đã được cập nhật.')).toBeVisible({ timeout: 10000 });

    // Lô 2: Kế toán tạo phiếu nhập nháp thứ 2, Thủ kho cố tình quét lại đúng
    // serial vừa nhập ở lô 1. Modal quét chỉ đối soát cục bộ trong phiếu —
    // chấp nhận nhập lại serial này ở bước quét (progress vẫn lên 1/1). Việc
    // đối chiếu serial đã tồn tại trong kho (BR-21) chỉ được backend chặn
    // thật sự tại thời điểm Ghi sổ.
    await login(page, USERS.ACCOUNTANT);
    const poCode2 = await createPurchaseOrder(page, { quantity: 1, unitPrice: 11000000 });
    await page.goto('/purchase-orders');
    await page.getByText(poCode2, { exact: true }).click();
    await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
    await expect(page.getByText(/Tạo phiếu nhập kho NK\d+/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Lưu tạm' }).click();
    const nkCode2 = (await page.getByText(/Mã phiếu: NK\d+/).innerText()).match(/NK\d+/)[0];

    await login(page, USERS.WAREHOUSE_STAFF);
    await page.goto('/warehouse-workspace?tab=imports');
    await page.getByText(nkCode2, { exact: true }).click();
    await expect(page).toHaveURL(/\/warehouse-workspace\/imports\/\d+/);
    await page.getByRole('button', { name: /Quét serial/ }).click();
    await scanSerialInModal(page, dupSerial, 1);
    await confirmSerialModal(page, 1);
    await page.getByRole('button', { name: 'Xác nhận Ghi sổ kho' }).click();
    await page.getByRole('button', { name: 'Ghi sổ ngay' }).click();
    await expect(page.getByText(/đã tồn tại|đang tồn tại|In Stock/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('PO-05: Super Admin không được truy cập phân hệ nghiệp vụ Đơn mua hàng (RBAC)', async ({ page }) => {
    // AppRouter bọc toàn bộ route nghiệp vụ (bao gồm /purchase-orders) trong
    // ProtectedRoute disallowedRoles=[SUPER_ADMIN, ADMIN] — vào bằng URL trực
    // tiếp sẽ bị điều hướng ngay về /dashboard (route dành riêng cho Admin).
    await login(page, USERS.ADMIN);
    await page.goto('/purchase-orders');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  });

});
