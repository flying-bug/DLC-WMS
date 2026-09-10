package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.SupplierRequest;
import com.duylongtech.backend.dto.response.SupplierResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.PartnerLedger;
import com.duylongtech.backend.repository.PartnerLedgerRepository;
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
    protected void mapCurrentDebt(Partner partner, @MappingTarget SupplierResponse.SupplierResponseBuilder responseBuilder) {
        BigDecimal currentDebt = BigDecimal.ZERO;
        Optional<PartnerLedger> latestLedger = partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(partner.getId());
        if (latestLedger.isPresent()) {
            currentDebt = latestLedger.get().getBalanceAfter();
        }
        responseBuilder.currentDebt(currentDebt);
    }

    public abstract Partner toEntity(SupplierRequest request);

    public abstract void updateEntity(@MappingTarget Partner partner, SupplierRequest request);
}
