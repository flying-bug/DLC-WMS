package com.duylongtech.backend.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.duylongtech.backend.constant.SystemMessage;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.FileList;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.api.client.http.FileContent;
import com.duylongtech.backend.entity.SystemSetting;
import com.duylongtech.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.io.*;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import com.google.auth.oauth2.UserCredentials;

public interface GoogleDriveService {
    String uploadFile(File localFile, String mimeType) throws Exception;
    String getWebViewLink(String fileId) throws Exception;
    String getServiceAccountEmail();
    void testConnection() throws Exception;
    void deleteFile(String driveFileId) throws Exception;
    List<com.google.api.services.drive.model.File> listBackupFiles() throws Exception;
    void downloadFile(String driveFileId, File targetFile) throws Exception;
}
