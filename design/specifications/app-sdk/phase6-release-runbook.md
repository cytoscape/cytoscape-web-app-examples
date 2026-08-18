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

## 3. Two decisions to make before publishing

### 3.1 Provenance requires CI — a manual publish cannot produce it

npm provenance needs `--provenance` from a supported CI with `id-token: write`.
Publishing from a workstation cannot generate it, so the checklist's provenance
item cannot be ticked by this runbook.

| Option | Consequence |
| --- | --- |
| **Publish by hand now** | No provenance on `0.1.0`. Defensible for a Preview; note it in the checklist rather than ticking the item |
| **Build a release workflow first** | Provenance from the start, and the protected-environment requirement is satisfied. Costs a workflow and an npm automation token in repository secrets |

Either is reasonable. Do not tick the item under the first.

### 3.2 "Pin the examples to the published versions" needs reinterpreting

The checklist says to move the examples off workspace links. Taken literally it
makes development worse for no added assurance: npm workspaces prefer the local
package whenever the version satisfies the range, so un-linking means either
removing `packages/*` from `workspaces` or pinning to versions that deliberately
do not match — and every subsequent SDK change stops reaching the apps until it
is published.

The property the item is reaching for — *what we publish works, not just what we
link* — is already proved by the CI scaffold job, which installs both packages
**from packed tarballs into a directory outside the repository**.

Recommended: keep the workspace links, and record the reinterpretation in the
checklist rather than silently skipping it.

---

## 4. Pre-flight

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

## 5. Publish

Log in first; `npm whoami` should print the account that owns the
`@cytoscape-web` scope. Have your 2FA device ready — npm will ask for an OTP.

**Order matters only for tidiness**: the scaffolder does not depend on the SDK,
but publishing the SDK first means the first project anyone scaffolds installs
cleanly.

```bash
npm publish -w @cytoscape-web/app-runtime --tag next
npm publish -w create-cytoscape-app --tag next
```

If you chose §3.1's second option, add `--provenance` and run it from the release
workflow instead.

- [ ] Both publishes reported success

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
- [ ] Mark Phase 6 complete in the checklist, recording the §3.1 provenance
      decision and the §3.2 reinterpretation rather than ticking them silently
- [ ] Leave the `latest` gate item **unticked**. It closes when Theme G does, not
      when this runbook ends
