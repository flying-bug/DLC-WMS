import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './CreateImportSlipPage.module.css';
import ManageSerialModal from './ManageSerialModal';

function CreateImportSlipPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const [items, setItems] = useState([
    {
      id: 1,
      code: "CPU-I9-14900K",
      name: "Intel Core i9-14900K Processor",
      warehouse: "Kho chính",
      serials: ["SN-2024-0091-8273-A", "SN-2024-0091-8273-B", "SN-2024-0091-8273-C", "SN-2024-0091-8273-D", "SN-2024-0091-8273-E"],
      unit: "Cái",
      warranty: "36 tháng",
      quantity: 5,
      price: 14500000
    },
    {
      id: 2,
      code: "RAM-COR-64G",
      name: "Corsair Vengeance RGB 64GB DDR5 6000MHz",
      warehouse: "Kho chính",
      serials: ["SN-RAM-001", "SN-RAM-002", "SN-RAM-003"],
      unit: "Bộ",
      warranty: "12 tháng",
      quantity: 10,
      price: 5200000
    }
  ]);

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSerialUpdate = (id, newSerials) => {
    setItems(items.map(item => item.id === id ? { ...item, serials: newSerials } : item));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
  const isFormValid = items.length > 0 && items.every(item => item.serials.length === Number(item.quantity));

  const openSerialModal = (item) => {
    setModalData({ 
      itemId: item.id,
      productName: `${item.code} (${item.name})`, 
      targetQuantity: Number(item.quantity), 
      initialSerials: item.serials 
    });
    setIsModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody} style={{ padding: 0 }}>
        <div className={styles.scrollableContent}>
          <div className={styles.pageHeader}>
            <a
              href="#"
              className={styles.backLink}
              onClick={(e) => {
                e.preventDefault();
                navigate('/import-history');
              }}
            >
              <i className="bi bi-arrow-left"></i> Phiếu Nhập Kho PNK001
            </a>
          </div>

          <div className={styles.topGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chung</h3>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mã nhà cung cấp</label>
                  <div className={styles.inputGroup}>
                    <input type="text" className={`${styles.input} ${styles.inputWithAppend}`} defaultValue="KH-2024-089" />
                    <button className={styles.btnAppend}><i className="bi bi-plus"></i></button>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tên nhà cung cấp</label>
                  <div className={styles.inputReadonly}>Công ty TNHH Giải pháp Công nghệ Việt</div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Địa chỉ</label>
                  <div className={styles.inputReadonly}>123 Đường Láng, Quận Đống Đa, Hà Nội</div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nhân viên bán hàng</label>
                  <div className={styles.inputGroup}>
                    <input type="text" className={`${styles.input} ${styles.inputWithAppend}`} defaultValue="NV-TRUNGNT" />
                    <button className={styles.btnAppend}><i className="bi bi-plus"></i></button>
                  </div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Lý do nhập</label>
                  <textarea className={styles.textarea} defaultValue="Nhập hàng theo hợp đồng số HD-99281-VTS ký ngày 15/10"></textarea>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-file-earmark-text text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chứng từ</h3>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Ngày ghi nhận</label>
                <input type="text" className={styles.input} defaultValue="10/27/2023" />
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Số phiếu</label>
                <div className={`${styles.inputReadonly} ${styles.inputReadonlyText}`}>PNK001</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Chứng Từ Tham Chiếu</label>
                <div className={styles.linksBox}>
                  <a href="#" className={styles.linkItem}><i className="bi bi-link-45deg"></i> Phiếu Xuất: PXN003</a>
                  <div className={styles.linkItemAdd}><i className="bi bi-paperclip"></i> Đính kèm chứng từ...</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-box-seam text-gray-500"></i>
              <h3 className={styles.cardTitle}>Bảng hàng hóa</h3>
              <div className={styles.cardHeaderRight}>
                <button className={styles.btnOutlineBlue}>
                  <i className="bi bi-download"></i> Nhập từ Excel
                </button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mã hàng</th>
                    <th>Tên hàng</th>
                    <th>Kho</th>
                    <th>Serial Number</th>
                    <th>ĐVT</th>
                    <th>Bảo hành</th>
                    <th style={{ textAlign: 'right' }}>Số lượng</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá nhập</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const isSerialOk = item.serials.length === Number(item.quantity);
                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td className={styles.textBold}>{item.code}</td>
                        <td>{item.name}</td>
                        <td>
                          <div className={styles.flexCenter}>
                            {item.warehouse} <i className="bi bi-chevron-down" style={{ fontSize: '10px', color: '#666' }}></i>
                            <button className={styles.miniBtnAppend} style={{ marginLeft: '4px' }}><i className="bi bi-plus"></i></button>
                          </div>
                        </td>
                        <td>
                          <div className={styles.serialCellContainer}>
                            <button 
                              className={isSerialOk ? styles.serialBadgeSuccess : styles.serialBadgeWarning}
                              onClick={() => openSerialModal(item)}
                            >
                              <i className={isSerialOk ? "bi bi-check-circle" : "bi bi-exclamation-triangle"}></i> 
                              {item.serials.length}/{item.quantity} Serial
                            </button>
                            <span className={styles.serialSubtext}>
                              {isSerialOk ? 'Đã nhập đủ' : `Thiếu ${Number(item.quantity) - item.serials.length} Serial Number`}
                            </span>
                          </div>
                        </td>
                        <td>{item.unit}</td>
                        <td>{item.warranty}</td>
                        <td align="right">
                          <input 
                            type="number" 
                            className={styles.tableInput} 
                            value={item.quantity} 
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          />
                        </td>
                        <td align="right">
                          <input 
                            type="number" 
                            className={`${styles.tableInput} ${styles.tableInputWide}`} 
                            value={item.price} 
                            onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                          />
                        </td>
                        <td align="right" className={`${styles.textBold} ${styles.textBlue}`}>
                          {(Number(item.quantity) * Number(item.price)).toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          <button className={styles.iconBtnDanger} onClick={() => removeItem(item.id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                        Chưa có hàng hóa nào. Vui lòng thêm từ danh mục.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className={styles.tableFooter}>
                <span>Tổng cộng hàng nhập:</span>
                <span>{totalQuantity}</span>
                <span className={styles.textBlue}>{totalPrice.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className={styles.tableActions}>
                <a className={styles.actionLink}><i className="bi bi-plus-circle"></i> Thêm dòng mới</a>
                <a className={styles.actionLinkGray}><i className="bi bi-list-ul"></i> Thêm nhanh từ danh mục</a>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fixedFooter}>
          <div className={styles.footerLeft}>
            <button className={styles.btnDefault}>Hủy bỏ</button>
            <button className={styles.btnTextBlue}>
              <i className="bi bi-clock-history"></i> Xem nhật ký thay đổi
            </button>
          </div>
          <div className={styles.footerRight}>
            <button className={styles.btnOutlinePrimary}>Lưu tạm</button>
            <button 
              className={styles.btnSuccess} 
              style={{ opacity: isFormValid ? 1 : 0.5, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
              disabled={!isFormValid}
            >
              <i className="bi bi-save"></i> Lưu lại
            </button>
            <button className={styles.btnPrimary}>
              <i className="bi bi-printer"></i> Lưu và In
            </button>
          </div>
        </div>

      </div>

      {isModalOpen && modalData && (
        <ManageSerialModal 
          isOpen={isModalOpen}
          onClose={(updatedSerials) => {
            if (Array.isArray(updatedSerials)) {
              handleSerialUpdate(modalData.itemId, updatedSerials);
            }
            setIsModalOpen(false);
          }}
          productName={modalData.productName}
          targetQuantity={modalData.targetQuantity}
          initialSerials={modalData.initialSerials}
        />
      )}
    </AdminLayout>
  );
}

export default CreateImportSlipPage;
