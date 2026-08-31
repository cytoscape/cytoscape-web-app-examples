import { parseArgs } from 'node:util'

/**
 * The command line, parsed into something the CLI can act on — and nothing else.
 *
 * Separate from the CLI so the grammar can be tested without spawning a process
 * for every case. The grammar is small but it is a contract: a script that pipes
 * `cyweb-app manifest` into a file depends on exit codes and on stdout carrying
 * JSON and nothing else.
 *
 * `parseArgs` does the parsing, but two rules it does not enforce are enforced
 * here, because both fail silently otherwise:
 *
 *   - **a value may not begin with `--`.** `parseArgs` happily reads
 *     `--root --out x` as `--root` with the value `"--out"`, and the developer
 *     gets a confusing "cannot read package.json" instead of a usage error.
 *   - **a singleton flag may appear at most once.** `parseArgs` silently keeps
 *     the last occurrence, so `--out a.json --out b.json` writes one of them and
 *     says nothing about the other.
 */

export const USAGE = `cyweb-app — Cytoscape Web app tools

  cyweb-app verify [options]      check a built app against the federation contract
  cyweb-app manifest [options]    print the App Store submission manifest

verify
  --root <dir>          app directory to read package.json from (default: .)
  --dist <dir>          build output to read (default: <root>/dist)
  --expect-expose <p>   an expose the app must declare, repeatable. Without any,
                        only the mandatory ./AppConfig is asserted

manifest
  --root <dir>          app directory to read package.json from (default: .)
  --out <file>          write the manifest here instead of printing it
  --force               overwrite an existing --out destination

Options taking a path are resolved against the current directory, except the
default --dist, which is <root>/dist.

  --version, -v         print the SDK version
  --help, -h            this text
`

export type Invocation =
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
  | { readonly kind: 'usage'; readonly message: string }
  | {
      readonly kind: 'verify'
      readonly root?: string
      readonly dist?: string
      readonly expectExposes: readonly string[]
    }
  | {
      readonly kind: 'manifest'
      readonly root?: string
      readonly out?: string
      readonly force: boolean
    }

const GLOBAL = new Set(['--help', '-h', '--version', '-v'])

/** Repeatable by design; every other flag is a singleton. */
const REPEATABLE = new Set(['--expect-expose'])

const duplicateFlag = (argv: readonly string[]): string | undefined => {
  const seen = new Set<string>()
  for (const token of argv) {
    if (!token.startsWith('-') || REPEATABLE.has(token)) continue
    if (seen.has(token)) return token
    seen.add(token)
  }
  return undefined
}

const valueLooksLikeFlag = (
  values: Record<string, string | boolean | (string | boolean)[] | undefined>,
): string | undefined => {
  for (const [name, value] of Object.entries(values)) {
    const list = Array.isArray(value) ? value : [value]
    for (const item of list) {
      if (typeof item === 'string' && item.startsWith('--')) {
        return `--${name} was given "${item}" as its value`
      }
    }
  }
  return undefined
}

export const parseCommandLine = (argv: readonly string[]): Invocation => {
  // `--help` and `--version` win over anything else, and reject company: a
  // command line that asks for two different things is a mistake, not a
  // preference to be guessed at.
  const globals = argv.filter((token) => GLOBAL.has(token))
  if (globals.length > 0) {
    if (argv.length > 1) {
      return { kind: 'usage', message: `${globals[0]} takes no other arguments` }
    }
    return globals[0] === '--version' || globals[0] === '-v'
      ? { kind: 'version' }
      : { kind: 'help' }
  }

  if (argv.length === 0) return { kind: 'help' }

  const [command, ...rest] = argv
  if (command !== 'verify' && command !== 'manifest') {
    return { kind: 'usage', message: `unknown command "${command}"` }
  }

  const duplicate = duplicateFlag(rest)
  if (duplicate !== undefined) {
    return { kind: 'usage', message: `${duplicate} was given more than once` }
  }

  const config: Record<string, { type: 'string' | 'boolean'; multiple?: boolean }> =
    command === 'verify'
      ? {
          root: { type: 'string' as const },
          dist: { type: 'string' as const },
          'expect-expose': { type: 'string' as const, multiple: true },
        }
      : {
          root: { type: 'string' as const },
          out: { type: 'string' as const },
          force: { type: 'boolean' as const },
        }

  let values: Record<string, string | boolean | (string | boolean)[] | undefined>
  try {
    ;({ values } = parseArgs({ args: [...rest], options: config, strict: true }) as {
      values: Record<string, string | boolean | (string | boolean)[] | undefined>
    })
  } catch (cause) {
    return { kind: 'usage', message: (cause as Error).message }
  }

  const looksLikeFlag = valueLooksLikeFlag(values)
  if (looksLikeFlag !== undefined) {
    return { kind: 'usage', message: looksLikeFlag }
  }

  if (command === 'verify') {
    return {
      kind: 'verify',
      root: values.root as string | undefined,
      dist: values.dist as string | undefined,
      expectExposes: (values['expect-expose'] as string[] | undefined) ?? [],
    }
  }

  const out = values.out as string | undefined
  const force = values.force === true
  if (force && out === undefined) {
    return { kind: 'usage', message: `--force does nothing without --out` }
  }
  return { kind: 'manifest', root: values.root as string | undefined, out, force }
}
