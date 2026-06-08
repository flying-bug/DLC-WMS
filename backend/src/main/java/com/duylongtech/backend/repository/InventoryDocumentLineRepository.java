package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDocumentLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryDocumentLineRepository extends JpaRepository<InventoryDocumentLine, Long> {
}
