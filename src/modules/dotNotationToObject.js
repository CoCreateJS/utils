const numericIndex = /^\d+$/;
const groupSelector = /^\w$/;

const bracketSegments = new Map();
const bracketSegmentLimit = 128;

function parseBracketSegment(segment) {
    const cached = bracketSegments.get(segment);
    if (cached) return cached;

    const bracket = segment.indexOf("[");
    if (bracket < 0) return;
    const selector = segment.slice(bracket + 1, -1);
    const indexed = selector !== "" && numericIndex.test(selector);
    if (selector && !indexed && !groupSelector.test(selector)) return;
    const key = segment.slice(0, bracket);
    if (key === "__proto__") throw new TypeError("Invalid object path");

    const parsed = { key, selector, indexed };
    if (bracketSegments.size === bracketSegmentLimit)
        bracketSegments.delete(bracketSegments.keys().next().value);
    bracketSegments.set(segment, parsed);
    return parsed;
}

function ownValue(object, key) {
    return Object.hasOwn(object, key) ? object[key] : undefined;
}

function writeLeaf(object, key, value) {
    if (key === "__proto__") throw new TypeError("Invalid object path");
    if (value === undefined) delete object[key];
    else object[key] = value;
}

export function dotNotationToObject(data = {}, obj = {}) {
    try {
        obj ??= {};
        let groups;

        for (const path of Object.keys(data ?? {})) {
            const value = data[path];
            if (!path.includes(".") && !path.endsWith("]")) {
                writeLeaf(obj, path, value);
                continue;
            }

            const segments = path.split(".");
            const last = segments.length - 1;
            let parent = obj;
            for (let i = 0; i <= last; i++) {
                const segment = segments[i];
                if (!segment.endsWith("]")) {
                    if (i === last) {
                        writeLeaf(parent, segment, value);
                    } else {
                        if (segment === "__proto__") throw new TypeError("Invalid object path");
                        parent = ownValue(parent, segment) || (parent[segment] = {});
                    }
                    continue;
                }

                const parsed = parseBracketSegment(segment);
                if (!parsed) continue;
                const { key, selector, indexed } = parsed;
                let array = ownValue(parent, key);
                if (!Array.isArray(array)) array = parent[key] = [];

                if (!selector) {
                    if (i === last) {
                        if (Array.isArray(value)) array.push(...value);
                        else array.push(value);
                    }
                } else if (indexed) {
                    if (i === last) {
                        if (value === undefined) array.splice(selector, 1);
                        else array[selector] = value;
                    } else {
                        parent = ownValue(array, selector) || (array[selector] = {});
                    }
                } else {
                    groups ??= new Map();
                    const group = segments.slice(0, i + 1).join(".");
                    let index = groups.get(group);
                    if (index === undefined) {
                        index = array.length;
                        groups.set(group, index);
                        array[index] = {};
                    }

                    if (i === last) array[index] = value;
                    else parent = array[index];
                }
            }
        }
        return obj;
    } catch (error) {
        console.log("Error converting dot notation to object", error);
        return false;
    }
}
