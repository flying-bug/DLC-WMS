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

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleDriveService {

    private final SystemSettingRepository settingRepo;

    @Value("${google.client-id:${GMAIL_CLIENT_ID:889308816246-1sg2529hrhn6671gfcm2fae11eg9qque.apps.googleusercontent.com}}")
    private String defaultClientId;

    @Value("${google.client-secret:${GMAIL_CLIENT_SECRET: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}}")
    private String defaultClientSecret;

    @Value("${google.refresh-token:${GMAIL_REFRESH_TOKEN:1//04KBPq7hKygPUCgYIARAAGAQSNgF-L9Irb_g6d0iM3EJgsq6OGRXOQ-oPiugQgXmRjf5eylrUB013TdaOuRW5Fy-KdPNb--XHXQ}}")
    private String defaultRefreshToken;

    private static final String APP_NAME = "DLC-WMS Backup";

    /**
     * Build an authenticated Google Drive client using OAuth2 Refresh Token OR Service Account JSON.
     */
    private Drive buildDrive() throws Exception {
        // 1. Prioritize uploaded Service Account JSON (standard for Google Drive server-to-server)
        String base64Json = settingRepo.findBySettingKey("drive.service.account")
                .map(SystemSetting::getSettingValue)
                .orElse("");

        if (base64Json != null && !base64Json.isBlank()) {
            byte[] jsonBytes = Base64.getDecoder().decode(base64Json);
            try (InputStream is = new ByteArrayInputStream(jsonBytes)) {
                GoogleCredentials credentials = GoogleCredentials
                        .fromStream(is)
                        .createScoped(Collections.singleton(DriveScopes.DRIVE));

                return new Drive.Builder(
                        GoogleNetHttpTransport.newTrustedTransport(),
                        GsonFactory.getDefaultInstance(),
                        new HttpCredentialsAdapter(credentials)).setApplicationName(APP_NAME).build();
            }
        }

        // 2. Otherwise check if explicit OAuth refresh token is configured for Drive
        String refreshToken = settingRepo.findBySettingKey("drive.oauth.refresh_token")
                .map(SystemSetting::getSettingValue)
                .filter(v -> !v.isBlank())
                .orElse(defaultRefreshToken);

        if (refreshToken != null && !refreshToken.isBlank()) {
            String clientId = settingRepo.findBySettingKey("drive.oauth.client_id")
                    .map(SystemSetting::getSettingValue)
                    .filter(v -> !v.isBlank())
                    .orElse(defaultClientId);
            String clientSecret = settingRepo.findBySettingKey("drive.oauth.client_secret")
                    .map(SystemSetting::getSettingValue)
                    .filter(v -> !v.isBlank())
                    .orElse(defaultClientSecret);

            UserCredentials credentials = UserCredentials.newBuilder()
                    .setClientId(clientId.trim())
                    .setClientSecret(clientSecret.trim())
                    .setRefreshToken(refreshToken.trim())
                    .build();

            return new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials)).setApplicationName(APP_NAME).build();
        }

        throw new IllegalStateException(SystemMessage.DRIVE_ERR_003.getMessage());
    }

    /**
     * Upload a local file to the configured Google Drive folder.
     * 
     * @return Drive file ID
     */
    public String uploadFile(File localFile, String mimeType) throws Exception {
        Drive drive = buildDrive();
        String folderId = settingRepo.findBySettingKey("drive.folder.id")
                .map(s -> s.getSettingValue()).orElse("").trim();

        FileContent content = new FileContent(mimeType, localFile);

        try {
            com.google.api.services.drive.model.File meta = new com.google.api.services.drive.model.File();
            meta.setName(localFile.getName());
            if (!folderId.isBlank()) {
                meta.setParents(Collections.singletonList(folderId));
            }

            com.google.api.services.drive.model.File uploaded = drive.files()
                    .create(meta, content)
                    .setSupportsAllDrives(true)
                    .setFields("id, webViewLink")
                    .execute();

            log.info("Uploaded backup to Drive directly: {} (id={})", localFile.getName(), uploaded.getId());
            return uploaded.getId();
        } catch (com.google.api.client.googleapis.json.GoogleJsonResponseException e) {
            if (e.getMessage() != null && e.getMessage().contains("storageQuotaExceeded") && !folderId.isBlank()) {
                log.info("Service Account quota limit hit. Using 2-step owner transfer upload...");
                return uploadWithOwnerTransfer(drive, folderId, localFile, mimeType);
            }
            throw e;
        }
    }

    private String uploadWithOwnerTransfer(Drive drive, String folderId, File localFile, String mimeType)
            throws Exception {
        // Step 1: Create empty 0-byte file entry in folder
        com.google.api.services.drive.model.File emptyMeta = new com.google.api.services.drive.model.File();
        emptyMeta.setName(localFile.getName());
        emptyMeta.setParents(Collections.singletonList(folderId));

        com.google.api.services.drive.model.File emptyFile = drive.files()
                .create(emptyMeta)
                .setSupportsAllDrives(true)
                .setFields("id")
                .execute();
        String fileId = emptyFile.getId();

        // Step 2: Try to transfer ownership to the folder owner
        try {
            com.google.api.services.drive.model.File folderMeta = drive.files().get(folderId)
                    .setSupportsAllDrives(true)
                    .setFields("owners")
                    .execute();
            if (folderMeta.getOwners() != null && !folderMeta.getOwners().isEmpty()) {
                String ownerEmail = folderMeta.getOwners().get(0).getEmailAddress();
                if (ownerEmail != null && !ownerEmail.isBlank()) {
                    com.google.api.services.drive.model.Permission perm = new com.google.api.services.drive.model.Permission()
                            .setType("user")
                            .setRole("owner")
                            .setEmailAddress(ownerEmail);
                    drive.permissions().create(fileId, perm)
                            .setTransferOwnership(true)
                            .setSupportsAllDrives(true)
                            .execute();
                }
            }
        } catch (Exception ex) {
            log.warn("Ownership transfer step notice: {}", ex.getMessage());
        }

        // Step 3: Update file with binary content
        FileContent content = new FileContent(mimeType, localFile);
        com.google.api.services.drive.model.File finalFile = drive.files()
                .update(fileId, new com.google.api.services.drive.model.File(), content)
                .setSupportsAllDrives(true)
                .setFields("id, webViewLink")
                .execute();

        log.info("Uploaded backup to Drive via owner transfer: {} (id={})", localFile.getName(), finalFile.getId());
        return finalFile.getId();
    }

    /**
     * Get the web view link for a Drive file.
     */
    public String getWebViewLink(String fileId) throws Exception {
        Drive drive = buildDrive();
        com.google.api.services.drive.model.File f = drive.files().get(fileId)
                .setFields("webViewLink").execute();
        return f.getWebViewLink();
    }

    /**
     * Test if the service account credentials and folder are valid.
     */
    public String getServiceAccountEmail() {
        try {
            String base64Json = settingRepo.findBySettingKey("drive.service.account")
                    .map(SystemSetting::getSettingValue).orElse("");
            if (base64Json.isBlank())
                return "Chưa upload JSON";
            byte[] bytes = Base64.getDecoder().decode(base64Json);
            String json = new String(bytes);
            if (json.contains("\"client_email\"")) {
                int start = json.indexOf("\"client_email\"") + 14;
                start = json.indexOf("\"", start) + 1;
                int end = json.indexOf("\"", start);
                return json.substring(start, end);
            }
        } catch (Exception ignored) {
        }
        return "Unknown Email";
    }

    public void testConnection() throws Exception {
        Drive drive = buildDrive();
        String folderId = settingRepo.findBySettingKey("drive.folder.id")
                .map(s -> s.getSettingValue()).orElse("").trim();

        try {
            if (!folderId.isBlank()) {
                // Verify folder exists and service account has read access
                drive.files().get(folderId)
                        .setSupportsAllDrives(true)
                        .setFields("id, name")
                        .execute();
            } else {
                // Just list root — if no exception, credentials are valid
                drive.files().list()
                        .setSupportsAllDrives(true)
                        .setPageSize(1)
                        .execute();
            }
        } catch (com.google.api.client.googleapis.json.GoogleJsonResponseException e) {
            if (e.getStatusCode() == 404) {
                String saEmail = getServiceAccountEmail();
                throw new IllegalStateException(String.format(SystemMessage.DRIVE_ERR_001.getMessage(), folderId, saEmail, saEmail));
            }
            throw e;
        }
    }

    /**
     * Delete a file from Google Drive.
     */
    public void deleteFile(String driveFileId) throws Exception {
        Drive drive = buildDrive();
        drive.files().delete(driveFileId).execute();
    }

    /**
     * List all backup files (.sql.gz or .sql) from the configured Google Drive folder (or root if not set).
     */
    public List<com.google.api.services.drive.model.File> listBackupFiles() throws Exception {
        Drive drive = buildDrive();
        String folderId = settingRepo.findBySettingKey("drive.folder.id")
                .map(s -> s.getSettingValue()).orElse("").trim();

        String q = "trashed = false and (name contains '.sql.gz' or name contains '.sql')";
        if (!folderId.isBlank()) {
            q = "'" + folderId + "' in parents and " + q;
        }

        FileList result = drive.files().list()
                .setQ(q)
                .setSupportsAllDrives(true)
                .setIncludeItemsFromAllDrives(true)
                .setFields("files(id, name, size, createdTime, modifiedTime, webViewLink)")
                .setOrderBy("createdTime desc")
                .setPageSize(100)
                .execute();

        return result.getFiles() != null ? result.getFiles() : Collections.emptyList();
    }

    /**
     * Download a file from Google Drive to local destination file.
     */
    public void downloadFile(String driveFileId, File targetFile) throws Exception {
        Drive drive = buildDrive();
        if (targetFile.getParentFile() != null && !targetFile.getParentFile().exists()) {
            targetFile.getParentFile().mkdirs();
        }
        try (OutputStream outputStream = new FileOutputStream(targetFile)) {
            drive.files().get(driveFileId)
                    .setSupportsAllDrives(true)
                    .executeMediaAndDownloadTo(outputStream);
        }
    }
}
