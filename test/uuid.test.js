import assert from 'node:assert/strict';
import test from 'node:test';
import defaultUuid, { uid, uuid } from '../src/modules/id/uuid.js';

test('uuid exposes the full v7 timestamp, variant, and default export', t => {
    t.mock.method(Date, 'now', () => 0x0194f6c07c00);
    assert.equal(defaultUuid, uuid);
    assert.match(uuid(8), /^0194f6c0-7c00-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.match(uid(8), /^[0-9a-f]{8}$/);
});

test('uuid encodes the random bytes in their original positions', t => {
    t.mock.method(Date, 'now', () => 0x0123456789ab);
    const random = t.mock.method(globalThis.crypto, 'getRandomValues', bytes => {
        for (let i = 0; i < bytes.length; i++) bytes[i] = 0xf0 + i;
        return bytes;
    });
    assert.equal(uuid(), '01234567-89ab-76f7-b8f9-fafbfcfdfeff');
    assert.equal(random.mock.callCount(), 1);
});
