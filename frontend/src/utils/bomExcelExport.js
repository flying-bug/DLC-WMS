import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportBomToExcel = async (lines, bomCode) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bao_Gia');

    // Default font
    worksheet.properties.defaultRowHeight = 20;

    // Define columns
    worksheet.columns = [
        { key: 'stt', width: 8 },
        { key: 'sku', width: 20 },
        { key: 'name', width: 50 },
        { key: 'warranty', width: 15 },
        { key: 'quantity', width: 10 },
        { key: 'price', width: 18 },
        { key: 'amount', width: 18 }
    ];

    // Build Header
    worksheet.mergeCells('A1:G1');
    const titleCell1 = worksheet.getCell('A1');
    titleCell1.value = 'CÔNG TY DUY LONG COMPUTER';
    titleCell1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFF0000' } };
    titleCell1.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('A2:G2');
    const titleCell2 = worksheet.getCell('A2');
    titleCell2.value = 'Showroom: Số 59 Thịnh Liệt - Hoàng Mai - Hà Nội';
    titleCell2.font = { name: 'Arial', size: 10 };
    titleCell2.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('A3:G3');
    const titleCell3 = worksheet.getCell('A3');
    titleCell3.value = 'Hotline: 0392718888';
    titleCell3.font = { name: 'Arial', size: 10 };
    titleCell3.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('A4:G4');
    const titleCell4 = worksheet.getCell('A4');
    titleCell4.value = 'Email: Duylongcomputer@gmail.com';
    titleCell4.font = { name: 'Arial', size: 10 };
    titleCell4.alignment = { vertical: 'middle', horizontal: 'right' };

    // Line separator
    worksheet.mergeCells('A5:G5');
    const sepCell = worksheet.getCell('A5');
    sepCell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };

    // Title
    worksheet.mergeCells('A7:G7');
    const docTitle = worksheet.getCell('A7');
    docTitle.value = 'BẢNG BÁO GIÁ THIẾT BỊ';
    docTitle.font = { name: 'Arial', size: 16, bold: true };
    docTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    // Table Header (Row 9)
    const headerRow = worksheet.getRow(9);
    headerRow.values = ['STT', 'Mã sản phẩm', 'Tên sản phẩm', 'Bảo hành', 'Số lượng', 'Đơn giá', 'Thành tiền'];
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' } // Red background
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    let currentRow = 10;
    let totalCost = 0;

    // Render Data
    lines.forEach((line, index) => {
        const row = worksheet.getRow(currentRow);
        row.values = {
            stt: index + 1,
            sku: line.sku,
            name: line.name,
            warranty: line.warrantyMonths > 0 ? `${line.warrantyMonths} Tháng` : 'Không bảo hành',
            quantity: line.quantity,
            price: line.price,
            amount: line.amount
        };
        totalCost += line.amount;

        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF999999' } },
                left: { style: 'thin', color: { argb: 'FF999999' } },
                bottom: { style: 'thin', color: { argb: 'FF999999' } },
                right: { style: 'thin', color: { argb: 'FF999999' } }
            };
            cell.font = { name: 'Arial', size: 10 };
            
            if (colNumber === 1 || colNumber === 2 || colNumber === 4 || colNumber === 5) {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else if (colNumber === 3) {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0055AA' } }; // Blue text for name
            } else if (colNumber === 6 || colNumber === 7) {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                cell.numFmt = '#,##0" ₫"';
            }
        });
        
        currentRow++;
    });

    // Total Row
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const totalLabelCell = worksheet.getCell(`A${currentRow}`);
    totalLabelCell.value = 'Tổng chi phí';
    totalLabelCell.font = { name: 'Arial', size: 10, bold: true };
    totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }; // Light blue
    totalLabelCell.border = {
        top: { style: 'thin', color: { argb: 'FF999999' } },
        left: { style: 'thin', color: { argb: 'FF999999' } },
        bottom: { style: 'thin', color: { argb: 'FF999999' } },
        right: { style: 'thin', color: { argb: 'FF999999' } }
    };
    
    // Apply borders and fill to the rest of merged cells to ensure consistency
    for(let c = 2; c <= 6; c++) {
        const cCell = worksheet.getCell(currentRow, c);
        cCell.border = totalLabelCell.border;
    }

    const totalValueCell = worksheet.getCell(`G${currentRow}`);
    totalValueCell.value = totalCost;
    totalValueCell.font = { name: 'Arial', size: 10, bold: true };
    totalValueCell.alignment = { vertical: 'middle', horizontal: 'right' };
    totalValueCell.numFmt = '#,##0" ₫"';
    totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
    totalValueCell.border = totalLabelCell.border;

    currentRow += 2;

    // Footer Text
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const footerNote1 = worksheet.getCell(`A${currentRow}`);
    footerNote1.value = {
        richText: [
            { font: { bold: true, name: 'Arial', size: 10 }, text: 'Quý khách lưu ý: ' },
            { font: { name: 'Arial', size: 10 }, text: 'Giá bán, khuyến mại của sản phẩm và tình trạng còn hàng có thể bị thay đổi bất cứ lúc nào mà không kịp báo trước. Mọi thông tin chi tiết xin vui lòng liên hệ Hotline: 0392718888 - Email: Duylongcomputer@gmail.com' }
        ]
    };
    footerNote1.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    worksheet.getRow(currentRow).height = 40;

    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const footerNote2 = worksheet.getCell(`A${currentRow}`);
    footerNote2.value = 'CHÂN THÀNH CẢM ƠN !';
    footerNote2.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFF0000' } };
    footerNote2.alignment = { vertical: 'middle', horizontal: 'left' };

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Cau_hinh_may_${bomCode || 'Cấu hình'}.xlsx`);
};
