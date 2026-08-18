# Phase 6 Runbook — Developer Preview release

> Manual procedure for publishing `@cytoscape-web/app-runtime` and
> `create-cytoscape-app`. Run top to bottom; each step says what to check before
> moving on.
>
> Checklist: [app-sdk-checklist.md](app-sdk-checklist.md) Phase 6.
> Design: [app-sdk-design.md](app-sdk-design.md) §3 (why Preview, not GA).

## What this publishes, and what it does not

Two packages at `0.1.0`, under the **`next`** dist-tag only.

`latest` stays unpublished until the host-side security work lands (roadmap
Theme G). That is not paperwork: an installed app runs in the host's own origin
with no sandbox and can import `cyweb/CredentialStore`. Publishing the tooling
under `latest` makes authoring apps maximally discoverable while that is still
true.

**Read the consequence before you start** — see §2.

---

## 1. Blockers — fixed 2026-08-17

Four things would have stopped or spoiled a publish. All four are done; they are
recorded here because each is the kind of defect that is invisible from the
machine that made it.

- [x] **Neither package had a README.** `files` listed one in both and neither
      existed, so npm would have published a package with no front page — and the
      trust-boundary statement design §3 requires had nowhere to live. Both are
      written, and both now appear in `npm pack --dry-run`
- [x] **`@cytoscape-web/app-runtime` had no `publishConfig.access`.** A scoped
      package defaults to **restricted**: the publish either fails or succeeds
      privately, and privately looks identical from the machine that ran it.
      `{ "access": "public" }` added. `create-cytoscape-app` is unscoped and
      needs nothing — its dry-run correctly shows no `access` line
- [x] **`app-runtime` had no `prepack`.** `npm publish` does not run `build`, so
      publishing from a clean clone would have shipped whatever was in `dist/` —
      stale, or nothing. It only worked during development because a build had
      just run
