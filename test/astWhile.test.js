import assert from "node:assert/strict";
import test from "node:test";
import { astSync, astAsync } from "../src/modules/ast/index.js";

const when = (expression, branch) => ({
    $if: { [expression]: { $eq: { $true: branch } } }
});

for (const evaluate of [astSync, astAsync]) {
    test(`${evaluate.name}: do-while polls until the supplied API returns true`, async () => {
        let calls = 0;
        const result = await evaluate({
            sandbox: { TestAPI: () => ++calls === 3 },
            executeAST: {
                poll: {
                    $do: { ready: { $TestAPI: [] } },
                    $while: "$($ready !== true)"
                },
                $return: "$ready"
            }
        });
        assert.equal(calls, 3);
        assert.equal(result, true);
    });

    for (const doFirst of [true, false]) {
        const name = doFirst ? "do-while" : "while-do";
        const loop = (condition, body) => doFirst
            ? { $do: body, $while: condition }
            : { $while: condition, $do: body };

        test(`${evaluate.name}: ${name} respects initial falsy conditions`, async () => {
            for (const condition of [false, null, 0, ""]) {
                let calls = 0;
                const result = await evaluate({
                    sandbox: { work: () => ++calls },
                    executeAST: loop(condition, { $work: [] })
                });
                assert.equal(calls, doFirst ? 1 : 0);
                assert.equal(result, doFirst ? 1 : undefined);
            }
        });

        test(`${evaluate.name}: ${name} reevaluates state and honors break and continue`, async () => {
            const state = { count: 0 };
            const seen = [];
            const result = await evaluate({
                sandbox: { state, record: value => seen.push(value) },
                executeAST: {
                    loop: loop("$($state.count < 10)", [
                        { "$state.count": "$($state.count + 1)" },
                        when("$($state.count === 2)", "$continue"),
                        when("$($state.count === 4)", "$break"),
                        { $record: "$state.count" }
                    ]),
                    after: "finished"
                }
            });
            assert.deepEqual(seen, [1, 3]);
            assert.equal(state.count, 4);
            assert.equal(result.after, "finished");
        });

        test(`${evaluate.name}: ${name} continue still checks the condition, break skips it`, async () => {
            let checks = 0;
            await evaluate({
                sandbox: { check: () => { checks++; return false; } },
                executeAST: loop({ $check: [] }, "$continue")
            });
            assert.equal(checks, 1);
            checks = 0;
            await evaluate({
                sandbox: { check: () => { checks++; return true; } },
                executeAST: loop({ $check: [] }, "$break")
            });
            assert.equal(checks, doFirst ? 0 : 1);
        });

        test(`${evaluate.name}: ${name} return exits the function and break stays in the nearest loop`, async () => {
            const callback = await evaluate({
                sandbox: { items: [1, 2, 3] },
                executeAST: { $function: { body: {
                    outer: { $for: { $items: { item: {
                        inner: loop(true, "$break"),
                        found: when("$($item === 2)", { $return: "$item" })
                    } } } },
                    after: { $throw: "After return" }
                } } }
            });
            assert.equal(callback(), 2);

            let calls = 0;
            await evaluate({
                sandbox: { items: [1, 2], record: () => ++calls },
                executeAST: loop(true, {
                    inner: { $for: { $items: { item: "$break" } } },
                    after: { $record: [] },
                    $break: false
                })
            });
            assert.equal(calls, 1);
        });
    }

    test(`${evaluate.name}: malformed while/do pairs fail clearly`, async () => {
        for (const executeAST of [
            { $while: false }, { $do: {} },
            { $do: {}, $while: false, extra: true }
        ]) {
            await assert.rejects(async () => evaluate({ executeAST }), /one '\$do' body and one '\$while' condition/);
        }
    });

    test(`${evaluate.name}: errors in the body and condition propagate unchanged`, async () => {
        const error = new Error("API failed");
        const sandbox = { fail: () => { throw error; } };
        for (const executeAST of [
            { $do: { $fail: [] }, $while: true },
            { $do: {}, $while: { $fail: [] } }
        ]) {
            await assert.rejects(async () => evaluate({ sandbox, executeAST }), candidate => candidate === error);
        }
    });
}

test("async do-while awaits each API response before checking and calling again", async () => {
    const events = [];
    let calls = 0;
    await astAsync({
        sandbox: {
            async TestAPI() {
                const call = ++calls;
                events.push(`start ${call}`);
                await new Promise(resolve => setTimeout(resolve, 1));
                events.push(`end ${call}`);
                return call === 3;
            }
        },
        executeAST: {
            $do: { ready: { $TestAPI: [] } },
            $while: "$($ready !== true)"
        }
    });
    assert.deepEqual(events, ["start 1", "end 1", "start 2", "end 2", "start 3", "end 3"]);
});

test("async while awaits condition calls and a scoped Promise condition", async () => {
    for (const doFirst of [true, false]) {
        const state = { calls: 0 };
        const body = { "$state.calls": "$($state.calls + 1)" };
        const condition = { $check: [] };
        const executeAST = doFirst ? { $do: body, $while: condition } : { $while: condition, $do: body };
        await astAsync({
            sandbox: { state, check: async () => state.calls < 3 }, executeAST
        });
        assert.equal(state.calls, 3);
    }
    let calls = 0;
    await astAsync({
        sandbox: { ready: Promise.resolve(false), work: () => ++calls },
        executeAST: { $do: { $work: [] }, $while: "$ready" }
    });
    assert.equal(calls, 1);
});
