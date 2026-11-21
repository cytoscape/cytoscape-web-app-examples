import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // templates/ holds FILES THAT ARE COPIED into generated projects, including
    // their smoke tests. They are inputs, not tests of this package: run here
    // they resolve nothing and fail for reasons that say nothing about the
    // scaffolder. Whether they work is proved by scaffolding and building them,
    // which is what the acceptance job does.
    exclude: ['templates/**', 'node_modules/**', 'dist/**'],
  },
})
