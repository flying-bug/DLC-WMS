package com.duylongtech.backend.feature.partner;

import com.duylongtech.backend.feature.partner.PartnerLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartnerLedgerRepository extends JpaRepository<PartnerLedger, Long> {

    Optional<PartnerLedger> findTopByPartnerIdOrderByIdDesc(Long partnerId);

    Optional<PartnerLedger> findTopByPartnerIdAndAccountTypeOrderByIdDesc(Long partnerId, String accountType);

    List<PartnerLedger> findByPartnerIdOrderByIdDesc(Long partnerId);

    Optional<PartnerLedger> findTopByEntityTypeAndEntityIdOrderByIdDesc(String entityType, Long entityId);
}
