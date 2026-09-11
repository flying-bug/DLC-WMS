# Clarification & Business Rules: Fix Product Management

**Feature**: `[010-fix-product-management]`  
**Created**: 2026-09-04  
**Status**: Clarified  
**Related specification**: `spec.md`

Tài liệu này làm rõ các điểm có thể được hiểu theo nhiều cách trong `spec.md`. Khi có khác biệt về cách diễn giải, quyết định trong `clarify.md` được ưu tiên áp dụng cho feature 010.

## 1. Kết quả rà soát spec.md

`spec.md` đã xác định đúng hướng nghiệp vụ và có thể triển khai trên mô hình hiện tại mà không cần tạo thêm bảng SKU hoặc bảng thuộc tính. Các điểm cần làm rõ trước khi lập plan gồm:

1. Cách xác định single mode và multi-variant mode khi `hasVariants` hoặc `variants` bị thiếu.
2. Cách sinh SKU khi `productCode` đang để trống.
3. Thuộc tính có được lưu thành master data hay chỉ dùng để sinh `specsJson`.
4. Quy tắc xác định hai tổ hợp thuộc tính là trùng nhau.
5. Cách bảo toàn dữ liệu khi người dùng thay đổi thuộc tính.
6. Quyền sở hữu giá, tracking, tồn tối thiểu và bảo hành giữa Product và Variant.
7. Giá trị mặc định theo từng loại Product.
8. Cấu trúc response và HTTP status sau khi tạo.
9. Phạm vi transaction và hành vi khi audit log lỗi.
10. Quy tắc sửa SKU sau khi Variant đã phát sinh giao dịch.

Các quyết định dưới đây đóng toàn bộ các điểm trên; feature không còn câu hỏi nghiệp vụ bắt buộc phải chờ người dùng trả lời.

## 2. Thuật ngữ và quyền sở hữu dữ liệu

| Thuật ngữ | Định nghĩa được sử dụng trong feature |
|---|---|
| Product | Dòng/model sản phẩm dùng để gom thông tin chung như tên, thương hiệu, danh mục, đơn vị và VAT |
| Variant | Một cấu hình hàng hóa có thể mua, bán, tồn kho và bảo hành độc lập |
| SKU | Mã nghiệp vụ duy nhất của Variant; SKU không phải entity riêng |
| Attribute | Tên tiêu chí tạo tổ hợp, ví dụ Màu sắc, Dung lượng; chỉ tồn tại trong state của form |
| Attribute value | Giá trị của thuộc tính, ví dụ Đen, 16GB |
| `specsJson` | Snapshot thuộc tính của một Variant, được lưu cùng ProductVariant |
| Barcode | Mã quét nhận diện Variant/SKU, không nhận diện một thiết bị vật lý riêng lẻ |
| Serial Number | Mã nhận diện một đơn vị thiết bị vật lý, chỉ phát sinh ở luồng tồn kho/lắp ráp |

Quyền sở hữu dữ liệu cuối cùng:

| Dữ liệu | Product | ProductVariant |
|---|---:|---:|
| Tên model, brand, category, unit, VAT | Nguồn chính | Chỉ đọc qua Product |
| SKU, barcode, MPN | Không | Nguồn chính |
| Giá bán | Chỉ nhập tạm trong single mode | Nguồn chính |
| Giá vốn tham chiếu | Không | Nguồn chính |
| Tồn tối thiểu | Chỉ nhập tạm trong single mode | Nguồn chính |
| Tracking mode | Chỉ nhập tạm trong single mode | Nguồn chính |
| Bảo hành mặc định | Chỉ nhập tạm trong single mode | Nguồn chính |
| Tồn kho và giá trị tồn | Không lưu trực tiếp | Tổng hợp theo Variant từ Inventory |

## 3. Quyết định về single mode và multi-variant mode

### 3.1. Ý nghĩa của `hasVariants`

`hasVariants` là trường điều khiển request, không phải dữ liệu domain và không được thêm thành cột trong bảng `PRODUCTS`.

