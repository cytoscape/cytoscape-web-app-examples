"use strict";
(self["webpackChunksimple_menu_app"] = self["webpackChunksimple_menu_app"] || []).push([["src_components_AppMenuItem_tsx"],{

/***/ "./src/components/AppMenuItem.tsx":
/*!****************************************!*\
  !*** ./src/components/AppMenuItem.tsx ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _MessageDialog__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./MessageDialog */ "./src/components/MessageDialog.tsx");




/**
 * Actual menu item component that will be rendered in the host app.
 *
 * @param param
 * @returns
 */
const AppMenuItem = ({ title = 'Simple Dialog Example', handleClose, }) => {
    const [dialogOpen, setDialogOpen] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
    const handleCloseDialog = () => {
        setDialogOpen(false);
        handleClose && handleClose();
    };
    const handleClick = () => {
        console.log('Click detected in Simple Menu app');
        setDialogOpen(true);
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_1__.MenuItem, { onClick: handleClick, children: title }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_MessageDialog__WEBPACK_IMPORTED_MODULE_3__["default"], { open: dialogOpen, onClose: handleCloseDialog, title: "Hello Cytoscape World!", message: "Hello from the Simple Menu app! (AppMenuItem)", linkText: "App developer's guide (TBD)", linkUrl: "https://github.com/cytoscape/cytoscape-web/wiki" })] }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AppMenuItem);


/***/ }),

/***/ "./src/components/MessageDialog.tsx":
/*!******************************************!*\
  !*** ./src/components/MessageDialog.tsx ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var _mui_material_Dialog__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/Dialog */ "../node_modules/@mui/material/Dialog/Dialog.js");
/* harmony import */ var _mui_material_DialogTitle__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material/DialogTitle */ "../node_modules/@mui/material/DialogTitle/DialogTitle.js");
/* harmony import */ var _mui_material_DialogContent__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @mui/material/DialogContent */ "../node_modules/@mui/material/DialogContent/DialogContent.js");
/* harmony import */ var _mui_material_DialogContentText__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/material/DialogContentText */ "../node_modules/@mui/material/DialogContentText/DialogContentText.js");
/* harmony import */ var _mui_material_DialogActions__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @mui/material/DialogActions */ "../node_modules/@mui/material/DialogActions/DialogActions.js");
/* harmony import */ var _mui_material_Button__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @mui/material/Button */ "../node_modules/@mui/material/Button/Button.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);








const MessageDialog = ({ open, onClose, title, message, linkText, linkUrl, }) => {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material_Dialog__WEBPACK_IMPORTED_MODULE_2__["default"], { open: open, onClose: onClose, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material_DialogTitle__WEBPACK_IMPORTED_MODULE_3__["default"], { children: title }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material_DialogContent__WEBPACK_IMPORTED_MODULE_4__["default"], { children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material_DialogContentText__WEBPACK_IMPORTED_MODULE_5__["default"], { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Box, { sx: { p: '1em' }, children: message }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Box, { sx: { p: '1em' }, children: linkText && linkUrl && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, { children: [' ', (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("a", { href: linkUrl, target: "_blank", rel: "noopener noreferrer", children: linkText })] })) })] }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material_DialogActions__WEBPACK_IMPORTED_MODULE_6__["default"], { children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material_Button__WEBPACK_IMPORTED_MODULE_7__["default"], { onClick: onClose, color: "primary", children: "Close" }) })] }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MessageDialog);


/***/ })

}]);