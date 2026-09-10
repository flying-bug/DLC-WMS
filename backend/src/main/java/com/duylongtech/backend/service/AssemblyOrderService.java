package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.AssemblyBomLineRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderLineRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderSerialRequest;
import com.duylongtech.backend.dto.request.AssemblyExecutionRequest;
import com.duylongtech.backend.dto.response.AssemblyBomLineResponse;
import com.duylongtech.backend.dto.response.AssemblyBomResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderLineResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderSerialResponse;
import com.duylongtech.backend.dto.response.SerialTreeResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.AssemblyOrderSerialRepository;
import com.duylongtech.backend.repository.DeviceComponentSerialRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
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
    void generateInventoryDocument(Long id, com.duylongtech.backend.dto.request.GenerateInventoryDocumentRequest request, String actor);
    List<AssemblyOrderSerialResponse> getSerials(Long orderId);
    SerialTreeResponse getSerialTreeByTarget(Long serialNumberId, Long targetVariantId, String targetSerial);
    void saveSerials(Long orderId, List<AssemblyOrderSerialRequest> requests);
    void executeAssemblyOrder(Long id, AssemblyExecutionRequest request, Long userId);
}
