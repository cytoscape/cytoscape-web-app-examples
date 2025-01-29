# Example App 1: Add a Simple Menu

This app adds an menu item under the _Apps_ menu in the menu bar.

This is one of the two types of App components: Menu.

# App Components

The simple-menu app consists of two main components:

1. [`SimpleMenuApp`](simple-menu/src/SimpleMenuApp.tsx) - The entry point component that defines the app configuration:

   - App ID: `simpleMenu` - This is used as the ID in Module Federation framework.
   - Name: "Simple menu app"
   - Registers an `AppMenuItem` component of type `Menu`

2. [`AppMenuItem`](simple-menu/src/components/AppMenuItem.tsx) - The menu item component that:
   - Appears under the Apps menu
   - Opens a dialog when clicked using Material-UI components
   - Uses [`MessageDialog`](simple-menu/src/components/MessageDialog.tsx) to display simple message and link
