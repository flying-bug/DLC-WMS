package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.PaymentReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentReceiptRepository extends JpaRepository<PaymentReceipt, Long> {
    List<PaymentReceipt> findByPartnerIdOrderByCreatedAtDesc(Long partnerId);
}
