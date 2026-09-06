# Feature Specification: Fix Product Management - Tạo Product cùng nhiều SKU/Variant

**Feature Branch**: `[010-fix-product-management]`  
**Created**: 2026-09-04  
**Status**: Ready for Planning  
**Input**: Tích hợp quản lý SKU/Variant trực tiếp vào form thêm mới hàng hóa của DLC-WMS.

## 1. Kết luận phân tích

Hệ thống hiện đã có mô hình dữ liệu `Product 1 - N ProductVariant` và các API riêng để quản lý Variant sau khi Product được tạo. Tuy nhiên, quy trình tạo master data đang bị chia thành hai bước: tạo Product trước, sau đó mở màn hình quản lý SKU để tạo từng Variant.

Phương án phù hợp nhất là mở rộng luồng tạo Product hiện tại để nhận danh sách Variant trong cùng request và lưu toàn bộ trong một transaction. Không tạo thêm bảng thuộc tính hoặc bảng SKU mới vì `PRODUCT_VARIANTS` và `specsJson` đã đáp ứng phạm vi nghiệp vụ này.

Các quyết định nghiệp vụ chính:

- `Product` là dòng/model sản phẩm, ví dụ `Dell Inspiron 15 3530`.
- `ProductVariant` là một cấu hình có thể mua, bán, định giá và quản lý tồn kho độc lập.
- `SKU` là mã duy nhất của `ProductVariant`, không phải một entity riêng.
- `SerialNumber` nhận diện từng thiết bị vật lý và chỉ được tạo khi nhập kho, lắp ráp hoặc nhập tồn đầu kỳ; không tạo ở form Product.
- Giá bán, giá vốn tham chiếu, tồn tối thiểu, thời hạn bảo hành và phương thức tracking thuộc Variant.
- Dù sản phẩm không có nhiều lựa chọn, hệ thống vẫn phải có đúng một default Variant để mọi chứng từ tiếp tục sử dụng `variantId`.

## 2. Mục tiêu

- Cho phép người dùng tạo một Product và một hoặc nhiều SKU trong một lần lưu.
- Giảm thao tác chuyển màn hình và nhập lại dữ liệu khi khai báo hàng hóa mới.
- Bảo đảm dữ liệu Product và toàn bộ Variant được lưu hoặc rollback cùng nhau.
- Chuẩn hóa thông tin SKU phục vụ mua hàng, bán hàng, nhập/xuất kho, bảo hành, sửa chữa và lắp ráp.
- Không làm thay đổi dữ liệu hoặc hành vi của Product/Variant đã tồn tại.

## 3. Phạm vi

### 3.1. Trong phạm vi

- Form thêm mới Product.
- Chế độ một SKU mặc định và chế độ khai báo Variant tường minh.
- Cấu hình tối đa 3 thuộc tính và sinh tổ hợp Variant.
- Chỉnh sửa dữ liệu từng Variant trước khi lưu Product.
- Tạo Product và danh sách Variant trong một transaction.
- Kiểm tra trùng SKU, barcode và tổ hợp thuộc tính ở frontend và backend.
- Khai báo tracking mode, bảo hành và tồn tối thiểu theo Variant.
- Giữ tương thích với client cũ không gửi `hasVariants` và `variants`.

### 3.2. Ngoài phạm vi

- Tạo hoặc điều chỉnh số lượng tồn kho.
- Tạo Serial Number hoặc Lot/Batch.
- Ma trận giá bán theo khách hàng, chi nhánh hoặc thời gian.
- Quản lý thuộc tính bằng các bảng master data riêng.
- Tự động thay đổi Variant đã có giao dịch khi sửa thuộc tính Product.
- Import Product và Variant hàng loạt từ Excel trong feature này.
- Thiết kế lại màn hình quản lý SKU của Product đã tồn tại.

## 4. Đối tượng sử dụng

