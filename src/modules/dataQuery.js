import { getValueFromObject } from "./getValueFromObject.js";

const MISSING = Symbol("missing");

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

// Property resolution

function resolveValue(data, key) {
    if (!key.includes(".") && !key.includes("[")) {
        if (data === null || data === undefined ||
            (typeof data !== "object" && typeof data !== "function") ||
            !Object.hasOwn(data, key) || data[key] === undefined) return MISSING;
        return data[key];
    }
    const path = key.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "").split(".");
    for (const part of path) {
        if (data === null || data === undefined ||
            (typeof data !== "object" && typeof data !== "function") ||
            !Object.hasOwn(data, part)) return MISSING;
        data = data[part];
    }
    return data === undefined ? MISSING : data;
}

function preparePath(key) {
    if (!key.includes(".") && !key.includes("[")) {
        return data => {
            if (
                data === null ||
                data === undefined ||
                (
                    typeof data !== "object" &&
                    typeof data !== "function"
                )
            ) return MISSING;

            return Object.hasOwn(data, key) && data[key] !== undefined ? data[key] : MISSING;
        };
    }

    const path = key
        .replace(/\[(\d+)\]/g, ".$1")
        .replace(/^\./, "")
        .split(".");

    return data => {
        for (let i = 0; i < path.length; i++) {
            if (
                data === null ||
                data === undefined ||
                (
                    typeof data !== "object" &&
                    typeof data !== "function"
                ) ||
                !Object.hasOwn(data, path[i])
            ) return MISSING;

            data = data[path[i]];

            if (data === undefined) return MISSING;
        }

    return data === undefined ? MISSING : data;
    };
}

// Membership

function includesValue(dataValue, queryValue) {
    if (Array.isArray(dataValue)) {
        for (let i = 0; i < dataValue.length; i++) {
            if (isEqualValue(dataValue[i], queryValue)) return true;
        }

        return false;
    }

    return typeof dataValue === "string" && typeof queryValue === "string" &&
        dataValue.includes(queryValue);
}

// Operator evaluation

function matchOperator(data, value, operator, query, prepared) {
    let queryValue = query[operator];

    if (operator === "$exists") {
        return queryValue
            ? value !== MISSING
            : value === MISSING;
    }

    if (operator === "$ne") return value === MISSING || !isEqualValue(value, queryValue);
    if (operator === "$nin") return value === MISSING ||
        !(Array.isArray(queryValue) ? queryValue : [queryValue])
            .some(choice => isEqualValue(value, choice));
    if (operator === "$not") return prepared?.match
        ? !prepared.match(value)
        : !matchValue(data, value, queryValue);
    if (value === MISSING) return false;

    switch (operator) {
        case "$eq":
            return isEqualValue(value, queryValue);

        case "$gt":
            return comparable(value, queryValue) && value > queryValue;

        case "$gte":
            return comparable(value, queryValue) && value >= queryValue;

        case "$lt":
            return comparable(value, queryValue) && value < queryValue;

        case "$lte":
            return comparable(value, queryValue) && value <= queryValue;

        case "$in":
            return (Array.isArray(queryValue) ? queryValue : [queryValue])
                .some(choice => isEqualValue(value, choice));

        case "$includes":
            return includesValue(value, queryValue);

        case "$all":
            if (
                !Array.isArray(value) ||
                !Array.isArray(queryValue)
            ) return false;

            for (let i = 0; i < queryValue.length; i++) {
                if (!value.some(item => isEqualValue(item, queryValue[i]))) return false;
            }

            return true;

        case "$elemMatch":
            if (!Array.isArray(value)) return false;

            const match = prepared?.match ?? compileValue(queryValue);
            for (let i = 0; i < value.length; i++) {
                if (match(value[i])) return true;
            }

            return false;

        case "$size":
            return Array.isArray(value) &&
                value.length === queryValue;

        case "$regex": {
            const regex = prepared?.regex ??
                new RegExp(queryValue, query.$options || "");
            return (Array.isArray(value) ? value : [value]).some(item => {
                if (typeof item !== "string") return false;
                regex.lastIndex = 0;
                return regex.test(item);
            });
        }

        case "$type": {
            const aliases = { bool: "boolean", int: "number", long: "number", double: "number", decimal: "number" };
            const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
            return (Array.isArray(queryValue) ? queryValue : [queryValue])
                .some(type => (aliases[type] || type) === actual);
        }

        case "$mod":
            return Array.isArray(queryValue) && queryValue.length === 2 && queryValue[0] !== 0 &&
                (Array.isArray(value) ? value : [value]).some(item =>
                    typeof item === "number" && item % queryValue[0] === queryValue[1]);

        case "$where":
            return typeof queryValue === "function" && Boolean(queryValue.call(data));

        default:
            return false;
    }
}

