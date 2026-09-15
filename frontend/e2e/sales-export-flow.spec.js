// @ts-check
import { test, expect } from '@playwright/test';
import { USERS } from './fixtures/test-data.js';
import { login, scanSerialInModal, confirmSerialModal, selectReactSelect, selectGridOption } from './fixtures/helpers.js';

/**
 * Luồng Bán hàng & Xuất kho (Sales -> Export).
 * Dữ liệu seed dùng chung: khách hàng KH000003 (Bộ Đỗ Duy), sản phẩm quản lý
 * serial VGA-RTX4070TI-16G, kho KHO001. Xem docs/SYSTEM_ROLES_AND_WORKFLOW_SPEC.md
 * mục 5 cho vòng đời chứng từ và docs/BUSINESS_RULES.md mục V (BR-24..BR-29,
 * map sang INV_ERR_xxx trong SystemMessage.java) cho các rule được test ở đây.
 *
 * Các test ghi sổ xuất kho dùng USERS.MANAGER để khớp với vai trò thực tế vận
 * hành kho theo docs/SYSTEM_ROLES_AND_WORKFLOW_SPEC.md mục 5 (Thủ kho/Quản lý
 * xác nhận xuất kho), dù giao diện hiện tại không ẩn hành động này khỏi Kế
 * toán ở cấp trang. Ranh giới quyền có thể kiểm chứng chắc chắn ở tầng route
 * là ProtectedRoute disallowedRoles=[SUPER_ADMIN, ADMIN] — xem XK-05/SO-05.
 *
 * LƯU Ý VỀ TỒN KHO: khi Duyệt đơn bán hàng, hệ thống giữ chỗ (reserve) số
 * lượng trong 72 giờ — nhưng KHÔNG kiểm tra tồn kho thực tế tại thời điểm
 * duyệt (xem SalesOrderDetailPage.jsx — chỉ có nút "Hủy đơn" khi status =
 * DRAFT, không có cách hủy/giải phóng giữ chỗ sau khi đã duyệt qua UI). Vì
 * vậy mỗi lần chạy suite này để lại vài đơn "Đã duyệt" giữ chỗ vĩnh viễn (tới
 * khi hết hạn 72h). Cố tình dùng VGA-RTX4070TI-16G thay vì LAP-G16-I9-4080 ở
 * đây (khác SKU với procurement-import-flow.spec.js) để không cộng dồn giữ
 * chỗ lên cùng 1 sản phẩm dùng chung giữa nhiều lần chạy 2 file test song
 * song — xem thêm ghi chú ở XK-04 (sản phẩm không-serial, tách biệt tiếp).
 */

const CUSTOMER_TEXT = 'KH000003';
const SERIAL_PRODUCT_SKU = 'VGA-RTX4070TI-16G';
const WAREHOUSE_CODE = 'KHO001';
const SUPPLIER_TEXT = 'NCC00003';
const BULK_STOCK_QTY = 20;

/**
 * Nhập kho sẵn N serial mới (qua luồng PO -> Phiếu nhập -> Ghi sổ, giống hệt
 * procurement-import-flow.spec.js) rồi trả về danh sách serial vừa tạo.
 */
