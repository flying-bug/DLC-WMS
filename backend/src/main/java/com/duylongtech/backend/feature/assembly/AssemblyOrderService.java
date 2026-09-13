package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.feature.assembly.AssemblyBomLineRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.assembly.AssemblyBomRequest;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRequest;
import com.duylongtech.backend.feature.assembly.AssemblyOrderLineRequest;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRequest;
import com.duylongtech.backend.feature.assembly.AssemblyExecutionRequest;
import com.duylongtech.backend.feature.assembly.AssemblyBomLineResponse;
import com.duylongtech.backend.feature.assembly.AssemblyBomResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderLineResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialResponse;
import com.duylongtech.backend.feature.report.SerialTreeResponse;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import com.duylongtech.backend.feature.assembly.AssemblyBomLineRequest;
import com.duylongtech.backend.feature.assembly.AssemblyBomLineResponse;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyBomRequest;
import com.duylongtech.backend.feature.assembly.AssemblyBomResponse;
import com.duylongtech.backend.feature.assembly.AssemblyExecutionRequest;
import com.duylongtech.backend.feature.assembly.AssemblyOrderLineRequest;
import com.duylongtech.backend.feature.assembly.AssemblyOrderLineResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRequest;
import com.duylongtech.backend.feature.assembly.AssemblyOrderResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRequest;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderService;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.inventory.GenerateInventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.report.SerialTreeResponse;

public interface AssemblyOrderService {
    List<AssemblyBomResponse> getBoms(String status, Long productId);
    AssemblyBomResponse getBomById(Long id);
    AssemblyBomResponse createBom(AssemblyBomRequest request);
    AssemblyBomResponse updateBom(Long id, AssemblyBomRequest request);
    List<AssemblyOrderResponse> getAssemblyOrders(String keyword, String orderType, String status,
            Long warehouseId, LocalDate fromDate, LocalDate toDate);
    AssemblyOrderResponse getAssemblyOrderById(Long id);
    AssemblyOrderResponse createAssemblyOrder(AssemblyOrderRequest request);
    AssemblyOrderResponse createDisassemblyOrder(AssemblyOrderRequest request);
    AssemblyOrderResponse updateAssemblyOrder(Long id, AssemblyOrderRequest request);
    AssemblyOrderResponse updateOrderStatus(Long id, String newStatus);
    AssemblyOrderResponse updateNote(Long id, AssemblyOrderRequest request);
    void generateInventoryDocument(Long id, com.duylongtech.backend.feature.inventory.GenerateInventoryDocumentRequest request, String actor);
    List<AssemblyOrderSerialResponse> getSerials(Long orderId);
    SerialTreeResponse getSerialTreeByTarget(Long serialNumberId, Long targetVariantId, String targetSerial);
    void saveSerials(Long orderId, List<AssemblyOrderSerialRequest> requests);
    void executeAssemblyOrder(Long id, AssemblyExecutionRequest request, Long userId);

    @Transactional
    AssemblyBomResponse submitBom(Long id, Long actorId);
    @Transactional
    AssemblyBomResponse approveBom(Long id, Long actorId);
    @Transactional
    AssemblyBomResponse rejectBom(Long id, Long actorId, String reason);
    @Transactional
    AssemblyOrderResponse submitOrder(Long id, Long actorId);
    @Transactional
    AssemblyOrderResponse approveOrder(Long id, Long actorId);
    @Transactional
    AssemblyOrderResponse rejectOrder(Long id, Long actorId, String reason);
    @Transactional
    AssemblyOrderResponse requestCancel(Long id, Long actorId, String reason);
    @Transactional
    AssemblyOrderResponse confirmCancel(Long id, Long actorId);
    @Transactional(readOnly = true)
    List<com.duylongtech.backend.feature.inventory.InventoryDocumentResponse> getOrderDocuments(Long id);
}
