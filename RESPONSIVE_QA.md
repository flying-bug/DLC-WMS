# Responsive QA Report — Super Admin

## 1. Thông tin kiểm tra

- Ngày kiểm tra: **09/08/2026** (`Asia/Saigon`)
- Project: `D:\DLC-WMS`
- Branch: `feature/fix-responsive-ui`
- URL kiểm tra: `http://localhost:5173`
- Trình duyệt: **Codex In-app Browser**
- Tài khoản: Super Admin (`admin`)
- Chiều cao viewport dùng thống nhất: **900px**
- Các chiều rộng đã kiểm tra trực tiếp:
  - `320px`
  - `360px`
  - `375px`
  - `390px`
  - `430px`
  - `768px`
  - `820px`
  - `1024px`
  - `1280px`
  - `1366px`
  - `1440px`
  - `1920px`

Các container Docker đã được build/recreate từ working tree hiện tại trước khi QA. Frontend, backend và dữ liệu MySQL đều tải được trực tiếp trong Browser sau khi đăng nhập.

## 2. Phạm vi

Các route/màn hình đã kiểm tra:

| Màn hình | Route | Trạng thái tương tác được kiểm tra |
|---|---|---|
| Dashboard Super Admin | `/dashboard` | Header, action cards, footer |
| Quản lý người dùng | `/users` | Stats, bộ lọc, bảng, pagination, menu mobile |
| Thêm nhân viên | `/users/create` | Breadcrumb, form, action bar cố định |
| Phân quyền chi tiết | `/users/3/permissions` | Sidebar module, ma trận checkbox, footer cố định |
| Nhật ký hệ thống | `/audit-log` | Bộ lọc, bảng, pagination |
| Trung tâm vận hành | `/operations` | Tổng quan và các tab chính |
| Drawer nhân viên | mở từ `/users` | Drawer tại mobile |
| Modal audit | mở từ `/audit-log` | Modal chi tiết tại mobile |

Các tab trong Trung tâm vận hành đã mở trực tiếp:

- Tổng quan
- Sao lưu & Khôi phục
- Giám sát hệ thống
- Cài đặt hệ thống

Không thực hiện các thao tác ghi dữ liệu như lưu nhân viên, lưu phân quyền, khóa tài khoản, backup, restore hoặc lưu cấu hình.

## 3. Quy ước kết quả

- **PASS**: không phát hiện lỗi bố cục gây cản trở sử dụng tại breakpoint đã kiểm tra.
- **FAIL**: có lỗi responsive trực tiếp, nội dung/điều khiển bị cắt, nén hoặc khó/không thể truy cập.
- **NOTE**: màn hình vẫn sử dụng được nhưng có rủi ro UX/accessibility hoặc dùng vùng cuộn nội bộ.

## 4. Tổng hợp lỗi

### P1 — Menu Super Admin vỡ bố cục tại toàn bộ mobile widths

**Ảnh hưởng:** `320`, `360`, `375`, `390`, `430px` và mọi màn hình sử dụng `SuperAdminLayout`.

Khi mở hamburger menu, navigation không xuống thành một hàng riêng chiếm toàn bộ chiều rộng. Menu bị ép vào phần không gian còn lại bên phải logo, khiến nhãn xuống dòng theo từng từ hoặc từng ký tự.

Kích thước đo trực tiếp:

| Width | Chiều rộng navigation | Chiều rộng mỗi menu item | Kết quả |
|---:|---:|---:|---|
| 320 | 53px | 53px | FAIL |
| 360 | 93px | 93px | FAIL |
| 375 | 81px | 81px | FAIL |
| 390 | 96px | 96px | FAIL |
| 430 | 136px | 136px | FAIL |

Nguồn liên quan:

- `frontend/src/components/layout/SuperAdminLayout.module.css:227`
- `frontend/src/components/layout/SuperAdminLayout.module.css:252`
- `.headerLeft` vẫn là flex một hàng, không có `width: 100%`/`flex-wrap` ở mobile.

Bằng chứng: [menu-open-320.png](<C:/Users/THU UYEN/.codex/visualizations/2026/08/09/019fe591-8122-7263-a6ea-b5c37dc3f3b7/qa-responsive/menu-open-320.png>)

