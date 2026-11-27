function flatten(value, path, output) {
    if (value === null || typeof value !== "object") {
        if (path) output[path] = value;
        return;
    }

    if (Array.isArray(value)) {
        const length = value.length;
        for (let i = 0; i < length; i++) {
            // Like Array.prototype.forEach, skip holes but visit explicit undefined.
            if (i in value) flatten(value[i], path + "[" + i + "]", output);
        }
        return;
    }

    const prefix = path ? path + "." : "";
    for (const key of Object.keys(value)) {
        const child = value[key];
        if (child !== null && typeof child === "object") {
            flatten(child, prefix + key, output);
        } else if (prefix || key) {
            output[prefix + key] = child;
        }
    }
}

export function objectToDotNotation(input) {
    const output = {};
    flatten(input, "", output);
    return output;
}
