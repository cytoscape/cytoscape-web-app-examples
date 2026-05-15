"use strict";
(self["webpackChunk_cytoscape_web_network_workflows"] = self["webpackChunk_cytoscape_web_network_workflows"] || []).push([["src_index_ts"],{

/***/ "./src/NetworkWorkflowsApp.tsx"
/*!*************************************!*\
  !*** ./src/NetworkWorkflowsApp.tsx ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NetworkWorkflowsApp: () => (/* binding */ NetworkWorkflowsApp)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

const NetworkWorkflowsApp = {
    id: 'networkWorkflows',
    name: 'Network Workflow Examples',
    description: 'Network creation, CX2 import, and external integration examples',
    apiVersion: '1.0',
    resources: [
        {
            slot: 'apps-menu',
            id: 'CreateNetworkMenu',
            title: 'Create Example Network',
            component: (0,react__WEBPACK_IMPORTED_MODULE_0__.lazy)(() => Promise.all(/*! import() */[__webpack_require__.e("vendors-node_modules_mui_material_DefaultPropsProvider_DefaultPropsProvider_js-node_modules_m-228034"), __webpack_require__.e("webpack_container_remote_cyweb_NetworkApi"), __webpack_require__.e("src_components_CreateNetworkMenu_tsx")]).then(__webpack_require__.bind(__webpack_require__, /*! ./components/CreateNetworkMenu */ "./src/components/CreateNetworkMenu.tsx"))),
            closeOnAction: true,
        },
        {
            slot: 'apps-menu',
            id: 'CreateNetworkFromCx2Menu',
            title: 'Create Network from CX2',
            component: (0,react__WEBPACK_IMPORTED_MODULE_0__.lazy)(() => Promise.all(/*! import() */[__webpack_require__.e("vendors-node_modules_mui_material_DefaultPropsProvider_DefaultPropsProvider_js-node_modules_m-228034"), __webpack_require__.e("webpack_container_remote_cyweb_NetworkApi"), __webpack_require__.e("src_components_CreateNetworkFromCx2Menu_tsx")]).then(__webpack_require__.bind(__webpack_require__, /*! ./components/CreateNetworkFromCx2Menu */ "./src/components/CreateNetworkFromCx2Menu.tsx"))),
            closeOnAction: true,
        },
        {
            slot: 'right-panel',
            id: 'JupyterConnectorPanel',
            title: 'Jupyter Link',
            component: (0,react__WEBPACK_IMPORTED_MODULE_0__.lazy)(() => Promise.all(/*! import() */[__webpack_require__.e("vendors-node_modules_mui_material_DefaultPropsProvider_DefaultPropsProvider_js-node_modules_m-228034"), __webpack_require__.e("vendors-node_modules_mui_material_Snackbar_Snackbar_js"), __webpack_require__.e("webpack_container_remote_cyweb_NetworkApi"), __webpack_require__.e("webpack_sharing_consume_default_react-dom_react-dom"), __webpack_require__.e("src_components_JupyterConnectorPanel_tsx")]).then(__webpack_require__.bind(__webpack_require__, /*! ./components/JupyterConnectorPanel */ "./src/components/JupyterConnectorPanel.tsx"))),
        },
    ],
};


/***/ },

/***/ "./src/index.ts"
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _NetworkWorkflowsApp__WEBPACK_IMPORTED_MODULE_0__.NetworkWorkflowsApp)
/* harmony export */ });
/* harmony import */ var _NetworkWorkflowsApp__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./NetworkWorkflowsApp */ "./src/NetworkWorkflowsApp.tsx");



/***/ }

}]);