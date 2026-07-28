package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "STOCKTAKE_LINES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stocktake_id", nullable = false)
    private Stocktake stocktake;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "book_qty", precision = 15, scale = 4)
    private BigDecimal bookQty;

    @Column(name = "count_qty", precision = 15, scale = 4)
    private BigDecimal countQty;

    @Column(name = "diff_qty", precision = 15, scale = 4)
    private BigDecimal diffQty;

    @Column(name = "good_qty", precision = 15, scale = 4)
    private BigDecimal goodQty;

    @Column(name = "bad_qty", precision = 15, scale = 4)
    private BigDecimal badQty;

    @Column(name = "lost_qty", precision = 15, scale = 4)
    private BigDecimal lostQty;

    @Column(name = "action", length = 100)
    private String action;
}