async function importFreshStock(page, quantity) {
  await login(page, USERS.ACCOUNTANT);
  await page.goto('/purchase-orders/create');
  await expect(page.getByText(/Tạo đơn mua hàng mới: PO\d+/)).toBeVisible({ timeout: 10000 });
  await selectReactSelect(page, 'po-supplierId', SUPPLIER_TEXT);
  await selectGridOption(page, 'po-line-product-0', SERIAL_PRODUCT_SKU, SERIAL_PRODUCT_SKU);
  await page.locator('#po-line-qty-0').fill(String(quantity));
  await page.locator('#po-line-price-0').fill('15000000');
  await page.getByRole('button', { name: 'Lưu & Duyệt ngay' }).click();
  const poToast = page.getByText(/Tạo và duyệt đơn PO\d+ thành công/);
  await expect(poToast).toBeVisible({ timeout: 15000 });
  const poCode = (await poToast.innerText()).match(/PO\d+/)[0];

  await page.goto('/purchase-orders');
  await page.getByText(poCode, { exact: true }).click();
  await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
  await expect(page.getByText(/Tạo phiếu nhập kho NK\d+/)).toBeVisible({ timeout: 10000 });

  // Kế toán không còn quyền ghi sổ (import:post) — chỉ lưu nháp, việc quét
  // serial thực tế và ghi sổ chuyển sang cho Thủ kho xử lý bên dưới.
  await page.getByRole('button', { name: 'Lưu tạm' }).click();
  const nkCode = (await page.getByText(/Mã phiếu: NK\d+/).innerText()).match(/NK\d+/)[0];

  const serials = Array.from({ length: quantity }, (_, i) => `E2E-STOCK-${Date.now()}-${i}`);

  await login(page, USERS.WAREHOUSE_STAFF);
  await page.goto('/warehouse-workspace?tab=imports');
  await page.getByText(nkCode, { exact: true }).click();
  await expect(page).toHaveURL(/\/warehouse-workspace\/imports\/\d+/);

  await page.getByRole('button', { name: /Quét serial/ }).click();
  // Dán 1 lần nhiều serial (modal hỗ trợ copy/paste nhiều dòng) thay vì quét
  // từng cái một — nhanh hơn nhiều khi quantity lớn.
  await page.getByPlaceholder(/Bắn súng mã vạch|Bắn súng mã/).fill(serials.join('\n'));
  await page.getByRole('button', { name: /Nhận/ }).click();
  await expect(page.getByText(`Đã quét thực tế: ${quantity} /`)).toBeVisible({ timeout: 15000 });
  await confirmSerialModal(page, quantity);
  await page.getByRole('button', { name: 'Xác nhận Ghi sổ kho' }).click();
  await page.getByRole('button', { name: 'Ghi sổ ngay' }).click();
  await expect(page.getByText('Ghi sổ kho thành công! Thẻ kho và số lượng tồn đã được cập nhật.')).toBeVisible({ timeout: 20000 });
  return serials;
}

/**
 * Tạo 1 đơn bán hàng (chế độ Báo giá, không phải bán tại quầy) với 1 dòng
 * sản phẩm serial, trả về mã SO vừa tạo.
 */
async function createSalesOrder(page, { quantity = 1, unitPrice = 20000000, approve = true, productSku = SERIAL_PRODUCT_SKU } = {}) {
  await page.goto('/sales-orders/create');
  await page.getByRole('button', { name: 'Tạo đơn báo giá' }).click();
  await expect(page.getByText(/Tạo đơn bán hàng \/ Báo giá/)).toBeVisible({ timeout: 10000 });

  await selectReactSelect(page, 'so-partnerId', CUSTOMER_TEXT);

  await selectGridOption(page, 'so-line-wh-0', WAREHOUSE_CODE, WAREHOUSE_CODE);
  await selectGridOption(page, 'so-line-code-0', productSku, productSku);
  await page.locator('#so-line-qty-0').fill(String(quantity));
  await page.locator('#so-line-price-0').fill(String(unitPrice));

  const saveBtn = approve
    ? page.getByRole('button', { name: 'Lưu & Duyệt ngay' })
    : page.getByRole('button', { name: 'Lưu nháp' });
  await saveBtn.click();
  const successToast = page.getByText(/Tạo (và duyệt )?đơn SO\d+ thành công/);
  await expect(successToast).toBeVisible({ timeout: 10000 });
  const soCode = (await successToast.innerText()).match(/SO\d+/)[0];
  return soCode;
}

/** Mở đơn bán hàng theo mã, bấm "Tạo phiếu xuất kho" và chờ form xuất kho tải xong. */
async function openCreateExportFromSo(page, soCode) {
  await page.goto('/sales-orders');
  await page.getByText(soCode, { exact: true }).click();
  await page.getByRole('button', { name: 'Tạo phiếu xuất kho' }).click();
  await expect(page.getByText(/Tạo phiếu xuất kho XK\d+/)).toBeVisible({ timeout: 10000 });
}

