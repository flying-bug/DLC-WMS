# Super Admin End-to-End QA Report

> Kết luận: **KHÔNG thể xác nhận toàn bộ luồng đã verified** vì còn 14 mục `NOT TESTED` và 4 mục `FAIL`. Có một lỗi P0 liên quan đăng nhập rỗng cần xử lý trước khi phát hành.

## 1. Thời gian và môi trường kiểm thử

- Thời gian: 2026-08-09, khoảng 19:10–19:56 (UTC+07:00, Asia/Saigon).
- Workspace: `D:\DLC-WMS`.
- Frontend: `http://localhost:5173` — HTTP 200 sau rebuild cuối.
- Backend Swagger: `http://localhost:8080/swagger-ui/index.html` — HTTP 200.
- OpenAPI: `http://localhost:8080/v3/api-docs` — HTTP 200.
- Runtime: Docker Compose; `dlc-frontend` Up, `dlc-backend` Up, `dlc-mysql-db` Up/healthy.
- Trình kiểm thử: Codex In-app Browser, viewport cao 900px.
- Width kiểm thử trực tiếp: 320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1366, 1440, 1920px.
- Docker đã được build hai lần. Lần cuối thực hiện sau khi phát hiện working tree có thêm thay đổi trong lúc QA, rồi smoke lại toàn bộ 6 route.
- Kết quả tổng hợp theo test scenario: **64 PASS / 4 FAIL / 14 NOT TESTED**.

## 2. Commit/branch

- Branch: `feature/fix-responsive-ui`.
- Commit: `0f7c99b273e2b28291457c2412ae1a05dd3845bd`.
- Commit subject: `feat(super-admin): improve responsive UI and permissions`.

## 3. Trạng thái working tree trước và sau QA

### Trước QA E2E

Các thay đổi được ghi nhận ban đầu và được giữ nguyên:

- `M frontend/src/components/layout/AdminLayout.jsx`
- `M frontend/src/components/layout/AdminLayout.module.css`
- `M frontend/src/pages/Dashboard/WarehouseDashboard.jsx`
- `M frontend/src/pages/Dashboard/WarehouseDashboard.module.css`
- `?? frontend/src/components/workflow/`
- `?? frontend/src/utils/workflowSession.js`

### Thay đổi xuất hiện trong lúc QA

Các file sau xuất hiện/thay đổi trong working tree trong lúc phiên QA đang chạy; Codex không tạo, không sửa, không revert và không format các file này:

- `M backend/src/main/java/com/duylongtech/backend/controller/ProductController.java`
- `M backend/src/main/java/com/duylongtech/backend/repository/ProductRepository.java`
- `M backend/src/main/java/com/duylongtech/backend/repository/ReportRepository.java`
- `M backend/src/main/java/com/duylongtech/backend/service/ProductService.java`
- `M backend/src/main/java/com/duylongtech/backend/service/impl/ReportServiceImpl.java`
- `M frontend/src/pages/Product/ProductPage.jsx`
- `?? backend/src/main/java/com/duylongtech/backend/dto/response/StockAlertSummaryResponse.java`

### Sau QA

- Toàn bộ thay đổi source ở trên vẫn được giữ nguyên.
- File duy nhất Codex tạo trong repo: `SUPER_ADMIN_FLOW_QA.md`.
- `RESPONSIVE_QA.md` không bị ghi đè.
- `git diff --check` không báo whitespace error; chỉ báo các cảnh báo chuyển LF sang CRLF ở working copy.

## 4. Tài khoản/role dùng kiểm thử

- Tài khoản: `admin`.
- Role quan sát trực tiếp: Super Admin/System Admin.
- Không ghi mật khẩu vào báo cáo.
- Tài khoản `Nhân Viên Kho` (ID 3, role `ROLE_STAFF`) chỉ được dùng để đọc chi tiết và thử trạng thái checkbox phân quyền cục bộ; không bấm Lưu.
- Không khóa/mở khóa, xóa, đổi mật khẩu hoặc thay quyền của tài khoản thật.

## 5. Các route đã kiểm tra