- `false` hoặc `null`: sử dụng single mode và backend tạo default Variant.
- `true`: sử dụng explicit variant mode và backend chỉ tạo các Variant trong `variants`.

Tên hiển thị trên UI phải là `Quản lý theo phiên bản/SKU`, không dùng câu khẳng định `Có nhiều phiên bản`. Lý do là explicit variant mode được phép bắt đầu với một Variant và bổ sung thêm sau.

### 3.2. Truth table của request

| `hasVariants` | `variants` | Kết quả |
|---:|---|---|
| Không gửi/null | Không gửi hoặc rỗng | Single mode, tạo default Variant |
| `false` | Không gửi hoặc rỗng | Single mode, tạo default Variant |
| `true` | Có 1-100 dòng | Multi-variant mode, tạo đúng danh sách gửi lên |
| `true` | Không gửi hoặc rỗng | Từ chối request |
| `false` | Có dữ liệu | Từ chối request do payload mâu thuẫn |
| Không gửi/null | Có dữ liệu | Từ chối request; client phải gửi rõ `hasVariants = true` |

Backend không được tự suy luận multi mode chỉ vì `variants` có dữ liệu. Quy tắc strict này giúp tránh tạo nhiều SKU ngoài ý muốn do client cũ gửi nhầm field.

### 3.3. Số Variant tối thiểu

Multi-variant mode yêu cầu ít nhất một Variant, không bắt buộc hai Variant. Một Product có thể được chuẩn bị trước với một cấu hình và bổ sung SKU sau bằng endpoint hiện có.

## 4. Product code và sinh SKU

### 4.1. Product code trống

- Single mode: `productCode` có thể để trống; backend tiếp tục sinh mã Product theo cơ chế hiện tại rồi dùng mã đó cho default SKU.
- Multi-variant mode: `productCode` bắt buộc phải có trước khi frontend sinh bảng SKU.
- Nếu người dùng bật multi-variant mode khi `productCode` trống, frontend focus trường Mã sản phẩm và hiển thị lỗi; không mở phần cấu hình thuộc tính cho đến khi có mã.

Không sinh SKU từ một mã Product tạm rồi đổi lại khi submit vì có thể ghi đè SKU mà người dùng đã sửa.

### 4.2. Chuẩn hóa Product code và SKU

Product code và SKU được chuẩn hóa theo thứ tự:

1. Trim đầu/cuối.
2. Chuyển uppercase bằng locale trung lập.
3. Khi tự sinh SKU: bỏ dấu tiếng Việt.
4. Thay mỗi nhóm ký tự không phải `A-Z`, `0-9` bằng một dấu `-`.
5. Xóa dấu `-` ở đầu/cuối và gộp các dấu `-` liên tiếp.

Ví dụ:

```text
Product code: RAM-COR-VEN
Attribute values: Trắng, 16 GB
Generated SKU: RAM-COR-VEN-TRANG-16-GB
```

### 4.3. SKU dài hơn 50 ký tự

Frontend không được cắt tùy ý toàn chuỗi vì có thể làm mất phần phân biệt Variant. Quy tắc cắt:

1. Giữ nguyên `productCode` nếu độ dài không vượt 35 ký tự.
2. Dành tối thiểu 14 ký tự cuối cho hậu tố thuộc tính và một dấu `-`.
3. Nếu vẫn trùng sau khi rút gọn, thêm hậu tố `-2`, `-3`, ... trong giới hạn 50 ký tự.
4. Mọi SKU tự sinh vẫn phải qua duplicate validation trước khi lưu.

### 4.4. SKU đã sửa tay

Mỗi dòng cần có state nội bộ `skuManuallyEdited`:

- `false`: frontend được cập nhật lại SKU khi `productCode` hoặc tổ hợp thay đổi.
- `true`: frontend không tự ghi đè SKU.
- Người dùng có thể chọn thao tác `Khôi phục mã tự động` để đặt lại state và sinh lại SKU.

