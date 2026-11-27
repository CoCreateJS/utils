// Equality

export function isEqualArray(arr1, arr2) {
    if (arr1 === arr2) return true;

    if (
        !Array.isArray(arr1) ||
        !Array.isArray(arr2) ||
        arr1.length !== arr2.length
    ) return false;

    for (let i = 0; i < arr1.length; i++) {
        if (!isEqualValue(arr1[i], arr2[i])) return false;
    }

    return true;
}

export function isEqualObject(obj1, obj2) {
    if (Object.is(obj1, obj2)) return true;

    if (
        !obj1 ||
        !obj2 ||
        typeof obj1 !== "object" ||
        typeof obj2 !== "object"
    ) return false;

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

    if (keys1.length !== keys2.length) return false;

    for (let i = 0; i < keys1.length; i++) {
        const key = keys1[i];

        if (
            !Object.hasOwn(obj2, key) ||
            !isEqualValue(obj1[key], obj2[key])
        ) return false;
    }

    return true;
}

function isEqualValue(value1, value2) {
    if (Object.is(value1, value2)) return true;

    if (value1 === null || value2 === null ||
        typeof value1 !== "object" || typeof value2 !== "object") return false;

    return Array.isArray(value1) && Array.isArray(value2)
        ? isEqualArray(value1, value2)
        : isEqualObject(value1, value2);
}

// Resolve one explicit path. Undefined is also the value of a missing field.
function queryValue(data, path) {
    if (!path.includes(".") && !path.includes("[")) {
        return data !== null && typeof data === "object" && Object.hasOwn(data, path)
            ? data[path] : undefined;
    }

    return readQueryPath(data, queryPathKeys(path));
}

function queryPathKeys(path) {
    return (path.includes("[") ? path.replace(/\[(\d+)\]/g, ".$1") : path).split(".");
}

function readQueryPath(data, keys) {
    for (const key of keys) {
        if (!key) continue;
        if (data === null || typeof data !== "object" || !Object.hasOwn(data, key) ||
            (Array.isArray(data) && !/^\d+$/.test(key))) return undefined;
        data = data[key];
    }
    return data;
}

function queryValueType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (value instanceof Date) return "date";
    return typeof value;
}

const queryTypeAliases = { bool: "boolean", int: "number", long: "number", double: "number", decimal: "number" };

function matchQueryFieldValue(value, condition, document) {
    if (condition === null || typeof condition !== "object" || condition instanceof Date || condition instanceof RegExp)
        return isEqualValue(value, condition);
    if (Array.isArray(condition)) return Array.isArray(value) && isEqualArray(value, condition);

    const exists = value !== undefined;
    const keys = Object.keys(condition);
    if (!keys.length) return exists && value !== null && typeof value === "object";

    for (const operator of keys) {
        const expected = condition[operator];
        if (operator === "$options") continue;
        if (!operator.startsWith("$")) {
            if (value === null || typeof value !== "object" ||
                !matchQueryFieldValue(queryValue(value, operator), expected, value)) return false;
            continue;
        }
        if (!matchQueryOperator(value, operator, expected, operator === "$regex" ? condition.$options : undefined, document)) return false;
    }
    return true;
}

function createQueryRegex(expected, options) {
    return expected instanceof RegExp
        ? new RegExp(expected.source, expected.flags)
        : new RegExp(expected, options || "");
}

function matchesRegex(value, expression) {
    const matches = item => {
        if (typeof item !== "string") return false;
        expression.lastIndex = 0;
        return expression.test(item);
    };
    return Array.isArray(value) ? value.some(matches) : matches(value);
}

function matchQueryOperator(value, operator, expected, options, document) {
    switch (operator) {
        case "$eq": return isEqualValue(value, expected);
        case "$ne": return !isEqualValue(value, expected);
        case "$not": return !matchQueryFieldValue(value, expected, document);
        case "$lt": return value < expected;
        case "$lte": return value <= expected;
        case "$gt": return value > expected;
        case "$gte": return value >= expected;
        case "$in": case "$nin": {
            const choices = Array.isArray(expected) ? expected : [expected];
            const matched = Array.isArray(value)
                ? value.some(item => choices.includes(item))
                : choices.includes(value);
            return operator === "$in" ? matched : !matched;
        }
        case "$includes":
            return (Array.isArray(value) || typeof value === "string") && value.includes(expected);
        case "$all":
            return Array.isArray(value) && Array.isArray(expected) &&
                expected.every(item => value.some(entry => isEqualValue(entry, item)));
        case "$elemMatch":
            return Array.isArray(value) && value.some(item => {
                if (expected && typeof expected === "object" &&
                    ["$and", "$or", "$nor"].some(op => Object.hasOwn(expected, op)))
                    return queryData(item, expected);
                return matchQueryFieldValue(item, expected, item);
            });
        case "$size": return Array.isArray(value) && value.length === expected;
        case "$exists": return Boolean(expected) === (value !== undefined);
        case "$regex": return matchesRegex(value, createQueryRegex(expected, options));
        case "$type": {
            const actual = queryValueType(value);
            const expectedTypes = Array.isArray(expected) ? expected : [expected];
            return value !== undefined && expectedTypes.some(type => (queryTypeAliases[type] || type) === actual);
        }
        case "$mod":
            return value !== undefined && Array.isArray(expected) && expected.length === 2 && expected[0] !== 0 &&
                (Array.isArray(value)
                    ? value.some(item => typeof item === "number" && item % expected[0] === expected[1])
                    : typeof value === "number" && value % expected[0] === expected[1]);
        case "$where": return typeof expected === "function" && Boolean(expected.call(document));
        default: return false;
    }
}

