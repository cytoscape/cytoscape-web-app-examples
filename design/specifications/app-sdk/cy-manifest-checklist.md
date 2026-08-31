# Implementation Checklist — `cy-manifest.json` Submission Manifest

> Track progress across Phase 0 and the seven implementation phases. Mark `[x]`
> when complete. Run the per-phase verification before starting the next phase.
>
> **Status: NOT STARTED.** The design is settled through five rounds of review;
> nothing below is implemented yet.
>
> **Phases are strictly ordered, and the order is not cosmetic.** Phase 1's
> package snapshot is what makes every later "one snapshot" guarantee
> implementable; the schema and predicates (Phase 2) must exist before packaging
> (Phase 4) can validate against them; and the CLI (Phase 5) shares the
> serializer it would otherwise duplicate. Nothing outside the artifact being
> changed may break at any phase — in particular, **no phase may make an
> ordinary `vite dev` or `vite build` fail on submission-only metadata.**
>
> **Three acceptance gates, not one.** Phases 0–7 close only the first
> ([§8.1](cy-manifest.md)). The Store adoption gate and the public self-service
> gate are tracked at the end of this file and are **not** this repository's
> deliverables. **Issue #8 closes on the Store gate**, never on Phase 7.
>
> **Release gate.** Phase 7 publishes `0.4.0-next.N` under `next`, with
> **preview** schema and predicate identities that may still change. The first
> **stable** identity is issued only when every handshake item in §12 closes —
> after which the v1 envelope is frozen and a change costs a `formatVersion`.

_Design: [cy-manifest.md](cy-manifest.md) — full rationale and the reasoning behind every decision below. Section references (§) point into it._

_Review: [cy-manifest-review.md](cy-manifest-review.md) — §1–16, §17, §18, §19, §20. Findings are cited as R§n._

