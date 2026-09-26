import test from 'node:test';
import assert from 'node:assert/strict';
import { ariaSortOf, nextSort, sortRows, toTimestamp } from './clientSort.js';

const COLUMNS = {
    date: { get: (row) => row.docDate, type: 'date' },
    code: { get: (row) => row.docCode },
    total: { get: (row) => row.total, type: 'number' },
};

const ids = (rows) => rows.map((row) => row.id);

test('mã chứng từ so theo số chứ không theo từng ký tự: NK9 < NK10 < NK100', () => {
    const rows = [
        { id: 1, docCode: 'NK10' },
        { id: 2, docCode: 'NK9' },
        { id: 3, docCode: 'NK100' },
    ];
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'code', direction: 'asc' })), [2, 1, 3]);
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'code', direction: 'desc' })), [3, 1, 2]);
});

test('ngày sắp theo giá trị gốc, không theo chuỗi dd/MM/yyyy', () => {
    const rows = [
        { id: 1, docDate: '2026-01-15' },
        { id: 2, docDate: '2025-12-31' },
        { id: 3, docDate: '2026-02-01' },
    ];
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'date', direction: 'desc' })), [3, 1, 2]);
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'date', direction: 'asc' })), [2, 1, 3]);
});

test('ô trống luôn nằm cuối ở cả hai chiều', () => {
    const rows = [
        { id: 1, docDate: null },
        { id: 2, docDate: '2026-01-01' },
        { id: 3, docDate: '' },
        { id: 4, docDate: '2026-03-01' },
    ];
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'date', direction: 'asc' })), [2, 4, 1, 3]);
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'date', direction: 'desc' })), [4, 2, 1, 3]);
});

test('trùng ngày thì xếp tiếp theo id cùng chiều (phiếu tạo sau đứng trước khi giảm dần)', () => {
    const rows = [
        { id: 5, docDate: '2026-01-01' },
        { id: 9, docDate: '2026-01-01' },
        { id: 7, docDate: '2026-01-01' },
    ];
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'date', direction: 'desc' })), [9, 7, 5]);
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'date', direction: 'asc' })), [5, 7, 9]);
});

test('số sắp theo giá trị số, kể cả khi dữ liệu là chuỗi', () => {
    const rows = [
        { id: 1, total: '100' },
        { id: 2, total: 20 },
        { id: 3, total: '3' },
    ];
    assert.deepEqual(ids(sortRows(rows, COLUMNS, { key: 'total', direction: 'asc' })), [3, 2, 1]);
});

test('không có cách sắp xếp hoặc cột lạ thì giữ nguyên thứ tự; không đổi mảng gốc', () => {
    const rows = [{ id: 2, docCode: 'B' }, { id: 1, docCode: 'A' }];
    assert.equal(sortRows(rows, COLUMNS, null), rows);
    assert.equal(sortRows(rows, COLUMNS, { key: 'unknown', direction: 'asc' }), rows);
    const sorted = sortRows(rows, COLUMNS, { key: 'code', direction: 'asc' });
    assert.deepEqual(ids(sorted), [1, 2]);
    assert.deepEqual(ids(rows), [2, 1]);
    assert.deepEqual(sortRows(null, COLUMNS, { key: 'code', direction: 'asc' }), []);
});

test('bấm tiêu đề: giảm dần -> tăng dần -> bỏ sắp xếp; đổi cột thì bắt đầu lại từ giảm dần', () => {
    let sort = null;
    sort = nextSort(sort, 'date');
    assert.deepEqual(sort, { key: 'date', direction: 'desc' });
    sort = nextSort(sort, 'date');
    assert.deepEqual(sort, { key: 'date', direction: 'asc' });
    sort = nextSort(sort, 'date');
    assert.equal(sort, null);
    assert.deepEqual(nextSort({ key: 'date', direction: 'asc' }, 'code'), { key: 'code', direction: 'desc' });
});

test('aria-sort theo trạng thái cột', () => {
    assert.equal(ariaSortOf(null, 'date'), 'none');
    assert.equal(ariaSortOf({ key: 'code', direction: 'asc' }, 'date'), 'none');
    assert.equal(ariaSortOf({ key: 'date', direction: 'asc' }, 'date'), 'ascending');
    assert.equal(ariaSortOf({ key: 'date', direction: 'desc' }, 'date'), 'descending');
});

test('đọc được ngày dạng chuỗi ISO, mảng LocalDate và bỏ qua giá trị hỏng', () => {
    assert.equal(toTimestamp([2026, 1, 15]), new Date(2026, 0, 15).getTime());
    assert.ok(toTimestamp('2026-01-15') < toTimestamp('2026-01-16'));
    assert.equal(toTimestamp('không phải ngày'), null);
    assert.equal(toTimestamp(undefined), null);
});
