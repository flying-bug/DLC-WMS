/**
 * Export data to CSV/Excel format with professional company header & footer metadata.
 * Opens seamlessly in Microsoft Excel & Google Sheets with UTF-8 BOM encoding.
 * 
 * @param {Array<string>} headers - Header columns
 * @param {Array<Array<any>>} data - Row data, each row is an array matching headers
 * @param {string} fileName - Download file name (without extension)
 * @param {string} [customTitle] - Custom title for the report banner (optional)
 */
export const exportToExcel = (headers, data, fileName, customTitle) => {
  const displayTitle = customTitle || fileName.replace(/_/g, ' ').toUpperCase();
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const headerBlock = [
    ['CÔNG TY TNHH DUY LONG COMPUTER'],
    ['Địa chỉ: Số 59 Thịnh Liệt - Hoàng Mai - Hà Nội'],
    ['Điện thoại: 0392718888 - Email: Duylongcomputer@gmail.com'],
    [''],
    [displayTitle],
    [`Ngày xuất báo cáo: ${dateStr}`],
    ['']
  ];

  const footerBlock = [
    [''],
    [`Tổng số bản ghi: ${data ? data.length : 0}`],
    [''],
    ['', '', 'Người lập biểu', '', 'Kế toán trưởng / Quản lý'],
    ['', '', '(Ký, ghi rõ họ tên)', '', '(Ký, ghi rõ họ tên)']
  ];

  const allRows = [...headerBlock, headers, ...(data || []), ...footerBlock];

  const csvContent = "\uFEFF" + allRows.map(row => 
    row.map(val => {
      let cell = val === null || val === undefined ? '' : String(val);
      // Escape quotes and wrap in quotes if there are commas/newlines/quotes/semicolons
      cell = cell.replace(/"/g, '""');
      if (cell.includes(',') || cell.includes('\n') || cell.includes('"') || cell.includes(';')) {
        cell = `"${cell}"`;
      }
      return cell;
    }).join(',')
  ).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