_Issue: [cytoscape-web-app-examples#8](https://github.com/cytoscape/cytoscape-web-app-examples/issues/8)_

**Format note:** this follows the layout of
[`app-sdk-checklist.md`](app-sdk-checklist.md) — all phases in one file, with a
per-phase verification block that must pass before the next phase starts.

**Repository note:** unless a step says otherwise, paths are relative to
`cytoscape-web-app-examples/`. Steps marked **[host]** or **[store]** live in
`cytoscape-web/` or `cytoscape/appstore` and belong to the cross-repository gates
at the end — this project's phases touch no file in either.

**Dependency note:** three dependency-manifest changes are required and **each
needs maintainer approval before the phase that uses it** (§13.3). They are all
devDependencies or generated-project dependencies; the runtime package keeps
**zero runtime dependencies**.

---

## Phase 0: Freeze the contract, and record the baseline

_Design: §3.1, §3.2, §4.1, §4.2, §4.3, §6.3, §6.5_

No implementation. Every decision below is one that becomes expensive to change
once the first stable schema digest exists, and two of them (the reserved-id
list, the version magnitude bound) came out of review only after they had already
been written into an earlier revision as "unbounded".

> **Decisions already taken in the design, recorded here so implementation does
> not reopen them:**
>
> - **No `url` field**; `entry` carries the archive-relative path (§3).
> - **Frozen v1 envelope**: unknown properties ignored forever, never promoted;
>   `x-` recommended, not required; any official change costs a `formatVersion`
>   (§3.1).
> - **`$schema` is not emitted** (§13.3).
> - **Build metadata rejected**, numeric identifiers ≤ `Number.MAX_SAFE_INTEGER`
>   (§4.2) — reproduced against `node-semver@7.8.5`, the pinned reference.
> - **Curated-only publication for v1** (§2, §8.3).
> - **Display-name authority: `cy-manifest.name`** (§11.9).

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `design/specifications/app-sdk/cy-manifest.md` | The whole contract; §3–§6 are normative for Phases 1–5 |
| `packages/app-runtime/src/vite/appMeta.ts` | The reader being split; note the `description` coercion at the end |
| `packages/app-runtime/src/vite/devInstall.ts` | `buildInstallManifest` — the pure-builder shape to follow |
| `packages/app-runtime/src/vite/zipForAppStore.ts` | The classifier and the walker being replaced |
| `packages/app-runtime/src/cli/verify.ts` | `sharedFromPeers` (the second package read) and the unguarded `JSON.parse` |
| `packages/app-runtime/src/cli/cyweb-app.ts` | The flag parser that accepts a flag as another flag's value |
| `packages/create-cytoscape-app/src/scaffold.ts` | `packageJsonFor`, the looser SemVer regex, the `.gitignore` writer |
| `.github/workflows/ci.yml` | The packed-scaffold job that installs the registry SDK when the range resolves |
| `.github/workflows/release-packages.yml` | The `tag` input, and the read-back that asserts only existence |

### Deliverables — decisions (write them down)

- [ ] **Reserved-id list frozen** (§4.1) — `cyweb`, `__proto__`, `constructor`,
      `prototype`, `__defineGetter__`, `__defineSetter__`, `hasOwnProperty`,
      `__lookupGetter__`, `__lookupSetter__`, `isPrototypeOf`,
      `propertyIsEnumerable`, `toLocaleString`, `toString`, `valueOf`
- [ ] **Version submission profile frozen** (§4.2) — canonical SemVer 2.0.0,
      ≤ 128 ASCII, no `v` prefix, no leading zeroes, no build metadata, numeric
      identifiers ≤ `Number.MAX_SAFE_INTEGER`
  - [ ] Record the reproduction against the pinned reference so the bound is not
        re-litigated: `9007199254740991.0.0` valid, `9007199254740992.0.0`
        invalid, and `1.0.0-99999999999999999999` vs
        `1.0.0-100000000000000000000` comparing **equal**
- [ ] **Field limits frozen** (§4.3), each labelled *proposed* or *current host
      rule* — and the two corrections carried: the host id regex has **no**
      length cap, and the current Store `App.name` column is **127**
- [ ] **Extension allowlist closed by decision, not inventory** (§6.3) — `.js`,
      `.css`, `.json`, `.wasm`, `.woff2`, `.woff`, `.ttf`, `.otf`, `.png`,
      `.jpg`, `.jpeg`, `.webp`, `.gif`, `.avif`, `.svg`. Tabular and CX/CX2 data
      denied in v1
- [ ] **Deny classes named normatively** (§6.3), including the **hashed** SSR
      prefixes — an exact-name rule readmits them
- [ ] **Preview pin style** — generated projects pin the **exact**
      `0.4.0-next.N`; `^0.4.0` only after stable promotion (§6.5)
- [ ] **Validator selected** — `ajv@^8` through `ajv/dist/2020` (§6.5)
- [x] **Schema `$id` namespace decided** (§3.2) — the repository-controlled path
      `https://cytoscape.org/cytoscape-web-app-examples/schema/cy-manifest/v1/…`,
      which is what GitHub Pages actually serves. The shorter
      `cytoscape.org/schema/…` was rejected: an `$id` need not resolve, but the
      **stable** identity can never change, and it must not rest on a namespace
      this repository does not own

### Deliverables — approvals

- [x] **Maintainer approval** for `adm-zip` (executable) in
      `packages/app-runtime` devDependencies — gates Phase 4's archive tests
- [x] **Maintainer approval** for `ajv@^8` in `packages/app-runtime`
      devDependencies — gates Phase 2's schema tests
- [x] **Maintainer approval** for `adm-zip` in generated projects and
      `cross-env` + `adm-zip` in the five maintained examples — gates Phase 6

### Deliverables — baseline (later phases compare against this)

_Captured in [`cy-manifest-phase0-baseline.md`](cy-manifest-phase0-baseline.md)._

- [x] Build all five apps at current HEAD and record the exact `dist/` member
      list per app — Phase 4's classifier must produce a **fixture per supported
      asset class**, and an unmatched extension is fatal, so a class no example
      emits has to be decided rather than discovered
- [x] Record the current `verify:federation` / `cyweb-app verify` check counts
      per app, so Phase 3's relocation can be proved output-neutral
- [x] **Submit one unmodified current-format ZIP to `apps-stage`** — done
      2026-08-28; the identity mismatch reproduced live, and the response headers,
      publication layout and manual-entry cost measured on the published artifact.
      Recorded in
      [`cy-manifest-phase0-baseline.md`](cy-manifest-phase0-baseline.md) §5. Phase 4
      must not change it: the new member is additive to today's Store, and that is
      a test (§7), not an assumption

### Verification (Phase 0)

- [x] Every decision above is written into `cy-manifest.md` or this file — no
      decision lives only in a review thread
- [x] The three approvals are recorded, or the phases they gate are blocked
- [x] The handshake list (§12) has been **sent to the App Store team** as a
      comment on Issue #8, with the five gating items separated from the
      non-gating questions —
      [issuecomment-5436202697](https://github.com/cytoscape/cytoscape-web-app-examples/issues/8#issuecomment-5436202697),
      2026-08-27. **Answers to all five gate stable promotion (Phase 7).**

---

## Phase 1: One package snapshot, three parses ✅ **COMPLETE**

_Design: §6.1_

The load-bearing phase. Separating readers is not enough: `readAppMeta()` opens
`package.json` internally and `sharedFromPeers()` opens it again, so "one
snapshot" cannot be implemented by two independent readers (R§19.3.1). Nothing
later in this checklist is true without this.

> **Two behaviours that must survive unchanged:**
>
> - `readAppMeta(root)` **stays public**. Only `zipForAppStore` is removed from
>   the public surface, in Phase 4. A packed-package consumer test proves parity
>   between the wrapper and the primitive.
> - Reading raw JSON on every path is what happens **today** — this phase defers
>   *validation*, not I/O. No new cost on `vite dev`.

### Deliverables

- [x] `readPackageSnapshot(root)` — raw parsed JSON plus its path, no validation.
      It also rejects a package.json that parses to a string, an array or `null`:
      every later property access would otherwise throw a `TypeError` naming
      nothing
- [x] `parseAppMeta(snapshot)` — runtime identity only, same failure policy and
      same messages as today
- [x] `parseSubmissionMeta(snapshot)` — optional publication values; called by
      **packaging and the CLI only**
- [x] `sharedExpectations(snapshot)` — the peer-derived shared records, moved out
      of `verify.ts`
- [x] `readAppMeta(root)` reimplemented as
      `parseAppMeta(readPackageSnapshot(root))`, still exported from `./vite`
- [x] **Wrong-type values survive to the validator** — the current coercion of a
      non-string `description` to `''` happens inside the runtime path, where no
      later validator can see it (§5)
- [x] `CyWebBlock` gains optional `compatibleHostVersions` (§5); `CyWebAppMeta`
      is unchanged and **`EXPOSED_META_FIELDS` is untouched**

### Verification (Phase 1)

- [x] `npm run test -w @cytoscape-web/app-runtime` passes — **109 tests, up from
      93**, including the existing `appMeta` suite unmodified
- [x] **Lifecycle regression**: an app with an invalid `repository`, an
      over-long `name`, and a 200-character `version` runs `vite dev` and
      `vite build` successfully
- [x] All five apps build with byte-identical `mf-manifest.json` audit fields, and
      `verify:federation` reports the Phase 0 counts unchanged (29/18/28/28/28)
- [x] `package.json` is parsed **once** — asserted with an instrumented
      `readFileSync`, not by inspection. The build path always read once; it was
      `verifyApp` that read twice, for identity and for peers

---

## Phase 2: The wire format — builder, serializer, schema, predicates, ledger ✅ **COMPLETE**

_Design: §3.1, §3.2, §3.3, §3.4, §4, §5_

The artifact contract. Three shipped artifacts, one ledger, two corpora.

> **Canonical validity is three parts, and JSON Schema is only one of them**
> (§3.2). Email-like detection, URL canonicalization, pre-normalization path
> inspection, and SemVer semantics cannot be expressed in a schema, and fixtures
> cannot define an answer for every input — so the predicates are **normative
> algorithms** and the fixtures are conformance examples.

### Deliverables — the builder

- [x] `packages/app-runtime/src/vite/cyManifest.ts` — `CY_MANIFEST_FILENAME`,
      `CY_MANIFEST_FORMAT_VERSION`, `CyManifestV1`,
      `buildCyManifest(appMeta, submissionMeta, sdkVersion)`. Pure: no fs, no
      Vite, no logging
- [x] `serializeCyManifest(manifest)` — **the only place bytes are produced**:
      UTF-8, no BOM, two-space indent, fixed field order, one trailing newline,
      and the 16,384-octet document limit enforced here (§3.4)
- [x] Every normative rule in the implementation is labelled **[source]** or
      **[wire]** (§3.3) — the Store implements only the wire half

### Deliverables — normalization ([source])

- [x] `author`: plain string, `"Name <email> (url)"`, `{ name, email, url }` →
      name only; **the extracted name is then re-checked** and omitted with a
      readiness warning if it is email-like or URL-like (§5)
- [x] `repository`: https / `git+https` / SSH / `github:`-style shorthand /
      object with string `url` and `type` absent-or-`"git"` → canonical
      credential-free HTTPS. **Explicit port, query, or fragment is rejected, not
      stripped.** Raw encoded path components inspected **before** URL parsing
- [x] `repositoryDirectory`: relative POSIX, no `.`/`..`/empty segment/leading
      `/`/drive/backslash/NUL, and **no `%` at all**
- [x] `homepage`: credential-free http(s), path/query/fragment **preserved**
- [x] `tags`: trim, drop empties, de-duplicate ASCII-case-insensitively with
      exact comparison for non-ASCII, keep first spelling and authored order,
      **omit when empty**
- [x] `license`: trimmed value passed through, type and bounds only
- [x] Trimming is **field-specific**: `id` and `version` are never trimmed —
      surrounding whitespace is invalid; constants and `generator` are exact
- [x] Empty-after-trim classification implemented per the §5 rule for both
      lifecycles

### Deliverables — shipped artifacts

- [x] `packages/app-runtime/schema/cy-manifest-v1.schema.json` — draft 2020-12,
      **preview `$id`** `…/cy-manifest/v1/draft/0.4.0-next.1/schema.json`
- [x] The normative **semantic-predicate artifact** beside it, covering the
      reserved-id list, author predicates, repository canonicalization
      (hostname case and IDNA, trailing slashes, percent escapes, path-segment
      grammar, terminal `.git` removal case and order), `repositoryDirectory`
      grammar, the tag equality relation, the Unicode scalar check, and the
      §4.2 SemVer profile
- [x] **Append-only `$id` → `sha256:<lowercase-hex>` ledger** covering the
      schema, the predicates, and (later) the publication-profile snapshot
  - [x] Digests are taken over **raw bytes extracted from the packed candidate
        tarball** — no newline normalization, transcoding, or JSON
        canonicalization (§3.2)
- [x] Both artifacts added to `files` and reachable through a documented export
      subpath

### Deliverables — corpora

- [x] **`package-source-normalization`** — `package.json` → canonical manifest
- [x] **`canonical-wire-validation`** — manifest bytes and parsed value →
      valid/invalid, with **every source-only form as a rejection**
- [x] **One SemVer corpus, two expectations per case** — `grammarValid` and
      `submissionProfileValid` (§4.2), including the `…991`/`…992` boundary, the
      two large prerelease identifiers that compare equal, and latest-ordering
- [x] Reserved-id negative corpus, shared by reader, scaffolder, schema, and
      (later) Store and host
- [x] Lone, reversed, and split-surrogate fixtures for property names and string
      values (§3.2)

### Verification (Phase 2)

- [x] Every generated fixture validates against the schema **and** the predicates
      resolved **from the packed tarball**, not from the workspace
- [x] `npm pack -w @cytoscape-web/app-runtime --dry-run` lists both artifacts
- [x] A CI check fails when a ledger `$id` changes digest
- [x] Both corpora run independently and neither imports the other's helpers —
      46 source cases, 39 wire cases, 22 SemVer cases, 14 reserved ids
- [x] The scaffolder's SemVer regex and the runtime reader's now agree on
      `grammarValid` for every corpus case — the scaffolder's was looser and
      accepted `1.0.0-01`, which scaffolded and then failed its own first build.
      It also gained the reserved-id list, and a test fails if either copy drifts
      from the artifact

---

## Phase 3: Move the verifier core out of `cli/` ✅ **COMPLETE**

_Design: §6.2_

### Deliverables

- [x] `verifyApp()` moved to a neutral module; `src/cli/verify.ts` becomes a thin
      wrapper. **The core performs no package reads at all**
- [x] Its input is an aggregate: app metadata and peer-derived expectations from
      **one** snapshot, the expected exposes, and the **absolute resolved**
      `distDir`. **The configured share block, remote and runtime plugins are
      deliberately NOT inputs** — they are read from `mf-manifest.json`, because
      accepting them from the caller would compare a build's configuration
      against itself, which is what "verifies on payload, not on config" exists
      to prevent. Design §6.2 was corrected to match
- [x] The Vite plugin passes the package snapshot it already holds — wiring that
      into `closeBundle` is Phase 4's step 2
- [x] The standalone CLI is documented as validating **what is observable from
      the artifact** — `configuredShared`, `configuredRemote`,
      `configuredRuntimePlugins` are embedded in `mf-manifest.json` through
      `manifest.additionalData` for exactly this reason. It does not claim to
      have captured a build configuration it never saw
- [x] Malformed `mf-manifest.json` is a **structured failure**, not an uncaught
      exception: invalid JSON, `null`, arrays, wrong shapes

### Verification (Phase 3)

- [x] `cyweb-app verify` reports the **same check counts** as the Phase 0
      baseline for all five apps — 29/18/28/28/28, unchanged
- [x] Malformed-artifact fixtures produce: empty stdout, a bounded stderr
      diagnostic, exit 1, **no stack trace**
- [x] The neutral core has no import from `src/cli/`

---

## Phase 4: The packaging pipeline ✅ **COMPLETE**

_Design: §3.4, §6.3_

### Deliverables — ordering and lifecycle

- [x] `buildStart` invalidates **this run's computed final path** only. Stated
      and tested as: *no stale or partial ZIP exists at the final path this run
      computed after a failure following `buildStart`*
- [x] `closeBundle` runs the verifier with the Phase 3 aggregate input and fails
      packaging on any failure
- [x] The build-machine-path note is **escalated to a prominent warning** — a
      developer ZIP is the workstation case that note warns about

### Deliverables — the walker and the classifier

- [x] `lstat` every entry; accept only regular files and directories; resolve
      real paths and require containment under the real `dist`. Symlinked files,
      symlinked directories, broken links, FIFOs, and sockets are **rejected**
- [x] **Denies before allows**, by the named classes (§6.3):
  - [x] exact root `remoteEntry.ssr.js`
  - [x] prefixes `assets/ssrEntryLoader-`, `assets/module-runner-`,
        `assets/virtual_mf-exposes-ssr`
  - [x] exact `mf-manifest.json`, `mf-stats.json`
  - [x] `.vite/` by prefix
  - [x] `.html`, `.htm`, `.map` by **suffix, anywhere in the tree**
- [x] Allow the exact root `remoteEntry.js`; reject a pre-existing
      `dist/cy-manifest.json`; then the closed, case-sensitive extension list;
      unmatched is fatal
- [x] **OS-independent member semantics** (§3.4): relative POSIX names using `/`;
      absolute, drive-prefixed, backslash, empty, `.` and `..` segments rejected;
      **no implicit directory members**; sorted by unsigned UTF-8 byte order
- [x] Temp file created **beside the destination**, renamed on success, removed
      on failure

### Deliverables — surface

- [x] `zipForAppStore(appId, version)` **removed from `./vite`** and made
      internal — the one breaking change in 0.4.0, recorded in the release notes

### Verification (Phase 4)

- [x] Archive integration tests (there are none today — the existing test covers
      option resolution and never invokes the packager):
  - [x] exactly one root `cy-manifest.json` and one root `remoteEntry.js`
  - [x] every deny class rejected **with an allowed near-neighbour present**,
        including a hashed SSR asset, `assets/nested/page.html`, and
        `assets/chunk.js.map`
  - [x] unmatched extension fatal; pre-existing `dist/cy-manifest.json` fatal
  - [x] FIFO, socket, symlinked file, symlinked directory, broken link, and
        realpath escape all rejected
  - [x] member names, absent directory entries, and sort order are one named
        rule — adm-zip's own default is
        `entryName.toLowerCase().localeCompare(…)`, which depends on the host's
        ICU data, so its sorting is turned OFF and `compareMemberNames` decides.
        The Windows leg of the matrix lands in Phase 6
  - [x] one fixture per supported asset class
  - [x] CLI output byte-equal to the embedded copy — 429 bytes either way for
        `hello-world`, asserted with `Buffer.compare`
  - [x] a failure after `buildStart` leaves nothing at this run's final path,
        while a **version-bump fixture** shows the previous archive surviving
  - [x] a failed write removes its temp file
- [x] **Snapshot mutation**: after the Vite configuration is captured, mutating
      `id`, `version`, submission metadata, and `peerDependencies` changes
      neither the container identity, the ZIP filename, the embedded manifest
      bytes, nor the verifier's expectations
- [x] An archive built from a maintained example carries a manifest matching its
      `package.json` — verified with `CYWEB_APP_ZIP=1 npm run build -w
      @cytoscape-web/hello-world`; the `build:zip` script itself is Phase 6
- [ ] **The current Store still accepts the archive** — **owner: maintainer**.
      The Phase 0 baseline submission repeated with the new member present, to
      confirm the extra file changes nothing about today's ingestion

---

## Phase 5: `cyweb-app manifest` ✅ **COMPLETE**

_Design: §6.4_

### Deliverables

- [x] `manifest` subcommand: stdout is JSON and nothing else; **stdout is empty
      when `--out` is used**; every diagnostic and readiness warning goes to
      stderr
- [x] Paths: `--root`, `--out`, and an **explicit** `--dist` are cwd-relative;
      `--dist` defaults to `<root>/dist` — the existing asymmetry, now named
- [x] `--out` is **deliberately unrestricted**, with `--force` as the explicit
      overwrite capability. The two protected basenames are **removed**: partial
      protection described as containment is worse than none
- [x] Refuse an existing destination without `--force`; refuse a symlink
      destination or symlinked ancestor; never create parent directories; temp
      file **beside the destination** (`EXDEV`)
- [x] Grammar: singleton flags 0-or-1; only `verify --expect-expose` repeats; a
      value token may not begin with `--`; `--force` without `--out` is a usage
      error; `-h`/`-v` **preserved**, taking precedence and rejecting extra
      arguments
- [x] Exit codes: **2** usage, **1** invalid metadata or refused write, **0**
      success
- [x] Parsing through `node:util`'s `parseArgs`, `multiple: true` for
      `--expect-expose`

### Verification (Phase 5)

- [x] **Child-process matrix**, against a **freshly built and packed candidate
      installed in a temporary project** — package-local tests do not build
      `dist/` first, so a stale workspace build must not be what is exercised
  - [x] the resolved executable path or tarball integrity is asserted, not just a
        version string
  - [x] stdout/stderr separation; stdout silence under `--out`
  - [x] every grammar and exit-code case; repeated `--expect-expose`
  - [x] overwrite refusal and `--force`; missing parents; symlink destination and
        symlinked ancestor
  - [x] relative bases for `--root`, `--out`, explicit and default `--dist`
  - [x] malformed `mf-manifest.json` → bounded stderr, exit 1, no stack trace
  - [x] temporary-file cleanup
  - [x] on POSIX. **The Windows leg is Phase 6's CI matrix** — this machine
        cannot run it, and asserting rename semantics that were never executed
        would be worse than naming where they are executed
- [x] `cyweb-app manifest --root <app>` is **byte-identical** to the copy
      embedded by the packager — 429 bytes either way for `hello-world`,
      compared with `Buffer.compare`, which is the point of both calling one
      serializer rather than one builder

---

## Phase 6: Scaffolder, examples, packaged artifacts, and CI

_Design: §6.5_

### Deliverables — generated projects

- [ ] `adm-zip` added to generated `devDependencies` — outside this monorepo the
      hoisted root copy does not exist and `build:zip` fails on a missing
      optional peer
- [ ] Generated `.gitignore` gains `cy-manifest.json`
- [ ] Generated README gains "before you submit": `author`, `repository`,
      `license`, `homepage`, `compatibleHostVersions`
- [ ] **The scaffolder still does not choose a licence** — no `"license": "MIT"`,
      no LICENSE file
- [ ] Preview pin style implemented, and the `SDK_VERSION` test — which accepts
      only `^x.y.z` today — encodes **both** the preview and post-stable rules
- [ ] The scaffolder **warns without failing** for a grammar-valid version that
      fails the submission profile

### Deliverables — maintained examples

- [ ] All five gain `build:zip` **and direct declarations of `adm-zip` and
      `cross-env`** — neither is declared by any of them today, and the root
      provides `adm-zip` but not `cross-env`, so adding only the script would
      ship a documented command that does not run

### Deliverables — CI

- [ ] **npm *and* pnpm matrix** over every template: install both packed packages
      outside the workspace, scaffold, build, `verify`, `build:zip`, inspect the
      embedded manifest
  - [ ] under pnpm, additionally assert the **runtime plugin resolves inside the
        installed package** — the highest-risk item the parent SDK design already
        names, and already one of its acceptance criteria
- [ ] Pre-publish job **always installs the exact packed candidate**. Today it
      installs the registry SDK whenever the generated range resolves and uses
      the candidate only as a fallback, so an ordinary SDK change can pass while
      exercising previously published code
- [ ] Post-publish smoke **follows the selected `tag` input** — assert
      `dist-tags[tag]` equals the expected version, install through `@${tag}`,
      scaffold, build a ZIP, inspect its manifest. Exercise `next` and `latest`
- [ ] Windows job covers CLI and archive atomic replacement and the member-name
      sequence

### Deliverables — documentation

- [ ] `guides/getting-started.md` §5b — **correct the claim that `npm run build`
      writes the zip**, untrue since the zip became opt-in; document
      `cy-manifest.json` and the readiness warnings
- [ ] `packages/app-runtime/README.md` — the `manifest` subcommand, the shipped
      artifacts, the warning behaviour
- [ ] `CLAUDE.md` §3 and the project-template README — the packaging command and
      the new archive contents
- [ ] [`phase6-release-runbook.md`](phase6-release-runbook.md) — the 0.4.0
      propagation and the new archive/CLI checks

### Verification (Phase 6)

- [ ] `npm run typecheck --workspaces` and `npm run test --workspaces` pass
- [ ] Every maintained example runs `build:zip` and yields a valid archive
- [ ] A standalone scaffold under **both** npm and pnpm builds a ZIP whose
      manifest is correct
- [ ] A grammar-valid, profile-invalid scaffold: stderr warning, **exit 0**,
      files generated, ordinary build succeeds, `build:zip` fails **leaving no
      archive**

---

## Phase 7: Developer Preview release

_Design: §9_

### Deliverables

- [ ] One change set moves, together: `packages/app-runtime`,
      `packages/create-cytoscape-app` and the `SDK_VERSION` it writes, all five
      examples, the lockfile and generated snapshots, and every document in
      Phase 6 — a `0.x` caret range does **not** cross a minor bump, so a partial
      bump silently leaves projects on the old SDK
- [ ] Publish `0.4.0-next.N` under `next`, with the **preview** schema and
      predicate identities
- [ ] Release notes record the one breaking change (`zipForAppStore` removed from
      `./vite`) and the Preview status
- [ ] The §12 handshake is **open with the App Store team**, and the stable
      identity is explicitly *not* issued

### Verification (Phase 7)

- [ ] The published preview installs from `next` and scaffolds a project that
      builds a valid submission ZIP
- [ ] The ledger contains the preview identities and their digests, taken from
      the published tarball
- [ ] No document claims `formatVersion: 1` is stable

---

## Gate 2 — Store adoption *(cross-repository; not this repo's deliverables)*

_Design: §8.2, §11.1–§11.11, §11.13–§11.14_

**Issue #8 closes here.** "Verified" means the complete boundary, not "a manifest
was parsed and a release row was created". A weaker, independently implementable
state must not close it.

- [ ] **[store]** `cy-manifest.id` is the canonical application id end to end; no
      production path derives an id from the display name; the reserved list is
      enforced; ids are immutable across versions and owned by a publisher
- [ ] **[store]** Raw-byte validation precedes schema validation: size from both
      ZIP metadata and streamed bytes, strict UTF-8, BOM rejected, duplicate
      member names rejected, trailing data rejected, nesting bounded,
      `formatVersion` checked first, then the post-parse Unicode scalar check
- [ ] **[store]** Canonical wire validated against the pinned schema **and**
      predicate artifact, by `$id` and digest — and **never renormalized**
- [ ] **[store]** Unknown properties inert and audit-warned; **the submitted
      manifest is never republished**; any public manifest is a generated
      known-field-only projection
- [ ] **[store]** Ingestion state machine: quarantine → bounded validation → fresh
      safe extraction → disposable deny-by-default browser verification → review →
      **create-only** atomic publication. No unreviewed artifact gets a public URL,
      and publication never deletes a live object before writing its replacement
- [ ] **[store]** Exact identity: `AppConfig.default.id === cy-manifest.id` and
      `AppConfig.default.version === cy-manifest.version`, as exact canonical
      strings, against the real host share scope; `cy-manifest.name` is
      authoritative and a reviewer title is separate listing metadata
- [ ] **[store]** Two pinned endpoints and no others, or a same-origin identity
      verifier **plus** a separate staged-CDN cross-origin suite
- [ ] **[store]** Immutable versioned URLs from a cookie-less artifact origin, no
      redirects, the full response matrix browser-tested
- [ ] **[store]** Versioned publication profile published and owned, requiring a
      public author display name and an HTTPS `homepage`
- [ ] **[host]** Default-catalog origin exemption closed; production projection
      rejects non-production origins; a staging URL in a production catalog fails
      at install, activation, reactivation, and startup
- [ ] **[host]** Catalog handoff deployed — generated global catalog, exact
      origins, the selected proxy or rebuild, updated allowlists,
      production-equivalent E2E
- [ ] **[host]** Compatibility enforced before **every** activation and startup
      path, with the pinned `node-semver` version and prerelease policy — or
      §10's structural omission applies
- [ ] **[store]/[host]** Revocation policy and two-path (ZIP vs GitHub build)
      authority resolved — part of this gate, not follow-up work
- [ ] All five §12 handshake items closed → **stable schema and predicate
      identities issued, `formatVersion: 1` frozen, `0.4.0` promoted**

---

## Gate 3 — Public self-service launch *(decided: not yet)*

_Design: §2, §8.3, §11.12_

v1 **selects curated-only publication**. This gate stays closed until a real
boundary exists; CSP is defence in depth and **never** satisfies it.

- [ ] **[host]** One model built: capability-bounded per-app APIs replacing the
      raw store exposes, or execution in an isolated realm behind an explicit
      message boundary
- [ ] **[host]** Tests prove a remote cannot obtain credentials or raw stores
      unless deliberately authorized
- [ ] **[host]** A boundary for **deferred executable requests** — lazy
      `import()`, computed executable URLs, workers — none of which pass through
      the install-time origin gate
- [ ] **[host]** Id-indexed structures migrated to `Map` or null-prototype
      records
- [ ] **[host]** CSP from report-only to enforced with privacy-filtered reporting
      retained

---

## Final Verification (Gate 1)

### Build & test

- [ ] `npm run typecheck --workspaces` passes
- [ ] `npm run test --workspaces --if-present` passes, with a non-zero test count
      in every package
- [ ] `npm run build --workspaces` succeeds
- [ ] `cyweb-app verify` passes for all five apps at the Phase 0 baseline counts
- [ ] `npm run verify:federation` passes
- [ ] Both corpora, the SemVer corpus, and the reserved-id corpus pass in CI

### Contract

- [ ] Every produced archive has exactly one root `cy-manifest.json` and one root
      `remoteEntry.js`, and contains no `index.html`, `.map`, `mf-*.json`, or SSR
      artifact
- [ ] CLI and ZIP manifests are byte-identical for every maintained example
- [ ] An invalid or over-limit submission-only value never affects `vite dev` or
      `vite build`
- [ ] Schema and predicates resolve from the packed tarball, and no ledger `$id`
      has changed digest
- [ ] `zipForAppStore` is no longer exported; `readAppMeta` still is
- [ ] The current Store accepts an archive containing the new member

### Deferred, deliberately

- [ ] **Sanitized `mf-manifest.json` in the archive** — it embeds absolute build
      paths, and a sanitized copy would still be self-reported. The Store's check
      is execution (§11.8)
- [ ] **Reproducible archive digests** (timestamp and mode normalization) — until
      the Store states it compares hashes across rebuilds. Member order and naming
      are already deterministic (§3.4)
- [ ] **`cyweb-app package`** — a wrapper that invalidates the target before Vite
      starts and drives the build, extending the stale guarantee past config
      evaluation and removing `cross-env` from every consumer (§13.4)
- [ ] **`icon`, `category`, `dependencies`** — each needs a Store vocabulary or
      activation semantics that do not exist; under the frozen envelope, adding
      one later costs a `formatVersion` (§13.4)
- [ ] **A trusted `schemaRevision` with consumer negotiation** — declined for v1
      in favour of the freeze; the natural design for a `formatVersion: 2` that
      needs same-major evolution (§13.4)
- [ ] **Store-side ingestion, CDN, and host enforcement** — Gates 2 and 3

### Known non-issues

- [ ] `remoteEntry.js` embeds absolute build-machine paths on a **correct** build
      — the MF SSR loader emits them as dead literals. Packaging warns; it does
      not fail. Prefer a Store-owned build for a public release
- [ ] `network-statistics` reports fewer verify checks than the others. It shares
      nothing, so the per-package share assertions have nothing to assert
- [ ] An unmatched extension failing the build is **deliberate**. Widening the
      allowlist is additive and safe; discovering a new class in a public upload
      is not
