package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