- `Warehouse Manager`: khai báo danh mục hàng hóa và chính sách theo dõi kho.
- `Warehouse Staff`: tra cứu SKU và serial khi nhập/xuất, kiểm kê, điều chuyển.
- `Sales Staff`: chọn đúng SKU khi lập đơn bán hàng.
- `Technician`: chọn đúng SKU/serial khi lắp ráp, bảo hành và sửa chữa.

## 5. Mô hình nghiệp vụ

```text
Product
  └── ProductVariant 1 (SKU-001)
       ├── Serial A
       ├── Serial B
       └── Serial C
  └── ProductVariant 2 (SKU-002)
       ├── Serial D
       └── Serial E
```

| Cấp dữ liệu | Ví dụ | Quản lý tồn | Giá/Bảo hành | Serial |
|---|---|---:|---:|---:|
| Product | RAM Corsair Vengeance 3200 | Không trực tiếp | Không trực tiếp | Không |
| Variant/SKU | Đen, 16GB - `RAM-COR-VEN-DEN-16G` | Có | Có | Theo `trackingMode` |
| Serial | `SN123456` | Một đơn vị vật lý | Kế thừa Variant khi bán | Chính nó |

## 6. User Scenarios & Testing

### User Story 1 - Tạo Product một SKU (Priority: P1)

Là người quản lý danh mục, tôi muốn tạo nhanh một Product không có nhiều cấu hình để hệ thống tự tạo default SKU và tôi không phải nhập lại thông tin.

**Acceptance Scenarios**:

1. **Given** công tắc quản lý Variant đang tắt, **When** người dùng lưu Product hợp lệ, **Then** hệ thống tạo một Product và một default Variant.
2. **Given** Product có `productCode = RAM-COR-VEN`, **When** default Variant được tạo, **Then** SKU mặc định bằng `RAM-COR-VEN` và liên kết đúng Product.
3. **Given** Product khai báo giá bán, tồn tối thiểu, bảo hành và tracking, **When** default Variant được tạo, **Then** các giá trị này được sao chép sang Variant.

### User Story 2 - Tạo Product nhiều SKU (Priority: P1)

Là người quản lý danh mục, tôi muốn khai báo các thuộc tính và tạo toàn bộ SKU ngay trên form Product để hoàn thành master data trong một lần lưu.

**Acceptance Scenarios**:

1. **Given** người dùng bật quản lý Variant, **When** thêm Màu sắc `{Đen, Trắng}` và Dung lượng `{16GB, 32GB}`, **Then** hệ thống hiển thị đúng 4 tổ hợp.
2. **Given** bảng đã có các tổ hợp, **When** người dùng nhập giá, barcode, MPN, tracking và bảo hành, **Then** dữ liệu được giữ đúng trên từng dòng.
3. **Given** request có N Variant hợp lệ, **When** lưu thành công, **Then** database có một Product và đúng N ProductVariant liên kết với Product đó.

### User Story 3 - Ngăn dữ liệu SKU không hợp lệ (Priority: P1)

Là người quản lý dữ liệu, tôi muốn hệ thống phát hiện SKU/barcode trùng trước khi lưu để tránh sai lệch trên toàn bộ quy trình kho.

**Acceptance Scenarios**:

1. **Given** hai dòng có SKU chỉ khác chữ hoa/thường hoặc khoảng trắng, **When** lưu, **Then** frontend chặn request và chỉ rõ các dòng bị trùng.
2. **Given** SKU hoặc barcode đã tồn tại trong database, **When** backend xử lý request, **Then** toàn bộ transaction bị rollback và không để lại Product rỗng.
3. **Given** một Variant không hợp lệ trong danh sách, **When** lưu, **Then** không Product hoặc Variant nào của request được tạo.

### User Story 4 - Thay đổi cấu hình thuộc tính trước khi lưu (Priority: P2)

Là người nhập liệu, tôi muốn được cảnh báo khi thay đổi thuộc tính làm mất dữ liệu đã nhập ở bảng SKU.

**Acceptance Scenarios**:

