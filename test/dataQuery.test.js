import assert from 'node:assert/strict';
import test from 'node:test';
import { queryData, searchData } from '../src/modules/dataQuery.js';

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

test('range comparisons use native JavaScript operators without normalizing values', () => {
    assert.equal(queryData({ value: '20' }, { value: { $gt: 10 } }), true);
    assert.equal(queryData({ value: 20 }, { value: { $gt: '10' } }), true);
    assert.equal(queryData({ value: 'not a number' }, { value: { $gt: 10 } }), false);
    assert.equal(queryData({ value: '2026-01-02T00:00:00.000Z' }, { value: { $gt: '2026-01-01T00:00:00.000Z' } }), true);
    assert.equal(queryData({ value: '2026-01-02T00:00:00.000Z' }, { value: { $gt: new Date('2026-01-01T00:00:00.000Z') } }), false);
});
