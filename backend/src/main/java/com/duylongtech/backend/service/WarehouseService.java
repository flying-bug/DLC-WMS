package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.WarehouseRequest;
import com.duylongtech.backend.dto.response.WarehouseDetailResponse;
import com.duylongtech.backend.dto.response.WarehouseResponse;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final UserWarehouseRoleRepository userWarehouseRoleRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final UserRepository userRepository;
    private final CodeGeneratorService codeGeneratorService;

    // ──────────────────────────────────────────────────────────
    // US1: Tạo mới kho
    // ──────────────────────────────────────────────────────────

    @Transactional
    public WarehouseResponse createWarehouse(WarehouseRequest request, Long currentUserId) {
        if (request.getCode() == null || request.getCode().isBlank()) {
            request.setCode(codeGeneratorService.generateCode("warehouses", "code", "KHO", 3));
        }
        // Kiểm tra mã kho trùng (case-insensitive)
        if (warehouseRepository.existsByCodeIgnoreCase(request.getCode())) {
            throw new BusinessException(SystemMessage.WH_CODE_EXISTS);
        }

        com.duylongtech.backend.entity.User creator = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));

        Warehouse warehouse = Warehouse.builder()
                .code(request.getCode())
                .name(request.getName())
                .address(request.getAddress())
                .type("STANDARD") // Cố định theo spec
                .status("APPROVED")
                .creator(creator)
                .build();

        Warehouse saved = warehouseRepository.save(warehouse);

        Long roleId = null;
        if (creator.getRoles() != null && !creator.getRoles().isEmpty()) {
            roleId = creator.getRoles().iterator().next().getId();
        } else {
            roleId = 1L;
        }

        // Ghi nhận người tạo vào USER_WAREHOUSE_ROLES
        UserWarehouseRole ownerRole = UserWarehouseRole.builder()
                .userId(currentUserId)
                .warehouseId(saved.getId())
                .roleId(roleId)
                .isActive(true)
                .build();
        userWarehouseRoleRepository.save(ownerRole);

        return mapToResponse(saved);
    }

    // ──────────────────────────────────────────────────────────
    // US2: Xem danh sách kho
    // ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<WarehouseResponse> getWarehouses(String code, String name, String address, String status, Pageable pageable) {
        Page<Warehouse> page = warehouseRepository.filterWarehouses(code, name, address, status, pageable);
        return page.map(this::mapToResponse);
    }

    // ──────────────────────────────────────────────────────────
    // US2: Xem chi tiết kho kèm metrics
    // ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public WarehouseDetailResponse getWarehouseDetail(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.WH_NOT_FOUND));

        // Lấy metrics từ INVENTORY_BALANCES
        Long totalSkus = inventoryBalanceRepository.countDistinctVariantsByWarehouseId(id);
        java.math.BigDecimal totalQtyDecimal = inventoryBalanceRepository.sumQuantityOnHandByWarehouseId(id);
        Long totalQuantity = totalQtyDecimal != null ? totalQtyDecimal.longValue() : 0L;
        java.math.BigDecimal totalValue = inventoryBalanceRepository.sumTotalValueByWarehouseId(id);

        return WarehouseDetailResponse.builder()
                .id(warehouse.getId())
                .code(warehouse.getCode())
                .name(warehouse.getName())
                .address(warehouse.getAddress())
                .type(warehouse.getType())
                .status(warehouse.getStatus())
                .creatorId(warehouse.getCreator() != null ? warehouse.getCreator().getId() : null)
                .creatorName(warehouse.getCreator() != null ? warehouse.getCreator().getFullName() : null)
                .updaterId(warehouse.getUpdater() != null ? warehouse.getUpdater().getId() : null)
                .updaterName(warehouse.getUpdater() != null ? warehouse.getUpdater().getFullName() : null)
                .version(warehouse.getVersion())
                .totalSkus(totalSkus != null ? totalSkus : 0L)
                .totalQuantity(totalQuantity)
                .totalValue(totalValue != null ? totalValue : java.math.BigDecimal.ZERO)
                .createdAt(warehouse.getCreatedAt())
                .updatedAt(warehouse.getUpdatedAt())
                .build();
    }

    // ──────────────────────────────────────────────────────────
    // US3: Cập nhật thông tin kho
    // ──────────────────────────────────────────────────────────

    @Transactional
    public WarehouseResponse updateWarehouse(Long id, WarehouseRequest request, Long currentUserId) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.WH_NOT_FOUND));

        if (request.getVersion() != null && !request.getVersion().equals(warehouse.getVersion())) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(Warehouse.class, id);
        }

        // Chỉ cho phép sửa name, address, status. Code và Type là read-only.
        warehouse.setName(request.getName());
        warehouse.setAddress(request.getAddress());
        if (request.getStatus() != null) {
            warehouse.setStatus(request.getStatus());
        }

        // Set updater
        if (currentUserId != null) {
            warehouse.setUpdater(userRepository.findById(currentUserId).orElse(null));
        }

        Warehouse updated = warehouseRepository.save(warehouse);
        return mapToResponse(updated);
    }

    // ──────────────────────────────────────────────────────────
    // US4: Soft Delete
    // ──────────────────────────────────────────────────────────

    @Transactional
    public boolean deleteWarehouse(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.WH_NOT_FOUND));

        // Kiểm tra nếu kho có tồn kho (INVENTORY_BALANCES) hoặc từng có giao dịch (INVENTORY_DOCUMENTS)
        boolean hasInventory = inventoryBalanceRepository.existsByWarehouseId(id);
        boolean hasTransactions = inventoryDocumentRepository.existsByAnyWarehouseId(id);

        if (hasInventory || hasTransactions) {
            // Tự động chuyển INACTIVE thay vì xóa
            warehouse.setStatus("INACTIVE");
            warehouseRepository.save(warehouse);
            return false; // Soft deleted
        }

        // Xóa các UserWarehouseRole (bảng phân quyền)
        List<UserWarehouseRole> roles = userWarehouseRoleRepository.findByWarehouseId(id);
        if (!roles.isEmpty()) {
            userWarehouseRoleRepository.deleteAll(roles);
        }

        try {
            // Kho trống và chưa từng có giao dịch → hard delete
            warehouseRepository.delete(warehouse);
            warehouseRepository.flush(); // Bắt buộc flush để trigger exception ngay lập tức
            return true; // Hard deleted
        } catch (DataIntegrityViolationException e) {
            // Vẫn còn dữ liệu liên quan khác (lịch sử tồn kho, cost layers...) -> Soft delete
            warehouse.setStatus("INACTIVE");
            warehouseRepository.save(warehouse);
            return false; // Soft deleted
        }
    }

    // ──────────────────────────────────────────────────────────
    // Mapper
    // ──────────────────────────────────────────────────────────

    private WarehouseResponse mapToResponse(Warehouse warehouse) {
        return WarehouseResponse.builder()
                .id(warehouse.getId())
                .code(warehouse.getCode())
                .name(warehouse.getName())
                .address(warehouse.getAddress())
                .type(warehouse.getType())
                .status(warehouse.getStatus())
                .creatorId(warehouse.getCreator() != null ? warehouse.getCreator().getId() : null)
                .creatorName(warehouse.getCreator() != null ? warehouse.getCreator().getFullName() : null)
                .updaterId(warehouse.getUpdater() != null ? warehouse.getUpdater().getId() : null)
                .updaterName(warehouse.getUpdater() != null ? warehouse.getUpdater().getFullName() : null)
                .version(warehouse.getVersion())
                .createdAt(warehouse.getCreatedAt())
                .updatedAt(warehouse.getUpdatedAt())
                .build();
    }
    // ──────────────────────────────────────────────────────────
    // Xuất Excel
    // ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] exportWarehousesToExcel(String code, String name, String address, String status, String exporterName) {
        List<Warehouse> warehouses = warehouseRepository.filterWarehouses(code, name, address, status, Pageable.unpaged()).getContent();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Danh Sách Kho");

            // Meta-data
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("BÁO CÁO DANH SÁCH KHO HÀNG");
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            Row exporterRow = sheet.createRow(1);
            exporterRow.createCell(0).setCellValue("Người xuất:");
            exporterRow.createCell(1).setCellValue(exporterName);

            Row timeRow = sheet.createRow(2);
            timeRow.createCell(0).setCellValue("Thời gian xuất:");
            timeRow.createCell(1).setCellValue(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));

            // Freeze Panes (Header is at row 4)
            sheet.createFreezePane(0, 5);

            // Header (Row 4)
            Row headerRow = sheet.createRow(4);
            String[] columns = {"STT", "Mã kho", "Tên kho", "Địa chỉ", "Loại kho", "Người tạo", "Người cập nhật", "Trạng thái", "Ngày tạo", "Ngày cập nhật"};
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data
            int rowIdx = 5;
            int stt = 1;
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
            for (Warehouse wh : warehouses) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(stt++);
                row.createCell(1).setCellValue(wh.getCode());
                row.createCell(2).setCellValue(wh.getName());
                row.createCell(3).setCellValue(wh.getAddress() != null ? wh.getAddress() : "");
                String typeStr = "";
                if ("STANDARD".equals(wh.getType())) typeStr = "Kho tiêu chuẩn";
                else if (wh.getType() != null) typeStr = wh.getType();
                row.createCell(4).setCellValue(typeStr);

                row.createCell(5).setCellValue(wh.getCreator() != null ? wh.getCreator().getFullName() : "");
                row.createCell(6).setCellValue(wh.getUpdater() != null ? wh.getUpdater().getFullName() : "");
                
                String statusStr = "Khác";
                if ("APPROVED".equals(wh.getStatus())) statusStr = "Đang hoạt động";
                else if ("INACTIVE".equals(wh.getStatus())) statusStr = "Ngừng hoạt động";
                else if ("PENDING".equals(wh.getStatus())) statusStr = "Chờ duyệt";
                row.createCell(7).setCellValue(statusStr);

                row.createCell(8).setCellValue(wh.getCreatedAt() != null ? dtf.format(wh.getCreatedAt()) : "");
                row.createCell(9).setCellValue(wh.getUpdatedAt() != null ? dtf.format(wh.getUpdatedAt()) : "");
            }

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BusinessException(SystemMessage.INTERNAL_ERROR);
        }
    }

    @Transactional(readOnly = true)
    public List<com.duylongtech.backend.dto.response.WarehouseStockAiRow> getWarehouseInventory(Long warehouseId) {
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new BusinessException(SystemMessage.WH_NOT_FOUND);
        }
        return inventoryBalanceRepository.findStockRowsForAiByWarehouseId(warehouseId);
    }
}
