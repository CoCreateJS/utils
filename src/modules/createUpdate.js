import { dotNotationToObject } from "./dotNotationToObject.js";
import { objectToDotNotation } from "./objectToDotNotation.js";
import { getValueFromObject } from "./getValueFromObject.js";
import { isEqualArray, isEqualObject } from "./dataQuery.js";

const updateOperators = new Set([
    "$set", "$rename", "$inc", "$push", "$each", "$splice", "$unset",
    "$delete", "$slice", "$pop", "$shift", "$addToSet", "$pull"
]);
const isArrayIndex = key => /^(0|[1-9]\d*)$/.test(key) && Number(key) < 2 ** 32 - 1;
const noCreate = new Set(["$rename", "$unset", "$delete", "$slice", "$pop", "$shift", "$pull"]);

function assertUpdatePath(path) {
    const keys = String(path).replace(/\[(\d+)\]/g, ".$1").split(".");
    if (keys.some(key => !key || ["__proto__", "prototype", "constructor"].includes(key)))
        throw new TypeError("Invalid update path");
    return keys;
}

function arrayAt(object, key) {
    if (object[key] === undefined) object[key] = [];
    if (!Array.isArray(object[key])) throw new TypeError("Array update requires an array");
    return object[key];
}

function renameTo(object, path, value) {
    const keys = assertUpdatePath(path);
    let parent = object;
    for (let i = 0; i < keys.length - 1; i++) {
        if (parent[keys[i]] === undefined) parent[keys[i]] = isArrayIndex(keys[i + 1]) ? [] : {};
        if (!parent[keys[i]] || typeof parent[keys[i]] !== "object")
            throw new TypeError("Rename destination requires an object");
        parent = parent[keys[i]];
    }
    parent[keys.at(-1)] = value;
}

