# Writing a recipe

This is the contract every recipe meets. Most of it is checked: by the type
checker, by `scripts/cookbook-index.mjs`, or by the recipe's case in a real
host. Where a rule is checked, the check is named.

Design: [`cookbook-design.md`](../design/specifications/cookbook/cookbook-design.md).

## What goes in the catalog

A recipe is in the catalog only with a case that passes on every supported
host release. There are no exemptions. A task the API cannot perform is not a
recipe.

## The file

- `recipes/<category>/<name>.ts`. The id is `<category>/<name>`.
- `.tsx` only for a recipe that is a React component. It runs in the
  verification app (Phase 3), not in the runner.
- One idiom per file. Aim for 120 lines of code or fewer.
- **A recipe imports no other recipe**, and no other file. *(Checked:
  `foreign-import`.)*

## The header

The header comment is the documentation. There is no separate prose to drift
from the code. *(Checked: `missing-tag`, `missing-section`.)*

```typescript
/**
 * @recipe Color nodes by a numeric column
 * @aliases color by score, heat map, gradient
 * @apis table.getTable, visualStyle.createContinuousMapping
 * @related elements/add-nodes-to-network
 *
 * ## When to use
 * ## Preconditions
 * ## Side effects
 * ## Pitfalls
 * ## Don't
 * ## Wiring
 */
```

| Part | What it says |
|---|---|
| `@recipe` | The task, as a user would put it |
| `@aliases` | Other words for the task. They are how the index is searched |
| `@apis` | Every API method the code calls, as `domain.method` |
| `@related` | Ids of related recipes. May be empty |
| When to use | The request that should lead here, in the user's words |
| Preconditions | Readiness, a loaded network, required column types |
| Side effects | What changes, which undo entries are recorded, what is left if a later step fails, what is deliberately not changed |
| Pitfalls | What goes wrong. See the required topics below |
| Don't | The mistakes agents actually make for this task |
| Wiring | Whether the recipe is host-wide or owner-bound, and which `wiring/` files apply |

A tag's value may continue on indented lines.

`@apis` must equal the calls in the code. *(Checked: `apis-mismatch`. The file
is parsed, so a call in a comment does not count.)* Events are not API
methods: name them in the text.

**State only what you have seen or read in the host's source.** A claim about
the host's behavior is either asserted by the case, or read at both supported
tags. If neither, leave it out.

### Required pitfall topics

The Pitfalls section covers each topic of the recipe's kind, or says why it
does not apply. A recipe may be of more than one kind.

| Kind | Topics |
|---|---|
| Numeric mapping | Missing values; non-numeric values; an empty column; all values equal |
| Mutation | Batch APIs over loops (`createNodes` validates all-or-nothing and records one undo entry); what remains when a later call fails; the undo unit |
| Persistence | `appData` stores locally by default and enters CX2 only when shared (`cyAppData` aspect); read values are deeply frozen and must be copied before mutation |
| Events and async | Ignore events for other networks; discard results that arrive after a switch; no network at all (the last one closed fires `network:switched` with an empty id); unsubscribe |

## The code

**One exported function.** Types may be exported too. *(Checked:
`recipe-function`.)*

**`apis` is a parameter, and its type is the recipe's list of dependencies.**
Type it `Pick<CyWebApiType, …>` or `Pick<AppContextApis, …>`, naming exactly
the domains the code calls. *(Checked: `apis-signature`.)*

```typescript
export function colorNodesByNumericColumn(
  apis: Pick<CyWebApiType, 'table' | 'visualStyle'>,
  networkId: IdType,
  column: string,
): ApiResult<ColoredNodes>
```

**Call the API as `apis.<domain>.<method>(…)`.** Do not destructure `apis` or
keep a domain in a variable: the `@apis` check cannot follow it. Passing
`apis` on to another function of the same file is fine. *(Checked:
`apis-untraceable`.)*

**Return `ApiResult<T>`**, or `Promise<ApiResult<T>>` where the API is
asynchronous. Never throw. Return the first failure the host gives you, as it
is:

```typescript
const table = apis.table.getTable(networkId, 'node')
if (!table.success) return table
```

**A recipe's own failure** is an `ApiFailure` written as a literal, with a
code that starts with `RECIPE_`. Check what you can before changing anything,
so that a refusal leaves the host as it was.

```typescript
const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})
```

