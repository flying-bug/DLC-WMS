import assert from 'node:assert/strict';
import test from 'node:test';

import { hasPreviousAppPage, resolveBackTarget } from './backTarget.js';

test('goes back in history when there is a previous page in the app', () => {
  assert.deepEqual(resolveBackTarget({ hasPrevious: true, returnUrl: '/x', fallback: '/list' }), { type: 'back' });
});

test('uses the explicit returnUrl when the page was opened directly', () => {
  assert.deepEqual(
    resolveBackTarget({ hasPrevious: false, returnUrl: '/purchase-orders/5', fallback: '/import-history' }),
    { type: 'replace', to: '/purchase-orders/5' },
  );
});

test('falls back to the fixed parent path when nothing else is known', () => {
  assert.deepEqual(
    resolveBackTarget({ hasPrevious: false, returnUrl: null, fallback: '/import-history' }),
    { type: 'replace', to: '/import-history' },
  );
});

test('hasPreviousAppPage reads the router idx from history.state', () => {
  assert.equal(hasPreviousAppPage({ usr: null, key: 'abc', idx: 2 }), true);
  assert.equal(hasPreviousAppPage({ idx: 0 }), false);
  assert.equal(hasPreviousAppPage(null), false);
  assert.equal(hasPreviousAppPage({}), false);
});
