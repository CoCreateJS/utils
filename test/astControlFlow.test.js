import assert from "node:assert/strict";
import test from "node:test";
import { astSync, astAsync, evaluateAST } from "../src/modules/ast/index.js";

const condition = (source, value, branch) => ({
    $if: { [source]: { $eq: { [typeof value === "number" ? `$(${value})` : value]: branch } } }
});
const loop = (body, source = "$items", variable = "item") => ({
    $for: { [source]: { [variable]: body } }
});

for (const evaluate of [astSync, astAsync]) {
    for (const asArray of [false, true]) {
        test(`${evaluate.name}: break and continue skip remaining ${asArray ? "array" : "object"} steps`, async () => {
            const seen = [];
            const statements = {
                skip: condition("$item", 2, "$continue"),
                stop: condition("$item", 4, "$break"),
                process: { $record: "$item" }
            };
            const result = await evaluate({
                sandbox: { items: [1, 2, 3, 4, 5], record: value => seen.push(value) },
                executeAST: {
                    loop: loop(asArray ? Object.values(statements) : statements),
                    after: { $record: "after" }
                }
            });
            assert.deepEqual(seen, [1, 3, "after"]);
            assert.equal(result.after, 3);
        });
    }

    test(`${evaluate.name}: object command payloads are ignored, even false or executable values`, async () => {
        for (const payload of [true, false, "", null, {}, [], { $throw: "Must not execute" }]) {
            for (const command of ["$break", "$continue"]) {
                const seen = [];
                await evaluate({
                    sandbox: { items: [1, 2, 3], record: value => seen.push(value) },
                    executeAST: loop({
                        before: { $record: "$item" },
                        [command]: payload,
                        after: { $throw: "Must not execute" }
                    })
                });
                assert.deepEqual(seen, command === "$break" ? [1] : [1, 2, 3]);
                await evaluate({
                    sandbox: { items: [1, 2], [command]: () => assert.fail("Command cannot be overridden") },
                    executeAST: loop({ [command]: payload })
                });
            }
        }
    });

    test(`${evaluate.name}: control applies only to the nearest loop`, async () => {
        const seen = [];
        await evaluate({
            sandbox: { items: [1, 2], innerItems: [1, 2, 3, 4], record: (...values) => seen.push(values) },
            executeAST: loop({
                inner: loop({
                    skip: condition("$inner", 1, "$continue"),
                    stop: condition("$inner", 3, "$break"),
                    record: { $record: ["$item", "$inner"] }
                }, "$innerItems", "inner"),
                after: { $record: ["$item", "after"] }
            })
        });
        assert.deepEqual(seen, [[1, 2], [1, "after"], [2, 2], [2, "after"]]);
    });

    test(`${evaluate.name}: return unwinds conditions and nested loops to the entry point`, async () => {
        assert.equal(await evaluate({
            sandbox: { items: [1, 2, 3], innerItems: [10, 20] },
            executeAST: {
                loop: loop({
                    inner: loop(condition("$inner", 10, { $return: "$item" }), "$innerItems", "inner"),
                    unreachable: { $throw: "After inner loop" }
                }),
                unreachable: { $throw: "After outer loop" }
            }
        }), 1);
    });

    for (const asyncFunction of [false, true]) {
        test(`${evaluate.name}: ${asyncFunction ? "async" : "sync"} function return stops statement arrays and stays local`, async () => {
            const definition = { $function: {
                body: [
                    loop(condition("$item", 2, { $return: "$item" })),
                    { $throw: "After return" }
                ]
            } };
            const callback = await evaluate({
                sandbox: { items: [1, 2, 3] },
                executeAST: asyncFunction ? { $async: definition } : definition
            });
            const seen = [];
            const invoke = asyncFunction ? astAsync : evaluate;
            const result = await invoke({
                sandbox: { items: [1, 2, 3], callback, record: value => seen.push(value) },
                executeAST: {
                    callback: "$callback",
                    loop: loop({ call: { $callback: [] }, after: { $record: "$item" } }),
                    after: "done"
                }
            });
            assert.deepEqual(seen, [1, 2, 3]);
            assert.equal(result.after, "done");
            assert.equal(await result.callback(), 2);
        });
    }

    test(`${evaluate.name}: invalid break and continue fail at entry and function boundaries`, async () => {
        for (const command of ["$break", "$continue"]) {
            for (const executeAST of [command, { [command]: false }]) {
                await assert.rejects(async () => evaluate({ executeAST }), SyntaxError);
                for (const asyncFunction of [false, true]) {
                    const definition = { $function: { body: executeAST } };
                    const callback = await evaluate({
                        executeAST: asyncFunction ? { $async: definition } : definition
                    });
                    const invoke = asyncFunction ? astAsync : evaluate;
                    await assert.rejects(async () => invoke({
                        sandbox: { items: [1], callback },
                        executeAST: loop({ $callback: [] })
                    }), SyntaxError);
                }
            }
        }
    });

    test(`${evaluate.name}: bare return yields undefined and stops the function`, async () => {
        const callback = await evaluate({ executeAST: { $function: {
            body: ["$return", { $throw: "After return" }]
        } } });
        assert.equal(callback(), undefined);
    });

    test(`${evaluate.name}: iterator closes on break and return, but not continue`, async () => {
        for (const command of ["$break", "$return", "$continue"]) {
            const visits = [];
            let closed = false;
            function* items() {
                try {
                    for (const value of [1, 2, 3]) {
                        visits.push(value);
                        yield value;
                    }
                } finally { closed = true; }
            }
            await evaluate({ sandbox: { items: items() }, executeAST: loop(command) });
            assert.equal(closed, true);
            assert.deepEqual(visits, command === "$continue" ? [1, 2, 3] : [1]);
        }
    });

    test(`${evaluate.name}: ordinary errors escape loops unchanged`, async () => {
        const error = new Error("Original failure");
        await assert.rejects(async () => evaluate({
            sandbox: { items: [1], fail: () => { throw error; } },
            executeAST: loop({ $fail: [] })
        }), candidate => candidate === error);
    });
}