// Main query entry
export function queryData(data, query) {
    if (query === undefined || query === null) return true;
    if (Array.isArray(query)) return query.every(condition => queryData(data, condition));
    if (typeof query !== "object") return false;

    for (const key of Object.keys(query)) {
        const condition = query[key];
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
            if (!matchQueryFieldValue(queryValue(data, key), condition, data)) return false;
        }
    }
    return true;
}

// Prepare a reusable predicate using the same operators as queryData.
function prepareQueryPath(key) {
    if (!key.includes(".") && !key.includes("[")) {
        return data => data !== null && typeof data === "object" && Object.hasOwn(data, key)
            ? data[key] : undefined;
    }
    const keys = queryPathKeys(key);
    return data => readQueryPath(data, keys);
}

function allConditions(conditions) {
    if (conditions.length === 1) return conditions[0];
    return (value, document) => {
        for (const matches of conditions) {
            if (!matches(value, document)) return false;
        }
        return true;
    };
}

function compileField(condition) {
    if (condition === null || typeof condition !== "object" || condition instanceof Date || condition instanceof RegExp)
        return value => isEqualValue(value, condition);
    if (Array.isArray(condition)) return value => Array.isArray(value) && isEqualArray(value, condition);

    const keys = Object.keys(condition);
    if (!keys.length) return value => value !== null && typeof value === "object";
    const conditions = [];
    for (const operator of keys) {
        const expected = condition[operator];
        if (operator === "$options") continue;
        if (operator === "$regex") {
            const options = condition.$options;
            let expression;
            conditions.push(value => matchesRegex(value, expression ??= createQueryRegex(expected, options)));
        } else if (!operator.startsWith("$")) {
            const read = prepareQueryPath(operator);
            const matches = compileField(expected);
            conditions.push(value => value !== null && typeof value === "object" && matches(read(value), value));
        } else {
            conditions.push((value, document) => matchQueryOperator(value, operator, expected, undefined, document));
        }
    }
    return allConditions(conditions);
}

export function compileQuery(query) {
    if (query == null) return () => true;
    if (Array.isArray(query)) return allConditions(query.map(compileQuery).filter(Boolean));
    if (typeof query !== "object") return () => false;

    const conditions = [];
    for (const key of Object.keys(query)) {
        const condition = query[key];
        if (key === "$and" || key === "$or" || key === "$nor") {
            if (!Array.isArray(condition)) {
                conditions.push(() => false);
                continue;
            }
            const predicates = condition.map(compileQuery);
            if (key === "$and") conditions.push(allConditions(predicates.filter(Boolean)));
            if (key === "$or") conditions.push(data => predicates.some(matches => matches(data)));
            if (key === "$nor") conditions.push(data => !predicates.some(matches => matches(data)));
        } else if (key === "$where") {
            conditions.push(data => typeof condition === "function" && Boolean(condition.call(data)));
        } else if (key.startsWith("$")) {
            conditions.push(() => false);
        } else {
            const read = prepareQueryPath(key);
            const matches = compileField(condition);
            conditions.push(data => matches(read(data), data));
        }
    }
    return allConditions(conditions);
}

// Search

function searchTerm(value, caseSensitive) {
    const text = String(value ?? "");
    return caseSensitive ? text : text.toLowerCase();
}

function searchableText(value, caseSensitive) {
    let text;
    if (value == null) text = "";
    else if (typeof value === "object") text = JSON.stringify(value) || "";
    else text = typeof value === "string" ? value : value.toString();
    return caseSensitive ? text : text.toLowerCase();
}

// A clause can match, stop with false, or defer to subsequent clauses.
function searchClause(data, clause) {
    const { value, caseSensitive: sensitivity, operator } = clause;
    const caseSensitive = sensitivity === true || sensitivity === "true";
    const and = operator == "and";

    if (!Array.isArray(value) || value.length === 1 && Object.hasOwn(value, 0)) {
        const term = searchTerm(Array.isArray(value) ? value[0] : value, caseSensitive);
        for (const key in data) {
            const text = searchableText(data[key], caseSensitive);
            if (and) return term === "" && operator === "and" ? text === "" : text.includes(term);
            if (text.includes(term)) return true;
        }
        return operator === "or" && term.length ? false : undefined;
    }

    const terms = value.map(term => searchTerm(term, caseSensitive));
    for (const key in data) {
        const text = searchableText(data[key], caseSensitive);
        for (const term of terms) {
            if (and) return term === "" && operator === "and" ? text === "" : text.includes(term);
            if (text.includes(term)) return true;
        }
    }
    return operator === "or" && terms.some(term => term.length > 0) ? false : undefined;
}

