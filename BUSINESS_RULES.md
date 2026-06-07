# Business Rules

## Kho
- Mỗi phiếu nhập, xuất, chuyển kho phải cập nhật tồn kho đúng kho liên quan.
- Không cho xuất âm tồn nếu nghiệp vụ không cho phép.
- Chuyển kho phải trừ kho nguồn và cộng kho đích.

## Bán hàng
- POS là một dạng xuất kho nghiệp vụ.
- Chứng từ bán hàng phải gắn khách hàng khi cần theo dõi bảo hành.

## Bảo hành
- Chỉ quản lý bảo hành do cửa hàng cung cấp.

## Phân quyền (RBAC)
- **Super Admin:** Chỉ liên quan đến quản trị hệ thống, quản lý tài khoản và phân quyền. Tuyệt đối không can thiệp vào nghiệp vụ kinh doanh (Kho, Bán hàng, Danh mục...).
- **Manager:** Có toàn quyền thao tác trên các phân hệ nghiệp vụ kinh doanh, nhưng không có quyền quản lý tài khoản hay phân quyền hệ thống.
- **Staff:** Kế thừa một số quyền hạn chế từ Manager (chỉ thao tác trong phạm vi được giao).
