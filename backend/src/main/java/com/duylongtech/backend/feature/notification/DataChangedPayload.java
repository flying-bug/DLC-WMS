package com.duylongtech.backend.feature.notification;

import java.util.List;

/**
 * Tín hiệu "dữ liệu đã thay đổi" gửi qua SSE. Không chứa dữ liệu nghiệp vụ - client tự tải lại qua REST.
 * ids == null nghĩa là không rõ bản ghi nào (hoặc quá nhiều): mọi trang của topic này nên tải lại.
 */
public record DataChangedPayload(String topic, List<Long> ids) {

    public static final String TOPIC_ALL = "ALL";
}
