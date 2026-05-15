"use strict";
(self["webpackChunk_cytoscape_web_project_template"] = self["webpackChunk_cytoscape_web_project_template"] || []).push([[500],{

/***/ 7500
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* reexport */ TemplateApp)
});

// EXTERNAL MODULE: consume shared module (default) react@=18.3.1 (singleton) (fallback: ../node_modules/react/index.js)
var index_js_ = __webpack_require__(9983);
;// ./package.json
const package_namespaceObject = {"rE":"1.0.0"};
;// ./src/contextMenus.ts
/**
 * Right-click a node → select all its direct neighbors.
 *
 * Demonstrates:
 *   - Graph Traversal API: element.getConnectedNodes()
 *   - Selection API: selection.additiveSelect()
 *   - Combining two APIs inside a context menu handler
 */
function registerSelectNeighbors(context) {
    context.apis.contextMenu.addContextMenuItem({
        label: 'Template: Select Neighbors',
        targetTypes: ['node'],
        handler: (ctx) => {
            const neighborsResult = context.apis.element.getConnectedNodes(ctx.networkId, ctx.id);
            if (!neighborsResult.success)
                return;
            const { nodeIds } = neighborsResult.data;
            if (nodeIds.length === 0)
                return;
            context.apis.selection.additiveSelect(ctx.networkId, nodeIds);
        },
    });
}

;// ./src/TemplateApp.tsx
/**
 * TemplateApp — Cytoscape Web plugin with panel, menu action, and context menu.
 *
 * Copy this file and update:
 *   1. `id`          → must match the Module Federation `name` in webpack.config.js
 *   2. `name`        → human-readable name shown in the host's App Settings
 *   3. `description` → one-line summary
 *   4. `resources`   → add/remove panels and menu items
 *   5. `mount()`     → register context menus, event listeners, etc.
 *   6. `unmount()`   → clean up event listeners from mount()
 *
 * Resources (panels and menu items) are registered declaratively — the host
 * renders them automatically. Context menus need `apis` access, so they are
 * registered in mount() instead.
 *
 * See the hello-world app for examples of all 10 domain APIs.
 * See guides/ for the full App Developer Guide.
 */



const { /* version */ "rE": version } = package_namespaceObject;
// TODO: Rename this export and update src/index.ts accordingly.
const TemplateApp = {
    // TODO: Change id to match your Module Federation name.
    id: 'template',
    // TODO: Change name and description.
    name: 'App Template',
    description: 'Boilerplate app with a panel, a menu action, a context menu item, ' +
        'and the recommended Cytoscape Web plugin shape.',
    version,
    apiVersion: '1.0',
    // ── Declarative resource registration ──────────────────────────────────
    // Panels and menu items are declared here. The host registers them
    // automatically — no mount() needed for these.
    resources: [
        {
            slot: 'right-panel',
            id: 'TemplatePanel',
            title: 'Template', // TODO: Tab title shown in the right panel.
            component: (0,index_js_.lazy)(() => Promise.all(/* import() */[__webpack_require__.e(755), __webpack_require__.e(603)]).then(__webpack_require__.bind(__webpack_require__, 7603))),
        },
        {
            slot: 'apps-menu',
            id: 'TemplateMenuItem',
            title: 'Template Action', // TODO: Label shown in the Apps dropdown.
            component: (0,index_js_.lazy)(() => Promise.all(/* import() */[__webpack_require__.e(755), __webpack_require__.e(133)]).then(__webpack_require__.bind(__webpack_require__, 5133))),
            closeOnAction: true, // Auto-close the dropdown after action.
        },
    ],
    // ── Lifecycle hooks ────────────────────────────────────────────────────
    // mount() is called once after the app's resources are registered.
    // Use it for context menus (handlers need api access) and event listeners.
    mount(context) {
        // Context menu items are registered here because their handlers need
        // access to context.apis. The host auto-cleans all items when the app
        // is disabled — no explicit removal in unmount() needed.
        registerSelectNeighbors(context);
        // TODO: Add more context menu registrations or event listeners here.
        // See src/contextMenus.ts for the pattern.
    },
    unmount() {
        // Only manual cleanup (e.g. event listeners) goes here.
        // Context menu items and resources are auto-cleaned by the host.
        //
        // if (_handler !== null) {
        //   window.removeEventListener('network:switched', _handler)
        //   _handler = null
        // }
    },
};

;// ./src/index.ts



/***/ }

}]);