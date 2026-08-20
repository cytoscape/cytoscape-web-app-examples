/**
 * Whether to prompt, or take the defaults.
 *
 * Its own module because `index.ts` runs the CLI at import time, so nothing in
 * it can be imported by a test — and this is the decision most worth pinning.
 */

/**
 * True only when someone is present to answer.
 *
 * `--yes` is the explicit way to skip the prompts. The TTY check is the one
 * that matters in practice: the Quick Start is a three-line block, and pasting
 * it fed `cd my-app` and `npm run dev` to the prompts as *answers* before
 * exiting on an unsettled await with stdin exhausted. The person who hit that
 * read it as the package not being installed, which is how illegible it was
 * (issue #6).
 *
 * Prompting into a pipe cannot work. Taking the defaults can, and leaves the
 * rest of a pasted block for the shell to run.
 */
export const isInteractive = (
  yes: boolean,
  stdin: { isTTY?: boolean } = process.stdin,
): boolean => yes === false && stdin.isTTY === true