**Never spread a network-sized array into a call.** `Math.min(...values)`
passes one argument per element and throws a `RangeError` past about 120,000
of them, and the host loads networks that large. Use a loop. A case can check
this with a stubbed `apis` and 200,000 elements, as the two Phase 1 cases do.

**No React in a core recipe.** A component recipe is a React component that
calls core functions of its own file and renders their results.

## Imports

`@cytoscape-web/api-types` contains declarations only. A value import from it
compiles, and fails in the browser.

- A core recipe imports **types only**, from `'cyweb/ApiTypes'`:
  `import type { ApiResult, CyWebApiType } from 'cyweb/ApiTypes'`. *(Checked:
  `value-import`, `foreign-import`.)*
- Every runtime value comes through `apis`. Host constants are written as
  literals that the types check: `'nodeBackgroundColor'`, `'double'`,
  `'network:switched'`.
- **Only exported types can be imported.** `VisualMappingFunction` and
  `ColorType`, for example, are declared and not exported. Write the shape you
  need, or derive it from an exported type.
- A component recipe may also import React and `cyweb/*` hooks.

## Owner-bound domains

`resource`, `dialog`, `appData`, `contextMenu`, `nodeGraphics` and `panel`
belong to one app. Through the anonymous `window.CyWebApi`, a registration is
not removed when the app is disabled, and `panel.open` does not prefer the
app's own tab. The types cannot tell the two objects apart, so three checks
do:

1. **Declaration.** A recipe that calls one of these domains types `apis` as
   `Pick<AppContextApis, …>`. *(Checked: `owner-bound-declaration`.)*
2. **Source.** In `wiring/` and `runner/app`, the `apis` argument of an
   owner-bound recipe is written in one of these forms, and no other
   *(checked: `apis-source`)*:
   - `context.apis`, inside `mount(context)`;
   - the parameter of an `onClick` arrow function;
   - a `const` initialized from `useAppContext()?.apis`;
   - in `runner/app` only, `harness.apis`, the one field `mount()` assigns
     from `context.apis`.

   An alias, a destructured name or a helper in between is rejected, even
   when it would be right. The check does not trace.
3. **Behavior.** The verification app's cases include a duplicate tab id and
   a disabled app.

## Host releases

The cookbook supports Cytoscape Web 1.1.0 and later. A recipe is right on
every supported release, and its case passes on the floor (1.1.0) and on the
latest release.

- **Nothing may depend on what a host added or fixed after the floor.** The
  types are the floor's, so a call the floor lacks does not compile.
- **Where the releases behave differently, the recipe's own code behaves the
  same on both, and the header states the difference by version:** "On 1.1.0
  …; from 1.1.1 …".
- **Observe before you state.** A difference described in a later fix's
  commit message is a hint. Write it in a header only once it has been seen
  on a host of each release.
- Read host files at the tags, not on `development`:
  `git -C ../cytoscape-web show v1.1.0:<path>`.

## The case

`runner/cases/<name>.ts`, with the recipe's id. *(Checked: `missing-case`,
`orphan-case`.)*

```typescript
const recipeCase: RecipeCase = {
  id: 'elements/add-nodes-to-network',
  run: (ctx) => {
    const networkId = ctx.createFixture([['x', 'y']])
    // call the recipe, then read the result back
  },
}
export default recipeCase
```

- **Build a fixture** with `ctx.createFixture`. It is deleted when the case
  ends, pass or fail. Register anything else to undo with `ctx.onCleanup`.
- **Read the result back** through the read-side APIs. Do not trust the
  recipe's return value alone.
- **Assert the header's claims** that can be asserted: each refusal and its
  code, what is left unchanged, a failure of the host passed on.
- **Assert what every supported release does.** Branch on `ctx.host.version`
  only for a difference the recipe's header states.
- A case that cannot use the host's own event (a load after a page reload,
  for example) may dispatch it itself, and says so in a comment.

## Before you commit

```bash
npm run typecheck                          # includes tsc -p cookbook
node scripts/cookbook-index.mjs            # checks, and writes the index
node scripts/cookbook-index.mjs --selftest # the checks themselves
```

Then run the cases on both host releases, which refreshes
[`verified.json`](verified.json): see [`runner/README.md`](runner/README.md).
Commit the recipe, its case, the index and the record together. CI rejects a
recipe whose record is stale.