`skuManuallyEdited` chỉ là state của frontend và không gửi lên API.

## 5. Thuộc tính và tổ hợp Variant

### 5.1. Thuộc tính không phải master data

Trong feature 010, Attribute và Attribute value chỉ tồn tại trên form để sinh tổ hợp. Backend không nhận một danh sách `attributes` riêng và không tạo bảng mới.

Mỗi Variant gửi `specsJson` là snapshot của tổ hợp tương ứng. Ví dụ:

```json
{
  "Màu sắc": "Đen",
  "Dung lượng": "16GB"
}
```

### 5.2. Chuẩn hóa tên và giá trị thuộc tính

Chuẩn hóa phục vụ so sánh duplicate:

1. Unicode normalize dạng NFC.
2. Trim đầu/cuối.
3. Gộp nhiều khoảng trắng liên tiếp thành một khoảng trắng.
4. Chuyển lowercase bằng locale trung lập.
5. Không bỏ dấu khi so sánh thuộc tính; `đen` và `den` không tự động được coi là một giá trị.

Giá trị hiển thị và lưu trong `specsJson` vẫn giữ nguyên chữ hoa/thường hợp lệ do người dùng nhập sau khi trim/gộp khoảng trắng.

### 5.3. Canonical combination key

Frontend và backend phải dùng cùng một quy tắc để xác định tổ hợp trùng:

1. Chuẩn hóa tên và giá trị theo mục 5.2.
2. Tạo từng cặp `attributeName=attributeValue`.
3. Sắp xếp các cặp theo `attributeName` để việc đổi thứ tự cột không tạo tổ hợp mới.
4. Ghép các cặp bằng `|`.

Ví dụ:

```text
dung lượng=16gb|màu sắc=đen
```

Hai Variant có canonical key giống nhau bị coi là trùng dù SKU khác nhau hoặc thứ tự key trong `specsJson` khác nhau.

### 5.4. Thứ tự hiển thị

- `variantName` và các cột table sử dụng thứ tự thuộc tính trên UI.
- Canonical key sử dụng thứ tự sort theo tên thuộc tính.
- Thứ tự sinh tổ hợp phải ổn định: giá trị của thuộc tính bên trái thay đổi chậm hơn thuộc tính bên phải.

Với `Màu sắc = {Đen, Trắng}` và `Dung lượng = {16GB, 32GB}`, thứ tự là:

```text
Đen / 16GB
Đen / 32GB
Trắng / 16GB
Trắng / 32GB
```

### 5.5. Giới hạn tổ hợp

- Tối đa 3 thuộc tính.
- Tối đa 20 giá trị cho một thuộc tính.
- Tối đa 100 tổ hợp sau khi nhân chéo.
- Frontend tính số tổ hợp trước khi tạo array dòng SKU.
- Backend kiểm tra lại số Variant tối đa 100, không tin giới hạn frontend.

Nếu vượt 100, frontend giữ nguyên cấu hình thuộc tính vừa nhập nhưng không sinh bảng mới và yêu cầu người dùng giảm số giá trị.

## 6. Thay đổi thuộc tính và bảo toàn dữ liệu

### 6.1. Khi nào một dòng được coi là đã chỉnh sửa

Một dòng có `isDirty = true` khi người dùng đã thay đổi ít nhất một trong các trường:

- SKU.
- Barcode.
- Giá bán.
- Giá vốn tham chiếu.
- MPN.
- Tồn tối thiểu.
- Tracking mode.
- Bảo hành.
- Active.

### 6.2. Tái tạo bảng

- Nếu chưa có dòng dirty, bảng được tái tạo ngay khi cấu hình thuộc tính thay đổi.
- Nếu có dòng dirty, frontend phải hiển thị xác nhận trước khi áp dụng thay đổi.
- Nếu người dùng hủy, cả cấu hình thuộc tính và bảng Variant quay về snapshot trước thao tác.
- Nếu người dùng đồng ý, bảng mới được sinh và dữ liệu được bảo toàn theo canonical key.
- Tổ hợp có canonical key không đổi giữ nguyên toàn bộ trường người dùng đã nhập.
- Tổ hợp mới nhận giá trị mặc định chung.
- Tổ hợp không còn tồn tại bị loại bỏ.

