import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findDirectShortages,
  isActiveWarehouse,
  moveLinesToWarehouse,
  resolveDefaultDirectWarehouse,
} from './directSaleWarehouse.js';

const WAREHOUSES = [
  { id: 1, code: 'KHO01', status: 'APPROVED' },
  { id: 2, code: 'KHO02', status: 'APPROVED' },
  { id: 3, code: 'KHO03', status: 'APPROVED' },
];

test('isActiveWarehouse keeps approved warehouses and drops inactive ones', () => {
  assert.equal(isActiveWarehouse({ status: 'APPROVED' }), true);
  assert.equal(isActiveWarehouse({ status: 'INACTIVE' }), false);
});

test('default warehouse prefers the single assigned warehouse over the saved one', () => {
  assert.equal(resolveDefaultDirectWarehouse(WAREHOUSES, [{ id: 2 }], '3'), 2);
});

test('default warehouse falls back to the saved one when assigned to several (or none)', () => {
  assert.equal(resolveDefaultDirectWarehouse(WAREHOUSES, [{ id: 1 }, { id: 2 }], '3'), 3);
  assert.equal(resolveDefaultDirectWarehouse(WAREHOUSES, [], '3'), 3);
});

test('default warehouse ignores assigned/saved ids that are not in the list and uses the first one', () => {
  assert.equal(resolveDefaultDirectWarehouse(WAREHOUSES, [{ id: 99 }], '42'), 1);
  assert.equal(resolveDefaultDirectWarehouse([], [], null), null);
});

test('moveLinesToWarehouse merges same product and drops serials picked in another warehouse', () => {
  const lines = [
    { variantId: 10, warehouseId: 1, quantity: 1, serialNumbers: ['A1'] },
    { variantId: 10, warehouseId: 2, quantity: 2, serialNumbers: ['B1', 'B2'] },
    { variantId: 11, warehouseId: null, quantity: 1, serialNumbers: [] },
    { variantId: null, warehouseId: null, quantity: 1, serialNumbers: [] },
  ];

  const moved = moveLinesToWarehouse(lines, 1);

  assert.equal(moved.length, 3);
  assert.deepEqual(moved[0], { variantId: 10, warehouseId: 1, quantity: 3, serialNumbers: ['A1'] });
  assert.ok(moved.every(l => l.warehouseId === 1));
  // Không sửa mảng đầu vào
  assert.equal(lines[0].quantity, 1);
});

test('findDirectShortages lists other warehouses only when the sales warehouse is short', () => {
  const inventoryMap = new Map([
    ['10_1', 0], ['10_2', 5], ['10_3', 1],
    ['11_1', 4], ['11_2', 9],
    ['12_1', 0],
  ]);
  const lines = [
    { variantId: 10, quantity: 2 }, // thiếu ở kho bán, kho khác còn
    { variantId: 11, quantity: 2 }, // đủ ở kho bán
    { variantId: 12, quantity: 1 }, // thiếu nhưng không kho nào còn
    { variantId: null, quantity: 1 },
  ];
  const variants = [{ id: 10, productName: 'Laptop A' }];

  const shortages = findDirectShortages({ lines, warehouseId: 1, warehouses: WAREHOUSES, inventoryMap, variants });

  assert.equal(shortages.length, 1);
  assert.equal(shortages[0].idx, 0);
  assert.equal(shortages[0].name, 'Laptop A');
  assert.equal(shortages[0].have, 0);
  assert.equal(shortages[0].need, 2);
  assert.deepEqual(shortages[0].others.map(o => [o.code, o.qty]), [['KHO02', 5], ['KHO03', 1]]);
});

test('findDirectShortages returns nothing without a sales warehouse', () => {
  assert.deepEqual(findDirectShortages({
    lines: [{ variantId: 10, quantity: 2 }], warehouseId: null, warehouses: WAREHOUSES, inventoryMap: new Map(), variants: [],
  }), []);
});
