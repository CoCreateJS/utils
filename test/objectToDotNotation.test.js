import assert from 'node:assert/strict'
import test from 'node:test'
import { objectToDotNotation } from '../src/modules/objectToDotNotation.js'

test('default flattening behavior remains unchanged', () => {
	assert.deepEqual(objectToDotNotation({ empty: {}, list: [], nested: { value: 1 } }), {
		'nested.value': 1
	})
})

test('optional container mode retains empty values, array positions, and binary values', () => {
	const emptyObject = {}
	const emptyArray = []
	const binary = new Uint8Array([1, 2])
	const list = [emptyObject, , binary]
	const flattened = objectToDotNotation({ emptyObject, emptyArray, list }, {
		includeContainers: true,
		includeArrayHoles: true,
		preserveBinary: true
	})

	assert.equal(flattened.emptyObject, emptyObject)
	assert.equal(flattened.emptyArray, emptyArray)
	assert.equal(flattened.list, list)
	assert.equal(flattened['list[0]'], emptyObject)
	assert.equal(Object.hasOwn(flattened, 'list[1]'), true)
	assert.equal(flattened['list[1]'], undefined)
	assert.equal(flattened['list[2]'], binary)
})

test('the inclusion callback can omit metadata branches while preserving literal dot paths', () => {
	const flattened = objectToDotNotation({ value: 1, $meta: { secret: true }, binary: ['descriptor'] }, {
		includeContainers: true,
		shouldInclude: (path, value, parent, key) => key !== '$meta' && key !== 'binary'
	})
	assert.deepEqual(flattened, { value: 1 })
})
