import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseAppMeta, parseSubmissionMeta, readPackageSnapshot } from '../vite/appMeta.js'
import { buildCyManifest, serializeCyManifest } from '../vite/cyManifest.js'

/**
 * `cyweb-app manifest` — the submission manifest, without building an archive.
 *
 * The App Store's build-from-GitHub path never runs `build:zip`, so without a
 * non-ZIP entry point it could not obtain a manifest at all. It shares the
 * builder and, more importantly, the SERIALIZER with the packager: the archive
 * copy and this one are compared byte for byte, and two callers of
 * `JSON.stringify` with different spacing would pass an object comparison and
 * fail a real one.
 *
 * **stdout carries JSON and nothing else** — readiness warnings, diagnostics and
 * anything else a human wants go to stderr, so `cyweb-app manifest > file` is a
 * usable thing to type. With `--out`, stdout is empty.
 */

/** This package's own version, for the manifest's `generator`. */
const sdkVersion = (): string =>
  (
    JSON.parse(
      readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
    ) as { version: string }
  ).version

export interface ManifestCommand {
  readonly root?: string
  readonly out?: string
  readonly force: boolean
  /** Injected so the tests do not have to chdir a whole process. */
  readonly cwd?: string
}

export interface ManifestOutcome {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: 0 | 1
}

/**
 * `--out` is deliberately unrestricted.
 *
 * It is a path the developer types, not one derived from untrusted package
 * metadata, so it is treated like a shell redirect: any destination, with
 * `--force` as an explicit user-authorized overwrite. An earlier revision
 * refused two specific basenames and called that containment — partial
 * protection described as containment is worse than none, so it is gone.
 *
 * What remains are the surprises rather than the permissions: an existing file
 * is not overwritten silently, a symlink is not written THROUGH, and a missing
 * parent directory is reported rather than created.
 */
const writeProblem = (destination: string, force: boolean): string | undefined => {
  const parent = dirname(destination)
  if (!existsSync(parent)) {
    return `${parent} does not exist — cyweb-app does not create directories`
  }
  // An ancestor symlink means the path the developer typed is not the path that
  // gets written, which is exactly the kind of surprise --force should not buy.
  if (realpathSync(parent) !== parent) {
    return `${parent} resolves to ${realpathSync(parent)} — refusing to write through a symbolic link`
  }
  if (existsSync(destination) || lstatSafe(destination) !== undefined) {
    if (lstatSafe(destination)?.isSymbolicLink() === true) {
      return `${destination} is a symbolic link — refusing to write through it`
    }
    if (!force) return `${destination} already exists — pass --force to overwrite it`
  }
  return undefined
}

const lstatSafe = (path: string): ReturnType<typeof lstatSync> | undefined => {
  try {
    return lstatSync(path)
  } catch {
    return undefined
  }
}

export const runManifest = (command: ManifestCommand): ManifestOutcome => {
  const cwd = command.cwd ?? process.cwd()
  const root = resolve(cwd, command.root ?? '.')

  let text: string
  let warnings: readonly string[]
  try {
    const snapshot = readPackageSnapshot(root)
    const built = buildCyManifest(
      parseAppMeta(snapshot),
      parseSubmissionMeta(snapshot),
      sdkVersion(),
    )
    text = serializeCyManifest(built.manifest)
    warnings = built.warnings
  } catch (cause) {
    return { stdout: '', stderr: `${(cause as Error).message}\n`, exitCode: 1 }
  }

  const stderr = warnings.map((w) => `  · ${w}\n`).join('')

  if (command.out === undefined) return { stdout: text, stderr, exitCode: 0 }

  const destination = resolve(cwd, command.out)
  const problem = writeProblem(destination, command.force)
  if (problem !== undefined) {
    return { stdout: '', stderr: `${stderr}${problem}\n`, exitCode: 1 }
  }

  // Beside the destination, never an OS temp directory: a rename across
  // filesystems fails with EXDEV.
  const temp = `${destination}.tmp-${process.pid}-${Date.now()}`
  try {
    writeFileSync(temp, text, 'utf8')
    renameSync(temp, destination)
  } catch (cause) {
    rmSync(temp, { force: true })
    return {
      stdout: '',
      stderr: `${stderr}could not write ${destination} — ${(cause as Error).message}\n`,
      exitCode: 1,
    }
  }
  return { stdout: '', stderr, exitCode: 0 }
}