| Route | Màn hình | Kết quả tải sau rebuild cuối |
|---|---|---|
| `/dashboard` | Dashboard Super Admin | Tải thành công |
| `/users` | User Management | Tải 4 user, dữ liệu hiển thị |
| `/users/create` | Create Account | Form tải thành công |
| `/users/3/permissions` | Permission Management | Tải đúng `Nhân Viên Kho`, có matrix |
| `/audit-log` | Audit Log | Tải log và pagination |
| `/operations` | Operations Center | Tải đủ 4 tab chính |

Ngoài ra đã kiểm tra `/login`, redirect route bảo vệ sau logout, Swagger và OpenAPI endpoint.

## 6. Danh sách flow PASS

| ID | Flow trực tiếp đã kiểm tra |
|---|---|
| PASS-01 | Đăng nhập đúng tài khoản Super Admin vào `/dashboard`. |
| PASS-02 | Đăng nhập sai bằng dữ liệu `QA_CODEX_wrong` bị từ chối với HTTP 401 và thông báo phù hợp. |
| PASS-03 | Reload sau đăng nhập vẫn giữ phiên và ở `/dashboard`. |
| PASS-04 | Truy cập trực tiếp đủ 6 route Super Admin khi đã đăng nhập. |
| PASS-05 | Logout đưa về `/login`. |
| PASS-06 | Sau logout, truy cập trực tiếp `/users` bị redirect về `/login`. |
| PASS-07 | Nút hiện/ẩn mật khẩu đổi input từ `password` sang `text`. |
| PASS-08 | Checkbox “Ghi nhớ đăng nhập” bật/tắt được; phiên đăng nhập đúng tồn tại sau reload. |
| PASS-09 | Header/logo hiển thị; click logo từ Users/Audit/Operations về Dashboard. |
| PASS-10 | Điều hướng Dashboard → Users bằng action card. |
| PASS-11 | Điều hướng Dashboard → Audit Log bằng action card. |
| PASS-12 | Điều hướng Dashboard → Operations bằng action card. |
| PASS-13 | Active navigation state đúng trên Users, Audit Log và Operations. |
| PASS-14 | Mobile hamburger mở/đóng thực tế ở 320/360/375/390/430px. |
| PASS-15 | Ba mục trong mobile menu có kích thước cao 44px và chiếm đủ chiều rộng menu. |
| PASS-16 | Profile dropdown đóng bằng click ngoài. |
| PASS-17 | Theme Xanh lá bật được, `aria-pressed=true`, sau đó hoàn nguyên về Mặc định. |
| PASS-18 | Dashboard hiển thị welcome, 3 action card và footer. |
| PASS-19 | Không có document-level horizontal overflow trên 6 route × 12 width; table/matrix dùng vùng scroll nội bộ. |
| PASS-20 | Users tải 4 tài khoản; stat tổng 4, đang làm việc 3, khóa 1. |
| PASS-21 | Click từng stat card/filter cập nhật danh sách. |
| PASS-22 | Search Users theo tên `System Admin`. |
| PASS-23 | Search Users theo mã/tên đăng nhập `admin`. |
| PASS-24 | Search Users theo email `admin@duylongtech.com`. |
| PASS-25 | Search chuỗi không tồn tại hiển thị `Không tìm thấy nhân viên nào`. |
| PASS-26 | Filter role `SUPER_ADMIN`. |
| PASS-27 | Filter role `MANAGER`. |
| PASS-28 | Filter role `STAFF`. |
| PASS-29 | Reset filter trả về 4 rows và xóa search. |
| PASS-30 | Đổi page size Users từ 10 sang 20 rồi hoàn nguyên 10. |
| PASS-31 | Action menu của cả 4 rows mở được và hiển thị action phù hợp trạng thái. |
| PASS-32 | Drawer của cả 4 rows mở đúng user được chọn. |
| PASS-33 | Drawer hiển thị đúng mã, email, điện thoại, role và trạng thái theo row. |
| PASS-34 | Ba tab Drawer: Thông tin chung, Thông tin nhân viên, Chức năng/Vai trò. |
| PASS-35 | Drawer đóng bằng nút X. |
| PASS-36 | Drawer đóng bằng overlay ở desktop. |
| PASS-37 | Drawer đóng bằng Escape. |
| PASS-38 | Drawer focus trap hoạt động và restore focus về row trigger. |
| PASS-39 | Drawer được mở thực tế tại 320/360/375/390/430px; tablist scroll ngang ở 320–390 và vừa ở 430. |
| PASS-40 | Create Account có breadcrumb, heading và action bar. |
| PASS-41 | Submit form rỗng chặn trường Họ tên/Tên đăng nhập. |
| PASS-42 | Khi đã nhập hai trường đầu, form chặn thiếu Số điện thoại. |
| PASS-43 | Form chặn thiếu Email. |
| PASS-44 | Email sai định dạng bị native email validation chặn. |
| PASS-45 | CCCD chứa chữ bị chặn với thông báo chỉ cho phép số. |
| PASS-46 | Radio giới tính, select chức danh/phòng ban và date phản ánh lựa chọn. |
| PASS-47 | Cancel từ Create Account quay về `/users`. |
| PASS-48 | Permission tải đúng `Nhân Viên Kho`, role `ROLE_STAFF`. |
| PASS-49 | Chuyển trực tiếp đủ 6 module; bốn module bắt buộc đều có dữ liệu: Quản lý kho, Danh mục, Báo cáo, Quản trị hệ thống. |
| PASS-50 | Matrix có đủ cột Toàn quyền/Xem/Thêm/Sửa/Xóa/Xuất Excel/In. |
| PASS-51 | Quan sát được 3 checkbox disabled ở module Quản lý kho. |
| PASS-52 | Chọn Toàn quyền cập nhật các quyền liên quan; bỏ quyền riêng lẻ làm Toàn quyền bỏ chọn. |
| PASS-53 | Không lưu quyền; reload khôi phục trạng thái trước thử nghiệm. |
| PASS-54 | Mobile matrix có scrollbar ngang và nút cuộn trái/phải. |
| PASS-55 | Bấm nút cuộn phải ba lần ở 320px đưa cột cuối `In` vào vùng nhìn thấy; nút trái đưa về đầu. |
| PASS-56 | Audit tải log, search có kết quả, search không tồn tại có empty state, reset trả dữ liệu. |
| PASS-57 | Audit date range hợp lệ ngày 2026-08-09 tải log. |
| PASS-58 | Audit pagination Next → trang 2, nhập trang cuối 20, Previous → trang 19. |
| PASS-59 | Audit modal mở hai loại log (`CREATE`, `POST`), có metadata, diff 20 thay đổi và empty diff 0 thay đổi. |
| PASS-60 | Audit modal đóng bằng X, overlay, Escape; focus trap và restore focus hoạt động. |
| PASS-61 | Audit modal mở thực tế ở 320/360/375/390/430px, role dialog và accessible name đúng. |
| PASS-62 | Operations Overview hiển thị DB/JVM/Disk/backup count; Refresh giữ trạng thái ONLINE. |
| PASS-63 | Backup empty state, Resource/Services/Application Logs, log filters ALL/INFO/WARN/ERROR, mobile sub-tab scroll và Settings load thành công. |
| PASS-64 | `lint`, `build`, `git diff --check`, Docker Compose, frontend/Swagger/OpenAPI health checks hoàn tất; kết quả chi tiết ở mục 12. |

