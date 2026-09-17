package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.system.CloudinaryService;
import com.duylongtech.backend.feature.system.UploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service quản lý ảnh sửa chữa theo từng giai đoạn.
 * Mỗi giai đoạn (INTAKE, DIAGNOSIS, COMPLETION) tương ứng với trạng thái
 * của lệnh sửa chữa và có phân quyền upload/xóa khác nhau.
 */
@Service
@RequiredArgsConstructor
public class RepairPhotoService {

    private static final int MAX_PHOTOS_PER_PHASE = 10;

    /**
     * Map các phase sang trạng thái cho phép upload:
     * INTAKE -> DRAFT, ASSIGNED (tiếp nhận ban đầu và khi KTV đang xem)
     * DIAGNOSIS -> ASSIGNED, QUOTATION_PENDING (KTV chẩn đoán)
     * COMPLETION -> UNDER_REPAIR, READY_FOR_DELIVERY (KTV hoàn thành sửa)
     */
    private static final Map<String, Set<String>> PHASE_ALLOWED_STATUSES = Map.of(
            "INTAKE", Set.of(RepairStatus.DRAFT.name(), RepairStatus.DIAGNOSING.name()),
            "DIAGNOSIS", Set.of(RepairStatus.DIAGNOSING.name(), RepairStatus.QUOTATION_PENDING.name()),
            "COMPLETION", Set.of(RepairStatus.UNDER_REPAIR.name(), RepairStatus.READY_FOR_DELIVERY.name())
    );

    /** Khi lệnh chuyển sang trạng thái này trở đi, phase tương ứng sẽ bị lock */
    private static final Map<String, String> PHASE_LOCK_THRESHOLD = Map.of(
            "INTAKE", RepairStatus.DIAGNOSING.name(),      // Khóa INTAKE khi assign xong
            "DIAGNOSIS", RepairStatus.APPROVED.name(),   // Khóa DIAGNOSIS khi kế toán duyệt
            "COMPLETION", RepairStatus.CLOSED.name()     // Khóa COMPLETION khi đóng phiếu
    );

    private static final List<String> STATUS_ORDER = List.of(
            RepairStatus.DRAFT.name(),
            RepairStatus.DIAGNOSING.name(),
            RepairStatus.QUOTATION_PENDING.name(),
            RepairStatus.APPROVED.name(),
            RepairStatus.UNDER_REPAIR.name(),
            RepairStatus.READY_FOR_DELIVERY.name(),
            RepairStatus.CLOSED.name(),
            RepairStatus.CANCELLED.name()
    );

