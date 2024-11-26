"use strict";
(self["webpackChunkhello_cy_web"] = self["webpackChunkhello_cy_web"] || []).push([["src_components_HelloPanel_tsx"],{

/***/ "./src/components/HelloPanel.tsx":
/*!***************************************!*\
  !*** ./src/components/HelloPanel.tsx ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! cyweb/WorkspaceStore */ "webpack/container/remote/cyweb/WorkspaceStore");
/* harmony import */ var cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_2__);

// Dynamic import from the host app


const HelloPanel = ({ message }) => {
    const workspace = (0,cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1__.useWorkspaceStore)((state) => state.workspace);
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Box, { sx: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1em',
        }, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Typography, { variant: "h5", children: ["Hello, Cytoscape (from external app!) ", message] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Typography, { variant: "subtitle1", children: ["Current Network ID: ", workspace.currentNetworkId] })] }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HelloPanel);


/***/ })

}]);