### 6.3. Xóa thủ công một dòng tổ hợp

Xóa dòng trên bảng có nghĩa là loại tổ hợp đó khỏi request, không xóa giá trị thuộc tính.

- Canonical key của dòng được lưu trong `excludedCombinationKeys` của form.
- Khi bảng tái tạo, tổ hợp bị loại vẫn không xuất hiện nếu canonical key còn hợp lệ.
- Có thao tác `Khôi phục tất cả tổ hợp` để xóa danh sách excluded và sinh lại bảng đầy đủ.
- `excludedCombinationKeys` chỉ là state frontend, không gửi lên API.

### 6.4. Bật/tắt multi-variant mode

- Bật từ single sang multi: lấy giá, min stock, tracking và bảo hành đang nhập ở Product làm default chung cho các dòng mới.
- Tắt từ multi về single khi bảng có dữ liệu: yêu cầu xác nhận rằng danh sách Variant sẽ bị bỏ.
- Sau khi xác nhận tắt: xóa attributes, rows và excluded keys; giữ các default chung gần nhất để điền lại trường single mode.

## 7. Quy tắc field của Variant

### 7.1. Variant name

- Default Variant: `variantName = productName`.
- Explicit Variant: `variantName` chỉ chứa phần phân biệt, ví dụ `Đen / 16GB`; không lặp lại Product name.
- Màn hình chọn hàng chịu trách nhiệm hiển thị `productName - variantName`.
- `variantName` tối đa 255 ký tự và bắt buộc không rỗng.

### 7.2. SKU

- Bắt buộc, tối đa 50 ký tự.
- Unique toàn hệ thống sau khi trim và uppercase.
- Hai SKU chỉ khác hoa/thường hoặc khoảng trắng đầu/cuối được coi là trùng.
- SKU tự sinh có thể sửa tay.

### 7.3. Barcode

- Optional trong request, tối đa 100 ký tự.
- Chuỗi rỗng hoặc toàn khoảng trắng được chuyển thành `null`.
- Nếu `null`, backend sinh barcode riêng cho Variant.
- Nếu được nhập, barcode unique toàn hệ thống sau khi trim; so sánh không phân biệt hoa/thường.
- Barcode của Variant không chứa Serial Number.

### 7.4. Giá

- `salePrice` bắt buộc ở mỗi Variant nhưng cho phép bằng 0.
- `costPrice` optional, mặc định 0 và chỉ là giá tham chiếu.
- Cả hai dùng `BigDecimal`, không dùng số thực nhị phân để tính toán ở backend.
- Frontend có thể hiển thị định dạng tiền nhưng payload gửi số, không gửi chuỗi có dấu phân cách hàng nghìn.

### 7.5. Tồn tối thiểu

- `minStockQty` bắt buộc về mặt domain nhưng có default 0.
- Cho phép tối đa 4 chữ số thập phân để phù hợp schema và các đơn vị có quy đổi.
- Đây là ngưỡng tổng theo SKU trong phiên bản hiện tại, chưa tách theo từng kho.

### 7.6. Tracking mode

Giá trị hợp lệ:

| Giá trị | Ý nghĩa |
|---|---|
| `NONE` | Theo dõi số lượng tổng, không yêu cầu lot/serial |
| `LOT` | Theo dõi theo lô |
| `SERIAL` | Mỗi đơn vị phải có serial |
| `SERIAL_LOT` | Mỗi đơn vị có serial và thuộc một lô |

Tracking mode lưu tại Variant. Các boolean `trackSerial`, `trackLot` cấp Product chỉ được dùng làm input tương thích cho single mode.

### 7.7. Bảo hành

