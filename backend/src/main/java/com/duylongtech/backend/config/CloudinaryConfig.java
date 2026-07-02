package com.duylongtech.backend.config;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:dummy_cloud_name}")
    private String cloudName;

    @Value("${cloudinary.api-key:dummy_api_key}")
    private String apiKey;

    @Value("${cloudinary.api-secret:dummy_api_secret}")
    private String apiSecret;

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinary() {
        Optional<String> resolvedCloudinaryUrl = resolveCloudinaryUrl();
        if (resolvedCloudinaryUrl.isPresent()) {
            return new Cloudinary(resolvedCloudinaryUrl.get());
        }

        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", cloudName);
        config.put("api_key", apiKey);
        config.put("api_secret", apiSecret);
        return new Cloudinary(config);
    }

    private Optional<String> resolveCloudinaryUrl() {
        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank()) {
            return Optional.of(cloudinaryUrl.trim());
        }
        String systemValue = System.getProperty("CLOUDINARY_URL");
        if (systemValue != null && !systemValue.isBlank()) {
            return Optional.of(systemValue.trim());
        }
        String envValue = System.getenv("CLOUDINARY_URL");
        if (envValue != null && !envValue.isBlank()) {
            return Optional.of(envValue.trim());
        }
        return readCloudinaryUrlFromDotenv();
    }

    private Optional<String> readCloudinaryUrlFromDotenv() {
        List<Path> candidates = List.of(
                Path.of(".env"),
                Path.of("backend", ".env")
        );

        return candidates.stream()
                .filter(Files::isRegularFile)
                .flatMap(path -> readDotenvValue(path, "CLOUDINARY_URL").stream())
                .findFirst();
    }

    private Optional<String> readDotenvValue(Path path, String key) {
        try {
            for (String rawLine : Files.readAllLines(path)) {
                String line = rawLine == null ? "" : rawLine.trim();
                if (line.isBlank() || line.startsWith("#")) {
                    continue;
                }
                if (line.startsWith("export ")) {
                    line = line.substring("export ".length()).trim();
                }

                int separatorIndex = line.indexOf('=');
                if (separatorIndex <= 0) {
                    continue;
                }

                String currentKey = line.substring(0, separatorIndex).trim();
                if (key.equals(currentKey)) {
                    String value = stripQuotes(line.substring(separatorIndex + 1).trim());
                    return value.isBlank() ? Optional.empty() : Optional.of(value);
                }
            }
        } catch (IOException ignored) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    private String stripQuotes(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}
