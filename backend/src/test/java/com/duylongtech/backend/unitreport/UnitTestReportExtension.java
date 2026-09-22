package com.duylongtech.backend.unitreport;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.IntStream;

/**
 * Ghi testcase của các lớp {@link UnitTestMethod} ra JSON theo đúng bố cục dòng của template utool:
 * <pre>
 *   8-28, 37-80 : Precondition + từng tham số (nhãn 1 dòng, mỗi giá trị khác nhau 1 dòng)
 *   29 / 30-31, 81-90 : return
 *   32 / 33, 91-95    : Exception
 *   34 / 35-36        : Log message
 * </pre>
 * Kiểm tra kỷ luật trước khi ghi: mọi @Test có {@link UnitTestCase}, mã UTCID không trùng, tên input
 * là tham số thật của hàm, và số giá trị không vượt sức chứa của template.
 */
public class UnitTestReportExtension implements TestWatcher, AfterAllCallback {

    public static final Path OUTPUT_DIR = Paths.get("target", "unit-test-report");

    private static final List<Integer> INPUT_ROWS = concat(range(8, 28), range(37, 80));
    private static final List<Integer> RETURN_ROWS = concat(List.of(30, 31), range(81, 90));
    private static final List<Integer> EXCEPTION_ROWS = concat(List.of(33), range(91, 95));
    private static final List<Integer> LOG_ROWS = List.of(35, 36);
    private static final List<String> TYPES = List.of("N", "A", "B");

    private static final Map<Class<?>, Map<Method, String>> STATUS = new ConcurrentHashMap<>();

