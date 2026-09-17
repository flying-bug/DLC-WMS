# QA Report — Quy trình Mua hàng → Nhập kho → Bán hàng → Xuất kho

## 1. Thông tin kiểm tra

- **Ngày kiểm tra:** 17/09/2026 (`Asia/Ho_Chi_Minh`)
- **Nhánh:** `release/v2.0.0`
- **Môi trường:** Docker Compose local (`dlc-backend` + `dlc-frontend` + `dlc-mysql-db`), build từ source hiện tại của nhánh
- **Phương pháp:** Gọi thẳng REST API thật qua Node.js script (không mock), đăng nhập bằng tài khoản seed thật, dữ liệu ghi thật vào MySQL. Không test qua UI trình duyệt trong đợt này — tập trung xác minh logic nghiệp vụ backend trước.
- **Tài khoản dùng để đăng nhập theo từng vai trò (VU):**

| VU | Tài khoản | Vai trò | Quyền liên quan |
|---|---|---|---|
| VU1 — Quản lý | `manager@duylong.vn` | `ROLE_MANAGER` | Toàn quyền nghiệp vụ: tạo/duyệt PO, SO, tạo phiếu kho |
| VU2 — Thủ kho | `wh_controller@duylong.vn` | `ROLE_WAREHOUSE_CONTROLLER` | `import:edit/post`, `export:add/edit/post` (không có `import:add`) |
| VU3 — Thu ngân | `cashier@duylong.vn` | `ROLE_CASHIER_CONTROLLER` | Không có quyền kho — dùng để test permission-denied |
| VU4 — Chưa đăng nhập | *(không token)* | — | Test 401/403 |

> **Lưu ý:** `default_accounts.md` ghi tài khoản `staff@duylong.vn` nhưng tài khoản này **không tồn tại** trong DB hiện tại (đã đổi thành `wh_controller@duylong.vn`, `technician@duylong.vn`, `accountant@duylong.vn`, `cashier@duylong.vn`...). Tài liệu này đã lỗi thời, nên cập nhật lại — không thuộc phạm vi sửa của đợt QA này.

## 2. Tổng hợp kết quả

| Swimlane | Số case | Pass | Fail (đã sửa) |
|---|---:|---:|---:|
| A. Mua hàng → Nhập kho (PO → Import) | 20 | 20 | 0 |
| B. Bán hàng → Xuất kho (SO → Export) | 24 | 24 | 0 |
| **Tổng** | **44** | **44** | **0** |

Tất cả case ban đầu FAIL đều do 1 trong 3 nguyên nhân: (a) **bug thật trong code** → đã sửa và verify lại pass, (b) **dữ liệu seed cũ có shape sai** (không đi qua đúng luồng ứng dụng) → né bằng dữ liệu test tự tạo, (c) **giả định sai của chính kịch bản test** (ví dụ tưởng SO vượt tồn kho phải bị từ chối, nhưng hệ thống cố tình cho phép theo mô hình backorder) → sửa lại kỳ vọng cho đúng, không phải bug.

## 3. Bug tìm thấy & đã sửa trong đợt này

### 🔴 Bug #1 — Hủy đơn bán hàng (SO) không giải phóng tồn kho đã giữ chỗ kiểu BACKORDERED

**Phát hiện qua:** Swimlane B, UC11b/UC13b — tạo SO số lượng vượt tồn kho, được duyệt (hệ thống cho backorder), sau đó hủy đơn.

**Nguyên nhân:** `SalesOrderService.approveSalesOrder()` cộng `quantity_reserved` cho **cả hai** trạng thái `HOLDING` và `BACKORDERED` (dòng ~265-280), nhưng `releaseReservations()` — hàm chạy khi hủy đơn — chỉ tìm và giải phóng reservation trạng thái `HOLDING` (bỏ sót `BACKORDERED`). Hủy một SO từng bị backorder sẽ không bao giờ trả lại phần tồn đã giữ chỗ đó.

**Tác động thực tế:** Đây không phải lỗi hiếm — backorder là luồng nghiệp vụ bình thường (bán trước, chờ nhập bù). Mỗi lần khách đặt vượt tồn rồi hủy đơn, hệ thống "mất" vĩnh viễn đúng số lượng đó khỏi tồn kho khả dụng. Cộng dồn qua thời gian, tồn "khả dụng" của một mặt hàng có thể âm sâu và **chặn toàn bộ đơn bán hàng khác** cho mặt hàng đó — đúng như tôi tái hiện được trong lúc test (reserved bị đẩy lên 3.000.042 chỉ sau vài lần test).