    private final RepairPhotoRepository photoRepository;
    private final RepairRepository repairRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    @Transactional(readOnly = true)
    public List<RepairPhotoResponse> getPhotos(Long repairId) {
        repairRepository.findById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));
        List<RepairPhoto> photos = photoRepository.findByRepairIdOrderByCreatedAtAsc(repairId);
        return photos.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RepairPhotoResponse> getPhotosByPhase(Long repairId, String phase) {
        validatePhase(phase);
        repairRepository.findById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));
        return photoRepository.findByRepairIdAndPhaseOrderByCreatedAtAsc(repairId, phase.toUpperCase())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public RepairPhotoResponse uploadPhoto(Long repairId, String phase, String category,
                                           String caption, MultipartFile file) {
        validatePhase(phase);
        String normalizedPhase = phase.toUpperCase();

        Repair repair = repairRepository.findById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        // Kiểm tra trạng thái có cho phép upload ở phase này không
        Set<String> allowedStatuses = PHASE_ALLOWED_STATUSES.get(normalizedPhase);
        if (allowedStatuses == null || !allowedStatuses.contains(repair.getRepairStatus())) {
            throw new BusinessException("Không thể upload ảnh giai đoạn " + normalizedPhase
                    + " khi lệnh đang ở trạng thái " + repair.getRepairStatus());
        }

        // Kiểm tra quyền: INTAKE do Kế toán/Tiếp nhận, DIAGNOSIS/COMPLETION do KTV được giao
        checkUploadPermission(repair, normalizedPhase);

        // Giới hạn số lượng ảnh mỗi phase
        long count = photoRepository.countByRepairIdAndPhase(repairId, normalizedPhase);
        if (count >= MAX_PHOTOS_PER_PHASE) {
            throw new BusinessException("Mỗi giai đoạn tối đa " + MAX_PHOTOS_PER_PHASE + " ảnh");
        }

        // Upload lên Cloudinary với folder scoped theo lệnh
        String folder = "repairs/" + repair.getRepairCode() + "/" + normalizedPhase.toLowerCase();
        UploadResponse uploadResult = cloudinaryService.uploadImage(file, folder);

        // Tính checksum
        String checksum = computeChecksum(file);

        Long uploaderId = currentUserId();
        RepairPhoto photo = new RepairPhoto();
        photo.init(repairId, normalizedPhase,
                category != null ? category.toUpperCase() : null,
                uploadResult.getPublicId(), uploadResult.getSecureUrl(),
                checksum, uploaderId, caption);

        // Kiểm tra lock dựa trên trạng thái hiện tại
        photo.setLocked(isPhaseLockedForStatus(normalizedPhase, repair.getRepairStatus()));

        photoRepository.save(photo);
        return toResponse(photo);
    }

    @Transactional
    public void deletePhoto(Long repairId, Long photoId) {
        Repair repair = repairRepository.findById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        RepairPhoto photo = photoRepository.findByIdAndRepairId(photoId, repairId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy ảnh"));

        if (Boolean.TRUE.equals(photo.getLocked())) {
            throw new BusinessException("Ảnh đã bị khóa, không thể xóa sau khi lệnh chuyển giai đoạn");
        }

        // Kiểm tra quyền xóa tương tự upload
        checkUploadPermission(repair, photo.getPhase());

        // Xóa trên Cloudinary (best-effort, không fail nếu lỗi remote)
        try {
            cloudinaryService.deleteImage(photo.getPublicId());
        } catch (Exception ignored) { }

        photoRepository.delete(photo);
    }

    /**
     * Lock tất cả ảnh của phase đã qua khi lệnh chuyển sang trạng thái mới.
     * Được gọi từ RepairWorkflowService tại mỗi transition.
     */
    @Transactional
    public void lockPhotosForStatus(Long repairId, String newStatus) {
        PHASE_LOCK_THRESHOLD.forEach((phase, lockThreshold) -> {
            if (isStatusAtOrAfter(newStatus, lockThreshold)) {
                List<RepairPhoto> unlocked = photoRepository.findUnlockedByRepairIdAndPhase(repairId, phase);
                unlocked.forEach(p -> p.setLocked(true));
                photoRepository.saveAll(unlocked);
            }
        });
    }

    // ===================== Helpers =====================

    private void checkUploadPermission(Repair repair, String phase) {
        Long currentUserId = currentUserId();
        boolean isAdmin = hasAnyRole("ROLE_SUPER_ADMIN", "ROLE_MANAGER");
        if (isAdmin) return;

        boolean isTechnician = hasRole("ROLE_TECHNICIAN");
        boolean isReceptionist = hasAnyRole("ROLE_ACCOUNTANT", "ROLE_RECEPTIONIST");

        if ("INTAKE".equals(phase)) {
            if (!isReceptionist && !isAdmin) {
                throw new BusinessException("Chỉ Kế toán/Tiếp nhận mới được upload ảnh giai đoạn tiếp nhận");
            }
        } else {
            // DIAGNOSIS, COMPLETION: chỉ KTV được giao
            if (isTechnician && !currentUserId.equals(repair.getAssignedTechnicianId())) {
                throw new BusinessException("Bạn không được phân công lệnh này, không thể upload ảnh");
            }
            if (!isTechnician && !isReceptionist) {
                throw new BusinessException("Bạn không có quyền upload ảnh cho giai đoạn này");
            }
        }
    }

    private boolean isPhaseLockedForStatus(String phase, String currentStatus) {
        String lockThreshold = PHASE_LOCK_THRESHOLD.get(phase);
        if (lockThreshold == null) return false;
        return isStatusAtOrAfter(currentStatus, lockThreshold);
    }

    private boolean isStatusAtOrAfter(String currentStatus, String threshold) {
        int currentIdx = STATUS_ORDER.indexOf(currentStatus);
        int thresholdIdx = STATUS_ORDER.indexOf(threshold);
        return currentIdx >= 0 && thresholdIdx >= 0 && currentIdx >= thresholdIdx;
    }

    private void validatePhase(String phase) {
        if (phase == null || !Set.of("INTAKE", "DIAGNOSIS", "COMPLETION").contains(phase.toUpperCase())) {
            throw new BusinessException("Phase ảnh không hợp lệ. Phải là: INTAKE, DIAGNOSIS, hoặc COMPLETION");
        }
    }

    private String computeChecksum(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            return null; // Non-critical
        }
    }

    private RepairPhotoResponse toResponse(RepairPhoto photo) {
        String uploaderName = null;
        if (photo.getUploadedBy() != null) {
            uploaderName = userRepository.findById(photo.getUploadedBy())
                    .map(User::getFullName).orElse(null);
        }
        return RepairPhotoResponse.builder()
                .id(photo.getId())
                .repairId(photo.getRepairId())
                .phase(photo.getPhase())
                .category(photo.getCategory())
                .secureUrl(photo.getSecureUrl())
                .publicId(photo.getPublicId())
                .caption(photo.getCaption())
                .locked(photo.getLocked())
                .uploadedBy(photo.getUploadedBy())
                .uploadedByName(uploaderName)
                .createdAt(photo.getCreatedAt())
                .watermarkedAt(photo.getWatermarkedAt())
                .build();
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new BusinessException("Không xác định được người dùng hiện tại");
        return userRepository.findByUsername(auth.getName()).map(User::getId)
                .orElseThrow(() -> new BusinessException("Không xác định được người dùng hiện tại"));
    }

    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).anyMatch(role::equals);
    }

    private boolean hasAnyRole(String... roles) {
        return Arrays.stream(roles).anyMatch(this::hasRole);
    }
}
