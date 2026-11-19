/**
 * Flatten object paths. Container retention, sparse array positions, binary
 * leaves, and path filtering are opt-in for callers that need them.
 */
export function objectToDotNotation(input, {
	includeContainers = false,
	includeArrayHoles = false,
	preserveBinary = false,
	shouldInclude = () => true
} = {}) {
	const results = {};
	// Define properties so names such as "__proto__" remain ordinary path keys.
	const set = (path, value) => Object.defineProperty(results, path, {
		value,
		configurable: true,
		writable: true,
		enumerable: true
	});

	function traverse(currentValue, path, parent, key) {
		if (!shouldInclude(path, currentValue, parent, key)) return;
		if (typeof currentValue !== "object" || currentValue === null || preserveBinary && (ArrayBuffer.isView(currentValue) || currentValue instanceof ArrayBuffer)) {
			if (path) set(path, currentValue);
			return;
		}

		if (Array.isArray(currentValue)) {
			if (path && includeContainers) set(path, currentValue);
			if (currentValue.length > 0) {
				for (let index = 0; index < currentValue.length; index++) {
					if (!includeArrayHoles && !Object.hasOwn(currentValue, index)) continue;
					const item = currentValue[index];
					const nextPath = `${path}[${index}]`;
					traverse(item, nextPath, currentValue, index);
				}
			}
		} else {
			const keys = Object.keys(currentValue);
			if (path && includeContainers) set(path, currentValue);
			if (keys.length > 0) {
				keys.forEach((key) => {
					const nextPath = path ? `${path}.${key}` : key;
					traverse(currentValue[key], nextPath, currentValue, key);
				});
			}
		}
	}

	if (input && typeof input === "object") {
		for (const key of Object.keys(input)) traverse(input[key], key, input, key);
	} else traverse(input, "");

	return results;
}