- `warrantyMonths` là số nguyên từ 0 đến 120.
- `0` nghĩa là không tự động tạo bảo hành khi bán.
- Multi mode không sử dụng `warrantyPeriodMonths` cấp Product.
- Single mode sao chép `warrantyPeriodMonths` vào `warrantyMonths` của default Variant.

### 7.8. Active

- Variant tạo mới mặc định `active = true`.
- Cho phép người dùng bỏ active trước khi lưu, nhưng Product phải có ít nhất một Variant active.
- Không cho tạo Product mà tất cả Variant đều inactive.

## 8. Quy tắc theo loại Product

Giá trị canonical sử dụng trong feature:

| Product type | Multi mode | Tracking mặc định | Quy tắc bổ sung |
|---|---:|---|---|
| `Hàng hóa` | Cho phép | `NONE` | Người dùng được chọn mọi tracking mode |
| `Thành phẩm` | Cho phép | `SERIAL` | Mọi Variant phải là `SERIAL` hoặc `SERIAL_LOT` |
| `Dịch vụ` | Không cho phép | `NONE` | Default Variant, min stock = 0, không lot/serial |

Backend chấp nhận alias không dấu hiện có như `Hang hoa`, `Thanh pham`, `Dich vu`, nhưng phải normalize về các giá trị canonical trước khi áp dụng rule. Không dùng so sánh chuỗi rải rác ở frontend và service.

`isAssembly = true` áp dụng cùng quy tắc tracking với `Thành phẩm`, kể cả khi product type được gửi là `Hàng hóa`.

## 9. Giá trị mặc định và Apply to all

Khi bật multi mode, form có một khu vực default chung:

| Field | Default |
|---|---|
| `salePrice` | Giá đang nhập ở Product hoặc 0 |
| `costPrice` | 0 |
| `minStockQty` | Tồn tối thiểu đang nhập ở Product hoặc 0 |
| `trackingMode` | Suy ra từ tracking đang nhập ở Product; Thành phẩm luôn `SERIAL` |
| `warrantyMonths` | Bảo hành đang nhập ở Product hoặc 0 |
| `active` | `true` |

`Áp dụng cho tất cả` chỉ áp dụng các field người dùng đã chọn. Nếu thao tác sẽ ghi đè giá trị khác default trên một dòng dirty, frontend yêu cầu xác nhận một lần và hiển thị số dòng bị ảnh hưởng.

## 10. Backend validation và transaction

### 10.1. Thứ tự validation

Backend xử lý theo thứ tự:

1. Validate cấu trúc mode từ `hasVariants` và `variants`.
2. Normalize Product code và Product type.
3. Validate Product, brand, category, unit và unit conversions.
4. Validate toàn bộ Variant trong memory.
5. Phát hiện SKU, barcode và canonical specs trùng trong request.
6. Kiểm tra tập SKU và barcode với database.
7. Chỉ sau khi các validation có thể thực hiện trước đã qua mới lưu Product.
8. Map/lưu default Variant hoặc explicit Variants.
9. Flush để database kiểm tra unique constraint.

Mục tiêu của pre-validation là trả lỗi rõ ràng và giảm rollback không cần thiết; database constraint vẫn là lớp bảo vệ cuối cùng khi có concurrency.

### 10.2. Phạm vi atomic

Các dữ liệu sau phải commit hoặc rollback cùng nhau:

- Product.
- Product unit conversions.
- Tất cả ProductVariant trong request.
- Barcode được sinh cho các Variant.

Không nằm trong transaction tạo master data:

- Inventory Balance.
- Inventory Ledger/Cost Layer.
- Lot/Batch.
- Serial Number.
- Notification ngoài hệ thống.

### 10.3. Tái sử dụng logic hiện có

- Không gọi public `createVariant(productId, request)` N lần.
- Tách phần normalize/validate/map Variant thành private method dùng chung.
- Dùng batch query kiểm tra danh sách SKU/barcode đã tồn tại.
- Dùng `saveAll` và flush một lần sau khi danh sách hợp lệ.
- Không tạo abstraction/interface mới chỉ phục vụ một implementation.

