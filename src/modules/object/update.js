import { dotNotationToObject } from "./dotNotationToObject.js";
import { objectToDotNotation } from "./objectToDotNotation.js";
import { getValueFromObject } from "./getValueFromObject.js";
import { isEqualArray, isEqualObject } from "./query.js";

const updateOperators = new Set([
    "$set", "$rename", "$inc", "$push", "$each", "$splice", "$unset",
    "$delete", "$slice", "$pop", "$shift", "$addToSet", "$pull"
]);
const isArrayIndex = key => key[0] >= "0" && key[0] <= "9" &&
    /^(0|[1-9]\d*)$/.test(key) && Number(key) < 2 ** 32 - 1;
const noCreate = new Set(["$rename", "$unset", "$delete", "$slice", "$pop", "$shift", "$pull"]);

function assertUpdateKey(key) {
    if (!key || key === "__proto__" || key === "prototype" || key === "constructor")
        throw new TypeError("Invalid update path");
}

function assertUpdatePath(path) {
    const keys = (path.includes("[") ? path.replace(/\[(\d+)\]/g, ".$1") : path).split(".");
    for (const key of keys) assertUpdateKey(key);
    return keys;
}

function deleteValue(object, key) {
    if (typeof key === "number" && Array.isArray(object)) object.splice(key, 1);
    else delete object[key];
}

function arrayAt(object, key) {
    if (object[key] === undefined) object[key] = [];
    if (!Array.isArray(object[key])) throw new TypeError("Array update requires an array");
    return object[key];
}

function renameTo(object, keys, value) {
    let parent = object;
    for (let i = 0; i < keys.length - 1; i++) {
        if (parent[keys[i]] === undefined) parent[keys[i]] = isArrayIndex(keys[i + 1]) ? [] : {};
        if (!parent[keys[i]] || typeof parent[keys[i]] !== "object")
            throw new TypeError("Rename destination requires an object");
        parent = parent[keys[i]];
    }
    parent[keys.at(-1)] = value;
}

function prepareUpdateOperations(data) {
    const operations = [];
    for (const key of Object.keys(data)) {
        const value = data[key];
        const at = key.indexOf(".");
        const operator = key.startsWith("$") ? key.slice(0, at) : undefined;
        if (operator && (!updateOperators.has(operator) || at < 0))
            throw new TypeError("Unsupported update operator");

        const keys = assertUpdatePath(operator ? key.slice(at + 1) : key);
        for (let i = 0; i < keys.length; i++) {
            if (isArrayIndex(keys[i])) keys[i] = Number(keys[i]);
        }

        let destination;
        if (operator === "$rename") {
            if (typeof value !== "string") throw new TypeError("Rename destination must be a path string");
            destination = assertUpdatePath(value);
        }
        if (operator === "$addToSet" && value && typeof value === "object" && Object.hasOwn(value, "$each") &&
            (!Array.isArray(value.$each) || Object.keys(value).some(key => key !== "$each")))
            throw new TypeError("Add to set each requires an array and no other modifiers");
        if (operator === "$inc" && (typeof value !== "number" || !Number.isFinite(value)))
            throw new TypeError("Increment requires a finite number");

        operations.push({ operator, keys, value, destination });
    }
    return operations;
}

