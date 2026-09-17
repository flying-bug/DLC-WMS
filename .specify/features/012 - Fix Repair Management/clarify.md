# Clarifications: Fix Repair Management

**Feature**: `[012-fix-repair-management]`  
**Updated**: 2026-09-16  
**Status**: Decision Gate closed  
**Source of truth**: `spec.md`

## 1. Mục đích

Tài liệu này chốt các điểm từng còn mơ hồ trong nguồn `repair_management_spec.md`. Các quyết định dưới đây là ràng buộc của v012; thay đổi chúng phải cập nhật đồng thời `spec.md`, `data-model.md`, `plan.md` và `task.md`.

## 2. Quyết định đã chốt

### D-001 — `PARTIAL` tính theo tỷ lệ toàn lệnh

**Quyết định**: Kế toán nhập `customerSharePercent`; v012 không chia tỷ lệ theo từng dòng và không dùng một số tiền tự do làm nguồn tính chính.

| Chính sách | Tỷ lệ khách chịu |
|---|---:|
| `WARRANTY` | `0` |
| `PAID` | `100` |
| `PARTIAL` | `> 0` và `< 100` |

```text
customerPayAmount = round(totalAmount × customerSharePercent / 100)
companyCoveredAmount = totalAmount - customerPayAmount
```

- Dùng `BigDecimal`, không dùng `double`.
- Làm tròn `customerPayAmount` theo scale tiền hiện hành của hệ thống với `HALF_UP`; phần công ty chịu luôn lấy bằng phép trừ để không lệch tổng.
- Policy và tỷ lệ được Kế toán nhập ở `DRAFT`. Parts/fees thay đổi trước accept làm số tiền dự kiến được tính lại.
- Khi `DONE`, lưu snapshot `totalAmount`, `customerPayAmount`, `companyCoveredAmount`.
- Nếu Kế toán điều chỉnh policy/tỷ lệ trước khi khóa, phải lưu actor, thời điểm và lý do. Sau `DONE` không sửa trực tiếp snapshot.

**Lý do**: Tỷ lệ toàn lệnh đủ cho v012, tự thích nghi khi KTV thay đổi chi phí và tránh mô hình phân bổ theo từng dòng chưa có nhu cầu được xác nhận.

### D-002 — Không hủy trực tiếp sau khi vật tư đã được sử dụng

**Quyết định**:

1. Nếu phiếu xuất chỉ post nhầm và hàng chưa được giao/sử dụng, Thủ kho có thể unpost sau dependency check. Repair quay về `WAITING_STOCK`; Kế toán sau đó mới cancel.
2. Nếu hàng đã giao hoặc đã sử dụng, v012 không cho cancel. KTV phải finish với `repairOutcome` phù hợp và hoàn tất mọi nghiệp vụ kho.
3. V012 không triển khai `PARTS_RETURN` hoặc `CANCEL_PENDING_RETURN`.

| Tình huống | Kết quả |
|---|---|
| Chưa có document `POSTED` | Kế toán cancel có lý do; release reservation và vô hiệu document `DRAFT` |
| Export `POSTED`, chưa có dependency, hàng chưa sử dụng | Thủ kho unpost; Repair về `WAITING_STOCK`; sau đó mới được cancel |
| Export `POSTED`, hàng đã giao/sử dụng | Không cancel; finish với outcome thực tế |
| Scrap import đã `POSTED` hoặc Repair `DONE` | Không unpost/cancel; dùng adjustment riêng nếu cần sửa sai |

**Lý do**: `CANCELLED` không được dùng để che biến động tồn kho đã xảy ra. Luồng nhập trả chỉ được thêm khi có yêu cầu nghiệp vụ thực tế và phải là feature riêng.

### D-003 — Kho phế phẩm cấu hình theo từng kho sửa chữa

**Quyết định**: Mỗi warehouse dùng cho Repair có một mapping `scrapWarehouseId` tới warehouse active có `type = SCRAP`.

