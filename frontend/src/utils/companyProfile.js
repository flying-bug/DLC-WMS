// Thông tin doanh nghiệp (Thiết lập nghiệp vụ > Thông tin doanh nghiệp) dùng chung cho mẫu in, xuất Excel và giao diện.
// Mẫu in chạy đồng bộ (mở cửa sổ in ngay khi bấm để trình duyệt không chặn popup) nên đọc từ bộ nhớ đệm này;
// bộ nhớ đệm được nạp khi vào hệ thống (hooks/useCompanyProfile) và cập nhật ngay khi lưu thiết lập.
// File này không gọi API để các hàm in / xuất file dùng được cả khi chạy test bằng node.

// Trùng giá trị mặc định ở backend (SystemSettingsService) - chỉ dùng khi chưa tải được thông tin từ máy chủ.
export const DEFAULT_COMPANY_PROFILE = Object.freeze({
    name: 'Công ty TNHH Công nghệ Thương mại Duy Long Techcom',
    shortName: 'Duy Long Computer',
    slogan: 'Since 2003',
    taxCode: '0109123456',
    address: 'Tầng 1, số 42 Lê Thanh Nghị, Phường Bách Khoa, Quận Hai Bà Trưng, TP. Hà Nội',
    phone: '0914.89.8889 - 0912.01.1102 - 039.271.8888 - 07.8865.8865',
    email: 'duylongcomputer@gmail.com',
    website: 'maytinhduylong.vn',
    bankAccount: '1903666888999 - Techcombank',
});

const STORAGE_KEY = 'dlc_company_profile';
const listeners = new Set();

export function normalizeCompanyProfile(data) {
    const profile = { ...DEFAULT_COMPANY_PROFILE };
    Object.keys(DEFAULT_COMPANY_PROFILE).forEach((key) => {
        if (typeof data?.[key] === 'string') profile[key] = data[key].trim();
    });
    if (!profile.name) profile.name = DEFAULT_COMPANY_PROFILE.name;
    if (!profile.shortName) profile.shortName = profile.name;
    return Object.freeze(profile);
}

function readStoredProfile() {
    try {
        const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
        return raw ? normalizeCompanyProfile(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

let currentProfile = readStoredProfile() || DEFAULT_COMPANY_PROFILE;

export function getCompanyProfile() {
    return currentProfile;
}

export function setCompanyProfile(data) {
    currentProfile = normalizeCompanyProfile(data);
    try {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(currentProfile));
    } catch {
        // Trình duyệt chặn lưu trữ: vẫn dùng được trong phiên hiện tại
    }
    listeners.forEach((listener) => listener());
    return currentProfile;
}

export function subscribeCompanyProfile(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Bỏ loại hình doanh nghiệp khi lấy chữ viết tắt (tên hiển thị để trống thì dùng tên pháp lý "Công ty TNHH ...")
const LEGAL_FORM_WORDS = new Set(['công', 'ty', 'tnhh', 'cổ', 'phần', 'cp', 'mtv', 'một', 'thành', 'viên', 'jsc', 'co.,', 'ltd', 'ltd.']);

/** Chữ viết tắt làm logo / hình mờ trên mẫu in: hai chữ cái đầu của tên hiển thị (VD: Duy Long Computer -> DL). */
export function companyInitials(profile = currentProfile) {
    const words = String(profile.shortName || profile.name || '').split(/\s+/).filter(Boolean);
    const meaningful = words.filter((word) => !LEGAL_FORM_WORDS.has(word.toLocaleLowerCase('vi-VN')));
    return (meaningful.length ? meaningful : words)
        .slice(0, 2).map((word) => word[0]).join('').toLocaleUpperCase('vi-VN') || 'DL';
}

/** Tên doanh nghiệp viết hoa (đầu báo cáo, biên bản). */
export function companyNameUpper(profile = currentProfile) {
    return profile.name.toLocaleUpperCase('vi-VN');
}

/** Các trường thông tin doanh nghiệp đã escape, để chèn vào HTML của mẫu in. */
export function companyHtml(profile = currentProfile) {
    return {
        name: escapeHtml(profile.name),
        nameUpper: escapeHtml(companyNameUpper(profile)),
        shortName: escapeHtml(profile.shortName),
        shortNameUpper: escapeHtml(profile.shortName.toLocaleUpperCase('vi-VN')),
        slogan: escapeHtml(profile.slogan),
        taxCode: escapeHtml(profile.taxCode),
        address: escapeHtml(profile.address),
        phone: escapeHtml(profile.phone),
        email: escapeHtml(profile.email),
        website: escapeHtml(profile.website),
        bankAccount: escapeHtml(profile.bankAccount),
        initials: escapeHtml(companyInitials(profile)),
    };
}

/** Dòng liên hệ: "Điện thoại: ... - Email: ..." (bỏ phần chưa khai báo). */
export function companyContactLine(profile = currentProfile, { phoneLabel = 'Điện thoại', separator = ' - ' } = {}) {
    return [
        profile.phone && `${phoneLabel}: ${profile.phone}`,
        profile.email && `Email: ${profile.email}`,
    ].filter(Boolean).join(separator);
}

/** Như companyContactLine nhưng đã escape để chèn vào HTML; có thể kèm website. */
export function companyContactHtml(profile = currentProfile, { phoneLabel = 'Điện thoại', email = true, website = false } = {}) {
    const c = companyHtml(profile);
    return [
        profile.phone && `${phoneLabel}: ${c.phone}`,
        email && profile.email && `Email: ${c.email}`,
        website && profile.website && `Website: ${c.website}`,
    ].filter(Boolean).join(' - ');
}

/** Đầu trang chung của các mẫu in (phiếu bán hàng, báo giá, phiếu xuất, chuyển kho, đơn mua hàng...). */
export function companyPrintHeaderHtml(profile = currentProfile) {
    const c = companyHtml(profile);
    const contactLine = [
        profile.email && `Email: ${c.email}`,
        profile.website && `Website: <strong>${c.website}</strong>`,
    ].filter(Boolean).join(' | ');
    const infoLines = [
        profile.address && c.address,
        profile.phone && `Điện thoại: <strong>${c.phone}</strong>`,
        contactLine,
        profile.taxCode && `MST: ${c.taxCode}`,
    ].filter(Boolean).join('<br/>\n              ');

    return `
        <table class="header-table">
          <tr>
            <td style="width: 35%; vertical-align: middle;">
              <div class="header-logo">${c.initials}</div>
              <div style="font-size: 13px; font-weight: 800; text-transform: uppercase;">${c.shortName}</div>
              ${profile.slogan ? `<div class="header-subtitle">${c.slogan}</div>` : ''}
            </td>
            <td style="width: 65%; text-align: right;" class="company-info">
              ${infoLines}
            </td>
          </tr>
        </table>`;
}
