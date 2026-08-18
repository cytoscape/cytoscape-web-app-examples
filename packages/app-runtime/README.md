# @cytoscape-web/app-runtime

Build-time SDK for [Cytoscape Web](https://web.cytoscape.org) apps. One call
configures Module Federation correctly; a CLI checks that the build came out the
way it was configured.

> **Developer Preview.** Published under the `next` dist-tag. The API may change
> before `1.0`, and there are things it deliberately does not promise — see
> [Trust boundary](#trust-boundary) below.

```bash
npm install --save-dev @cytoscape-web/app-runtime
```

Starting from scratch? Use the scaffolder instead:

```bash
npm create cytoscape-app@next my-app
```

## The config

```ts
// vite.config.ts, in full
import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)
```

`import.meta.url` is required: the app root has to be located to read
`package.json`, and `process.cwd()` is wrong whenever Vite runs from a monorepo
root or with `--config`.

Your app's identity goes in `package.json`, once:

```json
{
  "version": "0.1.0",
  "description": "Colors nodes by degree",
  "cyweb": { "id": "myApp", "displayName": "Degree Colorizer", "port": 6000 }
}
```

`cyweb.id` is the Module Federation container name, your `CyApp.id` and the id
the host registers, all at the same time. Read it in your app from the virtual
module rather than importing `package.json` — that import pulls the whole file,
`devDependencies` and all, into your browser bundle:

```ts
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'
```

Add the declarations to `tsconfig.json`:

```json
{ "compilerOptions": { "types": ["@cytoscape-web/api-types", "@cytoscape-web/app-runtime/meta"] } }
```

### Options

```ts
defineCyWebApp(import.meta.url, {
  react?: boolean                    // false for an app with no UI
  exposes?: Record<string, string>   // merged with the mandatory './AppConfig'
  devHostPageUrl?: string            // default http://localhost:5500
  devHostRemoteEntryUrl?: string     // derived from the page URL when omitted
  appStoreZip?: boolean              // default false
  vite?: UserConfig                  // merged last
})
```

The `vite` option is the escape hatch — plugins, aliases, `define`, test
settings. Setting a field the SDK owns fails the build and names the path,
rather than silently winning or silently losing.

### What it sets up, and why it is not yours to write

Four parts of the federation config are load-bearing, and each fails in a way
that is hard to read:

| | |
| --- | --- |
| `remotes.cyweb.type: 'module'` | The host emits an ESM `remoteEntry.js`. The plugin's default (`'var'`) resolves **no exports** against it and fails **silently** — the remote appears to load and exports nothing |
| A production entry that is a **sentinel**, not a URL | One build works against every deployment. Shipping `localhost:5500` would point a deployed app at the end user's own loopback |
| `runtimePlugins` | The load-bearing half of the sentinel. The resolver is inert unless registered, and the app then keeps whatever entry was compiled in |
| `shared`, exact keys, `import: false` | Five singletons the host provides. Import from `@mui/material`, never `@mui/material/Box`, or a second copy of MUI ends up in your bundle |

The host publishes its own entry URL on `window.__CYWEB_HOST__` at boot; the
runtime plugin substitutes it before any remote resolves.

## Dev install

`npm run dev` serves a one-entry app manifest at `/cyweb-app.json`, generated
from your `package.json` on every request, and prints the link that installs it:

```
  Cytoscape Web app myApp — http://localhost:6000

  Install it into a local host:
  http://localhost:5500/?installApp=http://localhost:6000/cyweb-app.json
```

Nothing in the host repository needs editing.

## Verify a build

```bash
npm run build && npx cyweb-app verify
```

Reads your app directory and nothing else, so it works in your own project.
It checks the four items above against the built artifact, plus:

- no shared fallback chunks (`import: false` really took effect)
- no developer host URL left in the artifact
- `package.json` did not end up in your bundle
- build-machine paths did not escape into your chunks

Every one of the four looks correct in a config file when it is wrong, which is
why this reads the output instead.

## Trust boundary

**An app runs in the host's own browser context.** It shares the host's origin,
DOM, storage and network identity. There is no sandbox, no capability
restriction, and no signature verification. An app can read the user's
credentials.

Install only apps you trust, and understand that publishing one asks the same of
your users.

What this Preview does **not** promise:

- safety of untrusted app code
- accurate runtime API version enforcement
- legible reporting when an app fails to load

Those need host-side work — isolation, a capability API, artifact integrity —
which is why this is published under `next` and not `latest`.

## Public API

`./vite` and `./meta`. Anything else you can reach is internal and will move.

`cywebFederation`, `noSharedPayload` and `CYWEB_SHARED` are exported for an app
that assembles its own config. They are **advanced and unsupported**: outside
the guarantees `defineCyWebApp` makes, and nothing verifies a config built that
way except `cyweb-app verify`.

## License

MIT