function applyUpdateOperations(data, object = {}) {
    operation: for (const { operator, keys, value, destination } of prepareUpdateOperations(data)) {
        let parent = object;
        const last = keys.length - 1;
        const skipMissing = noCreate.has(operator) || value === undefined && (!operator || operator === "$set");
        for (let i = 0; i < last; i++) {
            const key = keys[i];
            const child = parent[key];
            if (skipMissing) {
                if (child == null || typeof child !== "object") continue operation;
                parent = child;
            } else if (typeof keys[i + 1] === "number" && !Array.isArray(child)) {
                parent = parent[key] = [];
            } else {
                parent = parent[key] = child || {};
            }
        }

        const key = keys[last];
        switch (operator) {
            case "$set":
                if (value === undefined) deleteValue(parent, key);
                else parent[key] = value;
                break;
            case "$rename": {
                if (!Object.hasOwn(parent, key)) break;
                const source = keys.join(".");
                const target = destination.join(".");
                if (source === target) break;
                if (source.startsWith(target + ".") || target.startsWith(source + "."))
                    throw new TypeError("Rename paths cannot overlap");
                renameTo(object, destination, parent[key]);
                delete parent[key];
                break;
            }
            case "$delete": case "$unset": case "$slice":
                deleteValue(parent, key);
                break;
            case "$shift":
                if (parent[key] !== undefined) arrayAt(parent, key).shift();
                break;
            case "$pop":
                if (parent[key] !== undefined) arrayAt(parent, key).pop();
                break;
            case "$addToSet": {
                const array = arrayAt(parent, key);
                const candidates = value && typeof value === "object" && Object.hasOwn(value, "$each")
                    ? value.$each : [value];
                for (const candidate of candidates) {
                    const exists = Array.isArray(candidate)
                        ? array.some(item => Array.isArray(item) && isEqualArray(item, candidate))
                        : candidate !== null && typeof candidate === "object"
                            ? array.some(item => typeof item === "object" && isEqualObject(item, candidate))
                            : array.includes(candidate);
                    if (!exists) array.push(candidate);
                }
                break;
            }
            case "$pull": {
                if (parent[key] === undefined) break;
                const array = arrayAt(parent, key);
                parent[key] = Array.isArray(value)
                    ? array.filter(item => !Array.isArray(item) || !isEqualArray(item, value))
                    : value !== null && typeof value === "object"
                        ? array.filter(item => typeof item !== "object" || !isEqualObject(item, value))
                        : array.filter(item => item !== value);
                break;
            }
            case "$push": case "$splice":
                if (typeof key === "number" && parent.length >= key) parent.splice(key, 0, value);
                else arrayAt(parent, key).push(value);
                break;
            case "$each": {
                const values = Array.isArray(value) ? value : [value];
                if (typeof key === "number") parent.splice(key, 0, ...values);
                else arrayAt(parent, key).push(...values);
                break;
            }
            case "$inc": {
                const current = parent[key];
                if (current !== undefined && (typeof current !== "number" || !Number.isFinite(current)))
                    throw new TypeError("Cannot increment a non-number");
                const next = (current ?? 0) + value;
                if (!Number.isFinite(next)) throw new TypeError("Increment overflow");
                parent[key] = next;
                break;
            }
            default:
                if (value === undefined) deleteValue(parent, key);
                else if (typeof key === "number") parent.splice(key, 0, value);
                else parent[key] = value;
        }
    }
    return object;
}

export function createUpdate(update, data, globalOperators) {
    try {
        const keys = Object.keys(data);
        for (const key of keys) {
            if (key.startsWith("$")) {
                const dot = key.indexOf(".");
                if (!updateOperators.has(dot < 0 ? key : key.slice(0, dot))) return false;
            } else if (key.includes(".") || key.includes("[")) assertUpdatePath(key);
            else assertUpdateKey(key);
        }
        let operatorKeys = globalOperators == null ? undefined : { ...globalOperators };
        for (const key of keys) {
            const value = data[key];
            if (key.startsWith("$")) {
                operatorKeys ??= {};
                if (!key.includes(".")) {
                    for (const path of Object.keys(value)) operatorKeys[key + "." + path] = value[path];
                } else operatorKeys[key] = value;
            } else if (typeof value === "string" && updateOperators.has(value)) {
                (operatorKeys ??= {})[value + "." + key] = value;
            } else if (key.endsWith("]")) {
                operatorKeys ??= {};
                const match = key.match(/^(.*(?:\[\d+\].*?)?)\[(.*?)\](?:\[\])?$/);
                if (!match) return false;
                if (match[2] === "") operatorKeys["$push." + match[1]] = value;
                else {
                    const index = parseInt(match[2], 10);
                    if (Number.isNaN(index)) operatorKeys[match[2] + "." + match[1]] = value;
                    else operatorKeys[key] = value;
                }
            } else if (key.includes(".")) (operatorKeys ??= {})[key] = value;
            else if (value === undefined) delete update[key];
            else update[key] = value;
        }
        if (operatorKeys) return applyUpdateOperations(operatorKeys, update);
        return update === undefined ? {} : update;
    } catch {
        return false;
    }
}

