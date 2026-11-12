import assert from 'node:assert/strict';
import test from 'node:test';
import { createUpdate } from '../src/modules/createUpdate.js';

const cases = [
    ['plain assignment', { x: 1 }, { x: 2 }, { x: 2 }],
    ['nested assignment', {}, { 'profile.city': 'Lima' }, { profile: { city: 'Lima' } }],
    ['undefined removes property', { x: 1 }, { x: undefined }, {}],
    ['literal dollar string', {}, { x: '$literal' }, { x: '$literal' }],
    ['$set literal operator string', { x: 1 }, { $set: { x: '$pop' } }, { x: '$pop' }],
    ['$set array position replaces', { v: ['a', 'b'] }, { $set: { 'v[1]': 'c' } }, { v: ['a', 'c'] }],
    ['$set falsy values', {}, { $set: { x: 0, y: false, z: null } }, { x: 0, y: false, z: null }],
    ['$inc existing', { x: 2 }, { $inc: { x: 3 } }, { x: 5 }],
    ['$inc zero', { x: 0 }, { $inc: { x: -2 } }, { x: -2 }],
    ['$inc creates missing', {}, { $inc: { x: 3 } }, { x: 3 }],
    ['$rename root', { old: 1 }, { $rename: { old: 'new' } }, { new: 1 }],
    ['$rename dotted target', { old: 1 }, { $rename: { old: 'profile.value' } }, { profile: { value: 1 } }],
    ['$rename nested source', { profile: { old: 1 } }, { $rename: { 'profile.old': 'new' } }, { profile: {}, new: 1 }],
    ['$rename same path is no-op', { x: 1 }, { $rename: { x: 'x' } }, { x: 1 }],
    ['$rename missing is no-op', { target: 2 }, { $rename: { absent: 'target' } }, { target: 2 }],
    ['$push creates missing', {}, { $push: { v: 1 } }, { v: [1] }],
    ['$push appends array as one value', { v: [1] }, { $push: { v: [2, 3] } }, { v: [1, [2, 3]] }],
    ['$push inserts at position', { v: [1, 3] }, { '$push.v[1]': 2 }, { v: [1, 2, 3] }],
    ['$each spreads values', { v: [1] }, { $each: { v: [2, 3] } }, { v: [1, 2, 3] }],
    ['$each creates missing array', {}, { $each: { v: [1, 2] } }, { v: [1, 2] }],
    ['$each scalar', { v: [1] }, { $each: { v: 2 } }, { v: [1, 2] }],
    ['$each inserts at position', { v: [1, 4] }, { '$each.v[1]': [2, 3] }, { v: [1, 2, 3, 4] }],
    ['$splice positional insertion', { v: [1, 3] }, { '$splice.v[1]': 2 }, { v: [1, 2, 3] }],
    ['$unset removes field', { x: 1, y: 2 }, { $unset: { x: true } }, { y: 2 }],
    ['$delete removes field', { x: 1 }, { $delete: { x: true } }, {}],
    // CoCreate's $slice is a deletion alias, not MongoDB's array-slicing modifier.
    ['$slice removes position', { v: [1, 2, 3] }, { '$slice.v[1]': true }, { v: [1, 3] }],
    ['$unset removes position', { v: [1, 2, 3] }, { '$unset.v[1]': true }, { v: [1, 3] }],
    ['$pop removes last', { v: [1, 2, 3] }, { $pop: { v: true } }, { v: [1, 2] }],
    ['$shift removes first', { v: [1, 2, 3] }, { $shift: { v: true } }, { v: [2, 3] }],
    ['$pop missing is no-op', {}, { $pop: { v: true } }, {}],
    ['$shift missing is no-op', {}, { $shift: { v: true } }, {}],
    ['$unset missing parents is no-op', {}, { $unset: { 'missing.x': true } }, {}],
    ['large numeric property path', {}, { 'profile.12345678901234567890': 1 }, { profile: { '12345678901234567890': 1 } }],
    ['rename numeric-looking destination', { x: 1 }, { $rename: { x: 'profile.01' } }, { profile: { '01': 1 } }],
    ['numeric-looking property path', {}, { 'profile.01': 'value' }, { profile: { '01': 'value' } }],
    ['$pop empty', { v: [] }, { $pop: { v: true } }, { v: [] }],
    ['$shift empty', { v: [] }, { $shift: { v: true } }, { v: [] }],
    ['$addToSet deduplicates primitive', { v: [1] }, { $addToSet: { v: 1 } }, { v: [1] }],
    ['$addToSet creates missing', {}, { $addToSet: { v: 1 } }, { v: [1] }],
    ['$addToSet deduplicates object', { v: [{ a: 1, b: 2 }] }, { $addToSet: { v: { b: 2, a: 1 } } }, { v: [{ a: 1, b: 2 }] }],
    ['$addToSet deduplicates array', { v: [[1, 2]] }, { $addToSet: { v: [1, 2] } }, { v: [[1, 2]] }],
    ['$pull removes every equal scalar', { v: [1, 2, 1] }, { $pull: { v: 1 } }, { v: [2] }],
    ['$pull removes equal object', { v: [{ a: 1 }, { a: 2 }] }, { $pull: { v: { a: 1 } } }, { v: [{ a: 2 }] }],
    ['$pull removes equal nested array', { v: [[1, 2], [2, 1]] }, { $pull: { v: [1, 2] } }, { v: [[2, 1]] }],
    ['$pull missing is no-op', {}, { $pull: { v: 1 } }, {}],
    ['bracket append shorthand', { v: [1] }, { 'v[]': 2 }, { v: [1, 2] }],
    ['bracket operator shorthand', { v: [1] }, { 'v[$push]': 2 }, { v: [1, 2] }],
    ['string pop shorthand', { v: [1, 2] }, { v: '$pop' }, { v: [1] }],
    ['legacy bracket assignment inserts', { v: [1, 3] }, { 'v[1]': 2 }, { v: [1, 2, 3] }],
    ['global operator', { x: 1 }, {}, { x: 3 }, { '$inc.x': 2 }],
    ['local operator overrides global', { x: 1 }, { $inc: { x: 3 } }, { x: 4 }, { '$inc.x': 2 }]
];

