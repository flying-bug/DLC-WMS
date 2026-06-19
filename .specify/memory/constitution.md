<!-- 
## Sync Impact Report
- Version change: N/A → 1.0.0 (Initial ratification)
- Added principles:
  - I. Layered Architecture (NEW)
  - II. SOLID Principles (NEW)
  - III. Test-First with 80% Coverage (NEW)
  - IV. Centralized System Messages (NEW)
  - V. Security-First (NEW)
  - VI. Data Integrity & Audit Trail (NEW)
  - VII. Serial Tracking & Inventory Accuracy (NEW)
  - VIII. RESTful API Standards (NEW)
  - IX. Component-Based UI (NEW)
  - X. Simplicity & YAGNI (NEW)
- Added sections:
  - Technology Stack Constraints (NEW)
  - Development Workflow & Quality Gates (NEW)
  - Governance (NEW)
- Templates requiring updates:
  - .ai/spec-kit/plan-template.md ✅ aligned (Constitution Check section present)
  - .ai/spec-kit/spec-template.md ✅ aligned (User Stories + Requirements structure)
  - .ai/spec-kit/tasks-template.md ✅ aligned (Phase-based + parallel task structure)
  - .ai/spec-kit/checklist-template.md ✅ aligned (Generic checklist structure)
- Follow-up TODOs: None
-->

# DLC-WMS Constitution

## Core Principles

### I. Layered Architecture

Mọi tính năng PHẢI tuân thủ kiến trúc phân tầng nghiêm ngặt, tách biệt rõ ràng trách nhiệm giữa các lớp:

- **Backend (Spring Boot)**: `Controller → Service → Repository → Entity`. Controller chỉ xử lý HTTP request/response và delegation. Service chứa toàn bộ business logic. Repository chỉ chịu trách nhiệm truy vấn dữ liệu. Entity ánh xạ 1:1 với bảng database.
- **Frontend (React + Vite)**: `Page → Component → API Service → Constants`. Page là đơn vị route-level chứa layout và orchestration. Component là đơn vị UI tái sử dụng. API Service đóng gói toàn bộ giao tiếp HTTP qua Axios.
- **DTO (Data Transfer Object)**: Backend PHẢI sử dụng DTO riêng biệt cho Request và Response. Tuyệt đối KHÔNG trả trực tiếp Entity ra API để tránh lộ cấu trúc database và các trường nhạy cảm (VD: `password_hash`).
- **Rationale**: Kiến trúc phân tầng đảm bảo mỗi lớp có thể thay đổi, test, và scale độc lập mà không ảnh hưởng lớp khác.

### II. SOLID Principles

Mọi class và module PHẢI tuân thủ nguyên tắc SOLID:

- **S – Single Responsibility**: Mỗi class/component chỉ đảm nhận đúng một trách nhiệm duy nhất. VD: `InventoryDocumentService` chỉ xử lý logic phiếu kho, KHÔNG xử lý logic email hay authentication.
- **O – Open/Closed**: Thiết kế mở rộng thông qua interface/abstract class, KHÔNG sửa đổi code hiện tại. VD: Thêm loại phiếu kho mới bằng cách implement interface, KHÔNG thêm `if-else` vào service hiện tại.
- **L – Liskov Substitution**: Subclass PHẢI thay thế được parent class mà không làm thay đổi hành vi đúng đắn của chương trình.
- **I – Interface Segregation**: Tách interface lớn thành các interface nhỏ, chuyên biệt. Client KHÔNG bị buộc phụ thuộc vào method mà nó không sử dụng.
- **D – Dependency Inversion**: Các module cấp cao KHÔNG phụ thuộc vào module cấp thấp. Cả hai PHẢI phụ thuộc vào abstraction (interface). VD: Service inject Repository thông qua interface, KHÔNG `new` trực tiếp.
- **Rationale**: SOLID giảm coupling, tăng cohesion, giúp codebase dễ bảo trì, dễ test, và dễ mở rộng theo thời gian.

### III. Test-First with 80% Coverage (NON-NEGOTIABLE)

Mọi tính năng PHẢI đạt mức test coverage tối thiểu 80%:

- **Backend (Spring Boot)**:
  - Unit test cho Service layer sử dụng JUnit 5 + Mockito. Mỗi public method của Service PHẢI có ít nhất: 1 test happy path, 1 test validation error, 1 test edge case.
  - Integration test cho Controller layer sử dụng `@WebMvcTest` hoặc `@SpringBootTest` để kiểm tra luồng end-to-end từ HTTP request đến response.
  - Repository test sử dụng `@DataJpaTest` với H2 in-memory database cho các custom query.
- **Frontend (React + Vite)**:
  - Component test sử dụng Vitest + React Testing Library. Mỗi component PHẢI có test cho: render đúng props, xử lý user interaction, hiển thị đúng trạng thái loading/error/empty.
