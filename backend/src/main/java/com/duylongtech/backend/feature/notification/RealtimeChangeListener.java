package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.feature.inventory.InventoryDocument;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import org.hibernate.event.service.spi.EventListenerRegistry;
import org.hibernate.event.spi.EventType;
import org.hibernate.event.spi.PostDeleteEvent;
import org.hibernate.event.spi.PostDeleteEventListener;
import org.hibernate.event.spi.PostInsertEvent;
import org.hibernate.event.spi.PostInsertEventListener;
import org.hibernate.event.spi.PostUpdateEvent;
import org.hibernate.event.spi.PostUpdateEventListener;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.persister.entity.EntityPersister;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Bắt mọi thay đổi entity đã COMMIT thành công (requiresPostCommitHandling = true nên rollback không phát)
 * và chuyển thành tín hiệu topic cho {@link RealtimeChangePublisher}.
 * Ghi hàng loạt (@Modifying/native) không đi qua Hibernate nên phải gọi {@link RealtimeChangePublisher#publish} thủ công.
 */
@Component
@RequiredArgsConstructor
public class RealtimeChangeListener
        implements PostInsertEventListener, PostUpdateEventListener, PostDeleteEventListener {

    private static final Map<String, String> TOPIC_BY_ENTITY = Map.ofEntries(
            Map.entry("InventoryBalance", "INVENTORY_BALANCE"),
            Map.entry("StockReservation", "INVENTORY_BALANCE"),
            Map.entry("PurchaseOrder", "PURCHASE_ORDER"),
            Map.entry("PurchaseOrderLine", "PURCHASE_ORDER"),
            Map.entry("SalesOrder", "SALES_ORDER"),
            Map.entry("SalesOrderLine", "SALES_ORDER"),
            Map.entry("StockTransfer", "STOCK_TRANSFER"),
            Map.entry("StockTransferLine", "STOCK_TRANSFER"),
            Map.entry("Stocktake", "STOCKTAKE"),
            Map.entry("StocktakeLine", "STOCKTAKE"),
            Map.entry("StocktakeLineSerial", "STOCKTAKE"),
            Map.entry("StocktakeParticipant", "STOCKTAKE"),
            Map.entry("Repair", "REPAIR"),
            Map.entry("RepairLine", "REPAIR"),
            Map.entry("RepairFee", "REPAIR"),
            Map.entry("Warranty", "WARRANTY"),
            Map.entry("WarrantyLine", "WARRANTY"),
            Map.entry("AssemblyOrder", "ASSEMBLY_ORDER"),
            Map.entry("AssemblyOrderLine", "ASSEMBLY_ORDER"),
            Map.entry("AssemblyOrderSerial", "ASSEMBLY_ORDER"),
            Map.entry("AssemblyBom", "ASSEMBLY_BOM"),
            Map.entry("AssemblyBomLine", "ASSEMBLY_BOM"),
            Map.entry("Product", "PRODUCT"),
            Map.entry("ProductVariant", "PRODUCT"),
            Map.entry("ProductUnitConversion", "PRODUCT"),
            Map.entry("Partner", "PARTNER"),
            Map.entry("PartnerLedger", "PARTNER"),
            Map.entry("PaymentTransaction", "PAYMENT"),
            Map.entry("EInvoice", "E_INVOICE"),
            Map.entry("Warehouse", "WAREHOUSE"),
            Map.entry("UserWarehouseRole", "WAREHOUSE"),
            Map.entry("Brand", "BRAND"),
            Map.entry("ProductCategory", "CATEGORY"),
            Map.entry("Unit", "UNIT"),
            Map.entry("User", "USER"),
            Map.entry("RoleEntity", "USER"),
            Map.entry("PermissionEntity", "USER")
    );

    // Entity con của các topic này không có id của phiếu cha -> phát ids = null (tải lại mọi trang của topic).
    private static final java.util.Set<String> CHILD_ENTITIES = java.util.Set.of(
            "PurchaseOrderLine", "SalesOrderLine", "StockTransferLine", "StocktakeLine", "StocktakeLineSerial",
            "StocktakeParticipant", "RepairLine", "RepairFee", "WarrantyLine", "AssemblyOrderLine",
            "AssemblyOrderSerial", "AssemblyBomLine", "ProductUnitConversion", "PartnerLedger");

    private final EntityManagerFactory entityManagerFactory;
    private final RealtimeChangePublisher publisher;

    @PostConstruct
    void register() {
        EventListenerRegistry registry = entityManagerFactory.unwrap(SessionFactoryImplementor.class)
                .getServiceRegistry()
                .getService(EventListenerRegistry.class);
        // Nhóm POST_COMMIT_*: Hibernate chỉ gọi sau khi transaction commit thành công (POST_INSERT... gọi lúc flush, trước commit).
        registry.appendListeners(EventType.POST_COMMIT_INSERT, this);
        registry.appendListeners(EventType.POST_COMMIT_UPDATE, this);
        registry.appendListeners(EventType.POST_COMMIT_DELETE, this);
    }

    @Override
    public void onPostInsert(PostInsertEvent event) {
        handle(event.getEntity(), event.getId());
    }

    @Override
    public void onPostUpdate(PostUpdateEvent event) {
        handle(event.getEntity(), event.getId());
    }

    @Override
    public void onPostDelete(PostDeleteEvent event) {
        handle(event.getEntity(), event.getId());
    }

    @Override
    public boolean requiresPostCommitHandling(EntityPersister persister) {
        return true;
    }

    private void handle(Object entity, Object id) {
        // Dòng/tham chiếu của phiếu kho luôn đi kèm thay đổi ở phiếu (header) nên bỏ qua để đỡ nhiễu.
        if (entity instanceof InventoryDocument document) {
            String topic = "IN_PO".equals(document.getDocType()) ? "IMPORT_DOCUMENT" : "EXPORT_DOCUMENT";
            publisher.record(topic, id instanceof Long value ? value : null);
            return;
        }

        String name = entity.getClass().getSimpleName();
        String topic = TOPIC_BY_ENTITY.get(name);
        if (topic == null) {
            return;
        }
        boolean child = CHILD_ENTITIES.contains(name);
        publisher.record(topic, !child && id instanceof Long value ? value : null);
    }
}