1. **Given** người dùng chưa chỉnh dữ liệu các dòng SKU, **When** thêm hoặc xóa giá trị thuộc tính, **Then** bảng tổ hợp được sinh lại ngay.
2. **Given** người dùng đã sửa SKU, giá, barcode hoặc MPN, **When** thay đổi thuộc tính, **Then** hệ thống yêu cầu xác nhận trước khi tái tạo bảng.
3. **Given** người dùng hủy xác nhận, **When** quay lại form, **Then** thuộc tính và bảng SKU giữ nguyên.

## 7. Đặc tả giao diện

### 7.1. Vị trí

Thêm section `Quản lý biến thể / SKU` giữa `Thông tin chung` và `Đơn vị chuyển đổi` trên form thêm Product.

### 7.2. Chế độ một SKU

- Công tắc `Quản lý sản phẩm theo nhiều phiên bản` mặc định tắt.
- Các trường giá bán, tồn tối thiểu, thời hạn bảo hành và tracking ở phần thông tin chung vẫn hoạt động.
- Backend tạo default Variant từ dữ liệu Product.
- Không hiển thị bảng tổ hợp SKU.

### 7.3. Chế độ nhiều SKU

Khi bật công tắc:

- Ẩn hoặc disable các trường vận hành ở Product gồm giá bán, giá vốn tham chiếu, tồn tối thiểu, bảo hành và tracking.
- Hiển thị khu vực cấu hình thuộc tính.
- Hiển thị bảng Variant được sinh từ tổ hợp thuộc tính.
- Hiển thị số lượng dự kiến, ví dụ `Sẽ tạo 4 SKU`.
- Không cho lưu nếu chưa có ít nhất một dòng Variant hợp lệ.

### 7.4. Cấu hình thuộc tính

- Tối đa 3 thuộc tính.
- Tên thuộc tính bắt buộc, tối đa 50 ký tự và không được trùng sau khi trim/không phân biệt hoa thường.
- Mỗi thuộc tính phải có ít nhất một giá trị.
- Giá trị tối đa 50 ký tự và không được trùng trong cùng thuộc tính sau khi chuẩn hóa.
- Cho phép nhập giá trị bằng Enter hoặc dấu phẩy.
- Tổng số tổ hợp tối đa 100 Variant cho một lần tạo Product.
- Khi vượt giới hạn, không sinh thêm bảng và hiển thị số tổ hợp hiện tại cùng giới hạn cho phép.

Ví dụ:

```text
Màu sắc: Đen, Trắng
Dung lượng: 16GB, 32GB

Kết quả:
- Đen / 16GB
- Đen / 32GB
- Trắng / 16GB
- Trắng / 32GB
```

### 7.5. Bảng Variant/SKU

| Cột | Bắt buộc | Quy tắc |
|---|---:|---|
| Phiên bản | Có | Readonly, sinh từ tổ hợp thuộc tính |
| SKU | Có | Tối đa 50 ký tự, unique toàn hệ thống |
| Barcode | Không | Tối đa 100 ký tự; để trống thì backend tự sinh |
| Giá bán | Có | Số thập phân >= 0 |
| Giá vốn tham chiếu | Không | Số thập phân >= 0, mặc định 0; không thay thế giá vốn nhập kho |
| MPN | Không | Tối đa 100 ký tự, không bắt buộc unique |
| Tồn tối thiểu | Có | >= 0, mặc định 0 |
| Tracking mode | Có | `NONE`, `LOT`, `SERIAL`, `SERIAL_LOT` |
| Bảo hành (tháng) | Có | Số nguyên từ 0 đến 120, mặc định 0 |
| Trạng thái | Có | Mặc định đang sử dụng |
| Thao tác | Có | Xóa một tổ hợp khỏi danh sách trước khi lưu |

Các trường chung nên có thao tác `Áp dụng cho tất cả` để nhập nhanh giá, tracking, tồn tối thiểu và bảo hành. Người dùng vẫn có thể sửa riêng từng dòng sau khi áp dụng.

### 7.6. Sinh SKU tự động

