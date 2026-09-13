package com.duylongtech.backend.feature.stocktake;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "STOCKTAKE_PARTICIPANTS")
@Getter
@NoArgsConstructor
public class StocktakeParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stocktake_id", nullable = false)
    private Stocktake stocktake;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(name = "title", length = 100)
    private String title;

    @Column(name = "represent", length = 100)
    private String represent;

    public void initParticipant(String fullName, String title, String represent) {
        this.fullName = fullName;
        this.title = title;
        this.represent = represent;
    }

    void setStocktake(Stocktake stocktake) {
        this.stocktake = stocktake;
    }
}
