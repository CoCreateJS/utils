import { ObjectId } from "../ObjectId.js";
import { uuid } from "../uuid.js";
import { encodeContent, decodeContent, getContentType, getExtension, getExtensions, isTextContentType } from "../file/index.js";

function concatValues(values) {
    return values
        .flat()
        .map((value) =>
            typeof value === "object"
                ? JSON.stringify(value)
                : value
        )
        .join("");
}

function numericValue(value) {
    if (value && typeof value === "object" && "value" in value) {
        value = value.value;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

const sharedGlobals = {
    $Math: Math,
    $Number: Number,
    $String: String,
    $Boolean: Boolean,
    $Date: Date,
    $JSON: JSON,
    $Array: Array,
    $Object: Object,
    $encodeContent: encodeContent,
    $decodeContent: decodeContent,
    $getContentType: getContentType,
    $getExtension: getExtension,
    $getExtensions: getExtensions,
    $isTextContentType: isTextContentType,
    $parseInt: parseInt,
    $parseFloat: parseFloat,
    $encodeURIComponent: encodeURIComponent,
    $decodeURIComponent: decodeURIComponent,
    $throw: (message) => {
        throw new Error(String(message));
    },
    $error: function (error) {
        const registry = this?.registry;
        const payload = registry?.get?.("payload") ?? registry?.get?.("$payload");
        if (!payload || typeof payload !== "object") return;

        if (!Array.isArray(payload.error)) {
            payload.error = payload.error == null ? [] : [payload.error];
        }

        if (Array.isArray(error)) payload.error.push(...error);
        else payload.error.push(error);

        return payload.error;
    },
    $btoa: (str) => {
        if (typeof btoa === "function") return btoa(String(str));
        return Buffer.from(String(str)).toString("base64");
    },
    $atob: (b64) => {
        if (typeof atob === "function") return atob(b64);
        return Buffer.from(String(b64), "base64").toString("utf-8");
    },
    $true: () => true,
    $false: () => false,
    $null: () => null,
    $undefined: () => undefined,
    $numberFormat: function (...args) {
        const locale = args[0] || undefined;
        const options = args[1] || {};
        const numCandidate = args[2] !== undefined ? args[2] : args[0];
        const number = parseFloat(numCandidate);
        if (isNaN(number)) return String(numCandidate ?? "");
        return new Intl.NumberFormat(locale, options).format(number);
    },
    $add: (...values) =>
        values.flat(Infinity).reduce((sum, item) => sum + numericValue(item), 0),
    $multiply: (...values) =>
        values.flat(Infinity).reduce((product, item) => product * numericValue(item), 1),
    $round: (value, precision = 0) => {
        const factor = 10 ** Number(precision);
        return Math.round((numericValue(value) + Number.EPSILON) * factor) / factor;
    },
    $concat: (value) =>
        Array.isArray(value)
            ? concatValues(value)
            : String(value ?? ""),
    get $object_id() { return ObjectId().toString(); },
    $uuid: (prefix) => uuid(prefix) || "",
    $randomColor: () => `hsla(${Math.floor(Math.random() * 360)}, 75%, 58%, 1)`,
    $parse: (value = "") => {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
    $await: {
        all: async (promises) => {
            if (promises && typeof promises === "object" && !Array.isArray(promises)) {
                const keys = Object.keys(promises);
                const results = await Promise.all(keys.map((key) => promises[key]));
                return Object.fromEntries(keys.map((key, index) => [key, results[index]]));
            }
            return Promise.all(Array.isArray(promises) ? promises : [promises]);
        },
        any: async (promises) => {
            if (promises && typeof promises === "object" && !Array.isArray(promises)) {
                return Promise.any(Object.values(promises));
            }
            return Promise.any(Array.isArray(promises) ? promises : [promises]);
        },
        race: async (promises) => {
            if (promises && typeof promises === "object" && !Array.isArray(promises)) {
                return Promise.race(Object.values(promises));
            }
            return Promise.race(Array.isArray(promises) ? promises : [promises]);
        },
        allSettled: async (promises) => {
            if (promises && typeof promises === "object" && !Array.isArray(promises)) {
                const keys = Object.keys(promises);
                const results = await Promise.allSettled(keys.map((key) => promises[key]));
                return Object.fromEntries(keys.map((key, index) => [key, results[index]]));
            }
            return Promise.allSettled(Array.isArray(promises) ? promises : [promises]);
        },
        delay: (ms) => new Promise((resolve) => setTimeout(resolve, Number(ms) || 0))
    }
};

// Standard JavaScript and Web API roots shared by browsers and Node.
// Getters preserve native objects and leave unavailable APIs undefined.
const nativeGlobals = [
    "globalThis", "Function", "Promise", "RegExp", "Map", "Set", "WeakMap", "WeakSet", "WeakRef",
    "FinalizationRegistry", "Symbol", "BigInt", "Intl", "Reflect", "Proxy",
    "ArrayBuffer", "SharedArrayBuffer", "DataView", "Atomics",
    "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array",
    "Int32Array", "Uint32Array", "Float16Array", "Float32Array", "Float64Array",
    "BigInt64Array", "BigUint64Array",
    "Error", "AggregateError", "EvalError", "RangeError", "ReferenceError",
    "SyntaxError", "TypeError", "URIError", "DOMException",
    "fetch", "Request", "Response", "Headers", "FormData", "Blob", "File",
    "console", "crypto", "Crypto", "CryptoKey", "SubtleCrypto", "performance", "navigator",
    "URL", "URLSearchParams", "URLPattern", "TextEncoder", "TextDecoder",
    "TextEncoderStream", "TextDecoderStream",
    "AbortController", "AbortSignal", "Event", "EventTarget", "CustomEvent",
    "BroadcastChannel", "MessageChannel", "MessagePort", "MessageEvent", "EventSource",
    "ReadableStream", "ReadableStreamDefaultReader", "ReadableStreamBYOBReader",
    "ReadableStreamBYOBRequest", "ReadableByteStreamController",
    "ReadableStreamDefaultController", "WritableStream", "WritableStreamDefaultWriter",
    "WritableStreamDefaultController", "TransformStream", "TransformStreamDefaultController",
    "ByteLengthQueuingStrategy", "CountQueuingStrategy", "CompressionStream",
    "DecompressionStream", "WebAssembly", "WebSocket",
    "setTimeout", "clearTimeout", "setInterval", "clearInterval",
    "queueMicrotask", "structuredClone", "isNaN", "isFinite", "encodeURI", "decodeURI"
];

// Global functions keep their native global receiver when called by AST.
const nativeGlobalFunctions = new Set([
    "fetch", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
    "queueMicrotask", "structuredClone"
]);

for (const name of nativeGlobals) {
    const key = `$${name}`;
    Object.defineProperty(sharedGlobals, key, {
        enumerable: true,
        configurable: true,
        get() {
            const value = globalThis[name];
            return typeof value === "function" && nativeGlobalFunctions.has(name)
                ? value.bind(globalThis)
                : value;
        },
        set(value) {
            Object.defineProperty(this, key, {
                value, writable: true, configurable: true, enumerable: true
            });
        }
    });
}

export const sharedGlobalsScope = sharedGlobals;

export const sharedGlobalOperators = new Map(
    Object.entries(Object.getOwnPropertyDescriptors(sharedGlobals))
        .map(([name, descriptor]) => [
            name,
            descriptor.get
                ? function (...args) {
                    const value = descriptor.get.call(this);
                    return typeof value === "function"
                        ? value.apply(this, args)
                        : value;
                }
                : descriptor.value
        ])
);
