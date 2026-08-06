package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    List<PaymentTransaction> findByPartnerIdOrderByCreatedAtDesc(Long partnerId);
}
