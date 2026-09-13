package com.duylongtech.backend.feature.payment;

import com.duylongtech.backend.feature.payment.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    List<PaymentTransaction> findByPartnerIdOrderByCreatedAtDesc(Long partnerId);
    List<PaymentTransaction> findByTypeOrderByCreatedAtDesc(String type);
    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
}