- SKU được sinh từ `productCode` và giá trị thuộc tính, không sinh từ `productName` vì tên có thể thay đổi và chứa ký tự không ổn định.
- Chuẩn hóa thành chữ in hoa, bỏ dấu, thay nhóm ký tự không phải chữ/số bằng dấu `-` và loại bỏ dấu `-` thừa.
- Không tự ghi đè SKU mà người dùng đã sửa tay.
- SKU cuối cùng không vượt quá 50 ký tự.
- Nếu hai tổ hợp sinh cùng SKU sau chuẩn hóa, thêm hậu tố số tăng dần và yêu cầu người dùng kiểm tra trước khi lưu.

Ví dụ:

```text
Product code: RAM-COR-VEN
Màu sắc: Đen
Dung lượng: 16GB
SKU: RAM-COR-VEN-DEN-16GB
```

## 8. Functional Requirements

- **FR-001**: Form phải có cờ `hasVariants` để phân biệt chế độ default Variant và explicit Variants.
- **FR-002**: `hasVariants` chỉ là trường điều khiển request/UI, không lưu thành cột database.
- **FR-003**: Khi `hasVariants` là `false` hoặc không được gửi, `variants` phải rỗng và backend tạo đúng một default Variant.
- **FR-004**: Khi `hasVariants` là `true`, request phải có từ 1 đến 100 Variant; backend không được tạo default Variant.
- **FR-005**: Khi `hasVariants = false` nhưng request có `variants`, backend phải từ chối vì payload mâu thuẫn.
- **FR-006**: Backend phải validate toàn bộ Product và danh sách Variant trước khi hoàn tất transaction.
- **FR-007**: Việc lưu Product, unit conversions và Variants phải nằm trong cùng một `@Transactional`; bất kỳ lỗi nào cũng rollback toàn bộ.
- **FR-008**: SKU được trim, chuyển uppercase và kiểm tra unique không phân biệt hoa thường trong request lẫn database.
- **FR-009**: Barcode được trim và kiểm tra unique trong request lẫn database; barcode rỗng được backend sinh tự động cho từng Variant.
- **FR-010**: Backend phải kiểm tra `specsJson` là JSON object hợp lệ; không chấp nhận array, scalar hoặc chuỗi JSON lỗi.
- **FR-011**: Hai Variant trong cùng request không được có cùng tổ hợp thuộc tính sau chuẩn hóa, kể cả khi SKU khác nhau.
- **FR-012**: Mỗi Variant phải có `variantName`, `salePrice`, `trackingMode`, `minStockQty`, `warrantyMonths` và trạng thái hợp lệ.
- **FR-013**: Product loại dịch vụ chỉ sử dụng một default Variant, `trackingMode = NONE`, `minStockQty = 0`; UI không cho bật chế độ nhiều SKU trong feature này.
- **FR-014**: Product là thành phẩm/lắp ráp phải có tracking mode chứa `SERIAL` cho tất cả Variant.
- **FR-015**: API response sau khi tạo phải trả Product cùng danh sách Variant đã tạo, gồm cả barcode do backend sinh.
- **FR-016**: Hệ thống không được cập nhật `stockQty`, `stockValue`, Inventory Balance, Inventory Ledger, Lot hoặc Serial khi tạo Product.
- **FR-017**: API tạo Variant riêng hiện có vẫn được giữ để thêm SKU cho Product sau khi tạo.
- **FR-018**: Việc xóa dòng Variant trên form chỉ loại tổ hợp khỏi request; không xóa dữ liệu đã tồn tại trong database.
- **FR-019**: Audit log tạo Product phải ghi Product ID, product code và số Variant đã tạo; không ghi giá vốn nhạy cảm vào nội dung log hiển thị chung.
- **FR-020**: Backend phải xử lý vi phạm unique constraint do request đồng thời và trả lỗi nghiệp vụ, không trả stack trace/HTTP 500 chung chung.

## 9. Business Rules

### BR-01 - Một Product luôn có Variant

Mỗi Product phải có ít nhất một ProductVariant. Product không có Variant được xem là dữ liệu không hợp lệ vì các chứng từ kho và bán hàng sử dụng `variantId`.

### BR-02 - SKU là khóa nghiệp vụ của Variant

