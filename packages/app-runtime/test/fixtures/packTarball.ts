import { execFileSync } from 'node:child_process'

/**
 * `npm pack` into `destination`, returning the tarball's filename.
 *
 * Spawning npm is not portable, and both ways of getting it wrong appeared on
 * the Windows runner: `execFileSync('npm', …)` fails with ENOENT because npm is
 * `npm.cmd` there, and `execFileSync('npm.cmd', …)` fails with EINVAL because
 * Node refuses to spawn a `.cmd` without a shell — the fix for the Windows
 * argument-injection CVE.
 *
 * So the shell is avoided entirely where it can be: npm sets `npm_execpath` to
 * its own JS entry point when it runs a script, and running THAT with the
 * current Node binary is a plain executable spawn on every platform. The shell
 * fallback exists only for a runner invoked outside `npm run`.
 */
export const packTarball = (packageRoot: string, destination: string): string => {
  const args = ['pack', '--pack-destination', destination, '--silent']
  const cli = process.env.npm_execpath

  const output =
    cli !== undefined && cli.endsWith('.js')
      ? execFileSync(process.execPath, [cli, ...args], {
          cwd: packageRoot,
          encoding: 'utf8',
        })
      : execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
          cwd: packageRoot,
          encoding: 'utf8',
          shell: process.platform === 'win32',
        })

  return output.trim().split('\n').at(-1) as string
}
