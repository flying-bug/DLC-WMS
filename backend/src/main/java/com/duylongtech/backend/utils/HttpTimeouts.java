package com.duylongtech.backend.utils;

import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.time.Duration;

/**
 * Timeout cho các lời gọi HTTP ra dịch vụ ngoài. RestTemplate / RestClient tạo bằng {@code new} hay
 * {@code builder()} mặc định chờ vô hạn: khi dịch vụ ngoài treo, luồng xử lý request của Tomcat bị giữ mãi
 * và server ngừng phục vụ mọi người.
 */
public final class HttpTimeouts {

    public static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    /** API trả lời nhanh: xác thực Google, tra cứu mã số thuế... */
    public static final Duration SHORT_READ_TIMEOUT = Duration.ofSeconds(15);
    /** Mô hình AI, hóa đơn điện tử: chậm hơn nhưng vẫn phải có giới hạn. */
    public static final Duration LONG_READ_TIMEOUT = Duration.ofSeconds(60);

    private HttpTimeouts() {
    }

    public static SimpleClientHttpRequestFactory requestFactory(Duration readTimeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(readTimeout);
        return factory;
    }
}