for (const [name, original, update, expected, globals] of cases)
    test(`update operator: ${name}`, () => {
        const target = structuredClone(original);
        assert.equal(createUpdate(target, structuredClone(update), structuredClone(globals)), target);
        assert.deepEqual(target, expected);
    });

for (const [name, target, update] of [
    ['increment rejects strings', { x: 'old' }, { $inc: { x: 1 } }],
    ['increment rejects invalid operand', { x: 1 }, { $inc: { x: '2' } }],
    ['empty unknown operator', { x: 1 }, { $unknown: {} }],
    ['rename invalid destination', { x: 1 }, { $rename: { x: null } }],
    ['unknown operator', { x: 1 }, { $unknown: { x: 2 } }],
    ['prototype path', {}, { '$set.__proto__.polluted': true }],
    ['rename prototype target', { x: 1 }, { $rename: { x: '__proto__.polluted' } }]
]) {
    test(`update validation: ${name}`, () => {
        const before = structuredClone(target);
        assert.equal(createUpdate(target, update), false);
        assert.deepEqual(target, before);
        assert.equal({}.polluted, undefined);
    });
}

for (const operator of ['$push', '$each', '$addToSet', '$pull', '$pop', '$shift']) {
    test(`array update ${operator} rejects a non-array without overwriting it`, () => {
        const target = { v: false };
        assert.equal(createUpdate(target, { [operator]: { v: 1 } }), false);
        assert.deepEqual(target, { v: false });
    });
}


test('$addToSet $each deduplicates messages without flattening literal arrays', () => {
    const document = { messages: [{ uuid: 'one', data: { value: 1 } }] };
    assert.notEqual(createUpdate(document, { $addToSet: { messages: { $each: [
        { uuid: 'one', data: { value: 1 } }, { uuid: 'two' }, { uuid: 'two' }
    ] } } }), false);
    assert.deepEqual(document.messages, [{ uuid: 'one', data: { value: 1 } }, { uuid: 'two' }]);
});


test('$addToSet rejects malformed $each before applying earlier updates', () => {
    const document = { value: 1 };
    assert.equal(createUpdate(document, { $set: { value: 2 }, $addToSet: { messages: { $each: 'invalid' } } }), false);
    assert.deepEqual(document, { value: 1 });
});
