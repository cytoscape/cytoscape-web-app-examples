# Design Documentation

Design and specification documents for `cytoscape-web-app-examples`.

> This directory is **not** served by GitHub Pages. For the deployed examples, see [`docs/`](../docs/).

## Structure

```
design/
├── specifications/     ← Cross-cutting specs (API contracts, shared conventions)
└── apps/               ← Per-app design documents
    ├── hello-world/
    ├── network-workflows/
    ├── simple-menu/
    ├── simple-panel/
    └── project-template/
```

## Intended Audience

- **LLM agents** — Read `specifications/` before implementing or updating examples. Read the relevant `apps/<name>/` doc before modifying a specific app.
- **Human developers** — Use these docs to understand design intent before reading source code.

## Conventions

- Keep docs concise. Link to source files rather than duplicating code.
- Update the relevant doc when you change the design of an app.
- Cross-cutting decisions (e.g., shared API patterns, port assignments) go in `specifications/`.
- App-specific decisions (e.g., what a panel renders, what menu actions do) go in `apps/<name>/`.