SKU unique toàn hệ thống. Sau khi Variant có giao dịch, không cho đổi SKU; người dùng phải ngừng sử dụng Variant cũ và tạo Variant mới nếu cần đổi mã hàng.

### BR-03 - Product không trực tiếp sở hữu tồn kho

Tồn kho, đặt trước và giá trị tồn được tính từ các Variant. Các trường tồn trên form Product không được dùng để khởi tạo tồn.

### BR-04 - Giá và chính sách theo Variant

Khi `hasVariants = true`, backend bỏ qua các trường giá, tồn tối thiểu, tracking và bảo hành cấp Product. Mỗi Variant là nguồn dữ liệu chính thức.

### BR-05 - Serial không được tạo cùng Product

Variant có `trackingMode = SERIAL` hoặc `SERIAL_LOT` chỉ thể hiện chính sách phải theo dõi serial. Serial thực tế được ghi nhận khi nhập kho, nhập tồn đầu kỳ hoặc hoàn tất lắp ráp.

### BR-06 - Giá vốn trên master data chỉ là tham chiếu

`costPrice` của Variant là giá vốn tham chiếu/giá gần nhất phục vụ gợi ý. Giá trị tồn kho chính thức vẫn được xác định từ phiếu nhập, cost layer và inventory ledger.

### BR-07 - MPN không bắt buộc unique

MPN do nhà sản xuất cung cấp có thể bị thiếu hoặc trùng giữa thương hiệu/nhà cung cấp. Không dùng MPN làm khóa chính hoặc thay thế SKU.

### BR-08 - Thay đổi tổ hợp có thể làm mất dữ liệu nhập

Nếu người dùng đã chỉnh bất kỳ trường nào trong bảng Variant, thao tác thêm/xóa/đổi tên thuộc tính hoặc giá trị phải có xác nhận. Khi xác nhận, frontend tái tạo bảng và chỉ bảo toàn dữ liệu của các tổ hợp có canonical key không đổi.

### BR-09 - Không xóa Variant đã phát sinh giao dịch

Quy tắc xóa hiện có tiếp tục áp dụng sau khi Product được tạo. Variant đã có tồn, serial, chứng từ hoặc BOM chỉ được chuyển sang `active = false`.

## 10. API Contract

### 10.1. Endpoint

```http
POST /api/v1/products
Content-Type: application/json
```

### 10.2. Request nhiều Variant

```json
{
  "productName": "RAM Corsair Vengeance 3200",
  "productCode": "RAM-COR-VEN",
  "brandId": 1,
  "categoryId": 1,
  "unitId": 1,
  "productType": "Hàng hóa",
  "vatRate": 8,
  "hasVariants": true,
  "variants": [
    {
      "sku": "RAM-COR-VEN-DEN-16GB",
      "barcode": null,
      "variantName": "Đen / 16GB",
      "salePrice": 1200000,
      "costPrice": 900000,
      "manufacturerPartNumber": "CMK16GX4M1E3200C16",
      "specsJson": "{\"Màu sắc\":\"Đen\",\"Dung lượng\":\"16GB\"}",
      "trackingMode": "SERIAL",
      "minStockQty": 5,
      "warrantyMonths": 36,
      "active": true
    },
    {
      "sku": "RAM-COR-VEN-TRANG-16GB",
      "barcode": null,
      "variantName": "Trắng / 16GB",
      "salePrice": 1300000,
      "costPrice": 900000,
      "manufacturerPartNumber": "CMW16GX4M1E3200C16",
      "specsJson": "{\"Màu sắc\":\"Trắng\",\"Dung lượng\":\"16GB\"}",
      "trackingMode": "SERIAL",
      "minStockQty": 5,
      "warrantyMonths": 36,
      "active": true
    }
  ],
  "unitConversions": []
}
```

### 10.3. Request một default Variant