### 10.4. Lỗi audit log

Transaction Product/Variant kết thúc trong service; audit hiện được gọi ở controller sau khi service trả kết quả. Để tránh trường hợp Product đã commit nhưng client nhận lỗi và gửi lại:

- Lỗi ghi audit không được biến một lần tạo Product đã thành công thành HTTP error.
- Hệ thống ghi application log cho lỗi audit để vận hành xử lý.
- Response vẫn trả thành công cùng Product ID và Variants.
- Audit success phải ghi `productId`, `productCode` và `variantCount`, không ghi `costPrice`.

## 11. API response và HTTP status

### 11.1. Quyết định HTTP status

Feature giữ `200 OK` để tương thích convention và frontend hiện tại. Không đổi sang `201 Created` trong feature 010.

### 11.2. Response DTO

Mở rộng `ProductResponse` với:

```java
private List<ProductVariantResponse> variants;
```

Quy tắc trả dữ liệu:

- `POST /api/v1/products`: luôn trả đầy đủ Variants vừa tạo.
- `GET /api/v1/products/{id}`: trả đầy đủ Variants.
- API danh sách Product: có thể không trả `variants` để tránh N+1 và payload lớn.
- Barcode do backend sinh phải xuất hiện trong response create.

Không tạo một response wrapper mới nếu `ProductResponse` hiện tại có thể mở rộng mà không tạo vòng tham chiếu JSON.

### 11.3. Error status

Để giữ convention hiện tại, validation và duplicate trả `HTTP 400` cùng business error code ổn định. Không sử dụng đồng thời `400` và `409` cho cùng một lỗi duplicate trong feature này.

| Nhóm lỗi | Mã gợi ý | Nội dung bắt buộc |
|---|---|---|
| Mode mâu thuẫn | `PROD_VARIANT_MODE_INVALID` | Nêu rõ `hasVariants` và `variants` không khớp |
| Danh sách rỗng/quá giới hạn | `PROD_VARIANT_COUNT_INVALID` | Nêu giới hạn 1-100 |
| SKU trùng request/DB | `PROD_SKU_DUPLICATE` | Trả SKU và index dòng nếu có |
| Barcode trùng request/DB | `PROD_BARCODE_DUPLICATE` | Trả barcode và index dòng nếu có |
| Specs lỗi/trùng | `PROD_SPECS_INVALID` | Trả index dòng và nguyên nhân |
| Tracking sai loại Product | `PROD_TRACKING_INVALID` | Trả SKU và tracking mode |
| Dữ liệu tiền/số lượng sai | `PROD_VARIANT_VALUE_INVALID` | Trả SKU, field và giá trị |

Không trả stack trace, SQL constraint name hoặc nội dung giá vốn trong error response.

## 12. Quy tắc sau khi Product đã được tạo

### 12.1. Thêm Variant

Endpoint `POST /api/v1/products/{id}/variants` tiếp tục là luồng thêm SKU sau khi Product tồn tại. Endpoint phải dùng cùng validator/normalizer với create Product.

### 12.2. Sửa Variant

Trong feature 010, các field mô tả/vận hành như barcode, variant name, giá, MPN, min stock, tracking, warranty và active tiếp tục sửa bằng endpoint hiện có, với điều kiện không vi phạm nghiệp vụ tồn kho.

### 12.3. Khóa đổi SKU khi đã có giao dịch

BR-02 của `spec.md` là invariant toàn hệ thống và thuộc phạm vi regression safeguard của feature 010:

- Chưa có bất kỳ tham chiếu giao dịch/serial/BOM: cho phép sửa SKU.
- Đã có tham chiếu: không cho sửa SKU.
- Nếu không cần đổi SKU, update các field khác vẫn được phép.
- Muốn dùng mã mới: deactivate Variant cũ và tạo Variant mới.