### P1 — Ma trận phân quyền bị cắt và không có vùng cuộn khả dụng

**Ảnh hưởng trực tiếp:** `320–768px`.

Ở `320px`, phần nội dung khả dụng rộng khoảng `257px` nhưng `.matrixContent`/table giữ chiều rộng nội tại khoảng `760–762px`. Các checkbox nằm ngoài viewport:

| Quyền của dòng đầu tiên | Vị trí ngang đo được tại 320px |
|---|---:|
| Toàn quyền | x = 297–317 |
| Xem | x = 386–406 |
| Thêm | x = 455–475 |
| Sửa | x = 521–541 |
| Xóa | x = 582–602 |
| Xuất Excel | x = 665–685 |
| In | x = 746–766 |

Tại mobile, `.matrixContent` tự mở rộng theo `table { min-width: 760px; }`, thay vì co theo parent để kích hoạt `overflow-x: auto`. Vì vậy các cột ngoài màn hình không thể truy cập bằng vùng cuộn của ma trận. Tại `768px`, cột cuối vẫn bị cắt. Tại `1024px`, ma trận mới co đủ để thanh cuộn ngang xuất hiện đúng.

Nguồn liên quan:

- `frontend/src/pages/Permissions/PermissionDetailPage.module.css:148`
- `frontend/src/pages/Permissions/PermissionDetailPage.module.css:225`
- `frontend/src/pages/Permissions/PermissionDetailPage.module.css:414`
- `.layout` chuyển sang column nhưng vẫn kế thừa `align-items: flex-start`; `.matrixContent` thiếu `width/max-width: 100%` hoặc parent thiếu `align-items: stretch`.

Bằng chứng: [permissions-320.png](<C:/Users/THU UYEN/.codex/visualizations/2026/08/09/019fe591-8122-7263-a6ea-b5c37dc3f3b7/qa-responsive/permissions-320.png>)

### P1 — Bộ lọc trang người dùng bị ép ngang trên mobile

**Ảnh hưởng:** `320`, `360`, `375`, `390`, `430px`.

Ô tìm kiếm và dropdown vai trò vẫn nằm cạnh nhau. Các rule mobile mong muốn bố cục dọc và nút lớn hơn nhưng bị các base styles khai báo phía sau ghi đè.

| Width | Search | Dropdown vai trò | Nút reset/export |
|---:|---:|---:|---:|
| 320 | 119 × 38 | 80 × 38 | 38 × 44 |
| 360 | 133 × 38 | 106 × 38 | 38 × 44 |
| 375 | 138 × 38 | 117 × 38 | 38 × 44 |
| 390 | 142 × 38 | 127 × 38 | 38 × 44 |
| 430 | 153 × 38 | 156 × 38 | 38 × 44 |

Placeholder bị cắt mạnh và các nút icon không đạt touch target rộng 44px.

Nguồn liên quan:

- Mobile rules: `frontend/src/pages/UsersPage.module.css:690–823`
- Base rules nằm sau media query: `frontend/src/pages/UsersPage.module.css:825–947`
- Đặc biệt: `.searchAndPopover`, `.filterActions`, `.iconBtn`.

Bằng chứng: [users-320.png](<C:/Users/THU UYEN/.codex/visualizations/2026/08/09/019fe591-8122-7263-a6ea-b5c37dc3f3b7/qa-responsive/users-320.png>)

### P2 — Tab con Giám sát hệ thống bị nén chữ tại 320px

Ba tab con `Sử dụng tài nguyên`, `Trạng thái dịch vụ`, `Nhật ký ứng dụng` bị chia thành các cột quá hẹp. Nhãn xuống dòng gần như từng ký tự và rất khó đọc/chọn.

Nguồn liên quan:

- `frontend/src/pages/Operations/tabs/SystemMonitorTab.module.css:8`
- File này không nằm trong danh sách local changes hiện tại; đây là lỗi quan sát được trong QA, không kết luận là regression do diff hiện tại.

