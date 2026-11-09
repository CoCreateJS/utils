import {
    astSync as evaluateSync,
    astAsync as evaluateAsync,
    registerASTGlobals
} from "./index.js";
import { serverGlobalsScope } from "./serverGlobals.js";

registerASTGlobals(serverGlobalsScope);

// Keep registration with the server entry when bundlers follow these exports.
export function astSync(options) {
    return evaluateSync(options);
}

export async function astAsync(options) {
    return await evaluateAsync(options);
}

export default astSync;
