import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import styles from './ImportHistoryPage.module.css';

const MOCK_SLIPS = [
  { id: 1, date: '15/05/2024', code: 'PNK-2405-001', partner: 'Công ty TNHH Intel Việt Nam', warehouse: 'Kho Linh Kiện', total: '1,250,000,000 đ', status: 'Hoàn thành', statusCode: 'success' },
  { id: 2, date: '14/05/2024', code: 'PNK-2405-002', partner: 'Samsung Electronics VN', warehouse: 'Kho Thành Phẩm', total: '845,000,000 đ', status: 'Chờ duyệt', statusCode: 'warning' },
  { id: 3, date: '12/05/2024', code: 'PNK-2405-003', partner: 'Asus Global Trading', warehouse: 'Kho Linh Kiện', total: '320,000,000 đ', status: 'Hoàn thành', statusCode: 'success' },
  { id: 4, date: '11/05/2024', code: 'PNK-2405-004', partner: 'Logitech Distributor', warehouse: 'Kho Phụ Kiện', total: '35,000,000 đ', status: 'Đã hủy', statusCode: 'danger' },
];

function ImportHistoryPage() {
  const navigate = useNavigate();
  const [selectedSlip, setSelectedSlip] = useState(MOCK_SLIPS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);


  const filteredSlips = MOCK_SLIPS.filter(slip =>
    slip.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    slip.partner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredSlips.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách hàng nhập</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/import-history/create')}>
            <i className="bi bi-plus"></i> Thêm mới
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌM KIẾM</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Mã phiếu, nhà cung cấp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <input type="date" className={styles.filterInput} />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌNH TRẠNG</span>
              <select className={styles.filterSelect}>
                <option>Tất cả</option>
                <option>Hoàn thành</option>
                <option>Chờ duyệt</option>
                <option>Đã hủy</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={styles.btnOutline}>
              Làm mới
            </button>
            <button className={styles.btnPrimary}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className={styles.bulkActionsToolbar}>
            <div className={styles.bulkText}>
              Đã chọn {selectedIds.length} phiếu nhập
            </div>
            <div className={styles.bulkButtons}>
              <button className={styles.btnOutline} style={{ borderColor: '#bae6fd', color: '#0369a1' }}>
                <i className="bi bi-printer"></i> In tem mã vạch
              </button>
              <button className={styles.btnOutline} style={{ borderColor: '#bae6fd', color: '#0369a1' }}>
                <i className="bi bi-file-earmark-excel"></i> Xuất Excel
              </button>
              <button className={styles.btnPrimary}>
                <i className="bi bi-check2-all"></i> Duyệt hàng loạt
              </button>
            </div>
          </div>
        )}

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={filteredSlips.length > 0 && selectedIds.length === filteredSlips.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>NGÀY GHI NHẬN</th>
                <th>MÃ SỐ ĐƠN</th>
                <th>NƠI GIAO HÀNG</th>
                <th>KHO HÀNG</th>
                <th className={styles.textRight}>TỔNG TIỀN</th>
                <th>TÌNH TRẠNG</th>
                <th className={styles.textCenter}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlips.length > 0 ? filteredSlips.map(slip => (
                <tr key={slip.id} className={selectedSlip.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selectedIds.includes(slip.id)}
                      onChange={(e) => handleSelectRow(e, slip.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>{slip.date}</td>
                  <td><a href="#" className={styles.link} onClick={(e) => e.preventDefault()}>{slip.code}</a></td>
                  <td>{slip.partner}</td>
                  <td>{slip.warehouse}</td>
                  <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>
                  <td>
                    <span className={`${styles.badge} ${slip.statusCode === 'success' ? styles.badgeSuccess :
                      slip.statusCode === 'info' ? styles.badgeInfo :
                        slip.statusCode === 'warning' ? styles.badgeWarning :
                          styles.badgeDanger
                      }`}>
                      {slip.statusCode === 'success' && <i className="bi bi-check-circle-fill" style={{ marginRight: '4px' }}></i>}
                      {slip.statusCode === 'warning' && <i className="bi bi-hourglass-split" style={{ marginRight: '4px' }}></i>}
                      {slip.statusCode === 'danger' && <i className="bi bi-x-circle-fill" style={{ marginRight: '4px' }}></i>}
                      {slip.status}
                    </span>
                  </td>
                  <td className={styles.textCenter}>
                    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiết" onClick={(e) => { e.stopPropagation(); setSelectedSlip(slip); }}></i>
                    <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sửa phiếu nhập kho" onClick={(e) => { e.stopPropagation(); navigate(`/import-slips/${slip.code}/edit`); }}></i>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8">
                    <div className={styles.emptyState}>
                      <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                      <div className={styles.emptyText}>Không tìm thấy phiếu nhập nào khớp với điều kiện lọc</div>
                      <button className={styles.btnOutline} onClick={() => setSearchQuery('')}>Xóa bộ lọc</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <span>Hiển thị 1 - 4 trong tổng số 156 bản ghi</span>
            <div className={styles.pageControls}>
              <button className={styles.pageBtn}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <div className={styles.paginationNumbers}>
                <div className={`${styles.pageNumber} ${styles.active}`}>1</div>
                <div className={styles.pageNumber}>2</div>
                <div className={styles.pageNumber}>3</div>
                <div className={styles.pageNumber}>...</div>
              </div>
              <button className={styles.pageBtn}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        {selectedSlip && (
          <div className={styles.detailSection}>
            <div className={styles.detailHeader}>
              <i className={`bi bi-file-earmark-text ${styles.detailIcon}`}></i>
              <h2 className={styles.detailTitle}>Chi tiết Đơn nhập hàng: {selectedSlip.code}</h2>
              <div style={{ flex: 1 }}></div>
              <span className={`${styles.badge} ${selectedSlip.statusCode === 'success' ? styles.badgeSuccess :
                selectedSlip.statusCode === 'info' ? styles.badgeInfo :
                  selectedSlip.statusCode === 'warning' ? styles.badgeWarning :
                    styles.badgeDanger
                }`}>
                {selectedSlip.statusCode === 'success' && <i className="bi bi-check-circle-fill" style={{ marginRight: '4px' }}></i>}
                {selectedSlip.statusCode === 'warning' && <i className="bi bi-hourglass-split" style={{ marginRight: '4px' }}></i>}
                {selectedSlip.statusCode === 'danger' && <i className="bi bi-x-circle-fill" style={{ marginRight: '4px' }}></i>}
                {selectedSlip.status}
              </span>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>NHÀ CUNG CẤP</span>
                  <span className={styles.detailValue}>{selectedSlip.partner}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>ĐỊA CHỈ</span>
                  <span className={styles.detailValue}>Khu Công nghệ Cao, Quận 9, TP. Thủ Đức</span>
                </div>
              </div>

              <div className={styles.detailRight}>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Ngày nhận hàng</span>
                  <span className={styles.detailRightValue}>{selectedSlip.date}</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Kho nhập</span>
                  <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{selectedSlip.warehouse} (K01)</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Người nhận</span>
                  <span className={styles.detailRightValue}>Nguyễn Văn A</span>
                </div>
              </div>
            </div>

            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã sản phẩm</th>
                  <th>Tên sản phẩm</th>
                  <th>ĐVT</th>
                  <th className={styles.textCenter}>Số lượng</th>
                  <th className={styles.textRight}>Giá nhập</th>
                  <th className={styles.textRight}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td className={styles.textBlue}>CPU-I7-13700K</td>
                  <td>CPU Intel Core i7 thế hệ 13 13700K</td>
                  <td>Cái</td>
                  <td className={styles.textCenter}>100</td>
                  <td className={styles.textRight}>10,500,000</td>
                  <td className={styles.textRight}>1,050,000,000</td>
                </tr>
              </tbody>
            </table>

            <div className={styles.detailFooter}>
              <div className={styles.footerTotalLabel}>Tổng cộng hàng nhập:</div>
              <div className={styles.footerQty}>100</div>
              <div className={styles.footerTotalLabel} style={{ flex: 0, whiteSpace: 'nowrap', paddingRight: '16px' }}>Tổng tiền:</div>
              <div className={styles.footerMoney}>{selectedSlip.total}</div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

export default ImportHistoryPage;
