import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Packs the package once for the whole run: see test/globalSetup.ts.
    globalSetup: ['./test/globalSetup.ts'],
  },
})
