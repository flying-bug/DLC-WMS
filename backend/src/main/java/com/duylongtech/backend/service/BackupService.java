package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.BackupRecordDto;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.BackupScheduleDto;
import com.duylongtech.backend.entity.BackupRecord;
import com.duylongtech.backend.entity.SystemSetting;
import com.duylongtech.backend.repository.BackupRecordRepository;
import com.duylongtech.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.core.env.Environment;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackupService {

    @PersistenceContext
    private EntityManager entityManager;

    private final SystemSettingRepository settingRepo;
    private final BackupRecordRepository backupRecordRepo;
    private final GoogleDriveService driveService;
    private final EmailService emailService;
    private final Environment env;

    private void ensureNativePasswordAuth(String user, String pass) {
        org.hibernate.Session session = entityManager.unwrap(org.hibernate.Session.class);
        session.doWork(connection -> {
            try (java.sql.Statement stmt = connection.createStatement()) {
                try {
                    stmt.executeUpdate("ALTER USER '" + user + "'@'%' IDENTIFIED WITH mysql_native_password BY '" + pass + "'");
                    stmt.executeUpdate("FLUSH PRIVILEGES");
                } catch (Exception e) {
                    try {
                        stmt.executeUpdate("ALTER USER '" + user + "'@'localhost' IDENTIFIED WITH mysql_native_password BY '" + pass + "'");
                        stmt.executeUpdate("FLUSH PRIVILEGES");
                    } catch (Exception ignored) {}
                }
            }
        });
    }


    private static final DateTimeFormatter FILENAME_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    private static final String MIME_GZIP = "application/gzip";

    // ─── Settings helpers ───────────────────────────────────────────────────────

    private String setting(String key, String defaultVal) {
        return settingRepo.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(defaultVal);
    }

    private boolean settingBool(String key) {
        return "true".equalsIgnoreCase(setting(key, "false"));
    }

    private Path ensureBackupDir() throws IOException {
        Path dir = Path.of(setting("backup.path", "/tmp/backups"));
        Files.createDirectories(dir);
        return dir;
    }

    // ─── Create Backup ─────────────────────────────────────────────────────────

    // ─── Create Backup ─────────────────────────────────────────────────────────

    /**
     * Runs mysqldump, gzips (and optionally AES-256 encrypts) the output, saves a BackupRecord.
     * @param actor username of the SuperAdmin triggering this
     * @return the BackupRecord saved to DB
     */
    @Transactional
    public BackupRecord createBackup(String actor) throws Exception {
        boolean encrypt = settingBool("backup.encrypt.enabled");
        String encKey = setting("backup.encrypt.key", "");
        
        String timestamp = LocalDateTime.now().format(FILENAME_FMT);
        String filename  = "backup_" + timestamp + (encrypt && !encKey.isBlank() ? ".sql.gz.enc" : ".sql.gz");
        Path   backupDir = ensureBackupDir();
        Path   outPath   = backupDir.resolve(filename);

        // ── Read DB connection from Spring Environment ───────────────────────
        String dbUrl  = env.getProperty("spring.datasource.url", "jdbc:mysql://localhost:3306/duylongcomputer");
        String dbUser = env.getProperty("spring.datasource.username", "root");
        String dbPass = env.getProperty("spring.datasource.password", "123456");

        // Parse host, port, dbname from JDBC URL
        String host   = "localhost";
        String port   = "3306";
        String dbName = "duylongcomputer";
        try {
            String stripped = dbUrl.replace("jdbc:mysql://", "");
            String[] parts  = stripped.split("/", 2);
            String   hostPort = parts[0];
            if (parts.length > 1) dbName = parts[1].split("\\?")[0];
            if (hostPort.contains(":")) {
                host = hostPort.split(":")[0];
                port = hostPort.split(":")[1];
            } else {
                host = hostPort;
            }
        } catch (Exception ignored) {}

        // Ensure user uses mysql_native_password so MariaDB CLI client can connect
        ensureNativePasswordAuth(dbUser, dbPass);

        // ── Find dump executable & run dump ──────────────────────────────────
        String dumpCmd = new File("/usr/bin/mariadb-dump").exists() ? "/usr/bin/mariadb-dump" : "mysqldump";

        ProcessBuilder pb = new ProcessBuilder(
                dumpCmd,
                "-h", host,
                "-P", port,
                "-u", dbUser,
                "--password=" + dbPass,
                "--skip-ssl",
                "--single-transaction",
                "--routines",
                "--triggers",
                dbName
        );
        pb.redirectErrorStream(false);

        Process process;
        try {
            process = pb.start();
        } catch (IOException e) {
            if (e.getMessage().contains("CreateProcess error=2") || e.getMessage().contains("No such file or directory") || e.getMessage().contains("Cannot run program")) {
                throw new RuntimeException(SystemMessage.BACKUP_ERR_007.getMessage());
            }
            throw new RuntimeException(String.format(SystemMessage.BACKUP_ERR_006.getMessage(), e.getMessage()));
        }

        // Stream mysqldump stdout → GZIP (and Cipher if AES enabled)
        try (InputStream sqlStream = process.getInputStream();
             OutputStream rawOut   = Files.newOutputStream(outPath)) {
            
            OutputStream finalOut = rawOut;
            if (encrypt && !encKey.isBlank()) {
                byte[] iv = new byte[16];
                new java.security.SecureRandom().nextBytes(iv);
                rawOut.write(iv); // Ghi 16-byte IV lên đầu file
                
                byte[] keyBytes = java.security.MessageDigest.getInstance("SHA-256")
                        .digest(encKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(keyBytes, "AES");
                javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, secretKey, new javax.crypto.spec.IvParameterSpec(iv));
                finalOut = new javax.crypto.CipherOutputStream(rawOut, cipher);
            }
            
            try (GZIPOutputStream gzip = new GZIPOutputStream(finalOut)) {
                byte[] buf = new byte[8192];
                int read;
                while ((read = sqlStream.read(buf)) != -1) {
                    gzip.write(buf, 0, read);
                }
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            String errMsg = new String(process.getErrorStream().readAllBytes());
            Files.deleteIfExists(outPath);
            throw new RuntimeException(String.format(SystemMessage.BACKUP_ERR_005.getMessage(), exitCode, errMsg));
        }

        long fileSize = Files.size(outPath);
        BackupRecord record = BackupRecord.builder()
                .filename(filename)
                .fileSize(fileSize)
                .status(BackupRecord.BackupStatus.LOCAL)
                .createdBy(actor)
                .note(encrypt && !encKey.isBlank() ? "Backup mã hóa (AES-256)" : "Backup thủ công")
                .build();

        record = backupRecordRepo.save(record);
        log.info("Backup created: {} ({})", filename, SystemHealthService.formatBytes(fileSize));

        // ── Auto-upload to Drive if enabled ──────────────────────────────────
        if (settingBool("drive.enabled")) {
            try {
                uploadToDrive(record);
            } catch (Exception e) {
                log.warn("Auto Drive upload failed: {}", e.getMessage());
            }
        }

        // ── Auto Email notification if enabled ───────────────────────────────
        if (settingBool("notify.email.enabled")) {
            try {
                String emailTo = setting("notify.email.to", "");
                if (emailTo != null && !emailTo.isBlank()) {
                    emailService.sendBackupNotificationEmail(
                            emailTo,
                            record.getFilename(),
                            SystemHealthService.formatBytes(record.getFileSize()),
                            true,
                            null
                    );
                }
            } catch (Exception e) {
                log.warn("Auto email notification failed: {}", e.getMessage());
            }
        }

        return record;
    }

    // ─── Upload to Drive ───────────────────────────────────────────────────────

    @Transactional
    public BackupRecord uploadToDrive(BackupRecord record) throws Exception {
        Path backupDir = ensureBackupDir();
        File file = backupDir.resolve(record.getFilename()).toFile();

        if (!file.exists()) {
            throw new FileNotFoundException(String.format(SystemMessage.BACKUP_ERR_004.getMessage(), record.getFilename()));
        }

        String driveFileId = driveService.uploadFile(file, MIME_GZIP);
        String webLink     = driveService.getWebViewLink(driveFileId);

        record.setDriveFileId(driveFileId);
        record.setDriveLink(webLink);
        record.setStatus(
                record.getStatus() == BackupRecord.BackupStatus.LOCAL
                        ? BackupRecord.BackupStatus.DRIVE
                        : BackupRecord.BackupStatus.BOTH
        );
        return backupRecordRepo.save(record);
    }

    @Transactional
    public BackupRecord uploadToDriveById(Long id) throws Exception {
        BackupRecord record = backupRecordRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Backup không tồn tại: " + id));
        return uploadToDrive(record);
    }

    // ─── Restore ───────────────────────────────────────────────────────────────

    @Transactional
    public void restoreBackup(Long id, String userEncryptionKey) throws Exception {
        BackupRecord record = backupRecordRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Backup không tồn tại: " + id));

        Path backupDir = ensureBackupDir();
        Path filePath  = backupDir.resolve(record.getFilename());

        if (!Files.exists(filePath)) {
            throw new FileNotFoundException(String.format(SystemMessage.BACKUP_ERR_003.getMessage(), record.getFilename()));
        }

        boolean isEncryptedFile = record.getFilename().endsWith(".enc");

        if (isEncryptedFile && (userEncryptionKey == null || userEncryptionKey.isBlank())) {
            throw new com.duylongtech.backend.exception.BusinessException(
                    "File sao lưu này được mã hóa bằng AES-256. Vui lòng nhập khoá mã hóa (Encryption Key) để giải mã trước khi khôi phục.");
        }

        String dbUrl  = env.getProperty("spring.datasource.url", "jdbc:mysql://localhost:3306/duylongcomputer");
        String dbUser = env.getProperty("spring.datasource.username", "root");
        String dbPass = env.getProperty("spring.datasource.password", "123456");

        String host   = "localhost", port = "3306", dbName = "duylongcomputer";
        try {
            String stripped = dbUrl.replace("jdbc:mysql://", "");
            String[] parts  = stripped.split("/", 2);
            String hostPort = parts[0];
            if (parts.length > 1) dbName = parts[1].split("\\?")[0];
            if (hostPort.contains(":")) { host = hostPort.split(":")[0]; port = hostPort.split(":")[1]; }
            else host = hostPort;
        } catch (Exception ignored) {}

        record.setStatus(BackupRecord.BackupStatus.RESTORING);
        backupRecordRepo.save(record);

        ensureNativePasswordAuth(dbUser, dbPass);

        // Decompress (and Cipher decrypt if encrypted) and pipe to mysql / mariadb
        String mysqlCmd = new File("/usr/bin/mariadb").exists() ? "/usr/bin/mariadb" : "mysql";
        ProcessBuilder pb = new ProcessBuilder(
                mysqlCmd,
                "-h", host, "-P", port,
                "-u", dbUser,
                "--password=" + dbPass,
                "--skip-ssl",
                dbName
        );
        pb.redirectErrorStream(true);

        Process process = pb.start();

        try (InputStream fileIn = Files.newInputStream(filePath)) {
            InputStream decryptedIn = fileIn;
            
            if (isEncryptedFile) {
                byte[] iv = new byte[16];
                int ivBytesRead = fileIn.read(iv);
                if (ivBytesRead < 16) {
                    throw new com.duylongtech.backend.exception.BusinessException("File mã hóa bị lỗi hoặc hỏng cấu trúc IV.");
                }

                byte[] keyBytes = java.security.MessageDigest.getInstance("SHA-256")
                        .digest(userEncryptionKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(keyBytes, "AES");
                javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(javax.crypto.Cipher.DECRYPT_MODE, secretKey, new javax.crypto.spec.IvParameterSpec(iv));
                decryptedIn = new javax.crypto.CipherInputStream(fileIn, cipher);
            }

            try (java.util.zip.GZIPInputStream gzipIn = new java.util.zip.GZIPInputStream(decryptedIn);
                 OutputStream mysqlIn = process.getOutputStream()) {
                byte[] buf = new byte[8192];
                int read;
                while ((read = gzipIn.read(buf)) != -1) {
                    mysqlIn.write(buf, 0, read);
                }
            } catch (Exception e) {
                record.setStatus(BackupRecord.BackupStatus.FAILED);
                backupRecordRepo.save(record);
                throw new com.duylongtech.backend.exception.BusinessException(
                        "Khóa giải mã (Encryption Key) không đúng hoặc file backup bị hỏng: " + e.getMessage());
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            String errMsg = new String(process.getInputStream().readAllBytes());
            record.setStatus(BackupRecord.BackupStatus.FAILED);
            backupRecordRepo.save(record);
            throw new RuntimeException(String.format(SystemMessage.BACKUP_ERR_002.getMessage(), exitCode, errMsg));
        }

        record.setStatus(BackupRecord.BackupStatus.LOCAL);
        backupRecordRepo.save(record);
        syncDiskBackupsWithDb();
        log.info("Database restored from: {}", record.getFilename());
    }

    public void syncDiskBackupsWithDb() {
        try {
            Path backupDir = ensureBackupDir();
            if (!Files.exists(backupDir)) return;

            try (var stream = Files.list(backupDir)) {
                List<Path> files = stream.filter(p -> p.getFileName().toString().endsWith(".sql.gz")).toList();
                for (Path filePath : files) {
                    String fname = filePath.getFileName().toString();
                    if (!backupRecordRepo.existsByFilename(fname)) {
                        long size = Files.size(filePath);
                        BackupRecord record = BackupRecord.builder()
                                .filename(fname)
                                .fileSize(size)
                                .status(BackupRecord.BackupStatus.LOCAL)
                                .createdBy("system")
                                .note("Sao lưu sẵn trên ổ cứng")
                                .build();
                        backupRecordRepo.save(record);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Đồng bộ file backup từ ổ cứng bị lỗi: {}", e.getMessage());
        }
    }

    // ─── Delete ────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteBackup(Long id) throws Exception {
        BackupRecord record = backupRecordRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Backup không tồn tại: " + id));

        // Delete local file
        Path filePath = ensureBackupDir().resolve(record.getFilename());
        Files.deleteIfExists(filePath);

        // Delete from Drive if uploaded
        if (record.getDriveFileId() != null && !record.getDriveFileId().isBlank()) {
            try {
                driveService.deleteFile(record.getDriveFileId());
            } catch (Exception e) {
                log.warn("Could not delete Drive file {}: {}", record.getDriveFileId(), e.getMessage());
            }
        }

        backupRecordRepo.delete(record);
        log.info("Deleted backup: {}", record.getFilename());
    }

    // ─── List ──────────────────────────────────────────────────────────────────

    public List<BackupRecordDto> listBackups() {
        syncDiskBackupsWithDb();
        return backupRecordRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // ─── Download ──────────────────────────────────────────────────────────────

    public Path getBackupFilePath(Long id) throws Exception {
        BackupRecord record = backupRecordRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Backup không tồn tại: " + id));
        Path filePath = ensureBackupDir().resolve(record.getFilename());
        if (!Files.exists(filePath)) {
            throw new FileNotFoundException(String.format(SystemMessage.BACKUP_ERR_001.getMessage(), record.getFilename()));
        }
        return filePath;
    }

    // ─── Schedule settings ────────────────────────────────────────────────────

    public BackupScheduleDto getSchedule() {
        return BackupScheduleDto.builder()
                .enabled(settingBool("backup.schedule.enabled"))
                .scheduleType(setting("backup.schedule.type", "DAILY"))
                .scheduleTime(setting("backup.schedule.time", "02:00"))
                .scheduleDay(Integer.parseInt(setting("backup.schedule.day", "1")))
                .retentionDays(Integer.parseInt(setting("backup.retention.days", "30")))
                .build();
    }

    @Transactional
    public void saveSchedule(BackupScheduleDto dto) {
        upsertSetting("backup.schedule.enabled", String.valueOf(dto.isEnabled()));
        upsertSetting("backup.schedule.type",    dto.getScheduleType());
        upsertSetting("backup.schedule.time",    dto.getScheduleTime());
        upsertSetting("backup.schedule.day",     String.valueOf(dto.getScheduleDay()));
        upsertSetting("backup.retention.days",   String.valueOf(dto.getRetentionDays()));
    }

    // ─── Retention cleanup ────────────────────────────────────────────────────

    @Transactional
    public void applyRetentionPolicy() {
        int retentionDays = Integer.parseInt(setting("backup.retention.days", "30"));
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);

        List<BackupRecord> old = backupRecordRepo.findAllByOrderByCreatedAtDesc().stream()
                .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().isBefore(cutoff))
                .collect(Collectors.toList());

        for (BackupRecord r : old) {
            try {
                deleteBackup(r.getId());
                log.info("Retention: deleted old backup {}", r.getFilename());
            } catch (Exception e) {
                log.warn("Retention: could not delete {}: {}", r.getFilename(), e.getMessage());
            }
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private void upsertSetting(String key, String value) {
        SystemSetting s = settingRepo.findBySettingKey(key)
                .orElse(SystemSetting.builder().settingKey(key).build());
        s.setSettingValue(value);
        settingRepo.save(s);
    }

    public BackupRecordDto toDto(BackupRecord r) {
        return BackupRecordDto.builder()
                .id(r.getId())
                .filename(r.getFilename())
                .fileSize(r.getFileSize())
                .fileSizeFormatted(r.getFileSize() != null
                        ? SystemHealthService.formatBytes(r.getFileSize()) : "0 B")
                .status(r.getStatus())
                .driveFileId(r.getDriveFileId())
                .driveLink(r.getDriveLink())
                .createdAt(r.getCreatedAt())
                .createdBy(r.getCreatedBy())
                .note(r.getNote())
                .build();
    }
}
