import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRepairQuotationRows } from './repairQuotationRows.js';

test('quotes added and replaced parts plus service fees, but not removed parts', () => {
  const { rows } = buildRepairQuotationRows({
    lines: [
      { actionType: 'ADD', componentName: 'RAM 8GB', componentSku: 'RAM8', quantity: 1, unitPrice: 500000 },
      { actionType: 'REPLACE', componentName: 'SSD 512GB', quantity: 1, unitPrice: 1200000 },
      { actionType: 'REMOVE', componentName: 'SSD cũ', quantity: 1, unitPrice: 0 },
    ],
    fees: [{ feeName: 'Đề nghị sửa SSD', quantity: 1, feeAmount: 150000 }],
  });

  assert.deepEqual(rows.map((row) => [row.name, row.kind]), [
    ['RAM 8GB', 'Lắp thêm'],
    ['SSD 512GB', 'Thay thế'],
    ['Đề nghị sửa SSD', 'Dịch vụ'],
  ]);
});

test('totals include VAT and skip items free under warranty, like the repair screen', () => {
  const { rows, subTotal, vatTotal, grandTotal } = buildRepairQuotationRows({
    lines: [
      { actionType: 'ADD', componentName: 'Quạt', quantity: 2, unitPrice: 100000, vatPercent: 10 },
      { actionType: 'REPLACE', componentName: 'Pin', quantity: 1, unitPrice: 900000, vatPercent: 10, isFreeWarranty: true },
    ],
    fees: [{ feeName: 'Vệ sinh', quantity: 1, feeAmount: 50000, vatPercent: 8 }],
  });

  assert.equal(rows[1].amount, 0);
  assert.equal(subTotal, 250000);
  assert.equal(vatTotal, 24000);
  assert.equal(grandTotal, 274000);
});

test('uses the unit resolver for parts and sensible defaults otherwise', () => {
  const { rows } = buildRepairQuotationRows(
    {
      lines: [
        { actionType: 'ADD', componentName: 'Keo tản nhiệt', componentVariantId: 5, quantity: 1, unitPrice: 30000 },
        { actionType: 'ADD', componentName: 'Ốc', componentVariantId: 6, quantity: 4, unitPrice: 1000 },
      ],
      fees: [{ feeName: 'Cài Win', feeAmount: 100000 }],
    },
    (line) => (line.componentVariantId === 5 ? 'Tuýp' : undefined),
  );

  assert.deepEqual(rows.map((row) => row.unit), ['Tuýp', 'Cái', 'Lần']);
  assert.equal(rows[2].quantity, 1);
});

test('an empty repair has no rows and zero totals', () => {
  assert.deepEqual(buildRepairQuotationRows(null), { rows: [], subTotal: 0, vatTotal: 0, grandTotal: 0 });
});