**Đã sửa:** [`SalesOrderService.java`](backend/src/main/java/com/duylongtech/backend/feature/sales_order/SalesOrderService.java) — `releaseReservations()` giờ giải phóng cả `HOLDING` lẫn `BACKORDERED`. Thêm test `SalesOrderReservationReleaseTest`.

**Việc còn lại (đã ghi nhận, chưa sửa vì bị chặn thao tác ghi DB trực tiếp):** dữ liệu dev DB hiện tại còn 1 dòng `inventory_balances` (variant VGA, kho Cầu Giấy) bị "nhiễm" từ trước khi tôi vá lỗi — `quantity_reserved` đang bị thổi phồng do các SO test cũ. Bạn có thể tự chạy lại 1 nghiệp vụ nhập kho cho variant đó để bù, hoặc tôi có thể sửa nếu bạn xác nhận cho phép thao tác ghi trực tiếp vào DB dev.

### 🔴 Bug #2 — Ghi sổ phiếu xuất kho thủ công bỏ qua `expectedQuantity`/`rejectedQuantity`/`discrepancyReason`

**Phát hiện qua:** Swimlane B, UC16 — tạo phiếu xuất thủ công với `quantityOut=2` nhưng `expectedQuantity=5` để kiểm tra tính năng "phát hiện chênh lệch khi xuất kho" (thêm gần đây ở commit `df70ed0`).

**Nguyên nhân:** `InventoryDocumentService.toExportLineEntity()` (dùng khi tạo/sửa phiếu xuất thủ công) **thiếu hẳn 3 dòng map field** `expectedQuantity`/`rejectedQuantity`/`discrepancyReason` từ request vào entity — trong khi hàm chị em `toImportLineEntity()` (dùng cho phiếu nhập) có đầy đủ. Hậu quả: `detectAndRecordDiscrepancy()` — logic phát hiện chênh lệch — không bao giờ có dữ liệu để so sánh cho phiếu xuất tạo thủ công, nên tính năng cảnh báo chênh lệch xuất kho **thực chất không hoạt động** với luồng này (chỉ hoạt động với luồng tự động từ SO nếu có set field tương tự).

**Đã sửa:** Thêm mapping còn thiếu vào `toExportLineEntity()`. Verify lại: `hasDiscrepancy=true`, `discrepancyNote="• SP00001: Dự kiến 5, Thực tế 2 (Thiếu: 3, Lỗi: 0)..."` — đúng như kỳ vọng.

### 🟡 Ghi nhận thêm (không phải bug code, nhưng đáng lưu ý)

- **Dữ liệu seed của variant VGA/RAM thiếu dòng `inventory_balances` theo từng serial** (chỉ có dòng tổng hợp `serial_number_id = NULL`), trong khi luồng nhập kho thật của ứng dụng (`InventoryPostingService.createImportedSerialsIfNeeded`) luôn tạo 1 dòng balance riêng cho mỗi serial. Do query tính tồn-khả-dụng cho sản phẩm quản lý serial (`sumAvailableQuantityByWarehouseAndVariant`) chỉ cộng từ các dòng balance **có serial riêng**, hàng seed kiểu này bị hệ thống coi là **0 tồn khả dụng** dù bảng `serial_numbers` báo còn hàng — khiến mọi đơn bán hàng cho các SKU này bị đẩy vào diện backorder dù thực tế còn hàng. Đây là vấn đề **chất lượng dữ liệu seed** (khả năng do nạp thẳng bằng SQL, bỏ qua luồng ứng dụng), không phải bug code — code tính đúng theo đúng shape dữ liệu nó tự tạo ra. Nên seed lại bằng cách import qua API thật, hoặc bổ sung script backfill dòng balance theo serial cho dữ liệu seed cũ.
- `default_accounts.md` lỗi thời (mục 2, ở trên).

## 4. Chi tiết Swimlane A — Mua hàng → Nhập kho

**Actor chính:** VU1 (Quản lý) tạo & duyệt PO, tạo phiếu nhập; VU2 (Thủ kho) ghi sổ / bỏ ghi sổ.

