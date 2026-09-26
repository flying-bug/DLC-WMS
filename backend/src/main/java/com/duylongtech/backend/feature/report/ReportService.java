package com.duylongtech.backend.feature.report;

import com.duylongtech.backend.feature.report.ReportRepository;
import com.duylongtech.backend.feature.product.ProductService;
import com.duylongtech.backend.feature.report.ReportService;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final ProductService productService;
    private final com.duylongtech.backend.feature.sales_order.SalesOrderRepository salesOrderRepository;
    private final WarehouseAccessGuard warehouseAccessGuard;

    /**
     * Các kho được đưa vào báo cáo: null = mọi kho (Manager/Kế toán), ngược lại chỉ các kho người dùng được
     * phân công. Chọn một kho ngoài phạm vi thì báo lỗi thay vì trả về rỗng để người dùng biết lý do.
     */
    private List<Long> resolveWarehouseScope(Long warehouseId) {
        List<Long> allowedWarehouseIds = warehouseAccessGuard.resolveAllowedWarehouseIds();
        if (warehouseId == null) {
            return allowedWarehouseIds;
        }
        if (allowedWarehouseIds != null && !allowedWarehouseIds.contains(warehouseId)) {
            throw new BusinessException("Bạn không có quyền xem báo cáo của kho này");
        }
        return List.of(warehouseId);
    }

    /**
     * Kỳ báo cáo không có số liệu tương lai: ngày kết thúc sau hiện tại được tính tới hiện tại (tồn cuối kỳ = tồn
     * thực tế), ngày bắt đầu ở tương lai hoặc sau ngày kết thúc thì báo lỗi thay vì trả về kỳ rỗng.
     */
    static LocalDateTime capPeriodEnd(LocalDateTime startDate, LocalDateTime endDate) {
        LocalDateTime now = LocalDateTime.now();
        if (startDate != null && startDate.isAfter(now)) {
            throw new BusinessException("Ngày bắt đầu kỳ báo cáo không được ở tương lai");
        }
        LocalDateTime cappedEnd = endDate != null && endDate.isAfter(now) ? now : endDate;
        if (startDate != null && cappedEnd != null && startDate.isAfter(cappedEnd)) {
            throw new BusinessException("Ngày bắt đầu không được sau ngày kết thúc");
        }
        return cappedEnd;
    }

    public List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, Long warehouseId) {
        return reportRepository.getInventoryBalanceReport(search, resolveWarehouseScope(warehouseId));
    }
    public List<StockLedgerReportResponse> getStockLedgerReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Stock Ledger Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        return reportRepository.getStockLedgerReport(resolveWarehouseScope(warehouseId), startDate,
                capPeriodEnd(startDate, endDate), search);
    }
    public List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search, String status) {
        log.info("Fetching Stock Transfer Report. warehouseId={}, startDate={}, endDate={}, search={}, status={}", warehouseId, startDate, endDate, search, status);
        LocalDateTime cappedEnd = capPeriodEnd(startDate != null ? startDate.atStartOfDay() : null,
                endDate != null ? endDate.atTime(23, 59, 59) : null);
        return reportRepository.getStockTransferReport(resolveWarehouseScope(warehouseId), startDate,
                cappedEnd != null ? cappedEnd.toLocalDate() : null, search, status);
    }
    public List<DebtReportResponse> getDebtReport(LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType) {
        log.info("Fetching Debt Report. startDate={}, endDate={}, search={}, partnerType={}", startDate, endDate, search, partnerType);
        return reportRepository.getDebtReport(startDate, capPeriodEnd(startDate, endDate), search, partnerType);
    }
    public List<InventorySummaryReportResponse> getInventorySummaryReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Inventory Summary Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        return reportRepository.getInventorySummaryReport(resolveWarehouseScope(warehouseId), startDate,
                capPeriodEnd(startDate, endDate), search);
    }
    /**
     * Màn tổng quan chứa dòng tiền, công nợ và giá trị tồn toàn công ty. Frontend (workspaceScope.js) đã chặn Thủ kho
     * / Thủ quỹ khỏi màn này nhưng họ vẫn có report_summary:view nên phải chặn cả ở API. Vai trò có phạm vi rộng
     * (Quản lý, Kế toán, Super admin) luôn được xem kể cả khi kiêm vai trò Thủ kho / Thủ quỹ.
     */
    private static void ensureCanViewDashboard() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return;
        }
        java.util.Set<String> authorities = auth.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());
        boolean broadRole = authorities.contains("ROLE_SUPER_ADMIN") || authorities.contains("ROLE_MANAGER")
                || authorities.contains("ROLE_ACCOUNTANT");
        boolean scopedRole = authorities.contains("ROLE_WAREHOUSE_CONTROLLER")
                || authorities.contains("ROLE_CASHIER_CONTROLLER");
        if (scopedRole && !broadRole) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Màn tổng quan không thuộc phạm vi làm việc của Thủ kho / Thủ quỹ");
        }
    }

    public DashboardResponse getDashboardMetrics(String inventoryFlowRange, String categoryScope, String financeRange) {
        ensureCanViewDashboard();
        log.info("Fetching Dashboard Metrics. inventoryFlowRange={}, categoryScope={}, financeRange={}", inventoryFlowRange, categoryScope, financeRange);
        DashboardResponse dashboard = reportRepository.getDashboardMetrics(inventoryFlowRange, categoryScope, financeRange);
        var stockAlerts = productService.getStockAlertSummary();
        dashboard.setLowStockItemsCount(stockAlerts.getLowStockCount());
        dashboard.setOutOfStockItemsCount(stockAlerts.getOutOfStockCount());
        return dashboard;
    }
    public List<SalesProfitReportResponse> getSalesProfitReport(LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Sales Profit Report. startDate={}, endDate={}, search={}", startDate, endDate, search);
        
        LocalDateTime cappedEnd = capPeriodEnd(startDate, endDate);
        LocalDate start = startDate != null ? startDate.toLocalDate() : null;
        LocalDate end = cappedEnd != null ? cappedEnd.toLocalDate() : null;

        List<SalesProfitReportResponse> results = salesOrderRepository.findSalesProfitReport(search, start, end);
        
        // Calculate profitMarginPercent safely in Java to avoid JPQL casting issues
        for (SalesProfitReportResponse r : results) {
            if (r.getSalesAmount() != null && r.getSalesAmount().compareTo(java.math.BigDecimal.ZERO) > 0 && r.getGrossProfit() != null) {
                java.math.BigDecimal margin = r.getGrossProfit()
                    .divide(r.getSalesAmount(), 4, java.math.RoundingMode.HALF_UP)
                    .multiply(new java.math.BigDecimal("100"));
                r.setProfitMarginPercent(margin);
            } else {
                r.setProfitMarginPercent(java.math.BigDecimal.ZERO);
            }
        }
        
        return results;
    }
    public List<RepairProfitReportResponse> getRepairProfitReport(LocalDateTime startDate, LocalDateTime endDate,
                                                                  String search, Long warehouseId) {
        LocalDateTime cappedEnd = capPeriodEnd(startDate, endDate);
        LocalDate start = startDate != null ? startDate.toLocalDate() : null;
        LocalDate end = cappedEnd != null ? cappedEnd.toLocalDate() : null;

        return reportRepository.getRepairProfitReport(
                start, end, search, resolveWarehouseScope(warehouseId));
    }
    public byte[] exportReportToExcel(String reportType, Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType, String status) {
        log.info("Exporting report to Excel. Type={}, warehouseId={}, startDate={}, endDate={}, search={}", reportType, warehouseId, startDate, endDate, search);
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
             
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Bao Cao");
            
            // Cell Styles
            org.apache.poi.ss.usermodel.CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            
            org.apache.poi.ss.usermodel.CellStyle borderStyle = workbook.createCellStyle();
            borderStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            borderStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            borderStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            borderStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);

            // Title Row
            org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            
            String reportTitle = "";
            String[] columns = new String[]{};
            
            // Retrieve data based on type
            if ("inventory-summary".equals(reportType)) {
                reportTitle = "BÁO CÁO TỔNG HỢP TỒN KHO (NHẬP - XUẤT - TỒN)";
                List<InventorySummaryReportResponse> data = getInventorySummaryReport(warehouseId, startDate, endDate, search);
                
                // Inventory Summary uses 2 header rows
                org.apache.poi.ss.usermodel.Row header1 = sheet.createRow(3);
                org.apache.poi.ss.usermodel.Row header2 = sheet.createRow(4);
                
                String[] cols = {"Kho", "Mã hàng", "Tên hàng", "ĐVT", "Tồn đầu kỳ", "", "Nhập trong kỳ", "", "Xuất trong kỳ", "", "Tồn cuối kỳ", ""};
                for (int i = 0; i < cols.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header1.createCell(i);
                    cell.setCellValue(cols[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                String[] subCols = {"", "", "", "", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị"};
                for (int i = 0; i < subCols.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header2.createCell(i);
                    cell.setCellValue(subCols[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                // Merge cells for headers
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 4, 0, 0)); // Kho
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 4, 1, 1)); // Mã hàng
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 4, 2, 2)); // Tên hàng
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 4, 3, 3)); // ĐVT
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 4, 5)); // Tồn đầu
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 6, 7)); // Nhập trong kỳ
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 8, 9)); // Xuất trong kỳ
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 10, 11)); // Tồn cuối
                
                int rowIdx = 5;
                for (InventorySummaryReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getWarehouseName() != null ? item.getWarehouseName() : "");
                    row.createCell(1).setCellValue(item.getProductCode());
                    row.createCell(2).setCellValue(item.getProductName());
                    row.createCell(3).setCellValue(item.getUnitName() != null ? item.getUnitName() : "");
                    row.createCell(4).setCellValue(item.getOpeningQuantity() != null ? item.getOpeningQuantity().doubleValue() : 0.0);
                    row.createCell(5).setCellValue(item.getOpeningValue() != null ? item.getOpeningValue().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getReceiptQuantity() != null ? item.getReceiptQuantity().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getReceiptValue() != null ? item.getReceiptValue().doubleValue() : 0.0);
                    row.createCell(8).setCellValue(item.getIssueQuantity() != null ? item.getIssueQuantity().doubleValue() : 0.0);
                    row.createCell(9).setCellValue(item.getIssueValue() != null ? item.getIssueValue().doubleValue() : 0.0);
                    row.createCell(10).setCellValue(item.getEndingQuantity() != null ? item.getEndingQuantity().doubleValue() : 0.0);
                    row.createCell(11).setCellValue(item.getEndingValue() != null ? item.getEndingValue().doubleValue() : 0.0);
                    
                    for (int i = 0; i <= 11; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i <= 11; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("inventory-balance".equals(reportType)) {
                reportTitle = "BÁO CÁO TỒN KHO HIỆN TẠI";
                List<InventoryBalanceReportResponse> data = getInventoryBalanceReport(search, warehouseId);
                columns = new String[]{"Mã hàng", "Tên hàng", "Đơn vị tính", "Kho chứa", "Số lượng tồn", "Giá trị tồn"};
                
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                int rowIdx = 4;
                for (InventoryBalanceReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getItemCode());
                    row.createCell(1).setCellValue(item.getItemName());
                    row.createCell(2).setCellValue(item.getUnitName() != null ? item.getUnitName() : "");
                    row.createCell(3).setCellValue(item.getWarehouseCode() != null ? item.getWarehouseCode() + " - " + item.getWarehouseName() : "");
                    row.createCell(4).setCellValue(item.getTotalQuantity() != null ? item.getTotalQuantity().doubleValue() : 0.0);
                    row.createCell(5).setCellValue(item.getTotalValue() != null ? item.getTotalValue().doubleValue() : 0.0);
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("stock-ledger".equals(reportType)) {
                reportTitle = "SỔ CHI TIẾT VẬT TƯ HÀNG HÓA";
                List<StockLedgerReportResponse> data = getStockLedgerReport(warehouseId, startDate, endDate, search);
                columns = new String[]{"Ngày CT", "Số chứng từ", "Loại nghiệp vụ", "Mã hàng", "Tên hàng", "Kho", "ĐVT", "Đơn giá", "Số lượng nhập", "Số lượng xuất", "Tồn sau CT"};
                
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                int rowIdx = 4;
                for (StockLedgerReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getDocumentDate() != null ? item.getDocumentDate().toString() : "");
                    row.createCell(1).setCellValue(item.getDocumentNumber());
                    row.createCell(2).setCellValue(ReportLabels.ledgerDocumentType(item.getDocumentType()));
                    row.createCell(3).setCellValue(item.getProductCode());
                    row.createCell(4).setCellValue(item.getProductName());
                    row.createCell(5).setCellValue(item.getWarehouseName());
                    row.createCell(6).setCellValue(item.getUnitName() != null ? item.getUnitName() : "");
                    row.createCell(7).setCellValue(item.getUnitPrice() != null ? item.getUnitPrice().doubleValue() : 0.0);
                    row.createCell(8).setCellValue(item.getQuantityIn() != null ? item.getQuantityIn().doubleValue() : 0.0);
                    row.createCell(9).setCellValue(item.getQuantityOut() != null ? item.getQuantityOut().doubleValue() : 0.0);
                    row.createCell(10).setCellValue(item.getBalanceAfter() != null ? item.getBalanceAfter().doubleValue() : 0.0);
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("stock-transfers".equals(reportType)) {
                reportTitle = "BÁO CÁO CHUYỂN KHO NỘI BỘ";
                LocalDate startLd = startDate != null ? startDate.toLocalDate() : null;
                LocalDate endLd = endDate != null ? endDate.toLocalDate() : null;
                List<StockTransferReportResponse> data = getStockTransferReport(warehouseId, startLd, endLd, search, status);
                columns = new String[]{"Ngày CT", "Số chứng từ", "Mã hàng", "Tên hàng", "Kho chuyển", "Kho nhận", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền", "Trạng thái"};
                
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                int rowIdx = 4;
                for (StockTransferReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getDocumentDate() != null ? item.getDocumentDate().toString() : "");
                    row.createCell(1).setCellValue(item.getDocumentNumber());
                    row.createCell(2).setCellValue(item.getItemCode());
                    row.createCell(3).setCellValue(item.getItemName());
                    row.createCell(4).setCellValue(item.getSourceWarehouse());
                    row.createCell(5).setCellValue(item.getDestinationWarehouse());
                    row.createCell(6).setCellValue(item.getUnitName());
                    row.createCell(7).setCellValue(item.getQuantity() != null ? item.getQuantity().doubleValue() : 0.0);
                    row.createCell(8).setCellValue(item.getUnitPrice() != null ? item.getUnitPrice().doubleValue() : 0.0);
                    row.createCell(9).setCellValue(item.getAmount() != null ? item.getAmount().doubleValue() : 0.0);
                    row.createCell(10).setCellValue(ReportLabels.transferStatus(item.getStatus()));
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("debt".equals(reportType)) {
                reportTitle = "BÁO CÁO ĐỐI CHIẾU & CÔNG NỢ";
                List<DebtReportResponse> data = reportRepository.getDebtReport(startDate, endDate, search, partnerType);
                columns = new String[]{"Mã đối tác", "Tên đối tác", "Phân loại", "Dư đầu kỳ", "Phát sinh tăng (Nợ)", "Phát sinh giảm (Có)", "Dư cuối kỳ (Nợ cuối)"};
                
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                int rowIdx = 4;
                for (DebtReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getPartnerCode());
                    row.createCell(1).setCellValue(item.getPartnerName());
                    row.createCell(2).setCellValue("SUPPLIER".equals(item.getPartnerType()) ? "Nhà cung cấp" : "Khách hàng");
                    row.createCell(3).setCellValue(item.getOpeningBalance() != null ? item.getOpeningBalance().doubleValue() : 0.0);
                    row.createCell(4).setCellValue(item.getDebitIncrease() != null ? item.getDebitIncrease().doubleValue() : 0.0);
                    row.createCell(5).setCellValue(item.getCreditDecrease() != null ? item.getCreditDecrease().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getClosingBalance() != null ? item.getClosingBalance().doubleValue() : 0.0);
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("sales-profit".equals(reportType)) {
                reportTitle = "BÁO CÁO DOANH THU & LỢI NHUẬN GỘP BÁN HÀNG";
                List<SalesProfitReportResponse> data = getSalesProfitReport(startDate, endDate, search);
                columns = new String[]{"Mã hàng", "Tên hàng", "ĐVT", "Số lượng bán", "Doanh thu", "Giá vốn", "Lợi nhuận gộp", "Tỷ suất LN (%)"};
                
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                int rowIdx = 4;
                for (SalesProfitReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getSku());
                    row.createCell(1).setCellValue(item.getVariantName());
                    row.createCell(2).setCellValue(item.getUnitName() != null ? item.getUnitName() : "");
                    row.createCell(3).setCellValue(item.getQuantitySold() != null ? item.getQuantitySold().doubleValue() : 0.0);
                    row.createCell(4).setCellValue(item.getSalesAmount() != null ? item.getSalesAmount().doubleValue() : 0.0);
                    row.createCell(5).setCellValue(item.getCostAmount() != null ? item.getCostAmount().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getGrossProfit() != null ? item.getGrossProfit().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getProfitMarginPercent() != null ? item.getProfitMarginPercent().doubleValue() : 0.0);
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("repair-profit".equals(reportType)) {
                reportTitle = "BÁO CÁO DOANH THU & LỢI NHUẬN SỬA CHỮA";
                List<RepairProfitReportResponse> data = getRepairProfitReport(startDate, endDate, search, warehouseId);
                columns = new String[]{"Mã lệnh", "Ngày hoàn thành", "Khách hàng", "Doanh thu linh kiện",
                        "Doanh thu dịch vụ", "VAT", "Giá vốn FIFO", "Lãi sau giá vốn linh kiện", "Tỷ suất LN (%)"};

                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }

                int rowIdx = 4;
                for (RepairProfitReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getRepairCode());
                    row.createCell(1).setCellValue(item.getCompletedDate() != null ? item.getCompletedDate().toString() : "");
                    row.createCell(2).setCellValue(item.getPartnerName() != null ? item.getPartnerName() : "");
                    row.createCell(3).setCellValue(item.getPartsRevenue().doubleValue());
                    row.createCell(4).setCellValue(item.getServiceRevenue().doubleValue());
                    row.createCell(5).setCellValue(item.getVatAmount().doubleValue());
                    row.createCell(6).setCellValue(item.getCostAmount().doubleValue());
                    row.createCell(7).setCellValue(item.getGrossProfit().doubleValue());
                    row.createCell(8).setCellValue(item.getProfitMarginPercent().doubleValue());
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            }
            
            titleCell.setCellValue(reportTitle);
            titleCell.setCellStyle(titleStyle);
            
            // Exporter & Timestamp info
            org.apache.poi.ss.usermodel.Row metaRow = sheet.createRow(1);
            java.time.format.DateTimeFormatter dateFormat = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            metaRow.createCell(0).setCellValue("Thời gian lập:");
            metaRow.createCell(1).setCellValue(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
            if (!"inventory-balance".equals(reportType)) {
                org.apache.poi.ss.usermodel.Row periodRow = sheet.createRow(2);
                periodRow.createCell(0).setCellValue("Kỳ báo cáo:");
                LocalDateTime shownEnd = capPeriodEnd(startDate, endDate);
                periodRow.createCell(1).setCellValue(startDate == null && endDate == null ? "Toàn bộ thời gian"
                        : "Từ " + (startDate != null ? startDate.format(dateFormat) : "...")
                          + " đến " + (shownEnd != null ? shownEnd.format(dateFormat) : "nay"));
            }
            
            workbook.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new com.duylongtech.backend.exception.BusinessException("Không thể xuất Excel báo cáo.");
        }
    }
}
