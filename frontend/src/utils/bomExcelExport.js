import { saveAs } from 'file-saver';
import { loadExcelJs } from './lazyExcel';

export const exportBomToExcel = async (lines, bomCode) => {
    const ExcelJS = await loadExcelJs();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cau_Hinh');

    // Default font
    worksheet.properties.defaultRowHeight = 20;

    // Define columns
    worksheet.columns = [
        { key: 'stt', width: 8 },
        { key: 'sku', width: 20 },
        { key: 'name', width: 50 },
        { key: 'warranty', width: 15 },
        { key: 'quantity', width: 12 }
    ];

    // Build Header
    worksheet.mergeCells('A1:E1');
    const titleCell1 = worksheet.getCell('A1');
    titleCell1.value = 'CÔNG TY DUY LONG COMPUTER';
    titleCell1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFF0000' } };
    titleCell1.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('A2:E2');
    const titleCell2 = worksheet.getCell('A2');
    titleCell2.value = 'Showroom: Số 59 Thịnh Liệt - Hoàng Mai - Hà Nội';
    titleCell2.font = { name: 'Arial', size: 10 };
    titleCell2.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('A3:E3');
    const titleCell3 = worksheet.getCell('A3');
    titleCell3.value = 'Hotline: 0392718888';
    titleCell3.font = { name: 'Arial', size: 10 };
    titleCell3.alignment = { vertical: 'middle', horizontal: 'right' };

    worksheet.mergeCells('A4:E4');
    const titleCell4 = worksheet.getCell('A4');
    titleCell4.value = 'Email: Duylongcomputer@gmail.com';
    titleCell4.font = { name: 'Arial', size: 10 };
    titleCell4.alignment = { vertical: 'middle', horizontal: 'right' };

    // Line separator
    worksheet.mergeCells('A5:E5');
    const sepCell = worksheet.getCell('A5');
    sepCell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };

    // Title
    worksheet.mergeCells('A7:E7');
    const docTitle = worksheet.getCell('A7');
    docTitle.value = 'CẤU HÌNH ĐỊNH MỨC LINH KIỆN';
    docTitle.font = { name: 'Arial', size: 16, bold: true };
    docTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    // Table Header (Row 9)
    const headerRow = worksheet.getRow(9);
    headerRow.values = ['STT', 'Mã sản phẩm', 'Tên sản phẩm', 'Bảo hành', 'Số lượng'];
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

    // Render Data
    lines.forEach((line, index) => {
        const row = worksheet.getRow(currentRow);
        row.values = {
            stt: index + 1,
            sku: line.sku,
            name: line.name,
            warranty: line.warrantyMonths > 0 ? `${line.warrantyMonths} Tháng` : 'Không bảo hành',
            quantity: line.quantity
        };

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
            }
        });
        
        currentRow++;
    });

    currentRow += 2;

    // Footer Text
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const footerNote1 = worksheet.getCell(`A${currentRow}`);
    footerNote1.value = {
        richText: [
            { font: { bold: true, name: 'Arial', size: 10 }, text: 'Quý khách lưu ý: ' },
            { font: { name: 'Arial', size: 10 }, text: 'Giá vốn không thuộc BOM và sẽ được hệ thống xác định theo FIFO khi duyệt lệnh lắp ráp hoặc tháo dỡ.' }
        ]
    };
    footerNote1.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    worksheet.getRow(currentRow).height = 40;

    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const footerNote2 = worksheet.getCell(`A${currentRow}`);
    footerNote2.value = 'CHÂN THÀNH CẢM ƠN !';
    footerNote2.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFF0000' } };
    footerNote2.alignment = { vertical: 'middle', horizontal: 'left' };

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Cau_hinh_may_${bomCode || 'Cấu hình'}.xlsx`);
};
