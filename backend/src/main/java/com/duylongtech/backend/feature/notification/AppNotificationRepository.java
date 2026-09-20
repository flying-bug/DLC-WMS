package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.feature.notification.AppNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

    @Query("SELECT n FROM AppNotification n WHERE :isAdmin = true OR n.userId = :userId OR (n.recipientRole IN :roles AND (n.warehouseId IS NULL OR n.warehouseId IN :warehouseIds)) ORDER BY n.createdAt DESC")
    List<AppNotification> findForUserAndRoles(@Param("userId") Long userId, @Param("roles") List<String> roles, @Param("isAdmin") boolean isAdmin, @Param("warehouseIds") List<Long> warehouseIds, Pageable pageable);

    @Query("SELECT COUNT(n) FROM AppNotification n WHERE (:isAdmin = true OR n.userId = :userId OR (n.recipientRole IN :roles AND (n.warehouseId IS NULL OR n.warehouseId IN :warehouseIds))) AND (n.isRead = false OR n.isRead IS NULL)")
    long countUnreadForUserAndRoles(@Param("userId") Long userId, @Param("roles") List<String> roles, @Param("isAdmin") boolean isAdmin, @Param("warehouseIds") List<Long> warehouseIds);

    @Modifying
    @Query("UPDATE AppNotification n SET n.isRead = true WHERE n.id = :id AND (:isAdmin = true OR n.userId = :userId OR (n.recipientRole IN :roles AND (n.warehouseId IS NULL OR n.warehouseId IN :warehouseIds)))")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId, @Param("roles") List<String> roles, @Param("isAdmin") boolean isAdmin, @Param("warehouseIds") List<Long> warehouseIds);

    @Modifying
    @Query("UPDATE AppNotification n SET n.isRead = true WHERE :isAdmin = true OR n.userId = :userId OR (n.recipientRole IN :roles AND (n.warehouseId IS NULL OR n.warehouseId IN :warehouseIds))")
    void markAllAsRead(@Param("userId") Long userId, @Param("roles") List<String> roles, @Param("isAdmin") boolean isAdmin, @Param("warehouseIds") List<Long> warehouseIds);

    @Query("SELECT COUNT(n) > 0 FROM AppNotification n WHERE n.referenceType = :referenceType AND n.referenceId = :referenceId AND n.recipientRole = :recipientRole AND n.createdAt >= :after")
    boolean existsRecentNotification(
        @Param("referenceType") String referenceType,
        @Param("referenceId") Long referenceId,
        @Param("recipientRole") String recipientRole,
        @Param("after") java.time.LocalDateTime after
    );
}
