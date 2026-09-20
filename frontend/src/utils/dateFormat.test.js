import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDateOnly, formatDateTime, maskDateText, parseDisplayDate } from './dateFormat.js';

test('formatDateOnly always renders dd/mm/yyyy with zero padding', () => {
  assert.equal(formatDateOnly('2026-09-05'), '05/09/2026');
  assert.equal(formatDateOnly([2026, 1, 3]), '03/01/2026');
  assert.equal(formatDateOnly('2026-09-19T08:00:00'), '19/09/2026');
});

test('formatDateTime renders dd/mm/yyyy HH:mm', () => {
  assert.equal(formatDateTime('2026-09-05T07:08:09', { withSeconds: false }), '05/09/2026 07:08');
});

test('maskDateText inserts slashes only when more digits follow', () => {
  assert.equal(maskDateText('1'), '1');
  assert.equal(maskDateText('12'), '12');
  assert.equal(maskDateText('123'), '12/3');
  assert.equal(maskDateText('1209'), '12/09');
  assert.equal(maskDateText('12092026'), '12/09/2026');
  assert.equal(maskDateText('12/09/2026999'), '12/09/2026');
  assert.equal(maskDateText('ab12'), '12');
});

test('parseDisplayDate accepts real dates only', () => {
  assert.equal(parseDisplayDate('05/09/2026'), '2026-09-05');
  assert.equal(parseDisplayDate('29/02/2028'), '2028-02-29');
  assert.equal(parseDisplayDate('29/02/2026'), null);
  assert.equal(parseDisplayDate('31/04/2026'), null);
  assert.equal(parseDisplayDate('5/9/2026'), null);
  assert.equal(parseDisplayDate('12/09/'), null);
  assert.equal(parseDisplayDate(''), null);
});