    @Override
    public void testSuccessful(ExtensionContext context) {
        record(context, "P");
    }

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
        record(context, "F");
    }

    @Override
    public void testAborted(ExtensionContext context, Throwable cause) {
        record(context, "");
    }

    @Override
    public void testDisabled(ExtensionContext context, Optional<String> reason) {
        record(context, "");
    }

    private static void record(ExtensionContext context, String status) {
        STATUS.computeIfAbsent(context.getRequiredTestClass(), k -> new ConcurrentHashMap<>())
                .put(context.getRequiredTestMethod(), status);
    }

    @Override
    public void afterAll(ExtensionContext context) throws IOException {
        Class<?> testClass = context.getRequiredTestClass();
        UnitTestMethod method = testClass.getAnnotation(UnitTestMethod.class);
        if (method == null) {
            return;
        }
        Map<Method, String> statuses = STATUS.getOrDefault(testClass, Map.of());
        List<String> parameters = parameterNames(method.signature());

        List<Method> testMethods = Arrays.stream(testClass.getDeclaredMethods())
                .filter(m -> m.isAnnotationPresent(Test.class))
                .toList();
        List<String> errors = new ArrayList<>();
        List<Method> cases = new ArrayList<>();
        for (Method m : testMethods) {
            UnitTestCase tc = m.getAnnotation(UnitTestCase.class);
            if (tc == null) {
                errors.add(m.getName() + " thiếu @UnitTestCase");
                continue;
            }
            if (!TYPES.contains(tc.type())) {
                errors.add(tc.id() + ": type phải là N/A/B");
            }
            if (tc.purpose().trim().length() < 12) {
                errors.add(tc.id() + ": purpose quá ngắn");
            }
            if (tc.returns().isBlank() && tc.exception().isBlank()) {
                errors.add(tc.id() + ": phải có returns hoặc exception");
            }
            for (String input : tc.inputs()) {
                int eq = input.indexOf('=');
                if (eq <= 0 || !parameters.contains(input.substring(0, eq).trim())) {
                    errors.add(tc.id() + ": input '" + input + "' không phải tham số của " + parameters);
                }
            }
            cases.add(m);
        }
        cases.sort(Comparator.comparing(m -> m.getAnnotation(UnitTestCase.class).id()));
        List<String> ids = cases.stream().map(m -> m.getAnnotation(UnitTestCase.class).id()).toList();
        if (ids.stream().distinct().count() != ids.size()) {
            errors.add("Trùng mã UTCID: " + ids);
        }
        for (int i = 0; i < ids.size(); i++) {
            if (!ids.get(i).equals(String.format("UTCID%02d", i + 1))) {
                errors.add("Mã UTCID phải liên tục từ UTCID01, đang có " + ids);
                break;
            }
        }

        List<Map<String, Object>> testCases = new ArrayList<>();
        List<Map<String, Map<String, String>>> cells = new ArrayList<>();
        String date = LocalDate.now().toString();
        for (Method m : cases) {
            UnitTestCase tc = m.getAnnotation(UnitTestCase.class);
            Map<String, Map<String, String>> cellValues = new LinkedHashMap<>();
            Map<String, Object> json = new LinkedHashMap<>();
            json.put("id", tc.id());
            json.put("purpose", tc.purpose());
            json.put("type", tc.type());
            String status = statuses.getOrDefault(m, "");
            json.put("status", status);
            json.put("executedDate", status.isEmpty() ? "" : date);
            json.put("defectId", tc.defectId());
            json.put("cellValues", cellValues);
            testCases.add(json);
            cells.add(cellValues);
        }

        List<List<String>> preconditionValues = new ArrayList<>();
        Map<String, List<List<String>>> inputValues = new LinkedHashMap<>();
        parameters.forEach(p -> inputValues.put(p, new ArrayList<>()));
        List<List<String>> returnValues = new ArrayList<>();
        List<List<String>> exceptionValues = new ArrayList<>();
        List<List<String>> logValues = new ArrayList<>();
        for (Method m : cases) {
            UnitTestCase tc = m.getAnnotation(UnitTestCase.class);
            preconditionValues.add(List.of(tc.precondition().length > 0 ? tc.precondition() : method.precondition()));
            Map<String, String> inputs = new LinkedHashMap<>();
            for (String input : tc.inputs()) {
                int eq = input.indexOf('=');
                if (eq > 0) {
                    inputs.put(input.substring(0, eq).trim(), input.substring(eq + 1).trim());
                }
            }
            parameters.forEach(p -> inputValues.get(p).add(inputs.containsKey(p) ? List.of(inputs.get(p)) : List.of()));
            returnValues.add(tc.returns().isBlank() ? List.of() : List.of(tc.returns()));
            exceptionValues.add(tc.exception().isBlank() ? List.of() : List.of(tc.exception()));
            logValues.add(tc.log().isBlank() ? List.of() : List.of(tc.log()));
        }

        var rows = INPUT_ROWS.iterator();
        placeGroup("Precondition", preconditionValues, rows, cells, errors);
        inputValues.forEach((param, values) -> placeGroup(param, values, rows, cells, errors));
        place("return", 29, RETURN_ROWS, returnValues, cells, errors);
        place("Exception", 32, EXCEPTION_ROWS, exceptionValues, cells, errors);
        place("Log message", 34, LOG_ROWS, logValues, cells, errors);

        if (!errors.isEmpty()) {
            throw new IllegalStateException("Unit test report " + method.module() + "." + method.signature()
                    + " không hợp lệ:\n - " + String.join("\n - ", errors));
        }

        Map<String, Object> methodJson = new LinkedHashMap<>();
        methodJson.put("module", method.module());
        methodJson.put("signature", method.signature());
        methodJson.put("technique", method.technique());
        methodJson.put("testCases", testCases);

        Files.createDirectories(OUTPUT_DIR);
        String methodName = method.signature().substring(0, method.signature().indexOf('('));
        Path file = OUTPUT_DIR.resolve(method.module() + "." + methodName + ".json");
        Files.writeString(file, new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT)
                .writeValueAsString(methodJson), StandardCharsets.UTF_8);
    }

    /** Nhóm đầu vào: 1 dòng nhãn rồi mỗi giá trị khác nhau 1 dòng, lấy lần lượt từ vùng input. */
    private static void placeGroup(String label, List<List<String>> perCase, java.util.Iterator<Integer> rows,
                                   List<Map<String, Map<String, String>>> cells, List<String> errors) {
        List<String> distinct = distinct(perCase);
        if (distinct.isEmpty()) {
            return;
        }
        List<Integer> slots = new ArrayList<>();
        for (int i = 0; i <= distinct.size(); i++) {
            if (!rows.hasNext()) {
                errors.add("Vượt quá số dòng điều kiện của template tại nhóm '" + label + "'");
                return;
            }
            slots.add(rows.next());
        }
        write(label, slots.get(0), slots.subList(1, slots.size()), distinct, perCase, cells);
    }

    private static void place(String label, int labelRow, List<Integer> valueRows, List<List<String>> perCase,
                              List<Map<String, Map<String, String>>> cells, List<String> errors) {
        List<String> distinct = distinct(perCase);
        if (distinct.size() > valueRows.size()) {
            errors.add("Nhóm '" + label + "' có " + distinct.size() + " giá trị khác nhau, template chỉ chứa "
                    + valueRows.size());
            return;
        }
        write(label, labelRow, valueRows, distinct, perCase, cells);
    }

    private static void write(String label, int labelRow, List<Integer> valueRows, List<String> distinct,
                              List<List<String>> perCase, List<Map<String, Map<String, String>>> cells) {
        if (cells.isEmpty()) {
            return;
        }
        cells.get(0).put(String.valueOf(labelRow), Map.of("label", label));
        for (int i = 0; i < cells.size(); i++) {
            for (String v : perCase.get(i)) {
                cells.get(i).put(String.valueOf(valueRows.get(distinct.indexOf(v))), Map.of("value", v));
            }
        }
    }

    private static List<String> distinct(List<List<String>> perCase) {
        List<String> values = new ArrayList<>();
        perCase.forEach(list -> list.forEach(v -> {
            if (!values.contains(v)) {
                values.add(v);
            }
        }));
        return values;
    }

    /** Tách tên tham số từ chữ ký, bỏ qua dấu phẩy nằm trong generic (vd Map&lt;Long, String&gt;). */
    static List<String> parameterNames(String signature) {
        String inner = signature.substring(signature.indexOf('(') + 1, signature.lastIndexOf(')')).trim();
        List<String> names = new ArrayList<>();
        if (inner.isEmpty()) {
            return names;
        }
        int depth = 0;
        StringBuilder current = new StringBuilder();
        for (char ch : (inner + ",").toCharArray()) {
            if (ch == '<') depth++;
            if (ch == '>') depth--;
            if (ch == ',' && depth == 0) {
                String[] tokens = current.toString().trim().split("\\s+");
                names.add(tokens[tokens.length - 1]);
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        return names;
    }

    private static List<Integer> range(int from, int to) {
        return IntStream.rangeClosed(from, to).boxed().toList();
    }

    private static List<Integer> concat(List<Integer> a, List<Integer> b) {
        List<Integer> all = new ArrayList<>(a);
        all.addAll(b);
        return all;
    }
}
