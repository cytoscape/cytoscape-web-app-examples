# Using a recipe

A recipe is one TypeScript file that performs one task in Cytoscape Web, such as
"color nodes by a numeric column". It exports one function. Its header comment
says when to use it, what it changes, and what goes wrong.

This page is for developers and for coding agents. The index is
[README.md](README.md).

## 1. Find the recipe

Look in the index for the task in the user's own words. The "Also asked as"
column lists them: "heat map" and "color by score" both lead to
`style/color-nodes-by-numeric-column`.

If no recipe fits, do not adapt one by guessing. Read the
[API reference](https://github.com/cytoscape/cytoscape-web/blob/development/src/app-api/api_docs/Api.md)
and let the type checker tell you what exists.

## 2. Copy it into your app

Copy the file as it is, for example to `src/recipes/`, and import its function.

- Keep the header. It is the documentation.
- Keep the imports as they are: `import type { … } from 'cyweb/ApiTypes'`.
  They are types only. `@cytoscape-web/api-types` ships declarations and no
  code, so importing a value from it (`ok`, `fail`, `VisualPropertyName`)
  compiles and then fails in the browser.
- A recipe imports nothing else, so one file is all you need.
- A `.tsx` recipe is a React component, or opens one. It also imports React
  and `@mui/material`, which an app built with `defineCyWebApp` gets from the
  host. Import MUI from its root, as the recipe does.

## 3. Give it `apis`

Every recipe takes `apis` as its first argument. Where `apis` comes from
depends on where you call the recipe. [`wiring/`](wiring) has one compiled
example per call site.

| You are in | `apis` is | Example |
|---|---|---|
| `mount(context)` | `context.apis` | [`wiring/from-mount.ts`](wiring/from-mount.ts) |
| the `onClick` of an `'apps-menu'` entry | the `apis` parameter | [`wiring/from-apps-menu.ts`](wiring/from-apps-menu.ts) |
| a React component | `useAppContext()?.apis`, or the `use*Api` hooks | [`wiring/from-panel.tsx`](wiring/from-panel.tsx) |
| a script that is not an app | `await window.CyWebApi.whenReady()` | [`wiring/from-window.ts`](wiring/from-window.ts) |

**Look at the type of the recipe's `apis` parameter.** It decides which of
these you may use.

- `Pick<CyWebApiType, …>` is a **host-wide** recipe. Any of the four works.
- `Pick<AppContextApis, …>` is an **owner-bound** recipe. It uses `resource`,
  `dialog`, `appData`, `contextMenu`, `nodeGraphics` or `panel`, which belong
  to one app. Pass it only `context.apis`, the `onClick` parameter, or
  `useAppContext()?.apis`. **Never `window.CyWebApi`, and never a `use*Api`
  hook.** The types accept them, and the result is wrong: what the recipe
  registers is not removed when the app is disabled, and `panel.open` may
  select another app's tab.

## 4. Check the result

A recipe returns `ApiResult<T>` (a `Promise` of one where the API is
asynchronous). It does not throw.

```typescript
const colored = colorNodesByNumericColumn(apis, networkId, 'score')
if (!colored.success) {
  console.error(colored.error.code, colored.error.message)
  return
}
console.info(`colored ${colored.data.mappedCount} nodes`)
```

A failure is either the host's own, passed on unchanged, or the recipe's. A
recipe's own codes start with `RECIPE_` and are listed in its header.

## 5. Know when the host is ready

Four different things are easy to take for one.

1. **`window.CyWebApi` exists.** It does before the host has finished
   starting. Do not call it yet.
2. **The API is ready.** `await window.CyWebApi.whenReady()`. Inside an app
   this has already happened.
3. **A network's data is loaded.** This is per network. After a page reload,
   `network:switched` arrives before the network's tables do, and a read made
   then fails with `APP1`. Use
   [`events/follow-current-network`](recipes/events/follow-current-network.ts).
4. **Your app is active.** The host calls `mount()`, waits for it to return,
   and only then shows the app's panels and dialogs. So `mount()` must never
   wait for the app's own UI.

## 6. What "verified" means

[`verified.json`](verified.json) records what the recipes were checked with:

- the `@cytoscape-web/api-types` version every file compiles against, with
  library checking on;
- the Cytoscape Web releases on which every recipe's case passed, in a real
  host. The cookbook supports **Cytoscape Web 1.1.0 and later**, and is run on
  1.1.0 and on the latest release.

Where the releases behave differently, the recipe's header says so by version.
If your host is older than 1.1.0, or runs a build that is not a release,
nothing here was checked against it.

## 7. The shortest way to see one work

```bash
npm create cytoscape-app my-app
cd my-app
```

Copy a recipe to `src/recipes/`, call it from the `onClick` in
`src/menuActions.ts`, then:

```bash
npm run dev
```

Open the install link the dev server prints, confirm the install, open a
network, and choose your entry in the **Apps** menu.

## Rules for a coding agent

- Use the recipe's function. Do not rewrite it from memory.
- If the type checker rejects a name, that name does not exist. Do not cast
  your way past it.
- Do not invent visual property names, event names or error codes. They are
  string literals that the types check.
- Read the "Don't" section of the recipe before you change anything in it.
