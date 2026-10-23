package com.fsa.roomdesk.dto;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

public record PageResponse<T>(List<T> content, PageMetadata page) {

    public record PageMetadata(int size, int number, long totalElements, int totalPages) {
    }

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                new PageMetadata(page.getSize(), page.getNumber(), page.getTotalElements(), page.getTotalPages()));
    }
}
