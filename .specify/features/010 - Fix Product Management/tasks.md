# Tasks: Fix Product Management

**Feature**: `[010-fix-product-management]`  
**Sources**: `spec.md`, `clarify.md`, `plan.md`, `data-model.md`  
**Status**: Not Started

## Task format

```text
- [ ] Txxx [P?] [US?] Mô tả kèm file path
```

- `[P]`: Có thể thực hiện song song với task khác trong cùng phase vì không sửa cùng file hoặc không phụ thuộc kết quả trực tiếp.
- `[US1]`: Tạo Product single/default Variant.
- `[US2]`: Tạo Product explicit multi-variant.
- `[US3]`: Validation và bảo vệ tính toàn vẹn SKU.
- `[US4]`: Tái tạo tổ hợp và bảo toàn dữ liệu frontend.

Không tạo task migration schema vì data model hiện tại đã đủ cho feature.

## Phase 1 - Contract và foundation

**Mục tiêu**: Backend có contract mới nhưng payload cũ vẫn compile và hoạt động.

- [x] T001 [P] Bổ sung `hasVariants` và `List<ProductVariantRequest> variants` vào `backend/src/main/java/com/duylongtech/backend/dto/request/ProductRequest.java`.
- [x] T002 [P] Bỏ `@NotNull` tuyệt đối của `ProductRequest.salePrice`; ghi chú validation có điều kiện được xử lý trong service tại `backend/src/main/java/com/duylongtech/backend/dto/request/ProductRequest.java`.
- [x] T003 [P] Bổ sung `List<ProductVariantResponse> variants` vào `backend/src/main/java/com/duylongtech/backend/dto/response/ProductResponse.java`.
- [x] T004 [P] Thêm các business error code ổn định cho mode, count, duplicate, specs, tracking và value vào `backend/src/main/java/com/duylongtech/backend/constant/SystemMessage.java`.
- [x] T005 [P] Thêm batch repository methods tìm SKU/barcode theo collection vào `backend/src/main/java/com/duylongtech/backend/repository/ProductVariantRepository.java`.
- [x] T006 Chạy backend compile để xác nhận contract không làm hỏng controller/service hiện có: `cd backend; .\mvnw.cmd -DskipTests compile`.

**Checkpoint**: Backend compile; endpoint cũ chưa đổi behavior.

## Phase 2 - User Story 1: Single/default Variant

**Goal**: Payload hiện tại tiếp tục tạo một Product và đúng một default Variant.

**Independent test**: Gửi request không có `hasVariants`/`variants`; xác nhận Product và default Variant dùng cùng Product code.

- [x] T007 [US1] Viết test payload legacy, `hasVariants=null` và `hasVariants=false` trong `backend/src/test/java/com/duylongtech/backend/service/ProductServiceVariantCreationTest.java`.
- [x] T008 [US1] Implement resolver xác định variant mode theo truth table trong private method của `backend/src/main/java/com/duylongtech/backend/service/ProductService.java`.
- [x] T009 [US1] Implement conditional validation: single mode yêu cầu Product sale price; variants phải null/rỗng trong `ProductService.java`.
- [x] T010 [US1] Giữ logic sinh Product code khi trống và bảo đảm default Variant dùng code đã sinh trong `ProductService.java`.
- [x] T011 [US1] Chuẩn hóa mapping default Variant: sale price, min stock, warranty, active và tracking mode trong `ProductService.java`.
- [x] T012 [US1] Bổ sung test xác nhận single create không ghi Inventory Balance, Ledger hoặc Serial trong `ProductServiceVariantCreationTest.java`.

**Checkpoint**: User Story 1 chạy độc lập và regression payload cũ pass.

## Phase 3 - User Story 3: Validation và data integrity foundation

**Goal**: Có validator dùng chung trước khi triển khai save multi-variant.

**Independent test**: Gọi validator/service với duplicate SKU, barcode, specs và invalid JSON; xác nhận request bị từ chối trước khi lưu Product.

