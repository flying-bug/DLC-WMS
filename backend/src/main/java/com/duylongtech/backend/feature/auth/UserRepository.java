package com.duylongtech.backend.feature.auth;

import com.duylongtech.backend.feature.auth.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByEmailAndIdNot(String email, Long id);
    boolean existsByPhoneAndIdNot(String phone, Long id);

    /**
     * Lấy User kèm danh sách Roles (JOIN FETCH) để phục vụ API /users/me.
     * Sử dụng @EntityGraph để đảm bảo roles luôn được load trong 1 query duy nhất,
     * tránh N+1 problem.
     */
    @EntityGraph(attributePaths = {"roles"})
    Optional<User> findWithRolesById(Long id);

    /**
     * Lấy toàn bộ user đang giữ 1 role - dùng để force-logout khi quyền mặc định của
     * role đó bị đổi (đăng nhập lại để nhận đúng authorities mới).
     */
    List<User> findByRoles_Id(Long roleId);

    /** Đặt phiên đăng nhập hiện hành; null = thu hồi mọi phiên (token đang dùng bị từ chối). */
    @Modifying
    @Transactional
    @Query(value = "UPDATE users SET current_session_id = :sessionId WHERE id = :userId", nativeQuery = true)
    int updateCurrentSessionId(@Param("userId") Long userId, @Param("sessionId") String sessionId);

    /** [userId, currentSessionId] của các user đang giữ kết nối realtime - dùng để đóng kết nối của phiên cũ. */
    @Query("SELECT u.id, u.currentSessionId FROM User u WHERE u.id IN :userIds")
    List<Object[]> findCurrentSessionIds(@Param("userIds") java.util.Collection<Long> userIds);
}
