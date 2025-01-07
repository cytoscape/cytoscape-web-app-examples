# Apps for _Cytoscape Web_

**App developer's guide for Cytoscape Web v1**

January 2025

## Example Apps

- https://cytoscape.org/cytoscape-web-app-examples/

## Introduction

Cytoscape Web has a built-in app hosting mechanism that allows developers to
extend its functionality and user interface. This repository contains
reference implementations demonstrating basic app development patterns,
including:

- Example apps showcasing menu items, panels, and network manipulation
- Detailed explanations of **Module Federation** parameters used in app configuration
- Step-by-step guide for creating new apps using the provided template

Each example includes source code and documentation to help you understand how to:

- Implement custom UI components
- Configure Webpack setting files for Module Federation
- Deploy your apps to your own web servers

Whether you're building your first Cytoscape Web app or looking for
implementation patterns, these examples will help you get started quickly.

### App Integration with Module Federation

Cytoscape Web uses Webpack's [Module Federation](https://webpack.js.org/concepts/module-federation/)
to dynamically load external apps at runtime. Here's how it works:

1. **Module Federation**: This Webpack feature allows multiple independent
   bundles to form a single application:

   - Apps expose their components as remote modules
   - The host (Cytoscape Web) loads these modules at runtime
   - Shared dependencies are managed automatically

2. **App Loading Process**:

   - Cytoscape Web maintains a whitelist of approved apps
   - When started, it checks the whitelist and loads approved apps
   - Each app is loaded through its `remoteEntry.js` file

3. **Data Model Access**:
   - Core data models are exposed as shared modules
   - Apps can access data stores for network data, styles, and layouts
   - Changes made by apps are reflected in real-time

This architecture ensures secure and efficient integration of external apps
while maintaining data consistency.

## Overview Of this repository

This repository contains several example apps and utilities organized as follows:

### Repository Structure

This repository is managed as an npm workspace, allowing multiple apps to share common dependencies and build configurations. The workspace is organized as follows:

```bash
.
├── package.json         # NPM Workspace root configuration
├── docs/                # Bundled apps deployed to this server
├── hello-world/         # Example app 1: hello-world
│   ├── package.json     # App-specific dependencies
│   └── src/
├── simple-menu/         # Example app 2: simple-menu
│   ├── package.json
│   └── src/
├── simple-panel/        # Example app 3: simple-panel
│   ├── package.json
│   └── src/
└── project-template/    # Template project directory for new apps
    ├── package.json
    └── src/
```

All apps can be built and run simultaneously using workspace-level commands.

To run all example apps locally, you need to run the following:

```bash
npm install    # Installs dependencies for all apps
npm run dev    # Starts development servers for all apps
```

To build all example apps bundles locally, you need to run:

```bash
npm run build  # Builds all apps
```

Each app can also be developed independently in its directory:

```bash
cd hello-world
npm run dev    # Starts only hello-world app
```

### Example Apps

These are the actual apps

- **[hello-world/](hello-world/)** - Basic example showing menu and panel integration

  - Components: `MenuExample`, `HelloPanel`
  - Entry point: `hello@http://localhost:2222/remoteEntry.js`
  - Demo: Basic menu and panel functionality

- **[simple-menu/](simple-menu/)** - Example for adding menu items

  - Components: `AppMenuItem`
  - Demonstrates menu integration under App menu

- **[simple-panel/](simple-panel/)** - Example for creating custom panels
  - Components: `SimplePanel`
  - Shows panel creation and network data access

### Developer Resources

- **[project-template/](project-template/)** - Template for creating new apps

  - Contains basic app structure and configuration
  - Ready-to-use webpack and TypeScript setup

- **[docs/](docs/)** - Built examples and documentation
  - Contains compiled versions of each example app
  - Deployment target for GitHub Pages

### Build Configuration

Each app follows a standard structure:

- `src/` - Source code and components
- `package.json` - App configuration and scripts
- `webpack.config.js` - Module Federation setup
- `tsconfig.json` - TypeScript configuration

The apps use Module Federation to integrate with Cytoscape Web as remote modules.

## Quick Start

### Prerequisite

- Node.js (LTS)
- Supported Web Browser
  - Chrome
  - Safari
  - Firefox
  - Edge

### Run Example Apps

To run all of the apps locally, you need to checkout the Cytoscape Web code base
because the public version has its official approved list of apps and if you need
to run your own versions of Apps, you need to update the list stored in a config file.

1. Checkout Cytoscape Web
2. type:

`npm run dev`

## Example Apps

This repository contains three example applications and one project template for creating new apps. Each example demonstrates different aspects of Cytoscape Web app development - from basic menu integration to custom panel creation and network manipulation. The following sections explain how these apps work and their implementation details.

### hello-world

...existing code...

### hello-world

- App ID: hello
- Description: This app adds one menu item (MenuExample) and a panel (HelloPanel).
- Entry Point: hello@http://localhost:2222/remoteEntry.js
- Source: HelloApp.tsx

### simple-menu

- Description: This app adds a menu item under the App menu in the menu bar.
- Source: SimpleMenuApp.tsx

### simple-panel

- Description: This app demonstrates how to add a custom panel to Cytoscape Web.
- Source: SimplePanelApp.tsx

# App Developer's Guide

## How to build and deploy

To build the apps, run:

To deploy the apps, run:

# Create a new App

To create a new app from the project-template:

Copy the project-template folder and rename it to your desired app name.
Update the name and description fields in the package.json file.
Implement your app logic in the src/ folder.
Update the webpack.config.js if necessary.
Build and run your new app using the following commands:
Your new app will be available at http://localhost:2222/remoteEntry.js. ```

## Module Federation Parameters

Module Federation is a mechanism in Webpack that allows multiple independent builds to form a single application. Here are the key parameters:

name: The unique name of the module. This is used to identify the module in the federation.
filename: The name of the output file that will be created for the module. Typically, this is remoteEntry.js.
exposes: An object that defines the modules that are exposed by this build. The keys are the local module names, and the values are the paths to the modules.
remotes: An object that defines the remote modules that this build depends on. The keys are the names of the remote modules, and the values are the URLs to the remote entry files.
shared: An object that defines the shared modules between the builds. This helps to avoid duplication of dependencies and ensures that the same version of a module is used across all builds.

#### Example Configuration

```js
module.exports = {
  // ...
  plugins: [
    new ModuleFederationPlugin({
      name: 'app1',
      filename: 'remoteEntry.js',
      exposes: {
        './Component': './src/Component',
      },
      remotes: {
        app2: 'app2@http://localhost:3002/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^17.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^17.0.0',
        },
      },
    }),
  ],
}
```
