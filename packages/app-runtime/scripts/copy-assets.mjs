// Post-build: place the hand-written ambient declaration next to the emitted
// ones, and make sure the ./meta entry points at it.
//
// tsc treats a .d.ts under `include` as an INPUT and never copies it, so
// dist/meta/virtual.d.ts has to be placed here. The triple-slash reference is
// re-asserted rather than trusted: whether tsc preserves one into declaration
// output has changed between releases, and if it is dropped the virtual module
// silently loses its types in every app.

import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const at = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url))

const VIRTUAL_SRC = at('src/meta/virtual.d.ts')
const VIRTUAL_OUT = at('dist/meta/virtual.d.ts')
const META_DTS = at('dist/meta/index.d.ts')
const CLI = at('dist/cli/cyweb-app.js')
const REFERENCE = '/// <reference path="./virtual.d.ts" />'

if (!existsSync(META_DTS)) {
  console.error(`copy-assets: ${META_DTS} is missing — did tsc run?`)
  process.exit(1)
}

copyFileSync(VIRTUAL_SRC, VIRTUAL_OUT)

const dts = readFileSync(META_DTS, 'utf8')
if (!dts.includes(REFERENCE)) {
  writeFileSync(META_DTS, `${REFERENCE}\n${dts}`)
}

// A bin entry that is not executable fails only once it is installed from a
// tarball, which is exactly the case the monorepo never exercises.
if (existsSync(CLI)) chmodSync(CLI, 0o755)

console.log('copy-assets: dist/meta/virtual.d.ts, reference asserted, cli chmod +x')
