# Phase 6 Runbook — Developer Preview release

> Manual procedure for publishing `@cytoscape-web/app-runtime` and
> `create-cytoscape-app`. Run top to bottom; each step says what to check before
> moving on.
>
> Checklist: [app-sdk-checklist.md](app-sdk-checklist.md) Phase 6.
> Design: [app-sdk-design.md](app-sdk-design.md) §3 (why Preview, not GA).

## What this publishes, and what it does not

Two packages at `0.1.0`, under the **`next`** dist-tag only.

Every published version also carries an npm **deprecation notice** naming the
Preview status and the trust boundary. That notice is the release gate, and it
stays until the host-side security work lands (roadmap Theme G). This is not
paperwork: an installed app runs in the host's own origin with no sandbox and can
import `cyweb/CredentialStore`.

**§2 corrects an earlier mistake in this runbook — read it before you start.**

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

## 2. `latest` cannot be withheld — corrected 2026-08-18

**An earlier revision of this runbook was wrong, and the error shipped.** It said
that publishing under `next` only would leave no `latest` tag, so the bare
`npm create cytoscape-app` would 404 and everyone would have to type `@next`.

Neither half holds:

- npm assigns `latest` to a **brand-new package's first version** whatever
  `--tag` says. `@cytoscape-web/app-runtime@0.1.0` went out with `{"next":
  "0.1.0", "latest": "0.1.0"}`.
- The registry **refuses to delete** `latest`: `DELETE …/dist-tags/latest`
  returns `400` after a successful authentication. The npm CLI documentation
  does not mention the restriction.

How the mistake was made, since it is the reusable part: the reasoning verified
that *resolving a tag that does not exist* fails (`npm view pkg@beta` → E404) and
then assumed the premise — that `latest` could be absent — without testing it.
A check of the conclusion is not a check of the premise.

### What actually gates the release

**A deprecation notice on every published version.** Applied automatically by the
release workflow:

```
Developer Preview (0.x). Cytoscape Web apps run with the host's full privileges
- no sandbox, no signature verification. Not for production use: <repo>
```

This is arguably stronger than the tag ever was. Almost nobody notices a missing
dist-tag; npm prints a deprecation on **every install**, to the person installing
it, at the moment they do.

**And `--tag next` still buys something real:** publishing with it leaves
`latest` pointing where it already pointed, so a later Preview cannot silently
become the default install. The workflow refuses a `tag: latest` dispatch for
that reason.

`npm create cytoscape-app` will therefore work without `@next` once
`create-cytoscape-app` is published. Documentation that says otherwise is wrong.

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

#### Trusted publishing has a bootstrap problem — read this before setting it up

npm configures a trusted publisher **on a package's settings page**, which only
exists once the package has been published. npm's documentation does not cover
the brand-new-package case at all; it goes straight to "navigate to your package
settings on npmjs.com". Neither of ours exists yet.

So the first release cannot use OIDC, and the order is:

**Step 1 — publish `0.1.0` with a token, from the workflow.**

Create a **granular access token** on npmjs.com — Access Tokens → Generate New
Token → **Granular Access Token**.