export function searchData(data, search) {
    if (!search) return true;
    if (!Array.isArray(search)) return searchClause(data, search) ?? true;

    for (const clause of search) {
        const result = searchClause(data, clause);
        if (result !== undefined) return result;
    }
    return true;
}

// Sorting

function getMongoTypeOrder(value) {
    if (value?._bsontype === "MinKey") return 0;
    if (value == null) return 1;

    if (
        typeof value === "number" ||
        typeof value === "bigint"
    ) return 2;

    if (
        typeof value === "string" ||
        typeof value === "symbol"
    ) return 3;

    if (Array.isArray(value)) {
        return value.length ? 5 : 0.5;
    }

    if (
        value instanceof Uint8Array ||
        value instanceof ArrayBuffer
    ) return 6;

    if (
        value?._bsontype === "ObjectId" ||
        value?.constructor?.name === "ObjectId"
    ) return 7;

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

    const length = Math.min(
        aEntries.length,
        bEntries.length
    );

    for (let i = 0; i < length; i++) {
        const [aKey, aValue] = aEntries[i];
        const [bKey, bValue] = bEntries[i];

        const typeComparison =
            getMongoTypeOrder(aValue) -
            getMongoTypeOrder(bValue);

        if (typeComparison) {
            return Math.sign(typeComparison);
        }

        const keyComparison = compareStrings(aKey, bKey);

        if (keyComparison) return keyComparison;

        const valueComparison = compareMongoValues(
            aValue,
            bValue
        );

        if (valueComparison) return valueComparison;
    }

    return Math.sign(aEntries.length - bEntries.length);
}

function getArraySortValue(value, direction, cache) {
    if (!value.length) return value;

    if (cache?.has(value)) return cache.get(value);

    const sorted = [...value].sort(compareMongoValues);
    const result = direction === "desc" ? sorted[sorted.length - 1] : sorted[0];
    cache?.set(value, result);
    return result;
}

function compareMongoValues(a, b, direction = "asc", arrayKeys) {
    if (Array.isArray(a)) {
        a = getArraySortValue(a, direction, arrayKeys);
    }

    if (Array.isArray(b)) {
        b = getArraySortValue(b, direction, arrayKeys);
    }

    if (
        Object.is(a, b) ||
        (a == null && b == null)
    ) return 0;

    const kind = typeof a;
    if ((kind === "number" || kind === "string" || kind === "bigint") && kind === typeof b)
        return a < b ? -1 : a > b ? 1 : 0;

    const typeComparison =
        getMongoTypeOrder(a) - getMongoTypeOrder(b);

    if (typeComparison) return Math.sign(typeComparison);

    if (a == null || b == null) {
        return a == null ? -1 : 1;
    }

    if (
        typeof a === "number" ||
        typeof a === "bigint"
    ) return a < b ? -1 : a > b ? 1 : 0;

    if (
        typeof a === "string" ||
        typeof a === "symbol"
    ) return compareStrings(a, b);

    if (typeof a === "boolean") {
        return Number(a) - Number(b);
    }

    if (a instanceof Date) {
        return Math.sign(a.getTime() - b.getTime());
    }

    if (a instanceof RegExp) {
        return compareStrings(a.toString(), b.toString());
    }

    if (typeof a === "object") {
        return compareMongoObjects(a, b);
    }

    return compareStrings(a, b);
}

function sortValueReader(key) {
    if (typeof key !== "string" || !key) return () => undefined;

    const path = key.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "").split(".");
    if (path.length === 1) {
        const field = path[0];
        return record => record !== null && typeof record === "object" && Object.hasOwn(record, field)
            ? record[field] : undefined;
    }
    return record => {
        if (record === null || typeof record !== "object") return undefined;
        for (const field of path) {
            if (record == null || (typeof record !== "object" && typeof record !== "function") ||
                !Object.hasOwn(record, field)) return undefined;
            record = record[field];
        }
        return record;
    };
}

export function sortData(data, sort) {
    if (data.length < 2) return data.sort();

    const fields = Array.from(sort, ({ key, direction }) => ({
        read: sortValueReader(key),
        direction: direction === "desc" ? "desc" : "asc",
        arrayKeys: new WeakMap()
    }));

    return data.sort((a, b) => {
        for (const { read, direction, arrayKeys } of fields) {
            const comparison = compareMongoValues(read(a), read(b), direction, arrayKeys);
            if (comparison) return direction === "desc" ? -comparison : comparison;
        }
        return 0;
    });
}
