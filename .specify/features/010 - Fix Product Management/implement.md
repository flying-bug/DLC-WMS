# Implementation Guide: Fix Product Management

**Feature**: `[010-fix-product-management]`  
**Created**: 2026-09-04  
**Status**: Ready for Implementation  
**Inputs**: `spec.md`, `clarify.md`, `plan.md`, `data-model.md`, `tasks.md`

## 1. Mục tiêu triển khai

Triển khai luồng tạo Product mới để hỗ trợ cả hai trường hợp:

- Single mode: tạo Product và đúng một default Variant như hành vi cũ.
- Multi-variant mode: tạo Product cùng danh sách 1-100 Variant/SKU trong một lần submit.

Feature này không thay đổi mô hình database. `ProductVariant` tiếp tục là nơi quản lý SKU, giá, tracking, tồn tối thiểu và bảo hành. `SerialNumber` chỉ phát sinh trong các luồng nhập kho, lắp ráp hoặc tồn đầu kỳ, không phát sinh khi tạo Product.

## 2. Nguyên tắc triển khai

- Không thêm bảng `SKU`, bảng thuộc tính hoặc migration schema mới.
- Không thêm dependency backend/frontend.
- Không tạo tồn kho, ledger, lot hoặc serial trong luồng Product.
- Không tự suy luận multi mode từ `variants`; phải dựa vào `hasVariants`.
- Validate backend đầy đủ dù frontend đã validate.
- Giữ `POST /api/v1/products` trả `200 OK` để tương thích client hiện tại.
- Giữ modal quản lý SKU hiện có cho Product đã tạo; feature này chỉ bổ sung khả năng tạo SKU ngay trong form thêm mới.

## 3. Thứ tự triển khai khuyến nghị

### Phase A - Backend contract

Thực hiện trước để khóa API shape và giữ compile.

1. Sửa `ProductRequest`
   - Thêm `Boolean hasVariants`.
   - Thêm `List<ProductVariantRequest> variants`.
   - Bỏ `@NotNull` tuyệt đối trên `salePrice`; chuyển sang validate theo mode trong service.

2. Sửa `ProductResponse`
   - Thêm `List<ProductVariantResponse> variants`.
   - Populate ở create/detail.
   - Không bắt buộc populate ở list/search để tránh N+1.

3. Sửa `ProductVariantRepository`
   - Thêm batch query cho SKU collection.
   - Thêm batch query cho barcode collection.

4. Sửa `SystemMessage`
   - Thêm error message/code cho mode sai, duplicate SKU/barcode/specs, invalid specs JSON, count vượt giới hạn, tracking không hợp lệ.

Checkpoint: chạy `cd backend; .\mvnw.cmd -DskipTests compile`.

### Phase B - Backend create logic

Trọng tâm nằm trong `ProductService.createProduct(...)`.

1. Thêm resolver mode theo truth table:

| `hasVariants` | `variants` | Mode/Kết quả |
|---:|---|---|
| null | null/empty | Single |
| false | null/empty | Single |
| true | 1-100 rows | Multi |
| true | null/empty | Reject |
| false | non-empty | Reject |
| null | non-empty | Reject |

2. Single mode
   - Validate `salePrice` ở Product.
   - Giữ logic sinh `productCode` nếu trống.
   - Tạo đúng một default Variant.
   - Default Variant dùng `productCode` sau khi sinh làm SKU.
   - Copy `salePrice`, `minStockQty`, warranty, active và tracking từ Product sang Variant.

3. Multi mode
   - Bắt buộc `productCode`.
   - Validate 1-100 Variant.
   - Validate ít nhất một Variant active.
   - Normalize SKU: trim + uppercase.
   - Normalize barcode: trim, blank thành null.
   - Parse `specsJson` bằng Jackson `ObjectMapper`; chỉ nhận JSON object.
   - Tạo canonical specs key để chặn tổ hợp trùng.
   - Batch check duplicate SKU/barcode trong request và database.
   - Save Product, unit conversions và `saveAll` Variants trong cùng transaction.
   - Không gọi `createDefaultVariant`.

4. Product type rules
   - `Dịch vụ`: chỉ single mode, tracking `NONE`, min stock `0`.
   - `Thành phẩm` hoặc `isAssembly=true`: tất cả Variant phải có tracking chứa serial (`SERIAL` hoặc `SERIAL_LOT`).

5. Atomicity
   - Validate batch trước khi save càng nhiều càng tốt.
   - Flush trong transaction để bắt unique conflict.
   - Convert `DataIntegrityViolationException` thành business duplicate error, không trả lỗi SQL thô.

### Phase C - Backend response, audit và guard

1. Response
   - Create response trả Product kèm danh sách Variant đã tạo.
   - Detail response trả Product kèm danh sách Variant.

2. Audit
   - Ghi success với Product ID/code/variant count.
   - Audit failure chỉ log warning, không làm API create thất bại sau khi data đã commit.

