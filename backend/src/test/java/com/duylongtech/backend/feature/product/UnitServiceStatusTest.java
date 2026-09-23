package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UnitServiceStatusTest {

    @Test
    void updateUnitPersistsInactiveStatus() {
        Unit unit = unit("Cái");
        UnitService service = service(unit);

        service.updateUnit(1L, request("Cái", "INACTIVE"));

        assertEquals("INACTIVE", unit.getStatus());
    }

    @Test
    void updateUnitNormalizesLegacyApprovedStatusToActive() {
        Unit unit = unit("Bộ");
        unit.changeStatus(com.duylongtech.backend.enums.EntityStatus.INACTIVE);
        UnitService service = service(unit);

        service.updateUnit(1L, request("Bộ", "APPROVED"));

        assertEquals("ACTIVE", unit.getStatus());
    }

    @Test
    void updateUnitRejectsUnsupportedStatus() {
        Unit unit = unit("Chiếc");
        UnitService service = service(unit);

        assertThrows(BusinessException.class,
                () -> service.updateUnit(1L, request("Chiếc", "UNKNOWN")));
    }

    private static Unit unit(String name) {
        Unit unit = new Unit();
        unit.initUnit(name, null, null);
        return unit;
    }

    private static UnitRequest request(String name, String status) {
        return UnitRequest.builder()
                .name(name)
                .status(status)
                .build();
    }

    private static UnitService service(Unit unit) {
        UnitRepository repository = mock(UnitRepository.class);
        UnitMapper mapper = mock(UnitMapper.class);
        when(repository.findById(1L)).thenReturn(Optional.of(unit));
        when(repository.save(any(Unit.class))).thenAnswer(invocation -> invocation.getArgument(0));
        return new UnitService(repository, mapper);
    }
}
