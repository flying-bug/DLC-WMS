package com.duylongtech.backend.unitreport;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Dữ liệu 1 testcase trong báo cáo Unit Test, đặt ngay trên @Test kiểm chứng nó.
 * Nội dung phải khớp với phần assert của test: báo cáo chỉ ghi lại, không tự suy ra.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface UnitTestCase {

    /** Mã testcase, ví dụ "UTCID01". */
    String id();

    /** N = Normal, A = Abnormal, B = Boundary. */
    String type();

    /** Mục đích kiểm thử (ghi vào comment của ô UTCID). */
    String purpose();

    /** Giá trị tham số theo dạng "tenThamSo=giaTri"; tên phải trùng tên tham số trong chữ ký hàm. */
    String[] inputs();

    /** Giá trị trả về mong đợi (để trống nếu hàm ném exception hoặc là void không có kết quả cần ghi). */
    String returns() default "";

    /** Exception mong đợi, ví dụ "BusinessException: Serial đã được giữ...". */
    String exception() default "";

    /** Precondition riêng; để trống thì dùng precondition chung của {@link UnitTestMethod}. */
    String[] precondition() default {};

    /** Log mong đợi. */
    String log() default "No application log is expected";

    /** Mã lỗi đã ghi nhận khi testcase phát hiện lỗi thật của hệ thống (testcase sẽ Fail tới khi sửa). */
    String defectId() default "";
}