- [x] **Nothing stated the trust boundary in a generated project.** It is now in
      the template `AGENTS.md` ("Trust boundary — say this out loud before you
      publish") and in the generated `README.md` ("Before you ask anyone to
      install this"), both verified in a freshly scaffolded app

Both dry-runs pass: `app-runtime` 29 files, `create-cytoscape-app` 57.

## 2. Withholding `latest` breaks the bare `npm create` — on purpose

**Verified, not assumed.** `npm init <spec>` is `npx create-<spec>`, and a bare
spec resolves to the `latest` dist-tag; asking for a tag that does not exist
gives `E404 No match found for version <tag>`.

So after this release:

```bash
npm create cytoscape-app my-app          # E404 — no latest tag
npm create cytoscape-app@next my-app     # works
```

This is the release gate doing its job, and every document that mentions the
command has to say `@next`. Do not add a `latest` tag to make the short form
work — that is the thing being withheld.

**Generated projects are unaffected.** They depend on
`"@cytoscape-web/app-runtime": "^0.1.0"`, and a semver range resolves against all
published versions regardless of dist-tags. Only a bare `npm install <pkg>` reads
`latest`.

---

## 3. Two decisions — taken 2026-08-17

### 3.1 Provenance: **release from CI.** `.github/workflows/release-packages.yml`

Not a manual publish. The deciding argument is that
`@cytoscape-web/app-runtime` is a **Vite plugin**: it runs as code on every app
author's build machine, so a compromised release rewrites the output of every app
built with it. That is a higher-value target than a runtime library, and this
repository — whose subject is what an installed app is trusted with — should not
ship its own tooling from an unattested source.

Three supporting reasons:

- Provenance needs `id-token: write` from a supported CI. A workstation publish
  **cannot** produce it, so the choice is not "now versus later" but "ever versus
  never for this version".
- Bus factor is 1. "Add it at 0.1.1" is technically possible — provenance is
  per-version — but a thing not done under no pressure is not done under pressure.
- A workflow is written once and serves every release. The manual path is paid
  again each time, OTP and all.

The workflow also **refuses `latest` outright**, as its first step. A dist-tag
input is the single easiest way to bypass the release gate by accident; removing
that check is now a visible diff.

**One-time setup in repository settings, before the first run:**

1. An environment named **`release`** with required reviewers — this is the
   "protected release environment", and what stops a dispatch from publishing
   without a human.
2. Either npm **Trusted Publishing** for both packages (preferred: OIDC, so no
   long-lived token exists to leak) or an npm automation token as `NPM_TOKEN` in
   that environment. With trusted publishing, delete the `NODE_AUTH_TOKEN` lines.
3. The repository must be public for provenance to be attestable. It is.

### 3.2 "Pin the examples to the published versions": **reinterpreted, not done**

Kept as workspace links. Taken literally the item does not work and costs real
development speed: npm workspaces prefer the local package whenever the version
satisfies the range, so un-linking means removing `packages/*` from `workspaces`
or pinning versions that deliberately do not match — after which **no SDK change
reaches the apps until it is published**, and development becomes publish-driven.
On a one-maintainer project that is a standing tax.

The property the item reaches for — *what we publish works, not just what we
link* — is already proved, by the CI scaffold job, which installs both packages
**from packed tarballs into a directory outside this repository** and then
builds, verifies, typechecks and tests the result.

Coverage was checked rather than assumed. The public surface is two subpaths, and
a scaffolded app exercises both: `defineCyWebApp` from `./vite`, the
`virtual:cyweb-app-meta` declarations from `./meta`, `readAppMeta` and
`buildInstallManifest` in its smoke test, and the `bin` through
`npx cyweb-app verify`. A missing `files` entry fails there.

**What would change this:** an example app using a public API that no scaffolded
app touches. The cheap answer then is to add one example to the tarball job — not
to un-link the repository.

---

## 4. Pre-flight

The workflow runs all of this itself. Doing it locally first is still worth the
two minutes: a failure here costs a rerun, a failure inside the release job costs
an approval too.

```bash
cd cytoscape-web-app-examples
git status --short          # expect a clean tree
npm ci
npm run build
npm run verify:federation   # 29 / 18 / 28 / 28 / 28
npm run typecheck --workspaces
npm test
```

- [ ] All green
- [ ] You are on the branch you intend to release from, and it is pushed

`npm audit` reports high-severity advisories, and that is **expected**. They come
from the pinned build toolchain — `vite@8.0.13` and `@module-federation/vite@1.16.8`,
matched to the host on purpose — and none reaches a published app or an end user.
Fixing them means moving both repositories together; see roadmap **F-1**. Do not
run `npm audit fix --force` here: it jumps the federation plugin four minors,
outside the stated range, and that is exactly the host/app divergence P-1 exists
to catch.

- [ ] The advisory list matches F-1 — `adm-zip`, `undici`, `vite`. Anything else
      is new and worth reading before you publish

Confirm what each tarball actually contains — this is the last chance to notice a
missing file, and `files` is an allowlist:

```bash
npm pack -w @cytoscape-web/app-runtime --dry-run
npm pack -w create-cytoscape-app --dry-run
```

- [ ] `app-runtime`: `dist/vite/*`, `dist/meta/*` (including `virtual.d.ts`),
      `dist/runtime/mfRuntimePlugin.js`, `dist/cli/*`, `README.md`
- [ ] `create-cytoscape-app`: `dist/*`, **`templates/` for all five variants**,
      `README.md`
- [ ] Neither contains `src/`, `node_modules/`, or a `.tgz`

Then rehearse the whole publish without publishing:

```bash
npm publish -w @cytoscape-web/app-runtime --tag next --dry-run
npm publish -w create-cytoscape-app --tag next --dry-run
```

---

## 5. Publish — from the workflow

**Actions → Release packages → Run workflow.**

| Input | Value |
| --- | --- |
| `tag` | `next` — `latest` is refused by the workflow's first step |
| `dry_run` | **`true` first.** Then `false` |

Run it once with `dry_run: true`. That exercises the whole path — the build, the
full verification battery, the tarball listings and `npm publish --dry-run` for
both packages — without touching the registry. Read the tarball listings against
§4's checklist before the real run.

Then run it again with `dry_run: false`. The `release` environment will ask for
approval; the workflow publishes the SDK first, so the first project anyone
scaffolds installs cleanly rather than racing the registry.

- [ ] Dry run green, and the tarball listings match §4
- [ ] Real run green, and its final step reports `next` with no `latest`

The workflow runs the same checks as §4 rather than trusting they were run. A
release is exactly the moment someone skips a check because they ran it an hour
ago.

---

## 6. Verify the published artifacts

```bash
npm view @cytoscape-web/app-runtime dist-tags
npm view create-cytoscape-app dist-tags
```

- [ ] Each shows **`next: 0.1.0`** and **no `latest`**. A `latest` here means the
      gate was bypassed — see §7

```bash
npm view @cytoscape-web/app-runtime files 2>/dev/null || npm pack @cytoscape-web/app-runtime@next --dry-run
```

- [ ] The published file list matches what §4 showed

Now the real test, on a machine that has never built this repository, or at least
in a directory with no link to it:

```bash
cd "$(mktemp -d)"
npm create cytoscape-app@next my-app -- --yes --id myApp --port 6001
cd my-app
npm run build
npx cyweb-app verify
npm test
```

- [ ] Scaffolded, installed **with no tarball override**, built
- [ ] `cyweb-app verify` passes (27 checks for a React template)
- [ ] `npm test` passes
- [ ] `npm run dev` prints the `?installApp=` link, and opening it against a local
      host installs the app

That last one is the end-to-end claim this whole project makes. Do it once.

---

## 7. If something is wrong

- **Published to the wrong tag.** `npm dist-tag rm <pkg> latest` removes it. Do
  this immediately — the window where a `latest` exists is the window where
  someone installs it.
- **Broken artifact.** Publish a patched `0.1.1` under `next`; then
  `npm deprecate '<pkg>@0.1.0' 'Broken — use 0.1.1'`. Prefer this to unpublishing.
- **Unpublish** is possible within 72 hours (`npm unpublish <pkg>@0.1.0`) and
  should be a last resort: the name-and-version is then burned and cannot be
  reused.

---

## 8. After publishing

- [ ] Update the docs that still say `cp -r project-template` to lead with
      `npm create cytoscape-app@next` — root `README.md`,
      `guides/getting-started.md`, `project-template/README.md`. Keep the copy
      route documented as the fallback; the `@next` form is unusual enough to
      confuse someone who mistypes it
- [ ] **Delete the pre-publication workaround in CI.** The scaffold job rewrites
      the generated `@cytoscape-web/app-runtime` dependency to a packed tarball
      because the package did not exist. It does now, and a plain `npm install`
      is the thing worth testing from here on. The step is commented to say so
- [ ] Mark Phase 6 complete in the checklist. §3.1 and §3.2 are already recorded
      there; tick the provenance item only if the run actually produced it —
      `npm view <pkg> --json` should carry a `dist.attestations` entry
- [ ] Leave the `latest` gate item **unticked**. It closes when Theme G does, not
      when this runbook ends
