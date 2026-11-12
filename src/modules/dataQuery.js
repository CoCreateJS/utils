import { getValueFromObject } from "./getValueFromObject.js";

export function isEqualArray(arr1, arr2) {
	if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
		return false;
	}
	if (arr1.length !== arr2.length) {
		return false;
	}
	for (let i = 0; i < arr1.length; i++) {
		if (!isEqualValue(arr1[i], arr2[i])) {
			return false;
		}
	}
	return true;
}

export function isEqualObject(obj1, obj2) {
	if (Object.is(obj1, obj2)) return true;
	if (!obj1 || !obj2 || typeof obj1 !== "object" || typeof obj2 !== "object") {
		return false;
	}
	if (obj1 instanceof Date || obj2 instanceof Date) {
		return obj1 instanceof Date &&
			obj2 instanceof Date &&
			obj1.getTime() === obj2.getTime();
	}
	if (Array.isArray(obj1) || Array.isArray(obj2)) {
		return isEqualArray(obj1, obj2);
	}

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (const key of keys1) {
		if (!Object.prototype.hasOwnProperty.call(obj2, key) || !isEqualValue(obj1[key], obj2[key])) {
			return false;
		}
	}

	return true;
}

function isEqualValue(value1, value2) {
	if (Object.is(value1, value2)) return true;
	if (Array.isArray(value1) || Array.isArray(value2)) {
		return isEqualArray(value1, value2);
	}
	if (
		value1 &&
		value2 &&
		typeof value1 === "object" &&
		typeof value2 === "object"
	) {
		return isEqualObject(value1, value2);
	}
	return false;
}

function pathResult(data, path) {
	// Most CRUD predicates address a direct property; avoid path parsing and
	// recursive visitor allocation on that common path.
	if (!path.includes(".") && !path.includes("[")) {
		const exists = data !== null && typeof data === "object" && Object.hasOwn(data, path);
		return { exists, values: exists ? [data[path]] : [] };
	}
	const keys = String(path).replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
	const visit = (value, index) => {
		if (index === keys.length) return { exists: true, values: [value] };
		if (Array.isArray(value) && !/^\d+$/.test(keys[index])) {
			const result = { exists: false, values: [] };
			for (const item of value) {
				const child = visit(item, index);
				result.exists ||= child.exists;
				for (const leaf of child.values) result.values.push(leaf);
			}
			return result;
		}
		if (value === null || typeof value !== "object" || !Object.hasOwn(value, keys[index]))
			return { exists: false, values: [] };
		return visit(value[keys[index]], index + 1);
	};
	return visit(data, 0);
}

function queryType(value) {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	if (value instanceof Date) return "date";
	return typeof value;
}

function equalQueryValue(value, expected) {
	if (Array.isArray(value)) {
		if (Array.isArray(expected) && isEqualArray(value, expected)) return true;
		return value.some(item => isEqualValue(item, expected));
	}
	return isEqualValue(value, expected);
}

function compareQueryValue(value, expected, operator) {
	switch (operator) {
		case "$lt": return value < expected;
		case "$lte": return value <= expected;
		case "$gt": return value > expected;
		case "$gte": return value >= expected;
		default: return false;
	}
}

