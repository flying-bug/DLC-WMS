package com.duylongtech.backend.service;

import com.cloudinary.Cloudinary;
import com.duylongtech.backend.constant.SystemMessage;
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

public interface CloudinaryService {
    UploadResponse uploadImage(MultipartFile file, String folder);
    UploadResponse uploadDocument(MultipartFile file, String folder);
}