3. Guard update Variant
   - Tái sử dụng logic kiểm tra operational references từ `deleteVariant(...)`.
   - Chặn đổi SKU nếu Variant đã có chứng từ, tồn, serial hoặc BOM.
   - Chặn đổi tracking mode nếu Variant đã có operational references.
   - Vẫn cho đổi tên, giá, MPN, min stock, warranty, active nếu không vi phạm rule khác.

### Phase D - Frontend utility

Tạo `frontend/src/pages/Product/utils/variantCombinationUtils.js`.

Utility cần có tối thiểu:

- Normalize attribute name/value.
- Canonical combination key.
- Cartesian product ổn định.
- Guard số tổ hợp trước khi sinh quá 100 rows.
- SKU slug generator: uppercase, bỏ dấu tiếng Việt, ký tự lạ thành `-`, tối đa 50 ký tự, xử lý trùng bằng hậu tố.
- Merge rows theo canonical key.
- Giữ dirty row.
- Áp dụng `excludedCombinationKeys`.

Tạo test bằng Node built-in:

- `frontend/src/pages/Product/utils/variantCombinationUtils.test.js`
- Script `test:variants` trong `frontend/package.json`: `node --test`.

Không thêm Jest/Vitest nếu repo chưa có sẵn test runner phù hợp cho phần này.

### Phase E - Frontend configurator

Tạo `frontend/src/pages/Product/components/ProductVariantConfigurator.jsx`.

Component cần xử lý:

- Switch `Quản lý theo phiên bản/SKU`.
- Không cho bật multi mode nếu `productCode` trống.
- Không cho bật multi mode với Product type `Dịch vụ`.
- Tối đa 3 attribute rows.
- Nhập value bằng Enter hoặc dấu phẩy.
- Validate duplicate attribute/value theo normalize rule.
- Hiển thị số tổ hợp và lỗi nếu vượt 100.
- Bảng Variant gồm: variant name, SKU, barcode, sale price, cost price, MPN, min stock, tracking, warranty, active, delete.
- Apply to all cho các field hay nhập lặp.
- `skuManuallyEdited` để không ghi đè SKU người dùng đã sửa.
- `isDirty` để cảnh báo khi tái sinh bảng.
- `excludedCombinationKeys` để xóa tạm một tổ hợp và khôi phục tất cả.

### Phase F - Tích hợp ProductPage

Sửa `frontend/src/pages/Product/ProductPage.jsx`.

1. Chèn configurator giữa `Thông tin chung` và `Đơn vị chuyển đổi`.
2. Single mode
   - Giữ các field vận hành cấp Product như hiện tại.
   - Submit `hasVariants=false`, `variants=[]`.

3. Multi mode
   - Disable hoặc ẩn các field vận hành cấp Product.
   - Submit `hasVariants=true`.
   - Map rows thành `ProductVariantRequest[]`.
   - Gửi number thật cho giá/min stock/warranty, không gửi chuỗi format tiền.
   - Gửi `specsJson` là JSON string hợp lệ.

4. Error handling
   - Map backend error theo row index/SKU vào đúng row nếu backend trả đủ context.
   - Nếu không map được, hiển thị lỗi submit chung.

5. Sau khi tạo thành công
   - Refresh Product/Variant data.
   - Reset configurator.
   - Giữ nguyên workflow edit Product và modal SKU hiện có.

## 4. Backend implementation notes

### 4.1. Mode resolver

Nên dùng private enum/helper trong `ProductService`, không cần tạo class riêng.

```java
private enum ProductCreateMode {
    SINGLE,
    MULTI
}
```

Rules nằm gần `createProduct(...)` để dễ đọc và dễ test.

### 4.2. Canonical specs

Quy tắc backend:

1. Parse `specsJson` thành `JsonNode`.
2. Reject nếu không phải object.
3. Với từng field:
   - Normalize key/value bằng `Normalizer.normalize(value, Normalizer.Form.NFC)`.
   - Trim.
   - Collapse whitespace.
   - Lowercase bằng `Locale.ROOT`.
4. Sort theo normalized key.
5. Join dạng `key=value|key=value`.

Default Variant có thể để `specsJson = null` hoặc `{}` theo hành vi hiện tại. Explicit Variant phải có object không rỗng.

### 4.3. SKU và barcode

- SKU lưu sau khi trim + uppercase.
- Barcode blank thành null.
- Barcode nhập tay trim nhưng không ép uppercase khi lưu, chỉ dùng normalized lowercase/uppercase để so trùng.
- Barcode null thì dùng generator hiện có nếu đã có; nếu chưa có helper, tạo private helper nhỏ trong `ProductService`.

### 4.4. Validation error

Ưu tiên trả message có ngữ cảnh:

```text
Variant dòng 3: SKU RAM-16GB-BLK đã tồn tại
Variant dòng 4: specsJson phải là JSON object
```

Không cần thiết kế error DTO mới nếu hệ thống đang dùng `BusinessException` + message. Chỉ thêm DTO khi frontend bắt buộc cần structured row errors.

