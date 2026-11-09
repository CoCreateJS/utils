import assert from "node:assert/strict";
import test from "node:test";
import { builtinModules } from "node:module";
import { getBuiltinModule } from "node:process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { astSync, astAsync, processOperators } from "../src/server.js";
import { serverModules } from "../src/modules/ast/serverGlobals.js";
import { sharedGlobalsScope } from "../src/modules/ast/sharedGlobals.js";

const hash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("server registry accounts for public top-level modules and deliberate exclusions", () => {
    const inactiveModules = new Set(["dgram", "sqlite", "repl"]);
    const deprecatedModules = new Set(["constants", "domain", "punycode", "sys"]);
    const modules = builtinModules.map(name => name.replace(/^node:/, ""))
        .filter(name => !name.startsWith("_") && !name.includes("/"));
    assert.deepEqual(modules.filter(name => !serverModules.includes(name) && !inactiveModules.has(name) && !deprecatedModules.has(name)), []);
    for (const name of deprecatedModules) assert.equal(serverModules.includes(name), false);
});

test("server roots preserve native APIs and leave shared scope free of Node modules", () => {
    for (const name of ["crypto", "fs", "buffer", "util", "process", "path", "module"]) {
        assert.equal(astSync({ executeAST: `$${name}` }), getBuiltinModule(`node:${name}`));
    }
    assert.equal(astSync({ executeAST: "$Buffer" }), Buffer);
    assert.equal(astSync({ executeAST: "$crypto.webcrypto" }), globalThis.crypto);
    assert.equal(sharedGlobalsScope.$crypto, globalThis.crypto);
    assert.equal("$fs" in sharedGlobalsScope, false);
    assert.equal("$Buffer" in sharedGlobalsScope, false);
    assert.equal(typeof astSync({ executeAST: "$security.generateKeyPair" }), "function");
});

for (const evaluate of [astSync, astAsync]) {
    test(`${evaluate.name}: native objects can be created, chained, and exported`, async () => {
        const result = await evaluate({ executeAST: {
            hash: { "$crypto.createHash": ["sha256"] },
            updated: { "$hash.update": ["abc"] },
            $return: { "$updated.digest": ["hex"] }
        } });
        assert.equal(result, hash);
        assert.equal(await evaluate({ executeAST: {
            bytes: { "$Buffer.from": ["hello", "utf8"] },
            $return: { "$bytes.toString": ["base64"] }
        } }), "aGVsbG8=");
    });

    test(`${evaluate.name}: supplied roots override defaults without changing subsequent calls`, async () => {
        const crypto = { randomUUID: () => "supplied" };
        assert.equal(await evaluate({ sandbox: { crypto }, executeAST: { "$crypto.randomUUID": [] } }), "supplied");
        assert.equal(await evaluate({ sandbox: { $crypto: crypto }, executeAST: { "$crypto.randomUUID": [] } }), "supplied");
        assert.equal(await evaluate({ executeAST: "$crypto" }), getBuiltinModule("node:crypto"));
    });

    test(`${evaluate.name}: shared constructors and native method receivers work`, async () => {
        assert.equal(await evaluate({ executeAST: {
            url: { "$URL": ["/example", "https://example.test"] },
            $return: "$url.href"
        } }), "https://example.test/example");
        assert.equal(await evaluate({ executeAST: {
            values: { "$Map": [[["key", 42]]] },
            $return: { "$values.get": ["key"] }
        } }), 42);
        assert.deepEqual(await evaluate({ executeAST: { "$Uint8Array": [[0, 128, 255]] } }), Uint8Array.of(0, 128, 255));
    });
}

test("native server modules also resolve through the string operator engine", () => {
    assert.equal(processOperators(null, "$($process.version)"), process.version);
    assert.equal(astSync({ executeAST: "$($process.version)" }), process.version);
});

test("native util.promisify and crypto compose into async key generation", async () => {
    const result = await astAsync({ executeAST: {
        generate: { "$util.promisify": "$crypto.generateKeyPair" },
        pair: { "$generate": ["ed25519", {}] },
        publicKey: { "$pair.publicKey.export": { type: "spki", format: "pem" } },
        $return: "$publicKey"
    } });
    assert.match(result, /^-----BEGIN PUBLIC KEY-----/);
});

test("native fs promise methods compose without dedicated AST helpers", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cocreate-ast-native-"));
    const pathname = join(directory, "value.txt");
    try {
        assert.equal(await astAsync({ sandbox: { pathname }, executeAST: {
            write: { "$fs.promises.writeFile": ["$pathname", "native bytes", "utf8"] },
            $return: { "$fs.promises.readFile": ["$pathname", "utf8"] }
        } }), "native bytes");
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("shared Web Crypto and byte encoders remain directly composable", async () => {
    const digest = await astAsync({ executeAST: {
        encoder: { "$TextEncoder": [] },
        bytes: { "$encoder.encode": ["abc"] },
        digest: { "$crypto.webcrypto.subtle.digest": ["SHA-256", "$bytes"] },
        buffer: { "$Buffer.from": "$digest" },
        $return: { "$buffer.toString": ["hex"] }
    } });
    assert.equal(digest, hash);
    assert.equal(await astAsync({ executeAST: { "$Promise.resolve": [42] } }), 42);
});
