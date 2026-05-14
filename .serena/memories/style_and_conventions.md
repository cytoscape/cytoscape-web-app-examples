# Style and Conventions

## Code Formatting (Prettier)

- No semicolons
- Single quotes
- Trailing commas (all)
- 2-space indentation
- 80-char line width

Config: `.prettierrc.json` at repo root (shared by all apps)

## TypeScript / ESLint

- `@typescript-eslint/no-explicit-any` is **OFF** — `any` is permitted (and used intentionally for Zustand store selectors)
- `@typescript-eslint/no-unused-vars` is WARN
- `react/react-in-jsx-scope` is OFF — **never add `import React from 'react'`**
- `noImplicitAny: true`, `strictNullChecks: true` in tsconfig
- `jsx: "react-jsx"` — new transform

Config: `.eslintrc.json` at repo root

## Component Conventions

- Functional components only
- Panel components receive `{ message: string }` prop
- Menu components receive `{ handleClose: () => void }` prop
- No `console.log` in committed code

## Module Federation Conventions

- `singleton: true` is **required** for `react`, `react-dom`, `@mui/material`
- Each app has a unique federation `name` (camelCase) and a unique dev port
- `remotes.d.ts` must declare every `cyweb/*` module used in source
- `publicPath: 'auto'` in webpack output

## API Patterns

- All host App API functions return `ApiResult<T>` — always check `result.success`
- Host store selectors: `useXxxStore((state: any) => state.field)`
- New App API (`cyweb/XxxApi`) available only on `new-app-api` branch

## File Naming

- App config: `<Name>App.tsx`
- Panel component: `<Name>Panel.tsx`
- Menu component: `<Name>Menu.tsx` or `<Name>MenuItem.tsx`
- Entry point: always `index.ts`
- Type declarations: always `remotes.d.ts`
