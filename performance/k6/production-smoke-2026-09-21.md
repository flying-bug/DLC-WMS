# Production smoke test — 2026-09-21

Kịch bản: `system-read.js`, profile `smoke`, 1 VU, 5 iterations, chỉ gọi API
đọc dữ liệu. Mỗi iteration gọi dashboard, đơn mua, đơn bán, sản phẩm và kho.

## Qua Vercel

Base URL: `https://dlc-wms.vercel.app/api/v1`

| Chỉ số | Kết quả |
|---|---:|
| Requests | 26 |
| Request failure rate | 19.23% (5/26) |
| Average | 1.48 s |
| Median | 1.26 s |
| p90 | 2.58 s |
| p95 | 2.94 s |
| Maximum | 3.06 s |
| Dashboard p95 | 2.78 s |
| Đơn mua p95 | 2.34 s |
| Đơn bán p95 | 2.22 s |

## Trực tiếp backend

Base URL: `http://3.107.169.38:8080/api/v1`

| Chỉ số | Kết quả |
|---|---:|
| Requests | 26 |
| Request failure rate | 19.23% (5/26) |
| Average | 702.81 ms |
| Median | 605.10 ms |
| p90 | 1.24 s |
| p95 | 1.25 s |
| Maximum | 1.93 s |
| Dashboard p95 | 796.95 ms |
| Đơn mua p95 | 1.24 s |
| Đơn bán p95 | 1.79 s |
| Kho p95 | 612.60 ms |

## Lỗi chặn load test

`GET /api/v1/products?page=0&size=20` trả HTTP 500 ở cả Vercel và backend
trực tiếp. Một request chẩn đoán nhận trace ID:

```text
3fe7275e-25ef-4072-b089-57cceeb0ba4e
```

Log production xác nhận nguyên nhân là `LazyInitializationException` tại
`ProductService.convertToDtoWithStock`: code duyệt `Product.unitConversions`
sau khi Hibernate session đã đóng. `spring.jpa.open-in-view=false` đang hoạt
động đúng; không nên bật lại toàn cục để che lỗi này.

Hướng sửa phù hợp cho production là tải `unitConversions` và `unit` theo lô cho
các product ID của trang hiện tại, rồi map DTO từ dữ liệu đã tải. Chỉ thêm
`@Transactional(readOnly = true)` sẽ hết lỗi trước mắt nhưng có nguy cơ tạo
N+1 query.

Tra log trên server:

```bash
docker logs dlc-backend --since 30m 2>&1 | grep -C 20 '3fe7275e-25ef-4072-b089-57cceeb0ba4e'
```

Không chạy profile `load` cho đến khi endpoint sản phẩm hết lỗi 500 và smoke
test đạt ngưỡng lỗi dưới 1%.

So sánh Vercel và backend chỉ mang tính định hướng vì mẫu smoke nhỏ và hai lần
chạy không đồng thời. Kết quả hiện tại cho thấy đường qua Vercel có thêm độ trễ
đáng kể; cần chạy lại sau khi sửa lỗi sản phẩm để có phép đo sạch.
