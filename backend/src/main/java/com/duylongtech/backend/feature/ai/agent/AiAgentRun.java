package com.duylongtech.backend.feature.ai.agent;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Bối cảnh của MỘT câu hỏi đang được agent xử lý (gắn vào luồng hiện tại). Các công cụ chạy đồng bộ trên cùng
 * luồng với request nên vẫn thấy SecurityContext của người đang đăng nhập; ở đây chỉ đếm, ghi lại các lần gọi
 * và giữ hạn thời gian của câu hỏi.
 */
public final class AiAgentRun {

    private static final ThreadLocal<AiAgentRun> CURRENT = new ThreadLocal<>();

    private final int maxToolCalls;
    /** Mốc System.nanoTime() mà sau đó công cụ không được chạy nữa; Long.MAX_VALUE = không giới hạn. */
    private final long deadlineNanos;
    private final long startedNanos;
    private final List<String> toolCalls = new ArrayList<>();

    private AiAgentRun(int maxToolCalls, Duration timeout) {
        this.maxToolCalls = maxToolCalls;
        this.startedNanos = System.nanoTime();
        this.deadlineNanos = timeout == null ? Long.MAX_VALUE : startedNanos + timeout.toNanos();
    }

    public static AiAgentRun start(int maxToolCalls) {
        return start(maxToolCalls, null);
    }

    public static AiAgentRun start(int maxToolCalls, Duration timeout) {
        AiAgentRun run = new AiAgentRun(maxToolCalls, timeout);
        CURRENT.set(run);
        return run;
    }

    /** null khi công cụ được gọi ngoài luồng agent (ví dụ trong test). */
    public static AiAgentRun current() {
        return CURRENT.get();
    }

    public static void end() {
        CURRENT.remove();
    }

    /** false nếu đã hết ngân sách gọi công cụ của câu hỏi này. */
    public boolean tryRecord(String toolName) {
        if (toolCalls.size() >= maxToolCalls) {
            return false;
        }
        toolCalls.add(toolName);
        return true;
    }

    /** true khi câu hỏi đã dùng hết thời gian cho phép. */
    public boolean isExpired() {
        return deadlineNanos != Long.MAX_VALUE && System.nanoTime() - deadlineNanos >= 0;
    }

    public long elapsedMillis() {
        return Duration.ofNanos(System.nanoTime() - startedNanos).toMillis();
    }

    public List<String> toolCalls() {
        return List.copyOf(toolCalls);
    }
}
