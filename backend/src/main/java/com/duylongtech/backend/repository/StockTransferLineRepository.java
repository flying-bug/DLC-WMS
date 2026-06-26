package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.StockTransferLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockTransferLineRepository extends JpaRepository<StockTransferLine, Long> {
}
