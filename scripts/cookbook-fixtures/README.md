# Cookbook generator fixtures

`node scripts/cookbook-index.mjs --selftest` reads these to prove that each of
the generator's checks can fail.

- `ok/` is a small, complete cookbook tree with nothing wrong. It is the
  control: it must produce no problem.
- Every other directory holds only what differs from `ok/`: one changed file,
  or a `remove.txt` naming a file to leave out. The self-test lays it over a
  copy of `ok/` and expects exactly the problem codes in its `expect.txt`.

These files are never type-checked or bundled. They are read as text by the
generator, the same way it reads the real recipes.
