# create-cytoscape-app

Scaffold an app for [Cytoscape Web](https://web.cytoscape.org).

```bash
npm create cytoscape-app my-app
```

> **Developer Preview**, published at `0.x`. Read
> [Developer Preview](#developer-preview) before you build anything you intend
> to ship — the limits are about what a Cytoscape Web app is trusted with, not
> about this tool's polish.

## Non-interactive

Every prompt has a flag, and `--yes` never asks. This is a requirement rather
than a convenience: a large share of the people this exists for drive it through
an LLM, and a prompt with no flag equivalent makes that path unusable.

```bash
npm create cytoscape-app my-app -- \
  --yes --id degreeColorizer --display-name "Degree Colorizer" \
  --template panel --port 6001
```

| Flag | Default |
| --- | --- |
| *(positional)* | the target directory — must be missing, or empty and not a symlink |
| `--id` | from the directory name, camelCased. A JavaScript identifier: it is the Module Federation container name, and the host rejects anything else |
| `--package-name` | the directory name |
| `--display-name` | from `--id` |
| `--description` | a placeholder |
| `--version` | `0.1.0` |
| `--port` | the first usable port from 6000 — free, unclaimed by the examples or the host, and not one browsers refuse (6000 itself is X11) |
| `--template` | `panel` |
| `--pm` | `npm`, or `pnpm` |
| `--no-install` | skip dependency installation |
| `--yes`, `-y` | accept every default; never prompt |

Directory name, package name, display name and app id are **four different
things**. Set them separately, or let each default from the one before.

Everything is validated **before anything is written** — a malformed id, a
non-canonical version, an occupied port, an unknown flag, a non-empty or
symlinked target. All problems are reported at once, and nothing is created.

## Templates

| `--template` | What you get |
| --- | --- |
| `panel` | A right-panel component. The usual starting point |
| `menu` | An item in the Apps dropdown |
| `context-menu` | A panel plus a right-click action on nodes |
| `non-react` | No UI at all — an app driven entirely by lifecycle hooks and host events |
| `full` | All of the above together |

They are copied out of the example apps in
[cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples),
which are built, verified and loaded into a real host on every CI run, so a
template cannot quietly rot into something that no longer works.

## What you get

```
my-app/
├── package.json          ← your identity, written once, in the `cyweb` block
├── vite.config.ts        ← three lines
├── src/MyApp.tsx         ← the CyApp the host loads
├── src/components/       ← your UI
├── test/                 ← a smoke test that runs with no browser and no host
├── AGENTS.md             ← context for coding agents
└── README.md
```

Then:

```bash
cd my-app
npm run dev                       # prints the link that installs it into a host
npm run build && npx cyweb-app verify
```

`npm run dev` serves an app manifest and prints a `?installApp=` link. Opening it
against a running local host installs the app — **nothing in the host repository
is edited.**

## Developer Preview

The tooling is published at `0.x` while the host-side security work is
outstanding. An app runs inside Cytoscape Web with the host's full privileges —
no sandbox, no signature verification — so what "Preview" marks is a property of
the platform, not the maturity of this generator.

**An app runs in the host's own browser context** — same origin, DOM, storage and
network identity, with no sandbox and no signature verification. An app can read
the user's credentials. Install only apps you trust, and understand that
publishing one asks the same of your users.

Withholding `latest` is what keeps the short, discoverable form of this command
from working while that is still true.

## License

MIT