- [ ] T013 [P] [US3] Thêm test normalize SKU/barcode, giới hạn 100 và ít nhất một active Variant vào `ProductServiceVariantCreationTest.java`.
- [ ] T014 [P] [US3] Thêm test JSON object hợp lệ, JSON array/scalar lỗi và canonical key không phụ thuộc thứ tự key vào `ProductServiceVariantCreationTest.java`.
- [x] T015 [US3] Implement normalize SKU/barcode bằng locale trung lập trong private helpers của `backend/src/main/java/com/duylongtech/backend/service/ProductService.java`.
- [x] T016 [US3] Inject/reuse Jackson `ObjectMapper` và implement parse/canonicalize `specsJson` trong `ProductService.java`; không dùng xử lý chuỗi thủ công.
- [x] T017 [US3] Implement batch validation trong memory cho required fields, money, min stock, warranty, tracking mode, active count và 1-100 rows trong `ProductService.java`.
- [x] T018 [US3] Implement duplicate detection cho normalized SKU, normalized barcode và canonical specs trong request tại `ProductService.java`.
- [x] T019 [US3] Dùng batch repository methods để kiểm tra SKU/barcode đã tồn tại trong database tại `ProductService.java`.
- [x] T020 [US3] Implement rule Product type: Dịch vụ chỉ single/NONE; Thành phẩm hoặc `isAssembly=true` phải thuộc serial tracking group tại `ProductService.java`.
- [x] T021 [US3] Map validation errors thành business code và kèm row index/SKU; không lộ SQL/stack trace trong `ProductService.java` và global exception handler hiện có nếu cần.

**Checkpoint**: Validator đầy đủ, không thực hiện N query duplicate cho N Variant.

## Phase 4 - User Story 2: Backend multi-variant create

**Goal**: Một request tạo atomic một Product và 1-100 explicit Variants, không có default Variant thừa.

**Independent test**: Tạo Product với hai Variants; xác nhận đúng hai row liên kết Product, barcode blank được sinh và response trả cả hai.

- [x] T022 [US2] Viết test multi mode thành công, không gọi default Variant và map đúng Product relation trong `ProductServiceVariantCreationTest.java`.
- [ ] T023 [US2] Viết test payload mode mâu thuẫn, Product code trống, empty variants và 101 variants trong `ProductServiceVariantCreationTest.java`.
- [x] T024 [US2] Tách private `buildVariant(Product, ProductVariantRequest)` dùng chung cho create Product và endpoint create Variant trong `backend/src/main/java/com/duylongtech/backend/service/ProductService.java`.
- [x] T025 [US2] Cập nhật `createProduct(...)`: prevalidate batch, save Product/conversions, `saveAll` explicit Variants, flush và không gọi `createDefaultVariant` trong multi mode tại `ProductService.java`.
- [x] T026 [US2] Bảo đảm mọi save Product, conversions và Variants nằm trong cùng transaction và exception cuối batch rollback toàn bộ trong `ProductService.java`.
- [x] T027 [US2] Populate `ProductResponse.variants` cho create và get detail nhưng không bắt buộc cho list/search trong `ProductService.java`.
- [x] T028 [US2] Bổ sung test response chứa Variant ID, SKU, barcode backend-generated và tracking mode trong `ProductServiceVariantCreationTest.java`.
- [x] T029 [US3] Bắt unique conflict do concurrency ở boundary hiện có và chuyển thành HTTP 400/business duplicate code, không trả HTTP 500.
- [ ] T030 [US2] Cập nhật OpenAPI description/example cho `POST /api/v1/products` trong `backend/src/main/java/com/duylongtech/backend/controller/ProductController.java`.

**Checkpoint**: User Story 2 và User Story 3 backend pass độc lập.

## Phase 5 - Audit và guard Variant đã có dữ liệu

**Goal**: Không tạo phản hồi thất bại giả sau commit và không cho thay đổi khóa nghiệp vụ gây lệch dữ liệu.

- [x] T031 [P] [US3] Refactor kiểm tra operational references đang dùng trong `deleteVariant(...)` thành private helper tái sử dụng tại `backend/src/main/java/com/duylongtech/backend/service/ProductService.java`.
- [x] T032 [US3] Khóa đổi SKU trong `updateVariant(...)` khi Variant đã có chứng từ, tồn, serial hoặc BOM; vẫn cho update field khác nếu SKU không đổi tại `ProductService.java`.
- [x] T033 [US3] Khóa đổi tracking mode khi Variant đã có operational references tại `ProductService.java`.
- [x] T034 [P] [US2] Cập nhật audit success ghi Product ID/code/variant count và không ghi cost price tại `backend/src/main/java/com/duylongtech/backend/controller/ProductController.java`.
- [x] T035 [US2] Tách lỗi audit khỏi create response: audit failure chỉ log warning, không rethrow sau khi Product đã commit trong `ProductController.java`.
- [ ] T036 [P] [US3] Bổ sung test update SKU/tracking guard vào `ProductServiceVariantCreationTest.java` hoặc test ProductService hiện có.

**Checkpoint**: Retry client không phát sinh do audit false failure; invariant SKU/tracking được backend bảo vệ.

## Phase 6 - Frontend utility foundation