## 7. Danh sách flow FAIL

| ID | Severity | Flow | Kết quả |
|---|---|---|---|
| FAIL-01 | P0 | Submit login với username và password được chủ động đặt rỗng | Hai lần đều chuyển vào `/dashboard`, trái với validation bắt buộc trong UI/source. |
| FAIL-02 | P2 | Keyboard profile dropdown | Enter và Space trên trigger có `role=button`, `tabIndex=0` không mở; Escape không đóng dropdown. |
| FAIL-03 | P2 | Audit invalid date range | `Từ=2026-08-10`, `Đến=2026-08-09` không có cảnh báo/validation và danh sách vẫn tải. |
| FAIL-04 | P2 | Dashboard application shell | Dashboard không có global nav/hamburger và không có notification control ở 320/430/1024/1920; khác shell trên các màn Super Admin còn lại. |

## 8. Danh sách NOT TESTED và lý do

| ID | Hạng mục | Lý do |
|---|---|---|
| NT-01 | Redirect khi session tự hết hạn | Không có cơ chế rút ngắn TTL/an toàn trong phiên QA. |
| NT-02 | User không đủ quyền truy cập route Super Admin | Không có credential tài khoản test non-admin được cấp. |
| NT-03 | Đổi mật khẩu | Bị cấm thay đổi mật khẩu thật. |
| NT-04 | Users pagination Next/Previous/Last nhiều trang | Dataset chỉ có 4 users, một trang. |
| NT-05 | Export Users: file tải, tên file, nội dung đúng filter | Browser download event timeout; không thể xác nhận file blob được tải. |
| NT-06 | Error state Users do API failure | Không gây lỗi backend/network nhân tạo để tránh thay đổi môi trường. |
| NT-07 | Duplicate Create Account | Không có phương án cleanup user an toàn. |
| NT-08 | Tạo user thật, persistence và cleanup | `UserController` không có DELETE user; tuân thủ quy tắc không tạo nếu không cleanup an toàn. |
| NT-09 | User edit validation/persistence | Chỉ có tài khoản thật; không thay dữ liệu thật. |
| NT-10 | Khóa/mở khóa account | Không có user `QA_CODEX_`; không thao tác tài khoản thật. |
| NT-11 | Lưu quyền, reload persistence và restore | Không có tài khoản test `QA_CODEX_`; chỉ thử local rồi reload. |
| NT-12 | Touch swipe vật lý trên permission matrix | In-app Browser không cung cấp touch-emulation đáng tin cậy; scrollbar và nút cuộn đã test. |
| NT-13 | Audit log được tạo từ write-flow QA | Không thực hiện write-flow vì không cleanup an toàn. |
| NT-14 | Backup/create/restore/delete, confirmation cuối; Settings validation/save | Thao tác nguy hiểm hoặc thay cấu hình, chưa được người dùng cho phép. |

