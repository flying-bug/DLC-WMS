package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.PaymentVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentVoucherRepository extends JpaRepository<PaymentVoucher, Long> {
    List<PaymentVoucher> findByPartnerIdOrderByCreatedAtDesc(Long partnerId);
}
