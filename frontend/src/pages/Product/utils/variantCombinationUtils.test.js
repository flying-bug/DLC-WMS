import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVariantRows,
  canonicalCombinationKey,
  generateCombinations,
  generateSku,
  normalizeAttributeText,
} from './variantCombinationUtils.js';

test('normalizeAttributeText trims, collapses spaces and keeps accents for comparison', () => {
  assert.equal(normalizeAttributeText('  Đen   bóng  '), 'đen bóng');
  assert.notEqual(normalizeAttributeText('Đen'), normalizeAttributeText('Den'));
});

test('canonicalCombinationKey is independent from object key order', () => {
  const first = canonicalCombinationKey({ 'Mau sac': 'Den', RAM: '16GB' });
  const second = canonicalCombinationKey({ RAM: '16GB', 'Mau sac': 'Den' });

  assert.equal(first, second);
  assert.equal(first, 'mau sac=den|ram=16gb');
});

test('generateCombinations creates stable cartesian product and rejects over limit', () => {
  const rows = generateCombinations([
    { name: 'Mau sac', values: ['Den', 'Trang'] },
    { name: 'RAM', values: ['16GB', '32GB'] },
  ]);

  assert.deepEqual(rows, [
    { 'Mau sac': 'Den', RAM: '16GB' },
    { 'Mau sac': 'Den', RAM: '32GB' },
    { 'Mau sac': 'Trang', RAM: '16GB' },
    { 'Mau sac': 'Trang', RAM: '32GB' },
  ]);
  assert.throws(() => generateCombinations([
    { name: 'A', values: Array.from({ length: 11 }, (_, index) => `A${index}`) },
    { name: 'B', values: Array.from({ length: 10 }, (_, index) => `B${index}`) },
  ]), RangeError);
});

test('generateSku uppercases, removes Vietnamese accents, limits length and handles collisions', () => {
  const usedSkus = new Set();

  assert.equal(generateSku('dell-i15', { Color: 'Đen', RAM: '16 GB' }, usedSkus), 'DELL-I15-DEN-16-GB');
  assert.equal(generateSku('dell-i15', { Color: 'Den', RAM: '16 GB' }, usedSkus), 'DELL-I15-DEN-16-GB-2');

  const longSku = generateSku('PRODUCT-CODE-WITH-A-VERY-LONG-PREFIX-123456789', { Option: 'SUPER LONG OPTION VALUE' });
  assert.ok(longSku.length <= 50);
});

test('buildVariantRows preserves previous dirty row and filters excluded combinations', () => {
  const previous = {
    canonicalKey: 'mau sac=den',
    specs: { 'Mau sac': 'Den' },
    variantName: 'Den',
    sku: 'MANUAL-SKU',
    salePrice: 123,
    isDirty: true,
    skuManuallyEdited: true,
  };

  const rows = buildVariantRows(
    [{ name: 'Mau sac', values: ['Den', 'Trang'] }],
    {
      productCode: 'DELL-I15',
      defaults: { salePrice: 100, trackingMode: 'SERIAL' },
      previousRows: [previous],
      excludedKeys: ['mau sac=trang'],
    },
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].sku, 'MANUAL-SKU');
  assert.equal(rows[0].salePrice, 123);
  assert.equal(rows[0].isDirty, true);
});