## 9. Bug list theo P0/P1/P2/P3

### P0

#### BUG-P0-01 — Login rỗng truy cập được Dashboard

- Route: `/login` → `/dashboard`.
- Breakpoint: 1024×900; không phụ thuộc responsive.
- Bước tái hiện:
  1. Đăng nhập Super Admin.
  2. Mở profile, bấm Đăng xuất; xác nhận URL là `/login`.
  3. Truy cập trực tiếp `/users`; xác nhận bị redirect về `/login`.
  4. Chủ động `fill("")` cả username và password; đọc DOM xác nhận hai value rỗng.
  5. Bấm `Đăng nhập`.
- Expected: ở lại `/login`, hiển thị lỗi bắt buộc cho cả hai trường, không tạo session.
- Actual: chuyển vào `/dashboard`. Lặp lại hai lần cùng kết quả.
- Console/network: không có 401 cho submit rỗng; hai 401 quan sát được là của test credential sai có chủ đích.
- Source nghi ngờ: `frontend/src/pages/Login/components/LoginForm.jsx`, auth session/redirect logic và runtime bundle. Source hiện có `validate()` đúng, vì vậy cần kiểm tra sự khác biệt state/runtime và auth-session handling.
- Regression: chưa đủ bằng chứng so sánh commit trước; ghi `UNKNOWN`.
- Screenshot: không chụp vì credential form là dữ liệu nhạy cảm; bằng chứng được ghi bằng DOM value và URL trước/sau.

### P1

- Không phát hiện P1 độc lập trong phạm vi đã trực tiếp kiểm tra.

### P2

#### BUG-P2-01 — Profile dropdown không hỗ trợ keyboard đầy đủ

- Route: `/dashboard`; 1024×900.
- Bước tái hiện: focus trigger `Tài khoản người dùng`; nhấn Enter, Space, Escape.
- Expected: Enter/Space mở dropdown; Escape đóng dropdown.
- Actual: Enter/Space không mở; khi mở bằng pointer, Escape không đóng. Click ngoài vẫn đóng.
- Accessibility evidence: trigger là `div role="button" tabIndex="0"` nhưng không có keyboard handler; item profile/logout là generic interactive div.
- Source nghi ngờ: `frontend/src/components/ui/UserProfileDropdown/UserProfileDropdown.jsx`.
- Regression: `UNKNOWN`.
- Screenshot: dùng ảnh Dashboard ở mục 18; lỗi chính được xác nhận qua active element và DOM state.

#### BUG-P2-02 — Audit không validate khoảng ngày đảo ngược

