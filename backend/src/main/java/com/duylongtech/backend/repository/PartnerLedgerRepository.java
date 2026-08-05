package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.PartnerLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerLedgerRepository extends JpaRepository<PartnerLedger, Long> {

    Optional<PartnerLedger> findTopByPartnerIdOrderByIdDesc(Long partnerId);

    List<PartnerLedger> findByPartnerIdOrderByIdDesc(Long partnerId);
}
