import assert from 'node:assert/strict';
import test from 'node:test';
import { getValueFromObject } from '../src/modules/getValueFromObject.js';

test('resolves flat, dotted and indexed own properties', () => {
    const record = { id: 'a', rows: [{ nested: { value: 3 } }] };
    assert.equal(getValueFromObject(record, 'id'), 'a');
    assert.equal(getValueFromObject(record, '.rows[0].nested.value'), 3);
    assert.equal(getValueFromObject(record, 'rows.0.nested.value'), 3);
    assert.equal(getValueFromObject(record, 'rows.length'), 1);
    assert.equal(getValueFromObject(record, 'rows[1].nested.value'), undefined);
});

test('returns falsy leaves and reports missing segments beyond them', () => {
    for (const value of [false, 0, '', null, NaN, undefined]) {
        const record = { nested: { value } };
        assert.equal(getValueFromObject(record, 'nested.value', true), value);
        assert.equal(getValueFromObject(record, 'nested.value.missing'), undefined);
        assert.throws(() => getValueFromObject(record, 'nested.value.missing', true),
            /Key not found in object: missing/);
    }
});

test('only traverses own properties and preserves strict missing-key errors', () => {
    const record = Object.assign(Object.create({ inherited: 1 }), { nested: {} });
    assert.equal(getValueFromObject(record, 'inherited'), undefined);
    assert.throws(() => getValueFromObject(record, 'inherited', true), /Key not found in object: inherited/);
    assert.throws(() => getValueFromObject(record, 'nested.missing', true), /Key not found in object: missing/);
    assert.throws(() => getValueFromObject(null, 'key', true), /Invalid input/);
    assert.throws(() => getValueFromObject({}, 'key', true), /Key not found in object: key/);
});

test('reads fresh values with reused paths and after the cache fills', () => {
    const record = { nested: { value: 1 } };
    assert.equal(getValueFromObject(record, 'nested.value'), 1);
    record.nested = { value: 2 };
    assert.equal(getValueFromObject(record, 'nested.value'), 2);
    for (let i = 0; i < 200; i++) {
        const key = `key${i}`;
        assert.equal(getValueFromObject({ nested: { [key]: i } }, `nested.${key}`), i);
    }
    assert.equal(getValueFromObject(record, 'nested.value'), 2);
});
