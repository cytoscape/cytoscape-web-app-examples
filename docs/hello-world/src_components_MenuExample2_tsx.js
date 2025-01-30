"use strict";
(self["webpackChunkhello_cy_web"] = self["webpackChunkhello_cy_web"] || []).push([["src_components_MenuExample2_tsx"],{

/***/ "./src/components/MenuExample2.tsx":
/*!*****************************************!*\
  !*** ./src/components/MenuExample2.tsx ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! cyweb/CreateNetworkFromCx2 */ "webpack/container/remote/cyweb/CreateNetworkFromCx2");
/* harmony import */ var cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_2__);



const sampleUrl = 'https://raw.githubusercontent.com/cytoscape/cytoscape-web-app-examples/refs/heads/pre-release-cleanup/docs/data/sample2.cx2';
const MenuExample2 = ({ handleClose }) => {
    const createNetworkFromCx2 = (0,cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_2__.useCreateNetworkFromCx2)();
    const fetchCx2fromURL = async (url) => {
        const response = await fetch(url);
        const cx2 = await response.json();
        console.log('From CX2', cx2);
        return cx2;
    };
    const handleClick = () => {
        fetchCx2fromURL(sampleUrl).then((cx2) => {
            const networkWithView = createNetworkFromCx2({ cxData: cx2 });
            console.log('Sample network created from CX2', networkWithView);
        });
        handleClose && handleClose();
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_1__.MenuItem, { onClick: handleClick, children: "Create a network from remote CX2" }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MenuExample2);


/***/ })

}]);