export { dotNotationToObject, objectToDotNotation, getValueFromObject };

/** Describe the resulting values, rather than replaying the original operators. */
export function createUpdateChanges(current, updated) {
    const changes = {};
    const plain = value => value !== null && typeof value === 'object' &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
    const visit = (before, after, prefix = '') => {
        for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
            const path = prefix ? `${prefix}.${key}` : key;
            const had = Object.hasOwn(before, key);
            const has = Object.hasOwn(after, key) && after[key] !== undefined;
            if (!has) {
                if (had) { assertUpdatePath(path); (changes.$unset ??= {})[path] = true; }
            } else if (had && plain(before[key]) && plain(after[key])) {
                visit(before[key], after[key], path);
            } else if (!had || !isEqualObject(before[key], after[key])) {
                assertUpdatePath(path);
                (changes.$set ??= {})[path] = structuredClone(after[key]);
            }
        }
    };
    visit(current, updated);
    return changes;
}

/** Coalesce changed paths without dropping a field that changed and reverted. */
export function mergeUpdateChanges(previous, next) {
    const result = structuredClone(previous);
    for (const operator of ['$set', '$unset']) {
        for (const [path, value] of Object.entries(next[operator] ?? {})) {
            // A later parent replacement/removal supersedes pending descendants.
            for (const existing of ['$set', '$unset']) {
                for (const key of Object.keys(result[existing] ?? {}))
                    if (key === path || key.startsWith(path + '.')) delete result[existing][key];
            }
            const removedParent = Object.keys(result.$unset ?? {}).find(key => path.startsWith(key + '.'));
            if (removedParent) {
                if (operator === '$unset') continue;
                delete result.$unset[removedParent];
                const valueAtParent = {};
                if (createUpdate(valueAtParent, { $set: { [path.slice(removedParent.length + 1)]: value } }) === false)
                    throw new Error('Cannot compose recreated update changes');
                (result.$set ??= {})[removedParent] = valueAtParent;
                continue;
            }
            // Apply a later child change inside an already pending parent value.
            const parent = Object.keys(result.$set ?? {}).find(key => path.startsWith(key + '.'));
            if (parent) {
                const nested = path.slice(parent.length + 1);
                const document = { value: result.$set[parent] };
                if (createUpdate(document, { [operator]: { [`value.${nested}`]: value } }) === false)
                    throw new Error('Cannot compose update changes');
                result.$set[parent] = document.value;
            } else {
                (result[operator] ??= {})[path] = structuredClone(value);
            }
        }
    }
    for (const operator of ['$set', '$unset'])
        if (result[operator] && !Object.keys(result[operator]).length) delete result[operator];
    return result;
}

const plainObject = value => value !== null && typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const protectedUpdateFields = new Set(["uuid", "_id", "root", "parent", "updated"]);

function parseTimestamp(value) {
    if (value === undefined || value === null) return undefined;
    const timestamp = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;
    if (!Number.isFinite(timestamp)) throw new TypeError("Invalid updated.on");
    return timestamp;
}

function updateValue(update, paths) {
    for (const path of paths) {
        let value = update;
        for (const key of path) value = value?.[key];
        if (value !== undefined) return value;
    }
}

