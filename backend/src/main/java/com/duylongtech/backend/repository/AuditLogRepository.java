package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:searchTerm IS NULL OR :searchTerm = '' OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(a.action) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(a.entityName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "(a.user IS NOT NULL AND LOWER(a.user.username) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) OR " +
           "(a.user IS NOT NULL AND LOWER(a.user.email) LIKE LOWER(CONCAT('%', :searchTerm, '%'))))")
    Page<AuditLog> searchLogs(@Param("searchTerm") String searchTerm, Pageable pageable);
}