**Goal**: Logic tổ hợp và normalization được kiểm thử độc lập với React UI.

- [x] T037 [P] [US2] Tạo normalize attribute/value và canonical key trong `frontend/src/pages/Product/utils/variantCombinationUtils.js`.
- [x] T038 [P] [US2] Tạo Cartesian product ổn định và guard count trước khi sinh quá 100 rows trong `variantCombinationUtils.js`.
- [x] T039 [P] [US2] Tạo SKU slug generator uppercase/bỏ dấu/giới hạn 50/collision suffix trong `variantCombinationUtils.js`.
- [x] T040 [US4] Tạo merge rows theo canonical key, giữ dirty row và áp dụng excluded keys trong `variantCombinationUtils.js`.
- [x] T041 [US2] Viết `node:test` cho normalize, canonical key, Cartesian product, count limit và SKU generator tại `frontend/src/pages/Product/utils/variantCombinationUtils.test.js`.
- [x] T042 [US4] Bổ sung test merge dirty rows, manual SKU và excluded combinations tại `variantCombinationUtils.test.js`.
- [x] T043 [P] Thêm script `test:variants` dùng `node --test` vào `frontend/package.json`; không thêm dependency.

**Checkpoint**: `npm.cmd run test:variants` pass.

## Phase 7 - User Story 2: Product Variant Configurator UI

**Goal**: Người dùng cấu hình và chỉnh toàn bộ Variant trước khi submit Product.

**Independent test**: Bật multi mode, nhập 2x2 attribute values, chỉnh một row và xác nhận payload có đúng bốn Variants.

- [x] T044 [US2] Tạo component shell, switch mode và Variant defaults tại `frontend/src/pages/Product/components/ProductVariantConfigurator.jsx`.
- [x] T045 [US2] Implement tối đa 3 attribute rows, value chips nhập bằng Enter/dấu phẩy và validation duplicate/length trong `ProductVariantConfigurator.jsx`.
- [x] T046 [US2] Render count tổ hợp, chặn vượt 100 và hiển thị lỗi tại khu vực cấu hình trong `ProductVariantConfigurator.jsx`.
- [x] T047 [US2] Render bảng Variant với variant name, SKU, barcode, giá, MPN, min stock, tracking, warranty, active và delete action trong `ProductVariantConfigurator.jsx`.
- [x] T048 [US2] Implement Apply to all theo field và confirm khi ghi đè dirty rows trong `ProductVariantConfigurator.jsx`.
- [x] T049 [US2] Implement Product type rules: disable multi mode cho Dịch vụ và ép serial tracking cho Thành phẩm/isAssembly trong `ProductVariantConfigurator.jsx`.
- [x] T050 [US2] Implement `skuManuallyEdited` và thao tác khôi phục SKU tự động trong `ProductVariantConfigurator.jsx`.

**Checkpoint**: Configurator tạo được payload hợp lệ mà chưa cần gọi API.

## Phase 8 - User Story 4: Regeneration và bảo toàn dữ liệu

**Goal**: Thay đổi thuộc tính không âm thầm làm mất dữ liệu người dùng.

**Independent test**: Chỉnh giá/SKU một row, thêm attribute value, xác nhận row cũ giữ dữ liệu và row mới nhận default.

- [x] T051 [US4] Theo dõi `isDirty` trên tất cả field Variant trong `ProductVariantConfigurator.jsx`.
- [x] T052 [US4] Lưu snapshot trước thay đổi attribute và hiển thị confirm nếu có dirty rows trong `ProductVariantConfigurator.jsx`.
- [x] T053 [US4] Khi confirm, merge rows theo canonical key; khi cancel, restore cả attributes và rows trong `ProductVariantConfigurator.jsx`.
- [x] T054 [US4] Implement `excludedCombinationKeys` khi xóa row và action `Khôi phục tất cả tổ hợp` trong `ProductVariantConfigurator.jsx`.
- [x] T055 [US4] Confirm khi tắt multi mode; reset attributes/rows/excluded keys nhưng giữ defaults gần nhất trong `ProductVariantConfigurator.jsx`.

**Checkpoint**: Các acceptance scenarios User Story 4 đạt bằng manual test và utility tests.

## Phase 9 - Tích hợp ProductPage

**Goal**: Single và multi mode dùng chung form Product hiện tại mà không phá workflow cũ.

