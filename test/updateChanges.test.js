import assert from 'node:assert/strict';
import test from 'node:test';
import { applyUpdate, createUpdate, createUpdateChanges, mergeUpdateChanges } from '../src/modules/object/update.js';

test('ordinary updates apply directly to the target and retain the accepted patch', async () => {
    const target = { value: 1 };
    const update = { $inc: { value: 2 } };
    let appliedTo;
    const result = await applyUpdate(target, update, {
        apply(object, mutation) {
            appliedTo = object;
            return createUpdate(object, mutation);
        }
    });
    assert.equal(appliedTo, target);
    assert.equal(result.object, target);
    assert.deepEqual(result.mutation, update);
    assert.equal(target.value, 3);
});

test('older updates add only missing nested assignments and retain an accepted sync mutation', async () => {
    const target = { updated: { on: 200, by: 'local' }, profile: { city: 'Lima' }, count: 4 };
    const result = await applyUpdate(target, {
        updated: { on: 100, by: 'remote' },
        profile: { city: 'Quito', name: 'Ana' },
        tags: ['one'],
        $inc: { count: 10 },
        $unset: { count: true }
    });
    assert.deepEqual(target, {
        updated: { on: 200, by: 'local' },
        profile: { city: 'Lima', name: 'Ana' },
        count: 4,
        tags: ['one']
    });
    assert.deepEqual(result.mutation, {
        $set: { 'profile.name': 'Ana', tags: ['one'] },
        'updated.on': 100,
        'updated.by': 'remote'
    });
});

test('equal timestamps reconcile without overwriting existing values', async () => {
    const target = { updated: { on: '2026-01-01T00:00:00Z' }, value: 'local' };
    const result = await applyUpdate(target, { updated: { on: Date.parse('2026-01-01T00:00:00Z') }, value: 'remote', missing: false });
    assert.deepEqual(target, { updated: { on: '2026-01-01T00:00:00Z' }, value: 'local', missing: false });
    assert.deepEqual(result.mutation, { $set: { missing: false }, 'updated.on': Date.parse('2026-01-01T00:00:00Z') });
});

test('older nested assignments do not replace an existing scalar parent', async () => {
    const target = { updated: { on: 200 }, profile: 'local' };
    const result = await applyUpdate(target, { updated: { on: 100 }, profile: { name: 'remote' } });
    assert.deepEqual(target, { updated: { on: 200 }, profile: 'local' });
    assert.equal(result.mutation, undefined);
});

test('stale dotted $set updates reconcile and emit a final-value patch', async () => {
    const target = { updated: { on: 200 }, nested: { keep: true } };
    const result = await applyUpdate(target, {
        '$set.updated.on': 100,
        $set: { 'nested.added': 2 }
    });
    assert.deepEqual(target, { updated: { on: 200 }, nested: { keep: true, added: 2 } });
    assert.deepEqual(result.mutation, { $set: { 'nested.added': 2 }, 'updated.on': 100 });
});

test('updates without comparable timestamps use normal update semantics', async () => {
    const target = { updated: { on: 200 }, value: 1 };
    const result = await applyUpdate(target, { value: 2 });
    assert.equal(target.value, 2);
    assert.deepEqual(result.mutation, { value: 2 });
});

test('conflicting update timestamps fail before mutation', async () => {
    const target = { updated: { on: 1 }, value: 1 };
    await assert.rejects(applyUpdate(target, { updated: { on: 2 }, 'updated.on': 3, value: 4 }), /Conflicting updated.on/);
    assert.deepEqual(target, { updated: { on: 1 }, value: 1 });
});

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
