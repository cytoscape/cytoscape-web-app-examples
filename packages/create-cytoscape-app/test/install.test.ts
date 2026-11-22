// How the scaffolder starts the package manager.
//
// On Windows, npm and pnpm are `.cmd` shims, which spawnSync cannot start
// without a shell. The scaffolder used to spawn `npm` with `['install']` on
// every platform, so on Windows it wrote the project and then exited 1. Found
// in the review of #32.
//
// This file is kept apart so that the Windows CI job can run it alone: the
// last case starts a real install, and only a Windows runner shows that the
// Windows shape works.

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { installCommand } from '../src/scaffold.js'

describe('the install command', () => {
  it.each(['npm', 'pnpm'] as const)('runs %s directly off Windows', (pm) => {
    for (const platform of ['linux', 'darwin'] as const) {
      expect(installCommand(pm, platform)).toEqual({
        command: pm,
        args: ['install'],
        shell: false,
      })
    }
  })

  it.each(['npm', 'pnpm'] as const)(
    'runs %s through the shell on Windows',
    (pm) => {
      // One string and no argument array: arguments next to `shell: true` reach
      // the shell unescaped, which Node deprecates (DEP0190).
      expect(installCommand(pm, 'win32')).toEqual({
        command: `${pm} install`,
        args: [],
        shell: true,
      })
    },
  )

  it('starts npm on this platform, in a directory with a space', () => {
    // A project with no dependencies, so the install needs no registry. The
    // space is in the cwd, which the shell does not parse on any platform.
    const dir = join(mkdtempSync(join(tmpdir(), 'cca-install-')), 'with space')
    mkdirSync(dir)
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'empty', version: '1.0.0', private: true }),
    )

    const { command, args, shell } = installCommand('npm')
    const { status, error } = spawnSync(command, args, {
      cwd: dir,
      stdio: 'pipe',
      shell,
    })
    expect(error).toBeUndefined()
    expect(status).toBe(0)
  }, 60_000)
})
