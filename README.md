# Apps for _Cytoscape Web_

App developer's guide for Cytoscape Web v1

(January 2025)

Examples:

- https://cytoscape.org/cytoscape-web-app-examples/

## Introduction

Cytoscape Web has a built-in app hosting mechanism that allows developers to extend its functionality and user interface. This repository contains reference implementations demonstrating basic app development patterns, including:

- Example apps showcasing menu items, panels, and network manipulation
- Detailed explanations of **Module Federation** parameters used in app configuration
- Step-by-step guide for creating new apps using the provided template

Each example includes source code and documentation to help you understand how to:

- Implement custom UI components
- Configure webpack for Module Federation
- Deploy your apps to web servers

Whether you're building your first Cytoscape Web app or looking for implementation patterns, these examples will help you get started quickly.

## Quick Start

### Prerequisite

- Node.js (LTS)
- Supported Web Browser
  - Chrome
  - Safari
  - Firefox
  - Edge

### Run Example Apps

To run all of the apps locally, type:

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

```
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
};
```
