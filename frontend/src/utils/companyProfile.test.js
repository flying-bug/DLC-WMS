import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_COMPANY_PROFILE,
    companyContactLine,
    companyInitials,
    companyPrintHeaderHtml,
    getCompanyProfile,
    normalizeCompanyProfile,
    setCompanyProfile,
    subscribeCompanyProfile,
} from './companyProfile.js';

test('chưa tải được thông tin thì dùng mặc định (giống thông tin in trước đây)', () => {
    const header = companyPrintHeaderHtml(DEFAULT_COMPANY_PROFILE);
    assert.match(header, /Duy Long Computer/);
    assert.match(header, /42 Lê Thanh Nghị/);
    assert.match(header, /<div class="header-logo">DL<\/div>/);
});

test('mẫu in lấy thông tin doanh nghiệp đã lưu, bỏ dòng để trống và escape HTML', () => {
    const header = companyPrintHeaderHtml(normalizeCompanyProfile({
        name: 'Công ty TNHH <ABC>',
        shortName: 'ABC & Co',
        slogan: '',
        taxCode: '0101234567',
        address: 'Số 1 Hà Nội',
        phone: '024 111',
        email: '',
        website: '',
    }));
    assert.match(header, /ABC &amp; Co/);
    assert.match(header, /Số 1 Hà Nội/);
    assert.match(header, /MST: 0101234567/);
    assert.doesNotMatch(header, /Website|Email|header-subtitle|<ABC>/);
});

test('tên hiển thị để trống thì dùng tên doanh nghiệp', () => {
    const profile = normalizeCompanyProfile({ name: 'Công ty TNHH Minh Anh', shortName: '  ' });
    assert.equal(profile.shortName, 'Công ty TNHH Minh Anh');
    assert.equal(companyInitials(profile), 'MA');
});

test('dòng liên hệ bỏ phần chưa khai báo', () => {
    assert.equal(companyContactLine({ phone: '024 111', email: '' }), 'Điện thoại: 024 111');
    assert.equal(companyContactLine({ phone: '', email: 'a@b.vn' }), 'Email: a@b.vn');
});

test('lưu thiết lập thì các màn đang mở nhận thông tin mới ngay', () => {
    let notified = 0;
    const unsubscribe = subscribeCompanyProfile(() => { notified += 1; });
    setCompanyProfile({ name: 'Công ty Mới', shortName: 'Mới' });
    unsubscribe();
    assert.equal(notified, 1);
    assert.equal(getCompanyProfile().shortName, 'Mới');
});