Backend phải kiểm tra rule; disable field trên UI chỉ là hỗ trợ trải nghiệm, không phải lớp bảo vệ duy nhất.

### 12.4. Product code và default SKU

Việc đổi `productCode` của Product đã tồn tại không tự động đổi default SKU hoặc các explicit SKU. Đồng bộ/đổi mã hàng cũ nằm ngoài phạm vi feature 010 để tránh thay đổi khóa nghiệp vụ đã có giao dịch.

## 13. Unit conversion

- Unit và unit conversions thuộc Product, dùng chung cho tất cả Variant.
- Không khai báo conversion riêng trên từng Variant trong feature này.
- Lỗi một conversion làm rollback Product và toàn bộ Variant.
- Số lượng tồn tối thiểu của Variant được hiểu theo base unit của Product.

## 14. Phân quyền

- Người dùng cần quyền `product:add` để tạo Product cùng Variant.
- Không bổ sung permission riêng cho việc tạo Variant trong cùng form Product.
- Các endpoint quản lý Variant của Product đã tồn tại tiếp tục dùng permission hiện hành.
- Frontend ẩn/disable thao tác là hỗ trợ UI; backend vẫn phải kiểm tra permission.

## 15. Các tình huống nghiệp vụ đã chốt

### Q1. Có lưu `hasVariants` vào Product không?

Không. Số lượng Variant hiện có có thể được truy vấn từ `PRODUCT_VARIANTS`; lưu thêm boolean sẽ tạo dữ liệu có thể lệch.

### Q2. Tại sao multi mode cho phép chỉ có một Variant?

Để người dùng có thể khai báo cấu trúc SKU chuẩn ngay từ đầu và bổ sung cấu hình sau. Product vẫn có ít nhất một SKU hợp lệ.

### Q3. Có tạo một default Variant rồi tạo thêm explicit Variants không?

Không. Mỗi request chỉ chạy một trong hai nhánh. Multi mode tạo đúng danh sách `variants` và không sinh dòng thừa mang SKU bằng Product code.

### Q4. Có tự tạo tồn kho theo Product hoặc Variant không?

Không. Tồn đầu kỳ và hàng mua phải đi qua chứng từ kho để có ledger và giá vốn.

### Q5. Có sinh Serial theo số lượng khai báo không?

Không. `trackingMode` chỉ quy định Variant có bắt buộc serial trong nghiệp vụ kho hay không.

### Q6. Barcode trống được xử lý ở đâu?

Backend sinh sau khi payload đã qua validation. Frontend không tự sinh barcode chính thức.

### Q7. `specsJson` có thể null không?

- Default Variant: có thể null hoặc `{}`.
- Explicit Variant: phải là JSON object không rỗng và tạo được canonical key.

### Q8. Có chấp nhận hai Variant cùng specs nhưng khác SKU không?

Không trong cùng Product. Đó là dữ liệu trùng cấu hình. Nếu cần phân biệt hàng retail/tray hoặc khác nguồn gốc, phải thêm một thuộc tính nghiệp vụ tương ứng vào specs.

### Q9. MPN có unique không?

Không. MPN chỉ hỗ trợ tra cứu và đối chiếu với nhà sản xuất.

### Q10. Giá bán bằng 0 có hợp lệ không?

Có. Field vẫn bắt buộc nhưng 0 có thể dùng cho hàng tặng, hàng bảo hành hoặc chưa chốt giá. Giá âm không hợp lệ.

### Q11. Tracking mode có được thay đổi sau khi đã có tồn không?

Không cho đổi giữa nhóm serial và không serial nếu Variant đã có Inventory Balance, Serial hoặc giao dịch. Thay đổi như vậy cần một quy trình chuyển đổi dữ liệu riêng ngoài feature 010.

### Q12. Xóa một tổ hợp khỏi bảng có xóa giá trị thuộc tính không?

Không. Chỉ tổ hợp đó bị loại khỏi request; các tổ hợp khác dùng cùng giá trị vẫn giữ nguyên.

