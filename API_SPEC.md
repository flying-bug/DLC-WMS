# API Specification (MISA Architecture Pattern)

Dựa trên cấu trúc của hệ thống ERP chuẩn như MISA (AMIS/SME), tài liệu API này được thiết kế theo tư duy **Nghiệp vụ (Business-driven)**. Mặc dù ở tầng Database có thể gộp chung (ví dụ Nhập/Xuất kho lưu chung bảng `INVENTORY_DOCUMENTS`), nhưng ở tầng API RESTful, chúng ta tách bạch rõ ràng theo từng loại **Danh mục (Dictionaries)** và **Chứng từ (Vouchers)**.

## Nguyên tắc chung
- Định dạng response chuẩn MISA:
  ```json
  {
    "Success": true,
    "Data": { ... },
    "ErrorCode": null,
    "UserMessage": "Thao tác thành công"
  }
  ```
- **Cấu trúc Master-Detail:** Mọi payload tạo Chứng từ (Voucher) đều chia rõ phần Header (thông tin chung) và Details (danh sách mặt hàng).

---

## 1. Hệ thống & Phân quyền (System)
- `POST /api/v1/system/login` - Đăng nhập, trả về JWT Token.
- `GET /api/v1/system/context` - Lấy thông tin user đăng nhập, danh sách quyền, và chi nhánh/kho mặc định.

## 2. Nhóm Danh mục (Dictionaries - Master Data)
Danh mục là các dữ liệu gốc được thiết lập một lần và sử dụng lại nhiều lần trong các chứng từ.
- `GET|POST /api/v1/dictionaries/employees` - Danh mục Nhân viên (`USERS`).
- `GET|POST /api/v1/dictionaries/account-objects` - Danh mục Đối tượng (`PARTNERS` - bao gồm Khách hàng, Nhà cung cấp).
- `GET|POST /api/v1/dictionaries/inventory-items` - Danh mục Hàng hóa, vật tư (`PRODUCTS`, `PRODUCT_VARIANTS`).
- `GET|POST /api/v1/dictionaries/stocks` - Danh mục Kho (`WAREHOUSES`).
- `GET|POST /api/v1/dictionaries/item-categories` - Danh mục Nhóm vật tư hàng hóa.

## 3. Quản lý Kho (Inventory - Stock)
Đây là phần giải quyết vấn đề gộp bảng. Dù dùng chung bảng `INVENTORY_DOCUMENTS`, API vẫn tách riêng biệt từng loại nghiệp vụ kho (tương tự `INInward` và `INOutward` trong MISA):

- **Phiếu Nhập Kho (Inward Note):**
  - `GET /api/v1/inventory/inwards` - Danh sách phiếu nhập.
  - `POST /api/v1/inventory/inwards` - Tạo phiếu nhập (Tự động gán `doc_type = 'IN_PO'`).
- **Phiếu Xuất Kho (Outward Note):**
  - `GET /api/v1/inventory/outwards` - Danh sách phiếu xuất.
  - `POST /api/v1/inventory/outwards` - Tạo phiếu xuất (Tự động gán `doc_type = 'EX_SO'`).
- **Phiếu Chuyển Kho (Transfer Note):**
  - `GET|POST /api/v1/inventory/transfers`
- **Tồn kho & Định danh:**
  - `GET /api/v1/inventory/balances` - Xem sổ tồn kho tức thời.
  - `GET /api/v1/inventory/serials` - Tra cứu hành trình của Serial/Lot.

## 4. Mua hàng (Purchasing)
- `GET|POST /api/v1/purchasing/orders` (PUOrder) - Đơn mua hàng.
- `GET|POST /api/v1/purchasing/vouchers` (PUVoucher) - Chứng từ mua hàng (Từ đây có thể kế thừa dữ liệu để tự động sinh ra Phiếu nhập kho).

## 5. Bán hàng (Sales)
- `GET|POST /api/v1/sales/orders` (SAOrder) - Đơn đặt hàng của khách.
- `GET|POST /api/v1/sales/vouchers` (SAVoucher) - Chứng từ bán hàng.

## 6. Tiền mặt & Ngân hàng (Cash & Bank)
Quản lý phân hệ tài chính (Dựa trên `PAYMENT_VOUCHERS` và `PAYMENT_RECEIPTS`):
- `GET|POST /api/v1/cash/receipts` (CAReceipt) - Phiếu thu (Ví dụ: Thu tiền khách hàng trả nợ).
- `GET|POST /api/v1/cash/payments` (CAPayment) - Phiếu chi (Ví dụ: Thanh toán tiền cho nhà cung cấp).

## 7. Bảo hành & Dịch vụ (Warranty & Service)
- `GET|POST /api/v1/services/warranties` - Phiếu tiếp nhận bảo hành (Check validation dựa vào Serial Number).
- `GET|POST /api/v1/services/repairs` - Lệnh sửa chữa.

## 8. Lắp ráp Máy tính (Manufacturing)
- `GET|POST /api/v1/manufacturing/boms` - Danh mục Định mức nguyên vật liệu (BOM).
- `GET|POST /api/v1/manufacturing/assembly-orders` - Lệnh lắp ráp/rã xác. (Khi hoàn thành, lệnh này sẽ tự động gọi tầng Service để sinh 1 Phiếu xuất kho cho linh kiện và 1 Phiếu nhập kho cho thành phẩm).

---

## Ví dụ Payload Mẫu cho Chứng từ (Chuẩn Master - Detail)
**POST `/api/v1/inventory/inwards` (Tạo Phiếu Nhập Kho)**
```json
{
  "refNo": "PNK00001",
  "refDate": "2026-06-07T00:00:00",
  "accountObjectId": 12, // ID Nhà cung cấp
  "stockId": 2, // ID Kho nhận
  "journalMemo": "Nhập linh kiện PC đợt 1",
  "details": [
    {
      "inventoryItemId": 105, // ID Biến thể sản phẩm (Variant)
      "quantity": 10,
      "unitCost": 5000000,
      "serials": ["VGA-001", "VGA-002"] // Nếu mặt hàng có quản lý Serial
    }
  ]
}
```