// Value evaluation

function comparable(value, expected) {
    const kind = typeof value;
    if (kind !== typeof expected) return false;
    if (kind === "number") return Number.isFinite(value) && Number.isFinite(expected);
    return kind === "string" || kind === "boolean" || kind === "bigint";
}

function matchValue(data, value, query) {
    if (query === null || typeof query !== "object") {
        return value !== MISSING && isEqualValue(value, query);
    }

    if (Array.isArray(query)) {
        return isEqualArray(value, query);
    }

    const keys = Object.keys(query);

    if (!keys.length) return value !== MISSING;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (key === "$options") continue;

        if (key.startsWith("$")) {
            if (!matchOperator(data, value, key, query)) {
                return false;
            }
        } else {
            if (
                value === MISSING ||
                value === null ||
                typeof value !== "object"
            ) return false;

            if (
                !matchValue(
                    value,
                    resolveValue(value, key),
                    query[key]
                )
            ) return false;
        }
    }

    return true;
}

// Main query entry

export function queryData(data, query) {
    if (!query) return true;

    const keys = Object.keys(query);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = query[key];

        switch (key) {
            case "$where":
                if (typeof value !== "function" || !value.call(data)) return false;
                break;

            case "$and":
                if (!Array.isArray(value)) return false;
                for (let j = 0; j < value.length; j++) {
                    if (!queryData(data, value[j])) return false;
                }
                break;

            case "$or": {
                if (!Array.isArray(value)) return false;
                let matched = false;

                for (let j = 0; j < value.length; j++) {
                    if (queryData(data, value[j])) {
                        matched = true;
                        break;
                    }
                }

                if (!matched) return false;
                break;
            }

            case "$nor":
                if (!Array.isArray(value)) return false;
                for (let j = 0; j < value.length; j++) {
                    if (queryData(data, value[j])) return false;
                }
                break;

            default:
                if (
                    !matchValue(
                        data,
                        resolveValue(data, key),
                        value
                    )
                ) return false;
        }
    }

    return true;
}

// Prepared operator evaluation

function prepareOperator(operator, query) {
    const queryValue = query[operator];
    const prepared = {};

    switch (operator) {
        case "$in":
        case "$nin":
            break;

        case "$regex":
            prepared.regex = new RegExp(
                queryValue,
                query.$options || ""
            );
            break;

        case "$elemMatch":
            prepared.match = compileValue(queryValue);
            break;

        case "$not":
            prepared.match = compileValue(queryValue);
            break;
    }

    return value =>
        matchOperator(
            undefined,
            value,
            operator,
            query,
            prepared
        );
}

function compileValue(query) {
    if (query === null || typeof query !== "object") {
        return value => {
            return value !== MISSING && isEqualValue(value, query);
        };
    }

    if (Array.isArray(query)) {
        return value => isEqualArray(value, query);
    }

    const keys = Object.keys(query);

    if (!keys.length) {
        return value => value !== MISSING;
    }

    const conditions = [];

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (key === "$options") continue;

        if (key.startsWith("$")) {
            conditions.push(prepareOperator(key, query));
        } else {
            const resolve = preparePath(key);
            const match = compileValue(query[key]);

            conditions.push(value => {
                if (
                    value === MISSING ||
                    value === null ||
                    typeof value !== "object"
                ) return false;

                return match(resolve(value));
            });
        }
    }

    if (conditions.length === 1) return conditions[0];

    return value => {
        for (let i = 0; i < conditions.length; i++) {
            if (!conditions[i](value)) return false;
        }

        return true;
    };
}

