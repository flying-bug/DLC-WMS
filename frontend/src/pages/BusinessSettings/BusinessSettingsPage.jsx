import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import { getBusinessSettings, saveBusinessSettings } from '../../api/businessSettingsApi';
import styles from './BusinessSettingsPage.module.css';

function BusinessSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const [form, setForm] = useState({
    companyName: '',
    companyTaxCode: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyBankAccount: '',
  });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getBusinessSettings();
      const data = res?.data?.data || res?.data || {};
      setForm({
        companyName: data.companyName || '',
        companyTaxCode: data.companyTaxCode || '',
        companyAddress: data.companyAddress || '',
        companyPhone: data.companyPhone || '',
        companyEmail: data.companyEmail || '',
        companyBankAccount: data.companyBankAccount || '',
      });
    } catch (err) {
      showToast('error', 'Không thể tải thông tin doanh nghiệp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await saveBusinessSettings(form);
      showToast('success', 'Đã lưu thông tin doanh nghiệp thành công!');
    } catch (err) {
      showToast('error', err?.response?.data?.userMessage || 'Không thể lưu thông tin doanh nghiệp.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.breadcrumb}>
              <span>Hệ thống</span>
              <i className="bi bi-chevron-right" style={{ fontSize: 11 }} />
              <span style={{ color: '#0075c0', fontWeight: 600 }}>Thông tin doanh nghiệp</span>
            </div>
            <h1 className={styles.pageTitle}>
              <i className="bi bi-building" />
              Thông tin Doanh nghiệp
            </h1>
            <p className={styles.pageSubtitle}>
              Cấu hình thông tin đơn vị, mã số thuế và tài khoản ngân hàng phục vụ xuất hóa đơn và chứng từ.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="bi bi-arrow-repeat spin" style={{ marginRight: 8, fontSize: 18 }} />
            Đang tải dữ liệu...
          </div>
        ) : (
          <form onSubmit={handleSave} className={styles.container}>
            {/* Thông tin doanh nghiệp */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardHeaderTitle}>
                  <i className="bi bi-building" style={{ color: '#0075c0', fontSize: 18 }} />
                  Thông tin Doanh nghiệp &amp; Xuất hóa đơn
                </h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tên doanh nghiệp</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.companyName}
                    onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Tên công ty xuất hóa đơn..."
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Mã số thuế (MST)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={form.companyTaxCode}
                      onChange={(e) => setForm(prev => ({ ...prev, companyTaxCode: e.target.value }))}
                      placeholder="Mã số thuế doanh nghiệp..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Số điện thoại</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={form.companyPhone}
                      onChange={(e) => setForm(prev => ({ ...prev, companyPhone: e.target.value }))}
                      placeholder="Số điện thoại liên hệ..."
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Địa chỉ trụ sở</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.companyAddress}
                    onChange={(e) => setForm(prev => ({ ...prev, companyAddress: e.target.value }))}
                    placeholder="Địa chỉ xuất hóa đơn..."
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email liên hệ</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={form.companyEmail}
                      onChange={(e) => setForm(prev => ({ ...prev, companyEmail: e.target.value }))}
                      placeholder="Email nhận thông báo..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Số tài khoản ngân hàng</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={form.companyBankAccount}
                      onChange={(e) => setForm(prev => ({ ...prev, companyBankAccount: e.target.value }))}
                      placeholder="Số tài khoản - Tên ngân hàng..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className={styles.actionBar}>
              <button
                type="submit"
                className={styles.btnSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="bi bi-hourglass-split" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-floppy-fill" />
                    Lưu thiết lập
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={hideToast}
      />
    </AdminLayout>
  );
}

export default BusinessSettingsPage;
