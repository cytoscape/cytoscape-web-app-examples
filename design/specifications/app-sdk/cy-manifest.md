# `cy-manifest.json` — App Store Submission Manifest

> Status: **Proposal, revision 6** — incorporates all five rounds of
> [`cy-manifest-review.md`](./cy-manifest-review.md) (§1–16, §17, §18, §19, §20).
> §13 records what was accepted, declined, and deferred, and why.
>
> Answers [cytoscape-web-app-examples#8](https://github.com/cytoscape/cytoscape-web-app-examples/issues/8).
>
> **Scope: the producer side and the wire format.** Store ingestion, CDN publication,
> and host enforcement are stated as requirements on the teams that own them (§11);
> their operational detail belongs in those teams' documents (§13.2).

## 1. Problem

Identity is already declared authoritatively, once, in the app's `package.json`:
`cyweb.id` is simultaneously the Module Federation container name, the exported
`CyApp.id`, and the registry id, and `readAppMeta()`
([`appMeta.ts`](../../../packages/app-runtime/src/vite/appMeta.ts)) validates it on
every build.

The App Store's Web Bundle flow does not see any of it. Its form has **no application
id field at all**: it collects a display name, version, author, description, license,
and tags, then derives an id by stripping non-word characters from the display name and
lowercasing (`My App` → `myapp`). That derived id cannot match `cyweb.id` (`myApp`), and
the host registers the remote under the catalog id, loads `./AppConfig`, and **rejects
an app whose exported `CyApp.id` differs** — so the mismatch surfaces at install time,
in the user's browser, long after review.

The publication metadata around it splits three ways today:

- **collected by the current form**: author, description, license, tags — typed by hand
  at every submission;
- **not collected at all**: repository, homepage, compatibility range — proposed
  enrichment, not a field anyone retypes today;
- **not declared anywhere**: none of the maintained examples put author, license,
  repository, homepage, or keywords in `package.json`, and `readAppMeta()` does not read
  them.

So this change has two halves: carry the identity the bundle already knows, so the Store
can stop deriving it; and give the rest of the publication metadata a declared home,
with an explicit policy for the apps that do not have it yet (§5, failure policy).

## 2. Scope: three layers, three owners

| Layer | Owner | This document |
| --- | --- | --- |
| Submission manifest — artifact identity as the developer declares it | App SDK (this repo) | **specifies and implements** |
| Store release record — provenance, hashes, review state, enrichment | `cytoscape/appstore` | **states requirements** |
| Runtime catalog (`AppCatalogEntry[]`) — what the host consumes | `cytoscape/cytoscape-web` | **unchanged schema; enforcement work required** |

**No current consumer interprets the new member.** That is narrower than "the change is
inert", and the narrower claim is what the evidence supports: the archive's member set
changes, and the packager in §6.3 also changes which build outputs are published at all.
Compatibility with today's Store is proved by a test (§7), not asserted. What does hold
is that nothing reads `cy-manifest.json` until the Store chooses to, so the SDK work in
§6 can precede the Store work in §11 — as a **prerelease**, so no wire contract is frozen
unilaterally (§8, §9, §12).

**Non-goals**

- Changing the host's catalog format (`apps.json`, `?installApp=`).
- Provenance. A manifest generated from developer-controlled data, inside an archive the
  developer can edit afterwards, is metadata — not proof of what `remoteEntry.js`
  contains. `generator` is a **self-reported diagnostic**, never a trust signal.
- A privilege boundary. Remote apps execute in the host's JavaScript context, and the
  host exposes the raw `CredentialStore` — token accessors included — through Module
  Federation. Neither this manifest, nor Store review, nor managed hosting, nor a CSP is
  a sandbox: **an origin in `script-src` authorizes code to run, it does not limit what
  already-running code may read from the host**, and an origin-wide rule cannot confine a
  shared artifact origin to one `{id, version}`. **v1 therefore selects curated-only
  publication**; public self-service is a separate gate with its own decision (§8.3).
- Icons, Store categories, and `dependencies`: out of v1 (§13.4).

## 3. Wire format

One file at the **root of the ZIP**, named `cy-manifest.json`, containing a **single
JSON object** — not an array. A submission bundle describes exactly one app.

```json
{
  "formatVersion": 1,
  "id": "myApp",
  "name": "My App",
  "version": "0.1.0",
  "type": "client",
  "entry": "remoteEntry.js",
  "description": "Colors nodes by degree",
  "author": "Jane Doe",
  "license": "MIT",
  "repository": "https://github.com/example/my-app",
  "repositoryDirectory": "apps/my-app",
  "homepage": "https://example.org/my-app",
  "tags": ["layout", "analysis"],
  "compatibleHostVersions": ">=1.1.0-0",
  "generator": "@cytoscape-web/app-runtime@0.4.0-next.1"
}
```

**There is no `url` field, deliberately.** The Store assigns an immutable
`{id, version}` URL when it hosts the bundle; a guessed or empty `url` would be wrong for
the entire window in which the file is read. `entry` carries what the bundle actually
knows: the federation entry path relative to the ZIP root.

**v1 structural invariants** — enforced by the SDK when it builds the archive, and
required again by the Store on ingestion:

- exactly one root-level `cy-manifest.json`;
- exactly one root-level `remoteEntry.js`, and `entry` names it.

### 3.1 `formatVersion`, schema identity, and the frozen v1 envelope

An instance carries `formatVersion` and nothing else that selects a schema, so multiple
*stable* schema revisions under one `formatVersion` would not be selectable from the
document they validate. Rather than add a trusted `schemaRevision` and a negotiation
protocol to a fifteen-field file, v1 takes the simpler contract:

> **After the first stable v1 schema is issued, its official property set and validation
> envelope are frozen.** Unknown properties remain behaviourally ignored and are **never
> promoted into official v1 fields**. Adding an official field, or changing requiredness,
> enum membership, a pattern, a limit, a predicate, a type, or a field's meaning — **in
> either direction** — requires a new `formatVersion`. Preview schema revisions may change
> freely before the first stable identity is issued.

"Either direction" is the part that is easy to get wrong: tightening a limit rejects
artifacts that were valid when submitted, and widening one lets a new producer emit an
artifact an older Store rejects. Both are breaking, so both take a new `formatVersion`.

The freeze is also what makes ignoring unknown properties safe. Without it, an old
manifest legally containing `"icon": 42` becomes invalid the day v1 defines `icon` as a
string. With it, that name can never acquire official v1 meaning.

**Unknown-property policy, stated exactly.** Any unknown root property is valid and
ignored, whatever its name; the Store records it as an audit warning. **`x-` is a
recommended prefix for third-party extensions, not a requirement** — rejecting a non-`x-`
unknown would contradict the ignore-unknown contract this section rests on. The SDK emits
no unknown property of any kind.

### 3.2 Canonical validity has three parts, and all three are pinned

JSON Schema cannot express several rules this format depends on: email-like and URL-like
author detection, canonical URL serialization, inspection of encoded path components
*before* a URL parser normalizes them, exact trimmed-string acceptance, and SemVer and
range semantics. Finite fixtures cannot define an answer for every input either.

> **Canonical wire validity = strict raw-JSON validation + the pinned JSON Schema + an
> immutable set of named semantic predicates shipped beside the schema and bound to the
> same identity.** The predicate algorithms and exact patterns are **normative**;
> fixtures are conformance examples, not the definition.

The predicate artifact carries its own digest in the same append-only ledger as the
schema, and **changing a predicate after stable issuance requires a new `formatVersion`**
— otherwise it recreates exactly the unselectable same-version validator problem §3.1
exists to solve. The predicates cover, at minimum: the reserved-id list (§4.1), the
email-like and URL-like author tests, repository canonicalization (hostname case and
IDNA, trailing slashes, percent escapes, path-segment grammar, and the case and order of
terminal `.git` removal), `repositoryDirectory` path grammar, the tag equality relation,
the Unicode scalar check below, and the SemVer submission profile of §4.2.

**Unicode scalar validity is a post-parse check, not a byte check.** Strict UTF-8
validation of the raw bytes does not catch escaped lone surrogates: the bytes of
`"\uDEAD"` are plain ASCII, and RFC 8259 §8.2 permits the escape while warning that
consumer behaviour is unpredictable. Every property name and every string value must be a
valid Unicode scalar sequence, checked recursively after parsing, with lone, reversed, and
split-surrogate fixtures.

Schema documents are versioned independently of the wire format:

```text
preview  https://cytoscape.org/cytoscape-web-app-examples/schema/cy-manifest/v1/draft/0.4.0-next.1/schema.json
stable   https://cytoscape.org/cytoscape-web-app-examples/schema/cy-manifest/v1/1.0/schema.json
```

The namespace is the path this repository actually serves through GitHub Pages,
not a shorter one on a domain it does not control. A JSON Schema `$id` is an
identifier and the Store is forbidden from dereferencing it, so it need not
resolve — but claiming a namespace someone else owns would leave the *stable*
identity, which can never change, resting on an unconfirmed assumption.

**One `$id` never names two byte sequences.** The repository keeps an **append-only
`$id` → `sha256:<lowercase-hex>` ledger** covering the schema, the predicate artifact, and
the bundled publication-profile snapshot; CI fails if a published identity's digest
changes. **Every digest is taken over the exact raw bytes extracted from the candidate npm
tarball** — no newline normalization, no transcoding, no JSON canonicalization — because a
digest over "the same content, reformatted" pins nothing.

The schema lives at `packages/app-runtime/schema/`, JSON Schema **draft 2020-12**, is
listed in the package's `files` and reachable through a documented export subpath, and is
validated in CI from the packed tarball. The Store pins the exact `$id` and digest and
never fetches a mutable "latest v1" during ingestion.

**Generated manifests do not emit `$schema`.** The schema is already pinned by identity
and digest, so a pointer inside the artifact buys nothing and adds a determinism decision
to a serializer whose contract is byte equality (§13.3). A `$schema` in an uploaded file
is ignored and never replaces `formatVersion`.

### 3.3 Two lifecycles: package-source normalization and canonical wire validation

The npm forms in §5 — an author object, a `github:owner/repo` shorthand, an SSH
repository URL — are **producer inputs, not valid wire values**. Conflating them would
oblige the Store to run a second npm normalizer over an uploaded file and to rewrite
submitted identity, which is exactly what §11.1 exists to stop.

> **SDK source-input rules — SDK only.** Accept and normalize package author objects,
> repository objects, shorthands, and SSH forms into a `CyManifestV1`.
>
> **Canonical wire rules — SDK and Store.** Accept only the resulting manifest strings and
> paths. **The Store implements only these rules and rejects every package-source form**,
> along with untrimmed and present-but-empty values. It never trims, omits, or rewrites a
> wire value.

Every normative rule in §5 is labelled **[source]** or **[wire]**, and there are two
independently named corpora — **`package-source-normalization`** (`package.json` →
canonical manifest) and **`canonical-wire-validation`** (manifest bytes and parsed value →
valid/invalid). Store fixtures include every source-only form appearing in a manifest, as
a rejection. Reviewer edits live in the Store release record; they never produce a
rewritten submission manifest.

### 3.4 Serialization and archive member semantics

One `serializeCyManifest()` implementation, used by both the ZIP and the CLI, so the two
are **byte-identical**: UTF-8, no BOM, two-space indent, fields in the fixed order shown
in §3, one trailing newline. It also enforces the whole-document octet limit, which JSON
Schema cannot express. The archive test compares bytes, not parsed objects.

Archive member naming is an **OS-independent** contract, not a by-product of the build
machine: every member name is a **relative POSIX path using `/`**; absolute,
drive-prefixed, backslash-containing, empty, `.`, and `..` segments are rejected; no
implicit directory members are emitted; and every member — the injected
`cy-manifest.json` included — is sorted by **one named comparator, unsigned UTF-8 byte
order**. The same input fixture must produce the same member-name sequence on POSIX and
Windows.

## 4. Identity: ids, versions, and limits

### 4.1 The reserved-id list

The id grammar is a JavaScript identifier, which admits `__proto__`, `constructor`,
`toString`, and every other own key of `Object.prototype`. The host indexes installed
apps and catalog entries in **ordinary prototype-bearing records**, so
`state.apps['toString'] !== undefined` is true for an app that was never installed, and
assigning to `__proto__` mutates a record's prototype instead of creating an own
property. An id is not a safe key merely because it is a legal identifier.

v1 therefore publishes a **fixed reserved-id list** — a normative predicate (§3.2), not a
per-implementation blocklist:

```text
cyweb, __proto__, constructor, prototype, __defineGetter__, __defineSetter__,
hasOwnProperty, __lookupGetter__, __lookupSetter__, isPrototypeOf,
propertyIsEnumerable, toLocaleString, toString, valueOf
```

It applies to the runtime reader, the scaffolder (including derived defaults), the schema,
Store ingestion, and the host's catalog parser, from **one shared negative corpus**.
Independently, the host migrates its id-indexed structures to `Map` or null-prototype
records as a final defence (§11.12) — but changing only the host would leave every older
host exposed to a newly published id, which is why the list is a wire rule first.

### 4.2 The version submission profile

`version` needs an operational bound because it is not only a string in a JSON file: the
packager interpolates it into `<id>-<version>.zip`, and the Store puts it in
`/web/{id}/{version}/`. A single filename component is capped at 255 bytes on the audited
filesystem; with a 64-byte id, separator, and `.zip`, at most 186 bytes remain.

- exact canonical SemVer 2.0.0, **≤ 128 ASCII characters**;
- no `v` prefix; **surrounding whitespace is invalid, not trimmed**;
- no leading zeroes in core or numeric prerelease identifiers;
- prerelease preserved exactly — it is part of the `{id, version}` identity;
- **build metadata (`+…`) is rejected.** SemVer excludes it from precedence, so
  `1.0.0+a` and `1.0.0+b` are distinct identities that tie for a "latest" endpoint, and
  `+` in a URL path is an encoding hazard besides;
- **every numeric core component and numeric prerelease identifier is at most
  `Number.MAX_SAFE_INTEGER`.**

The last rule is not hypothetical. Against the reference implementation pinned for this
work, `node-semver@7.8.5`: `9007199254740991.0.0` is accepted and
`9007199254740992.0.0` is rejected, so a grammar-only reader admits versions the agreed
comparator refuses; and `1.0.0-99999999999999999999` and `1.0.0-100000000000000000000`
are distinct strings that **compare equal**, so two different identities would tie for
latest with no defined order. The alternative — an arbitrary-precision decimal comparator
in the SDK, the Store, and the host — buys nothing anyone needs.

**The grammar is shared by every layer; the profile is submission-only.** One corpus
carries *two* expectations per case — `grammarValid` for `readAppMeta()` and ordinary
dev/build, `submissionProfileValid` for manifest generation, the schema, Store ingestion,
route generation, and latest ordering — and is used by the runtime reader, the scaffolder
(whose own SemVer regex is looser than the runtime reader's today and must converge on the
shared grammar), the schema, and the Store. Adding the length, build-metadata, or
magnitude rules to `readAppMeta()` would fail ordinary `vite dev` for a submission
concern, which inverts §5's failure policy. The scaffolder validates the grammar and
**warns without failing** when a version would not satisfy the submission profile.

### 4.3 Limits

**Field limits are measured in Unicode code points after the normalization of §5**; the
whole-document limit is measured in **UTF-8 octets**. JavaScript's `string.length` counts
UTF-16 code units and JSON Schema's `maxLength` counts code points, so an emoji in a
display name makes the two disagree. The SDK counts code points (`[...s].length`).

Unless a row says otherwise, these are **proposed submission-profile values**, not
descriptions of current code.

| Field | Limit | Basis |
| --- | --- | --- |
| `id` | JS identifier grammar (**current host rule**) minus §4.1, ≤ 64 code points (**proposed**) | the host regex constrains syntax and has no length cap |
| `name` | ≤ 128 code points | proposed; the current Store `App.name` column is **127** and would migrate |
| `version` | §4.2 profile | proposed; the current Store version column is far narrower and would migrate |
| `description` | ≤ 1024 code points | proposed |
| `author` | ≤ 128 code points | display name only |
| `license` | ≤ 64 code points | proposed; matches the current Store license column |
| `repository`, `homepage` | ≤ 512 code points | proposed |
| `repositoryDirectory` | ≤ 256 code points | proposed |
| `tags` | ≤ 20 entries, ≤ 32 code points each | proposed |
| `compatibleHostVersions` | ≤ 64 code points | proposed |
| `generator` | ≤ 128 code points | proposed |
| whole document | ≤ 16,384 UTF-8 octets | bounded parsing on the Store side |

Exceeding a limit **fails packaging**, naming the field and the limit. The SDK never
truncates. §12 asks the Store to confirm or widen these numbers and to name the
migrations.

## 5. Fields and normalization

Every field derives from the app's `package.json`. No new configuration file.

| Field | Source | v1 rule |
| --- | --- | --- |
| `formatVersion` | constant `1` | required |
| `id` | `cyweb.id` | required; exact identity string, never trimmed; §4.1 |
| `name` | `cyweb.displayName` | required; trimmed; empty after trim is invalid |
| `version` | `version` | required; §4.2; never trimmed |
| `type` | constant `"client"` | required; v1 accepts only `client` |
| `entry` | constant `"remoteEntry.js"` | required; v1 accepts only this value |
| `description` | `description` | optional; trimmed |
| `author` | `author` | optional; **display name only** |
| `license` | `license` | optional; trimmed, bounded, non-empty on the wire |
| `repository` | `repository` | optional; canonical credential-free HTTPS |
| `repositoryDirectory` | `repository.directory` | optional; relative POSIX path |
| `homepage` | `homepage` | optional; credential-free HTTP(S) |
| `tags` | `keywords` | optional; omitted when normalization empties it |
| `compatibleHostVersions` | `cyweb.compatibleHostVersions` | optional; §10 decides whether it exists at all |
| `generator` | SDK name and version | always emitted exactly; diagnostic only |

**Trimming is field-specific, not global.** `id` and `version` are exact identity strings:
surrounding whitespace makes them **invalid**, and trimming would silently accept a value
that disagrees with the container name or the published path. Constants and `generator`
are emitted exactly. `name` and the optional textual fields are trimmed, and the §4.3
limits apply to the emitted, normalized value.

**Empty-after-trim, stated once for both lifecycles:**

> **[source]** A missing optional scalar, or a direct string that is empty after
> field-specific trimming, is **absent and omitted**. A supplied **composite** whose
> required member becomes empty — a repository object with a blank `url` — is **invalid**.
> A required `name` empty after trimming is invalid. Wrong types are always invalid.
>
> **[wire]** A present empty or untrimmed value is **noncanonical and rejected**. The
> Store never trims it and never omits it.

It applies to `description`, `author`, `license`, string `repository`,
`repositoryDirectory`, `homepage`, and `compatibleHostVersions`. Of these, an omitted
`author`, `license`, `repository`, `homepage`, or `compatibleHostVersions` produces a
readiness warning (below).

**Acceptance rules.** A small deterministic profile, not "whatever npm happens to do",
because a Python implementation on the Store side has to agree — on the **[wire]** half.

- **[wire] Wrong JSON type is invalid, not absent.** A numeric `homepage`, a string
  `tags`, a repository object without a string `url`. Treating a malformed value as unset
  would hide the mistake behind a field that merely goes missing. (This is also why the
  raw package snapshot of §6.1 matters: today's reader coerces a non-string `description`
  to `''` before any validator could object.)
- **[source] `author` accepts** a plain non-empty string, `"Name <email> (url)"`, and
  `{ name, email, url }`, and takes the name only. **[source]** If the extracted name
  itself matches the email-like or URL-like predicates — normative algorithms in §3.2,
  with fixtures — the field is **omitted** with a readiness warning:
  `{"name": "jane@example.org"}` produces no `author`. **[wire]** `author` is a plain
  trimmed display string; an object is rejected.
- **[source] `repository` accepts** `https://host/owner/repo(.git)`, `git+https://…`,
  `git@host:owner/repo.git`, `github:`/`gitlab:`/`bitbucket:` shorthand, and the object
  form with a string `url` and a `type` **absent or exactly `"git"`**. **[wire]** only the
  canonical credential-free HTTPS string is valid; shorthands, SSH forms, objects, and
  `.git` suffixes are rejected. In both lifecycles an **explicit port, query, or fragment
  is rejected, not silently stripped** — dropping part of a URL changes what it addresses —
  userinfo is rejected except the conventional `git@` of the SSH source form, and
  validation inspects the **raw encoded path components before** any URL parser normalizes
  them. Anything outside the documented subset fails with a message naming the plain https
  URL to write instead (§13.3).
- **`repositoryDirectory`** must be a relative POSIX path with no `.`, `..`, empty
  segment, leading `/`, drive letter, backslash, or NUL — and **no `%` at all**. Banning
  the escape character outright is simpler than specifying recursive, case-insensitive
  percent-decoding that two implementations must match, and no legitimate monorepo path
  needs one.
- **`homepage`** accepts credential-free `https:` and `http:` and **preserves path, query,
  and fragment**. Plain HTTP passes the producer boundary because a local development URL
  is a legitimate package value; the Store's publication profile requires HTTPS for a
  public listing (§11.6).
- **`license`** passes the trimmed value through as written — SPDX identifier, SPDX
  expression (`Apache-2.0 OR MIT`), or `UNLICENSED`. The SDK checks type and bounds only;
  the Store's licence policy judges the content (§13.3).
- **`tags`** are trimmed, empties dropped, de-duplicated with **ASCII-case-insensitive
  comparison and exact comparison for non-ASCII code points**, keeping the first spelling
  and the authored order, then bounded per §4.3. If nothing survives, the field is
  **omitted** rather than emitted empty.

**Failure policy — and the lifecycle that makes it true**

- Missing `id`, `name`, or `version` fails every build today, through `readAppMeta()`.
  Unchanged.
- An **invalid** submission value — bad repository URL, escaping `repositoryDirectory`,
  wrong type, over-limit string, reserved or over-magnitude identity — **fails packaging
  and `cyweb-app manifest`, and never affects `vite dev` or `vite build`** (§6.1).
- A **missing** `author`, `license`, `repository`, `homepage`, or
  `compatibleHostVersions` produces a readiness warning on the packaging and CLI paths
  only. **During the preview those warnings say "recommended" and "policy pending"**, not
  "the Store requires this" — the publication profile that decides which are mandatory is
  a handshake item (§12.4). Once it exists, the SDK **bundles the approved profile id and
  its snapshot** (§6.5) **and performs no network fetch**; the Store stays authoritative at
  submission, later policy changes get a new profile id, and warnings from an older SDK
  remain advisory.

## 6. SDK implementation

### 6.1 One package snapshot, three parses

`defineCyWebApp()` calls `readAppMeta(root)` unconditionally, at config evaluation,
**before** it knows whether the zip is enabled, so validating submission fields there
would fail every dev server on a bad `homepage`. But separating the *readers* is not
enough either: `readAppMeta()` opens and parses `package.json` internally and
`sharedFromPeers()` opens it again, so "one snapshot" cannot be implemented by two
independent readers. There has to be a raw boundary underneath both:

```text
readPackageSnapshot(root)                       // raw JSON; every path, unchanged cost
  ├─ parseAppMeta(snapshot)                     // runtime identity; every dev/build
  ├─ parseSubmissionMeta(snapshot)              // optional values; ZIP and CLI only
  └─ sharedExpectations(snapshot)               // verifier input
buildCyManifest(appMeta, submissionMeta, sdkVersion)   // pure
serializeCyManifest(manifest)                          // the only place bytes are produced
```

Reading raw JSON on every path is what happens today; only submission-field *validation*
is deferred. The split also preserves wrong-type values long enough to reject them — the
current reader coerces a non-string `description` to `''` inside the runtime path, where
no later validator can see it.

**`readAppMeta(root)` stays public**, as a thin wrapper over
`parseAppMeta(readPackageSnapshot(root))` with its runtime-only failure policy unchanged.
Only `zipForAppStore` is removed from the public surface (§6.3); a packed-package consumer
test imports the wrapper and proves parity with the primitive.
`EXPOSED_META_FIELDS` is untouched: it governs what reaches the browser through
`virtual:cyweb-app-meta`.

### 6.2 The verifier core: no reads, and an honest CLI limit

`verifyApp()` moves from `src/cli/verify.ts` to a neutral module that performs **no
package reads at all**. Its input is an aggregate: app metadata and peer-derived shared
expectations from **one** `readPackageSnapshot`, the expected exposes, and the **absolute
resolved** `distDir`. Both callers assemble it — the CLI from a snapshot it takes itself,
the packaging plugin from the snapshot it already holds.

**The configured share block, remote and runtime plugins are NOT among those inputs**, and
that is the one place this differs from what earlier revisions described. They are read
from `mf-manifest.json`, where this SDK embeds them through `manifest.additionalData`
precisely so a build's own intent stays auditable afterwards. Accepting them from the
caller instead would let the plugin hand the verifier the configuration it was built with
and have that compared against itself — which is exactly what "verifies on payload, not on
config" exists to prevent. The asymmetry the review was right about survives intact: **the
standalone CLI has no build configuration to capture**, because it runs against an
already-built `dist/` whose Vite config is gone, and it does not pretend otherwise. It
reads the package once for identity and peers, and reads everything else from the artifact.

**Malformed artifact metadata is a controlled failure, not an exception.** Today's
`JSON.parse` of `mf-manifest.json` is unguarded, so invalid JSON escapes as an uncaught
error. The neutral core returns structured failures for invalid JSON, `null`, arrays, and
wrong shapes; the CLI writes nothing to stdout, writes a bounded diagnostic to stderr, and
exits 1 without a stack trace; packaging leaves neither a final nor a temporary ZIP.

### 6.3 Packaging pipeline

[`zipForAppStore.ts`](../../../packages/app-runtime/src/vite/zipForAppStore.ts) becomes,
in order:

1. **`buildStart`: invalidate this run's final artifact.** Stated exactly: *no stale or
   partial ZIP exists **at the final path this run computed** after a failure following
   `buildStart`.* It does not extend to an earlier version's archive — after a version
   bump the previous `<id>-<old>.zip` remains, deliberately, and a fixture proves it. No
   glob deletion; cleanup, if ever wanted, becomes an explicit `cyweb-app package
   --clean`. A failure during config evaluation happens before this plugin exists and no
   in-build hook can cover it (§13.4).
2. **`closeBundle`: verify**, with the aggregate input of §6.2, failing packaging on any
   failure. An integration test asserts the federation plugin has already written
   `mf-manifest.json` when this runs.
3. **Escalate the build-path note.** The verifier already reports that `remoteEntry.js`
   embeds absolute build-machine paths — accepted for CI publishing on a fixed runner, but
   a developer ZIP is exactly the workstation case that note warns about. Packaging
   re-emits it prominently: *this archive may disclose your username and directory layout;
   prefer a Store-owned build for a public release.*
4. **Walk `dist/` safely.** `lstat` every entry; accept only regular files and
   directories; resolve each included file's real path and require containment under the
   real `dist` path. Symlinked files, symlinked directories, broken links, FIFOs, sockets,
   and every other non-regular entry are rejected, not dereferenced into ordinary members.
5. **Classify with denies before allows, naming each deny class normatively.** An
   extension allowlist alone readmits exactly what must not ship — `mf-manifest.json` and
   `mf-stats.json` are `.json`, the SSR chunks are `.js` — and "by exact name" is not
   enough for SSR output, which the build emits with content hashes. The deny classes are:
   - exact root `remoteEntry.ssr.js`;
   - prefixes `assets/ssrEntryLoader-`, `assets/module-runner-`, and
     `assets/virtual_mf-exposes-ssr`;
   - exact Federation metadata `mf-manifest.json` and `mf-stats.json`;
   - `.vite/` by prefix;
   - `.html`, `.htm`, and `.map` by **suffix, anywhere in the tree** — an exact-or-prefix
     rule misses `assets/nested/page.html` and `assets/chunk.js.map`.

   Then: allow the exact root `remoteEntry.js`; reject any pre-existing
   `dist/cy-manifest.json` and inject the generated one; allow `assets/**` whose extension
   is on the closed, **case-sensitive** list `.js`, `.css`, `.json`, `.wasm`, `.woff2`,
   `.woff`, `.ttf`, `.otf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.avif`, `.svg`;
   every unmatched path is fatal.

   The list is **closed by decision, not by inventory** — the five maintained examples
   cannot establish policy for classes they do not emit. Tabular and CX/CX2 data are denied
   in v1: an unmatched extension is a fatal error naming the file, so widening later is
   additive and safe. Every deny class gets a rejected fixture **and an allowed
   near-neighbour**, so a later refactor cannot broaden a prefix unnoticed.
6. **Assert the §3 invariants and the §3.4 member semantics**, add the manifest, sort by
   the named comparator, write to a uniquely named temp file **in the destination
   directory**, rename on success, and remove the temp file on failure.

The exported `zipForAppStore(appId, version)` primitive **becomes internal**. Two
unvalidated strings were being interpolated into an output path, and a direct caller
bypasses the reader and validation lifecycle that §6.1 exists to enforce. Removing it from
the `./vite` surface is the one breaking change in 0.4.0.

### 6.4 `cyweb-app manifest`

Prints the manifest to **stdout as JSON and nothing else**; every diagnostic and readiness
warning goes to **stderr**. `--out <file>` writes it instead, and stdout is then empty.

**Paths.** `--root`, `--out`, and an *explicit* `--dist` are **cwd-relative**; `--dist`
defaults to `<root>/dist`, which is the current verifier's asymmetry, named rather than
quietly inherited. The temp file is uniquely created **beside the destination**, never in
an OS temp directory — a cross-filesystem rename fails with `EXDEV`.

**`--out` is deliberately unrestricted.** It is an argument the developer types, not a
path derived from untrusted metadata, so it is treated like a shell redirect: any
destination, with `--force` as an explicit user-authorized overwrite capability. What
revision 3 called protection — refusing two specific basenames — is removed: partial
protection described as containment is worse than none. What remains is refusing an
existing destination without `--force`, refusing a symlink destination or symlinked
ancestor, and never creating parent directories.

**Grammar**, for both subcommands: singleton flags accept zero or one occurrence; only
`verify --expect-expose` repeats, which is existing public behaviour; a value token may
not begin with `--`; `--force` without `--out` is a usage error; `--help`/`-h` and
`--version`/`-v` are **preserved**, take precedence over a command, and reject additional
arguments; every usage failure exits **2**, invalid metadata or a refused write exits
**1**, success exits **0**. Parsing uses `node:util`'s `parseArgs` — the declared engine
is Node ≥ 24 — with `multiple: true` for `--expect-expose`.

### 6.5 Scaffolder, examples, packaged artifacts, and CI

- Generated projects declare `adm-zip` alongside the `cross-env` they already have;
  outside this monorepo the hoisted root copy does not exist and `build:zip` fails on a
  missing optional peer.
- The five maintained examples gain `build:zip` and **direct declarations of both
  `adm-zip` and `cross-env`** — neither is declared by any of them today, and the
  repository root provides `adm-zip` but not `cross-env`.
- `packages/app-runtime` gains an **executable** `adm-zip` in its test environment (it has
  only `@types/adm-zip` today) and a **direct** draft-2020-12 validator: **`ajv@^8` used
  through `ajv/dist/2020`**. A validator resolved transitively from another workspace is
  not a reproducible contract.
- **Three artifacts ship with the package and are pinned by digest** (§3.2): the JSON
  Schema, the normative semantic-predicate artifact, and — once the handshake closes — the
  **publication-profile snapshot**. Each has an owned source path under
  `packages/app-runtime/schema/`, an immutable id, canonical bytes, an entry in `files`, a
  documented export subpath, and a packed-tarball test that resolves and digests it.
- The generated `.gitignore` gains `cy-manifest.json`; the generated README gains a
  "before you submit" section naming `author`, `repository`, `license`, `homepage`, and
  `compatibleHostVersions`. **The scaffolder does not choose a licence** — no
  `"license": "MIT"`, no LICENSE file.
- **Preview pinning is decided**: generated projects pin the **exact** preview version
  (`"@cytoscape-web/app-runtime": "0.4.0-next.1"`) during the preview, and `^0.4.0` after
  stable promotion. npm's prerelease-range semantics are why: a caret range over a
  prerelease admits only prereleases of the same `[major, minor, patch]`. The
  `SDK_VERSION` test — which today accepts only `^x.y.z` — encodes both rules.
- **The packed-candidate matrix covers npm *and* pnpm.** Both are formally supported by
  the parent SDK design, and packed-tarball acceptance under both is already one of its
  criteria; current CI exercises npm only. For each package manager and every template:
  install both packed packages outside the workspace, scaffold, build, `verify`,
  `build:zip`, and inspect the embedded manifest — and **under pnpm additionally assert
  that the resolved runtime plugin lives inside the installed package** rather than
  relying on workspace hoisting, which is the highest-risk item the design already names.
- **Pre-publish CI always installs the exact packed candidate.** The packed-scaffold job
  currently installs the registry SDK whenever the generated range already resolves and
  falls back to the candidate tarball only when it does not, so an ordinary SDK change can
  pass while testing previously published code. It installs the candidate unconditionally
  and asserts the resolved executable path or tarball integrity — not merely a version
  string — before running `build:zip`.
- **Post-publish smoke follows the selected dist-tag**, not a hard-coded `next`: the
  release workflow takes `tag` as an input and can publish `latest`. Assert
  `dist-tags[tag]` equals the expected version, install through `@${tag}`, scaffold, build
  a ZIP, and inspect its manifest. Exercise preview = `next` and stable = `latest`.
- Windows CI covers CLI and archive atomic replacement and the member-name sequence, where
  rename and path semantics differ from POSIX.

*(Every dependency-manifest change above requires maintainer approval.)*

## 7. Tests

**Two corpora, named** (§3.3) — `package-source-normalization` and
`canonical-wire-validation` — run independently. Wire fixtures include every source-only
form (author object, repository object or shorthand, SSH URL, untrimmed or empty value)
as a **rejection**.

**Unit** — every author form, asserting no email reaches the output and that an
email-like extracted name omits the field; every repository form including rejected
explicit port, query, and fragment; percent-encoded separators, dot segments, and any `%`
in `repositoryDirectory`; wrong JSON types rejected rather than dropped; the
empty-after-trim table for both lifecycles; `id`/`version` rejected rather than trimmed
when padded; the **reserved-id list** as a shared negative corpus; tag de-duplication
across ASCII case and non-ASCII code points and omission when empty; every §4.3 limit with
a non-BMP boundary fixture; **lone, reversed, and split surrogate** fixtures for property
names and string values; the §4.2 SemVer corpus carrying **both** `grammarValid` and
`submissionProfileValid` expectations, including the `9007199254740991`/`…92` boundary and
the two large prerelease identifiers that compare equal, plus latest-ordering tests; schema
and predicate validation **from the packed tarball**; and a CI check that no `$id` in the
append-only ledger changes digest.

**Lifecycle regression** — an app with invalid and over-limit submission-only metadata
builds and runs dev normally, and fails only packaging and `cyweb-app manifest`. A
grammar-valid but profile-invalid version scaffolds with a **stderr warning and exit 0**,
generates files, builds normally, and fails `build:zip` without leaving an archive.

**Snapshot mutation** — after the Vite configuration is captured, mutate `id`, `version`,
optional submission metadata, and `peerDependencies`; the built container identity, the
`AppConfig` identity, the final ZIP filename, the embedded manifest bytes, and the
verifier's expectations must all retain the captured values.

**CLI, as child processes**, against a **freshly built and packed candidate installed in a
temporary project** — package-local tests do not build `dist/` first, so a stale workspace
build must not be what is exercised. Assert the resolved executable path or tarball
integrity, then: stdout/stderr separation and stdout silence under `--out`; every grammar
and exit-code case; repeated `--expect-expose`; overwrite refusal and `--force`; missing
parent directories; symlink destinations and ancestors; relative-path bases for `--root`,
`--out`, and explicit versus default `--dist`; malformed `mf-manifest.json` producing a
bounded stderr diagnostic and exit 1 with no stack trace; temporary-file cleanup. On POSIX
**and** Windows.

**Archive integration** (none exists today — the current test covers option resolution and
never invokes the packager) — one root `cy-manifest.json` and one root `remoteEntry.js`;
every deny class rejected with an allowed near-neighbour present, including hashed SSR
assets and `assets/nested/page.html`, `assets/chunk.js.map`; an unmatched extension fatal;
a pre-existing `dist/cy-manifest.json` fatal; FIFO, socket, symlinked file, symlinked
directory, broken link, and realpath escape rejected; **member names, separators, absent
directory entries, and sort order identical on POSIX and Windows**; a fixture per supported
asset class; manifest identity equal to `package.json` and the built container name; CLI
output **byte-equal** to the embedded copy; a failure after `buildStart` leaving nothing at
this run's final path while a version-bump fixture shows the previous archive surviving; a
failed write removing its temp file.

**Scaffolder** — under npm and pnpm, a freshly generated project installed outside this
monorepo runs `build:zip` and yields an archive whose manifest is correct.

**Current-Store compatibility** — today's Store still accepts an archive containing the
new member.

## 8. Three acceptance gates

Two gates were not enough: they left public self-service publication implicitly bundled
with Store adoption, and §7's earlier end-to-end test could not pass at either.

### 8.1 SDK 0.4 producer gate

Schema- and predicate-valid manifests from supported package metadata, with source
normalization and wire validation separated and both corpora passing; ordinary dev/build
unaffected by invalid or over-limit submission-only fields; verification consuming one
captured snapshot and completing before archive creation; archive membership with named
denies before a closed allowlist, non-regular-entry and realpath rejection, OS-independent
member semantics, the scoped stale-file guarantee, and byte-level serializer equality;
tarball-resolved schema, predicates, and digest ledger; the full CLI matrix on POSIX and
Windows against a fresh candidate; the npm/pnpm packed matrix with every template building
and opening a ZIP; and the current Store still accepting the archive.

### 8.2 Store adoption gate — and what "verified" must mean

**This gate incorporates §11.1–11.11 and §11.13–11.14 in full**, or points at a
version-pinned normative Store design that does. "Verified release" is not "a manifest was
parsed and a row was created". It means: bounded raw-byte and ZIP validation → fresh safe
extraction → a disposable browser with deny-by-default egress → exact identity comparison
→ review → **create-only** atomic publication, with revocation readiness and the two-path
authority question resolved. At the audited Store revision, validation is shallow, pending
artifacts are expanded into bundle storage, and publication deletes existing objects before
writing replacements — so this is an implementation gap, named here so that **producer
completion is never mistaken for Store readiness**.

**Issue #8 closes on this gate**, not on §8.1. A weaker, independently implementable state
must not close it.

### 8.3 Public self-service launch gate — decided: not yet

v1 **selects curated-only publication** (§2). Self-service stays disabled until one of the
other two models is built: capability-bounded per-app APIs replacing the raw store exposes,
or execution in an isolated realm behind an explicit message boundary. The gate requires,
in addition: tests proving a remote cannot obtain credentials or raw stores unless
deliberately authorized; and a **boundary for deferred executable requests** — a later lazy
`import()`, a computed executable URL, or a worker does not pass through the install-time
origin gate, and a CSP origin allowlist on a shared artifact origin cannot confine a load
to one `{id, version}` path. Browser verification observes the requests a test exercises;
it is not a proof about future UI behaviour. CSP progresses from report-only to enforced
with privacy-filtered reporting retained, and **never counts as satisfying this gate**.

## 9. Release posture and rollout

**The stable v1 wire format waits for the §12 handshake; the code does not.** The SDK
ships as `0.4.0-next.N` on the `next` dist-tag — the Developer Preview mechanism
[`app-sdk-design.md`](./app-sdk-design.md) §3 already defines — with **preview schema and
predicate identities** (§3.2) that can iterate. `formatVersion: 1` is declared stable, the
first stable identities and digests are issued, and `0.4.0` is promoted, when **every item
in §12** closes.

A `0.x` caret range does not cross a minor bump: every maintained example and the
scaffolder pin `^0.3.0` and would silently stay on the old SDK. One change set moves
`packages/app-runtime`, `packages/create-cytoscape-app` and the `SDK_VERSION` it writes,
all five examples, the lockfile and generated snapshots, and the documentation —
`packages/app-runtime/README.md`, `guides/getting-started.md` §5b (which still says
`npm run build` writes the zip, untrue since the zip became opt-in), the project-template
README, `CLAUDE.md` §3, and [`phase6-release-runbook.md`](./phase6-release-runbook.md).

## 10. Compatibility: one structural outcome

`compatibleHostVersions` is **either fully in stable v1 or entirely absent from it**.
Because §3.1 freezes the official field set, disabling producer emission alone would leave
an official field with no agreed meaning — the worst of both. So:

- **if the handshake closes** (§12.5), the field stays, and the pinned `node-semver`
  version, range grammar, and prerelease policy are enforced on every Store and host path;
- **if it does not close**, the field is removed from the entire stable v1 surface — the
  example, the schema, the predicate artifact, the field table, the serializer, the public
  type, and the canonical-wire corpus. Adding it back requires the next `formatVersion`.
  `CyWebBlock` may keep the authoring property during the preview only if documented as
  non-manifest metadata.

Four facts make the field sharper than it looks:

- the host is currently `1.1.0-dev.0`, so a range like `>=3.2.0` describes no host that
  exists — hence the `>=1.1.0-0` in §3;
- the host calls `semver.satisfies()` with default options, and **a prerelease version does
  not satisfy a range containing no prerelease**: `1.1.0-dev.0` fails `>=1.0.0`. Every dev
  and stage host is a prerelease, and `>=1.1.0-0` matches `1.1.0-dev.0` but **not**
  `1.2.0-dev.0`;
- SemVer 2.0.0 defines versions, not ranges: the grammar must name a specific
  `node-semver` package version, with shared golden fixtures, or a Python implementation
  silently implements a different dialect;
- the host checks compatibility on install but **not** consistently on manual activation,
  fast reactivation, or startup auto-load — and Store-side syntax validation cannot protect
  an app that was installed before a host upgrade.

So enforcement requires one chosen prerelease rule — `includePrerelease`, comparison
against a normalized product version, or explicit prerelease comparators per release line —
tested on the current dev line, the next dev line, a stable release, and an incompatible
release, **before every activation and startup path**. Until those paths close, Store
validation is the hard publication gate and the catalog must not claim host enforcement. An
invalid supplied range is a publication failure; only absence may follow an optional policy.

## 11. What the Store and host must do

Tracked in `cytoscape/appstore` and `cytoscape-web`; incorporated into §8.2 (and §11.12
into §8.3). None of it is a precondition for §6. Operational detail — the response-header
matrix, the revocation mechanism, the ingestion state machine — belongs in those
repositories' documents (§13.2); what follows is the contract this manifest depends on,
with pointers into the review for the full text.

1. **Adopt `cy-manifest.id` as the canonical application id** — an explicit `app_id`
   through the pending, release, path, and catalog models; identity fields read-only in
   review; the §4.1 reserved list enforced; case-sensitive global uniqueness; publisher
   ownership; no id change between versions; a migration policy for existing derived slugs
   covering case, length, and collisions. **This is the change that decides whether the
   manifest is worth anything.**
2. **Validate raw bytes before the schema.** Root member ≤ 16,384 uncompressed octets,
   checked in **both** ZIP metadata and the streamed bytes; strict UTF-8, BOM rejected;
   duplicate member names rejected in every object; trailing non-whitespace and non-JSON
   numeric tokens rejected; nesting limit 32; unsupported `formatVersion` rejected before
   anything else is read; then the post-parse Unicode scalar check of §3.2.
   Malformed-**byte** fixtures, not only parsed-object fixtures.
3. **Validate the canonical wire, never renormalize it** (§3.3), against the pinned schema
   **and** the pinned predicate artifact.
4. **Bound "ignored" for unknown fields, and never republish raw bytes.** Unknown
   properties never affect identity, verification, review defaults, catalog projection, or
   publication, and are never promoted into official v1 fields; each produces an audit
   warning. **The submitted `cy-manifest.json` is never republished.** The Store may publish
   a separately generated known-field-only projection; the private source artifact and its
   Store-computed digest are the audit evidence, under a documented retention policy.
5. **Project the runtime catalog explicitly**: assign `url`; copy `id`, `name`, `version`,
   `type`, `author`, `description`, `license`, `tags`, `repository`, and
   `compatibleHostVersions` where present; exclude `formatVersion`, `entry`, `homepage`,
   `repositoryDirectory`, `generator`, and every unknown property unless the host catalog
   separately adopts one.
6. **Publish a versioned publication profile the Store owns**, with an id the SDK bundles
   (§5, §6.5), requiring at least a public author display name and an **HTTPS** `homepage`.
   The host parser's `author: 'unknown'` default is backward compatibility, not a
   curated-catalog value. The producer may keep a local HTTP homepage; the public profile
   may not.
7. **Ingest safely, in one state machine**: private quarantine → bounded central-directory
   and raw-manifest-byte validation → safe extraction into a fresh filesystem → disposable
   verification → review → create-only atomic publication. **No pending or unreviewed
   artifact may acquire a public CDN URL**, and publication must not delete a live object
   before writing its replacement.
8. **Verify by executing untrusted code in a sandbox that assumes it is hostile.**
   Importing `remoteEntry.js` runs developer code before anything can inspect
   `./AppConfig`, and CORS governs what browser code may *read* — it prevents neither SSRF
   nor request side effects. Disposable unprivileged VM; clean one-shot browser profile; no
   Store or host credentials, production mounts, or host sockets; **egress denied by
   default** below the browser; bounded CPU, memory, wall time, process count, and log
   size; secret-redacting logs. **Two pinned endpoints and no others** — one verifier-owned
   host harness and one artifact endpoint — resolve the tension between that policy and the
   production-equivalent harness item 9 requires; no redirects, address resolution pinned
   below the browser. Never execute an unreviewed remote in a reviewer's browser, an
   authenticated staging session, the Store web process, or a privileged CI runner.
9. **Check exact identity, against the real contract.** Require `./AppConfig` to resolve to
   a module whose **`default` export** is an object with non-empty `id` and `name` and, for
   new submissions, a present canonical `version`; do not accept a bare module object as a
   fallback, as the existing preflight's `appConfig.default ?? appConfig` does — the host
   requires `module.default`. Then assert
   **`AppConfig.default.id === cy-manifest.id`** and
   **`AppConfig.default.version === cy-manifest.version`** as exact canonical strings, not
   merely SemVer-equivalent values. **Display-name authority is decided:
   `cy-manifest.name` is authoritative** for the runtime catalog and for the comparison; a
   reviewer-supplied title is separate listing metadata in the release record and never
   rewrites the projected `name`. Initialize against a production-equivalent
   `window.__CYWEB_HOST__` and the real `__FEDERATION__.__SHARE__.cyweb.default` scope. The
   configured container name is **not** a documented export: the SDK proves package id
   against container metadata before packaging, where `mf-manifest.json` still exists, and
   the Store cannot re-derive it from an archive that omits that file. The host loader
   compares the id only and `CyApp.version` is optional, so the Store harness owns both
   exact comparisons until the host gains the version check — a new submission profile that
   needs a grandfathering decision.
10. **Publish immutably from a dedicated cookie-less artifact origin**, at
    `…/web/{id}/{version}/remoteEntry.js`, never overwriting an existing `{id, version}`.
    Versioned files return a **direct success response — no redirect hops** — and every
    observed executable, CSS, font, and asset request stays under the exact version root.
    A same-origin identity run cannot prove the publication contract: acceptance uses the
    two pinned origins of item 8, or keeps a same-origin identity verifier **and** adds a
    separate staged-CDN cross-origin browser suite. The full response matrix — CORS on
    manifests as well as modules, `Cross-Origin-Resource-Policy: cross-origin` stated
    explicitly rather than "not `same-origin`", correct `Content-Type` per allowed
    extension, `nosniff`, HTTPS, headers on 304/error/redirect responses, `Vary: Origin` if
    an origin is echoed — belongs in the App Store design document, whose claim that
    script-tag injection makes CORS unnecessary is stale: the host loads the remote as
    `type: 'module'`.
11. **Deploy the catalog handoff and the origin gate together.** The audited Store writes
    only a per-release manifest, while the host still defaults to the source constant
    `/apps.json` and statically imports its allowed origins. Require a generated global
    known-field-only catalog, exact production and stage origins, the selected proxy or host
    rebuild, updated allowlists, and production-equivalent browser E2E. **Close the
    default-catalog exemption**: the host unconditionally allows an entry classified as
    coming from its own default manifest, so pointing that default at a remotely maintained
    catalog would let it name a staging or arbitrary code origin. Apply the exact-origin
    gate to every Store-backed entry, reserve any exemption for a build-owned legacy
    catalog, make the production projection reject non-production origins, and test a
    production catalog containing a staging URL at install, activation, reactivation, and
    startup — all must fail before any remote request. Parent-domain Store cookies must not
    reach the artifact origin.
12. **Harden host id indexing** (§8.3 work): migrate id-indexed structures to `Map` or
    null-prototype records, so a reserved-looking id cannot be confused with an inherited
    property even if it reaches an older catalog.
13. **Pair immutable caching with revocation.** Removing an app from the global catalog does
    not revoke it: installed and snapshot entries override the live manifest
    (`composeCatalog.ts`), and deleting a CDN object does not reach a browser that cached it
    as immutable. Choose a rapidly revalidated `{id, version}` denylist checked before
    activation, reactivation, and startup, or a cache lifetime bounded by the
    incident-response objective — and decide what happens to an already-mounted app, since
    the host keeps loaded apps running across a catalog refresh.
14. **Finish the two-path authority policy** — whether a binary-only ZIP may become a public
    release without reproducible source; what happens when both paths submit the same
    `{id, version}`; which wins when a GitHub rebuild differs from an uploaded ZIP; and the
    precedence among `app-store.json`, form data, `cy-manifest.json`, and reviewer edits.
    `cyweb-app manifest` describes an app's identity, not how to build a repository:
    package manager, lockfile, install and build commands, output directory, and which app
    in a monorepo belong to the Store's build descriptor, and Store CI should invoke a
    lockfile-resolved local SDK binary rather than an unpinned `npx`.

## 12. Handshake items — the single promotion list

These gate promotion from `next` to stable (§9). Nothing else does.

1. **Does the Store adopt `cy-manifest.id` as its canonical application id**, including the
   §4.1 reserved list? (§11.1)
2. **Is the frozen v1 envelope agreed** — unknown properties ignored on the §11.4 boundary,
   never promoted, `x-` recommended not required — and does the Store **pin the exact
   `$id`s and `sha256` digests of the schema, the predicate artifact, and the publication
   profile**, taken over raw tarball bytes, rejecting noncanonical wire forms and passing
   both corpora? (§3.1, §3.2, §3.3)
3. **Are the §4.3 limits, the §4.2 version profile, and the `MAX_SAFE_INTEGER` magnitude
   rule right?** Confirm or widen, name the Store migrations, and confirm that build
   metadata is rejected rather than tie-broken at the latest endpoint.
4. **Who owns the publication profile, and what does it require** — author, `homepage`
   over HTTPS, licence, repository, compatibility? The Store owns and versions it; the
   stable SDK bundles the approved id and snapshot and performs no network fetch; warnings
   from an older SDK remain advisory. (§5, §11.6)
5. **Does `compatibleHostVersions` name an exact `node-semver` version, range grammar, and
   prerelease policy**, exercised by Store and host fixtures at every activation path? If
   not, **stable v1 omits the field entirely** (§10).

Not gating: whether the form needs fields beyond §5 (category vocabulary, screenshots,
support contact).

## 13. Review responses

**Accepted from rounds 1–4** and folded in above: three-layer ownership and allowlist
projection; author display name only; repository parsing with `directory` and credential
rejection; invalid values as errors rather than omissions; submission metadata kept out of
the browser bundle; warnings confined to packaging and CLI with stdout machine-readable;
pre-package verification; atomic write and deterministic entry order; HTML excluded; one
root manifest and one root entry; the reader lifecycle split and then the raw package
snapshot; the verifier moved out of `cli/` with an aggregate input; the shipped, pinnable
JSON Schema, the frozen v1 envelope, and the `$id`→digest ledger; the shared byte-level
serializer; the operational version profile and rejected build metadata; code points versus
octets and the mislabelled limit bases; denies before allows; the scoped stale-output
guarantee; the full CLI grammar; direct test dependencies; deny-by-default egress and the
`AppConfig.default` contract; redirect and closure binding; the default-catalog exemption;
cache revocation; the named range grammar and prerelease trap; and the §1/§2 factual
corrections.

**Accepted from round 5 (§20)**: the **reserved-id list**, because a legal identifier is
not a safe key — the host indexes apps in prototype-bearing records, so `toString` reads as
an installed app and `__proto__` mutates a prototype (§4.1); the **`MAX_SAFE_INTEGER`
magnitude rule**, which reproduces exactly as reported against `node-semver@7.8.5` —
`9007199254740991.0.0` valid, `…92.0.0` invalid, and two distinct large prerelease
identifiers comparing equal (§4.2); **[source]/[wire] labels on every rule**, since §5 had
been advertising npm input forms as rules the Python Store shares, which would have
produced two incompatible Store implementations (§3.3, §5); **normative semantic predicates
pinned to the schema identity**, because JSON Schema cannot express URL canonicalization or
email-like detection and fixtures cannot define an answer for every input (§3.2); the
**post-parse Unicode scalar check**, since the bytes of `"\uDEAD"` are valid ASCII (§3.2);
the empty-after-trim classification for both lifecycles (§5); the **structural
compatibility outcome** — under a frozen envelope, disabling emission alone would strand an
official field with no meaning (§10); the `x-` clarification (§3.1); digests over exact raw
tarball bytes (§3.2); **normatively named SSR deny classes**, because the build emits
hashed SSR assets that "by exact name" would readmit (§6.3); **OS-independent member names
and one named comparator** (§3.4); the restored **npm/pnpm matrix**, which the parent SDK
design already makes an acceptance criterion (§6.5); `readAppMeta(root)` retained as a
public wrapper (§6.1); the stronger snapshot-mutation test (§7); controlled failures for
malformed `mf-manifest.json`, whose `JSON.parse` is unguarded today (§6.2); child-process
tests against a fresh packed candidate (§7); the scaffolder's observable warning contract
(§7); post-publish smoke following the **selected** dist-tag rather than a hard-coded
`next` (§6.5); the packaged publication-profile snapshot (§6.5); **"verified" defined as the
complete ingestion boundary** (§8.2); the **third gate**, with curated-only actually
*selected* rather than listed (§8.3); the deferred-executable-request boundary (§8.3); two
pinned origins or a separate cross-origin suite (§11.8, §11.10); compatibility before every
activation path (§10); `homepage` added to the warnings, README, profile, and handshake
(§5, §6.5, §11.6, §12.4); **display-name authority decided** in favour of `cy-manifest.name`
(§11.9); and every cross-reference and count corrected (§20.5).

Three positions carry over unchanged from earlier rounds; §13.4 lists what stays deferred.

### 13.1 The grammar/profile split

§18.2.3 asked for one corpus across every layer and §18.2.4 for submission-only bounds;
literally, the first puts a 128-character cap into the reader that runs on every
`vite dev`. §4.2 resolves it: **one corpus carrying two expectations per case** —
`grammarValid` everywhere, `submissionProfileValid` on the submission path. §19.3.4 and
§20.2.2 both asked for exactly this, so the rounds now agree.

### 13.2 The CDN and host operational spec does not move into this document

§18.5, §19.4, and §20.4 accumulate a response matrix, a revocation mechanism, an ingestion
state machine, an egress topology, a catalog handoff, and a CSP rollout. All correct; all
belonging to repositories this document cannot observe. Writing them here would make a
submission-format spec the de facto three-repository operations manual, in the place least
able to keep it true.

§11 therefore states each as a numbered requirement with a pointer into the review, §8.2
incorporates them by reference so the Store gate cannot be read as satisfied without them,
and the authoritative text belongs in
`cytoscape-web/docs/design/module-federation/specifications/app-store-design.md`, which
already carries the stale no-CORS claim that needs correcting in the same pass.

### 13.3 `$schema` is not emitted, and the SDK keeps zero runtime dependencies

A pointer inside the artifact buys nothing once the schema is pinned by `$id` and digest,
and it adds a determinism decision to a serializer whose contract is byte equality.

On dependencies: `@cytoscape-web/app-runtime` keeps **zero runtime dependencies**. It does
not need to understand every npm repository form — it accepts a documented subset and
rejects the rest with a message saying what to write instead. SPDX expression validation is
Store licence policy, and `compatibleHostVersions` range validity is checked where npm
`semver` already lives: the Store, and the host's `installGate.ts`. Everything added in
§6.5 — `ajv@^8`, executable `adm-zip`, `cross-env` in the examples — is a **devDependency
or a generated-project dependency**, and each needs maintainer approval.

### 13.4 Deferred, with reasons

- **Sanitizing and shipping `mf-manifest.json`** so the Store can re-run the SDK verifier:
  declined for v1. It embeds absolute build paths, and a sanitized copy would still be
  self-reported — the Store's check has to be execution (§11.8).
- **Timestamp and mode normalization for reproducible archive hashes**: deferred until the
  Store states that it compares hashes across rebuilds. Member order and naming are already
  deterministic (§3.4).
- **`cyweb-app package`** — a wrapper that invalidates the target before Vite starts and
  drives the build itself, extending the stale-artifact guarantee past config evaluation and
  removing `cross-env` from every consumer: the right shape, out of scope here (§6.3).
- **`icon`, `category`, `dependencies`**: out of v1. Each needs a Store vocabulary or
  activation semantics that do not exist, and under the frozen envelope (§3.1) adding one
  later costs a `formatVersion` bump — the honest price of freezing, and cheaper than
  shipping a field the Store cannot act on.
- **A trusted `schemaRevision` field with consumer negotiation**: declined for v1 in favour
  of the freeze; it is the natural design for a `formatVersion: 2` that needs same-major
  evolution.