- Route: `/audit-log`; 1024×900.
- Bước tái hiện: nhập Từ `2026-08-10`, Đến `2026-08-09`.
- Expected: báo lỗi và không gửi query không hợp lệ, hoặc tự điều chỉnh range.
- Actual: không alert/error; danh sách 10 rows vẫn hiển thị, tổng 191 bản ghi.
- Console/network evidence: không có exception; request-level status không khả dụng trong Browser API.
- Source nghi ngờ: `frontend/src/pages/AuditLog/AuditLogPage.jsx` (`fromDateInput`, `toDateInput`, `fetchLogs`).
- Regression: `UNKNOWN`.
- Screenshot: `audit-430.png` ở mục 18 (layout); giá trị/range được xác nhận trực tiếp bằng DOM.

#### BUG-P2-03 — Dashboard dùng shell thiếu điều hướng/notification

- Route: `/dashboard`; 320, 430, 1024, 1920px.
- Bước tái hiện: mở Dashboard ở các width trên, đọc accessibility tree của header.
- Expected: application shell nhất quán với các màn Super Admin; có nav/hamburger và notification control theo phạm vi yêu cầu.
- Actual: header chỉ có logo và profile; không có `Điều hướng Super Admin`, hamburger hoặc notification button. Users/Audit/Operations dùng `SuperAdminLayout` và có hamburger/nav.
- Source nghi ngờ: `frontend/src/pages/Dashboard/WarehouseDashboard.jsx`, `frontend/src/components/layout/AdminLayout.jsx`; hai file đang có local modifications.
- Regression: `UNKNOWN`, không quy kết vì working tree thay đổi trong phiên.
- Screenshot: `dashboard-320.png`, `dashboard-430.png` ở mục 18.

### P3

#### BUG-P3-01 — Cảnh báo Docker Compose schema cũ

- Route: môi trường Docker; mọi breakpoint.
- Actual: `docker-compose.yml: the attribute version is obsolete` ở mọi lệnh compose.
- Expected: không có cảnh báo schema obsolete.
- Source nghi ngờ: `docker-compose.yml`.
- Regression: `UNKNOWN`.

#### BUG-P3-02 — Build warning về dynamic import không tạo chunk riêng

- Route: build frontend.
- Actual: Vite cảnh báo `axiosClient.js` vừa dynamic vừa static import; bundle JS chính 3,308.00 kB (gzip 894.71 kB).
- Expected: chiến lược import nhất quán và chunking có chủ đích.
- Source nghi ngờ: `frontend/src/pages/Login/components/LoginForm.jsx`, Forgot Password components và các static import API.
- Regression: `UNKNOWN`.

## 10. Console errors/warnings

- Browser console ghi 2 error `Login failed: AxiosError ... status code 401` tại bundle frontend. Cả hai phát sinh có chủ đích khi kiểm tra credential sai `QA_CODEX_wrong`; phân loại **test-induced/expected negative-path**, không phải lỗi mới của các route chính.
- Sau các navigation chính, không quan sát thêm console error/warning mới ngoài hai entry tích lũy trên.
- Lưu ý: console API trả log tích lũy theo tab; vì vậy cùng hai 401 xuất hiện khi đọc log sau mỗi route.
- System Monitor UI hiển thị 7 dòng log mẫu và tự ghi chú cần mount/config log endpoint để xem log Docker thật; không dùng các dòng này làm bằng chứng console/runtime.

## 11. Network failures

| Endpoint/flow | Method/status | Phân loại |
|---|---|---|
| Invalid login `QA_CODEX_wrong` | `POST /auth/login` → 401 (từ Axios console) | Expected negative-path/test-induced |
| Frontend root | GET → 200 (PowerShell HTTP check) | PASS |
| Swagger UI | GET → 200 | PASS |
| OpenAPI | GET → 200 | PASS |
| Các API Users/Permissions/Audit/Operations | UI nhận dữ liệu, không có error state | Functional success observed; exact per-request status không capture được |

Giới hạn công cụ: In-app Browser phiên này không expose resource/network event hoặc response status chi tiết; `performance.getEntriesByType("resource")` trả rỗng. `docker compose logs --since 45m backend frontend` không trả application request log. Vì vậy không ghi “verified” cho exact method/status của mọi request. Các luồng download blob cũng không capture được.

## 12. Lint/test/build/diff-check results

