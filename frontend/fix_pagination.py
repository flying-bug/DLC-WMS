import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    custom_pagination = """          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Hiển thị</span>
              <select 
                className="misa-select" 
                style={{ width: '70px', height: '32px', padding: '0 8px' }} 
                value={pageSize} 
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>trên tổng số {totalItems} bản ghi</span>
            </div>
            
            {totalPages > 1 && (
              <div className={styles.pageControls}>
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={styles.pageBtn}
                >
                  <i className="bi bi-chevron-left"></i>
                  <span>Trước</span>
                </button>

                <div className={styles.paginationNumbers}>
                  {getPageNumbers().map((num, idx) => (
                    num === currentPage ? (
                      <input
                        key={idx}
                        className={`${styles.pageNumber} ${styles.active}`}
                        style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                        defaultValue={num}
                        title="Nhập số trang và nhấn Enter"
                        onBlur={(e) => e.target.value = currentPage}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            let p = parseInt(e.target.value, 10);
                            if (!isNaN(p)) {
                              p = Math.max(1, Math.min(totalPages, p));
                              setCurrentPage(p);
                              e.target.blur();
                            } else {
                              e.target.value = currentPage;
                            }
                          }
                        }}
                      />
                    ) : (
                      <span 
                        key={idx} 
                        className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                        onClick={() => num !== '...' && setCurrentPage(num)}
                      >
                        {num}
                      </span>
                    )
                  ))}
                </div>

                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={styles.pageBtn}
                >
                  <span>Sau</span>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>"""

    get_page_numbers_fn = """
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return ("""

    if "const getPageNumbers =" not in content:
        content = content.replace("  return (", get_page_numbers_fn)
        
    content = content.replace("import Pagination from '../../components/ui/Pagination/Pagination';\n", "")

    # Clean up the old pagination blocks.
    # We want to replace everything from </table> to {selectedSlip && (
    
    # regex matching </table> ... {selectedSlip
    pattern = re.compile(r'</table>.*?\{selectedSlip && \(', re.DOTALL)
    
    replacement = "</table>\n\n" + custom_pagination + "\n\n        {selectedSlip && ("
    
    new_content = pattern.sub(replacement, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

fix_file('src/pages/ExportSlip/ExportSlipPage.jsx')
fix_file('src/pages/ImportHistory/ImportHistoryPage.jsx')
