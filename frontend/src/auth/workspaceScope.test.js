import assert from 'node:assert/strict';
import test from 'node:test';

import { isPathAllowedForRoles } from './workspaceScope.js';

const CASHIER = ['ROLE_CASHIER_CONTROLLER'];
const KEEPER = ['ROLE_WAREHOUSE_CONTROLLER'];
const ACCOUNTANT = ['ROLE_ACCOUNTANT'];
const TECHNICIAN = ['ROLE_TECHNICIAN'];

test('cashier cannot open order lists, warehouse pages or accountant payment pages by URL', () => {
    for (const path of ['/sales-orders', '/sales-orders/12', '/purchase-orders', '/einvoices', '/payments', '/payments/receipt', '/payments/expense', '/import-history', '/dashboard', '/main-dashboard', '/warehouse-workspace']) {
        assert.equal(isPathAllowedForRoles(path, CASHIER), false, path);
    }
});

test('cashier keeps cash workspace, reports and partners', () => {
    for (const path of ['/cashier-workspace', '/reports', '/customers/1', '/suppliers', '/profile', '/']) {
        assert.equal(isPathAllowedForRoles(path, CASHIER), true, path);
    }
});

test('warehouse keeper is limited to warehouse mode', () => {
    for (const path of ['/sales-orders', '/purchase-orders', '/payments/receipt', '/cashier-workspace', '/customers', '/dashboard', '/main-dashboard']) {
        assert.equal(isPathAllowedForRoles(path, KEEPER), false, path);
    }
    for (const path of ['/warehouse-workspace/imports/5', '/import-history/create', '/import-slips/3/edit', '/export-slips', '/stocktakes/2', '/products', '/reports']) {
        assert.equal(isPathAllowedForRoles(path, KEEPER), true, path);
    }
});

test('accountant works everywhere except the keeper and cashier workspaces', () => {
    assert.equal(isPathAllowedForRoles('/main-dashboard', ACCOUNTANT), true);
    assert.equal(isPathAllowedForRoles('/sales-orders', ACCOUNTANT), true);
    assert.equal(isPathAllowedForRoles('/payments/receipt', ACCOUNTANT), true);
    assert.equal(isPathAllowedForRoles('/warehouse-workspace', ACCOUNTANT), false);
    assert.equal(isPathAllowedForRoles('/warehouse-workspace/imports/1', ACCOUNTANT), false);
    assert.equal(isPathAllowedForRoles('/cashier-workspace', ACCOUNTANT), false);
});

test('technician cannot open the main dashboard', () => {
    assert.equal(isPathAllowedForRoles('/main-dashboard', TECHNICIAN), false);
    assert.equal(isPathAllowedForRoles('/dashboard', TECHNICIAN), true);
    assert.equal(isPathAllowedForRoles('/repairs', TECHNICIAN), true);
});

test('managers, admins and other roles are not restricted here', () => {
    assert.equal(isPathAllowedForRoles('/sales-orders', ['ROLE_MANAGER']), true);
    assert.equal(isPathAllowedForRoles('/warehouse-workspace', ['MANAGER']), true);
    assert.equal(isPathAllowedForRoles('/users', ['ROLE_SUPER_ADMIN']), true);
    assert.equal(isPathAllowedForRoles('/repairs', ['ROLE_TECHNICIAN']), true);
});

test('role prefix and casing are normalized; a prefix must match a whole path segment', () => {
    assert.equal(isPathAllowedForRoles('/reports', ['cashier_controller']), true);
    assert.equal(isPathAllowedForRoles('/reports-old', CASHIER), false);
});