| Lệnh | Kết quả |
|---|---|
| `npm --prefix frontend run lint` | PASS; ESLint hoàn tất, không in lỗi. |
| `npm --prefix frontend run test` | **NO TEST SCRIPT** trong `frontend/package.json`; không chạy. |
| `npm --prefix frontend run build` | PASS; Vite 8.0.16, 745 modules, built in 8.73s. Có warning dynamic/static import và kích thước bundle nêu ở P3. |
| `git diff --check` | PASS về whitespace error; có warning LF→CRLF cho các file local đang thay đổi. |
| `docker compose up -d --build` | PASS; rebuild/recreate frontend/backend, DB healthy. |
| `docker compose ps` | PASS; frontend/backend Up, DB Up (healthy). |
| HTTP frontend/Swagger/OpenAPI | 200/200/200. |

## 13. Dữ liệu test đã tạo

- Không tạo user, backup, permission, audit-write hoặc system configuration mới.
- Chỉ nhập dữ liệu validation cục bộ có prefix `QA_CODEX_`; không submit thành công vào backend.
- Các login audit record do đăng nhập Super Admin là hành vi hệ thống tự ghi và không thể cleanup an toàn qua UI được kiểm thử.

## 14. Cleanup đã thực hiện

- Permission checkbox thử nghiệm không được lưu; reload xác nhận trạng thái ban đầu được khôi phục.
- Theme được hoàn nguyên từ Xanh lá về Mặc định.
- Page size Users được hoàn nguyên từ 20 về 10.
- Search/filter được reset.
- Không có test user/backup/config cần xóa.
- Browser cuối phiên giữ trạng thái đăng nhập hợp lệ để không làm gián đoạn workspace của người dùng.

## 15. Dữ liệu hoặc cấu hình còn bị thay đổi

- Không có dữ liệu nghiệp vụ hoặc system configuration do QA thay đổi còn sót.
- Không có `QA_CODEX_` record còn sót.
- Có thêm các audit login records do chính thao tác đăng nhập trong phiên; đây là log hệ thống hợp lệ, không xóa.
- Các local source modifications nêu ở mục 3 vẫn nguyên trạng và thuộc working tree người dùng.
- Docker containers đang chạy sau rebuild cuối.

## 16. Manual regression checklist

- [ ] Điều tra P0 login rỗng trên clean browser profile và DevTools Network; xác nhận request body có thực sự rỗng hay auth redirect tái sử dụng session.
- [ ] Sau fix P0, test lại logout → empty submit → direct protected route → reload → back/forward cache.
- [ ] Cấp credential non-admin test để kiểm tra authorization route Super Admin.
- [ ] Seed tối thiểu 25 users hoặc dùng fixture để test Users pagination first/next/previous/last.
- [ ] Cung cấp endpoint/UI cleanup user test; sau đó test create/duplicate/edit/lock/unlock/persistence bằng `QA_CODEX_<timestamp>`.
- [ ] Cung cấp user test riêng để lưu đúng một permission, reload, rồi restore.
- [ ] Test download Excel bằng browser hỗ trợ download artifact; kiểm tra tên và nội dung filter.
- [ ] Thêm validation `fromDate <= toDate`, rồi retest Audit query và error message.
- [ ] Bổ sung keyboard handler/Escape cho profile dropdown; test Enter/Space/Escape và focus return.
- [ ] Thống nhất shell Dashboard với Super Admin nav/hamburger/notification hoặc chốt lại requirement thiết kế.
- [ ] Dùng thiết bị/touch emulation thật để test swipe permission matrix.
- [ ] Khi được phê duyệt, test confirmation UI cho backup/restore/delete và settings validation nhưng không xác nhận thao tác phá hủy.
- [ ] Bổ sung browser/network instrumentation hoặc backend access log để kiểm tra từng request 4xx/5xx.
- [ ] Chạy lại full matrix sau khi working tree ổn định, tránh thay đổi source giữa phiên QA.

## 17. Responsive verification matrix đầy đủ

Ký hiệu: `OK` = đã mở/đo trực tiếp; `I-scroll` = nội dung rộng nằm trong vùng scroll nội bộ; `Issue` = xem bug ID. Tất cả viewport cao 900px.

