# K6 performance test

Kịch bản `system-read.js` chỉ gọi các API đọc dữ liệu: dashboard, đơn mua,
đơn bán, sản phẩm và kho. Mặc định là smoke test nhẹ (1 VU, 5 vòng lặp).

## Chạy local

```powershell
k6 run `
  -e BASE_URL=http://localhost:8080/api/v1 `
  -e USERNAME=<test-user> `
  -e PASSWORD=<test-password> `
  -e PROFILE=smoke `
  performance/k6/system-read.js
```

Có thể dùng JWT có sẵn thay cho tài khoản:

```powershell
k6 run `
  -e BASE_URL=http://localhost:8080/api/v1 `
  -e AUTH_TOKEN=<jwt> `
  -e PROFILE=smoke `
  performance/k6/system-read.js
```

## Profile tải

- `smoke`: 1 VU, 5 vòng lặp; dùng để kiểm tra script và kết nối.
- `load`: tăng dần lên 10 VU trong 2 phút; chỉ chạy khi môi trường chịu tải đã
  được xác nhận.

Không ghi tài khoản, mật khẩu hoặc token vào file script hay commit Git.
