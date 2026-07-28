package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "STOCKTAKE_PARTICIPANTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
