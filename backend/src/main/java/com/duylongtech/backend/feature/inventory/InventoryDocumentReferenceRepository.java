package com.duylongtech.backend.feature.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryDocumentReferenceRepository extends JpaRepository<InventoryDocumentReference, Long> {

    List<InventoryDocumentReference> findByInventoryDocumentId(Long inventoryDocumentId);

    // Reverse lookup: which document(s) were reissued from this one (e.g. after an unpost).
    List<InventoryDocumentReference> findByReferenceDocId(Long referenceDocId);
}
