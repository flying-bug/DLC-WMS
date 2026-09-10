package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.CustomerRequest;
import com.duylongtech.backend.dto.response.CustomerResponse;
import com.duylongtech.backend.entity.Partner;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import com.duylongtech.backend.entity.PartnerLedger;
import com.duylongtech.backend.repository.PartnerLedgerRepository;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.Optional;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public abstract class CustomerMapper {

    @Autowired
    protected PartnerLedgerRepository partnerLedgerRepository;

    public abstract CustomerResponse toResponse(Partner customer);

    @AfterMapping
    protected void mapCurrentDebt(Partner partner, @MappingTarget CustomerResponse response) {
        BigDecimal currentDebt = BigDecimal.ZERO;
        Optional<PartnerLedger> latestLedger = partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(partner.getId());
        if (latestLedger.isPresent()) {
            currentDebt = latestLedger.get().getBalanceAfter();
        }
        response.setCurrentDebt(currentDebt);
    }

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "isCustomer", constant = "true")
    @Mapping(target = "isSupplier", constant = "false")
    public abstract Partner toEntity(CustomerRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "isCustomer", ignore = true)
    @Mapping(target = "isSupplier", ignore = true)
    public abstract void updateEntity(@MappingTarget Partner entity, CustomerRequest request);
}
