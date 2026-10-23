package com.fsa.roomdesk.repository;

import com.fsa.roomdesk.domain.Room;
import org.springframework.data.jpa.domain.Specification;

public final class RoomSpecifications {

    private RoomSpecifications() {
    }

    public static Specification<Room> filter(Integer minCapacity, Boolean active) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (minCapacity != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("capacity"), minCapacity));
            }
            if (active != null) {
                predicate = cb.and(predicate, cb.equal(root.get("active"), active));
            }
            return predicate;
        };
    }
}