Bằng chứng: [operations-monitor-320.png](<C:/Users/THU UYEN/.codex/visualizations/2026/08/09/019fe591-8122-7263-a6ea-b5c37dc3f3b7/qa-responsive/operations-monitor-320.png>)

### P2 — Dashboard mobile có touch target chuông quá hẹp

Nút thông báo cao `44px` nhưng chỉ rộng:

| Width | Chiều rộng nút chuông |
|---:|---:|
| 320 | 29px |
| 360 | 31px |
| 375 | 32px |
| 390 | 33px |
| 430 | 34px |

Nút không đạt touch target `44 × 44px`. Ở `320px`, tên `System Admin` cũng bị xuống dòng chật trong header, dù không gây document-level horizontal overflow.

Nguồn liên quan:

- `frontend/src/pages/Dashboard/SuperAdminDashboard.module.css:88`
- `frontend/src/pages/Dashboard/SuperAdminDashboard.module.css:132`
- `frontend/src/pages/Dashboard/SuperAdminDashboard.module.css:397`

### P2 — Nhiều control mobile chưa đạt touch target 44px

Các giá trị dưới đây được đo trực tiếp; đây là rủi ro accessibility/khả năng thao tác, không phải tất cả đều gây lỗi bố cục:

- `/users`: input/select cao `38px`; nút row action rộng `26px`; reset/export rộng `38px`.
- `/audit-log`: input ngày/search/select cao `38px`; nút xem chi tiết mỗi dòng rộng `26px`.
- `/users/create`: input/select cao `38px`; radio gốc `18 × 18px` nhưng nhãn bao quanh có thể click.
- `/users/3/permissions`: checkbox gốc `20 × 20px` và không có label wrapper mở rộng vùng bấm.
- `/operations`: refresh icon ở mobile rộng khoảng `36px`.

### P3 — Trailing whitespace

`git diff --check` phát hiện:

```text
frontend/src/components/ui/Pagination/Pagination.module.css:82: trailing whitespace.
```

Không sửa trong lần QA này.

## 5. Ma trận kết quả theo màn hình và breakpoint

### 5.1 Mobile: 320–430px

| Màn hình | 320 | 360 | 375 | 390 | 430 | Ghi chú |
|---|---|---|---|---|---|---|
| Dashboard | NOTE | NOTE | NOTE | NOTE | NOTE | Cards xếp 1 cột, không tràn ngang; chuông <44px, header chật |
| Users | FAIL | FAIL | FAIL | FAIL | FAIL | Filter bị ép ngang; table có vùng cuộn nội bộ; menu global bị vỡ |
| Create Employee | NOTE | NOTE | NOTE | NOTE | NOTE | Form xếp 1 cột và không tràn ngang; controls cao 38px; menu global bị vỡ khi mở |
| Audit Log | NOTE | NOTE | NOTE | NOTE | NOTE | Filter xếp dọc; table cuộn ngang nội bộ; action target hẹp; menu global bị vỡ khi mở |
| Operations Overview | NOTE | NOTE | NOTE | NOTE | NOTE | Cards xếp 1 cột; tabs chính cuộn ngang với scrollbar ẩn |
| Operations Monitor | FAIL | Chưa mở riêng | Chưa mở riêng | Chưa mở riêng | Chưa mở riêng | 320px: sub-tabs bị nén chữ |
| Permission Detail | FAIL | FAIL | FAIL | FAIL | FAIL | Ma trận quyền bị cắt, các cột ngoài viewport không truy cập được |
| Employee Drawer | PASS | — | — | — | — | 320px: full width, body scroll; tablist cuộn ngang |
| Audit Detail Modal | PASS | — | — | — | — | 320px: modal vừa viewport, body scroll, nút đóng truy cập được |

`—` nghĩa là trạng thái tương tác phụ không được mở riêng ở width đó; route chính vẫn được kiểm tra.

### 5.2 Tablet/small desktop: 768–1024px

