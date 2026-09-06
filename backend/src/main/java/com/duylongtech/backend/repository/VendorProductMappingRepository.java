package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.VendorProductMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendorProductMappingRepository extends JpaRepository<VendorProductMapping, Long> {

    /**
     * Tìm mapping chính xác theo partner + tên hàng (normalized).
     */
    Optional<VendorProductMapping> findByPartnerIdAndVendorProductName(Long partnerId, String vendorProductName);

    /**
     * Tìm tất cả mapping của 1 nhà cung cấp (dùng cho fuzzy fallback).
     */
    List<VendorProductMapping> findByPartnerId(Long partnerId);
}