- Nhiều kho sửa chữa có thể cùng trỏ tới một kho phế phẩm.
- Repair snapshot `scrapWarehouseId` khi submit để cấu hình thay đổi không ảnh hưởng lệnh đang chạy.
- Không hard-code ID, không fallback `1L`, không lấy bản ghi đầu tiên có code/type `SCRAP`.
- Nếu không resolve được mapping hợp lệ, submit bị chặn trước khi workflow bắt đầu.
- Thủ kho post scrap import phải có quyền tại chính kho phế phẩm snapshot.

**Lý do**: Hệ thống đã có nhiều warehouse và phân quyền theo kho; mapping rõ ràng tránh nhập phế phẩm sai địa điểm.

### D-004 — Repair luôn gắn Partner, hỗ trợ tạo nhanh

**Quyết định**: `partnerId` bắt buộc với mọi Repair. Nếu khách chưa tồn tại, Kế toán tạo nhanh ngay trong màn tiếp nhận bằng Customer Service hiện có.

- Tìm khách theo số điện thoại trước khi tạo.
- Tối thiểu yêu cầu tên và số điện thoại hợp lệ.
- Mặc định khách tạo nhanh: `INDIVIDUAL`, `RETAIL`, `isCustomer = true`; mã do backend sinh.
- Nếu số điện thoại đã tồn tại, chọn Partner hiện có thay vì tạo bản ghi mới.
- Không lưu tên/SĐT khách free-text trên Repair làm nguồn chính.
- Không dùng Partner chung “Khách lẻ”, vì sẽ trộn lịch sử sửa chữa và thanh toán.

**Lý do**: Repair và Payment đều cần định danh Partner; quick-create giữ thao tác tại quầy nhanh nhưng vẫn bảo toàn lịch sử.

### D-005 — v012 không triển khai OTP hoặc chữ ký số

**Quyết định**: Bàn giao trong v012 chỉ lưu metadata và hỗ trợ in phiếu ký tay.

Metadata tối thiểu:

- `returnedAt`, `returnedBy` lấy từ server/principal.
- `recipientName`, `recipientPhone`.
- `returnNote`, `handoverCode`.

OTP bàn giao dự kiến là feature độc lập từ v013 nếu có yêu cầu. Không tái sử dụng OTP quên mật khẩu hiện tại vì nó thuộc ngữ cảnh xác thực tài khoản và không phải bằng chứng bàn giao bền vững. Chữ ký số chỉ xem xét sau khi có yêu cầu pháp lý, nhà cung cấp và chính sách lưu trữ.

## 3. Các làm rõ workflow bổ sung

### D-006 — Ý nghĩa của `DONE`

`DONE` nghĩa là kỹ thuật đã finish và toàn bộ chứng từ kho bắt buộc đã `POSTED`:

- Không cần xuất và không có hàng tháo: finish technical có thể đi thẳng `DONE`.
- Có xuất: export phải `POSTED` trước khi vào `IN_REPAIR`.
- Có hàng tháo: scrap import phải `POSTED` trước khi `DONE`.
- Payment và return-device là hậu xử lý, không đảo hoặc kéo dài state machine kỹ thuật/kho.

### D-007 — Phiếu phế phẩm chỉ tạo từ hàng tháo thực tế

- Không tạo scrap import khi accept hoặc trước lúc sửa.
- KTV khai báo hàng tháo tại `finish-technical`.
- Không có hàng tháo thì không tạo document rỗng.
- `REPLACE` có phần lắp mới dùng cho export và phần tháo cũ dùng cho scrap import; hai serial phải tách biệt.

### D-008 — Một chứng từ cho mỗi vai trò

Mỗi Repair có tối đa:

- Một `PARTS_EXPORT`.
- Một `SCRAP_IMPORT`.

Tổ hợp `(reference_type, reference_id, document_role)` là unique ở database. Retry xử lý duplicate key như kết quả idempotent, không sinh document mới bằng mã khác.

