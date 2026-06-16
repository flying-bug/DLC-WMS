import { useState } from 'react';

import AdminLayout from '../../components/layout/AdminLayout';
import styles from './ImportHistoryPage.module.css';

const MOCK_SLIPS = [
  { id: 1, date: '15/05/2024', code: 'PNK-2405-001', partner: 'Công ty TNHH Intel Việt Nam', warehouse: 'Kho Linh Kiện', total: '1,250,000,000 đ', status: 'Hoàn thành', statusCode: 'success' },
  { id: 2, date: '14/05/2024', code: 'PNK-2405-002', partner: 'Samsung Electronics VN', warehouse: 'Kho Thành Phẩm', total: '845,000,000 đ', status: 'Chờ duyệt', statusCode: 'warning' },
  { id: 3, date: '12/05/2024', code: 'PNK-2405-003', partner: 'Asus Global Trading', warehouse: 'Kho Linh Kiện', total: '320,000,000 đ', status: 'Hoàn thành', statusCode: 'success' },
  { id: 4, date: '11/05/2024', code: 'PNK-2405-004', partner: 'Logitech Distributor', warehouse: 'Kho Phụ Kiện', total: '35,000,000 đ', status: 'Đã hủy', statusCode: 'danger' },
];

function ImportHistoryPage() {

  const [selectedSlip, setSelectedSlip] = useState(MOCK_SLIPS[0]);

  return (
    <AdminLayout>
      <div className={styles.pageBody} style={{ padding: 0 }}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách hàng nhập</h1>
          <button className={styles.btnPrimary}>
            <i className="bi bi-plus"></i> Thêm mới
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <input type="date" className={styles.filterInput} />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ĐẾN NGÀY</span>
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

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NGÀY GHI NHẬN</th>
                <th>SỐ PHIẾU</th>
                <th>ĐỐI TÁC</th>
                <th>KHO HÀNG</th>
                <th className={styles.textRight}>TỔNG TIỀN</th>
                <th>TÌNH TRẠNG</th>
                <th className={styles.textCenter}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SLIPS.map(slip => (
                <tr key={slip.id} className={selectedSlip.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)}>
                  <td>{slip.date}</td>
                  <td><a href="#" className={styles.link} onClick={(e) => e.preventDefault()}>{slip.code}</a></td>
                  <td>{slip.partner}</td>
                  <td>{slip.warehouse}</td>
                  <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      slip.statusCode === 'success' ? styles.badgeSuccess :
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
                    <i className="bi bi-eye" style={{cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px'}}></i>
                  </td>
                </tr>
              ))}
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

      </div>
    </AdminLayout>
  );
}

export default ImportHistoryPage;
