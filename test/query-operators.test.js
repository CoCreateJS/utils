import assert from 'node:assert/strict';
import test from 'node:test';
import { compileQuery, queryData } from '../src/modules/object/query.js';

const cases = [
    ['eq number', { v: 2 }, { v: { $eq: 2 } }, true],
    ['eq preserves scalar types', { v: '2' }, { v: { $eq: 2 } }, false],
    ['eq array member is not scalar equality', { v: [1, 2] }, { v: { $eq: 2 } }, false],
    ['eq complete array', { v: [1, 2] }, { v: { $eq: [1, 2] } }, true],
    ['eq nested array is complete value', { v: [[1, 2]] }, { v: { $eq: [1, 2] } }, false],
    ['literal array preserves order', { v: [2, 1] }, { v: [1, 2] }, false],
    ['null is present', { v: null }, { v: null }, true],
    ['missing differs from null', {}, { v: null }, false],
    ['missing reads as undefined', {}, { v: undefined }, true],
    ['ne missing', {}, { v: { $ne: 1 } }, true],
    ['ne array membership is inverse scalar equality', { v: [1, 2] }, { v: { $ne: 2 } }, true],
    ['not range', { v: 2 }, { v: { $not: { $gt: 3 } } }, true],
    ['lt', { v: 2 }, { v: { $lt: 3 } }, true],
    ['lte equal', { v: 2 }, { v: { $lte: 2 } }, true],
    ['gt', { v: 2 }, { v: { $gt: 1 } }, true],
    ['gte equal', { v: 2 }, { v: { $gte: 2 } }, true],
    ['range uses JavaScript coercion', { v: '20' }, { v: { $gt: 10 } }, '20' > 10],
    ['range does not inspect array members', { v: [1, 9] }, { v: { $lt: 2, $gt: 8 } }, false],
    ['mixed condition checks both keys', { v: { x: 1 } }, { v: { $ne: null, x: 2 } }, false],
    ['in matches an array member', { v: [2] }, { v: { $in: [2] } }, true],
    ['in matches NaN like includes', { v: [NaN] }, { v: { $in: [NaN] } }, true],
    ['elemMatch checks literal scalar', { v: [1, 2] }, { v: { $elemMatch: 2 } }, true],
    ['in choices', { v: 'b' }, { v: { $in: ['a', 'b'] } }, true],
    ['in scalar choice', { v: false }, { v: { $in: false } }, true],
    ['nin rejects any matching array element', { v: ['a', 'b'] }, { v: { $nin: ['b'] } }, false],
    ['nin missing', {}, { v: { $nin: ['b'] } }, true],
    ['all members', { v: ['a', 'b'] }, { v: { $all: ['b', 'a'] } }, true],
    ['all object equality', { v: [{ a: 1 }] }, { v: { $all: [{ a: 1 }] } }, true],
    ['all empty array', { v: [] }, { v: { $all: [] } }, true],
    ['all requires an array', { v: 'a' }, { v: { $all: ['a'] } }, false],
    ['elemMatch scalar', { v: [1, 9] }, { v: { $elemMatch: { $gt: 8, $lt: 10 } } }, true],
    ['elemMatch correlates constraints', { v: [1, 9] }, { v: { $elemMatch: { $lt: 2, $gt: 8 } } }, false],
    ['elemMatch object', { v: [{ x: 1, y: 2 }] }, { v: { $elemMatch: { x: 1, y: 2 } } }, true],
    ['elemMatch separate objects', { v: [{ x: 1 }, { y: 2 }] }, { v: { $elemMatch: { x: 1, y: 2 } } }, false],
    ['size zero', { v: [] }, { v: { $size: 0 } }, true],
    ['size exact', { v: [1, 2] }, { v: { $size: 2 } }, true],
    ['exists null', { v: null }, { v: { $exists: true } }, true],
    ['exists explicit undefined', { v: undefined }, { v: { $exists: true } }, false],
    ['exists missing', {}, { v: { $exists: false } }, true],
    ['regex options', { v: 'ALPHA' }, { v: { $regex: '^alpha$', $options: 'i' } }, true],
    ['regex array strings', { v: [1, 'alpha'] }, { v: { $regex: '^a' } }, true],
    ['regex ignores numbers', { v: 123 }, { v: { $regex: '123' } }, false],
    ['regex global lastIndex', { v: ['alpha', 'alpha'] }, { v: { $regex: /a/g } }, true],
    ['type array', { v: [1] }, { v: { $type: 'array' } }, true],
    ['type actual array excludes element type', { v: [1] }, { v: { $type: 'number' } }, false],
    ['type alias bool', { v: true }, { v: { $type: 'bool' } }, true],
    ['type alias int', { v: 2 }, { v: { $type: 'int' } }, true],
    ['type multiple', { v: null }, { v: { $type: ['string', 'null'] } }, true],
    ['type missing', {}, { v: { $type: 'undefined' } }, false],
    ['mod number', { v: 8 }, { v: { $mod: [3, 2] } }, true],
    ['mod array', { v: [1, 8] }, { v: { $mod: [3, 2] } }, true],
    ['mod no numeric coercion', { v: '8' }, { v: { $mod: [3, 2] } }, false],
    ['mod zero divisor', { v: 8 }, { v: { $mod: [0, 0] } }, false],
    ['where document', { v: 2 }, { $where() { return this.v === 2; } }, true],
    ['where field document binding', { v: 2 }, { v: { $where() { return this.v === 2; } } }, true],
    ['and', { x: 1, y: 2 }, { $and: [{ x: 1 }, { y: 2 }] }, true],
    ['or', { x: 1 }, { $or: [{ x: 2 }, { x: 1 }] }, true],
    ['nor', { x: 1 }, { $nor: [{ x: 2 }, { x: 3 }] }, true],
    ['empty and', {}, { $and: [] }, true],
    ['empty or', {}, { $or: [] }, false],
    ['empty nor', {}, { $nor: [] }, true],
    ['malformed and', {}, { $and: {} }, false],
    ['unknown operator', { v: 1 }, { v: { $unknown: 1 } }, false],
    ['multiple implicit keys', { x: 1, y: 2 }, { x: 1, y: 3 }, false],
    ['nested object keys', { v: { x: 1, y: 2 } }, { v: { x: 1, y: 3 } }, false],
    ['bracket path', { v: [{ x: 1 }] }, { 'v[0].x': 1 }, true],
    ['dotted path does not traverse arrays', { v: [{ x: [1, 2] }, { x: [3] }] }, { 'v.x': 2 }, false],
    ['dotted size does not traverse arrays', { v: [{ x: [1, 2] }, { x: [3] }] }, { 'v.x': { $size: 1 } }, false],
    ['dotted all does not traverse arrays', { v: [{ x: [1, 2] }, { x: [3] }] }, { 'v.x': { $all: [1, 2] } }, false],
    ['dotted type does not traverse arrays', { v: [{ x: 1 }, { x: 2 }] }, { 'v.x': { $type: 'number' } }, false],
    ['dotted type is not synthetic array', { v: [{ x: 1 }, { x: 2 }] }, { 'v.x': { $type: 'array' } }, false],
    ['dotted negative checks missing path', { v: [{ x: [1, 2] }, { x: [3] }] }, { 'v.x': { $ne: 2 } }, true],
    ['dotted not checks missing path', { v: [{ x: [1, 2] }, { x: [3] }] }, { 'v.x': { $not: { $eq: 2 } } }, true],
    ['dotted exists does not inspect array members', { v: [{}, { x: null }] }, { 'v.x': { $exists: true } }, false],
    ['includes compares object references', { v: [{ x: 1 }] }, { v: { $includes: { x: 1 } } }, false],
    ['includes string substring', { v: 'hello world' }, { v: { $includes: 'world' } }, true],
    ['includes rejects mixed operand types', { v: [2] }, { v: { $includes: '2' } }, false]
];

for (const [name, record, query, expected] of cases)
    test(`query operator: ${name}`, () => {
        assert.equal(queryData(record, query), expected);
        assert.equal(queryData(record, query), expected, 'repeated evaluation must be stable');
        const matches = compileQuery(query);
        assert.equal(matches(record), expected);
        assert.equal(matches(record), expected, 'compiled evaluation must be stable');
    });

test('compiled query agrees with direct query for array queries and cross-record regex reuse', () => {
    const query = [{ name: { $regex: /alpha/gi } }, { score: { $gt: 10 } }];
    const matches = compileQuery(query);
    const records = [{ name: 'Alpha', score: '20' }, { name: 'beta', score: 20 }];
    for (let i = 0; i < 3; i++)
        for (const record of records)
            assert.equal(matches(record), queryData(record, query));
});