### D-009 — Ownership của dữ liệu

| Dữ liệu/action | Owner |
|---|---|
| Thông tin tiếp nhận, Partner, policy, KTV, kho | Kế toán khi `DRAFT` |
| Diagnosis, parts dự kiến, phí công | KTV được phân công khi `WAITING_CONFIRM` |
| Serial linh kiện xuất và post/unpost kho | Thủ kho tại warehouse tương ứng |
| Hàng tháo thực tế, scrap condition/outcome | KTV khi `IN_REPAIR` |
| Xác nhận nhận phế phẩm/post scrap import | Thủ kho tại scrap warehouse |
| Payment và bàn giao | Kế toán sau `DONE` |

Kế toán đề xuất parts ở `DRAFT` nhưng mất quyền sửa chúng sau submit. KTV không được đổi Partner, policy, KTV được phân công hoặc kho.

### D-010 — Thiết bị active và thiết bị ngoài

- `serialNumberId` trong hệ thống chỉ có một Repair active.
- Backend kiểm tra `serialNumberId` thuộc đúng `productVariantId`.
- Thiết bị ngoài phải có cả `manualDeviceName` và `manualDeviceIdentifier`.
- Trùng `manualDeviceIdentifier` chỉ cảnh báo; người dùng xác nhận tiếp tục vì không có định danh DB đủ chắc chắn.

### D-011 — `repairOutcome`

V012 dùng tối thiểu:

```text
SUCCESS | FAILED | CUSTOMER_DECLINED | UNREPAIRABLE
```

Outcome bắt buộc tại finish technical. Outcome mô tả kết quả, không tự quyết định tồn kho hoặc số tiền. Nếu parts đã dùng, Repair vẫn hoàn tất chứng từ dù outcome không phải `SUCCESS`.

### D-012 — Payment liên kết trực tiếp Repair

- Chỉ tạo payment document sau `DONE`.
- `PAYMENT_TRANSACTIONS` cần `referenceType = REPAIR`, `referenceId = repair.id` hoặc liên kết tương đương.
- Mỗi loại payment/reference chỉ tạo một lần; retry không tạo chứng từ kép.
- `note` không phải khóa liên kết hoặc idempotency.
- `customerPayAmount = 0` thì không tạo phiếu thu khách hàng.

### D-013 — Notification và audit

- Notification chỉ phát after-commit và de-duplicate theo event.
- Notification failure không rollback giao dịch nghiệp vụ đã commit.
- Audit bắt buộc cho mọi transition, reservation, document post/unpost, điều chỉnh phí, payment và bàn giao.
- Actor luôn từ principal; request không nhận actor đáng tin cậy.

## 4. Ngoài phạm vi đã xác nhận

- Partial fulfillment/multiple export batches.
- Trả vật tư đã giao bằng `PARTS_RETURN`.
- Tái mở `DONE` hoặc rewrite chứng từ đã hoàn tất.
- Cost allocation mới.
- Tự động phát hành hóa đơn điện tử.
- OTP/chữ ký điện tử bàn giao.
- Quy trình thanh lý hoặc bán phế phẩm sau nhập.

## 5. Checklist Decision Gate

- [x] Cách tính `PARTIAL` và thời điểm snapshot.
- [x] Chính sách cancel/unpost sau export.
- [x] Cách resolve kho phế phẩm.
- [x] Partner bắt buộc và tạo nhanh khách.
- [x] Phạm vi OTP/chữ ký.
- [x] Ý nghĩa `DONE` và xử lý không phát sinh chứng từ.
- [x] Quyền sửa dữ liệu theo vai trò/state.
- [x] Idempotency của inventory/payment documents.
- [x] Kết quả sửa chữa không thành công.

Decision Gate của v012 đã đóng. Mọi yêu cầu thay đổi các mục trên phải được xử lý như thay đổi scope, không điều chỉnh ngầm trong lúc code.