test.describe('Luồng Bán hàng & Xuất kho (Sales & Export)', () => {
  /** @type {string[]} */
  let bulkStockSerials = [];

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60000);
    const page = await browser.newPage();
    bulkStockSerials = await importFreshStock(page, BULK_STOCK_QTY);
    await page.close();
  });

  test('SO-01: Kế toán tạo và duyệt đơn bán hàng thành công (happy path)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const soCode = await createSalesOrder(page, { quantity: 1, unitPrice: 18000000 });
    await page.goto('/sales-orders');
    await expect(page.getByText(soCode, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('XK-01: Quản lý tạo phiếu xuất từ SO đã duyệt, quét serial và ghi sổ thành công', async ({ page }) => {
    const ownSerial = bulkStockSerials[0];
    await login(page, USERS.ACCOUNTANT);
    const soCode = await createSalesOrder(page, { quantity: 1, unitPrice: 21000000 });
    await login(page, USERS.MANAGER);

    await openCreateExportFromSo(page, soCode);

    const scanBar = page.getByPlaceholder('Đặt con trỏ vào đây rồi quét mã');
    await scanBar.fill(SERIAL_PRODUCT_SKU);
    await scanBar.press('Enter');

    const serialBtn = page.getByRole('button', { name: /0 \/ 1/ });
    await expect(serialBtn).toBeVisible({ timeout: 10000 });
    await serialBtn.click();
    await scanSerialInModal(page, ownSerial, 1);
    await confirmSerialModal(page, 1);

    await page.getByRole('button', { name: 'Lưu và ghi sổ' }).click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('Lưu & ghi sổ phiếu xuất kho thành công!')).toBeVisible({ timeout: 10000 });
  });

  test('SO-02: Không thể tạo đơn bán hàng khi chưa chọn khách hàng (SO_ERR_004)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    await page.goto('/sales-orders/create');
    await page.getByRole('button', { name: 'Tạo đơn báo giá' }).click();
    await expect(page.getByText(/Tạo đơn bán hàng \/ Báo giá/)).toBeVisible({ timeout: 10000 });

    await selectGridOption(page, 'so-line-wh-0', WAREHOUSE_CODE, WAREHOUSE_CODE);
    await selectGridOption(page, 'so-line-code-0', SERIAL_PRODUCT_SKU, SERIAL_PRODUCT_SKU);
    await page.locator('#so-line-qty-0').fill('1');
    await page.locator('#so-line-price-0').fill('15000000');

    await page.getByRole('button', { name: 'Lưu & Duyệt ngay' }).click();
    await expect(page.getByText(/Vui lòng chọn khách hàng/)).toBeVisible({ timeout: 10000 });
  });

  test('SO-03: Không thể lưu đơn khi dòng hàng chưa chọn sản phẩm', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    await page.goto('/sales-orders/create');
    await page.getByRole('button', { name: 'Tạo đơn báo giá' }).click();
    await expect(page.getByText(/Tạo đơn bán hàng \/ Báo giá/)).toBeVisible({ timeout: 10000 });

    await selectReactSelect(page, 'so-partnerId', CUSTOMER_TEXT);
    // Không chọn sản phẩm cho dòng hàng mặc định, thử lưu ngay.
    await page.getByRole('button', { name: 'Lưu & Duyệt ngay' }).click();
    await expect(page.getByText(/chưa chọn sản phẩm/)).toBeVisible({ timeout: 10000 });
  });

  test('SO-04: Không thể duyệt lại một đơn bán hàng đã được duyệt (SO_ERR_006)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const soCode = await createSalesOrder(page, { quantity: 1, unitPrice: 16000000 });
    await page.goto('/sales-orders');
    await page.getByText(soCode, { exact: true }).click();
    await expect(page.getByText('Đã duyệt')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Duyệt đơn' })).toHaveCount(0);
  });

  test('XK-02: Không thể ghi sổ xuất kho khi chưa quét serial (BR-26 / INV_ERR_032)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const soCode = await createSalesOrder(page, { quantity: 1, unitPrice: 19000000 });
    await login(page, USERS.MANAGER);

    await openCreateExportFromSo(page, soCode);
    const scanBar = page.getByPlaceholder('Đặt con trỏ vào đây rồi quét mã');
    await scanBar.fill(SERIAL_PRODUCT_SKU);
    await scanBar.press('Enter');
    await expect(page.getByRole('button', { name: /0 \/ 1/ })).toBeVisible({ timeout: 10000 });

    // Không quét serial nào, thử ghi sổ luôn.
    await page.getByRole('button', { name: 'Lưu và ghi sổ' }).click();
    const confirmBtn = page.getByRole('button', { name: 'Xác nhận' });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }
    await expect(page.getByText(/serial|Serial/).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Tạo phiếu xuất kho XK\d+/)).toBeVisible();
  });

  test('XK-03: Serial không tồn tại/không sẵn trong kho bị chặn khi ghi sổ (BR-26/BR-27)', async ({ page }) => {
    await login(page, USERS.ACCOUNTANT);
    const soCode = await createSalesOrder(page, { quantity: 1, unitPrice: 17000000 });
    await login(page, USERS.MANAGER);

    await openCreateExportFromSo(page, soCode);
    const scanBar = page.getByPlaceholder('Đặt con trỏ vào đây rồi quét mã');
    await scanBar.fill(SERIAL_PRODUCT_SKU);
    await scanBar.press('Enter');
    const serialBtn = page.getByRole('button', { name: /0 \/ 1/ });
    await expect(serialBtn).toBeVisible({ timeout: 10000 });
    await serialBtn.click();

    // Modal quét chỉ đối soát cục bộ trong phiếu (chấp nhận bất kỳ chuỗi nào
    // đủ số lượng khai báo) — việc serial có thực sự tồn tại & sẵn trong kho
    // xuất hay không (BR-26/BR-27) chỉ được backend chặn thật tại lúc Ghi sổ.
    await scanSerialInModal(page, `NON-EXISTENT-${Date.now()}`, 1);
    await confirmSerialModal(page, 1);
    await page.getByRole('button', { name: 'Lưu và ghi sổ' }).click();
    const confirmBtn = page.getByRole('button', { name: 'Xác nhận' });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }
    // Backend không nhận diện được serial giả này là một đơn vị tồn kho thật
    // (IN_STOCK) nào của SKU — xử lý coi như CHƯA quét serial cho dòng hàng
    // (cùng thông báo INV_ERR_032 với trường hợp bỏ trống serial ở XK-02).
    await expect(page.getByText(/quản lý serial.*quét serial|không có sẵn trong kho|không tồn tại|vượt quá (số lượng )?tồn kho/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('XK-04: Số lượng xuất không được vượt quá tồn kho khả dụng (BR-24 / BR-25)', async ({ page }) => {
    // Cố tình dùng 1 sản phẩm KHÔNG quản lý serial, tách biệt hẳn khỏi SKU
    // laptop dùng chung ở các test khác: mỗi lần chạy suite, 1 Đơn bán hàng
    // "Đã duyệt" giữ chỗ vĩnh viễn (UI không cho hủy đơn sau khi đã duyệt —
    // xem ghi chú đầu file) sẽ cộng dồn tồn đọng trên SKU đó; nếu dùng chung
    // SKU laptop với XK-01/NK-xx thì lượng giữ chỗ khổng lồ (qty rất lớn) sẽ
    // ngày càng nuốt hết tồn kho thật của các lần chạy sau. Không cần serial
    // vì sản phẩm này không bật track_serial — chặn được ngay ở bước Ghi sổ
    // mà không cần qua modal quét.
    await login(page, USERS.ACCOUNTANT);
    const qty = 1000;
    const soCode = await createSalesOrder(page, {
      quantity: qty,
      unitPrice: 100000,
      productSku: 'SP00004',
    });
    await login(page, USERS.MANAGER);

    await openCreateExportFromSo(page, soCode);
    await page.getByRole('button', { name: 'Lưu và ghi sổ' }).click();
    const confirmBtn = page.getByRole('button', { name: 'Xác nhận' });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }
    await expect(page.getByText(/vượt quá (số lượng )?tồn kho|không thể xuất kho/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('XK-05: Super Admin không được truy cập phân hệ nghiệp vụ Phiếu xuất kho (RBAC)', async ({ page }) => {
    // Cùng cơ chế ProtectedRoute disallowedRoles như PO-05 — áp dụng cho toàn
    // bộ route nghiệp vụ, bao gồm /export-slips.
    await login(page, USERS.ADMIN);
    await page.goto('/export-slips');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  });

  test('SO-05: Super Admin không được truy cập phân hệ nghiệp vụ Đơn bán hàng (RBAC)', async ({ page }) => {
    await login(page, USERS.ADMIN);
    await page.goto('/sales-orders');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  });

});