### Q13. Frontend hay backend chịu trách nhiệm sinh tổ hợp?

Frontend sinh để người dùng xem và chỉnh từng dòng. Backend không tự nhân chéo thuộc tính; backend chỉ validate và lưu danh sách Variant cuối cùng.

### Q14. Backend có tin `variantName` và `specsJson` do frontend gửi không?

Không hoàn toàn. Backend validate JSON, duplicate canonical key, độ dài và field bắt buộc. Backend không cần tự sinh lại Cartesian product vì không nhận danh sách Attribute gốc.

### Q15. Product tạo thành công nhưng audit lỗi thì trả gì?

Trả thành công. Không yêu cầu người dùng tạo lại một Product đã commit.

## 16. Acceptance Scenarios bổ sung

1. **Given** multi mode và Product code trống, **When** người dùng thêm thuộc tính, **Then** UI chặn và focus Mã sản phẩm.
2. **Given** `hasVariants` không được gửi nhưng `variants` có dữ liệu, **When** gọi API, **Then** backend trả lỗi mode invalid và không tạo Product.
3. **Given** hai `specsJson` có thứ tự key khác nhau nhưng cùng giá trị, **When** lưu, **Then** backend phát hiện trùng tổ hợp.
4. **Given** bảng có dòng đã sửa tay, **When** thêm một giá trị thuộc tính và xác nhận, **Then** các tổ hợp cũ giữ dữ liệu theo canonical key và chỉ dòng mới dùng default.
5. **Given** một tổ hợp đã bị xóa thủ công, **When** thêm giá trị khác, **Then** tổ hợp đã xóa không tự xuất hiện lại.
6. **Given** explicit Variant có barcode trống, **When** tạo thành công, **Then** response trả barcode đã được backend sinh.
7. **Given** Product thành phẩm có một Variant `trackingMode = NONE`, **When** lưu, **Then** toàn bộ request bị rollback.
8. **Given** Variant thứ 100 hợp lệ, **When** lưu, **Then** request được chấp nhận; Variant thứ 101 bị từ chối.
9. **Given** Product có N Variant, **When** một SKU trùng database do request đồng thời, **Then** không Product hoặc Variant nào của request thất bại được giữ lại.
10. **Given** Product đã commit nhưng audit service lỗi, **When** controller trả response, **Then** client vẫn nhận success và Product ID.
11. **Given** Variant đã có serial hoặc chứng từ, **When** đổi SKU, **Then** backend từ chối nhưng vẫn cho phép sửa giá qua request không đổi SKU.
12. **Given** Product single mode không gửi Product code, **When** backend sinh code, **Then** default Variant dùng chính code đã sinh làm SKU.

## 17. Checklist trước khi chuyển sang plan.md

- [x] Đã chốt ý nghĩa và truth table của `hasVariants`.
- [x] Đã chốt Product code bắt buộc trong multi mode.
- [x] Đã chốt số Variant 1-100.
- [x] Đã chốt Attribute chỉ là UI state, không tạo bảng mới.
- [x] Đã chốt thuật toán canonical combination key.
- [x] Đã chốt cách tái tạo bảng và bảo toàn dòng dirty.
- [x] Đã chốt ownership của giá, tracking, warranty và min stock.
- [x] Đã chốt rule theo Product type.
- [x] Đã chốt response dùng `ProductResponse.variants` và HTTP 200.
- [x] Đã chốt lỗi duplicate dùng HTTP 400 theo convention hiện tại.
- [x] Đã chốt audit nằm ngoài atomic boundary và không làm create response thất bại.
- [x] Đã chốt không tạo tồn, lot hoặc serial từ form Product.
- [x] Đã chốt khóa đổi SKU/tracking khi Variant đã có dữ liệu vận hành.

Feature 010 đã đủ rõ để tạo `plan.md`, `data-model.md`, `contracts.md` và `tasks.md` mà không cần thêm quyết định nghiệp vụ bắt buộc.
