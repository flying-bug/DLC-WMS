package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.WarehouseRequest;
import com.duylongtech.backend.dto.response.WarehouseDetailResponse;
import com.duylongtech.backend.dto.response.WarehouseResponse;
import com.duylongtech.backend.dto.response.SerialTreeResponse;
import com.duylongtech.backend.entity.DeviceComponentSerial;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.UserWarehouseRole;
import com.duylongtech.backend.entity.Warehouse;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.UserWarehouseRoleRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

public interface WarehouseService {
    WarehouseResponse createWarehouse(WarehouseRequest request, Long currentUserId);
    Page<WarehouseResponse> getWarehouses(String search, String status, Pageable pageable);
    List<WarehouseResponse> getMyWarehouses(Long userId);
    WarehouseDetailResponse getWarehouseDetail(Long id);
    WarehouseResponse updateWarehouse(Long id, WarehouseRequest request, Long currentUserId);
    boolean deleteWarehouse(Long id);
    byte[] exportWarehousesToExcel(String search, String status, String exporterName);
    List<com.duylongtech.backend.dto.response.WarehouseStockAiRow> getWarehouseInventory(Long warehouseId);
    List<String> getAvailableSerials(Long warehouseId, Long variantId);
    List<SerialTreeResponse> getSerialTree(Long warehouseId, Long variantId);
    boolean checkSerialExists(String serialNumber);

}