function timestampFromUpdate(update) {
    const values = [["updated", "on"], ["updated.on"], ["$set", "updated", "on"], ["$set", "updated.on"], ["$set.updated", "on"], ["$set.updated.on"]]
        .map(path => updateValue(update, [path])).filter(value => value !== undefined);
    if (!values.length) return { value: undefined, timestamp: undefined };
    const timestamp = parseTimestamp(values[0]);
    if (values.some(value => parseTimestamp(value) !== timestamp)) throw new TypeError("Conflicting updated.on values");
    return { value: values[0], timestamp };
}

function updateBy(update) {
    return updateValue(update, [["updated", "by"], ["updated.by"], ["$set", "updated", "by"], ["$set", "updated.by"], ["$set.updated", "by"], ["$set.updated.by"]]);
}

function updatePathParts(path) {
    if (typeof path !== "string" || !path || /[\[\]]/.test(path)) return undefined;
    const parts = path.split(".");
    if (parts.some(key => !key || /^\d+$/.test(key) || key === "__proto__" || key === "prototype" || key === "constructor")) return undefined;
    return parts;
}

function pathIsMissing(object, parts) {
    for (const key of parts) {
        if (object === null || typeof object !== "object") return false;
        if (!Object.hasOwn(object, key)) return true;
        object = object[key];
    }
    return false;
}

function collectMissingAssignments(object, path, value, accepted, prefix = "") {
    const parts = updatePathParts(path);
    if (!parts || protectedUpdateFields.has(parts[0]) || value === undefined ||
        typeof value === "string" && updateOperators.has(value)) return;
    if (plainObject(value) && Object.keys(value).length) {
        for (const [key, child] of Object.entries(value))
            collectMissingAssignments(object, `${path}.${key}`, child, accepted, prefix);
    } else if (pathIsMissing(object, parts)) {
        accepted[prefix + path] = value;
    }
}

function olderAssignments(object, update) {
    const accepted = {};
    for (const [key, value] of Object.entries(update)) {
        if (key === "$set") {
            if (!plainObject(value)) throw new TypeError("Invalid $set update");
            for (const [path, child] of Object.entries(value))
                collectMissingAssignments(object, path, child, accepted, "$set.");
        } else if (key.startsWith("$set.")) {
            collectMissingAssignments(object, key.slice(5), value, accepted, "$set.");
        } else if (!key.startsWith("$")) {
            collectMissingAssignments(object, key, value, accepted);
        }
    }
    return accepted;
}

/** Apply and reconcile a CoCreate update while retaining its accepted mutation. */
export async function applyUpdate(object, input, { apply = createUpdate } = {}) {
    if (object === null || typeof object !== "object") throw new TypeError("Update target must be an object");
    if (!plainObject(input)) throw new TypeError("Update must be an object");
    if (typeof apply !== "function") throw new TypeError("Update apply handler must be a function");

    const update = { ...input };
    const incoming = timestampFromUpdate(update);
    const previous = parseTimestamp(object.updated?.on ?? object["updated.on"]);
    const stale = previous !== undefined && incoming.timestamp !== undefined && incoming.timestamp <= previous;

    if (!stale) {
        if (!Object.keys(update).length) return { object, mutation: undefined };
        const result = await apply(object, update);
        if (result === false) throw new TypeError("Invalid update");
        return { object, mutation: update };
    }

    const candidate = structuredClone(object);
    const accepted = olderAssignments(candidate, update);
    if (!Object.keys(accepted).length) return { object, mutation: undefined };
    if (createUpdate(candidate, accepted) === false) throw new TypeError("Invalid stale update");
    const changes = createUpdateChanges(object, candidate);
    if (Object.keys(changes).length) {
        const result = await apply(object, changes);
        if (result === false) throw new TypeError("Invalid stale update");
    }
    const by = updateBy(update);
    return {
        object,
        mutation: Object.assign(changes, {
            "updated.on": incoming.value,
            ...(by !== undefined ? { "updated.by": by } : {})
        })
    };
}
