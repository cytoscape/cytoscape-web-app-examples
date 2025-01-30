"use strict";
(self["webpackChunk_cytoscape_web_simple_panel"] = self["webpackChunk_cytoscape_web_simple_panel"] || []).push([["src_components_SimplePanel_tsx"],{

/***/ "./src/components/SimplePanel.tsx":
/*!****************************************!*\
  !*** ./src/components/SimplePanel.tsx ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! cyweb/WorkspaceStore */ "webpack/container/remote/cyweb/WorkspaceStore");
/* harmony import */ var cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var cyweb_NetworkStore__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! cyweb/NetworkStore */ "webpack/container/remote/cyweb/NetworkStore");
/* harmony import */ var cyweb_NetworkStore__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(cyweb_NetworkStore__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_3__);

// Dynamic import from the host app



const SimplePanel = ({ message }) => {
    const workspace = (0,cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1__.useWorkspaceStore)((state) => state.workspace);
    const { currentNetworkId } = workspace;
    const networks = (0,cyweb_NetworkStore__WEBPACK_IMPORTED_MODULE_2__.useNetworkStore)((state) => state.networks);
    const curNetwork = networks.get(currentNetworkId);
    const nodes = curNetwork?.nodes ?? [];
    const edges = curNetwork?.edges ?? [];
    if (!curNetwork) {
        return (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Box, { sx: { padding: '2em' }, children: "Please load a network" });
    }
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Box, { sx: { padding: '2em' }, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("h4", { children: ["Simple Panel App ", message] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h5", { children: "Sample panel-type app to display custom components" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Box, { sx: { padding: '1em', border: '1px solid #777' }, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("p", { children: ["Current Network ID: ", workspace.currentNetworkId] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("h5", { children: ["Num. nodes: ", nodes.length] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("h5", { children: ["Num. edges: ", edges.length] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h6", { children: "(You can add any custom components here...)" })] })] }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SimplePanel);


/***/ })

}]);