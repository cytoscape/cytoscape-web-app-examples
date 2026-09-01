import {
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { join, resolve, sep } from 'node:path'

import type { Plugin } from 'vite'

import type { CyWebAppMeta } from '../meta/index.js'
import type { CyWebSubmissionMeta, ShareRecord } from './appMeta.js'
import {
  archiveMemberProblem,
  classifyArchiveMember,
  compareMemberNames,
} from './archiveMembers.js'
import {
  buildCyManifest,
  CY_MANIFEST_FILENAME,
  serializeCyManifest,
} from './cyManifest.js'
import { verifyBuild } from '../verify/verifyBuild.js'

/** Turns the App Store zip on or off for one build, from the command line. */
export const APP_ZIP_ENV = 'CYWEB_APP_ZIP'

const FALSY = new Set(['0', 'false', 'no', 'off'])

/**
 * Decide whether this build writes an App Store zip.
 *
 * The config option says what an app normally wants; the environment variable
 * overrides it for one build, in **both** directions. Off-by-default with a
 * committed `appStoreZip: true` is the common case, but an app that always
 * wants the zip still needs a way to skip it while iterating, and a one-way
 * switch would send them back to editing the config file — which is what this
 * exists to avoid.
 *
 * An unrecognised value is **on**, not an error: the variable is reached for at
 * the moment someone wants a zip, and refusing the build over `CYWEB_APP_ZIP=yes`
 * would fail them for being right.
 */
export const resolveAppStoreZip = (
  option: boolean | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean => {
  const raw = env[APP_ZIP_ENV]?.trim()
  if (raw === undefined || raw === '') return option ?? false
  return !FALSY.has(raw.toLowerCase())
}

/** Everything the packager needs, from the one snapshot `defineCyWebApp` took. */
export interface AppStoreZipInput {
  readonly appMeta: CyWebAppMeta
  readonly submissionMeta: CyWebSubmissionMeta
  readonly expectedShared: Record<string, ShareRecord>
  /** This SDK's own version, for the manifest's `generator`. */
  readonly sdkVersion: string
}

interface CollectedMember {
  readonly name: string
  readonly absolutePath: string
}

/**
 * Walk `dist/` and reject anything that is not a plain file inside it.
 *
 * `readdirSync(withFileTypes)` reports types from `lstat`, so a symlink is seen
 * as a symlink rather than as whatever it points at — and `addLocalFile` would
 * otherwise have stored the target's CONTENT as an ordinary member, leaving the
 * Store unable to tell that a regular-looking file came from outside the build.
 * The realpath check catches the same escape through a symlinked directory.
 */
const collectMembers = (
  dir: string,
  realDistDir: string,
  prefix = '',
): CollectedMember[] => {
  const out: CollectedMember[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    const absolutePath = join(dir, entry.name)

    if (entry.isSymbolicLink()) {
      throw new Error(`${name} is a symbolic link`)
    }
    if (entry.isDirectory()) {
      out.push(...collectMembers(absolutePath, realDistDir, name))
      continue
    }
    if (!entry.isFile()) {
      throw new Error(`${name} is not a regular file`)
    }

    const real = realpathSync(absolutePath)
    if (real !== realDistDir && !real.startsWith(realDistDir + sep)) {
      throw new Error(`${name} resolves to ${real}, outside the build output`)
    }
    out.push({ name, absolutePath })
  }
  return out
}

/**
 * Packages the app for submission to the Cytoscape App Store.
 *
 * **Opt-in, and off by default** (`appStoreZip: true`). It used to run on every
 * build, which is why stale `<appId>-<version>.zip` files accumulate in a
 * working tree.
 *
 * Order matters, and each step exists for a failure that has happened:
 *
 *  1. `buildStart` invalidates **this run's** final path. Writing to a temp file
 *     and renaming protects against a partial write; it does not stop last
 *     week's archive from sitting there looking current after a failed build.
 *     The guarantee is scoped exactly — *nothing stale or partial at the path
 *     THIS run computed, after a failure following `buildStart`* — and it does
 *     not extend to an earlier version's archive, which stays deliberately.
 *     There is no glob deletion: removing files this run cannot name is how a
 *     packager deletes a release someone still wanted.
 *  2. `closeBundle` verifies the build before packaging it, with the snapshot
 *     `defineCyWebApp` already took, so the identity checked and the identity
 *     written into the archive cannot come from two different reads.
 *  3. The build-machine path note is escalated. It is expected output from the
 *     MF SSR loader and harmless from CI on a fixed runner — but a developer
 *     ZIP is exactly the workstation case that note warns about, so it is said
 *     loudly here rather than buried in a verifier's notes.
 *  4. The walk rejects symlinks and anything that is not a regular file.
 *  5. Denies run before allows, over a closed extension list; unmatched is
 *     fatal, so a new file class is never uploaded by accident.
 *  6. Members are named as POSIX paths and sorted by one named comparator, so
 *     the same output produces the same archive on any platform.
 */
export const zipForAppStore = (input: AppStoreZipInput): Plugin => {
  const { appMeta, submissionMeta, expectedShared, sdkVersion } = input

  // Resolved from Vite rather than from this file's own location: the plugin
  // lives in node_modules, so `import.meta.url` says nothing about which app is
  // being built.
  let root = process.cwd()
  let outDir = 'dist'
  const finalPath = (): string =>
    resolve(root, `${appMeta.id}-${appMeta.version}.zip`)

  return {
    name: 'zip-for-app-store',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
    },

    buildStart() {
      rmSync(finalPath(), { force: true })
    },

    // closeBundle, not generateBundle: the files have to exist on disk to be
    // zipped, and generateBundle runs before anything is written.
    //
    // async, and adm-zip is imported HERE rather than at module scope. This
    // plugin is opt-in and off by default, so a static import would make every
    // consumer of this package install a dependency almost none of them use —
    // and carry its advisories in their tree for a feature they never turned
    // on. Loading it at the point of use is what lets adm-zip be an OPTIONAL
    // peer: present only for the builds that actually produce a zip.
    async closeBundle() {
      const { default: AdmZip } = await import('adm-zip').catch(() => {
        this.error(
          `[zip-for-app-store] appStoreZip is on but adm-zip is not installed. ` +
            `It is an optional peer dependency — run: npm install --save-dev adm-zip`,
        )
        // this.error throws; the return keeps the type checker honest.
        return { default: null as never }
      })

      const distDir = resolve(root, outDir)
      const zipPath = finalPath()

      // ── 2. Walk FIRST ──────────────────────────────────────────────────────
      // Before verification, not after. The verifier reads every .js file in the
      // output, and `readFileSync` on a FIFO blocks until a writer appears — so
      // a build output containing `assets/pipe.js` would hang the build rather
      // than reach the rejection this promises. Establishing that every member
      // is a plain file inside dist/ is what makes reading them safe.
      const realDistDir = realpathSync(distDir)
      let members: CollectedMember[]
      try {
        members = collectMembers(distDir, realDistDir)
      } catch (cause) {
        this.error(
          `[zip-for-app-store] ${outDir}/ contains something that is not a plain ` +
            `file inside it: ${(cause as Error).message}`,
        )
        return
      }

      // ── 3. Verify before packaging ──────────────────────────────────────────
      const verified = verifyBuild({ appMeta, expectedShared, distDir })
      if (verified.failures.length > 0) {
        this.error(
          `[zip-for-app-store] the build does not satisfy the federation contract, ` +
            `so it was not packaged:\n` +
            verified.failures.map((f) => `    ✗ ${f}`).join('\n'),
        )
      }

      // ── 4. The workstation case the verifier's note is really about ─────────
      for (const note of verified.notes) {
        if (note.includes('absolute build-machine path')) {
          this.warn(
            `[zip-for-app-store] this archive may disclose your username and ` +
              `directory layout — ${note}. Prefer a Store-owned build for a public release.`,
          )
        }
      }

      // ── 5. Classify ────────────────────────────────────────────────────────
      const publish: CollectedMember[] = []
      const unmatched: string[] = []
      const malformed: string[] = []
      const conflicts: string[] = []

      for (const member of members) {
        const problem = archiveMemberProblem(member.name)
        if (problem !== undefined) {
          malformed.push(`${member.name} ${problem}`)
          continue
        }
        const decision = classifyArchiveMember(member.name)
        if (decision.kind === 'publish') publish.push(member)
        else if (decision.kind === 'unmatched') unmatched.push(member.name)
        else if (decision.kind === 'conflict') conflicts.push(member.name)
      }

      if (malformed.length > 0) {
        this.error(
          `[zip-for-app-store] ${outDir}/ contains member names that are not ` +
            `portable archive paths:\n` +
            malformed.map((m) => `    ${m}`).join('\n'),
        )
      }
      if (conflicts.length > 0) {
        this.error(
          `[zip-for-app-store] ${outDir}/${CY_MANIFEST_FILENAME} already exists. ` +
            `The submission manifest is GENERATED from package.json and injected ` +
            `here; a second one in the build output would be ambiguous.`,
        )
      }
      if (unmatched.length > 0) {
        this.error(
          `[zip-for-app-store] ${outDir}/ contains files no publish class covers:\n` +
            unmatched.map((f) => `    ${f}`).join('\n') +
            `\n  Classify them before shipping — failing is deliberate, so a ` +
            `new file class is never uploaded by accident.`,
        )
      }

      // ── The manifest itself ────────────────────────────────────────────────
      let manifestBytes: string
      let warnings: readonly string[]
      try {
        const built = buildCyManifest(appMeta, submissionMeta, sdkVersion)
        manifestBytes = serializeCyManifest(built.manifest)
        warnings = built.warnings
      } catch (cause) {
        this.error(`[zip-for-app-store] ${(cause as Error).message}`)
        return
      }
      for (const warning of warnings)
        this.warn(`[zip-for-app-store] ${warning}`)

      // ── 6. Write, deterministically, through a temp file beside the target ──
      // noSort, because adm-zip's default is
      // `entryName.toLowerCase().localeCompare(...)` — and `localeCompare`
      // depends on the host's ICU data, so the same build could produce
      // differently ordered archives on two machines. The order is ours to
      // decide, and `compareMemberNames` decides it.
      const zip = new AdmZip(undefined, { noSort: true })
      const named: { name: string; bytes: Buffer }[] = publish.map((m) => ({
        name: m.name,
        bytes: readFileSync(m.absolutePath),
      }))
      named.push({
        name: CY_MANIFEST_FILENAME,
        bytes: Buffer.from(manifestBytes, 'utf8'),
      })
      named.sort((a, b) => compareMemberNames(a.name, b.name))

      // addFile, not addLocalFile: the member NAME is ours to decide, and
      // addLocalFile derives it from the host filesystem's separator.
      for (const { name, bytes } of named) zip.addFile(name, bytes)

      // Beside the destination, never in an OS temp directory: a rename across
      // filesystems fails with EXDEV.
      const tempPath = `${zipPath}.tmp-${process.pid}-${Date.now()}`
      try {
        zip.writeZip(tempPath)
        renameSync(tempPath, zipPath)
      } catch (cause) {
        rmSync(tempPath, { force: true })
        this.error(
          `[zip-for-app-store] could not write ${zipPath} — ${(cause as Error).message}`,
        )
        return
      }

      this.info(
        `[zip-for-app-store] ${appMeta.id}-${appMeta.version}.zip — ` +
          `${named.length} files including ${CY_MANIFEST_FILENAME}, ready to upload`,
      )
    },
  }
}
