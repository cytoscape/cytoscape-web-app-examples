"use strict";
(self["webpackChunkhello_cy_web"] = self["webpackChunkhello_cy_web"] || []).push([["src_components_OpenExternalAppMenu_tsx"],{

/***/ "./src/components/OpenExternalAppMenu.tsx":
/*!************************************************!*\
  !*** ./src/components/OpenExternalAppMenu.tsx ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_2__);



const OpenExternalAppMenu = ({ handleClose, }) => {
    const [dialogOpen, setDialogOpen] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const [url, setUrl] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
    const [error, setError] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
    const handleMenuClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setDialogOpen(true);
    };
    const handleDialogClose = () => {
        setDialogOpen(false);
        setUrl('');
        setError('');
        handleClose?.();
    };
    const handleSubmit = () => {
        try {
            new URL(url); // Validate URL
            window.open(url, '_blank');
            handleDialogClose();
        }
        catch (e) {
            setError('Please enter a valid URL');
        }
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.MenuItem, { onClick: handleMenuClick, children: "Open External App" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Dialog, { open: dialogOpen, onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation(), onClose: handleDialogClose, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.DialogTitle, { children: "Enter External App URL" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.DialogContent, { children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.TextField, { autoFocus: true, margin: "dense", label: "URL", type: "url", fullWidth: true, value: url, onClick: (e) => e.stopPropagation(), onChange: (e) => {
                                // Do not propagate the event to the parent
                                e.preventDefault();
                                e.stopPropagation();
                                setUrl(e.target.value);
                                setError('');
                            }, error: !!error, helperText: error }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.DialogActions, { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Button, { onClick: handleDialogClose, children: "Cancel" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Button, { onClick: handleSubmit, disabled: !url, children: "Open" })] })] })] }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (OpenExternalAppMenu);


/***/ })

}]);