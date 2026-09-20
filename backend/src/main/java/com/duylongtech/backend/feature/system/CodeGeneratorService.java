package com.duylongtech.backend.feature.system;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CodeGeneratorService {

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