- **Coverage Gate**: CI pipeline PHẢI fail nếu coverage xuống dưới 80% trên bất kỳ module nào.
- **Rationale**: 80% coverage là ngưỡng cân bằng giữa chất lượng đảm bảo và tốc độ phát triển, ngăn chặn regression bugs trước khi lên production.

### IV. Centralized System Messages

Mọi thông báo hệ thống PHẢI được quản lý tập trung, KHÔNG hardcode text trong code:

- **Backend**: Sử dụng enum `SystemMessage.java` tại `com.duylongtech.backend.constant` làm nguồn duy nhất cho tất cả mã lỗi và câu thông báo. Mỗi entry gồm `code` (VD: `MSG01`, `AUTH01`, `INV04`) và `message` (câu thông báo tiếng Việt).
- **Frontend**: Sử dụng file `constants/index.js` để map và hiển thị thông báo. Toast message, inline error, popup warning đều PHẢI tham chiếu đến mã code từ API response, KHÔNG viết text cứng trên UI.
- **Thêm message mới**: PHẢI thêm vào `SystemMessage.java` trước, sau đó cập nhật `SYSTEM_MESSAGES.md` để đồng bộ tài liệu.
- **Rationale**: Quản lý tập trung đảm bảo tính nhất quán ngôn ngữ, dễ dàng đa ngôn ngữ hóa trong tương lai, và loại bỏ lỗi typo rải rác trong codebase.

### V. Security-First

Mọi tính năng PHẢI tuân thủ các quy tắc bảo mật bắt buộc:

- **Authentication**: Sử dụng JWT (JSON Web Token) qua thư viện `jjwt`. Mọi API endpoint (trừ `/auth/login`, `/auth/register`, `/auth/forgot-password`) PHẢI yêu cầu Bearer Token hợp lệ.
- **Authorization**: Hệ thống RBAC 3 tầng (`SUPER_ADMIN`, `MANAGER`, `STAFF`). Phân quyền động chi tiết (Xem/Thêm/Sửa/Xóa theo module) chỉ áp dụng cho `STAFF`. Data-level security qua bảng `USER_WAREHOUSE_ROLES`.
- **Password**: PHẢI mã hóa một chiều (BCrypt hashing) trước khi lưu database. Tuyệt đối KHÔNG log, trả về API, hoặc lưu plaintext password.
- **Account Lockout**: Khóa tài khoản 30 phút sau 5 lần đăng nhập sai liên tiếp (BR-03).
- **OTP**: Mã xác thực qua email có hiệu lực tối đa 5 phút (BR-02).
- **Input Validation**: Sử dụng `spring-boot-starter-validation` (@Valid, @NotBlank, @Email, @Size). Frontend PHẢI validate trước khi gọi API, Backend PHẢI validate lại lần nữa.
- **Rationale**: Hệ thống quản lý kho linh kiện điện tử chứa dữ liệu tài chính nhạy cảm, bảo mật là ưu tiên hàng đầu.

### VI. Data Integrity & Audit Trail

Mọi thay đổi dữ liệu PHẢI đảm bảo tính toàn vẹn và truy vết được:

- **Audit Log**: Mọi thao tác CUD (Create/Update/Delete) và Login/Logout PHẢI tự động ghi vào bảng `AUDIT_LOGS` (BR-06). Audit Log là append-only, KHÔNG ai được phép sửa/xóa (BR-07).
- **Soft Delete**: Đối với các entity đã phát sinh giao dịch (Sản phẩm, Khách hàng, Nhà cung cấp, Kho hàng), KHÔNG được phép Hard Delete. Chỉ được chuyển trạng thái sang `INACTIVE` (BR-11, BR-16, BR-17).
- **Referential Integrity**: Mọi khóa ngoại PHẢI được enforce ở cấp database. Code PHẢI bắt `DataIntegrityViolationException` và trả về thông báo nghiệp vụ thân thiện thay vì lỗi SQL thô.
- **Optimistic Locking**: Sử dụng `@Version` annotation cho các entity có nguy cơ concurrent update cao (VD: `INVENTORY_BALANCES`, `WAREHOUSES`).
- **Rationale**: Đảm bảo dữ liệu kế toán kho và tài chính luôn chính xác, minh bạch, và có thể kiểm toán.

### VII. Serial Tracking & Inventory Accuracy

Hệ thống PHẢI đảm bảo độ chính xác tuyệt đối trong quản lý tồn kho:

- **Serial Management**: Linh kiện điện tử cốt lõi (CPU, GPU, Mainboard, Laptop) PHẢI bắt buộc quản lý theo Serial (BR-14). Mỗi Serial Number là duy nhất trên toàn hệ thống.
- **No Negative Inventory**: Tồn kho KHÔNG bao giờ được phép âm (BR-25). Hệ thống PHẢI validate tại cả Service layer và Database constraint.
- **Import/Export Validation**: Phiếu nhập PHẢI có ≥1 line item với số lượng và đơn giá > 0 (BR-19). Số Serial quét PHẢI khớp chính xác số lượng khai báo (BR-20). Không nhập Serial đang `IN_STOCK` (BR-21).
- **Stocktake Lock**: Khi kho đang kiểm kê, KHÔNG được phép nhập/xuất hàng (BR-31).
- **Cost Calculation**: Hỗ trợ giá vốn trung bình (MAC) và FIFO. Tính toán lại khi nhập kho hoàn thành (BR-23).
- **Rationale**: Sai lệch tồn kho linh kiện điện tử gây thiệt hại tài chính nghiêm trọng và mất niềm tin khách hàng.

### VIII. RESTful API Standards

Mọi API endpoint PHẢI tuân thủ chuẩn RESTful:

- **URL Convention**: Resource-based, lowercase, plural nouns. VD: `/api/v1/warehouses`, `/api/v1/products/{id}`. Versioning qua URL prefix `/api/v1/`.
- **HTTP Methods**: `GET` (đọc), `POST` (tạo mới), `PUT` (cập nhật toàn phần), `PATCH` (cập nhật một phần), `DELETE` (xóa).
- **Response Format**: JSON chuẩn hóa với cấu trúc `{ "status": <HTTP_CODE>, "message": "<text>", "data": <payload> }`. Phân trang sử dụng `page`, `size`, `totalElements`, `totalPages`.
- **Error Response**: Trả về HTTP status code đúng ngữ nghĩa (400, 401, 403, 404, 409, 500) kèm `code` từ `SystemMessage` enum.
- **Swagger/OpenAPI**: Mọi endpoint PHẢI có annotation `@Operation`, `@ApiResponse` từ thư viện `springdoc-openapi` để tự động sinh tài liệu API tại `/swagger-ui.html`.
- **Rationale**: API chuẩn hóa giúp Frontend và Backend phối hợp hiệu quả, giảm communication overhead và lỗi tích hợp.

### IX. Component-Based UI

Frontend PHẢI tuân thủ thiết kế component-based theo phong cách tham khảo MISA:

- **Reusable Components**: Tách UI thành các component tái sử dụng trong `src/components/ui/` (VD: `DataTable`, `Modal`, `StatusBadge`, `SearchInput`, `Pagination`). Mỗi component PHẢI tự quản lý state nội bộ và expose API qua props.
- **Page Components**: Trang nghiệp vụ trong `src/pages/` chỉ orchestrate layout và gọi API, KHÔNG chứa logic UI phức tạp.
- **CSS Modules**: Sử dụng CSS Module (`*.module.css`) cho mỗi component/page để tránh xung đột class name. KHÔNG sử dụng global CSS trừ `index.css` cho design tokens.
- **Styling**: Sử dụng Bootstrap 5 cho grid system và utility classes. Custom styling qua CSS Module cho business-specific UI.
- **State Management**: Sử dụng React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`). Chỉ thêm state management library (VD: Zustand, Redux) khi có ≥3 components cần share state phức tạp.
- **Rationale**: Giao diện tham khảo MISA đòi hỏi UI nhất quán, chuyên nghiệp, với nhiều bảng dữ liệu, filter, và form phức tạp. Component-based giúp scale UI hiệu quả.

### X. Simplicity & YAGNI

Mọi giải pháp kỹ thuật PHẢI ưu tiên đơn giản nhất có thể:

- **YAGNI (You Aren't Gonna Need It)**: KHÔNG thêm tính năng, abstraction, hoặc infrastructure trước khi có yêu cầu cụ thể. VD: KHÔNG thêm microservice, message queue, hay caching layer nếu monolith đáp ứng đủ.
- **Readable over Clever**: Ưu tiên code dễ đọc hơn code ngắn gọn hay tricky. Đặt tên biến, method, class rõ ràng bằng tiếng Anh, mô tả đúng hành vi.
- **Convention over Configuration**: Tuân thủ convention mặc định của Spring Boot và React/Vite. Chỉ override khi có lý do nghiệp vụ cụ thể.
- **Complexity Budget**: Mỗi PR PHẢI justify nếu thêm dependency mới, pattern mới, hoặc layer mới. Reviewer có quyền reject nếu không đủ lý do.
- **Rationale**: Dự án SEP493 có timeline cố định và team size nhỏ. Đơn giản giúp ship nhanh, ít bug, và dễ onboard thành viên mới.

## Technology Stack Constraints

Hệ thống PHẢI sử dụng và tuân thủ tech stack sau đây:

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Backend Runtime** | Java | 17 | LTS version |
| **Backend Framework** | Spring Boot | 4.0.6 | Includes Web MVC, Security, Data JPA, Validation, WebSocket, Mail |
| **ORM** | Spring Data JPA + Hibernate | (managed by Spring Boot) | Entity mapping, repository pattern |
| **Database** | MySQL | 8.0 | Production database |
| **DB Migration** | Flyway | (managed by Spring Boot) | Version-controlled schema migrations |
| **Authentication** | JWT via jjwt | 0.11.5 | Token-based stateless auth |
| **OAuth2** | Spring Security OAuth2 Client | (managed by Spring Boot) | Google SSO support |
| **API Documentation** | springdoc-openapi | 3.0.3 | Auto-generated Swagger UI |
| **Image Storage** | Cloudinary | 1.36.0 | Avatar và product images |
| **Code Generation** | Lombok | (managed by Spring Boot) | `@Getter`, `@Setter`, `@Builder`, `@RequiredArgsConstructor` |
| **Frontend Runtime** | React | 19.x | Latest stable |
| **Frontend Build** | Vite | 8.x | Fast HMR, ESBuild |
| **Frontend Routing** | React Router DOM | 7.x | Client-side routing |
| **Frontend HTTP** | Axios | 1.x | HTTP client with interceptors |
| **Frontend CSS** | Bootstrap 5 | 5.3.x | Grid system + utilities |
| **Frontend Auth** | @react-oauth/google | 0.13.5 | Google login component |
| **Containerization** | Docker + Docker Compose | 3.8 | MySQL, Backend, Frontend containers |

**Quy tắc thêm dependency mới**:
- PHẢI có lý do nghiệp vụ cụ thể và được team đồng thuận.
- PHẢI kiểm tra license compatibility (MIT, Apache 2.0 ưu tiên).
- PHẢI cập nhật bảng trên khi thêm dependency mới.

## Development Workflow & Quality Gates

### Quy trình Git

- **Branching Model**: Feature branch từ `main`. Naming convention: `feature/<tên-tính-năng>`, `bugfix/<mô-tả>`, `hotfix/<mô-tả>`.
- **Commit Message**: Format `<type>: <mô tả ngắn>`. Type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- **Pull Request**: Mỗi PR PHẢI có mô tả nghiệp vụ, danh sách thay đổi, và link đến issue/task. PHẢI pass tất cả CI checks trước khi merge.

### Quality Gates (Bắt buộc trước khi merge)

1. **Build Success**: `mvn clean compile` (Backend) và `npm run build` (Frontend) PHẢI pass 100%.
2. **Lint Clean**: `npm run lint` (Frontend) PHẢI pass không lỗi.
3. **Test Coverage ≥ 80%**: Trên mọi module có thay đổi code.
4. **No Hardcoded Messages**: Mọi string thông báo PHẢI tham chiếu `SystemMessage` enum.
5. **Swagger Updated**: Mọi API mới/sửa đổi PHẢI có annotation OpenAPI.
6. **Audit Log Integrated**: Mọi thao tác CUD PHẢI có ghi audit log.

### Code Review Checklist

- [ ] Tuân thủ layered architecture (Controller → Service → Repository)?
- [ ] Tuân thủ SOLID principles?
- [ ] DTO riêng cho Request/Response, KHÔNG trả Entity trực tiếp?
- [ ] Input validation ở cả Frontend và Backend?
- [ ] Error handling sử dụng `SystemMessage` enum?
- [ ] Test coverage ≥ 80%?
- [ ] Không hardcode text thông báo?
- [ ] Swagger annotation đầy đủ?

## Governance

- Constitution này là tài liệu tối cao, supersedes tất cả các thực hành khác trong dự án. Mọi code, PR, và design decision PHẢI tuân thủ các nguyên tắc được nêu.
- **Amendment Process**: Sửa đổi constitution yêu cầu: (1) Tạo proposal với lý do cụ thể, (2) Được ≥2 thành viên team review và đồng thuận, (3) Cập nhật version theo semantic versioning, (4) Cập nhật tất cả templates và docs liên quan.
- **Versioning Policy**: MAJOR = xóa/thay đổi principle cốt lõi, MINOR = thêm principle/section mới, PATCH = chỉnh sửa wording/typo.
- **Compliance Review**: Mỗi PR reviewer PHẢI verify compliance với constitution thông qua Code Review Checklist ở trên. Nếu vi phạm, PR bị reject cho đến khi sửa xong.
- **Runtime Guidance**: Tham khảo file [CONTRIBUTING.md](../../CONTRIBUTING.md) cho hướng dẫn phát triển chi tiết, [BUSINESS_RULES.md](../../BUSINESS_RULES.md) cho quy tắc nghiệp vụ, và [SYSTEM_MESSAGES.md](../../SYSTEM_MESSAGES.md) cho danh sách mã thông báo.

**Version**: 1.0.0 | **Ratified**: 2026-06-09 | **Last Amended**: 2026-06-09