```json
{
  "productName": "Cáp HDMI 2m",
  "productCode": "CAP-HDMI-2M",
  "brandId": 2,
  "categoryId": 8,
  "unitId": 1,
  "productType": "Hàng hóa",
  "salePrice": 150000,
  "minStockQty": 10,
  "warrantyPeriodMonths": 6,
  "trackSerial": false,
  "trackLot": false,
  "hasVariants": false,
  "variants": []
}
```

### 10.4. Thay đổi DTO

`ProductRequest` bổ sung:

```java
private Boolean hasVariants;
private List<ProductVariantRequest> variants;
```

Validation của `salePrice` cấp Product chuyển từ `@NotNull` tuyệt đối sang validation có điều kiện:

- Bắt buộc khi `hasVariants` là `false` hoặc `null`.
- Không bắt buộc và không dùng khi `hasVariants` là `true`.

### 10.5. Response đề xuất

```json
{
  "success": true,
  "data": {
    "id": 101,
    "productCode": "RAM-COR-VEN",
    "productName": "RAM Corsair Vengeance 3200",
    "variants": [
      {
        "id": 1001,
        "sku": "RAM-COR-VEN-DEN-16GB",
        "barcode": "BC00001001",
        "variantName": "Đen / 16GB",
        "trackingMode": "SERIAL"
      }
    ]
  }
}
```

HTTP status thành công: `201 Created`. Nếu project giữ convention hiện tại là `200 OK`, có thể giữ để tránh thay đổi client ngoài phạm vi, nhưng response phải chứa danh sách Variant đã tạo.

## 11. Backend Processing Flow

1. Normalize Product code, SKU và barcode.
2. Validate Product và quan hệ brand/category/unit.
3. Xác định mode từ `hasVariants`.
4. Nếu multi-variant, validate toàn bộ danh sách trong memory:
   - Số lượng dòng.
   - Trường bắt buộc.
   - SKU/barcode trùng trong request.
   - `specsJson` hợp lệ và tổ hợp không trùng.
   - Tracking mode và quy tắc loại Product.
5. Kiểm tra SKU/barcode với database.
6. Lưu Product cha.
7. Lưu unit conversions.
8. Nếu single mode, gọi luồng tạo default Variant hiện có.
9. Nếu multi mode, map và lưu toàn bộ explicit Variants; không gọi `createDefaultVariant`.
10. Flush transaction để bắt unique constraint.
11. Ghi audit log và trả Product cùng Variant.
12. Nếu bất kỳ bước nào lỗi, rollback toàn bộ.

Không gọi public method `createVariant(productId, request)` trong vòng lặp nếu method đó thực hiện lại truy vấn Product và logic response không cần thiết. Nên tái sử dụng một private mapper/validator chung cho cả create Product và endpoint tạo Variant riêng.

## 12. Error Handling

| Trường hợp | Kết quả mong đợi |
|---|---|
| `hasVariants = true`, danh sách rỗng | Báo phải có ít nhất một SKU |
| Quá 100 Variant | Báo vượt giới hạn tổ hợp |
| SKU trùng trong request | Chỉ rõ SKU và các dòng trùng |
| SKU đã tồn tại trong DB | Báo SKU đã tồn tại, rollback Product |
| Barcode trùng | Báo barcode đã tồn tại, rollback Product |
| `specsJson` lỗi | Báo đúng dòng và nội dung JSON không hợp lệ |
| Giá hoặc tồn tối thiểu âm | Báo đúng dòng và trường lỗi |
| Tracking mode không hợp lệ | Báo đúng dòng và tập giá trị cho phép |
| Product thành phẩm không theo serial | Chặn lưu và yêu cầu tracking serial |
| Unique conflict do hai request đồng thời | Trả lỗi nghiệp vụ 409 hoặc convention 400 hiện tại; không trả 500 |

## 13. Non-Functional Requirements

