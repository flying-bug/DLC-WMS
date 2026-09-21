package com.duylongtech.backend.feature.report;

import com.duylongtech.backend.feature.report.ReportRepository;
import com.duylongtech.backend.feature.product.ProductService;
import com.duylongtech.backend.feature.report.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final ProductService productService;
    private final WarehouseAccessGuard warehouseAccessGuard;
    public List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, Long warehouseId) {
        List<InventoryBalanceReportResponse> rows = reportRepository.getInventoryBalanceReport(search, resolveWarehouseId(warehouseId));
        if (!canViewPricing()) rows.forEach(row -> row.setTotalValue(null));
        return rows;
    }
    public List<StockLedgerReportResponse> getStockLedgerReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Stock Ledger Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        List<StockLedgerReportResponse> rows = reportRepository.getStockLedgerReport(resolveWarehouseId(warehouseId), startDate, endDate, search);
        if (!canViewPricing()) rows.forEach(row -> {
            row.setUnitPrice(null);
            row.setAmountIn(null);
            row.setAmountOut(null);
        });
        return rows;
    }
    public List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search, String status) {
        log.info("Fetching Stock Transfer Report. warehouseId={}, startDate={}, endDate={}, search={}, status={}", warehouseId, startDate, endDate, search, status);
        List<StockTransferReportResponse> rows = reportRepository.getStockTransferReport(resolveWarehouseId(warehouseId), startDate, endDate, search, status);
        if (!canViewPricing()) rows.forEach(row -> { row.setUnitPrice(null); row.setAmount(null); });
        return rows;
    }
    public List<DebtReportResponse> getDebtReport(LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType) {
        log.info("Fetching Debt Report. startDate={}, endDate={}, search={}, partnerType={}", startDate, endDate, search, partnerType);
        return reportRepository.getDebtReport(startDate, endDate, search, partnerType);
    }
    public List<InventorySummaryReportResponse> getInventorySummaryReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Inventory Summary Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        List<InventorySummaryReportResponse> rows = reportRepository.getInventorySummaryReport(resolveWarehouseId(warehouseId), startDate, endDate, search);
        if (!canViewPricing()) rows.forEach(row -> {
            row.setOpeningValue(null); row.setReceiptValue(null); row.setIssueValue(null); row.setEndingValue(null);
        });
        return rows;
    }
    public DashboardResponse getDashboardMetrics(String inventoryFlowRange, String categoryScope, String financeRange) {
        log.info("Fetching Dashboard Metrics. inventoryFlowRange={}, categoryScope={}, financeRange={}", inventoryFlowRange, categoryScope, financeRange);
        DashboardResponse dashboard = reportRepository.getDashboardMetrics(inventoryFlowRange, categoryScope, financeRange);
        var stockAlerts = productService.getStockAlertSummary();
        dashboard.setLowStockItemsCount(stockAlerts.getLowStockCount());
        dashboard.setOutOfStockItemsCount(stockAlerts.getOutOfStockCount());
        return dashboard;
    }
    public List<SalesProfitReportResponse> getSalesProfitReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Sales Profit Report. startDate={}, endDate={}, search={}", startDate, endDate, search);
        
        List<SalesProfitReportResponse> results = reportRepository.getSalesProfitReport(
                resolveWarehouseId(warehouseId), startDate, endDate, search);
        
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
        
        if (!canViewPricing()) results.forEach(row -> {
            row.setSalesAmount(null); row.setVatAmount(null); row.setTotalAmount(null);
            row.setCostAmount(null); row.setGrossProfit(null); row.setProfitMarginPercent(null);
        });
        return results;
    }
    public CashFlowReportResponse getCashFlowReport(LocalDateTime startDate, LocalDateTime endDate,
                                                     String search, String paymentMethod) {
        return reportRepository.getCashFlowReport(startDate, endDate, search, paymentMethod);
    }
    public List<RepairProfitReportResponse> getRepairProfitReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate,
                                                                  String search) {
        List<RepairProfitReportResponse> rows = reportRepository.getRepairProfitReport(
                resolveWarehouseId(warehouseId),
                startDate != null ? startDate.toLocalDate() : null,
                endDate != null ? endDate.toLocalDate() : null,
                search);
        if (!canViewPricing()) rows.forEach(row -> {
            row.setPartsRevenue(null); row.setServiceRevenue(null); row.setVatAmount(null);
            row.setCostAmount(null); row.setGrossProfit(null); row.setProfitMarginPercent(null);
        });
        return rows;
    }

    private Long resolveWarehouseId(Long requestedWarehouseId) {
        List<Long> allowed = warehouseAccessGuard.resolveAllowedWarehouseIds();
        if (allowed == null) return requestedWarehouseId;
        if (requestedWarehouseId != null) {
            warehouseAccessGuard.checkAccess(requestedWarehouseId);
            return requestedWarehouseId;
        }
        if (allowed.size() == 1) return allowed.get(0);
        if (allowed.isEmpty()) throw new BusinessException("Bạn chưa được phân công kho để xem báo cáo");
        throw new BusinessException("Vui lòng chọn một kho trong phạm vi được phân công");
    }

    private boolean canViewPricing() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority().toUpperCase())
                .anyMatch(role -> role.contains("SUPER_ADMIN") || role.contains("MANAGER")
                        || role.contains("ACCOUNTANT") || role.contains("CASHIER_CONTROLLER"));
    }
    public byte[] exportReportToExcel(String reportType, Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType, String status, String paymentMethod) {
        log.info("Exporting report to Excel. Type={}, warehouseId={}, startDate={}, endDate={}, search={}", reportType, warehouseId, startDate, endDate, search);
        if (!java.util.Set.of("inventory-summary", "inventory-balance", "stock-ledger", "stock-transfers",
                "debt", "sales-profit", "repair-profit", "cash-flow").contains(reportType)) {
            throw new BusinessException("Loại báo cáo không hợp lệ: " + reportType);
        }
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
                reportTitle = "BAO CAO TONG HOP TON KHO (NHAP - XUAT - TON)";
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
                reportTitle = "BAO CAO TON KHO HIEN TAI";
                List<InventoryBalanceReportResponse> data = getInventoryBalanceReport(search, warehouseId);
                columns = new String[]{"Mã hàng", "Tên hàng", "Đơn vị tính", "Kho chứa", "Tồn thực tế", "Đang giữ", "Khả dụng", "Giá trị tồn"};
                
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
                    row.createCell(5).setCellValue(item.getTotalReserved() != null ? item.getTotalReserved().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getAvailableQuantity() != null ? item.getAvailableQuantity().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getTotalValue() != null ? item.getTotalValue().doubleValue() : 0.0);
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("stock-ledger".equals(reportType)) {
                reportTitle = "SO CHI TIET VAT TU HANG HOA";
                List<StockLedgerReportResponse> data = getStockLedgerReport(warehouseId, startDate, endDate, search);
                boolean showPricing = canViewPricing();
                columns = showPricing
                        ? new String[]{"Ngày ghi sổ", "Ngày CT", "Số chứng từ", "Loại CT", "Mã hàng", "Tên hàng", "Kho", "ĐVT", "Đơn giá vốn", "SL nhập", "Tiền nhập", "SL xuất", "Tiền xuất", "Tồn trước GD", "Tồn sau GD"}
                        : new String[]{"Ngày ghi sổ", "Ngày CT", "Số chứng từ", "Loại CT", "Mã hàng", "Tên hàng", "Kho", "ĐVT", "SL nhập", "SL xuất", "Tồn trước GD", "Tồn sau GD"};
                
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }
                
                int rowIdx = 4;
                for (StockLedgerReportResponse item : data) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    int col = 0;
                    row.createCell(col++).setCellValue(item.getMovementAt() != null ? item.getMovementAt().toString() : "");
                    row.createCell(col++).setCellValue(item.getDocumentDate() != null ? item.getDocumentDate().toString() : "");
                    row.createCell(col++).setCellValue(item.getDocumentNumber());
                    row.createCell(col++).setCellValue(item.getMovementType() != null && item.getMovementType().startsWith("UNPOST_")
                            ? item.getMovementType() : item.getDocumentType());
                    row.createCell(col++).setCellValue(item.getProductCode());
                    row.createCell(col++).setCellValue(item.getProductName());
                    row.createCell(col++).setCellValue(item.getWarehouseName());
                    row.createCell(col++).setCellValue(item.getUnitName() != null ? item.getUnitName() : "");
                    if (showPricing) row.createCell(col++).setCellValue(item.getUnitPrice() != null ? item.getUnitPrice().doubleValue() : 0.0);
                    row.createCell(col++).setCellValue(item.getQuantityIn() != null ? item.getQuantityIn().doubleValue() : 0.0);
                    if (showPricing) row.createCell(col++).setCellValue(item.getAmountIn() != null ? item.getAmountIn().doubleValue() : 0.0);
                    row.createCell(col++).setCellValue(item.getQuantityOut() != null ? item.getQuantityOut().doubleValue() : 0.0);
                    if (showPricing) row.createCell(col++).setCellValue(item.getAmountOut() != null ? item.getAmountOut().doubleValue() : 0.0);
                    row.createCell(col++).setCellValue(item.getBalanceBefore() != null ? item.getBalanceBefore().doubleValue() : 0.0);
                    row.createCell(col).setCellValue(item.getBalanceAfter() != null ? item.getBalanceAfter().doubleValue() : 0.0);
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("stock-transfers".equals(reportType)) {
                reportTitle = "BAO CAO CHUYEN KHO NOI BO";
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
                    row.createCell(10).setCellValue(item.getStatus());
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("debt".equals(reportType)) {
                reportTitle = "BAO CAO DOI CHIEU & CONG NO";
                List<DebtReportResponse> data = getDebtReport(startDate, endDate, search, partnerType);
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
            } else if ("cash-flow".equals(reportType)) {
                reportTitle = "BAO CAO DONG TIEN";
                CashFlowReportResponse data = getCashFlowReport(startDate, endDate, search, paymentMethod);
                columns = new String[]{"Ngày ghi sổ", "Số phiếu", "Loại", "Phương thức", "Đối tác", "Thu", "Chi", "Ghi chú"};
                org.apache.poi.ss.usermodel.Row header = sheet.createRow(3);
                for (int i = 0; i < columns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                    cell.setCellStyle(headerStyle);
                }
                int rowIdx = 4;
                for (CashFlowTransactionResponse item : data.getTransactions()) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(item.getPostedAt() != null ? item.getPostedAt().toString() : "");
                    row.createCell(1).setCellValue(item.getCode());
                    row.createCell(2).setCellValue("RECEIPT".equals(item.getType()) ? "Phiếu thu" : "Phiếu chi");
                    row.createCell(3).setCellValue("CASH".equals(item.getPaymentMethod()) ? "Tiền mặt" : "Chuyển khoản");
                    row.createCell(4).setCellValue(item.getPartnerName());
                    row.createCell(5).setCellValue("RECEIPT".equals(item.getType()) ? item.getAmount().doubleValue() : 0.0);
                    row.createCell(6).setCellValue("VOUCHER".equals(item.getType()) ? item.getAmount().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getNote() != null ? item.getNote() : "");
                    for (int i = 0; i < columns.length; i++) row.getCell(i).setCellStyle(borderStyle);
                }
                rowIdx++;
                org.apache.poi.ss.usermodel.Row summaryHeader = sheet.createRow(rowIdx++);
                String[] summaryColumns = {"Chỉ tiêu", "Tiền mặt", "Ngân hàng", "Tổng cộng"};
                for (int i = 0; i < summaryColumns.length; i++) {
                    org.apache.poi.ss.usermodel.Cell cell = summaryHeader.createCell(4 + i);
                    cell.setCellValue(summaryColumns[i]);
                    cell.setCellStyle(headerStyle);
                }
                String[] summaryLabels = {"Số dư đầu kỳ", "Thu trong kỳ", "Chi trong kỳ", "Số dư cuối kỳ"};
                java.math.BigDecimal[][] summaryValues = {
                        {data.getOpeningCash(), data.getOpeningBank(), data.getOpeningTotal()},
                        {data.getCashReceipts(), data.getBankReceipts(), data.getTotalReceipts()},
                        {data.getCashVouchers(), data.getBankVouchers(), data.getTotalVouchers()},
                        {data.getClosingCash(), data.getClosingBank(), data.getClosingTotal()}
                };
                for (int i = 0; i < summaryLabels.length; i++) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    row.createCell(4).setCellValue(summaryLabels[i]);
                    row.createCell(5).setCellValue(summaryValues[i][0].doubleValue());
                    row.createCell(6).setCellValue(summaryValues[i][1].doubleValue());
                    row.createCell(7).setCellValue(summaryValues[i][2].doubleValue());
                }
                for (int i = 0; i < columns.length; i++) sheet.autoSizeColumn(i);
            } else if ("sales-profit".equals(reportType)) {
                reportTitle = "BAO CAO DOANH THU & LOI NHUAN GOP";
                List<SalesProfitReportResponse> data = getSalesProfitReport(warehouseId, startDate, endDate, search);
                columns = new String[]{"Mã hàng", "Tên hàng", "ĐVT", "Số lượng bán", "Doanh thu chưa VAT", "VAT", "Tổng sau VAT", "Giá vốn", "Lợi nhuận gộp", "Tỷ suất LN (%)"};
                
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
                    row.createCell(5).setCellValue(item.getVatAmount() != null ? item.getVatAmount().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getTotalAmount() != null ? item.getTotalAmount().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getCostAmount() != null ? item.getCostAmount().doubleValue() : 0.0);
                    row.createCell(8).setCellValue(item.getGrossProfit() != null ? item.getGrossProfit().doubleValue() : 0.0);
                    row.createCell(9).setCellValue(item.getProfitMarginPercent() != null ? item.getProfitMarginPercent().doubleValue() : 0.0);
                    
                    for (int i = 0; i < columns.length; i++) {
                        row.getCell(i).setCellStyle(borderStyle);
                    }
                }
                
                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
            } else if ("repair-profit".equals(reportType)) {
                reportTitle = "BAO CAO DOANH THU & LOI NHUAN SUA CHUA";
                List<RepairProfitReportResponse> data = getRepairProfitReport(warehouseId, startDate, endDate, search);
                columns = new String[]{"Ma lenh", "Ngay hoan thanh", "Khach hang", "Doanh thu linh kien",
                        "Doanh thu dich vu", "VAT", "Gia von FIFO", "Loi nhuan gop", "Ty suat LN (%)"};

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
                    row.createCell(3).setCellValue(item.getPartsRevenue() != null ? item.getPartsRevenue().doubleValue() : 0.0);
                    row.createCell(4).setCellValue(item.getServiceRevenue() != null ? item.getServiceRevenue().doubleValue() : 0.0);
                    row.createCell(5).setCellValue(item.getVatAmount() != null ? item.getVatAmount().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getCostAmount() != null ? item.getCostAmount().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getGrossProfit() != null ? item.getGrossProfit().doubleValue() : 0.0);
                    row.createCell(8).setCellValue(item.getProfitMarginPercent() != null ? item.getProfitMarginPercent().doubleValue() : 0.0);
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
            metaRow.createCell(0).setCellValue("Thoi gian lap:");
            metaRow.createCell(1).setCellValue(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
            
            workbook.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new com.duylongtech.backend.exception.BusinessException("Khong the xuat Excel bao cao.");
        }
    }
}
