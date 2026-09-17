package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Kiểm tra ràng buộc Thủ kho - Kho cho module chứng từ kho (Nhập/Xuất). Tách thành component
 * riêng (không đặt trong InventoryDocumentService) vì InventoryDocumentService đã phụ thuộc
 * InventoryPostingService (gọi postExport/postImport/unpostExport/unpostImport) - nếu
 * InventoryPostingService gọi ngược lại InventoryDocumentService để dùng hàm này sẽ tạo
 * circular dependency giữa 2 Spring bean, crash ngay lúc khởi động ứng dụng.
 */
@Component
@RequiredArgsConstructor
public class WarehouseAccessGuard {

    private final UserWarehouseRoleRepository userWarehouseRoleRepository;
    private final UserRepository userRepository;

    private boolean isBypass(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null
                        && (a.getAuthority().contains("MANAGER") || a.getAuthority().contains("ACCOUNTANT")));
    }

    /**
     * Danh sách warehouseId người dùng hiện tại được phép xem/thao tác.
     * Trả về null nghĩa là không giới hạn (Manager/Kế toán, hoặc chưa đăng nhập).
     * Trả về danh sách rỗng nghĩa là bị giới hạn nhưng chưa được gán kho nào.
     */
    public List<Long> resolveAllowedWarehouseIds() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || isBypass(auth)) {
            return null;
        }

        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null) {
            return null;
        }

        return userWarehouseRoleRepository.findByUserId(user.getId()).stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .map(UserWarehouseRole::getWarehouseId)
                .distinct()
                .toList();
    }

    /**
     * Chặn thao tác (ghi sổ/bỏ ghi sổ...) lên một chứng từ ngoài phạm vi kho được phân công.
     * Không làm gì nếu bypass hoặc chưa đăng nhập (để controller/@PreAuthorize xử lý riêng).
     */
    public void checkAccess(Long warehouseId) {
        List<Long> allowed = resolveAllowedWarehouseIds();
        if (allowed == null) {
            return;
        }
        if (warehouseId == null || !allowed.contains(warehouseId)) {
            throw new BusinessException("Bạn không được phân công phụ trách kho này, không có quyền thực hiện thao tác");
        }
    }
}
