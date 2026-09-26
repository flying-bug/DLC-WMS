import test from 'node:test';
import assert from 'node:assert/strict';
import { codeForSave } from './documentCode.js';

test('giữ nguyên mã gợi ý thì không gửi, để backend cấp số lúc lưu', () => {
  assert.equal(codeForSave('PO0005', 'PO0005'), undefined);
  assert.equal(codeForSave(' PO0005 ', 'PO0005'), undefined);
});

test('xóa trống ô mã thì không gửi', () => {
  assert.equal(codeForSave('', 'PO0005'), undefined);
  assert.equal(codeForSave('   ', ''), undefined);
});

test('người dùng tự nhập mã khác thì gửi nguyên mã đó', () => {
  assert.equal(codeForSave('PO0100', 'PO0005'), 'PO0100');
  assert.equal(codeForSave(' PO-DAC-BIET ', 'PO0005'), 'PO-DAC-BIET');
});

test('sửa phiếu có sẵn (không có mã gợi ý) thì gửi mã đang có', () => {
  assert.equal(codeForSave('PO0003', ''), 'PO0003');
});
