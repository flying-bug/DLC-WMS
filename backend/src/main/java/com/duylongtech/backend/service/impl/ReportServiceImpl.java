package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.dto.response.report.*;
import com.duylongtech.backend.repository.ReportRepository;
import com.duylongtech.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;

    @Override
    public List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, Long warehouseId) {
        return reportRepository.getInventoryBalanceReport(search, warehouseId);
    }

    @Override
    public List<StockLedgerReportResponse> getStockLedgerReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Stock Ledger Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        return reportRepository.getStockLedgerReport(warehouseId, startDate, endDate, search);
    }

    @Override
    public List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search, String status) {
        log.info("Fetching Stock Transfer Report. warehouseId={}, startDate={}, endDate={}, search={}, status={}", warehouseId, startDate, endDate, search, status);
        return reportRepository.getStockTransferReport(warehouseId, startDate, endDate, search, status);
    }

    @Override
    public List<DebtReportResponse> getDebtReport(LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType) {
        log.info("Fetching Debt Report. startDate={}, endDate={}, search={}, partnerType={}", startDate, endDate, search, partnerType);
        return reportRepository.getDebtReport(startDate, endDate, search, partnerType);
    }

    @Override
    public List<InventorySummaryReportResponse> getInventorySummaryReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Inventory Summary Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        return reportRepository.getInventorySummaryReport(warehouseId, startDate, endDate, search);
    }

    @Override
    public DashboardResponse getDashboardMetrics() {
        log.info("Fetching Dashboard Metrics");
        return reportRepository.getDashboardMetrics();
    }

    @Override
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
                reportTitle = "BAO CAO TONG HOP TON KHO (NHAP - XUAT - TON)";
                List<InventorySummaryReportResponse> data = reportRepository.getInventorySummaryReport(warehouseId, startDate, endDate, search);
                
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
                List<InventoryBalanceReportResponse> data = reportRepository.getInventoryBalanceReport(search, warehouseId);
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
                reportTitle = "SO CHI TIET VAT TU HANG HOA";
                List<StockLedgerReportResponse> data = reportRepository.getStockLedgerReport(warehouseId, startDate, endDate, search);
                columns = new String[]{"Ngày CT", "Số chứng từ", "Loại CT", "Mã hàng", "Tên hàng", "Kho", "ĐVT", "Đơn giá", "Số lượng nhập", "Số lượng xuất", "Tồn sau CT"};
                
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
                    row.createCell(2).setCellValue(item.getDocumentType());
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
                reportTitle = "BAO CAO CHUYEN KHO NOI BO";
                LocalDate startLd = startDate != null ? startDate.toLocalDate() : null;
                LocalDate endLd = endDate != null ? endDate.toLocalDate() : null;
                List<StockTransferReportResponse> data = reportRepository.getStockTransferReport(warehouseId, startLd, endLd, search, status);
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
