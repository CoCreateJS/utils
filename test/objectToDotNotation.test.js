import assert from 'node:assert/strict';
import test from 'node:test';
import { objectToDotNotation } from '../src/modules/object/objectToDotNotation.js';

test('flattens nested objects and arrays in traversal order', () => {
    const input = { first: false, records: [{ field: 'a' }, , { field: 'c' }], matrix: [[1], [2]] };
    const result = objectToDotNotation(input);
    assert.deepEqual(Object.entries(result), [
        ['first', false], ['records[0].field', 'a'], ['records[2].field', 'c'],
        ['matrix[0][0]', 1], ['matrix[1][0]', 2]
    ]);
});

test('preserves null and undefined leaves and omits empty containers', () => {
    const input = { empty: {}, list: [], missing: undefined, nil: null, listWithLeaves: [undefined, , null] };
    assert.deepEqual(objectToDotNotation(input), {
        missing: undefined, nil: null, 'listWithLeaves[0]': undefined, 'listWithLeaves[2]': null
    });
    assert.deepEqual(objectToDotNotation([{}]), {});
    assert.deepEqual(objectToDotNotation(null), {});
    assert.deepEqual(objectToDotNotation([7]), { '[0]': 7 });
});

test('uses own enumerable object fields and ignores named array properties', () => {
    const input = Object.assign(Object.create({ inherited: 1 }), { rows: [{ value: 2 }] });
    Object.defineProperty(input, 'hidden', { value: 1 });
    input.rows.extra = 3;
    assert.deepEqual(objectToDotNotation(input), { 'rows[0].value': 2 });
});
