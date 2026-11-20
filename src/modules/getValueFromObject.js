export function getValueFromObject(object = {}, path = "", throwError = false) {
	try {
		if (object == null || (!Array.isArray(object) && typeof object !== "object") || !path) {
			if (throwError) throw new Error("Invalid input to getValueFromObject");
			return;
		}

		path = path.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");

		let data = object,
			subpath = path.split(".");

		for (let i = 0; i < subpath.length; i++) {
			if (data == null || (typeof data !== "object" && typeof data !== "function") || !Object.hasOwn(data, subpath[i])) {
				if (!throwError) return;
				throw new Error("Key not found in object: " + subpath[i]);
			}

			data = data[subpath[i]];
		}

		return data;
	} catch (error) {
		if (throwError) throw error;
	}
}
