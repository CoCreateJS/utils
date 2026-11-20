const pathCache = new Map();
const pathCacheLimit = 128;

function readPath(path) {
    const cached = pathCache.get(path);
    if (cached) return cached;

    let normalized = path.includes("[") ? path.replace(/\[(\d+)\]/g, ".$1") : path;
    if (normalized[0] === ".") normalized = normalized.slice(1);
    const keys = normalized.split(".");
    if (pathCache.size === pathCacheLimit) pathCache.clear();
    pathCache.set(path, keys);
    return keys;
}

function missingKey(key, throwError) {
    if (throwError) throw new Error("Key not found in object: " + key);
}

export function getValueFromObject(object = {}, path = "", throwError = false) {
    try {
        if (object == null || typeof object !== "object" || !path) {
            if (throwError) throw new Error("Invalid input to getValueFromObject");
            return;
        }

        if (typeof path !== "string") {
            // Preserve the original handling of boxed strings and invalid path values.
            path = path.replace(/\[(\d+)\]/g, ".$1");
        }
        if (!path.includes(".") && !path.includes("[")) {
            if (Object.hasOwn(object, path)) return object[path];
            return missingKey(path, throwError);
        }

        const keys = readPath(path);
        let value = object;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (value == null || (typeof value !== "object" && typeof value !== "function") ||
                !Object.hasOwn(value, key)) return missingKey(key, throwError);
            value = value[key];
        }
        return value;
    } catch (error) {
        if (throwError) throw error;
    }
}
