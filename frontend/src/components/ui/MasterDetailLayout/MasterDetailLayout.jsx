import React, { useState, useMemo } from 'react';
import styles from './MasterDetailLayout.module.css';

/**
 * MasterDetailLayout - Bố cục 2 tầng chuẩn ERP đồng bộ với DLC Design System
 * Bảng trên: Master Table + Phân trang dưới đáy
 * Thanh giữa: Divider "Chi tiết" với nút gập/mở
 * Bảng dưới: Detail Table + Dòng Tổng cộng + Phân trang dưới đáy
 */
export default function MasterDetailLayout({
  masterColumns = [],
  masterData = [],
  selectedItem,
  onSelectItem,
  onRowDoubleClick,
  masterLoading,
  detailTitle = 'Chi tiết',
  detailColumns = [],
  detailData = [],
  detailLoading,
  emptyDetailMessage = 'Chọn một chứng từ ở bảng trên để xem chi tiết',
  // Optional pagination props
  page,
  setPage,
  pageSize,
  setPageSize
}) {
  const [detailVisible, setDetailVisible] = useState(true);

  // Internal pagination fallback if not provided via props
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(20);

  const currentPage = page !== undefined ? page : internalPage;
  const currentPageSize = pageSize !== undefined ? pageSize : internalPageSize;

  const handlePageChange = (newPage) => {
    if (setPage) setPage(newPage);
    else setInternalPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    if (setPageSize) {
      setPageSize(newSize);
      if (setPage) setPage(1);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  };

  // Compute paginated master data
  const totalMasterItems = masterData.length;
  const totalPages = Math.max(1, Math.ceil(totalMasterItems / currentPageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedMasterData = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * currentPageSize;
    return masterData.slice(startIdx, startIdx + currentPageSize);
  }, [masterData, safeCurrentPage, currentPageSize]);

  // Detail pagination (internal only)
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(20);
  const totalDetailItems = detailData.length;
  const totalDetailPages = Math.max(1, Math.ceil(totalDetailItems / detailPageSize));
  const safeDetailPage = Math.min(Math.max(1, detailPage), totalDetailPages);

  const paginatedDetailData = useMemo(() => {
    const startIdx = (safeDetailPage - 1) * detailPageSize;
    return detailData.slice(startIdx, startIdx + detailPageSize);
  }, [detailData, safeDetailPage, detailPageSize]);

  // Sum calculations in Detail Table
  const totalExpected = detailData.reduce(
    (acc, d) => acc + (Number(d.expectedQuantity || d.quantity || d.quantityIn || d.quantityOut || 0) || 0),
    0
  );
  const totalActual = detailData.reduce(
    (acc, d) =>
      acc + (Number(d.actualQuantity || d.quantityIn || d.quantityOut || d.expectedQuantity || 0) || 0),
    0
  );

  return (
    <div className={styles.layoutContainer}>
      {/* TẦNG TRÊN: MASTER */}
      <section className={styles.masterSection} style={!detailVisible ? { flex: '1 1 100%' } : {}}>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ cursor: 'pointer' }}
                    checked={
                      paginatedMasterData.length > 0 &&
                      paginatedMasterData.every(
                        (r) => selectedItem && (selectedItem.id === r.id || selectedItem.docCode === r.docCode)
                      )
                    }
                    onChange={(e) => {
                      if (e.target.checked && paginatedMasterData.length > 0) {
                        onSelectItem && onSelectItem(paginatedMasterData[0]);
                      }
                    }}
                  />
                </th>
                {masterColumns.map((col, idx) => (
                  <th key={col.key || idx} style={col.style || { width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {masterLoading ? (
                <tr>
                  <td colSpan={masterColumns.length + 1} className={styles.loadingCell}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                    Đang tải dữ liệu chứng từ...
                  </td>
                </tr>
              ) : paginatedMasterData.length === 0 ? (
                <tr>
                  <td colSpan={masterColumns.length + 1} className={styles.emptyCell}>
                    Không tìm thấy bản ghi nào.
                  </td>
                </tr>
              ) : (
                paginatedMasterData.map((row, rowIdx) => {
                  const isSelected =
                    selectedItem && (selectedItem.id === row.id || selectedItem.docCode === row.docCode);
                  return (
                    <tr
                      key={row.id || row.docCode || rowIdx}
                      className={`${styles.dataRow} ${isSelected ? styles.selectedRow : ''}`}
                      onClick={() => onSelectItem && onSelectItem(row)}
                      onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row)}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectItem && onSelectItem(row)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      {masterColumns.map((col, colIdx) => (
                        <td key={col.key || colIdx} style={col.style}>
                          {col.render
                            ? col.render(row[col.key], row, (safeCurrentPage - 1) * currentPageSize + rowIdx)
                            : row[col.key] != null
                            ? String(row[col.key])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MASTER FOOTER BAR */}
        <div className={styles.misaTableFooter}>
          <div className={styles.footerLeft}>
            <span>Tổng số: <strong>{totalMasterItems}</strong> bản ghi</span>
          </div>
          <div className={styles.footerRight}>
            <span className={styles.footerLabel}>Số dòng/trang:</span>
            <select
              className={styles.pageSizeSelect}
              value={currentPageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <div className={styles.paginationArrows}>
              <button
                type="button"
                className={styles.pageArrowBtn}
                disabled={safeCurrentPage <= 1}
                onClick={() => handlePageChange(1)}
                title="Trang đầu"
              >
                <i className="fas fa-angle-double-left"></i>
              </button>
              <button
                type="button"
                className={styles.pageArrowBtn}
                disabled={safeCurrentPage <= 1}
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                title="Trang trước"
              >
                <i className="fas fa-angle-left"></i>
              </button>
              <span className={styles.pageNumber}>
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageArrowBtn}
                disabled={safeCurrentPage >= totalPages}
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                title="Trang sau"
              >
                <i className="fas fa-angle-right"></i>
              </button>
              <button
                type="button"
                className={styles.pageArrowBtn}
                disabled={safeCurrentPage >= totalPages}
                onClick={() => handlePageChange(totalPages)}
                title="Trang cuối"
              >
                <i className="fas fa-angle-double-right"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* THANH PHÂN CÁCH (DIVIDER) */}
      <div className={styles.dividerBar} onClick={() => setDetailVisible(!detailVisible)}>
        <span className={styles.dividerTitle}>
          <i className="fas fa-layer-group" style={{ marginRight: 6, color: 'var(--color-primary)' }}></i>
          {detailTitle} {selectedItem?.docCode || selectedItem?.code ? `(Mã: ${selectedItem.docCode || selectedItem.code})` : ''}
        </span>
        <button
          type="button"
          className={styles.collapseToggleBtn}
          title={detailVisible ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
          onClick={(e) => {
            e.stopPropagation();
            setDetailVisible(!detailVisible);
          }}
        >
          <i className={`fas fa-chevron-${detailVisible ? 'down' : 'up'}`}></i>
        </button>
      </div>

      {/* TẦNG DƯỚI: DETAIL */}
      {detailVisible && (
        <section className={styles.detailSection}>
          <div className={styles.tableWrapper}>
            {!selectedItem ? (
              <div className={styles.emptyDetail}>
                <i className="fas fa-mouse-pointer" style={{ fontSize: '1.25rem', color: 'var(--color-text-muted-2)' }}></i>
                <span>{emptyDetailMessage}</span>
              </div>
            ) : detailLoading ? (
              <div className={styles.emptyDetail}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}></i>
                <span>Đang tải danh sách hàng hóa chi tiết...</span>
              </div>
            ) : detailData.length === 0 ? (
              <div className={styles.emptyDetail}>
                <i className="fas fa-box-open" style={{ fontSize: '1.25rem', color: 'var(--color-text-muted-2)' }}></i>
                <span>Chứng từ này không có dòng hàng chi tiết nào.</span>
              </div>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {detailColumns.map((col, idx) => (
                      <th key={col.key || idx} style={col.style || { width: col.width }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedDetailData.map((line, lineIdx) => (
                    <tr key={line.id || lineIdx} className={styles.dataRow}>
                      {detailColumns.map((col, colIdx) => (
                        <td key={col.key || colIdx} style={col.style}>
                          {col.render
                            ? col.render(line[col.key], line, (safeDetailPage - 1) * detailPageSize + lineIdx)
                            : line[col.key] != null
                            ? String(line[col.key])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* DÒNG TỔNG CỘNG */}
                  {detailData.length > 0 && (
                    <tr className={styles.detailTotalRow}>
                      <td colSpan={2} style={{ textAlign: 'center' }}>
                        <strong>Tổng cộng:</strong>
                      </td>
                      <td colSpan={Math.max(1, detailColumns.length - 4)}></td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: 'var(--color-text-strong)' }}>
                          {totalExpected > 0 ? totalExpected.toLocaleString('vi-VN') : ''}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: 'var(--color-primary)' }}>
                          {totalActual > 0 ? totalActual.toLocaleString('vi-VN') : ''}
                        </strong>
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* DETAIL FOOTER BAR */}
          {selectedItem && detailData.length > 0 && (
            <div className={styles.misaTableFooter}>
              <div className={styles.footerLeft}>
                <span>Tổng số: <strong>{totalDetailItems}</strong> dòng chi tiết</span>
              </div>
              <div className={styles.footerRight}>
                <span className={styles.footerLabel}>Số dòng/trang:</span>
                <select
                  className={styles.pageSizeSelect}
                  value={detailPageSize}
                  onChange={(e) => {
                    setDetailPageSize(Number(e.target.value));
                    setDetailPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <div className={styles.paginationArrows}>
                  <button
                    type="button"
                    className={styles.pageArrowBtn}
                    disabled={safeDetailPage <= 1}
                    onClick={() => setDetailPage(Math.max(1, safeDetailPage - 1))}
                    title="Trang trước"
                  >
                    <i className="fas fa-angle-left"></i>
                  </button>
                  <span className={styles.pageNumber}>
                    {safeDetailPage} / {totalDetailPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageArrowBtn}
                    disabled={safeDetailPage >= totalDetailPages}
                    onClick={() => setDetailPage(Math.min(totalDetailPages, safeDetailPage + 1))}
                    title="Trang sau"
                  >
                    <i className="fas fa-angle-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