function matchFieldValue(value, exists, condition, document, key) {
	if (condition === null || typeof condition !== "object" || condition instanceof Date || condition instanceof RegExp)
		return exists ? equalQueryValue(value, condition) : condition === undefined;
	if (Array.isArray(condition))
		return exists && Array.isArray(value) && isEqualArray(value, condition);

	const keys = Object.keys(condition);
	const operatorKeys = keys.filter(name => name.startsWith("$"));
	if (!operatorKeys.length)
		return exists && value !== null && typeof value === "object" && queryData(value, condition);

	for (const operator of operatorKeys) {
		const expected = condition[operator];
		if (operator === "$options") continue;
		let result = false;
		switch (operator) {
			case "$eq":
				result = exists ? equalQueryValue(value, expected) : expected === undefined;
				break;
			case "$ne":
				result = !matchFieldValue(value, exists, { $eq: expected }, document, key);
				break;
			case "$not":
				result = !matchFieldValue(value, exists, expected, document, key);
				break;
			case "$lt": case "$lte": case "$gt": case "$gte":
				result = exists && (Array.isArray(value) ? value.some(item => compareQueryValue(item, expected, operator)) : compareQueryValue(value, expected, operator));
				break;
			case "$in": case "$nin": {
				const choices = Array.isArray(expected) ? expected : [expected];
				const matched = exists
					? (Array.isArray(value) ? value.some(item => choices.some(choice => equalQueryValue(item, choice))) : choices.some(choice => equalQueryValue(value, choice)))
					: choices.includes(undefined);
				result = operator === "$in" ? matched : !matched;
				break;
			}
			case "$all":
				result = Array.isArray(value) && Array.isArray(expected) && expected.every(item => value.some(entry => isEqualValue(entry, item)));
				break;
			case "$elemMatch":
				result = Array.isArray(value) && value.some(item => {
					if (expected && typeof expected === "object" && !Array.isArray(expected) && Object.keys(expected).every(name => name.startsWith("$")))
						return matchFieldValue(item, true, expected, item, key);
					return queryData(item, expected);
				});
				break;
			case "$size":
				result = Array.isArray(value) && value.length === expected;
				break;
			case "$exists":
				result = Boolean(expected) === exists;
				break;
			case "$regex": {
				const expression = expected instanceof RegExp
					? new RegExp(expected.source, expected.flags)
					: new RegExp(expected, condition.$options || "");
				const values = Array.isArray(value) ? value : [value];
				result = exists && values.some(item => {
					if (typeof item !== "string") return false;
					expression.lastIndex = 0;
					return expression.test(item);
				});
				break;
			}
			case "$type": {
				const aliases = { bool: "boolean", int: "number", long: "number", double: "number", decimal: "number" };
				const actual = queryType(value);
				const expectedTypes = Array.isArray(expected) ? expected : [expected];
				result = exists && expectedTypes.some(type => (aliases[type] || type) === actual);
				break;
			}
			case "$mod":
				result = exists && Array.isArray(expected) && expected.length === 2 && expected[0] !== 0 &&
					(Array.isArray(value) ? value.some(item => typeof item === "number" && item % expected[0] === expected[1]) : typeof value === "number" && value % expected[0] === expected[1]);
				break;
			case "$where":
				result = typeof expected === "function" && Boolean(expected.call(document));
				break;
			default:
				return false;
		}
		if (!result) return false;
	}
	return true;
}

// Dotted traversal can reach several actual values. Keep those values
// separate: their container is not a stored array for $type/$size/$all.
function matchPathResult(result, condition, document, key) {
	if (result.values.length <= 1)
		return matchFieldValue(result.values[0], result.exists, condition, document, key);

	const operators = condition && typeof condition === "object" && !Array.isArray(condition)
		? Object.keys(condition).filter(name => name.startsWith("$")) : [];
	if (!operators.length)
		return result.values.some(value => matchFieldValue(value, true, condition, document, key));

	for (const operator of operators) {
		if (operator === "$options") continue;
		const expected = condition[operator];
		if (operator === "$not") {
			if (matchPathResult(result, expected, document, key)) return false;
			continue;
		}
		const negative = operator === "$ne" || operator === "$nin";
		const positive = operator === "$ne" ? "$eq" : operator === "$nin" ? "$in" : operator;
		const predicate = { [positive]: expected };
		if (operator === "$regex" && condition.$options) predicate.$options = condition.$options;
		const matched = result.values.some(value => matchFieldValue(value, true, predicate, document, key));
		if (negative ? matched : !matched) return false;
	}
	return true;
}

export function queryData(data, query) {
	if (query === undefined || query === null) return true;
	if (Array.isArray(query)) return query.every(condition => queryData(data, condition));
	if (typeof query !== "object") return false;

	for (const [key, condition] of Object.entries(query)) {
		if (key === "$and") {
			if (!Array.isArray(condition) || !condition.every(part => queryData(data, part))) return false;
		} else if (key === "$or") {
			if (!Array.isArray(condition) || !condition.some(part => queryData(data, part))) return false;
		} else if (key === "$nor") {
			if (!Array.isArray(condition) || condition.some(part => queryData(data, part))) return false;
		} else if (key === "$where") {
			if (typeof condition !== "function" || !condition.call(data)) return false;
		} else if (key.startsWith("$")) {
			return false;
		} else {
			const result = pathResult(data, key);
			if (!matchPathResult(result, condition, data, key)) return false;
		}
	}
	return true;
}

