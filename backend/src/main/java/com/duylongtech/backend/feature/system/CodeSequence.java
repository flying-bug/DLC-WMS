package com.duylongtech.backend.feature.system;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Backs the atomic counter used by {@link CodeGeneratorService}. One row per
 * (table, column, prefix) combination - see sequenceKey construction there.
 */
@Entity
@Table(name = "CODE_SEQUENCES")
@Getter
@NoArgsConstructor
public class CodeSequence {

    @Id
    @Column(name = "sequence_key", length = 150)
    private String sequenceKey;

    @Column(name = "next_value", nullable = false)
    private Long nextValue;

    public void initSequence(String sequenceKey, long nextValue) {
        this.sequenceKey = sequenceKey;
        this.nextValue = nextValue;
    }

    public void increment() {
        this.nextValue = this.nextValue + 1;
    }
}
