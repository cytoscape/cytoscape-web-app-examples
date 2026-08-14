# Phase 0 Baseline — pre-SDK build output

> Captured before any SDK work. **Phase 1's exit criterion compares against this**:
> the built `mf-manifest.json` audit fields must match, except for
> `configuredRuntimePlugins`, whose path moves from the app into the package.
>
> Checklist: [app-sdk-checklist.md](app-sdk-checklist.md) Phase 0.

## Provenance

| | |
| --- | --- |
| Commit | `2e91020535fa64b5e63d28ab0e55009991607034` |
| Command | `npm run build` (all five workspaces), then `npm run verify:federation` |
| `@cytoscape-web/api-types` installed | `1.0.0-beta.3` |
| Node | `v24.13.1` |

## Per-app totals

Sizes cover the whole `dist/`, including the SSR files that `copy-dist` excludes
from the publish set — the comparison is "did the migration change the output",
so it must not be narrowed to the published subset.

| App | Federation name | `verify:federation` checks | raw | gzip | files |
| --- | --- | ---: | ---: | ---: | ---: |
| `hello-world` | `hello` | 27 | 186,917 | 55,610 | 25 |
| `network-statistics` | `networkStatistics` | 16 | 115,662 | 39,988 | 17 |
| `network-workflows` | `networkWorkflows` | 26 | 146,103 | 48,853 | 25 |
| `project-template` | `template` | 26 | 142,268 | 47,618 | 23 |
| `claude-bridge` | `claudeBridge` | 26 | 136,885 | 45,807 | 21 |
| **total** | | | **727,835** | **237,876** | **111** |

`network-statistics` reports **16** checks rather than 26 because it shares
nothing, so the per-package share assertions have nothing to assert.

## Audit fields

Paths in `configuredRuntimePlugins` are normalized to `<REPO>/`. The raw
manifests embed the absolute build-machine path — home directory and username —
which is why they are not committed. After Phase 1 these entries should read
`<REPO>/node_modules/@cytoscape-web/app-runtime/...`; **everything else in this
block must be unchanged.**

```json
{
  "hello-world": {
    "federationName": "hello",
    "configuredShared": {
      "react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "react-dom": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "@mui/material": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^5.18.0"
      },
      "@emotion/react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      },
      "@emotion/styled": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      }
    },
    "configuredRemote": {
      "type": "module",
      "name": "cyweb",
      "entryGlobalName": "cyweb",
      "shareScope": "default",
      "entry": "cyweb:__CYWEB_HOST_REQUIRED__"
    },
    "configuredRuntimePlugins": [
      "<REPO>/hello-world/src/mfRuntimePlugin.ts"
    ],
    "exposeKeys": [
      "AppConfig",
      "NetworkSummaryMenuItem"
    ],
    "effectiveSharedKeys": [
      "@emotion/react",
      "@emotion/styled",
      "@mui/material",
      "react",
      "react-dom",
      "react/jsx-runtime"
    ]
  },
  "network-statistics": {
    "federationName": "networkStatistics",
    "configuredShared": {},
    "configuredRemote": {
      "type": "module",
      "name": "cyweb",
      "entryGlobalName": "cyweb",
      "shareScope": "default",
      "entry": "cyweb:__CYWEB_HOST_REQUIRED__"
    },
    "configuredRuntimePlugins": [
      "<REPO>/network-statistics/src/mfRuntimePlugin.ts"
    ],
    "exposeKeys": [
      "AppConfig"
    ],
    "effectiveSharedKeys": []
  },
  "network-workflows": {
    "federationName": "networkWorkflows",
    "configuredShared": {
      "react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "react-dom": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "@mui/material": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^5.18.0"
      },
      "@emotion/react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      },
      "@emotion/styled": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      }
    },
    "configuredRemote": {
      "type": "module",
      "name": "cyweb",
      "entryGlobalName": "cyweb",
      "shareScope": "default",
      "entry": "cyweb:__CYWEB_HOST_REQUIRED__"
    },
    "configuredRuntimePlugins": [
      "<REPO>/network-workflows/src/mfRuntimePlugin.ts"
    ],
    "exposeKeys": [
      "AppConfig"
    ],
    "effectiveSharedKeys": [
      "@emotion/react",
      "@emotion/styled",
      "@mui/material",
      "react",
      "react-dom",
      "react/jsx-runtime"
    ]
  },
  "project-template": {
    "federationName": "template",
    "configuredShared": {
      "react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "react-dom": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "@mui/material": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^5.18.0"
      },
      "@emotion/react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      },
      "@emotion/styled": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      }
    },
    "configuredRemote": {
      "type": "module",
      "name": "cyweb",
      "entryGlobalName": "cyweb",
      "shareScope": "default",
      "entry": "cyweb:__CYWEB_HOST_REQUIRED__"
    },
    "configuredRuntimePlugins": [
      "<REPO>/project-template/src/mfRuntimePlugin.ts"
    ],
    "exposeKeys": [
      "AppConfig"
    ],
    "effectiveSharedKeys": [
      "@emotion/react",
      "@emotion/styled",
      "@mui/material",
      "react",
      "react-dom",
      "react/jsx-runtime"
    ]
  },
  "claude-bridge": {
    "federationName": "claudeBridge",
    "configuredShared": {
      "react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "react-dom": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^18.3.1"
      },
      "@mui/material": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^5.18.0"
      },
      "@emotion/react": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      },
      "@emotion/styled": {
        "singleton": true,
        "import": false,
        "requiredVersion": "^11.10.4"
      }
    },
    "configuredRemote": {
      "type": "module",
      "name": "cyweb",
      "entryGlobalName": "cyweb",
      "shareScope": "default",
      "entry": "cyweb:__CYWEB_HOST_REQUIRED__"
    },
    "configuredRuntimePlugins": [
      "<REPO>/claude-bridge/src/mfRuntimePlugin.ts"
    ],
    "exposeKeys": [
      "AppConfig"
    ],
    "effectiveSharedKeys": [
      "@emotion/react",
      "@emotion/styled",
      "@mui/material",
      "react",
      "react-dom",
      "react/jsx-runtime"
    ]
  }
}
```
