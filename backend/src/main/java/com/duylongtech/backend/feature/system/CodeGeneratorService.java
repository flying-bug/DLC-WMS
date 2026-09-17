package com.duylongtech.backend.feature.system;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CodeGeneratorService {

    private final CodeSequenceAllocator codeSequenceAllocator;

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

    /**
     * Xem trước mã tiếp theo mà không làm tăng bộ đếm.
     */
    public String previewCode(String tableName, String columnName, String prefix, int padding) {
        String sequenceKey = tableName.toLowerCase() + "." + columnName.toLowerCase() + "." + prefix;
        long next = codeSequenceAllocator.previewNextValue(sequenceKey, tableName, columnName, prefix);
        String format = "%s%0" + padding + "d";
        return String.format(format, prefix, next);
    }
}
