package com.duylongtech.backend.feature.partner;

import com.duylongtech.backend.feature.partner.SupplierRequest;
import com.duylongtech.backend.feature.partner.SupplierResponse;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerLedger;
import com.duylongtech.backend.feature.partner.PartnerLedgerRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.Optional;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public abstract class SupplierMapper {

    @Autowired
    protected PartnerLedgerRepository partnerLedgerRepository;

    public abstract SupplierResponse toResponse(Partner partner);

    @AfterMapping
    protected void mapCurrentDebt(Partner partner, @MappingTarget SupplierResponse response) {
        BigDecimal currentDebt = BigDecimal.ZERO;
        Optional<PartnerLedger> latestLedger = partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(partner.getId());
        if (latestLedger.isPresent()) {
            currentDebt = latestLedger.get().getBalanceAfter();
        }
        response.setCurrentDebt(currentDebt);
    }

}