// Prepared query entry

export function compileQuery(query) {
    if (!query) return () => true;

    const keys = Object.keys(query);
    const conditions = [];

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = query[key];

        if (
            key === "$and" ||
            key === "$or" ||
            key === "$nor"
        ) {
            const matches = [];

            for (let j = 0; j < value.length; j++) {
                matches.push(compileQuery(value[j]));
            }

            if (key === "$and") {
                conditions.push(data => {
                    for (let j = 0; j < matches.length; j++) {
                        if (!matches[j](data)) return false;
                    }

                    return true;
                });
            } else if (key === "$or") {
                conditions.push(data => {
                    for (let j = 0; j < matches.length; j++) {
                        if (matches[j](data)) return true;
                    }

                    return false;
                });
            } else {
                conditions.push(data => {
                    for (let j = 0; j < matches.length; j++) {
                        if (matches[j](data)) return false;
                    }

                    return true;
                });
            }
        } else {
            const resolve = preparePath(key);
            const match = compileValue(value);

            conditions.push(data => match(resolve(data)));
        }
    }

    if (conditions.length === 1) return conditions[0];

    return data => {
        for (let i = 0; i < conditions.length; i++) {
            if (!conditions[i](data)) return false;
        }

        return true;
    };
}

// Search

export function searchData(data, search) {
    if (!search) return true;
    if (!Array.isArray(search)) search = [search];

    for (let i = 0; i < search.length; i++) {
        let searchValue = search[i].value;

        if (!Array.isArray(searchValue)) {
            searchValue = [searchValue];
        }

        const caseSensitive =
            search[i].caseSensitive === true ||
            search[i].caseSensitive === "true";

        searchValue = searchValue.map(value => {
            const text = String(value ?? "");

            return caseSensitive
                ? text
                : text.toLowerCase();
        });

        for (let key in data) {
            let value = data[key];
            let status = false;

            if (value === null || value === undefined) {
                value = "";
            }

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

                if (
                    searchString === "" &&
                    search[i].operator === "and"
                ) {
                    if (value !== "") return false;
                }

                if (value.indexOf(searchString) > -1) {
                    status = true;
                }

                if (status) return true;
                else if (search[i].operator == "and") {
                    return false;
                }
            }
        }

        if (
            searchValue.some(value => value.length > 0) &&
            search[i].operator === "or"
        ) return false;
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

function getArraySortValue(value, direction) {
    if (!value.length) return value;

    const sorted = [...value].sort(compareMongoValues);

    return direction === "desc"
        ? sorted[sorted.length - 1]
        : sorted[0];
}

function compareMongoValues(a, b, direction = "asc") {
    if (Array.isArray(a)) {
        a = getArraySortValue(a, direction);
    }

    if (Array.isArray(b)) {
        b = getArraySortValue(b, direction);
    }

    if (
        Object.is(a, b) ||
        (a == null && b == null)
    ) return 0;

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

export function sortData(data, sort) {
    return data.sort((a, b) => {
        for (let i = 0; i < sort.length; i++) {
            const key = sort[i].key;

            const direction =
                sort[i].direction === "desc"
                    ? "desc"
                    : "asc";

            const aValue = getValueFromObject(a, key);
            const bValue = getValueFromObject(b, key);

            const comparison = compareMongoValues(
                aValue,
                bValue,
                direction
            );

            if (comparison) {
                return direction === "desc"
                    ? -comparison
                    : comparison;
            }
        }

        return 0;
    });
}
