# CoCreate-utils

A simple utils component in vanilla javascript. Easily configured using HTML5 attributes and/or JavaScript API. Take it for a spin in our [playground!](https://CoCreateJS.com/docs/utils)

![minified](https://img.badgesize.io/https://cdn.CoCreateJS.com/utils/latest/CoCreate-utils.min.js?style=flat-square&label=minified&color=orange)
![gzip](https://img.badgesize.io/https://cdn.CoCreateJS.com/utils/latest/CoCreate-utils.min.js?compression=gzip&style=flat-square&label=gzip&color=yellow)
![brotli](https://img.badgesize.io/https://cdn.CoCreateJS.com/utils/latest/CoCreate-utils.min.js?compression=brotli&style=flat-square&label=brotli)
![GitHub latest release](https://img.shields.io/github/v/release/CoCreateJS/utils?style=flat-square)
![License](https://img.shields.io/github/license/CoCreateJS/utils?style=flat-square)
![Hiring](https://img.shields.io/static/v1?style=flat-square&label=&message=Hiring&color=blueviolet)

![CoCreate-utils](https://cdn.CoCreateJS.com/docs/CoCreate-utils.gif)

## [Docs & Demo](https://CoCreateJS.com/docs/utils)

For a complete guide and working demo refer to the [doumentation](https://CoCreateJS.com/docs/utils)

## CDN

```html
<script src="https://cdn.CoCreateJS.com/utils/latest/CoCreate-utils.min.js"></script>
```

```html
<script src="https://cdn.CoCreateJS.com/utils/latest/CoCreate-utils.min.css"></script>
```

## NPM

```shell
$ npm i @cocreate/utils
```

## yarn

```shell
$ yarn install @cocreate/utils
```

## Module Usage

### ESM (tree-shaking)

```js
import { uid, ObjectId } from "@cocreate/utils";
```

### ESM subpath imports

```js
import { getValueFromObject } from "@cocreate/utils/getValueFromObject";
import { queryElements } from "@cocreate/utils/queryElements";
```

### CommonJS (Node)

```js
const { uid, ObjectId } = require("@cocreate/utils");
const { getValueFromObject } = require("@cocreate/utils/getValueFromObject");
```

## Rendering values in strings

`renderValue` resolves CoCreate double-curly values and AST expressions. It can
run without a DOM node when the expression reads from the supplied data. It
resolves nested values from the innermost placeholder outward, while callers
with their own nested scopes can pass a custom `resolveValue` callback.

```js
import { renderValue } from "@cocreate/utils";

const html = await renderValue(
	undefined,
	{
		data: { ready: "<ready>" },
		object: { status: "ready" },
		module: { name: "utils" }
	},
	"<p>{{data.{{object.status}}}} {{$data.module.name}}</p>",
	undefined,
	undefined,
	undefined,
	undefined,
	{ escapeOutput: true }
);
```

The optional `escapeOutput` option escapes resolved values for HTML string
output. DOM renderers can omit it because the DOM handles text and attribute
escaping when values are assigned.

## Querying and Sorting

CoCreate exposes one data-object API across MongoDB, IndexedDB, MySQL, and
other storage providers. MongoDB query and sort behavior is the canonical
contract. A storage wrapper may use its native query engine or indexes as an
optimization, but it must return the same logical result.

The shared helpers are available from `@cocreate/utils`:

```js
import { queryData, searchData, sortData } from "@cocreate/utils";
```

### Querying

`queryData(object, query)` evaluates a MongoDB-style query against one object.
Keys may use dot notation to address nested values.

```js
const matches = queryData(
    {
        status: "active",
        profile: { score: 82 },
        tags: ["customer", "priority"]
    },
    {
        status: "active",
        "profile.score": { $gte: 80 },
        tags: { $in: ["priority"] }
    }
);
```

Queries can combine conditions using `$and`, `$or`, and `$nor`. Supported
field operators include equality and inequality comparisons, membership,
array matching, existence, regular expressions, type checks, and modulus
checks. Storage wrappers should translate these conditions to their native
query language when equivalent behavior is available and use the shared
helper as the compatibility fallback.

`searchData(object, search)` performs text-oriented matching across an object.
It is separate from structured `queryData` filtering and can be applied after
a record satisfies the structured query.

### Multi-field sorting

`sortData(data, sort)` applies sort fields in their declared order:

```js
const sorted = sortData(records, [
    { key: "status", direction: "asc" },
    { key: "updated.on", direction: "desc" },
    { key: "_id", direction: "desc" }
]);
```

The first field is the primary sort. The second field is compared only when
the primary values are equal, and each later field breaks ties left by all
preceding fields. A missing secondary or tertiary value does not exclude the
record.

Sorting follows MongoDB conventions:

- Keys support dot notation, including nested values such as `updated.on`.
- A missing field is treated as `null` for comparison.
- Null and missing values sort before ordinary values in ascending order and
  after them in descending order.
- Values of different types follow MongoDB's BSON comparison order.
- Array and object comparisons should follow MongoDB behavior where the
  corresponding JavaScript representation permits it.
- Equivalent sort keys do not imply a stable order. Include `_id` as the final
  field when deterministic pagination or rendering is required.

### Storage-native sorting

Storage wrappers should prefer native sorting when it produces the canonical
result:

- MongoDB can use its native sort directly.
- IndexedDB can use one cursor over a compound index when every indexed field
  is present and all fields use the same direction.
- SQL wrappers can translate the sort to `ORDER BY` while explicitly matching
  MongoDB's null ordering.
- Mixed directions, optional IndexedDB index fields, or incompatible native
  type ordering must use the shared comparator as a fallback.

IndexedDB compound indexes omit records that do not contain every indexed
field. Therefore, an optional secondary or tertiary field must not be placed
in the only cursor used to collect results unless the wrapper also collects
the omitted records. Falling back to `sortData` preserves the unified
behavior.

### Pagination

Filtering and the complete canonical ordering must be established before
`index` and `limit` are applied. Paginating an incompletely sorted result set
can return different records across storage providers.

For cursor pagination, include `_id` as the final sort key and build the next
range from all sort-key values plus `_id`. This provides a deterministic
boundary when multiple records share the same preceding values.

## Build

```shell
# Build UMD + ESM + CJS
npm run build

# Build only module outputs
npm run build:modules

# Build only UMD bundle
npm run build:umd
```

# Table of Contents

-   [Table of Contents](#table-of-contents)
-   [Querying and Sorting](#querying-and-sorting)
-   [Announcements](#announcements)
-   [Roadmap](#roadmap)
-   [How to Contribute](#how-to-contribute)
-   [About](#about)
-   [License](#license)

<a name="announcements"></a>

# Announcements

All updates to this library are documented in our [CHANGELOG](https://github.com/CoCreateJS/utils/blob/master/CHANGELOG.md) and [releases](https://github.com/CoCreateJS/utils/releases). You may also subscribe to email for releases and breaking changes.

<a name="roadmap"></a>

# Roadmap

If you are interested in the future direction of this project, please take a look at our open [issues](https://github.com/CoCreateJS/utils/issues) and [pull requests](https://github.com/CoCreateJS/utils/pulls). We would love to hear your feedback.

<a name="about"></a>

# About

CoCreate-utils is guided and supported by the CoCreate Developer Experience Team.

Please Email the Developer Experience Team [here](mailto:develop@CoCreateJS.com) in case of any queries.

CoCreate-utils is maintained and funded by CoCreate. The names and logos for CoCreate are trademarks of CoCreate, LLC.

<a name="contribute"></a>

# How to Contribute

We encourage contribution to our libraries (you might even score some nifty swag), please see our [CONTRIBUTING](https://github.com/CoCreateJS/utils/blob/master/CONTRIBUTING.md) guide for details.

We want this library to be community-driven, and CoCreate led. We need your help to realize this goal. To help make sure we are building the right things in the right order, we ask that you create [issues](https://github.com/CoCreateJS/utils/issues) and [pull requests](https://github.com/CoCreateJS/utils/pulls) or merely upvote or comment on existing issues or pull requests.

We appreciate your continued support, thank you!

<a name="license"></a>

# License

This software is dual-licensed under the GNU Affero General Public License version 3 (AGPLv3) and a commercial license.

-   **Open Source Use**: For open-source projects and non-commercial use, this software is available under the AGPLv3. The AGPLv3 allows you to freely use, modify, and distribute this software, provided that all modifications and derivative works are also licensed under the AGPLv3. For the full license text, see the [LICENSE file](https://github.com/CoCreateJS/utils/blob/master/LICENSE).

-   **Commercial Use**: For-profit companies and individuals intending to use this software for commercial purposes must obtain a commercial license. The commercial license is available when you sign up for an API key on our [website](https://CoCreateJS.com). This license permits proprietary use and modification of the software without the copyleft requirements of the AGPLv3. It is ideal for integrating this software into proprietary commercial products and applications.

If you have not purchased a commercial license and intend to use this software for commercial purposes, you are required to sign up for an API key on our website.

### Leading `$this` selector

Start a query branch with `$this` to return the current element, or attach a
CSS selector to test that element with `matches()` before continuing:

```html
click-query="$this:checked $closest .api-type-filter input:checked[]"
click-query="$this.active[aria-pressed='true'] $parent .target"
```

`$this#id`, `$this.class`, `$this[attribute]`, and pseudo-classes all match the
current element, rather than descendants. A failed match stops only that
comma-separated branch. Bare `$this` returns the current element without a
test. Whitespace after the attached selector starts the remaining query;
whitespace inside quoted attributes or parentheses remains part of the test.
`$this` is supported only at the beginning of a branch. Existing traversal
operators and descendant selectors continue normally after it.

### Resolve property names

```js
import { resolveProperty } from "@cocreate/utils";

const key = resolveProperty(element, "textcontent"); // "textContent"
if (key !== undefined) element[key] = "Updated";
```

`resolveProperty(object, name)` returns the original string key matching a name
without case sensitivity, or `undefined` when no match exists. It searches own
and inherited properties, including non-enumerable properties, without reading
getters. Distinct keys must be unique ignoring case: `myMethod` and `mymethod`
on the same object or its prototype chain cause a `TypeError`, even if one is
an exact match. Overrides using the same spelling are allowed. The caller
chooses whether to read, assign, or invoke the resolved member.

### Assign nested AST results

A dotted operator key identifies a property on an existing scoped object. When
that member is not a function, AST evaluates the nested value, assigns the
result to the property, and returns that result:

```js
await astAsync({
    node: element,
    sandbox: { $this: element, $ExamplePlugin: ExamplePlugin },
    executeAST: {
        "$this.myInstance": { "$ExamplePlugin": ["$this", {}] }
    }
});
```

This works in both `astSync` and `astAsync`, including multiple sibling keys,
nested paths, numeric array indices, and `items[]` appends. AST resolves the
root from its sandbox or registry and delegates writes to `dotNotationToObject`.
The root object must exist; missing parent objects are created by the shared
helper. Its conventions apply: `undefined` deletes a property, and assigning
`undefined` to an indexed array entry splices that entry out.
Existing callable members retain method invocation semantics. A string such as
`"$this.myInstance"` still reads a value; ordinary keys still store values in
the AST result and scope. Returned results are not automatically assigned to
the host element by the plugin loader.

### Browser globals in AST

In browser evaluations, `$window` reads the browser window and `$CoCreate`
reads its current `window.CoCreate` namespace. Both support dotted property
reads, assignment keys, and method calls in `astSync` and `astAsync`:

```js
astSync({ executeAST: "$window.location.origin" });
astSync({ executeAST: "$CoCreate" });
await astAsync({ executeAST: { "$window.exampleSettings": { enabled: true } } });
```

The globals resolve at evaluation time, so CoCreate may load after AST.
OperatorJS expressions can also use `$($window.innerWidth)` and
`$($CoCreate.someProperty)`, or the browser's normal `window` and `CoCreate`
names inside `$()`.

### Synchronous and asynchronous callbacks

`$function` creates a synchronous callback in both `astSync` and `astAsync`.
Creating the callback does not execute its body. Wrap it in `$async` to create
an asynchronous callback whose body uses `astAsync` and returns a Promise:

```json
{
    "$async": {
        "$function": {
            "params": ["value"],
            "body": { "$await": "$value" }
        }
    }
}
```

Both forms preserve the surrounding scope, parameters, and optional `bind`.
`$await` requires asynchronous evaluation; a synchronous callback rejects it.
A synchronous callback can still return a Promise directly without awaiting
it. Async configuration evaluation does not change a callback's declaration.

### Loop and function control

Use `"$break"` to exit the nearest `$for`, and `"$continue"` to skip the rest
of its current iteration. Both work inside nested `$if` branches:

```json
{
    "$for": {
        "$items": {
            "item": {
                "skip": {
                    "$if": {
                        "$item.status": {
                            "$eq": { "disabled": "$continue" }
                        }
                    }
                },
                "stop": {
                    "$if": {
                        "$item.status": {
                            "$eq": { "finished": "$break" }
                        }
                    }
                },
                "process": { "$processItem": "$item" }
            }
        }
    }
}
```

Object forms such as `{ "$break": true }` and `{ "$continue": false }` also
execute unconditionally. Their payloads are ignored and never evaluated.
A conditional belongs in `$if`; setting the payload to `false` does not disable
the command. These names are reserved when used as executable values or keys.

`{ "$return": value }` evaluates its value and exits the current AST function,
including through nested conditions and loops. Bare `"$return"` exits with
`undefined`. At an AST entry point outside a callback, return ends that
evaluation. Existing implicit function results remain supported.

Break and continue cannot cross a `$function` or `$async` function boundary;
using either without an enclosing loop in that function throws a `SyntaxError`.
All forms work in `astSync` and `astAsync`, including `$for` with `$await` in
async evaluation. Breaking or returning closes the iterator as JavaScript does.
Labeled break and continue are not supported.

Async arrays inside loop and function bodies execute in order so later steps
do not start after break, continue, or return. Other async arrays retain their
concurrent evaluation; use an object for sequential steps at an entry point.

### While and do-while loops

Put `$do` before `$while` to run the body once before testing whether to repeat.
For example, poll an API until it returns the boolean `true`:

```json
{
    "$do": {
        "ready": { "$TestAPI": [] }
    },
    "$while": "$($ready !== true)"
}
```

`TestAPI` is an application function supplied in the sandbox, not a built-in
operator. Use `astAsync` for asynchronous requests: each call is awaited before
testing the condition, and requests execute one at a time. The example is
equivalent to:

```js
let ready;
do {
    ready = await TestAPI();
} while (ready !== true);
```

Put `$while` before `$do` for a JavaScript-style `while` loop that checks first
and may execute zero times:

```json
{
    "$while": "$($state.count < 10)",
    "$do": {
        "$state.count": "$($state.count + 1)"
    }
}
```

The pair must be the only two keys in its object; their order determines which
loop runs. Nest that object under a named step when composing a larger flow.
The condition is reevaluated on every check using JavaScript truthiness. It
can be an expression, a scoped value, or another AST operation. Async
evaluation also awaits condition results.

The body shares its surrounding scope, so values such as `ready` written in
the body are available to the condition and following steps. Body arrays run
sequentially. `$continue` jumps to the next condition check; `$break` exits the
nearest `$while` or `$for` without checking again. `$return` exits the current
function or AST entry point. Function boundaries still isolate loop control.

There is no iteration limit. A condition of `true` repeats until the body
breaks, returns, or throws; the AST author controls termination.

### Native AST roots

AST exposes native APIs as top-level roots, so their methods can be composed
without adding an operator for each method. Shared roots include `$Promise`,
`$URL`, `$TextEncoder`, typed arrays, Fetch APIs, Web Streams, timers, and the
standard JavaScript collections and error constructors. Optional globals are
`undefined` when the environment does not provide them. Existing CoCreate
helpers remain available.

Import `astSync` or `astAsync` from `@cocreate/utils` in Node to register the
server scope. It adds `$crypto`, `$fs`, `$buffer`, `$Buffer`, `$util`, `$process`,
and the other enabled public top-level Node modules, plus the existing `$security`.
Native modules load on access using Node's
[`process.getBuiltinModule`](https://nodejs.org/api/process.html#processgetbuiltinmoduleid).
The explicit list is in `src/modules/ast/serverGlobals.js`; unsupported entries
such as `ffi` remain commented beside the active entries. Currently unused
`dgram`, `sqlite`, and `repl` are also commented out and can be enabled later.
Deprecated modules (`constants`, `domain`, `punycode`, and `sys`) are omitted.
Each registry entry includes a short description of its purpose.

```json
{
    "generate": { "$util.promisify": "$crypto.generateKeyPair" },
    "pair": { "$generate": ["ed25519", {}] },
    "$return": {
        "$pair.publicKey.export": { "type": "spki", "format": "pem" }
    }
}
```

Use `astAsync` for this example. Namespaced methods retain their native receiver,
and return values can be stored and used in later steps. APIs such as
`$fs.promises.readFile` are available through their module root. Explicit
sandbox bindings can override defaults for an individual evaluation.

In a browser, `$crypto` is native Web Crypto, also reachable as `$window.crypto`.
On the server, `$crypto` is Node's crypto module; its Web Crypto API is available
under `$crypto.webcrypto`. Node-only imports stay out of the browser bundle.
The direct `src/modules/ast/index.js` entry provides the shared/browser scope;
`src/modules/ast/server.js` registers the additional server roots.

Server APIs execute with the Node process's permissions. Registering these roots
provides capabilities; it does not isolate workflow execution from the host.
