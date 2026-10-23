# RoomDesk – Meeting Room Booking API (FR_SBAD_LA_01)

REST API cho phép nhân viên tìm phòng trống, đặt và huỷ phòng họp; ADMIN quản lý danh sách phòng.

- Java 21, Spring Boot 4.1, Spring Data JPA (Hibernate 7), Flyway, PostgreSQL 17
- Spring Security 7 + JWT HS256 (OAuth2 Resource Server / Nimbus)
- Lỗi theo RFC 9457 (`application/problem+json`)
- OpenAPI: `/v3/api-docs`, Swagger UI: `/swagger-ui.html`

## Chạy bằng Docker Compose

```bash
cp .env.example .env      # điền DB_PASSWORD và JWT_SECRET (JWT_SECRET >= 32 ký tự)
docker compose up --build
```

API chạy ở `http://localhost:8080`. Compose dừng với thông báo rõ ràng nếu thiếu `DB_PASSWORD`
hoặc `JWT_SECRET`. Flyway tạo schema và nạp dữ liệu mẫu khi khởi động lần đầu.

| Email | Password | Role |
|---|---|---|
| admin@roomdesk.test | Admin#2026 | ADMIN |
| alex@roomdesk.test | Alex#2026 | EMPLOYEE |
| ben@roomdesk.test | Ben#2026 | EMPLOYEE |

Room mẫu: `HN-5F-01` Lotus (8), `HN-5F-02` Orchid (4), `HN-6F-01` Bamboo (12), `HN-6F-02` Sakura (20).

```bash
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"alex@roomdesk.test","password":"Alex#2026"}' | jq -r .accessToken)
curl -s localhost:8080/api/rooms -H "Authorization: Bearer $TOKEN"
```

## Chạy local (profile `local`, mặc định)

Cần PostgreSQL 17 ở `localhost:5432`, database `roomdesk`, user `roomdesk`:

```bash
export DB_PASSWORD=...        # bắt buộc
export JWT_SECRET=...         # bắt buộc, >= 32 ký tự
# tuỳ chọn: DB_URL, DB_USERNAME, CORS_ALLOWED_ORIGINS
./mvnw spring-boot:run
```

## Test

```bash
./mvnw test        # cần Docker đang chạy
```

Test có truy cập database chạy trên PostgreSQL 17 thật (Testcontainers, image `postgres:17-alpine`).
Thời điểm "hiện tại" trong test được cố định ở 2026-11-01 08:00 (Asia/Ho_Chi_Minh).

| Test | Nội dung |
|---|---|
| `domain/BookingRulesTest` | Unit test rule booking: chạm nhau lúc 10:00, đúng 4h và 4h15, bắt đầu 08:00, kết thúc 20:00, phút 00/15/30/45, tương lai, huỷ |
| `domain/BookingWindowValidatorTest` | Constraint `@ValidBookingWindow` dùng `Clock` cố định |
| `web/ErrorContractWebTest` | Web test cho mọi cặp status/type: 400 validation & malformed-request, 401, 403, 404, 409 (5 loại), 500 |
| `security/SecurityIntegrationTest` | Không token, token hết hạn, sai chữ ký, EMPLOYEE gọi route ADMIN, EMPLOYEE đọc booking người khác (404), login, CORS, actuator |
| `integration/BookingFlowIntegrationTest` | Luồng booking, `/mine` (sắp xếp, from/to, phân trang, không N+1), schedule, available |
| `integration/RoomIntegrationTest` | CRUD room, giảm capacity → 409, deactivation |
| `integration/DeactivationRollbackIntegrationTest` | Deactivation lỗi giữa chừng → room và mọi booking giữ nguyên |
| `integration/ConcurrentBookingIntegrationTest` | 2 request HTTP chồng lịch gửi đồng thời → đúng 1 booking; exclusion constraint của DB |

## Thiết kế

**Layer** (`com.fsa.roomdesk`): `web` (controller, exception handler) → `service` → `repository` → `domain`.
Request/response là record trong `dto`; service chỉ trả DTO, entity không ra khỏi service.
Mọi dependency inject qua constructor.

**Không bao giờ có 2 booking CONFIRMED chồng nhau**, kể cả khi request đến cùng lúc:
1. Tạo booking, đổi capacity và deactivation đều khoá dòng room trước (`SELECT ... FOR UPDATE`),
   nên các thao tác trên cùng một room chạy tuần tự; request thứ hai thấy booking của request đầu
   và trả `409 /booking-overlap`.
2. Database có exclusion constraint `bookings_no_overlap`
   (`EXCLUDE USING gist (room_id WITH =, tsrange(start_at, end_at, '[)') WITH &&) WHERE (status = 'CONFIRMED')`)
   làm lớp bảo vệ cuối. Khoảng `[)` nửa mở nên 09:00–10:00 và 10:00–10:30 không chồng nhau;
   booking CANCELLED không giữ chỗ.

**Transaction**: mỗi thao tác ghi là một transaction; lỗi ở bất kỳ bước nào rollback toàn bộ,
nên thao tác bị từ chối không để lại dữ liệu. Booking chỉ bị huỷ (status), không bao giờ bị xoá.

**Validation**: lỗi phát hiện được chỉ từ request → 400 (Bean Validation trên body, path variable,
query param; rule khung giờ trong `BookingRules` qua `@ValidBookingWindow`). Lỗi phụ thuộc dữ liệu
đã lưu → 409. Thời gian là giờ địa phương Asia/Ho_Chi_Minh, đọc từ một bean `Clock`.

**Bảo mật**: password lưu BCrypt; JWT HS256, subject = email, claim `role`, hết hạn 30 phút; secret
từ `JWT_SECRET`. Stateless, không session. Email không tồn tại và sai password trả cùng một 401.
EMPLOYEE truy cập booking của người khác nhận 404. CORS chỉ cho origin trong
`CORS_ALLOWED_ORIGINS` (mặc định `http://localhost:5173`). Actuator chỉ mở `/actuator/health`.

**Cấu hình**: profile `local`, `test` (trong `src/test/resources`), `docker`. URL DB, username,
password và JWT secret đều đến từ biến môi trường; không có secret nào trong source, trừ key chỉ
dùng cho test trong `src/test`.

**Schema và seed**: `src/main/resources/db/migration/V1__create_schema.sql`, `V2__seed_data.sql` (Flyway).

**Image**: multi-stage; stage build dùng JDK, image chạy chỉ có JRE và các layer của jar
(không source, không JDK), chạy bằng user `roomdesk` (không phải root).

## Nộp bài

```bash
scripts/package-submission.sh <fpt_account>   # tạo sbad_assignment_01_<fpt_account>.zip
```

Zip không chứa `target/`, `.idea/`, `.vscode/`, `.env`, dữ liệu database hay secret nào.
