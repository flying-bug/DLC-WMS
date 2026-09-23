// xlsx (~880 KB) và exceljs (~950 KB) chỉ chạy khi người dùng bấm xuất/nhập Excel, nhưng nếu
// import tĩnh thì chúng nằm luôn trong bundle khởi động và ai mở app cũng phải tải. Nạp động qua
// hai hàm này để Vite tách ra chunk riêng, chỉ tải ở lần bấm nút đầu tiên (sau đó trình duyệt cache).
export const loadXlsx = () => import('xlsx');

export const loadExcelJs = () => import('exceljs').then((mod) => mod.default ?? mod);
