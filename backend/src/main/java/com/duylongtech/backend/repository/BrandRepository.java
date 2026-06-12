package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {
    Optional<Brand> findByCode(String code);
}
