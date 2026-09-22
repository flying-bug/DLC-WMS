package com.duylongtech.backend.unitreport;

import org.junit.jupiter.api.extension.ExtendWith;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Đánh dấu 1 lớp test (hoặc lớp @Nested) là bộ testcase của đúng 1 hàm trong báo cáo Unit Test (utool).
 * Mỗi @Test trong lớp phải có {@link UnitTestCase}. Khi lớp chạy xong, {@link UnitTestReportExtension}
 * ghi testcase + kết quả Pass/Fail thật ra target/unit-test-report/*.json.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@ExtendWith(UnitTestReportExtension.class)
public @interface UnitTestMethod {

    /** Tên lớp chứa hàm, ghi vào cột Module của báo cáo, ví dụ "InventoryDocumentService". */
    String module();

    /** Chữ ký hàm có tên tham số, ví dụ "generateCode(String tableName, String columnName, String prefix, int padding)". */
    String signature();

    /** Kỹ thuật thiết kế testcase (mỗi hàm đúng 1 kỹ thuật), xem {@link Technique}. */
    String technique();

    /** Precondition chung cho mọi testcase; testcase có precondition riêng sẽ thay thế. */
    String[] precondition() default {"None"};

    /** Kỹ thuật thiết kế testcase được utool chấp nhận. */
    final class Technique {
        public static final String BVA = "Boundary Value Analysis (BVA)";
        public static final String EP = "Equivalence Partitioning (EP)";
        public static final String BRANCH = "Branch Coverage";
        public static final String CONDITION = "Condition Coverage";
        public static final String PATH = "Path Coverage";
        public static final String STATEMENT = "Statement Coverage";
        public static final String LOOP = "Loop Testing";

        private Technique() {
        }
    }
}
