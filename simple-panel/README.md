# Example App 2: Add a Simple Panel

This app adds a panel component to the right side of the Cytoscape Web interface.

This is one of the two types of App components: Panel.

# App Components

The simple-panel app consists of two main components:

1. [`SimplePanelApp`](simple-panel/src/SimplePanelApp.tsx) - The entry point component that defines the app configuration:

   - App ID: `simplePanel`
   - Name: "Simple Panel App"
   - Registers a `SimplePanel` component of type `Panel`, which is the one displayed on the right-side of the window

2. [`SimplePanel`](simple-panel/src/components/SimplePanel.tsx) - The panel component that:
   - Renders in the right-side panel area
   - Displays network information using Material-UI components
   - Accesses workspace data through [`useWorkspaceStore`](simple-panel/src/components/SimplePanel.tsx)
   - Shows current network statistics (nodes and edges count)
   - This is a minimal example and you can add any type of components in this panel. For example, you can use [D3.js](https://d3js.org/) to visualize network statistics as charts here.