function dotNotationToObjectUpdate(data, object = {}) {
	try {
        // Validate all operator paths before applying any of these operations.
        for (const [key, value] of Object.entries(data)) {
            const at = key.indexOf(".");
            const operator = key.startsWith("$") ? key.slice(0, at) : undefined;
            if (operator && (!updateOperators.has(operator) || at < 0))
                throw new TypeError("Unsupported update operator");
            const path = operator ? key.slice(at + 1) : key;
            assertUpdatePath(path);
            if (operator === "$rename") {
                if (typeof value !== "string") throw new TypeError("Rename destination must be a path string");
                assertUpdatePath(value);
            }
            if (operator === "$addToSet" && value && typeof value === "object" && Object.hasOwn(value, "$each") &&
                (!Array.isArray(value.$each) || Object.keys(value).some(key => key !== "$each")))
                throw new TypeError("Add to set each requires an array and no other modifiers");
            if (operator === "$inc" && (typeof value !== "number" || !Number.isFinite(value)))
                throw new TypeError("Increment requires a finite number");
        }
		operation: for (const key of Object.keys(data)) {
			let newObject = object;
			let keys = key
				.replace(/\[(\d+)\]/g, ".$1")
				.split(".")
				.map((k) => (isArrayIndex(k) ? Number(k) : k));
			let value = data[key];
			let operator;
			if (typeof keys[0] === "string" && keys[0].startsWith("$")) operator = keys.shift();

			let length = keys.length - 1;
			for (let i = 0; i < keys.length; i++) {
                if (i < length && newObject[keys[i]] == null && noCreate.has(operator)) continue operation;
				if (length == i) {
					if (operator) {
                        if (operator === "$set") {
                            newObject[keys[i]] = value;
                        } else if (operator === "$rename") {
                            if (!Object.hasOwn(newObject, keys[i])) continue;
                            const source = keys.join(".");
                            const destination = assertUpdatePath(value).join(".");
                            if (source === destination) continue;
                            if (source.startsWith(destination + ".") || destination.startsWith(source + "."))
                                throw new TypeError("Rename paths cannot overlap");
                            renameTo(object, value, newObject[keys[i]]);
                            delete newObject[keys[i]];
                        } else if (
							operator === "$delete" ||
							operator === "$unset" ||
							operator === "$slice"
						) {
							if (typeof keys[i] === "number") {
								newObject.splice(keys[i], 1);
							} else {
								delete newObject[keys[i]];
							}
						} else if (operator === "$shift") {
							if (newObject[keys[i]] !== undefined) arrayAt(newObject, keys[i]).shift();
						} else if (operator === "$pop") {
							if (newObject[keys[i]] !== undefined) arrayAt(newObject, keys[i]).pop();
						} else if (operator === "$addToSet") {
							arrayAt(newObject, keys[i]);
                            const candidates = value && typeof value === "object" && Object.hasOwn(value, "$each")
                                ? value.$each : [value];
                            for (const candidate of candidates) {
								let exists;
								if (Array.isArray(candidate)) {
									exists = newObject[keys[i]].some(
										(item) => Array.isArray(item) && isEqualArray(item, candidate)
									);
								} else if (
									typeof candidate === "object" &&
									candidate !== null
								) {
									exists = newObject[keys[i]].some(
										(item) =>
											typeof item === "object" && isEqualObject(item, candidate)
									);
								} else {
									exists = newObject[keys[i]].includes(candidate);
								}
								if (!exists) newObject[keys[i]].push(candidate);
                            }
						} else if (operator === "$pull") {
							if (newObject[keys[i]] === undefined) continue;
                            arrayAt(newObject, keys[i]);
							if (Array.isArray(value)) {
								newObject[keys[i]] = newObject[keys[i]].filter(
									(item) => !Array.isArray(item) || !isEqualArray(item, value)
								);
							} else if (
								typeof value === "object" &&
								value !== null
							) {
								newObject[keys[i]] = newObject[keys[i]].filter(
									(item) =>
										typeof item !== "object" || !isEqualObject(item, value)
								);
							} else {
								newObject[keys[i]] = newObject[keys[i]].filter(
									(item) => item !== value
								);
							}
						} else if (operator === "$push" || operator === "$splice") {
							if (
								typeof keys[i] === "number" &&
								newObject.length >= keys[i]
							)
								newObject.splice(keys[i], 0, value);
                            else arrayAt(newObject, keys[i]).push(value);
						} else if (operator === "$each") {
							if (!Array.isArray(value)) value = [value];
							if (typeof keys[i] === "number")
								newObject.splice(keys[i], 0, ...value);
							else arrayAt(newObject, keys[i]).push(...value);
                        } else if (operator === "$inc") {
                            const current = newObject[keys[i]];
                            if (current !== undefined && (typeof current !== "number" || !Number.isFinite(current)))
                                throw new TypeError("Cannot increment a non-number");
                            const next = (current ?? 0) + value;
                            if (!Number.isFinite(next)) throw new TypeError("Increment overflow");
                            newObject[keys[i]] = next;
						}
					} else if (value === undefined) {
						if (typeof keys[i] === "number") newObject.splice(keys[i], 1);
						else delete newObject[keys[i]];
					} else if (typeof keys[i] === "number") {
						newObject.splice(keys[i], 0, value);
					} else {
						newObject[keys[i]] = value;
					}
				} else if (
					typeof keys[i + 1] === "number" &&
					!Array.isArray(newObject[keys[i]])
				) {
					newObject[keys[i]] = [];
				} else {
					newObject[keys[i]] = newObject[keys[i]] || {};
				}
				newObject = newObject[keys[i]];
			}
		}
		return object;
	} catch (error) {
		return false;
	}
}

export function createUpdate(update, data, globalOperators) {
    try {
        const keys = Object.keys(data);
        for (const key of keys) {
            if (!key.startsWith("$")) assertUpdatePath(key);
            else if (!updateOperators.has(key.split(".")[0])) return false;
        }
        const operatorKeys = { ...globalOperators };
        for (const key of keys) {
            const value = data[key];
            if (key.startsWith("$")) {
                if (!key.includes(".")) {
                    for (const path of Object.keys(value)) operatorKeys[key + "." + path] = value[path];
                } else operatorKeys[key] = value;
            } else if (typeof value === "string" && updateOperators.has(value)) {
                operatorKeys[value + "." + key] = value;
            } else if (key.endsWith("]")) {
                const match = key.match(/^(.*(?:\[\d+\].*?)?)\[(.*?)\](?:\[\])?$/);
                if (!match) return false;
                if (match[2] === "") operatorKeys["$push." + match[1]] = value;
                else {
                    const index = parseInt(match[2], 10);
                    if (Number.isNaN(index)) operatorKeys[match[2] + "." + match[1]] = value;
                    else operatorKeys[key] = value;
                }
            } else if (key.includes(".")) operatorKeys[key] = value;
            else if (value === undefined) delete update[key];
            else update[key] = value;
        }
        return dotNotationToObjectUpdate(operatorKeys, update);
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