## 5. Frontend implementation notes

### 5.1. State tối thiểu

Configurator chỉ cần giữ:

```text
enabled: boolean
attributes: AttributeDefinition[]
rows: VariantDraftRow[]
defaults: VariantDefaults
excludedCombinationKeys: string[]
errors: object
```

Không đưa `attributes`, `skuManuallyEdited`, `isDirty`, `excludedCombinationKeys` vào request.

### 5.2. Payload shape

Multi mode gửi:

```json
{
  "hasVariants": true,
  "variants": [
    {
      "sku": "DELL-I15-I5-16-512-BLK",
      "barcode": null,
      "variantName": "Đen / 16GB / 512GB",
      "costPrice": 0,
      "salePrice": 15000000,
      "manufacturerPartNumber": "ABC-123",
      "specsJson": "{\"Màu sắc\":\"Đen\",\"RAM\":\"16GB\",\"SSD\":\"512GB\"}",
      "trackingMode": "SERIAL",
      "minStockQty": 1,
      "warrantyMonths": 12,
      "active": true
    }
  ]
}
```

Single mode gửi:

```json
{
  "hasVariants": false,
  "variants": []
}
```

Các field Product hiện có vẫn gửi bình thường.

## 6. Test checklist

### Backend automated

- Payload cũ không có `hasVariants` tạo đúng một default Variant.
- `hasVariants=false` + `variants=[]` tạo đúng một default Variant.
- `hasVariants=false` + non-empty variants bị reject.
- `hasVariants=null` + non-empty variants bị reject.
- `hasVariants=true` + empty variants bị reject.
- `hasVariants=true` + 101 variants bị reject.
- Duplicate SKU trong request bị reject.
- Duplicate barcode trong request bị reject.
- SKU/barcode đã tồn tại trong database bị reject.
- `specsJson` array/scalar/invalid JSON bị reject.
- Specs object trùng key canonical bị reject.
- Multi create thành công không tạo default Variant thừa.
- Multi create rollback toàn bộ nếu một Variant lỗi.
- Create Product không tạo Inventory Balance, Ledger, Lot hoặc Serial.
- `Dịch vụ` không cho multi mode và tracking khác `NONE`.
- `Thành phẩm`/assembly bắt buộc serial tracking.
- Response create có danh sách Variant gồm ID, SKU, barcode, tracking.
- Update Variant đã có reference không cho đổi SKU/tracking.

### Frontend automated

- Normalize attribute/value đúng rule.
- Canonical key không phụ thuộc thứ tự object.
- Cartesian product sinh đúng thứ tự.
- Không sinh rows khi vượt 100 tổ hợp.
- SKU generator bỏ dấu, uppercase, giới hạn 50 ký tự.
- SKU generator xử lý collision bằng hậu tố.
- Merge giữ dirty row theo canonical key.
- Excluded combinations không xuất hiện sau regenerate.

### Manual QA

- Tạo Product single SKU bằng form cũ.
- Tạo Product multi SKU 2x2.
- Sửa SKU một dòng, đổi Product code, xác nhận SKU sửa tay không bị ghi đè.
- Sửa giá một dòng, thêm attribute value, confirm merge giữ giá dòng cũ.
- Xóa một tổ hợp, regenerate, tổ hợp vẫn bị loại.
- Khôi phục tất cả tổ hợp.
- Tắt multi mode khi có dữ liệu, cancel giữ nguyên, confirm reset đúng.
- Submit lỗi duplicate SKU hiển thị đúng dòng.

## 7. Lệnh kiểm tra

Backend:

```powershell
cd backend
.\mvnw.cmd -DskipTests compile
.\mvnw.cmd test
```

Frontend:

```powershell
cd frontend
npm.cmd run test:variants
npm.cmd run build
```

## 8. Done criteria

- Backend compile và tests pass.
- Frontend utility tests và build pass.
- Product create single vẫn tương thích payload cũ.
- Product create multi tạo đúng N Variant trong một transaction.
- Không còn trường hợp Product được tạo mà thiếu toàn bộ Variant.
- Không có default Variant thừa khi `hasVariants=true`.
- Không tạo stock, lot, ledger hoặc serial trong create Product.
- Audit lỗi không làm response create thành lỗi giả.
- SKU/tracking của Variant đã có dữ liệu vận hành được bảo vệ.

## 9. Việc cố ý chưa làm

- Chưa chuẩn hóa attribute thành master data riêng.
- Chưa import Product/Variant bằng Excel.
- Chưa tạo bảng SKU riêng.
- Chưa tạo serial/lot/tồn đầu kỳ trong form Product.
- Chưa thiết kế lại toàn bộ màn hình Product; chỉ mở rộng form thêm mới.

Các phần trên chỉ nên làm khi có nghiệp vụ riêng, dữ liệu đủ lớn hoặc quy trình vận hành yêu cầu rõ ràng.
