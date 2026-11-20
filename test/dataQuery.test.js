import assert from 'node:assert/strict';
import test from 'node:test';
import { isEqualArray, isEqualObject, queryData, searchData, sortData } from '../src/modules/dataQuery.js';

test('membership operators safely normalize scalar operands', () => {
    assert.equal(queryData({ _id: 'provider-id' }, { _id: { $in: false } }), false);
    assert.equal(queryData({ type: 'cloud' }, { type: { $in: 'cloud' } }), true);
    assert.equal(queryData({ enabled: false }, { enabled: { $in: false } }), true);
    assert.equal(queryData({ _id: 'provider-id' }, { _id: { $nin: false } }), true);
    assert.equal(queryData({ enabled: false }, { enabled: { $nin: false } }), false);
});

test('null and undefined query values compare without throwing', () => {
    assert.equal(queryData({ value: null }, { value: null }), true);
    assert.equal(queryData({ value: 'set' }, { value: null }), false);
    assert.equal(queryData({ value: undefined }, { value: undefined }), true);
});

for (const value of [123, 0, true, false, 123n, Symbol('example')]) {
    test(`scalar search ${String(value)} behaves like its string form`, () => {
        const search = { value, operator: 'or' };
        assert.equal(searchData({ name: 'unrelated' }, search), false);
        assert.equal(searchData({ name: String(value) }, search), true);
        assert.equal(searchData({}, search), false);
    });
}

for (const value of [null, undefined, '']) {
    test(`empty search ${String(value)} is safe and matches like an empty string`, () => {
        for (const data of [{}, { name: 'example' }, { name: null }]) {
            assert.equal(searchData(data, { value, operator: 'or' }), true);
        }
    });
}

test('normalizes multiple terms without modifying the input', () => {
    const values = Object.freeze([123, false]);
    const search = Object.freeze({ value: values, operator: 'or' });
    assert.equal(searchData({ name: 'false' }, search), true);
    assert.equal(searchData({ name: 'unrelated' }, search), false);
    assert.equal(searchData({}, search), false);
});

test('supports both boolean and string case sensitivity flags', () => {
    for (const caseSensitive of [true, 'true']) {
        assert.equal(searchData({ name: 'Alpha' }, { value: ['miss', 'alpha'], operator: 'or', caseSensitive }), false);
        assert.equal(searchData({ name: 'Alpha' }, { value: ['miss', 'Alpha'], operator: 'or', caseSensitive }), true);
    }
    for (const caseSensitive of [false, 'false', undefined]) {
        assert.equal(searchData({ name: 'Alpha' }, { value: 'alpha', operator: 'or', caseSensitive }), true);
    }
});

test('searches later fields and converts primitive field values', () => {
    assert.equal(searchData({ first: 'miss', second: false }, { value: 'false', operator: 'or' }), true);
    assert.equal(searchData({ value: 123n }, { value: '123', operator: 'or' }), true);
    assert.equal(searchData({ value: undefined }, { value: 'undefined', operator: 'or' }), false);
});

test('preserves empty filter and empty AND matching behavior', () => {
    assert.equal(searchData({}, undefined), true);
    assert.equal(searchData({}, []), true);
    assert.equal(searchData({}, { value: [], operator: 'or' }), true);
    assert.equal(searchData({ name: null }, { value: null, operator: 'and' }), true);
    assert.equal(searchData({ name: 'example' }, { value: null, operator: 'and' }), false);
});

test('evaluates AND, OR, and NOR branches with normal boolean semantics', () => {
    const records = [
        { name: 'Ada', team: 'red', score: 31 },
        { name: 'Bea', team: 'blue', score: 24 },
        { name: 'Cal', team: 'blue', score: 18 }
    ];
    const query = {
        $and: [
            { score: { $gte: 20 } },
            { $or: [{ team: 'red' }, { name: 'Bea' }] }
        ]
    };

    assert.deepEqual(records.filter(record => queryData(record, query)).map(record => record.name), ['Ada', 'Bea']);
    assert.equal(queryData(records[2], { $or: [{ team: 'red' }, { name: 'Bea' }] }), false);
    assert.equal(queryData(records[2], { $nor: [{ team: 'red' }, { name: 'Bea' }] }), true);
    assert.equal(queryData(records[0], { $nor: [{ team: 'red' }, { name: 'Bea' }] }), false);
});

test('matches multiple nested keys and checks dotted-path existence', () => {
    const record = { profile: { city: 'Lima', active: true } };

    assert.equal(queryData(record, { profile: { city: 'Lima', active: true } }), true);
    assert.equal(queryData(record, { profile: { city: 'Lima', active: false } }), false);
    assert.equal(queryData(record, { 'profile.city': { $exists: true } }), true);
    assert.equal(queryData(record, { 'profile.zip': { $exists: false } }), true);
});

