/**
 * Export data to CSV format with UTF-8 BOM so Excel opens it with correct Vietnamese encoding.
 * @param {Array<string>} headers - Header columns
 * @param {Array<Array<any>>} data - Row data, each row is an array matching headers
 * @param {string} fileName - Download file name (without extension)
 */
export const exportToExcel = (headers, data, fileName) => {
  const allRows = [headers, ...data];
  
  const csvContent = "\uFEFF" + allRows.map(row => 
    row.map(val => {
      let cell = val === null || val === undefined ? '' : String(val);
      // Escape quotes and wrap in quotes if there are commas/newlines/quotes
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
};
