import assert from 'node:assert/strict';
import test from 'node:test';
import { dotNotationToObject } from '../src/modules/dotNotationToObject.js';

test('merges deep paths into the supplied object and deletes undefined leaves', () => {
    const data = { a: { b: { c: { stale: true, kept: false } } }, stale: true };
    const branch = data.a.b.c;
    assert.equal(dotNotationToObject({
        'a.b.c.stale': undefined,
        'a.b.c.deep.x': 0,
        'a.b.c.deep.y': null,
        stale: undefined
    }, data), data);
    assert.equal(data.a.b.c, branch);
    assert.deepEqual(data, { a: { b: { c: { kept: false, deep: { x: 0, y: null } } } } });
});

test('sets and removes indexed positions and appends scalar and array values', () => {
    const items = [{ value: 1 }, { value: 2 }];
    const target = { items, tags: ['old'] };
    assert.equal(dotNotationToObject({
        'items[0]': undefined,
        'items[0].value': 3,
        'items[1].value': 4,
        'tags[]': ['new', 'last'],
        'labels[]': 'one'
    }, target), target);
    assert.equal(target.items, items);
    assert.deepEqual(target, {
        items: [{ value: 3 }, { value: 4 }],
        tags: ['old', 'new', 'last'],
        labels: ['one']
    });
});

test('a group at index zero retains its fields and nested siblings', () => {
    assert.deepEqual(dotNotationToObject({
        'rows[a].name': 'first',
        'rows[a].details.x': 1,
        'rows[a].details.y': 2,
        'rows[b].details.x': 3
    }), {
        rows: [
            { name: 'first', details: { x: 1, y: 2 } },
            { details: { x: 3 } }
        ]
    });
});

test('traversal writes to the target rather than an inherited branch', () => {
    const prototype = { settings: { original: true } };
    const target = Object.create(prototype);
    assert.equal(dotNotationToObject({ 'settings.enabled': true }, target), target);
    assert.deepEqual(target.settings, { enabled: true });
    assert.deepEqual(prototype.settings, { original: true });
});

test('nullish inputs still produce an empty object', () => {
    assert.deepEqual(dotNotationToObject(null, null), {});
});