| Width | Shell/header/menu | Dashboard | Users/table/pagination | Create/form/action bar | Drawer | Permission matrix | Audit/table/modal | Operations/sub-tabs | Document overflow |
|---:|---|---|---|---|---|---|---|---|---|
| 320 | Menu opened; BUG-P2-03 trên Dashboard | OK + Issue | OK, I-scroll | OK | Opened, tabs scroll | I-scroll; controls + `In` reached | I-scroll; modal opened | I-scroll sub-tabs | None |
| 360 | Menu opened; BUG-P2-03 trên Dashboard | OK + Issue | OK, I-scroll | OK | Opened, tabs scroll | I-scroll | I-scroll; modal opened | I-scroll sub-tabs | None |
| 375 | Menu opened; BUG-P2-03 trên Dashboard | OK + Issue | OK, I-scroll | OK | Opened, tabs scroll | I-scroll | I-scroll; modal opened | I-scroll sub-tabs | None |
| 390 | Menu opened; BUG-P2-03 trên Dashboard | OK + Issue | OK, I-scroll | OK | Opened, tabs scroll | I-scroll | I-scroll; modal opened | I-scroll sub-tabs | None |
| 430 | Menu opened; BUG-P2-03 trên Dashboard | OK + Issue | OK, I-scroll | OK | Opened, tabs fit | I-scroll | I-scroll; modal opened | I-scroll sub-tabs | None |
| 768 | Desktop/tablet shell | OK | OK, I-scroll | OK | Route checked | I-scroll | I-scroll | OK | None |
| 820 | Desktop/tablet shell | OK | OK, I-scroll | OK | Route checked | OK/I-scroll as needed | I-scroll | OK | None |
| 1024 | Shell checked; profile keyboard Issue | OK + Issue | OK | OK | Desktop interactions checked | OK | OK + invalid-date Issue | OK | None |
| 1280 | Shell checked | OK + Issue | OK | OK | Desktop interactions checked | OK | OK | OK | None |
| 1366 | Shell checked | OK + Issue | OK | OK | Desktop interactions checked | OK | OK | OK | None |
| 1440 | Shell checked | OK + Issue | OK | OK | Desktop interactions checked | OK | OK | OK | None |
| 1920 | Shell checked | OK + Issue | OK | OK | Desktop interactions checked | OK | OK | OK | None |

Đo trực tiếp bổ sung:

- Mobile menu width lần lượt 281/321/328/343/383px; mỗi nav button cao 44px.
- Drawer width lấp viewport content ở cả 5 mobile width; tablist client/scroll: 302/398 ở 320, 342/398 ở 360, 357/398 ở 375, 372/398 ở 390, 412/412 ở 430.
- Audit modal width bằng document client width: 305/345/360/375/415px; modal có scroll dọc và không làm document overflow.
- Permission table rộng 760px, wrapper `overflow-x:auto`; ở 320px wrapper client 243px/scroll 760px. Nút phải ba lần đưa checkbox `In` từ x=737 về x=220.
- Operations main tabs wrapper và System Monitor sub-tabs đều `overflow-x:auto`; sub-tabs cao 44px, không còn chữ dọc.
- Document root không overflow ngang ở toàn bộ 72 tổ hợp route/width đã đo.

## 18. Screenshot evidence

Thư mục evidence: `C:\Users\THU UYEN\.codex\visualizations\2026\08\09\019fe591-8122-7263-a6ea-b5c37dc3f3b7\super-admin-flow`

| Evidence | Files |
|---|---|
| Dashboard | `dashboard-320.png`, `dashboard-430.png` |
| Users | `users-320.png`, `users-430.png` |
| Create Account | `create-320.png`, `create-430.png` |
| Mobile menu | `mobile-menu-320.png`, `mobile-menu-430.png` |
| Employee Drawer | `drawer-final-320.png`, `drawer-final-430.png` |
| Permissions | `permissions-320.png`, `permissions-430.png` |
| Audit page | `audit-320.png`, `audit-430.png` |
| Audit modal | `audit-modal-320.png`, `audit-modal-430.png` |
| Operations | `operations-320.png`, `operations-430.png` |
| Monitor sub-tabs | `monitor-tabs-320.png` |

Các ảnh `drawer-320.png` và `drawer-430.png` là frame chuyển động ban đầu; dùng `drawer-final-*` làm bằng chứng ổn định sau animation.
