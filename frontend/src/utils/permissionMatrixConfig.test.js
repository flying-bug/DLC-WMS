import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildPermissionsFromCodes,
    extractCodesFromPermissions
} from './permissionMatrixConfig.js';

test('full module permissions survive a save and reload round trip', () => {
    const expectedCodes = [
        'assembly_config:view', 'assembly_config:add', 'assembly_config:edit', 'assembly_config:delete',
        'einvoice:view', 'einvoice:add', 'einvoice:edit',
        'payment:view', 'payment:add', 'payment:edit', 'payment:delete',
        'brand:view', 'brand:add', 'brand:edit', 'brand:delete'
    ];

    const reloaded = buildPermissionsFromCodes(extractCodesFromPermissions(buildPermissionsFromCodes(expectedCodes)));

    for (const module of ['assembly_config', 'einvoice', 'payment', 'brand']) {
        assert.equal(reloaded[module].full, true, `${module} should remain fully selected`);
    }
});