test('range comparisons follow JavaScript operators', () => {
    const cases = [
        ['20', 10], [20, '10'], ['not a number', 10],
        ['2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
        ['2026-01-02T00:00:00.000Z', new Date('2026-01-01T00:00:00.000Z')],
        [[20], 10], [null, 0], [undefined, 0]
    ];
    for (const [value, bound] of cases) {
        assert.equal(queryData({ value }, { value: { $gt: bound } }), value > bound);
        assert.equal(queryData({ value }, { value: { $gte: bound } }), value >= bound);
        assert.equal(queryData({ value }, { value: { $lt: bound } }), value < bound);
        assert.equal(queryData({ value }, { value: { $lte: bound } }), value <= bound);
    }
});

test('structural equality and native membership', () => {
    assert.equal(queryData({ value: 2 }, { value: '2' }), false);
    assert.equal(queryData({ value: [2] }, { value: 2 }), false);
    assert.equal(queryData({ value: { nested: [1, 2] } }, { value: { nested: [1, 2] } }), true);
    assert.equal(queryData({ value: [2] }, { value: { $in: [2] } }), true);
    assert.equal(queryData({ value: [2] }, { value: { $in: [[2]] } }), false);
    assert.equal(queryData({ value: [2] }, { value: { $nin: [[2]] } }), true);
    assert.equal(queryData({ value: [2] }, { value: { $includes: 2 } }), true);
    assert.equal(queryData({ value: 'abc' }, { value: { $includes: 'b' } }), true);
    assert.equal(queryData({ value: '2' }, { value: { $includes: 2 } }), true);
});

test('$exists distinguishes undefined from falsy and null values', () => {
    for (const value of [null, false, 0, '', [], {}])
        assert.equal(queryData({ value }, { value: { $exists: true } }), true);
    assert.equal(queryData({ value: undefined }, { value: { $exists: true } }), false);
    assert.equal(queryData({}, { value: { $exists: false } }), true);
});

test('nested paths require explicit array indices and traverse falsy parents', () => {
    assert.equal(queryData({ value: [{ score: 2 }] }, { 'value.score': 2 }), false);
    assert.equal(queryData({ value: [{ score: 2 }] }, { 'value[0].score': 2 }), true);
    assert.equal(queryData({ value: { score: 2 } }, { 'value.score': 2 }), true);
    assert.equal(queryData({ value: 0 }, { 'value.score': 2 }), false);
});

test('sortData mutates and returns the input with stable, ordered tie breakers', () => {
    const records = [
        { id: 'first', group: 'a', rows: [{ score: 2 }] },
        { id: 'second', group: 'a', rows: [{ score: 2 }] },
        { id: 'missing', group: 'a' },
        { id: 'higher', group: 'a', rows: [{ score: 10 }] },
        { id: 'last', group: 'b', rows: [{ score: 20 }] }
    ];
    const sort = [{ key: 'group' }, { key: 'rows[0].score', direction: 'desc' }];
    assert.equal(sortData(records, sort), records);
    assert.deepEqual(records.map(record => record.id), ['higher', 'first', 'second', 'missing', 'last']);
});

test('sortData preserves heterogeneous type order', () => {
    const records = ['10', true, 10, null, undefined, 2, '2'].map(value => ({ value }));
    assert.deepEqual(sortData(records, [{ key: 'value' }]).map(record => record.value),
        [null, undefined, 2, 10, '10', '2', true]);
});

test('sortData selects an array extreme for each direction without mutating the field', () => {
    const shared = Object.freeze([9, 2, 4]);
    const records = [
        { id: 'x', values: shared },
        { id: 'y', values: [5, 7] },
        { id: 'z', values: shared }
    ];
    assert.deepEqual(sortData(records, [{ key: 'values' }]).map(record => record.id), ['x', 'z', 'y']);
    assert.deepEqual(sortData(records, [{ key: 'values', direction: 'desc' }]).map(record => record.id), ['x', 'z', 'y']);
    const other = records.find(record => record.id === 'y');
    other.values.push(12);
    assert.deepEqual(sortData(records, [{ key: 'values', direction: 'desc' }]).map(record => record.id), ['y', 'x', 'z']);
    assert.deepEqual(shared, [9, 2, 4]);
});

test('equality helpers retain structural equality and Object.is scalar rules', () => {
    assert.equal(isEqualArray([NaN, { values: [1] }], [NaN, { values: [1] }]), true);
    assert.equal(isEqualArray([0], [-0]), false);
    assert.equal(isEqualObject({ a: 1, b: [2] }, { b: [2], a: 1 }), true);
    assert.equal(isEqualObject({ a: undefined }, {}), false);
    assert.equal(isEqualObject(new Date(1), new Date(1)), true);
    assert.equal(isEqualObject(new Date(1), new Date(2)), false);
});

test('search retains clause short circuiting and the existing and rule', () => {
    const record = { first: 'alpha', second: 'beta' };
    assert.equal(searchData(record, { operator: 'and', value: ['alpha', 'absent'] }), true);
    assert.equal(searchData(record, { operator: 'and', value: ['beta', 'alpha'] }), false);
    assert.equal(searchData(record, [{ operator: 'or', value: 'absent' }, { operator: 'or', value: 'alpha' }]), false);
});
