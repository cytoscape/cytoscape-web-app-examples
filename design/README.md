# Design Documentation

Design and specification documents for `cytoscape-web-app-examples`.

> This directory is **not** served by GitHub Pages. For the deployed examples, see [`docs/`](../docs/).

## Structure

```
design/
├── specifications/     ← Cross-cutting specs (API contracts, shared conventions)
│   ├── vite-migration/                  ← Webpack → Vite migration
│   │   ├── vite-migration.md            ← The plan: design, decisions, measurements
│   │   └── vite-migration-checklist.md  ← Phase-by-phase implementation checklist
│   ├── developer-onboarding/            ← Lowering the barrier to entry
│   │   ├── developer-onboarding-roadmap.md  ← Umbrella: prioritized proposals, host-dependency split
│   │   └── entry-point-checklist.md     ← README + guides vs reality; fixes the contract first
│   ├── app-sdk/                         ← Carved out of the roadmap: SDK + scaffolding
│   │   ├── app-sdk-design.md            ← app-runtime, create-cytoscape-app, app identity
│   │   ├── app-sdk-checklist.md         ← Phase-by-phase implementation checklist
│   │   ├── phase0-baseline.md           ← Pre-SDK build output, what Phase 1 was graded against
│   │   └── phase6-release-runbook.md    ← Manual publish procedure for the Preview
│   └── remote-dev-host/                 ← Shared hosts for local app development (HOST changes)
│       └── remote-dev-host-checklist.md ← dev1 first, then production; browser permission + origin policy
└── apps/               ← Per-app design documents
    ├── hello-world/
    ├── network-workflows/
    └── project-template/
```

Multi-document efforts get **a subdirectory under `specifications/`** named for
the project, so the plan and its checklist stay together.

## Intended Audience

- **LLM agents** — Read `specifications/` before implementing or updating examples. Read the relevant `apps/<name>/` doc before modifying a specific app.
- **Human developers** — Use these docs to understand design intent before reading source code.

## Conventions

- Keep docs concise. Link to source files rather than duplicating code.
- Update the relevant doc when you change the design of an app.
- Cross-cutting decisions (e.g., shared API patterns, port assignments) go in `specifications/`.
- App-specific decisions (e.g., what a panel renders, what menu actions do) go in `apps/<name>/`.