| Màn hình | 768 | 820 | 1024 | Ghi chú |
|---|---|---|---|---|
| Dashboard | PASS | PASS | PASS | 768/820 dùng grid 2 cột; 1024 chuyển 3 cột |
| Users | NOTE | NOTE | PASS | 768/820 table cuộn ngang nội bộ (`800px`); header nav hơi chật nhưng dùng được |
| Create Employee | PASS | PASS | PASS | Grid/form và action bar hiển thị đúng |
| Audit Log | NOTE | NOTE | PASS | 768/820 table cuộn ngang nội bộ; filter stack đúng |
| Operations | PASS | PASS | PASS | Overview cards tự chuyển số cột, không có document overflow |
| Permission Detail | FAIL | PASS | PASS | 768 vẫn cắt cột cuối; 820 vừa nội dung; 1024 có scrollbar ma trận khi cần |

### 5.3 Desktop: 1280–1920px

| Màn hình | 1280 | 1366 | 1440 | 1920 | Ghi chú |
|---|---|---|---|---|---|
| Dashboard | PASS | PASS | PASS | PASS | 3 action cards, footer và background hiển thị đúng |
| Users | PASS | PASS | PASS | PASS | Bảng đầy đủ cột, stats và filters cân đối |
| Create Employee | PASS | PASS | PASS | PASS | Form 2 cột, action bar không che nội dung cuối |
| Audit Log | PASS | PASS | PASS | PASS | Bảng đầy đủ 6 cột; modal desktop chưa thấy overflow bất thường |
| Operations | PASS | PASS | PASS | PASS | Overview 4 cards ở desktop lớn; các tab chính truy cập được |
| Permission Detail | PASS | PASS | PASS | PASS | Sidebar + matrix hiển thị đầy đủ; 1920 có nhiều khoảng trắng nhưng không lỗi |

## 6. Kết quả chi tiết theo màn hình

### Dashboard Super Admin

- Không có document-level horizontal overflow tại 12 width.
- `320–430px`: action cards xếp 1 cột.
- `768–820px`: action cards xếp 2 cột.
- `1024px+`: action cards xếp 3 cột.
- Footer tự wrap tại các width nhỏ.
- Lỗi: nút chuông hẹp và thông tin tài khoản chật trên mobile.

### Quản lý người dùng

- Dữ liệu 4 tài khoản tải thành công.
- Stats chuyển từ 1 cột trên mobile sang 2/3 cột theo width.
- `320–430px`: filter layout không đạt thiết kế mobile do cascade CSS.
- Table dùng `.table-responsive`, min-width `800px`:
  - 320: viewport table `257px`, scroll width `800px`.
  - 430: viewport table `367px`, scroll width `800px`.
  - 768: viewport table `671px`, scroll width `800px`.
  - 820: viewport table `723px`, scroll width `800px`.
  - 1024+: không cần cuộn ngang.
- Employee drawer tại 320px không tràn ngang và có focusable close button.

### Thêm nhân viên

- Không có document-level horizontal overflow tại 12 width.
- Form chuyển từ 2 cột sang 1 cột ở mobile.
- Breadcrumb wrap được.
- Fixed action bar hiển thị ở đáy; page có padding-bottom để không che phần nội dung cuối.
- 320px có scroll height khoảng `1744px`; controls chính cao `38px`.
- Không submit form trong QA.

### Nhật ký hệ thống

- Log và pagination tải thành công; tổng `183` bản ghi tại thời điểm kiểm tra.
- Filter stack đúng ở mobile.
- Table min-width `800px`, cuộn ngang nội bộ từ `320–820px`.
- Modal chi tiết log tại 320px:
  - vừa viewport;
  - header/nút đóng hiển thị đầy đủ;
  - body cuộn dọc;
  - không có dữ liệu before/after ở record đã mở.

### Trung tâm vận hành

- Database hiển thị `ONLINE — MySQL 8.0.45`.
- Dữ liệu dashboard tải được: database size, JVM memory, disk và backup count.
- Overview không tràn ngang tại 12 width.
- Main tabs dùng `overflow-x: auto`; scrollbar bị ẩn nên khả năng khám phá thao tác cuộn chưa rõ trên mobile.
- Backup tab và Settings tab tại 320px không gây document overflow.
- Monitor tab tại 320px có lỗi sub-tabs bị nén chữ.
- Không bấm `Sao lưu ngay`, `Tạo Backup mới`, `Lưu tất cả`, upload JSON hoặc các control gây thay đổi cấu hình.