| # | Actor | Bước | Input chính | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|---|---|
| A00a | VU4 | Gọi `GET /imports` không token | — | 401/403 | ✅ 403 |
| A00b | VU4 | Đăng nhập sai mật khẩu | `admin` / sai pass | Từ chối, không lộ thông tin | ✅ 401 "Tài khoản hoặc mật khẩu không chính xác" |
| A01 | VU1 | Tạo PO mua hàng, 2 dòng (1 SP theo serial + 1 SP thường) | Nhà CC=NCC00002, VGA×2, Kéo×10 | Tạo thành công, trạng thái DRAFT | ✅ PO0423 |
| A01b | VU1 | Tạo PO không có dòng sản phẩm | `lines: []` | Từ chối | ✅ "Đơn hàng phải có ít nhất 1 dòng sản phẩm" |
| A01c | VU1 | Tạo PO không chọn nhà cung cấp | thiếu `partnerId` | Từ chối | ✅ "Nhà cung cấp không được để trống" |
| A01d | VU3 | Thu ngân thử tạo PO | — | 403 (không có quyền `purchase_order:add`) | ✅ 403 |
| A02 | VU1 | Duyệt PO | — | Chuyển APPROVED | ✅ |
| A03 | VU1 | Tạo phiếu nhập kho từ PO | 2 dòng khớp PO | Tạo DRAFT thành công | ✅ NK00102 |
| A03b | VU2 | Thủ kho thử tạo phiếu nhập | — | 403 (role này không có `import:add`, chỉ có `import:edit/post`) | ✅ 403 |
| A04 | VU1→VU2 | Tạo phiếu nhập với **thiếu serial** (cần 2, chỉ nhập 1), rồi ghi sổ | 1 serial cho dòng cần 2 | Từ chối rõ ràng, **không phải lỗi hệ thống 500** | ✅ "Sản phẩm quản lý serial phải có đúng 2 serial" |
| A05 | VU1→VU2 | Tạo phiếu nhập với **serial trùng hệ thống**, rồi ghi sổ | 1 serial đã tồn tại (seed) | Từ chối rõ ràng, không crash | ✅ "Số Serial đã tồn tại trong hệ thống" |
| A06 | VU2 | Ghi sổ phiếu nhập hợp lệ (A03) | — | POSTED, tồn kho tăng | ✅ |
| A06b | VU3 | Thu ngân thử bỏ ghi sổ | — | 403 | ✅ |
| A07 | VU2 | **Bỏ ghi sổ** phiếu vừa ghi (tính năng mới) | reason | Phiếu cũ → `CANCELLED`, tạo phiếu mới `DRAFT`, copy đủ dòng hàng | ✅ NK00102→CANCELLED, tạo NK00105 DRAFT |
| A07b | — | Kiểm tra `references` của phiếu mới | — | Có 1 tham chiếu `UNPOST_SOURCE` trỏ về phiếu cũ | ✅ |
| A07c | VU2 | Bỏ ghi sổ lại phiếu **đã CANCELLED** | — | Từ chối rõ ràng, không crash | ✅ "Chỉ có thể bỏ ghi sổ chứng từ đang ở trạng thái ĐÃ GHI SỔ" |
| A08 | VU2 | Ghi sổ lại phiếu vừa được tạo (A07) | — | POSTED — đây chính là case xác nhận lại **fix lỗi parse serial dấu phẩy** đã sửa trước đó | ✅ |
| A09 | VU1 | Xem chi tiết phiếu sau ghi sổ | — | Dữ liệu đúng, status POSTED | ✅ |

## 5. Chi tiết Swimlane B — Bán hàng → Xuất kho

**Actor chính:** VU1 tạo & duyệt SO, tạo phiếu xuất; VU2 chọn serial, ghi sổ / bỏ ghi sổ.

