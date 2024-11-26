"use strict";
(self["webpackChunkhello_cy_web"] = self["webpackChunkhello_cy_web"] || []).push([["src_components_MenuExample_tsx"],{

/***/ "./src/components/MenuExample.tsx":
/*!****************************************!*\
  !*** ./src/components/MenuExample.tsx ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var cyweb_CreateNetwork__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! cyweb/CreateNetwork */ "webpack/container/remote/cyweb/CreateNetwork");
/* harmony import */ var cyweb_CreateNetwork__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(cyweb_CreateNetwork__WEBPACK_IMPORTED_MODULE_2__);



const MenuExample = ({ handleClose }) => {
    // Get the function to create a network with a view
    const createNetworkWithView = (0,cyweb_CreateNetwork__WEBPACK_IMPORTED_MODULE_2__.useCreateNetworkWithView)();
    const handleClick = () => {
        const newNetwork = createNetworkWithView({
            name: 'Empty Network1',
        });
        console.log('Empty network created', newNetwork);
        const network = newNetwork.network;
        alert(`An empty network created: ${network.id}`);
        handleClose && handleClose();
    };
    return (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_1__.MenuItem, { onClick: handleClick, children: "Create an empty network" });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MenuExample);


/***/ })

}]);