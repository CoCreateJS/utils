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

`renderValue` resolves CoCreate double-curly values and AST expressions. Pass
the evaluator from `@cocreate/evaluate` in the final options object. It can
run without a DOM node when the expression reads from the supplied data. It
resolves nested values from the innermost placeholder outward, while callers
with their own nested scopes can pass a custom `resolveValue` callback.

```js
import { renderValue } from "@cocreate/utils";
import { evaluateAsync } from "@cocreate/evaluate/client";

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
	{ escapeOutput: true, evaluateAsync }
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
It returns a boolean. Keys may use dot notation and explicit array indices
to address nested values. Range operators use JavaScript relational comparisons.
`$includes` calls native string or array `includes()`. `$in` checks whether the
field value, or any member of an array field, is included in the choices.
`$nin` negates that result. `$eq` and `$ne` retain structural equality for
arrays and objects.

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

The function sorts the input array in place and returns that same array.
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
- Equal keys retain their input order in JavaScript. Include `_id` as the final
  field for deterministic pagination across storage adapters.

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

AST evaluation is provided by [`@cocreate/evaluate`](../evaluate/README.md).

## Query and update operator contracts

The executable operator suites are `test/query-operators.test.js` and `test/createUpdate.test.js`.

Query coverage includes `$eq`, `$ne`, `$not`, `$lt`, `$lte`, `$gt`, `$gte`, `$in`, `$nin`, `$all`, `$elemMatch`, `$size`, `$exists`, `$regex`/`$options`, `$type` (including aliases), `$mod`, `$where`, and `$and`/`$or`/`$nor`. Tests cover missing/null values, scalar types, arrays and objects, nested logical conditions, dot/bracket paths, and repeated regular-expression evaluation. Dotted traversal keeps actual leaf values separate: `$size` and `$type` inspect stored values, not a synthetic array of traversal results. Positive predicates can match a leaf; `$ne`, `$nin`, and `$not` exclude matching leaves across the path. Relational operators retain native JavaScript coercion.

Update coverage includes `$set`, `$rename`, `$inc`, `$push`, `$each`, `$splice`, `$unset`, `$delete`, `$slice`, `$pop`, `$shift`, `$addToSet`, and `$pull`, plus flat operator keys, bracket shorthand, and global operators. `createUpdate` mutates its target, returning the target on success or `false` on invalid operations. It is not a transaction; callers requiring rollback must apply updates to a detached copy, as CoCreateDB does.

CoCreate's existing array conventions are retained: plain bracket assignments insert, while `$set` replaces an array position; `$splice` inserts a value at the selected position; standalone `$each` appends/inserts multiple values; `$slice`, `$delete`, and `$unset` remove a property or selected array position; `$pop` removes the last element and `$shift` the first. `$addToSet` and `$pull` compare whole array/object values by deep equality. MongoDB-style update modifiers and query predicates inside `$pull` are not implicitly supported. Rename destinations are root-relative dot/bracket paths. Use `$set` to store a literal string that is itself a recognized operator name, such as `$pop`.

Unknown update operators, unsafe prototype paths, nonnumeric increments, and array operations on non-arrays fail. Existing exported helper APIs remain available.

`$addToSet` accepts `{ $each: [...] }` to add multiple distinct values in one update; a literal array without `$each` remains one set element.

### Final-value update changes

`createUpdateChanges(before, after)` returns a JSON-safe `$set`/`$unset` patch of
actual differences, using dotted paths for nested objects and whole values for
changed arrays. Unchanged keys are omitted. Reapplying the resulting patch does
not repeat increments or insertions. `mergeUpdateChanges(previous, next)` coalesces
resolved patches while preserving changed-and-reverted paths and parent/child
replacement semantics. Both helpers are exported alongside `createUpdate` from
the browser and server entries. `createUpdate` still mutates/returns the complete
target document; storage callers keep their existing contract.
