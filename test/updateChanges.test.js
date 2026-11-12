import assert from 'node:assert/strict';
import test from 'node:test';
import { createUpdate, createUpdateChanges, mergeUpdateChanges } from '../src/modules/createUpdate.js';

for (const [name, before, mutation] of [
    ['equal fields', { a: 1, nested: { b: 2 }, list: [1, { n: 2 }] }, { a: 1, list: [1, { n: 2 }] }],
    ['nested field', { profile: { city: 'Lima', name: 'Ana' } }, { 'profile.city': 'Paris' }],
    ['rename', { old: 1, untouched: 2 }, { $rename: { old: 'profile.name' } }],
    ['unset', { profile: { city: 'Lima', name: 'Ana' } }, { $unset: { 'profile.city': true } }],
    ['increment', { score: 1 }, { $inc: { score: 3 } }],
    ['literal operator string', { value: 'old' }, { $set: { value: '$pop' } }],
    ['array insertion', { list: [1, 3] }, { '$splice.list[1]': 2 }],
    ['array removal', { list: [1, 2] }, { $pop: { list: true } }],
    ['falsy values', { a: 1, b: true, c: 'value' }, { a: 0, b: false, c: '' }],
    ['null', { a: 1 }, { a: null }],
    ['empty object replacement', { profile: { name: 'Ana' } }, { profile: {} }],
    ['undefined removal', { a: 1 }, { a: undefined }]
]) {
    test(`result changes round-trip: ${name}`, () => {
        const after = structuredClone(before);
        assert.notEqual(createUpdate(after, mutation), false);
        const changes = createUpdateChanges(before, after);
        const replay = JSON.parse(JSON.stringify(changes));
        assert.deepEqual(createUpdate(structuredClone(before), replay), after);
        const twice = createUpdate(structuredClone(after), replay);
        assert.deepEqual(twice, after, 'Resolved patches are idempotent');
        assert.deepEqual(Object.keys(changes).filter(key => !['$set', '$unset'].includes(key)), []);
    });
}

test('unchanged values and unchanged nested siblings are excluded', () => {
    const before = { _id: 'id', a: 1, b: 2, profile: { city: 'Lima', name: 'Ana' } };
    assert.deepEqual(createUpdateChanges(before, { ...before, profile: { ...before.profile, city: 'Paris' } }), { $set: { 'profile.city': 'Paris' } });
    assert.deepEqual(createUpdateChanges(before, structuredClone(before)), {});
});

test('coalescing preserves changed-and-reverted fields and normalizes overlapping paths', () => {
    assert.deepEqual(mergeUpdateChanges({ $set: { a: 2 } }, { $set: { a: 1 } }), { $set: { a: 1 } });
    assert.deepEqual(mergeUpdateChanges({ $set: { profile: { name: 'Ana', city: 'Lima' } } }, { $set: { 'profile.city': 'Paris' } }), { $set: { profile: { name: 'Ana', city: 'Paris' } } });
    assert.deepEqual(mergeUpdateChanges({ $unset: { profile: true }, $set: { a: 1 } }, { $set: { 'profile.city': 'Paris' } }), { $set: { a: 1, profile: { city: 'Paris' } } });
    assert.deepEqual(mergeUpdateChanges({ $set: { 'profile.name': 'Ana' } }, { $unset: { profile: true } }), { $unset: { profile: true } });
});

const operations = [
    { a: 2 }, { a: 1 }, { $unset: { a: true } },
    { profile: {} }, { profile: { city: 'Quito' } },
    { 'profile.city': 'Paris' }, { $unset: { profile: true } },
    { $unset: { 'profile.city': true } }, { $set: { tags: [] } }, { $push: { tags: 3 } }
];
test('composed final-value patches match consecutive supported mutations', () => {
    for (const first of operations) for (const second of operations) {
        const before = { a: 1, profile: { city: 'Lima', name: 'Ana' }, tags: [1, 2] };
        const middle = createUpdate(structuredClone(before), first);
        const after = createUpdate(structuredClone(middle), second);
        assert.notEqual(after, false);
        const changes = mergeUpdateChanges(createUpdateChanges(before, middle), createUpdateChanges(middle, after));
        assert.deepEqual(createUpdate(structuredClone(before), JSON.parse(JSON.stringify(changes))), after,
            JSON.stringify([first, second, changes]));
    }
});