export function searchData(data, search) {
	if (!search) return true;
	if (!Array.isArray(search)) search = [search];
	for (let i = 0; i < search.length; i++) {
		let searchValue = search[i].value;
		if (!Array.isArray(searchValue)) searchValue = [searchValue];
		const caseSensitive =
			search[i].caseSensitive === true ||
			search[i].caseSensitive === "true";
		searchValue = searchValue.map((value) => {
			const text = String(value ?? "");
			return caseSensitive ? text : text.toLowerCase();
		});
		for (let key in data) {
			let value = data[key];
			let status = false;
			if (value === null || value === undefined) value = "";
			switch (typeof value) {
				case "number":
				case "boolean":
				case "bigint":
				case "symbol":
					value = value.toString();
					break;
				case "object":
					value = JSON.stringify(value) || "";
					break;
				case "function":
					value = value.toString();
					break;
			}
			if (!caseSensitive) value = value.toLowerCase();

			for (let j = 0; j < searchValue.length; j++) {
				const searchString = searchValue[j];

				if (searchString === "" && search[i].operator === "and") {
					if (value !== "") return false;
				}

				if (value.indexOf(searchString) > -1) status = true;

				if (status) return true;
				else if (search[i].operator == "and") return false;
			}
		}
		if (
			searchValue.some((value) => value.length > 0) &&
			search[i].operator === "or"
		) return false;
	}
	return true;
}

function getMongoTypeOrder(value) {
	if (value?._bsontype === "MinKey") return 0;
	if (value == null) return 1;
	if (typeof value === "number" || typeof value === "bigint") return 2;
	if (typeof value === "string" || typeof value === "symbol") return 3;
	if (Array.isArray(value)) return value.length ? 5 : 0.5;
	if (value instanceof Uint8Array || value instanceof ArrayBuffer) return 6;
	if (value?._bsontype === "ObjectId" || value?.constructor?.name === "ObjectId")
		return 7;
	if (typeof value === "boolean") return 8;
	if (value instanceof Date) return 9;
	if (value?._bsontype === "Timestamp") return 10;
	if (value instanceof RegExp) return 11;
	if (typeof value === "function") return 12;
	if (value?._bsontype === "MaxKey") return 14;
	if (typeof value === "object") return 4;
	return 13;
}

function compareStrings(a, b) {
	const aString = String(a);
	const bString = String(b);
	if (aString === bString) return 0;
	return aString < bString ? -1 : 1;
}

function compareMongoObjects(a, b) {
	const aEntries = Object.entries(a);
	const bEntries = Object.entries(b);
	const length = Math.min(aEntries.length, bEntries.length);
	for (let index = 0; index < length; index++) {
		const [aKey, aValue] = aEntries[index];
		const [bKey, bValue] = bEntries[index];
		const typeComparison = getMongoTypeOrder(aValue) - getMongoTypeOrder(bValue);
		if (typeComparison) return Math.sign(typeComparison);
		const keyComparison = compareStrings(aKey, bKey);
		if (keyComparison) return keyComparison;
		const valueComparison = compareMongoValues(aValue, bValue);
		if (valueComparison) return valueComparison;
	}
	return Math.sign(aEntries.length - bEntries.length);
}

function getArraySortValue(value, direction) {
	if (!value.length) return value;
	const sorted = [...value].sort(compareMongoValues);
	return direction === "desc" ? sorted[sorted.length - 1] : sorted[0];
}

function compareMongoValues(a, b, direction = "asc") {
	if (Array.isArray(a)) a = getArraySortValue(a, direction);
	if (Array.isArray(b)) b = getArraySortValue(b, direction);
	if (Object.is(a, b) || (a == null && b == null)) return 0;

	const typeComparison = getMongoTypeOrder(a) - getMongoTypeOrder(b);
	if (typeComparison) return Math.sign(typeComparison);
	if (a == null || b == null) return a == null ? -1 : 1;

	if (typeof a === "number" || typeof a === "bigint")
		return a < b ? -1 : a > b ? 1 : 0;
	if (typeof a === "string" || typeof a === "symbol")
		return compareStrings(a, b);
	if (typeof a === "boolean") return Number(a) - Number(b);
	if (a instanceof Date) return Math.sign(a.getTime() - b.getTime());
	if (a instanceof RegExp) return compareStrings(a.toString(), b.toString());
	if (typeof a === "object") return compareMongoObjects(a, b);
	return compareStrings(a, b);
}

export function sortData(data, sort) {
	return data.sort((a, b) => {
		for (let i = 0; i < sort.length; i++) {
			const key = sort[i].key;
			const direction = sort[i].direction === "desc" ? "desc" : "asc";
			const aValue = getValueFromObject(a, key);
			const bValue = getValueFromObject(b, key);
			const comparison = compareMongoValues(aValue, bValue, direction);
			if (comparison) return direction === "desc" ? -comparison : comparison;
		}
		return 0;
	});
}
