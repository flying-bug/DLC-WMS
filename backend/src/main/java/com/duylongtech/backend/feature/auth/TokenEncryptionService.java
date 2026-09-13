package com.duylongtech.backend.feature.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Mã hóa/giải mã token bằng AES-256-GCM.
 * Key lấy từ env TOKEN_ENCRYPTION_KEY (32 ký tự = 256 bit).
 * Nếu không cấu hình key → fallback Base64 encode (chỉ dùng cho development).
 */
@Slf4j
@Service
public class TokenEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    @Value("${google.encryption-key:${TOKEN_ENCRYPTION_KEY:}}")
    private String encryptionKey;

    private boolean hasKey() {
        return encryptionKey != null && encryptionKey.length() >= 16;
    }

    private SecretKey getSecretKey() {
        byte[] keyBytes = new byte[32];
        byte[] raw = encryptionKey.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(raw, 0, keyBytes, 0, Math.min(raw.length, 32));
        return new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Mã hóa plaintext. Trả về Base64 string chứa IV + ciphertext.
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) return plaintext;

        if (!hasKey()) {
            log.warn("TOKEN_ENCRYPTION_KEY not configured — using Base64 encoding only (NOT secure for production)");
            return "B64:" + Base64.getEncoder().encodeToString(plaintext.getBytes(StandardCharsets.UTF_8));
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKey(), spec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Ghép IV + ciphertext
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);

            return "AES:" + Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt token", e);
        }
    }

    /**
     * Giải mã ciphertext đã được mã hóa bởi encrypt().
     */
    public String decrypt(String encrypted) {
        if (encrypted == null || encrypted.isBlank()) return encrypted;

        // Base64 fallback
        if (encrypted.startsWith("B64:")) {
            return new String(Base64.getDecoder().decode(encrypted.substring(4)), StandardCharsets.UTF_8);
        }

        // AES-GCM
        if (encrypted.startsWith("AES:")) {
            if (!hasKey()) {
                throw new RuntimeException("Cannot decrypt AES token: TOKEN_ENCRYPTION_KEY not configured");
            }
            try {
                byte[] combined = Base64.getDecoder().decode(encrypted.substring(4));

                byte[] iv = new byte[GCM_IV_LENGTH];
                byte[] ciphertext = new byte[combined.length - GCM_IV_LENGTH];
                System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
                System.arraycopy(combined, GCM_IV_LENGTH, ciphertext, 0, ciphertext.length);

                Cipher cipher = Cipher.getInstance(ALGORITHM);
                GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
                cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), spec);

                return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
            } catch (Exception e) {
                throw new RuntimeException("Failed to decrypt token", e);
            }
        }

        // Legacy plaintext (chưa mã hóa) — trả về nguyên bản
        return encrypted;
    }
}
