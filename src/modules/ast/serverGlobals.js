import { getBuiltinModule } from "node:process";
import { Buffer } from "node:buffer";
import security from "../security.js";

// Non-deprecated top-level Node modules. Keep inactive entries beside the active list
// so runtime availability is visible without loading every module at startup.
export const serverModules = [
    "assert", // Check invariants and compare expected results.
    "async_hooks", // Track asynchronous resources and execution context.
    "buffer", // Binary byte buffers and encoding utilities.
    "child_process", // Start subprocesses and exchange data with them.
    "cluster", // Run Node processes that can share server ports.
    "console", // Log messages and inspect values.
    "crypto", // Native hashing, signing, encryption, and key generation.
    // "dgram", // UDP datagram sockets; not needed currently.
    "diagnostics_channel", // Publish and subscribe to diagnostic events.
    "dns", // Resolve domain names and query DNS records.
    "events", // EventEmitter and event subscription utilities.
    // "ffi", // Call native libraries; unavailable in the current Node 24 runtime.
    "fs", // Read, write, watch, and manage files and directories.
    "http", // HTTP/1 clients and servers.
    "http2", // HTTP/2 clients, servers, and multiplexed streams.
    "https", // HTTP over encrypted TLS connections.
    "inspector", // Connect to V8 debugging and profiling tools.
    "module", // Inspect and customize Node module loading.
    "net", // TCP servers, client sockets, and local IPC connections.
    "os", // Operating-system, CPU, memory, and network information.
    "path", // Join, normalize, and inspect filesystem paths.
    "perf_hooks", // Measure performance and observe timing events.
    "process", // Process arguments, environment, lifecycle, and resource usage.
    "querystring", // Parse and format URL query strings.
    "readline", // Read text streams one line at a time.
    // "repl", // Interactive read-eval-print loop; not needed currently.
    "sea", // Access assets embedded in a Node single-executable application.
    // "sqlite", // Embedded SQLite database; not needed currently.
    "stream", // Process data incrementally with backpressure.
    "string_decoder", // Decode byte chunks without splitting text characters.
    "test", // Define and run Node's built-in tests.
    "timers", // Schedule and cancel callbacks; includes promise-based timers.
    "tls", // Create encrypted TLS connections and servers.
    "trace_events", // Enable tracing of Node and V8 runtime activity.
    "tty", // Detect and work with terminal input/output streams.
    "url", // Parse, construct, and convert URLs and file URLs.
    "util", // Promisify callbacks, inspect values, and access utility APIs.
    "v8", // Inspect V8 heap data and serialize JavaScript values.
    "vm", // Compile and run JavaScript in contexts in the current thread.
    "wasi", // Provide operating-system interfaces to WebAssembly programs.
    "worker_threads", // Run JavaScript in parallel threads in one process.
    "zlib" // Compress and decompress data, including gzip and Brotli.
];

export const serverGlobalsScope = {
    $global: globalThis, // Node global object; also available as shared $globalThis.
    $Buffer: Buffer, // Native binary buffer constructor.
    $security: security, // Existing CoCreate security helpers.
    $setImmediate: globalThis.setImmediate, // Schedule a callback for the check phase.
    $clearImmediate: globalThis.clearImmediate // Cancel a scheduled immediate callback.
};

for (const name of serverModules) {
    const key = `$${name}`;
    Object.defineProperty(serverGlobalsScope, key, {
        enumerable: true,
        configurable: true,
        get() { return getBuiltinModule(`node:${name}`); },
        set(value) {
            Object.defineProperty(this, key, {
                value, writable: true, configurable: true, enumerable: true
            });
        }
    });
}
