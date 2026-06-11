import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [selectedSlip, setSelectedSlip] = useState(MOCK_SLIPS[0]);

  return (
    <div className={styles.pageLayout}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandName}>DUY LONG COMPUTER</div>
          <div className={styles.brandSub}>Hệ thống Quản lý kho</div>
        </div>
        <div className={styles.menu}>
          <div className={styles.menuItem} onClick={() => navigate('/dashboard')}><i className={`bi bi-grid ${styles.menuIcon}`}></i> Bảng điều khiển</div>
          <div className={`${styles.menuItem} ${styles.menuItemActive}`}><i className={`bi bi-box-seam ${styles.menuIcon}`}></i> Kho hàng</div>
          <div className={styles.menuItem}><i className={`bi bi-cart ${styles.menuIcon}`}></i> Đơn hàng</div>
          <div className={styles.menuItem}><i className={`bi bi-bar-chart ${styles.menuIcon}`}></i> Báo cáo</div>
          <div className={styles.menuItem} onClick={() => navigate('/users')}><i className={`bi bi-people ${styles.menuIcon}`}></i> Người dùng</div>
          <div className={styles.menuItem}><i className={`bi bi-gear ${styles.menuIcon}`}></i> Cấu hình hệ thống</div>
          <div className={styles.menuItem}><i className={`bi bi-shield-check ${styles.menuIcon}`}></i> Bảo mật</div>
          <div className={styles.menuItem}><i className={`bi bi-trash ${styles.menuIcon}`}></i> Thùng rác</div>
        </div>
        <div className={styles.sidebarFooter} onClick={() => navigate('/login')}>
          <i className={`bi bi-box-arrow-right ${styles.menuIcon}`}></i> Đăng xuất
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Header */}
        <div className={styles.topHeader}>
          <div className={styles.headerSearch}>
            <i className="bi bi-search"></i>
            <input type="text" placeholder="Tìm kiếm chứng từ..." />
          </div>
          <div className={styles.headerRight}>
            <button className={styles.iconBtn}><i className="bi bi-bell"></i></button>
            <button className={styles.iconBtn}><i className="bi bi-question-circle"></i></button>
            <div className={styles.userInfo}>
              <img src="https://ui-avatars.com/api/?name=Admin+User&background=0075c0&color=fff" className={styles.avatar} alt="Admin" />
              <span className={styles.userName}>Admin User</span>
              <i className="bi bi-chevron-down" style={{fontSize: '12px'}}></i>
            </div>
          </div>
        </div>

        {/* Sub Nav */}
        <div className={styles.subNav}>
          <div className={styles.subNavItem}>Quy trình</div>
          <div className={styles.subNavItem}>Biểu đồ</div>
          <div className={styles.subNavItem}>Nhập kho</div>
          <div className={`${styles.subNavItem} ${styles.subNavItemActive}`}>Xuất kho</div>
          <div className={styles.subNavItem}>Chuyển kho</div>
          <div className={styles.subNavItem}>Kiểm kê</div>
          <div className={styles.subNavItem}>Báo cáo</div>
          <div className={styles.subNavItem}>Hàng hóa, dịch vụ</div>
        </div>

        {/* Page Body */}
        <div className={styles.pageBody}>
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
                      <i className="bi bi-eye" style={{cursor: 'pointer', color: '#666', fontSize: '16px'}}></i>
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
      </div>
    </div>
  );
}

export default ExportSlipPage;
