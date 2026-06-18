import { useState } from 'react';

import AdminLayout from '../../components/layout/AdminLayout';
import styles from './ExportSlipPage.module.css';

const MOCK_SLIPS = [
  { id: 1, date: '15/05/2024', code: 'XK-2024-0012', desc: 'Xuất kho linh kiện PC phòng máy A', total: '124,500,000 đ', receiver: 'Nguyễn Văn An', status: 'Hoàn thành', statusCode: 'success' },
  { id: 2, date: '15/05/2024', code: 'XK-2024-0013', desc: 'Xuất bảo hành màn hình Dell', total: '15,200,000 đ', receiver: 'Trần Thị Bích', status: 'Đang xuất', statusCode: 'info' },
  { id: 3, date: '14/05/2024', code: 'XK-2024-0014', desc: 'Bán IP bàn phím cơ chi nhánh 2', total: '4,550,000 đ', receiver: 'Lê Hoàng Cường', status: 'Chờ duyệt', statusCode: 'warning' },
  { id: 4, date: '13/05/2024', code: 'XK-2024-0015', desc: 'Lùi đơn hàng - khách hủy', total: '8,900,000 đ', receiver: 'Phạm Đình Duy', status: 'Đã hủy', statusCode: 'danger' },
];

const MOCK_DETAIL = {
  customer: 'Công ty TNHH Thương mại Dịch vụ ABC',
  reason: 'Xuất kho linh kiện PC phòng máy A',
  receiver: 'Nguyễn Văn An',
  description: 'Thay thế linh kiện bảo trì định kỳ',
  date: '15/05/2024',
  warehouse: 'Kho Tổng (K01)',
  creator: 'Admin User',
  items: [
    { code: 'SP-RAM-008', name: 'RAM DDR4 8GB Kingston', unit: 'Thanh', qty: 10, price: '850,000', total: '8,500,000' },
    { code: 'SP-SSD-512', name: 'SSD Samsung 980 Pro 512GB', unit: 'Chiếc', qty: 5, price: '2,200,000', total: '11,000,000' }
  ]
};

function ExportSlipPage() {

  const [selectedSlip, setSelectedSlip] = useState(MOCK_SLIPS[0]);

  return (
    <AdminLayout>
      <div className={styles.pageBody} style={{ padding: 0 }}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sách phiếu xuất kho</h1>
          <button className={styles.btnPrimary}>
            <i className="bi bi-plus"></i> Thêm mới
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <input type="date" className={styles.filterInput} defaultValue="2024-01-01" />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>ĐẾN NGÀY</span>
              <input type="date" className={styles.filterInput} defaultValue="2024-12-31" />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TRẠNG THÁI PHIẾU</span>
              <select className={styles.filterSelect}>
                <option>Tất cả</option>
                <option>Hoàn thành</option>
                <option>Đang xuất</option>
                <option>Chờ duyệt</option>
                <option>Đã hủy</option>
              </select>
            </div>
          </div>
          <button className={styles.btnOutline}>
            <i className="bi bi-funnel"></i> Lọc thêm
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{width: '40px'}}><input type="checkbox" /></th>
                <th>NGÀY HẠCH TOÁN</th>
                <th>SỐ CHỨNG TỪ</th>
                <th>DIỄN GIẢI</th>
                <th className={styles.textRight}>TỔNG TIỀN</th>
                <th>NGƯỜI NHẬN</th>
                <th>TRẠNG THÁI</th>
                <th className={styles.textCenter}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SLIPS.map(slip => (
                <tr key={slip.id} className={selectedSlip.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)}>
                  <td><input type="checkbox" /></td>
                  <td>{slip.date}</td>
                  <td><a href="#" className={styles.link} onClick={(e) => e.preventDefault()}>{slip.code}</a></td>
                  <td>{slip.desc}</td>
                  <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>
                  <td>{slip.receiver}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      slip.statusCode === 'success' ? styles.badgeSuccess :
                      slip.statusCode === 'info' ? styles.badgeInfo :
                      slip.statusCode === 'warning' ? styles.badgeWarning :
                      styles.badgeDanger
                    }`}>{slip.status}</span>
                  </td>
                  <td className={styles.textCenter}>
                    <i className="bi bi-eye" style={{cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px'}}></i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <span>Hiển thị 1-4 trên tổng số 120 bản ghi</span>
            <div className={styles.pageControls}>
              <button className={styles.pageBtn}>
                <i className="bi bi-chevron-left"></i> Trang 1 / 30 <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        {selectedSlip && selectedSlip.id === 1 && (
          <div className={styles.detailSection}>
            <div className={styles.detailHeader}>
              <i className={`bi bi-receipt ${styles.detailIcon}`}></i>
              <h2 className={styles.detailTitle}>Chi tiết Phiếu xuất kho: {selectedSlip.code}</h2>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailGroup}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>KHÁCH HÀNG / ĐỐI TƯỢNG</span>
                  <span className={styles.detailValue}>{MOCK_DETAIL.customer}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>LÝ DO XUẤT</span>
                  <span className={styles.detailValue}>{MOCK_DETAIL.reason}</span>
                </div>
              </div>

              <div className={styles.detailGroup}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>NGƯỜI NHẬN HÀNG</span>
                  <span className={styles.detailValue}>{MOCK_DETAIL.receiver}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>DIỄN GIẢI</span>
                  <span className={styles.detailValue}>{MOCK_DETAIL.description}</span>
                </div>
              </div>

              <div className={styles.detailRight}>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Ngày chứng từ</span>
                  <span className={styles.detailRightValue}>{MOCK_DETAIL.date}</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Kho xuất</span>
                  <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{MOCK_DETAIL.warehouse}</span>
                </div>
                <div className={styles.detailRightRow}>
                  <span className={styles.detailRightLabel}>Nhân viên lập</span>
                  <span className={styles.detailRightValue}>{MOCK_DETAIL.creator}</span>
                </div>
              </div>
            </div>

            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th>ĐVT</th>
                  <th className={styles.textRight}>Số lượng</th>
                  <th className={styles.textRight}>Đơn giá</th>
                  <th className={styles.textRight}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DETAIL.items.map((item, idx) => (
                  <tr key={idx}>
                    <td><a href="#" className={styles.link} onClick={(e) => e.preventDefault()}>{item.code}</a></td>
                    <td>{item.name}</td>
                    <td>{item.unit}</td>
                    <td className={styles.textRight}>{item.qty}</td>
                    <td className={styles.textRight}>{item.price}</td>
                    <td className={`${styles.textRight} ${styles.money}`}>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.detailFooter}>
              <div className={styles.footerTotalLabel}>Tổng cộng:</div>
              <div className={styles.footerQty}>15</div>
              <div className={styles.footerMoney}>19,500,000 đ</div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

export default ExportSlipPage;
