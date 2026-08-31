// The command-line grammar.
//
// Small, but a contract: a script that pipes `cyweb-app manifest` into a file
// depends on the exit codes and on stdout carrying JSON and nothing else. These
// run without spawning a process, so the exhaustive matrix is cheap and the
// child-process suite can stay focused on what only a real process shows.

import { describe, expect, it } from 'vitest'

import { parseCommandLine } from '../src/cli/args.js'

const kindOf = (...argv: string[]): string => parseCommandLine(argv).kind

describe('global flags', () => {
  it.each([['--help'], ['-h']])('%s prints usage', (flag) => {
    expect(kindOf(flag)).toBe('help')
  })

  it.each([['--version'], ['-v']])('%s prints the version', (flag) => {
    // -h and -v are existing public behaviour. Dropping them would be a CLI
    // break for anyone who has typed them into a script.
    expect(kindOf(flag)).toBe('version')
  })

  it('takes precedence over a command, and rejects company', () => {
    // A command line asking for two different things is a mistake, not a
    // preference to be guessed at.
    expect(kindOf('verify', '--help')).toBe('usage')
    expect(kindOf('--version', 'manifest')).toBe('usage')
    expect(kindOf('--help', '--root', '.')).toBe('usage')
  })

  it('shows usage when given nothing at all', () => {
    expect(kindOf()).toBe('help')
  })
})

describe('commands', () => {
  it('accepts the two it has', () => {
    expect(kindOf('verify')).toBe('verify')
    expect(kindOf('manifest')).toBe('manifest')
  })

  it.each([['build'], ['package'], ['--root'], ['']])('rejects %j as a command', (command) => {
    expect(kindOf(command)).toBe('usage')
  })
})

describe('flag grammar', () => {
  it('rejects an unknown flag', () => {
    expect(kindOf('manifest', '--nope')).toBe('usage')
  })

  it('rejects a singleton flag given twice', () => {
    // parseArgs silently keeps the last one, so `--out a --out b` would write
    // one of them and say nothing about the other.
    const result = parseCommandLine(['manifest', '--out', 'a.json', '--out', 'b.json'])
    expect(result.kind).toBe('usage')
    expect(result.kind === 'usage' && result.message).toContain('more than once')
  })

  it('allows the one repeatable flag, which is existing public behaviour', () => {
    const result = parseCommandLine([
      'verify', '--expect-expose', './AppConfig', '--expect-expose', './Menu',
    ])
    expect(result.kind === 'verify' && result.expectExposes).toEqual(['./AppConfig', './Menu'])
  })

  it('rejects a value that is really the next flag', () => {
    // parseArgs calls the space form ambiguous on its own.
    expect(kindOf('manifest', '--root', '--out', 'x.json')).toBe('usage')
  })

  it('rejects a flag-shaped value given explicitly with =', () => {
    // parseArgs accepts `--root=--out` without complaint — the value is
    // unambiguous, just almost certainly a mistake — so this one is ours.
    const result = parseCommandLine(['manifest', '--root=--out'])
    expect(result.kind).toBe('usage')
    expect(result.kind === 'usage' && result.message).toContain('as its value')
  })

  it('rejects a flag that needs a value and has none', () => {
    expect(kindOf('manifest', '--root')).toBe('usage')
  })

  it('rejects --force without --out, which would do nothing', () => {
    const result = parseCommandLine(['manifest', '--force'])
    expect(result.kind).toBe('usage')
    expect(result.kind === 'usage' && result.message).toContain('does nothing without --out')
  })

  it('rejects a positional argument', () => {
    expect(kindOf('manifest', 'somewhere')).toBe('usage')
  })
})

describe('what each command carries', () => {
  it('leaves an unspecified path undefined rather than inventing a default', () => {
    // The default for --dist is <root>/dist and belongs to verifyApp, which
    // knows the root. Defaulting here would lose that.
    const result = parseCommandLine(['verify'])
    expect(result).toEqual({ kind: 'verify', root: undefined, dist: undefined, expectExposes: [] })
  })

  it('carries manifest options through', () => {
    expect(parseCommandLine(['manifest', '--root', 'app', '--out', 'm.json', '--force'])).toEqual({
      kind: 'manifest',
      root: 'app',
      out: 'm.json',
      force: true,
    })
  })
})
