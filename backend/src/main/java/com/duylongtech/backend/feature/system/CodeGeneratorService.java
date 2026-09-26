package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.function.Function;
import java.util.function.Predicate;

@Service
@RequiredArgsConstructor
public class CodeGeneratorService {

    /** Số lần thử bỏ qua các số đã bị dùng (mã nhập tay từ trước khi có bộ đếm) trước khi báo lỗi. */
    static final int MAX_ALLOCATION_ATTEMPTS = 100;

    private final CodeSequenceAllocator codeSequenceAllocator;

    /**
     * Tạo prefix thông minh từ tên (VD: "Chuột" -> "CH", "Bàn phím" -> "BP")
     */
    public String generatePrefixFromName(String name) {
        if (name == null || name.trim().isEmpty()) return "DM";
        
        // Bỏ dấu tiếng Việt
        String normalized = java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD);
        String noAccent = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                                    .replaceAll("Đ", "D").replaceAll("đ", "d")
                                    .trim().toUpperCase(java.util.Locale.ROOT);
                                    
        String[] words = noAccent.split("\\s+");
        StringBuilder prefix = new StringBuilder();
        if (words.length == 1) {
            String word = words[0];
            prefix.append(word.substring(0, Math.min(2, word.length())));
        } else {
            for (String word : words) {
                if (!word.isEmpty()) {
                    prefix.append(word.charAt(0));
                }
            }
        }
        
        String finalPrefix = prefix.toString().replaceAll("[^A-Z]", "");
        if (finalPrefix.length() > 3) {
            finalPrefix = finalPrefix.substring(0, 3);
        }
        
        if (finalPrefix.isEmpty()) return "DM";
        return finalPrefix;
    }

    /**
     * Tự động sinh mã tuần tự dựa trên tiền tố (prefix) và số lượng chữ số (padding).
     * VD: generateCode("BRANDS", "code", "TH", 3) -> "TH001" (nếu chưa có) -> "TH002"
     * <p>
     * Việc cấp số được thực hiện nguyên tử qua một bộ đếm riêng (bảng CODE_SEQUENCES,
     * xem {@link CodeSequenceAllocator}) thay vì quét lại toàn bộ bảng mỗi lần gọi,
     * để tránh race condition khi nhiều request tạo mã đồng thời (2 request có thể
     * tính ra cùng một "số tiếp theo" trước khi request nào commit). Lần gọi đầu
     * tiên cho mỗi (tableName, columnName, prefix) sẽ quét bảng một lần để khởi
     * tạo bộ đếm đúng với dữ liệu đã có; các lần sau chỉ tăng bộ đếm.
     *
     * @param tableName  Tên bảng trong CSDL (vd: BRANDS)
     * @param columnName Tên cột lưu mã (vd: code)
     * @param prefix     Tiền tố của mã (vd: TH)
     * @param padding    Số lượng chữ số (vd: 3 -> 001)
     * @return Mã sinh tự động
     */
    public String generateCode(String tableName, String columnName, String prefix, int padding) {
        String sequenceKey = tableName.toLowerCase() + "." + columnName.toLowerCase() + "." + prefix;
        long next = codeSequenceAllocator.nextValue(sequenceKey, tableName, columnName, prefix);
        String format = "%s%0" + padding + "d";
        return String.format(format, prefix, next);
    }

    public java.util.List<String> generateBatchCodes(String tableName, String columnName, String prefix, int padding, int quantity) {
        if (quantity <= 0) return java.util.Collections.emptyList();
        
        String sequenceKey = tableName.toLowerCase() + "." + columnName.toLowerCase() + "." + prefix;
        long endValue = codeSequenceAllocator.nextValues(sequenceKey, tableName, columnName, prefix, quantity);
        long startValue = endValue - quantity + 1;
        
        String format = "%s%0" + padding + "d";
        java.util.List<String> codes = new java.util.ArrayList<>(quantity);
        for (long i = startValue; i <= endValue; i++) {
            codes.add(String.format(format, prefix, i));
        }
        return codes;
    }

    public String previewCode(String tableName, String columnName, String prefix, int padding) {
        String sequenceKey = tableName.toLowerCase() + "." + columnName.toLowerCase() + "." + prefix;
        long next = codeSequenceAllocator.previewNextValue(sequenceKey, tableName, columnName, prefix);
        String format = "%s%0" + padding + "d";
        return String.format(format, prefix, next);
    }

    /**
     * Mã dự kiến hiển thị trên màn tạo mới: xem trước số tiếp theo của bộ đếm, KHÔNG cấp số. Bỏ qua các số đã có người
     * dùng (mã nhập tay từ trước khi có bộ đếm) để mã hiển thị trùng với mã sẽ được cấp khi lưu.
     */
    public String previewNewCode(String tableName, String columnName, String prefix, int padding, Predicate<String> exists) {
        String sequenceKey = tableName.toLowerCase() + "." + columnName.toLowerCase() + "." + prefix;
        long next = codeSequenceAllocator.previewNextValue(sequenceKey, tableName, columnName, prefix);
        String format = "%s%0" + padding + "d";
        String code = String.format(format, prefix, next);
        for (int attempt = 1; attempt < MAX_ALLOCATION_ATTEMPTS && exists.test(code); attempt++) {
            code = String.format(format, prefix, ++next);
        }
        return code;
    }

    /**
     * Mã cho chứng từ MỚI, chỉ cấp khi LƯU. Màn tạo mới chỉ lấy mã dự kiến bằng {@link #previewCode} nên mở form rồi bỏ
     * không làm nhảy số.
     * <ul>
     *   <li>Không gửi mã (người dùng giữ mã hệ thống gợi ý): lấy số tiếp theo từ bộ đếm. Cấp số là thao tác nguyên tử
     *       nên hai người lưu cùng lúc không bao giờ nhận trùng số; số đã bị dùng (mã nhập tay cũ) thì bỏ qua.</li>
     *   <li>Có gửi mã (người dùng tự nhập): giữ nguyên nếu chưa ai dùng, rồi kéo bộ đếm lên ít nhất bằng mã đó để về sau
     *       không cấp lại; đã có người dùng thì báo lỗi (không đổi mã người dùng tự đặt).</li>
     * </ul>
     *
     * @param exists         kiểm tra mã đã tồn tại
     * @param duplicateError lỗi trả về khi mã tự nhập đã tồn tại
     */
    public String resolveNewCode(String tableName, String columnName, String prefix, int padding, String requestedCode,
                                 Predicate<String> exists, Function<String, ? extends RuntimeException> duplicateError) {
        String requested = requestedCode == null ? "" : requestedCode.trim();
        if (requested.isEmpty()) {
            for (int attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
                String code = generateCode(tableName, columnName, prefix, padding);
                if (!exists.test(code)) {
                    return code;
                }
            }
            throw new BusinessException(SystemMessage.CODE_ERR_001.getMessage());
        }
        if (exists.test(requested)) {
            throw duplicateError.apply(requested);
        }
        syncSequence(tableName, columnName, prefix, requested);
        return requested;
    }

    public void syncSequence(String tableName, String columnName, String prefix, String code) {
        if (code != null && code.startsWith(prefix)) {
            String suffix = code.substring(prefix.length());
            try {
                long providedValue = Long.parseLong(suffix);
                String sequenceKey = tableName.toLowerCase() + "." + columnName.toLowerCase() + "." + prefix;
                codeSequenceAllocator.syncSequence(sequenceKey, tableName, columnName, prefix, providedValue);
            } catch (NumberFormatException e) {
                // Ignore if suffix is not a number
            }
        }
    }
}
