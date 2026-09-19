import assert from 'node:assert/strict';
import test from 'node:test';

import { clearSessionStates, readSessionState, sessionStateKey, writeSessionState } from './sessionState.js';

const fakeStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    keys: () => [...data.keys()],
  };
};

// Object.keys(storage) trên sessionStorage thật trả về các khóa; giả lập tương tự cho test.
const withKeys = (storage) => new Proxy(storage, {
  ownKeys: () => storage.keys(),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

test('restores the saved value only when asked to restore', () => {
  const storage = fakeStorage();
  const key = sessionStateKey('/purchase-orders', 'filters');
  writeSessionState(storage, key, { status: 'APPROVED' });

  assert.deepEqual(readSessionState(storage, key, { status: '' }, true), { status: 'APPROVED' });
  assert.deepEqual(readSessionState(storage, key, { status: '' }, false), { status: '' });
});

test('falls back to the initial value when nothing (or garbage) is stored', () => {
  const storage = fakeStorage();
  const key = sessionStateKey('/x', 'page');
  assert.equal(readSessionState(storage, key, 1, true), 1);
  storage.setItem(key, '{not json');
  assert.equal(readSessionState(storage, key, () => 7, true), 7);
});

test('keys are separated per page and per field', () => {
  assert.notEqual(sessionStateKey('/a', 'page'), sessionStateKey('/b', 'page'));
  assert.notEqual(sessionStateKey('/a', 'page'), sessionStateKey('/a', 'filters'));
});

test('clearSessionStates removes only list state keys', () => {
  const storage = fakeStorage();
  storage.setItem('token', 'abc');
  writeSessionState(storage, sessionStateKey('/a', 'page'), 3);
  writeSessionState(storage, sessionStateKey('/b', 'filters'), {});

  clearSessionStates(withKeys(storage));

  assert.deepEqual(storage.keys(), ['token']);
});
