import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './UpdateImportSlipPage.module.css';

function UpdateImportSlipPage() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => navigate('/import-history')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <h1 className={styles.pageTitle}>Sửa phiếu nhập kho</h1>
        </div>

        <div className={styles.topGrid}>
          {/* Thông tin chung */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <i className={`bi bi-info-circle ${styles.cardIcon}`}></i>
                Thông tin chung
              </h2>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mã nhà cung cấp</label>
                <input type="text" className={styles.formInput} defaultValue="KH-2024-089" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên nhà cung cấp</label>
                <input type="text" className={styles.formInput} defaultValue="Công ty TNHH Giải pháp Công nghệ Việt" />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Địa chỉ</label>
                <input type="text" className={styles.formInput} defaultValue="123 Đường Láng, Quận Đống Đa, Hà Nội" />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: '0 0 calc(50% - 10px)' }}>
                <label className={styles.formLabel}>Nhân viên bán hàng</label>
                <input type="text" className={styles.formInput} defaultValue="NV-TRUNGNT" />
              </div>
            </div>

            <div className={styles.formRow} style={{ marginBottom: 0 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Lý do xuất</label>
                <textarea className={styles.formInput} defaultValue="Xuất hàng theo hợp đồng số HD-99281-VTS ký ngày 15/10" />
              </div>
            </div>
          </div>

          {/* Thông tin chứng từ */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <i className={`bi bi-file-earmark-text ${styles.cardIcon}`}></i>
                Thông tin chứng từ
              </h2>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ngày ghi nhận</label>
                <input type="text" className={styles.formInput} defaultValue="10/27/2023" />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Số phiếu</label>
                <div className={styles.voucherValueBox}>PNK-20231027-004</div>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Liên kết liên quan</label>
                <a href="#" className={styles.linkItem} onClick={e => e.preventDefault()}>
                  <i className="bi bi-link-45deg"></i> Đơn hàng: SO-2023-1022
                </a>
              </div>
            </div>

            <div className={styles.formRow} style={{ marginBottom: 0 }}>
              <div className={styles.formGroup}>
                <div className={styles.attachmentBox}>
                  <i className="bi bi-paperclip"></i> Đính kèm chứng từ...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng hàng hóa */}
        <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div className={styles.cardHeader} style={{ padding: '24px 24px 20px', margin: 0 }}>
            <h2 className={styles.cardTitle}>
              <i className={`bi bi-box-seam ${styles.cardIcon}`}></i>
              Bảng hàng hóa
            </h2>
            <button className={styles.btnOutline}>
              <i className="bi bi-download"></i> Nhập từ Excel
            </button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.textCenter} style={{ width: '40px' }}>#</th>
                  <th>Mã hàng</th>
                  <th style={{ minWidth: '150px' }}>Tên hàng</th>
                  <th>Kho</th>
                  <th>Serial Number</th>
                  <th>ĐVT</th>
                  <th>Bảo hành</th>
                  <th className={styles.textCenter} style={{ width: '100px' }}>Số lượng</th>
                  <th className={styles.textRight}>Đơn giá nhập</th>
                  <th className={styles.textRight}>Thành tiền</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.textCenter}>1</td>
                  <td className={styles.boldText}>CPU-I9-14900K</td>
                  <td>Intel Core<br/>i9-14900K<br/>Processor</td>
                  <td>
                    <div className={styles.dropdownSelect}>
                      <select className={styles.tableSelect}>
                        <option>Kho chính</option>
                      </select>
                      <button className={styles.addBtn}><i className="bi bi-plus"></i></button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.serialBlock}>
                      <div className={styles.serialHeader}>
                        <span className={styles.badgeSuccess}>5/5 SNs</span>
                        <span className={styles.linkText}>Quản lý<br/>Serial</span>
                      </div>
                      <div className={styles.serialTags}>
                        <span className={styles.tag}>SN82..32</span>
                        <span className={styles.tag}>+4 khác</span>
                      </div>
                    </div>
                  </td>
                  <td>Cái</td>
                  <td>36<br/>tháng</td>
                  <td><input type="text" className={`${styles.tableInput} ${styles.textCenter}`} defaultValue="5" /></td>
                  <td><input type="text" className={`${styles.tableInput} ${styles.textRight}`} defaultValue="14.500.000" /></td>
                  <td className={`${styles.textRight} ${styles.boldText}`}>72.500.000</td>
                  <td><button className={styles.deleteBtn}><i className="bi bi-trash"></i></button></td>
                </tr>
                <tr>
                  <td className={styles.textCenter}>2</td>
                  <td className={styles.boldText}>RAM-COR-64G</td>
                  <td>Corsair<br/>Vengeance<br/>RGB 64GB<br/>DDR5<br/>6000MHz</td>
                  <td>
                    <div className={styles.dropdownSelect}>
                      <select className={styles.tableSelect}>
                        <option>Kho chính</option>
                      </select>
                      <button className={styles.addBtn}><i className="bi bi-plus"></i></button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.serialBlock}>
                      <div className={styles.serialHeader}>
                        <span className={styles.badgeDanger}>3/10 SNs</span>
                        <span className={styles.linkText}>Quản lý<br/>Serial</span>
                      </div>
                      <span className={styles.warningText}>Thiếu 7 Serial<br/>Number</span>
                    </div>
                  </td>
                  <td>Bộ</td>
                  <td>12<br/>tháng</td>
                  <td><input type="text" className={`${styles.tableInput} ${styles.textCenter}`} defaultValue="10" /></td>
                  <td><input type="text" className={`${styles.tableInput} ${styles.textRight}`} defaultValue="5.200.000" /></td>
                  <td className={`${styles.textRight} ${styles.boldText}`}>52.000.000</td>
                  <td><button className={styles.deleteBtn}><i className="bi bi-trash"></i></button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <span style={{ marginRight: '32px' }}>Tổng cộng hàng nhập:</span>
            <span style={{ width: '80px', textAlign: 'center', marginRight: '64px' }}>15</span>
            <span style={{ color: 'var(--color-primary)' }}>124.500.000</span>
          </div>

          <div className={styles.tableActions}>
            <span className={styles.actionLink}><i className="bi bi-plus-circle"></i> Thêm dòng mới</span>
            <span className={styles.actionLinkGray}><i className="bi bi-plus"></i> Thêm nhanh từ danh mục</span>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className={styles.stickyFooter}>
          <div className={styles.footerLeft}>
            <button className={styles.btnDefault} onClick={() => navigate('/import-history')}>Hủy bỏ</button>
            <span className={styles.historyLink}><i className="bi bi-clock-history"></i> Xem nhật ký thay đổi</span>
          </div>
          <div className={styles.footerRight}>
            <button className={styles.btnOutline} style={{ color: 'var(--color-primary)' }}>Lưu tạm</button>
            <button className={styles.btnSuccess}><i className="bi bi-save"></i> Lưu lại</button>
            <button className={styles.btnPrimary}><i className="bi bi-printer"></i> Lưu và In</button>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

export default UpdateImportSlipPage;
