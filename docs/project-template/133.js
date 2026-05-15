"use strict";
(self["webpackChunk_cytoscape_web_project_template"] = self["webpackChunk_cytoscape_web_project_template"] || []).push([[133],{

/***/ 5133
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2540);
/* harmony import */ var _mui_material_Typography__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9755);
/* harmony import */ var cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2148);
/* harmony import */ var cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2__);

/**
 * TemplateMenuItem — Minimal Apps-menu action.
 *
 * Demonstrates:
 *   - Creating a network from an edge list (simplest API usage)
 *   - MUI components in a menu item
 *   - closeOnAction: true in TemplateApp.resources[] means the dropdown
 *     closes automatically after the user clicks — no handleClose needed.
 *
 * Replace this with your own menu action.
 */


const TemplateMenuItem = () => {
    const networkApi = (0,cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2__.useNetworkApi)();
    const handleClick = () => {
        networkApi.createNetworkFromEdgeList({
            name: 'Template Network',
            description: 'Created by the App Template menu action.',
            edgeList: [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'A'],
            ],
            addToWorkspace: true,
        });
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .A, { sx: {
            px: 2,
            py: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
        }, onClick: handleClick, children: "Create example network" }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TemplateMenuItem);


/***/ }

}]);