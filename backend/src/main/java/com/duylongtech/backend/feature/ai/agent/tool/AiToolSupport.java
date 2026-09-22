package com.duylongtech.backend.feature.ai.agent.tool;

import com.duylongtech.backend.feature.ai.agent.AiAgentProperties;
import com.duylongtech.backend.feature.ai.agent.AiAgentRun;
import com.duylongtech.backend.feature.ai.service.AiAccessPolicy;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Phần dùng chung của các công cụ (tool) cho AI Agent. Mọi kiểm tra quyền dựa trên người đang đăng nhập
 * (SecurityContext), KHÔNG lấy danh tính hay quyền từ tham số mô hình truyền vào. Mô hình chỉ nhận lại văn bản lỗi
 * khi bị từ chối, để nó giải thích cho người dùng thay vì đoán số liệu.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiToolSupport {

    /** Cùng bộ quyền với AiChatService khi hỏi về kho/tồn kho. */
    public static final String[] STOCK_PERMISSIONS = {
            "warehouse_master:view", "report_balance:view", "import:view", "export:view", "transfer:view", "stocktake:view"
    };

    private static final int MAX_KEYWORD_LENGTH = 100;

    private final AiAccessPolicy accessPolicy;
    private final AiAgentProperties properties;
    private final WarehouseRepository warehouseRepository;

    /**
     * Mở đầu mỗi lần gọi công cụ: tính vào ngân sách và kiểm quyền. Trả về null nếu được phép chạy;
     * ngược lại trả về kết quả lỗi để đưa thẳng cho mô hình.
     */
    public Map<String, Object> begin(String tool, String args, String label, String... permissions) {
        AiAgentRun run = AiAgentRun.current();
        if (run != null && !run.tryRecord(tool)) {
            log.warn("[AI-AGENT] tool budget exceeded tool={} user={}", tool, currentUser());
            return error("Đã vượt số lần gọi công cụ cho một câu hỏi. Hãy trả lời dựa trên dữ liệu đã có và nói rõ phần còn thiếu.");
        }
        log.info("[AI-AGENT] tool={} args={} user={}", tool, args, currentUser());
        if (permissions.length > 0 && !accessPolicy.canViewAny(permissions)) {
            return error("Người dùng hiện tại không có quyền xem dữ liệu " + label
                    + ". Hãy báo lại cho họ và KHÔNG đoán số liệu.");
        }
        return null;
    }

    public static Map<String, Object> error(String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", false);
        result.put("error", message);
        return result;
    }

    public static Map<String, Object> rows(List<?> rows, Object... extra) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true);
        result.put("count", rows.size());
        for (int i = 0; i + 1 < extra.length; i += 2) {
            result.put(String.valueOf(extra[i]), extra[i + 1]);
        }
        result.put("rows", rows);
        return result;
    }

    /** Số dòng tối đa mô hình được nhận: mặc định = trần cấu hình, và không bao giờ vượt trần. */
    public int limit(Integer requested) {
        int max = Math.max(1, properties.getMaxRows());
        if (requested == null || requested < 1) {
            return max;
        }
        return Math.min(requested, max);
    }

    public String keyword(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        return trimmed.length() > MAX_KEYWORD_LENGTH ? trimmed.substring(0, MAX_KEYWORD_LENGTH) : trimmed;
    }

    public boolean canViewPricing() {
        return accessPolicy.canViewPricing();
    }

    public boolean canView(String permission) {
        return accessPolicy.canView(permission);
    }

    public List<Long> allowedWarehouseIds() {
        return accessPolicy.allowedWarehouseIds();
    }

    /** Kho người dùng được phép xem (thủ kho chỉ thấy kho được giao). */
    public List<Warehouse> scopedWarehouses() {
        List<Long> allowed = accessPolicy.allowedWarehouseIds();
        List<Warehouse> all = warehouseRepository.findAll();
        return allowed == null ? all : all.stream().filter(w -> allowed.contains(w.getId())).toList();
    }

    /** Tìm kho theo mã hoặc tên (bỏ dấu, không phân biệt hoa thường) trong TẤT CẢ kho, để phân biệt "không có" và "không được xem". */
    public Optional<Warehouse> findWarehouse(String text) {
        String wanted = normalize(text);
        if (wanted.isBlank()) {
            return Optional.empty();
        }
        List<Warehouse> all = warehouseRepository.findAll();
        return all.stream().filter(w -> normalize(w.getCode()).equals(wanted)).findFirst()
                .or(() -> all.stream().filter(w -> normalize(w.getName()).equals(wanted)).findFirst())
                .or(() -> all.stream().filter(w -> normalize(w.getName()).contains(wanted)).findFirst());
    }

    public boolean canAccessWarehouse(Long warehouseId) {
        return accessPolicy.canAccessWarehouse(warehouseId);
    }

    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd').replace('Đ', 'D');
        return decomposed.toLowerCase(Locale.ROOT).trim();
    }

    private static String currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "anonymous";
    }
}