### Phân quyền chi tiết

- User `Nhân Viên Kho`, route `/users/3/permissions` tải thành công.
- Không thay đổi checkbox và không bấm `Lưu thay đổi`.
- Sidebar module chuyển thành full-width block ở mobile.
- Footer action chuyển thành 2 nút full width ở mobile.
- Ma trận quyền là lỗi blocking ở `320–768px`: phần tử tồn tại trong DOM nhưng nằm ngoài viewport, không có scroller đúng tại breakpoint này.

## 7. Kiểm tra kỹ thuật

### Docker

Đã chạy:

```powershell
docker compose up -d --build
```

Kết quả:

- Frontend image build thành công.
- Backend image build thành công.
- MySQL healthy.
- Backend và frontend được recreate/start thành công.
- Sau build, Browser đăng nhập và tải dữ liệu các màn Super Admin thành công.

Cảnh báo không chặn QA:

```text
docker-compose.yml: the attribute `version` is obsolete
```

### Lint

Đã chạy:

```powershell
npm --prefix frontend run lint
```

Kết quả: **thành công**, không có ESLint error trong output.

### Diff check

Đã chạy:

```powershell
git diff --check
```

Kết quả: có một trailing whitespace tại `Pagination.module.css:82`; ngoài ra có các cảnh báo Git về LF sẽ được đổi sang CRLF khi Git ghi lại file.

### Browser console

Không ghi nhận console error/warning khi mở trực tiếp các route chính tại desktop trong phiên QA.

## 8. Trạng thái working tree

Trước và sau QA, working tree có cùng 20 source files đã sửa:

```text
frontend/src/components/layout/AdminLayout.module.css
frontend/src/components/layout/SuperAdminLayout.jsx
frontend/src/components/layout/SuperAdminLayout.module.css
frontend/src/components/ui/EmployeeDrawer/EmployeeDrawer.jsx
frontend/src/components/ui/EmployeeDrawer/EmployeeDrawer.module.css
frontend/src/components/ui/Modal/Modal.jsx
frontend/src/components/ui/Modal/Modal.module.css
frontend/src/components/ui/Pagination/Pagination.module.css
frontend/src/pages/AuditLog/AuditLogPage.jsx
frontend/src/pages/AuditLog/AuditLogPage.module.css
frontend/src/pages/CreateEmployee/CreateEmployeePage.jsx
frontend/src/pages/CreateEmployee/CreateEmployeePage.module.css
frontend/src/pages/Dashboard/SuperAdminDashboard.jsx
frontend/src/pages/Dashboard/SuperAdminDashboard.module.css
frontend/src/pages/Operations/OperationsCenterPage.jsx
frontend/src/pages/Operations/OperationsCenterPage.module.css
frontend/src/pages/Permissions/PermissionDetailPage.jsx
frontend/src/pages/Permissions/PermissionDetailPage.module.css
frontend/src/pages/UsersPage.jsx
frontend/src/pages/UsersPage.module.css
```

Diff tổng tại thời điểm QA:

```text
20 files changed, 1218 insertions(+), 507 deletions(-)
```

Không source file nào được sửa hoặc revert trong quá trình QA. File duy nhất được tạo bởi yêu cầu báo cáo là `RESPONSIVE_QA.md`.

## 9. Thứ tự ưu tiên đề xuất

1. Sửa kích thước/cấu trúc mobile của `SuperAdminLayout` để menu chiếm full width.
2. Sửa `.layout`/`.matrixContent` ở trang phân quyền để ma trận co theo parent và kích hoạt horizontal scroll từ mobile.
3. Sắp xếp lại CSS trang Users để base styles không ghi đè media query mobile.
4. Thiết kế lại sub-tabs của System Monitor cho mobile (scroll ngang hoặc stack hợp lý).
5. Chuẩn hóa touch target tối thiểu `44 × 44px` cho icon buttons, row actions và controls quan trọng.
6. Xóa trailing whitespace tại `Pagination.module.css:82` khi thực hiện đợt sửa source tiếp theo.
