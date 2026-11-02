import assert from "node:assert/strict";
import test from "node:test";
import { renderValue } from "../src/modules/renderValue.js";

test("resolves nested curly values from the innermost expression outward", async () => {
    const data = {
        data: { ready: "resolved" },
        object: { status: "ready" }
    };

    assert.equal(
        await renderValue(undefined, data, "<p>{{data.{{object.status}}}}</p>"),
        "<p>resolved</p>"
    );
});

test("resolves data and AST placeholders without a node", async () => {
    const data = { module: { name: "utils" } };

    assert.equal(await renderValue(undefined, data, "{{$data.module.name}}"), "utils");
    assert.equal(await renderValue(undefined, data, "{{$(1 + 2)}}"), "3");
    assert.equal(await renderValue(undefined, data, "{{$($data.module.name)}}"), "utils");
    assert.match(await renderValue(undefined, data, "{{$object_id}}"), /^[a-f\d]{24}$/);
});

test("escapes final string values without corrupting nested path evaluation", async () => {
    const data = {
        data: { ready: "<resolved>" },
        object: { status: "ready" }
    };

    assert.equal(
        await renderValue(undefined, data, "<p>{{data.{{object.status}}}}</p>", undefined, undefined, undefined, undefined, { escapeOutput: true }),
        "<p>&lt;resolved&gt;</p>"
    );
});

test("allows Render to provide its nested-scope value lookup", async () => {
    const node = { context: true };
    const resolveValue = (target, data, path, renderAs, index, renderedNode) => {
        assert.equal(target, node);
        assert.equal(path, "parent.name");
        assert.equal(renderAs, "item");
        assert.equal(index, 3);
        assert.equal(renderedNode.marker, "rendered");
        return "ancestor value";
    };

    assert.equal(
        await renderValue(node, {}, "{{parent.name}}", "item", { marker: "rendered" }, 3, resolveValue),
        "ancestor value"
    );
});
