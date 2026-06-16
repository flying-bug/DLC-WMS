import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './UpdateExportSlipPage.module.css';

const MOCK_ITEMS = [
  { id: 1, sku: 'SKU-8821', name: 'Laptop Dell XPS 15', warehouse: 'Kho chính', costAccount: '632', stockAccount: '1561', unit: 'Cái', warranty: '12 tháng', qty: 2, price: '32.000.000', total: '64.000.000' },
  { id: 2, sku: 'SKU-1029', name: 'Màn hình LG 27UL850', warehouse: 'Kho chính', costAccount: '632', stockAccount: '1561', unit: 'Cái', warranty: '24 tháng', qty: 5, price: '8.500.000', total: '42.500.000' },
];

function UpdateExportSlipPage() {
  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {/* Top Section */}
        <div className={styles.topSection}>
          {/* General Info Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-person-fill"></i> Thông tin chung
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mã khách hàng</label>
                  <div className={styles.inputWrapper}>
                    <input type="text" className={styles.input} placeholder="Nhập mã KH..." />
                    <button className={styles.iconBtn}><i className="bi bi-plus-lg"></i></button>
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tên khách hàng</label>
                  <div className={styles.inputWrapper}>
                    <input type="text" className={styles.input} placeholder="Nhập tên khách hàng" />
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Địa chỉ</label>
                  <div className={styles.inputWrapper}>
                    <input type="text" className={styles.input} placeholder="Số nhà, đường, quận/huyện..." />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nhân viên bán hàng</label>
                  <div className={styles.inputWrapper}>
                    <input type="text" className={styles.input} placeholder="" />
                    <button className={styles.iconBtn}><i className="bi bi-plus-lg"></i></button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Mục đích xuất kho</label>
                  <div className={styles.inputWrapper}>
                    <select className={styles.select}>
                      <option value="1">1. Bán hàng</option>
                      <option value="2">2. Xuất trả nhà cung cấp</option>
                      <option value="3">3. Khác</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Lý do xuất</label>
                  <div className={styles.inputWrapper}>
                    <input type="text" className={styles.input} placeholder="Ví dụ: Xuất bán cho khách hàng lẻ" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Info Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-file-earmark-text-fill"></i> Thông tin chứng từ
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGroup} style={{marginBottom: '16px'}}>
                <label className={styles.label}>Ngày ghi nhận</label>
                <div className={styles.inputWrapper}>
                  <input type="text" className={styles.input} placeholder="dd/mm/yyyy" />
                </div>
              </div>

              <div className={styles.formGroup} style={{marginBottom: '16px'}}>
                <label className={styles.label}>Số phiếu</label>
                <div className={styles.inputWrapper}>
                  <input type="text" className={styles.input} placeholder="Tự động sinh" disabled />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Liên kết liên quan</label>
                <div className={styles.linkBox}>
                  <a href="#" className={styles.linkText} onClick={(e) => e.preventDefault()}>
                    <i className="bi bi-link-45deg"></i> Gắn kèm Hợp đồng
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className={styles.card}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>Bảng hàng tiền</div>
            <button className={styles.btnAddRow}>
              <i className="bi bi-plus-lg"></i> Thêm dòng
            </button>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.textCenter}>#</th>
                  <th>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th>Kho</th>
                  <th>TK Chi phí</th>
                  <th>TK Kho</th>
                  <th>ĐVT</th>
                  <th>Thời gian bảo hành</th>
                  <th className={styles.textRight}>Số lượng</th>
                  <th className={styles.textRight}>Đơn giá</th>
                  <th className={styles.textRight}>Thành tiền</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ITEMS.map((item, index) => (
                  <tr key={item.id}>
                    <td className={styles.textCenter}>{index + 1}</td>
                    <td className={styles.textBlue}>{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{item.warehouse}</td>
                    <td>{item.costAccount}</td>
                    <td>{item.stockAccount}</td>
                    <td>{item.unit}</td>
                    <td>{item.warranty}</td>
                    <td className={styles.textRight}>{item.qty}</td>
                    <td className={styles.textRight}>{item.price}</td>
                    <td className={`${styles.textRight} ${styles.textBlue}`}>{item.total}</td>
                    <td className={styles.textCenter}>
                      <i className={`bi bi-trash ${styles.textRed}`}></i>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className={styles.textCenter}>...</td>
                  <td colSpan="11">
                    <span className={styles.emptyRowText}>
                      <i className="bi bi-plus-circle"></i> Click để thêm hàng hóa mới...
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span>Tổng số lượng:</span>
                <span>07</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Tổng tiền hàng:</span>
                <span>106.500.000 VNĐ</span>
              </div>
              <div className={styles.summaryTotal}>
                <span>Tổng cộng:</span>
                <span className={styles.totalValue}>106.500.000</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className={styles.bottomBar}>
        <button className={styles.attachmentBtn}>
          <i className="bi bi-paperclip" style={{fontSize: '18px'}}></i> Đính kèm (0)
        </button>
        <div className={styles.actionButtons}>
          <button className={styles.btnCancel}>Hủy</button>
          <button className={styles.btnDraft}>
            <i className="bi bi-save"></i> Lưu tạm
          </button>
          <button className={styles.btnSave}>
            <i className="bi bi-check-circle"></i> Lưu lại
          </button>
          <button className={styles.btnSavePrint}>
            <i className="bi bi-printer"></i> Lưu và In
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default UpdateExportSlipPage;
