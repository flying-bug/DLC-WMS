package com.duylongtech.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.duylongtech.backend.dto.response.UploadResponse;
import com.duylongtech.backend.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private static final Set<String> ALLOWED_DOC_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf"
    );

    private final Cloudinary cloudinary;

    @Value("${cloudinary.folder:duy-long-computer}")
    private String rootFolder;

    @Value("${cloudinary.max-file-size:5242880}")
    private long maxFileSize;

    public UploadResponse uploadImage(MultipartFile file, String folder) {
        validateImage(file);

        String targetFolder = buildFolder(folder);
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", targetFolder,
                            "resource_type", "image",
                            "use_filename", true,
                            "unique_filename", true,
                            "overwrite", false
                    )
            );

            return UploadResponse.builder()
                    .url(asString(result.get("url")))
                    .secureUrl(asString(result.get("secure_url")))
                    .publicId(asString(result.get("public_id")))
                    .originalFilename(file.getOriginalFilename())
                    .build();
        } catch (IOException e) {
            throw new BusinessException("Khong the tai anh len Cloudinary.", e);
        }
    }

    public UploadResponse uploadDocument(MultipartFile file, String folder) {
        validateDocument(file);

        String targetFolder = buildFolder(folder);
        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", targetFolder,
                            "resource_type", "auto",
                            "use_filename", true,
                            "unique_filename", true,
                            "overwrite", false
                    )
            );

            return UploadResponse.builder()
                    .url(asString(result.get("url")))
                    .secureUrl(asString(result.get("secure_url")))
                    .publicId(asString(result.get("public_id")))
                    .originalFilename(file.getOriginalFilename())
                    .build();
        } catch (IOException e) {
            throw new BusinessException("Khong the tai tai lieu len Cloudinary.", e);
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Vui long chon anh de tai len.");
        }
        if (file.getSize() > maxFileSize) {
            throw new BusinessException("Anh khong duoc vuot qua 5MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Chi ho tro anh JPG, PNG, WEBP hoac GIF.");
        }
    }

    private void validateDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Vui long chon file de tai len.");
        }
        if (file.getSize() > maxFileSize) {
            throw new BusinessException("File khong duoc vuot qua 5MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_DOC_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Chi ho tro anh (JPG, PNG, WEBP) hoac PDF.");
        }
    }

    private String buildFolder(String folder) {
        String normalizedRoot = normalizeFolder(rootFolder);
        String normalizedChild = normalizeFolder(folder);
        if (normalizedRoot.isBlank()) {
            return normalizedChild;
        }
        if (normalizedChild.isBlank()) {
            return normalizedRoot;
        }
        return normalizedRoot + "/" + normalizedChild;
    }

    private String normalizeFolder(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .replace("\\", "/")
                .replaceAll("^/+", "")
                .replaceAll("/+$", "")
                .replaceAll("[^a-zA-Z0-9/_-]", "-");
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
