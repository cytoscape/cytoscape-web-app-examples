// Builds templates/ OUT of the working example apps.
//
// The templates are not authored here. project-template and network-statistics
// are built, verified and loaded into a real host on every CI run; a template
// copied from them cannot quietly rot into something that no longer works,
// which is exactly what a hand-maintained second copy does.
//
// What IS authored here is the per-variant app file: `panel`, `menu` and
// `context-menu` are the full template with resources removed, and expressing
// "the same file minus one entry" as a source transform would be more fragile
// than writing four short files. The drift risk that leaves is covered where it
// belongs — the acceptance test scaffolds all five, builds them, and runs
// `cyweb-app verify` on the result.
//
// Identity is NOT substituted anywhere. Since the apps read id, displayName,
// version and description from virtual:cyweb-app-meta, the only per-app value
// left is package.json, which the scaffolder writes rather than copies. That is
// the payoff of moving identity into one place: template generation became a
// file copy.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_ROOT = fileURLToPath(new URL('..', import.meta.url))
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const OUT = join(PKG_ROOT, 'templates')

const REACT_SRC = join(REPO_ROOT, 'project-template')
const NON_REACT_SRC = join(REPO_ROOT, 'network-statistics')

/** Copied byte-for-byte into every React variant. */
const REACT_SHARED = [
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.node.json',
  'tsconfig.test.json',
]

const rename = (source, replacements) => {
  let text = readFileSync(source, 'utf8')
  for (const [from, to] of replacements) text = text.replaceAll(from, to)
  return text
}

const write = (variant, rel, body) => {
  const target = join(OUT, variant, rel)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, body)
}

const copy = (variant, rel, source) => {
  const target = join(OUT, variant, rel)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target)
}

// ── The app file, per variant ───────────────────────────────────────────────
// One import block and one lifecycle shape, so the variants differ only in what
// they declare. Every TODO the template used to carry is gone: the things they
// pointed at (id, name, description) now live in package.json, and a generated
// project should not ship instructions to edit something the generator already
// filled in.

const APP_HEADER = `import { lazy } from 'react'

import { AppContext, CyAppWithLifecycle } from 'cyweb/ApiTypes'
// This app's identity, from the \`cyweb\` block and the standard fields in
// package.json — the one place it is written. The build supplies it here.
//
// Do NOT \`import packageJson from '../package.json'\`: that pulls the whole
// file, devDependencies and all, into your browser bundle to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'
`

const PANEL_RESOURCE = `    {
      slot: 'right-panel',
      id: 'MyPanel',
      title: 'My App',
      component: lazy(() => import('./components/MyPanel')),
    },`

const MENU_RESOURCE = `    {
      slot: 'apps-menu',
      id: 'MyMenuItem',
      title: 'My Action',
      component: lazy(() => import('./components/MyMenuItem')),
      // Close the Apps dropdown once the action runs.
      closeOnAction: true,
    },`

const buildAppFile = ({ resources, contextMenu }) => {
  const imports = contextMenu
    ? `${APP_HEADER}\nimport { registerSelectNeighbors } from './contextMenus'\n`
    : APP_HEADER

  const mountBody = contextMenu
    ? `    // Context menu items are registered here because their handlers need
    // context.apis. The host auto-cleans them when the app is disabled, so
    // unmount() does not have to.
    registerSelectNeighbors(context)`
    : `    // Register context menus or event listeners here. Anything you add to
    // window must be removed again in unmount().`

  const unusedContext = contextMenu ? 'context' : '_context'

  return `${imports}
export const MyApp: CyAppWithLifecycle = {
  // Change these in package.json, not here.
  id,
  name: displayName,
  description,
  version,
  apiVersion: '1.0',

  // Panels and menu items are declared, not registered: the host renders them
  // for you, and cleans them up when the app is disabled.
  resources: [
${resources.join('\n')}
  ],

  mount(${unusedContext}: AppContext): void {
${mountBody}
  },

  unmount(): void {
    // Only manual cleanup belongs here. Resources and context menu items are
    // cleaned up by the host.
  },
}
`
}

// ── The smoke test, per variant ─────────────────────────────────────────────
// No literals: it asserts the app agrees with its own package.json rather than
// with values copied into the test, so renaming the app cannot make it fail.

const smokeTest = (resourceCount) => `// Smoke test: this app still exports a CyApp the host can load.
//
// It reaches the config through src/index.ts — the exact module the host loads
// as \`./AppConfig\` — so a broken re-export fails here rather than in a browser.
//
// Note what it does NOT do: import a component. Anything that calls a cyweb/*
// API cannot be imported outside a running host yet.

import { describe, expect, it } from 'vitest'

import { buildInstallManifest, readAppMeta } from '@cytoscape-web/app-runtime/vite'

const root = new URL('..', import.meta.url).pathname

describe('app config', () => {
  it('matches the identity declared in package.json', async () => {
    const meta = readAppMeta(root)
    const { default: app } = await import('../src/index')

    expect(app.id).toBe(meta.id)
    expect(app.name).toBe(meta.displayName)
    expect(app.version).toBe(meta.version)
  })

  it('declares ${resourceCount} resource(s) the host can render', async () => {
    const { default: app } = await import('../src/index')
    const slots = (app.resources ?? []).map((r) => r.slot)

    expect(slots).toHaveLength(${resourceCount})
    // Any other slot is dropped with an "Unsupported slot" log line.
    for (const slot of slots) {
      expect(['right-panel', 'apps-menu']).toContain(slot)
    }
  })

  it('gives the same identity to the dev install manifest', async () => {
    // The manifest the dev server serves at /cyweb-app.json is what the host
    // reads when you open the printed install link.
    const meta = readAppMeta(root)
    const { default: app } = await import('../src/index')
    const entry = buildInstallManifest(meta, \`http://localhost:\${meta.port}\`)[0]

    expect(entry.id).toBe(app.id)
    expect(entry.url).toBe(\`http://localhost:\${meta.port}/remoteEntry.js\`)
  })
})
`