test("async iterable loop supports continue, break, return, and iterator cleanup", async () => {
    for (const returning of [false, true]) {
        const seen = [];
        let closed = false;
        async function* items() {
            try { yield 1; yield 2; yield 3; yield 4; }
            finally { closed = true; }
        }
        const body = [
            condition("$item", 2, "$continue"),
            condition("$item", 3, returning ? { $return: "returned" } : "$break"),
            { $record: "$item" }
        ];
        const result = await astAsync({
            sandbox: { items: items(), record: async value => { await Promise.resolve(); seen.push(value); } },
            executeAST: {
                loop: { $for: { $await: { $items: { item: body } } } },
                after: { $return: "finished" }
            }
        });
        assert.equal(result, returning ? "returned" : "finished");
        assert.equal(closed, true);
        assert.deepEqual(seen, [1]);
    }
});

test("evaluateAST uses the same entry boundary for expressions and control flow", async () => {
    assert.equal(await evaluateAST({ executeAST: "$value", sandbox: { value: 42 } }), 42);
    assert.equal(await evaluateAST({ executeAST: { nested: { $return: 42 }, after: { $throw: "After return" } } }), 42);
    await assert.rejects(evaluateAST({ executeAST: "$break" }), SyntaxError);
});

for (const evaluate of [astSync, astAsync]) {
    test(`${evaluate.name}: explicit return preserves falsy values and skips following steps`, async () => {
        for (const value of [false, null, 0, "", { result: 42 }, [1, 2]]) {
            assert.deepEqual(await evaluate({
                sandbox: { value },
                executeAST: { nested: { $return: "$value" }, after: { $throw: "After return" } }
            }), value);
        }
    });

    test(`${evaluate.name}: reading control strings from data does not execute them`, async () => {
        assert.equal(await evaluate({ executeAST: "$value", sandbox: { value: "$break" } }), "$break");
        assert.equal(await evaluate({ executeAST: "$value", sandbox: { value: "$continue" } }), "$continue");
    });
}

test("an explicit synchronous function return preserves a Promise without awaiting it", () => {
    const promise = Promise.resolve(42);
    const callback = astSync({
        sandbox: { promise },
        executeAST: { $function: { body: { $return: "$promise" } } }
    });
    assert.equal(callback(), promise);
});

test("concurrent async callback invocations keep control flow isolated", async () => {
    const callback = await astAsync({
        sandbox: { items: [1, 2, 3] },
        executeAST: { $async: { $function: {
            params: ["target"],
            body: [
                loop(condition("$item", "$target", { $return: "$item" })),
                { $return: "missing" }
            ]
        } } }
    });
    assert.deepEqual(await Promise.all([callback(1), callback(2), callback(3), callback(4)]), [1, 2, 3, "missing"]);
});