| Field | Value | Why |
| --- | --- | --- |
| **Expiration** | **7 days** (custom; npm's minimum is 1 day) | It is deleted in step 3 within the hour. The expiry is a backstop for the case where step 3 is forgotten, not the plan |
| **Packages and scopes** → permission | **Read and write** | Publishing needs write. Read-only cannot publish |
| **Packages and scopes** → selection | Try **Only select packages and scopes** → the `@cytoscape-web` scope first. Fall back to **All Packages** only if the publish is refused | See the note below — this is the one field where npm's behaviour is not documented |
| **Organizations** | **No access** | npm's own documentation says this permission "does not give the token the right to publish packages managed by the organization". It grants settings and team management and nothing this release needs |
| **IP allowlist** | **Leave empty** | GitHub-hosted runners have dynamic egress IPs. An allowlist here fails the publish, and the error will not obviously point at this field |
| **Bypass 2FA** | **Enabled** | Otherwise npm asks for an OTP and there is nobody at the keyboard. This is the setting that makes a token usable from CI at all |

**The one undocumented field.** npm's documentation does not say whether selecting
a *scope* grants permission to publish a package that does not exist in it yet,
and both of ours are new. `create-cytoscape-app` is also unscoped, so it cannot
be picked from a list of packages that do not exist.

Start narrow anyway. A refusal costs one failed job and publishes nothing — a
403 is a clean failure — whereas starting at "All Packages" grants more than
needed and you will never find out whether you had to. If it is refused, widen
to **All Packages** for this one run.

> An alternative exists and is not recommended: publish `create-cytoscape-app`
> once from a workstation with your normal login and OTP, purely to create the
> name, so a scope-limited token covers the rest. It trades a broad token that
> lives for minutes against a manual, unattested release of one package. The
> token is the smaller exposure, and it is the one you can delete.

Put the token in the `release` environment as `NPM_TOKEN` and run the workflow.
This release still gets provenance, still runs behind the protected environment,
and still comes from CI — only the credential is a token rather than OIDC.

**Step 2 — configure the trusted publisher on both packages.** Now that they
exist: package settings → **Trusted Publisher** → GitHub Actions.

| Field | Value |
| --- | --- |
| Organization or user | `cytoscape` |
| Repository | `cytoscape-web-app-examples` |
| Workflow filename | `release-packages.yml` — **the filename only**, not a path |
| Environment | `release` — optional, but set it: it binds the trust to the reviewed environment rather than to any run of that workflow |
| Allowed actions | `npm publish` |

**Step 3 — delete the token.** From the npm account AND from the `release`
environment secrets, and remove the two `NODE_AUTH_TOKEN` lines from the
workflow. Do all three: a revoked token still in a secret store is confusing
later, and a live token nobody references is worse. From `0.1.1` onward there is
no long-lived credential to leak, which is the point of doing this at all.

> **Done 2026-08-18** for both packages. Note what could NOT be verified first:
> a dry run never contacts the registry, so it never authenticates, and OIDC is
> therefore unproven until the next real publish. Deleting the token anyway is
> the right trade — a failed release is recoverable by making a new token, while
> a live All-Packages credential is a standing risk.
>
> **If the next release fails with a 401**, the likely cause is `setup-node`'s
> `registry-url`, which writes `_authToken=${NODE_AUTH_TOKEN}` into `.npmrc`.
> With that variable gone it writes an empty token, and npm may read that as
> "credentials present but wrong" instead of falling back to OIDC. Dropping
> `registry-url` is the first thing to try.

> With trusted publishing, npm generates provenance **automatically** — the
> `--provenance` flag becomes redundant. It is harmless to leave, and it is what
> makes step 1's token-based publish attested, so leave it.

**Requirements, already met here:** npm ≥ 11.5.1 and Node ≥ 22.14 for the OIDC
exchange. This machine has npm 11.19.0 and Node 24.13.1.

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

> **A dry run cannot catch everything, and one class in particular.** Provenance
> is validated by the REGISTRY, against `package.json`'s `repository` field —
> and `npm publish --dry-run` never contacts the registry. The first `0.1.0`
> attempt passed every local check and both dry runs, then failed with
> `422 … "repository.url" is "", expected to match …` after an approval had
> already been spent. The workflow now checks that field before uploading
> anything, but the general point stands: a green dry run is not a green publish.

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
- [ ] Real run green, and its final step reports the deprecation notice applied to every published version

The workflow runs the same checks as §4 rather than trusting they were run. A
release is exactly the moment someone skips a check because they ran it an hour
ago.

---

## 6. Verify the published artifacts

```bash
npm view @cytoscape-web/app-runtime dist-tags
npm view create-cytoscape-app dist-tags
```

- [ ] Each shows **`next: 0.1.0`**. A `latest` is expected on a first publish and
      cannot be removed (§2); what matters is that it was not MOVED by this run
- [ ] Each published version is **deprecated** with the Preview notice — that is
      the gate. The workflow applies and verifies it; confirm with
      `npm view <pkg>@<version> deprecated`

```bash
npm view @cytoscape-web/app-runtime files 2>/dev/null || npm pack @cytoscape-web/app-runtime@next --dry-run
```

- [ ] The published file list matches what §4 showed

Now the real test, on a machine that has never built this repository, or at least
in a directory with no link to it:

```bash
cd "$(mktemp -d)"
npm create cytoscape-app my-app -- --yes --id myApp --port 6001
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

- **Published to the wrong tag.** `npm dist-tag add <pkg>@<version> <tag>` moves
  a tag. `latest` cannot be removed at all (§2) — if it moved somewhere wrong,
  move it back by pointing it at the version it should name.
- **Broken artifact.** Publish a patched `0.1.1` under `next`; then
  `npm deprecate '<pkg>@0.1.0' 'Broken — use 0.1.1'`. Prefer this to unpublishing.
- **Unpublish** is possible within 72 hours (`npm unpublish <pkg>@0.1.0`) and
  should be a last resort: the name-and-version is then burned and cannot be
  reused.

---

## 8. After publishing

- [ ] Update the docs that still say `cp -r project-template` to lead with
      `npm create cytoscape-app` — root `README.md`,
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
- [ ] Confirm every published version carries the deprecation notice. That is
      the gate now, and it closes when Theme G does, not when this runbook ends
