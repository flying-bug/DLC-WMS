package com.duylongtech.backend.feature.stocktake;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "STOCKTAKE_LINES")
@Getter
@Setter
@NoArgsConstructor
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
    @Setter(AccessLevel.NONE)
    private BigDecimal bookQty;

    @Column(name = "count_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal countQty;

    @Column(name = "diff_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal diffQty;

    @Column(name = "good_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal goodQty;

    @Column(name = "bad_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal badQty;

    @Column(name = "lost_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal lostQty;

    @Column(name = "action", length = 100)
    private String action;

    @OneToMany(mappedBy = "stocktakeLine", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StocktakeLineSerial> serials = new ArrayList<>();

    public void initLine(Long variantId, BigDecimal bookQty, BigDecimal countQty, BigDecimal goodQty, BigDecimal badQty, BigDecimal lostQty, String action) {
        this.variantId = variantId;
        this.bookQty = bookQty != null ? bookQty : BigDecimal.ZERO;
        this.countQty = countQty;
        this.goodQty = goodQty;
        this.badQty = badQty;
        this.lostQty = lostQty;
        this.action = action;
        calculateDiff();
    }

    public void addSerial(StocktakeLineSerial serial) {
        serial.setStocktakeLine(this);
        this.serials.add(serial);
    }

    public void updateCount(BigDecimal countQty, BigDecimal goodQty, BigDecimal badQty, BigDecimal lostQty, String action) {
        this.countQty = countQty;
        this.goodQty = goodQty;
        this.badQty = badQty;
        this.lostQty = lostQty;
        this.action = action;
        calculateDiff();
    }
    
    private void calculateDiff() {
        if (this.countQty != null) {
            this.diffQty = this.countQty.subtract(this.bookQty != null ? this.bookQty : BigDecimal.ZERO);
        } else {
            this.diffQty = null;
        }
    }
}