| # | Actor | Bước | Input chính | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|---|---|
| B09.5 | VU1→VU2 | *(setup)* Nhập kho 1 đơn vị SP serial "sạch" qua đúng luồng app | — | Có tồn kho hợp lệ để test bán hàng | ✅ |
| B10 | VU1 | Tạo SO bán hàng, 2 dòng | KH=KH000001, RAM×1, Kéo×3 | DRAFT | ✅ SO0320 |
| B10b | VU1 | Tạo SO không có dòng | `lines: []` | Từ chối | ✅ |
| B10c | VU3 | Thu ngân thử tạo SO | — | 403 | ✅ |
| B11 | VU1 | Duyệt SO (giữ chỗ tồn kho) | — | APPROVED, tạo reservation `HOLDING` | ✅ |
| B11b | VU1 | Duyệt SO **số lượng vượt tồn kho** (999.999) | — | Hệ thống **cho phép** theo mô hình backorder (reservation `BACKORDERED`, không phải lỗi) | ✅ *(ban đầu tôi kỳ vọng sai là phải từ chối — đã sửa lại kỳ vọng, không phải bug)* |
| B12 | VU1 | Tạo phiếu xuất từ SO đã duyệt | `POST /exports/from-sales-order/{id}` | Tạo DRAFT, copy dòng từ SO | ✅ XK00048 |
| B12b | VU1 | Tạo phiếu xuất từ SO **chưa duyệt** | — | Từ chối rõ ràng | ✅ "Chỉ có thể tạo phiếu xuất kho cho đơn hàng ĐÃ DUYỆT" |
| B12c | VU3 | Thu ngân thử tạo phiếu xuất | — | 403 | ✅ |
| B12d | VU1 | Chọn serial cụ thể cho dòng SP serial trước khi ghi sổ | `PUT /exports/{id}` | Cập nhật thành công | ✅ *(sau khi né dữ liệu seed lỗi, xem mục 3)* |
| B13 | VU2 | Ghi sổ phiếu xuất hợp lệ | — | POSTED, tồn kho giảm, serial → SOLD | ✅ |
| B13b | VU1 | Tạo phiếu xuất thủ công **vượt tồn kho khả dụng** | qty=999.999 | Chặn **ngay lúc tạo phiếu**, không đợi đến lúc ghi sổ, không crash | ✅ "Số lượng xuất lớn hơn số lượng tồn kho khả dụng..." |
| B14a | VU3 | Thu ngân thử bỏ ghi sổ phiếu xuất | — | 403 | ✅ |
| B14 | VU2 | **Bỏ ghi sổ** phiếu xuất (không liên quan bảo hành) → tạo phiếu mới | reason | Phiếu cũ → `CANCELLED`, phiếu mới `DRAFT` kèm `references` | ✅ XK00051→CANCELLED, tạo XK00052 |
| B14b | — | Kiểm tra `references` trỏ về phiếu cũ | — | 1 tham chiếu `UNPOST_SOURCE` | ✅ |
| B15 | VU2 | Ghi sổ lại phiếu xuất vừa tạo | — | POSTED | ✅ |
| B16 | VU1→VU2 | Tạo & ghi sổ phiếu xuất có **chênh lệch** (`quantityOut=2` nhưng `expectedQuantity=5`) | — | `hasDiscrepancy=true`, ghi chú chênh lệch đúng, thông báo cho Kế toán/Quản lý | ✅ *(sau khi sửa Bug #2)* |

### Ghi chú riêng cho B14 (business rule đúng, không phải bug)

Lúc đầu tôi định dùng lại phiếu xuất của B12/13 (có `warrantyMonths=12`, `issuePurpose=SALES` → tự sinh phiếu bảo hành khi ghi sổ) để test bỏ-ghi-sổ. Hệ thống **từ chối đúng**: *"Không thể bỏ ghi sổ trực tiếp vì đã phát sinh hóa đơn/bảo hành/sửa chữa dựa trên lần xuất này! ... vui lòng dùng nghiệp vụ Nhập trả hàng (RETURN)."* — đây là safeguard hợp lý (tránh mồ côi dữ liệu bảo hành), nên tôi tạo phiếu riêng không dính bảo hành để test đúng phạm vi tính năng bỏ-ghi-sổ-tạo-phiếu-mới.

## 6. Phạm vi chưa kiểm tra trong đợt này

- Chưa test qua giao diện UI thật (chỉ test API) — các trang Create/Update phiếu vừa thêm phần "Chứng từ liên quan" nên được bấm thử trên trình duyệt thật.
- Chưa test luồng Chuyển kho (Stock Transfer), Kiểm kê (Stocktake), Lắp ráp/Tháo dỡ (Assembly), Nhập trả hàng (RETURN).
- Chưa test tự động hết hạn reservation (`StockReservationExpiryJob`).
- Chưa test in phiếu / xuất hoá đơn điện tử.

## 7. Kỹ thuật

Đã chạy sau mỗi lần sửa: `./mvnw -o compile` + `./mvnw -o test` (9/9 test pass — 7 test cũ + `InventoryDocumentServiceUnpostReissueTest` + `SalesOrderReservationReleaseTest` mới), rebuild Docker image `backend`, restart container, chạy lại toàn bộ script test trên môi trường mới build.
