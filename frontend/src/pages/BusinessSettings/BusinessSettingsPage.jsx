import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import { getBusinessSettings, saveBusinessSettings } from '../../api/businessSettingsApi';
import { loadCompanyProfile } from '../../hooks/useCompanyProfile';
import styles from './BusinessSettingsPage.module.css';

// Mức thuế GTGT hợp lệ 0% - 10% (backend kiểm tra cùng khoảng này cho thiết lập và cho từng dòng phiếu)
const MIN_VAT_RATE = 0;
const MAX_VAT_RATE = 10;
const DEFAULT_VAT_RATES_TEXT = '0, 5, 8, 10';

/** Tách chuỗi "0, 5, 8, 10": chỉ nhận số nguyên 0-10, trả về các mức hợp lệ (bỏ trùng, tăng dần) và các giá trị sai. */
function parseVatRates(text) {
  const tokens = String(text || '').split(',').map(s => s.trim()).filter(Boolean);
  const isValid = (token) => /^\d+$/.test(token) && Number(token) >= MIN_VAT_RATE && Number(token) <= MAX_VAT_RATE;
  return {
    rates: Array.from(new Set(tokens.filter(isValid).map(Number))).sort((a, b) => a - b),
    invalid: tokens.filter(token => !isValid(token)),
  };
}

const COMPANY_FIELDS = [
  'companyName', 'companyShortName', 'companySlogan', 'companyTaxCode', 'companyAddress',
  'companyPhone', 'companyEmail', 'companyWebsite', 'companyBankAccount',
];

const hintStyle = { color: 'var(--wms-text-muted)', fontSize: 12, marginTop: 4, display: 'block' };

function BusinessSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const [form, setForm] = useState({
    defaultVatRate: 8,
    allowedVatRatesStr: DEFAULT_VAT_RATES_TEXT,
    ...Object.fromEntries(COMPANY_FIELDS.map(field => [field, ''])),
  });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));
  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const { rates: vatRates, invalid: invalidVatRates } = useMemo(
    () => parseVatRates(form.allowedVatRatesStr),
    [form.allowedVatRatesStr]
  );

  const errors = useMemo(() => {
    const result = {};
    if (invalidVatRates.length > 0) {
      result.allowedVatRates = `Mức thuế không hợp lệ: ${invalidVatRates.join(', ')}. Chỉ nhập số nguyên từ ${MIN_VAT_RATE} đến ${MAX_VAT_RATE}.`;
    } else if (vatRates.length === 0) {
      result.allowedVatRates = 'Nhập ít nhất một mức thuế.';
    }
    if (!vatRates.includes(Number(form.defaultVatRate))) {
      result.defaultVatRate = 'Chọn mức thuế mặc định nằm trong danh sách mức thuế cho phép.';
    }
    if (!form.companyName.trim()) {
      result.companyName = 'Tên doanh nghiệp không được để trống.';
    }
    if (form.companyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail.trim())) {
      result.companyEmail = 'Email doanh nghiệp không hợp lệ.';
    }
    return result;
  }, [invalidVatRates, vatRates, form.defaultVatRate, form.companyName, form.companyEmail]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getBusinessSettings();
      const data = res?.data?.data || res?.data || {};
      setForm({
        defaultVatRate: data.defaultVatRate ?? 8,
        allowedVatRatesStr: data.allowedVatRates?.length ? data.allowedVatRates.join(', ') : DEFAULT_VAT_RATES_TEXT,
        ...Object.fromEntries(COMPANY_FIELDS.map(field => [field, data[field] || ''])),
      });
    } catch {
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
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      showToast('error', Object.values(errors)[0]);
      return;
    }
    try {
      setSaving(true);
      await saveBusinessSettings({
        defaultVatRate: Number(form.defaultVatRate),
        allowedVatRates: vatRates,
        ...Object.fromEntries(COMPANY_FIELDS.map(field => [field, form[field].trim()])),
      });
      // Mẫu in, xuất file, tên trên menu... dùng thông tin mới ngay, không cần tải lại trang
      await loadCompanyProfile({ force: true });
      showToast('success', 'Đã lưu thông tin doanh nghiệp thành công!');
      setSubmitted(false);
      await fetchSettings();
    } catch (err) {
      showToast('error', err?.response?.data?.userMessage || err?.response?.data?.message || 'Không thể lưu thông tin doanh nghiệp.');
    } finally {
      setSaving(false);
    }
  };

  // Lỗi thuế hiện ngay khi gõ; lỗi bỏ trống tên chỉ hiện sau khi bấm lưu
  const vatRatesError = errors.allowedVatRates;
  const defaultVatError = !vatRatesError && errors.defaultVatRate;
  const companyNameError = submitted && errors.companyName;
  const companyEmailError = submitted && errors.companyEmail;

  const defaultRateOptions = vatRates.includes(Number(form.defaultVatRate))
    ? vatRates
    : [Number(form.defaultVatRate), ...vatRates];

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
              Cấu hình thông tin đơn vị, mã số thuế và tài khoản ngân hàng. Thông tin này dùng chung cho toàn hệ thống:
              mẫu in phiếu, báo giá, hóa đơn điện tử, file Excel, email gửi khách và tên hiển thị trên giao diện.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--wms-text-muted)' }}>
            <i className="bi bi-arrow-repeat spin" style={{ marginRight: 8, fontSize: 18 }} />
            Đang tải dữ liệu...
          </div>
        ) : (
          <form onSubmit={handleSave} className={styles.container} noValidate>
            {/* Thiết lập Thuế (VAT) */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardHeaderTitle}>
                  <i className="bi bi-percent" style={{ color: '#0075c0', fontSize: 18 }} />
                  Thiết lập Thuế (VAT)
                </h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="allowedVatRates">Các mức thuế VAT cho phép (%)</label>
                    <input
                      id="allowedVatRates"
                      type="text"
                      inputMode="numeric"
                      className={`${styles.input} ${vatRatesError ? styles.inputInvalid : ''}`}
                      value={form.allowedVatRatesStr}
                      // Chỉ cho gõ chữ số, dấu phẩy và khoảng trắng: không nhập được số âm hay số lẻ
                      onChange={(e) => setForm(prev => ({ ...prev, allowedVatRatesStr: e.target.value.replace(/[^\d,\s]/g, '') }))}
                      placeholder="VD: 0, 5, 8, 10"
                      aria-invalid={Boolean(vatRatesError)}
                    />
                    {vatRatesError ? (
                      <small className={styles.errorText}>{vatRatesError}</small>
                    ) : (
                      <small style={hintStyle}>Số nguyên từ {MIN_VAT_RATE} đến {MAX_VAT_RATE}, cách nhau bằng dấu phẩy.</small>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="defaultVatRate">Mức thuế VAT mặc định (%)</label>
                    <select
                      id="defaultVatRate"
                      className={`${styles.input} ${defaultVatError ? styles.inputInvalid : ''}`}
                      value={form.defaultVatRate}
                      onChange={(e) => setForm(prev => ({ ...prev, defaultVatRate: Number(e.target.value) }))}
                    >
                      {defaultRateOptions.map(rate => (
                        <option key={rate} value={rate} disabled={!vatRates.includes(rate)}>
                          {rate}%{vatRates.includes(rate) ? '' : ' (không còn trong danh sách)'}
                        </option>
                      ))}
                    </select>
                    {defaultVatError ? (
                      <small className={styles.errorText}>{defaultVatError}</small>
                    ) : (
                      <small style={hintStyle}>Mức thuế tự động chọn khi thêm dòng hàng mới.</small>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
                  <label className={styles.label} htmlFor="companyName">
                    Tên doanh nghiệp <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    className={`${styles.input} ${companyNameError ? styles.inputInvalid : ''}`}
                    value={form.companyName}
                    onChange={setField('companyName')}
                    placeholder="Tên công ty xuất hóa đơn..."
                    aria-invalid={Boolean(companyNameError)}
                  />
                  {companyNameError ? (
                    <small className={styles.errorText}>{companyNameError}</small>
                  ) : (
                    <small style={hintStyle}>Tên pháp lý, in trên hóa đơn điện tử, phiếu thu chi, biên bản kiểm kê và file Excel.</small>
                  )}
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="companyShortName">Tên hiển thị / thương hiệu</label>
                    <input
                      id="companyShortName"
                      type="text"
                      className={styles.input}
                      value={form.companyShortName}
                      onChange={setField('companyShortName')}
                      placeholder="VD: Duy Long Computer"
                    />
                    <small style={hintStyle}>Hiện trên menu, màn đăng nhập, đầu các mẫu in và email. Để trống sẽ dùng tên doanh nghiệp.</small>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="companySlogan">Dòng phụ dưới tên (mẫu in)</label>
                    <input
                      id="companySlogan"
                      type="text"
                      className={styles.input}
                      value={form.companySlogan}
                      onChange={setField('companySlogan')}
                      placeholder="VD: Since 2003"
                    />
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="companyTaxCode">Mã số thuế (MST)</label>
                    <input
                      id="companyTaxCode"
                      type="text"
                      className={styles.input}
                      value={form.companyTaxCode}
                      onChange={setField('companyTaxCode')}
                      placeholder="Mã số thuế doanh nghiệp..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="companyPhone">Số điện thoại</label>
                    <input
                      id="companyPhone"
                      type="text"
                      className={styles.input}
                      value={form.companyPhone}
                      onChange={setField('companyPhone')}
                      placeholder="Số điện thoại liên hệ..."
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="companyAddress">Địa chỉ trụ sở</label>
                  <input
                    id="companyAddress"
                    type="text"
                    className={styles.input}
                    value={form.companyAddress}
                    onChange={setField('companyAddress')}
                    placeholder="Địa chỉ xuất hóa đơn..."
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="companyEmail">Email liên hệ</label>
                    <input
                      id="companyEmail"
                      type="email"
                      className={`${styles.input} ${companyEmailError ? styles.inputInvalid : ''}`}
                      value={form.companyEmail}
                      onChange={setField('companyEmail')}
                      placeholder="Email nhận thông báo..."
                      aria-invalid={Boolean(companyEmailError)}
                    />
                    {companyEmailError && <small className={styles.errorText}>{companyEmailError}</small>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="companyWebsite">Website</label>
                    <input
                      id="companyWebsite"
                      type="text"
                      className={styles.input}
                      value={form.companyWebsite}
                      onChange={setField('companyWebsite')}
                      placeholder="VD: maytinhduylong.vn"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="companyBankAccount">Số tài khoản ngân hàng</label>
                  <input
                    id="companyBankAccount"
                    type="text"
                    className={styles.input}
                    value={form.companyBankAccount}
                    onChange={setField('companyBankAccount')}
                    placeholder="Số tài khoản - Tên ngân hàng..."
                  />
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