- [x] T056 [US2] Chèn `ProductVariantConfigurator` giữa Thông tin chung và Đơn vị chuyển đổi trong `frontend/src/pages/Product/ProductPage.jsx`.
- [x] T057 [US1] Single mode giữ input Product hiện tại và build `hasVariants=false`, `variants=[]` trong `ProductPage.jsx`.
- [x] T058 [US2] Multi mode yêu cầu Product code, disable/ẩn operational fields cấp Product và build `hasVariants=true`, `variants=[...]` trong `ProductPage.jsx`.
- [x] T059 [US2] Bảo đảm payload gửi number thực cho giá/min stock/warranty và JSON string hợp lệ cho specs trong `ProductPage.jsx`.
- [ ] T060 [US3] Map backend error row index/SKU vào đúng row của configurator trong `ProductPage.jsx` và `ProductVariantConfigurator.jsx`.
- [x] T061 [US2] Reset configurator sau create thành công; giữ form khi API lỗi; refresh Product/Variant list trong `ProductPage.jsx`.
- [x] T062 [US1] Xác nhận edit Product và modal quản lý SKU hiện có không bị thay đổi behavior trong `ProductPage.jsx`.

**Checkpoint**: Form tạo Product hỗ trợ cả hai mode trong một submit.

## Phase 10 - Integration, QA và release

**Goal**: Xác nhận end-to-end, backward compatibility và không phát sinh side effect kho.

- [ ] T063 [P] Chạy toàn bộ backend tests: `cd backend; .\mvnw.cmd test`.
- [x] T064 [P] Chạy frontend utility tests: `cd frontend; npm.cmd run test:variants`.
- [x] T065 [P] Chạy frontend production build: `cd frontend; npm.cmd run build`.
- [ ] T066 [US1] API smoke test payload legacy và single mode; kiểm tra đúng một default Variant.
- [ ] T067 [US2] API smoke test Product có 2 Variants, barcode blank và unit conversions.
- [ ] T068 [US3] API smoke test duplicate SKU/barcode, invalid specs, 101 rows và Product type rule.
- [ ] T069 [US3] Kiểm tra database sau request lỗi: không có Product orphan hoặc partial Variants.
- [ ] T070 [US2] Kiểm tra database sau create: không có Inventory Balance, Ledger, Lot hoặc Serial mới.
- [ ] T071 [US3] Gửi hai request đồng thời có cùng SKU; xác nhận một thành công và một nhận business duplicate error.
- [ ] T072 [US4] Manual UI test regenerate/cancel/merge/exclude/restore combinations.
- [ ] T073 [US3] Regression endpoint create/update/delete Variant hiện có, gồm guard đổi SKU/tracking.
- [ ] T074 Rà lại Swagger/API examples và cập nhật trạng thái feature sau khi toàn bộ checkpoint pass.

## Dependencies

```text
Phase 1
  ├── Phase 2 (single mode)
  └── Phase 3 (validation foundation)
         └── Phase 4 (multi backend)
                └── Phase 5 (guards/audit)

Phase 6 (frontend utilities) có thể chạy song song Phase 2-5
  └── Phase 7 (configurator)
         └── Phase 8 (regeneration)
                └── Phase 9 (ProductPage integration)

Phase 4 + Phase 9
  └── Phase 10 (end-to-end QA)
```

## Parallel execution opportunities

- T001-T005 có thể chia backend DTO/repository/error constants.
- T013 và T014 có thể viết song song trước implementation validator.
- T031 và T034 có thể thực hiện song song vì sửa service/controller khác nhau.
- T037-T039 có thể chia theo utility function nếu thống nhất export contract trước.
- Phase 6 frontend có thể chạy song song với Phase 2-5 backend dựa trên contract đã khóa.
- T063-T065 có thể chạy song song ở bước verification.

## MVP scope

MVP hoàn thành khi xong:

- Phase 1-4: API tạo Product single/multi atomic.
- Phase 6-7: Sinh tổ hợp và nhập Variant trên form.
- T056-T061 của Phase 9: Submit end-to-end.
- T063-T070 của Phase 10: Build, tests và smoke test chính.

User Story 4 về bảo toàn dirty rows là P2 nhưng nên hoàn thành trước release chính thức vì bỏ qua phần này có nguy cơ mất dữ liệu nhập trên form.

## Definition of Done

- [ ] Không còn task P1 chưa hoàn thành.
- [ ] Backend và frontend build pass.
- [ ] Test single/default và multi-variant pass.
- [ ] Payload cũ tương thích.
- [ ] Multi request atomic và không sinh default Variant thừa.
- [ ] Duplicate/concurrency trả business error ổn định.
- [ ] Không tạo tồn, lot hoặc serial.
- [ ] QA ký xác nhận các acceptance scenarios trong `spec.md` và `clarify.md`.