const AGENTS_PLACEHOLDER = `# AGENTS.md

Context for coding agents working in this app.

> Placeholder. Replace the notes below with whatever your app actually needs;
> everything here is true of any Cytoscape Web app.

## What this is

A Cytoscape Web app, loaded into the host at runtime through Module Federation.
It is not a standalone page: \`index.html\` exists only because a Vite build needs
an HTML entry, and the host never loads it.

## Rules that are not obvious

- **Every \`cyweb/*\` API returns \`ApiResult<T>\`.** Check \`result.success\` before
  reading \`result.data\`; the API never throws across the boundary.
- **Identity lives in \`package.json\`**, in the \`cyweb\` block, and reaches the code
  through \`virtual:cyweb-app-meta\`. Never \`import packageJson from
  '../package.json'\` — that bundles the whole file into the browser.
- **Do not edit \`vite.config.ts\` beyond the options \`defineCyWebApp\` takes.** The
  federation wiring it sets up fails in ways that are hard to read, and the
  config owns those fields; touching one fails the build with the path named.
- **Import MUI from the root barrel** — \`import { Box } from '@mui/material'\`,
  never \`'@mui/material/Box'\`. The subpath form bundles a second copy of MUI
  instead of using the host's, and the build gate will stop you.
- **Panels and menu items are declared** in \`resources\`, not registered by hand.
  Use \`lazy(() => import(...))\` so they load on demand.
- **\`unmount()\` cleans up only what you added manually** — event listeners,
  timers. Resources and context menu items are the host's to clean up.

## Checks

\`\`\`bash
npm run typecheck
npm test
npm run build && npx cyweb-app verify
\`\`\`
`

// ── Variants ───────────────────────────────────────────────────────────────

const VARIANTS = {
  panel: { resources: [PANEL_RESOURCE], contextMenu: false, components: ['MyPanel'] },
  menu: { resources: [MENU_RESOURCE], contextMenu: false, components: ['MyMenuItem'] },
  'context-menu': {
    resources: [PANEL_RESOURCE],
    contextMenu: true,
    components: ['MyPanel'],
  },
  full: {
    resources: [PANEL_RESOURCE, MENU_RESOURCE],
    contextMenu: true,
    components: ['MyPanel', 'MyMenuItem'],
  },
}

const COMPONENT_SOURCE = {
  MyPanel: 'TemplatePanel.tsx',
  MyMenuItem: 'TemplateMenuItem.tsx',
}

rmSync(OUT, { recursive: true, force: true })

for (const [variant, spec] of Object.entries(VARIANTS)) {
  for (const file of REACT_SHARED) copy(variant, file, join(REACT_SRC, file))

  write(variant, 'src/index.ts', "export { MyApp as default } from './MyApp'\n")
  write(variant, 'src/MyApp.tsx', buildAppFile(spec))
  write(variant, 'test/appConfig.test.ts', smokeTest(spec.resources.length))
  write(variant, 'AGENTS.md', AGENTS_PLACEHOLDER)

  for (const component of spec.components) {
    write(
      variant,
      `src/components/${component}.tsx`,
      rename(join(REACT_SRC, 'src/components', COMPONENT_SOURCE[component]), [
        ['TemplatePanel', 'MyPanel'],
        ['TemplateMenuItem', 'MyMenuItem'],
      ]),
    )
  }
  if (spec.contextMenu) copy(variant, 'src/contextMenus.ts', join(REACT_SRC, 'src/contextMenus.ts'))
}

// ── non-react ──────────────────────────────────────────────────────────────
// A whole working app rather than a trimmed one: it is the example that proves
// a Cytoscape Web app does not have to render anything, and cutting it down
// would leave a template that demonstrates nothing.
for (const file of ['index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.node.json', 'tsconfig.test.json']) {
  copy('non-react', file, join(NON_REACT_SRC, file))
}
copy('non-react', 'src/statistics.ts', join(NON_REACT_SRC, 'src/statistics.ts'))
write('non-react', 'src/index.ts', "export { MyApp as default } from './MyApp'\n")
write(
  'non-react',
  'src/MyApp.ts',
  rename(join(NON_REACT_SRC, 'src/NetworkStatisticsApp.ts'), [
    ['NetworkStatisticsApp', 'MyApp'],
  ]),
)
write('non-react', 'test/appConfig.test.ts', smokeTest(0))
write('non-react', 'AGENTS.md', AGENTS_PLACEHOLDER)

console.log(`sync-templates: wrote ${Object.keys(VARIANTS).length + 1} templates to templates/`)