- **NFR-001**: Sinh tối đa 100 tổ hợp trên frontend trong dưới 300 ms với máy người dùng thông thường.
- **NFR-002**: Một request tối đa 100 Variant không được tạo N truy vấn kiểm tra duplicate riêng lẻ; backend nên kiểm tra theo tập SKU/barcode.
- **NFR-003**: Database unique constraint vẫn là lớp bảo vệ cuối cùng cho SKU và barcode.
- **NFR-004**: Mọi thao tác tạo Product/Variant phải atomic.
- **NFR-005**: Không ghi giá vốn hoặc payload đầy đủ vào application log.
- **NFR-006**: Thông báo lỗi phải chỉ rõ dòng Variant để người dùng sửa mà không phải dò toàn bảng.

## 14. Backward Compatibility & Migration

- Không cần migration tạo bảng mới.
- Không thay đổi dữ liệu Product/Variant hiện hữu.
- Request cũ không có `hasVariants` và `variants` tiếp tục tạo default Variant như hiện tại.
- Các endpoint `/api/v1/products/{id}/variants` hiện có tiếp tục hoạt động.
- Các trường vận hành cấp Product được giữ tạm cho single mode và client cũ, nhưng không phải nguồn dữ liệu chính thức khi `hasVariants = true`.
- Không tự động gộp hoặc tách Variant của Product đã tồn tại.

## 15. Acceptance Criteria

- [ ] Có thể bật/tắt chế độ quản lý Variant trên form thêm Product.
- [ ] Product dịch vụ không thể bật chế độ nhiều Variant.
- [ ] Có thể khai báo tối đa 3 thuộc tính.
- [ ] Số tổ hợp được sinh đúng theo tích Descartes của các tập giá trị.
- [ ] Không cho sinh/lưu quá 100 Variant.
- [ ] SKU tự sinh từ product code, có thể sửa tay và không bị ghi đè ngoài ý muốn.
- [ ] Frontend phát hiện SKU/barcode trùng trong bảng trước khi gọi API.
- [ ] Backend độc lập kiểm tra lại toàn bộ validation.
- [ ] Single mode tạo đúng một default Variant.
- [ ] Multi mode tạo đúng N Variant và không tạo thêm default Variant.
- [ ] Product và toàn bộ Variant rollback khi một dòng lỗi.
- [ ] Barcode để trống được backend sinh và trả lại trong response.
- [ ] `specsJson` của mỗi Variant phản ánh đúng tổ hợp thuộc tính.
- [ ] Giá, tracking, tồn tối thiểu và bảo hành được lưu tại đúng Variant.
- [ ] Không phát sinh Inventory Balance, Ledger, Lot hoặc Serial sau khi tạo Product.
- [ ] Thay đổi thuộc tính sau khi nhập dữ liệu Variant có hộp thoại xác nhận.
- [ ] API cũ không gửi danh sách Variant vẫn hoạt động.
- [ ] Audit log ghi đúng Product và số lượng Variant được tạo.

## 16. Test Matrix tối thiểu

| Nhóm | Test case |
|---|---|
| Unit - FE | Cartesian product 1, 2 và 3 thuộc tính |
| Unit - FE | Chuẩn hóa SKU tiếng Việt, ký tự đặc biệt và chuỗi dài |
| Unit - FE | Giữ SKU đã sửa tay khi thay đổi trường không liên quan |
| Unit - BE | Single mode tạo default Variant |
| Unit - BE | Multi mode không tạo default Variant |
| Unit - BE | Duplicate SKU/barcode trong cùng request |
| Unit - BE | Invalid `specsJson`, tracking mode, giá và warranty |
| Integration | Một Product và N Variant được commit cùng nhau |
| Integration | Lỗi Variant cuối cùng rollback Product và các Variant trước |
| Integration | Hai request đồng thời dùng cùng SKU chỉ một request thành công |
| Regression | Tạo Product theo payload cũ |
| Regression | Thêm/sửa/ngừng sử dụng Variant qua endpoint hiện có |

## 17. Definition of Done

- Backend, frontend và migration liên quan build thành công.
- Unit/integration tests trong test matrix P1 chạy thành công.
- Không có thay đổi tồn kho khi tạo Product.
- QA nghiệm thu cả single mode và multi mode.
- API contract được cập nhật trong tài liệu OpenAPI/Swagger.
- Không còn đường tạo Product thành công nhưng không có Variant.
