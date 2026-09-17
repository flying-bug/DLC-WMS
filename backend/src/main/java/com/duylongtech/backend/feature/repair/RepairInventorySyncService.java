package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.inventory.*;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.partner.PartnerLedgerRepository;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RepairInventorySyncService {
    private final RepairRepository repairRepository;
    private final InventoryDocumentRepository documentRepository;
    private final StockReservationRepository reservationRepository;
    private final InventoryBalanceRepository balanceRepository;
    private final UserRepository userRepository;
    private final UserWarehouseRoleRepository userWarehouseRoleRepository;
    private final AuditLogService auditLogService;
    private final AppNotificationService notificationService;
    private final PartnerLedgerService partnerLedgerService;
    private final PartnerLedgerRepository partnerLedgerRepository;

    @Transactional(readOnly = true)
    public void validatePost(InventoryDocument document) {
        if (!isRepairDocument(document)) return;
        requireWarehouseActor(document.getWarehouseId());
        Repair repair = repairRepository.findById(document.getReferenceId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh của phiếu kho"));
        if ("REPAIR".equals(document.getIssuePurpose())) {
            requireState(repair, RepairStatus.APPROVED);
            if (!repair.getWarehouseId().equals(document.getWarehouseId())) {
                throw new BusinessException("Phiếu xuất không thuộc kho sửa chữa đã chốt");
            }
            validateReservations(repair.getId(), document);
        } else if ("SCRAP".equals(document.getIssuePurpose())) {
            requireState(repair, RepairStatus.APPROVED);
            if (!repair.getScrapWarehouseId().equals(document.getWarehouseId())) {
                throw new BusinessException("Phiếu nhập không thuộc kho phế phẩm đã chốt");
            }
        } else {
            throw new BusinessException("Vai trò chứng từ Repair không hợp lệ");
        }
    }

    private void validateReservations(Long repairId, InventoryDocument document) {
        Map<Long, BigDecimal> held = reservationRepository
                .findByRepairIdAndStatus(repairId, StockReservationStatus.HOLDING.name()).stream()
                .collect(Collectors.groupingBy(StockReservation::getVariantId,
                        Collectors.reducing(BigDecimal.ZERO, StockReservation::getQuantityReserved, BigDecimal::add)));
        Map<Long, BigDecimal> requested = document.getLines().stream()
                .collect(Collectors.groupingBy(InventoryDocumentLine::getVariantId,
                        Collectors.reducing(BigDecimal.ZERO,
                                line -> line.getQuantityOut() != null ? line.getQuantityOut() : BigDecimal.ZERO,
                                BigDecimal::add)));
        if (requested.isEmpty() || requested.size() != held.size()) {
            throw new BusinessException("Reservation của lệnh không khớp phiếu xuất");
        }
        requested.forEach((variantId, quantity) -> {
            if (held.getOrDefault(variantId, BigDecimal.ZERO).compareTo(quantity) != 0) {
                throw new BusinessException("Reservation của SKU " + variantId + " không khớp số lượng xuất");
            }
        });
    }

    @Transactional(readOnly = true)
    public void requireWarehouseAccess(Long warehouseId) {
        requireWarehouseActor(warehouseId);
    }

    @Transactional
    public void afterPost(InventoryDocument document) {
        if (!isRepairDocument(document)) return;
        Repair repair = repairRepository.findByIdForUpdate(document.getReferenceId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh của phiếu kho"));
        
        if ("REPAIR".equals(document.getIssuePurpose())) {
            fulfillReservations(repair.getId());
            notifyAfterCommit(repair.getAssignedTechnicianId(), "Linh kiện đã xuất",
                    "Lệnh " + repair.getRepairCode() + " đã sẵn sàng", repair.getId());
        } else if ("SCRAP".equals(document.getIssuePurpose())) {
            notifyAfterCommit(repair.getCreatedBy(), "Phiếu nhập phế phẩm đã ghi sổ",
                    "Lệnh " + repair.getRepairCode() + " - phiếu thu hồi đã ghi sổ", repair.getId());
        }

        // Chuyển UNDER_REPAIR khi mọi phiếu bắt buộc đã post
        boolean allPosted = documentRepository.findByReferenceWithLines("REPAIR", repair.getId())
                .stream()
                .allMatch(d -> DocumentStatus.POSTED.name().equals(d.getStatus()));
                
        if (allPosted && RepairStatus.APPROVED.name().equals(repair.getRepairStatus())) {
            repair.markUnderRepair();
            notifyAfterCommit(repair.getAssignedTechnicianId(), "Lệnh sửa chữa đã sẵn sàng",
                    "Lệnh " + repair.getRepairCode() + " đã ghi sổ đủ chứng từ kho, có thể bắt đầu sửa", repair.getId());
        }

        repairRepository.save(repair);
        auditLogService.logEvent(currentUsername(), "SYNC_INVENTORY_POST", "Repair", repair.getId(), "SUCCESS",
                "Đồng bộ từ chứng từ " + document.getDocCode(), null, null);
    }

    @Transactional(readOnly = true)
    public void validateUnpost(InventoryDocument document) {
        if (!isRepairDocument(document)) return;
        requireWarehouseActor(document.getWarehouseId());
        Repair repair = repairRepository.findById(document.getReferenceId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh của phiếu kho"));
        
        if ("SCRAP".equals(document.getIssuePurpose())) {
            if (!RepairStatus.APPROVED.name().equals(repair.getRepairStatus()) 
                    && !RepairStatus.UNDER_REPAIR.name().equals(repair.getRepairStatus())) {
                throw new BusinessException("Chỉ unpost phiếu nhập phế phẩm khi lệnh ở trạng thái APPROVED hoặc UNDER_REPAIR");
            }
        } else if ("REPAIR".equals(document.getIssuePurpose())) {
            if (!RepairStatus.APPROVED.name().equals(repair.getRepairStatus()) 
                    && !RepairStatus.UNDER_REPAIR.name().equals(repair.getRepairStatus())) {
                throw new BusinessException("Chỉ unpost phiếu xuất khi lệnh ở trạng thái APPROVED hoặc UNDER_REPAIR");
            }
            if (documentRepository.existsByReferenceTypeAndReferenceIdAndIssuePurposeAndStatus(
                    "REPAIR", repair.getId(), "SCRAP", DocumentStatus.POSTED.name())) {
                throw new BusinessException("Không thể unpost phiếu xuất sau khi đã nhập phế phẩm");
            }
        }
    }

    @Transactional
    public void afterUnpost(InventoryDocument document) {
        if (!isRepairDocument(document)) return;
        Repair repair = repairRepository.findByIdForUpdate(document.getReferenceId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh của phiếu kho"));
        
        if ("REPAIR".equals(document.getIssuePurpose())) {
            restoreReservations(repair.getId());
        }

        // Quay về APPROVED nếu đang ở UNDER_REPAIR vì một trong các phiếu đã bị unpost
        if (RepairStatus.UNDER_REPAIR.name().equals(repair.getRepairStatus())) {
            repair.rollbackToApproved();
            auditLogService.logEvent(currentUsername(), "SYNC_INVENTORY_UNPOST", "Repair", repair.getId(), "SUCCESS",
                    "Bỏ ghi sổ " + document.getDocCode() + ", lệnh quay về APPROVED", null, null);
            notifyAfterCommit(repair.getAssignedTechnicianId(), "Chứng từ kho bị bỏ ghi sổ",
                    "Lệnh " + repair.getRepairCode() + " đang chờ kho xử lý lại", repair.getId());
        } else {
            auditLogService.logEvent(currentUsername(), "SYNC_INVENTORY_UNPOST", "Repair", repair.getId(), "SUCCESS",
                    "Bỏ ghi sổ " + document.getDocCode(), null, null);
        }
        repairRepository.save(repair);
    }

    private void fulfillReservations(Long repairId) {
        for (StockReservation reservation : reservationRepository
                .findByRepairIdAndStatus(repairId, StockReservationStatus.HOLDING.name())) {
            balanceRepository.decrementReservedQuantity(reservation.getWarehouseId(), reservation.getVariantId(),
                    reservation.getQuantityReserved());
            reservation.setStatus(StockReservationStatus.FULFILLED.name());
            reservationRepository.save(reservation);
        }
    }

    private void restoreReservations(Long repairId) {
        for (StockReservation reservation : reservationRepository
                .findByRepairIdAndStatus(repairId, StockReservationStatus.FULFILLED.name())) {
            InventoryBalance balance = balanceRepository
                    .findByWarehouseAndVariantForUpdate(reservation.getWarehouseId(), reservation.getVariantId(), "GOOD")
                    .orElseGet(() -> {
                        InventoryBalance created = new InventoryBalance();
                        created.initBalance(reservation.getWarehouseId(), reservation.getVariantId(), null, "GOOD",
                                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
                        return balanceRepository.save(created);
                    });
            balance.setQuantityReserved(balance.getQuantityReserved().add(reservation.getQuantityReserved()));
            balanceRepository.save(balance);
            reservation.setStatus(StockReservationStatus.HOLDING.name());
            reservationRepository.save(reservation);
        }
    }

    private boolean isRepairDocument(InventoryDocument document) {
        return document != null && "REPAIR".equalsIgnoreCase(document.getReferenceType())
                && document.getReferenceId() != null && document.getIssuePurpose() != null;
    }

    private void requireWarehouseActor(Long warehouseId) {
        if (hasAnyRole("ROLE_SUPER_ADMIN", "ROLE_MANAGER")) return;
        if (!hasRole("ROLE_WAREHOUSE_CONTROLLER")) {
            throw new BusinessException("Chỉ Thủ kho được ghi sổ chứng từ sửa chữa");
        }
        boolean assigned = userWarehouseRoleRepository.findByUserIdAndWarehouseId(currentUserId(), warehouseId)
                .stream().anyMatch(role -> Boolean.TRUE.equals(role.getIsActive()));
        if (!assigned) throw new BusinessException("Bạn không được phân quyền tại kho của chứng từ");
    }

    private void requireState(Repair repair, RepairStatus state) {
        if (!state.name().equals(repair.getRepairStatus())) {
            throw new BusinessException("Trạng thái lệnh không cho phép ghi sổ chứng từ này");
        }
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) throw new BusinessException("Không xác định được người dùng hiện tại");
        return userRepository.findByUsername(authentication.getName()).map(User::getId)
                .orElseThrow(() -> new BusinessException("Không xác định được người dùng hiện tại"));
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "system";
    }

    private void notifyAfterCommit(Long userId, String title, String message, Long repairId) {
        if (userId == null) return;
        Runnable send = () -> {
            try {
                notificationService.createNotification(null, userId, title, message,
                        "REPAIR", "REPAIR", repairId, "/repairs/" + repairId + "/edit");
            } catch (RuntimeException ignored) { }
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            send.run();
        } else {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { send.run(); }
            });
        }
    }

    private void recordRepairDebt(Repair repair) {
        if (repair.getCustomerPayAmount().compareTo(BigDecimal.ZERO) <= 0
                || partnerLedgerRepository.findTopByEntityTypeAndEntityIdOrderByIdDesc("REPAIR", repair.getId()).isPresent()) {
            return;
        }
        partnerLedgerService.recordLedger(repair.getPartnerId(), "REPAIR", repair.getId(), repair.getRepairCode(),
                repair.getCustomerPayAmount(), BigDecimal.ZERO,
                "Ghi nhận phải thu từ lệnh sửa chữa " + repair.getRepairCode());
    }

    private boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).anyMatch(role::equals);
    }

    private boolean hasAnyRole(String... roles) {
        for (String role : roles) if (hasRole(role)) return true;
        return false;
    }
}
