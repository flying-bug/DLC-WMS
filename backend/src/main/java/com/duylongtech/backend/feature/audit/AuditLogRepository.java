package com.duylongtech.backend.feature.audit;

import com.duylongtech.backend.feature.audit.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a LEFT JOIN a.user u WHERE " +
           "(:searchTerm IS NULL OR :searchTerm = '' OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', TRIM(:searchTerm), '%')) OR " +
           "LOWER(a.action) LIKE LOWER(CONCAT('%', TRIM(:searchTerm), '%')) OR " +
           "LOWER(a.entityName) LIKE LOWER(CONCAT('%', TRIM(:searchTerm), '%')) OR " +
           "LOWER(a.ipAddress) LIKE LOWER(CONCAT('%', TRIM(:searchTerm), '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', TRIM(:searchTerm), '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', TRIM(:searchTerm), '%'))) AND " +
           "(:module IS NULL OR :module = '' OR a.entityName = :module) AND " +
           "(:fromDate IS NULL OR a.createdAt >= :fromDate) AND " +
           "(:toDate IS NULL OR a.createdAt <= :toDate)")
    Page<AuditLog> searchLogs(
            @Param("searchTerm") String searchTerm,
            @Param("module") String module,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable
    );

    Page<AuditLog> findByEntityNameAndEntityIdOrderByCreatedAtDesc(String entityName, Long entityId, Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM AuditLog a WHERE a.createdAt < :cutoffDate")
    int deleteLogsOlderThan(@Param("cutoffDate") Instant cutoffDate);
}
