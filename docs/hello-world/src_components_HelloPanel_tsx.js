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
/* harmony import */ var cyweb_VisualStyleStore__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! cyweb/VisualStyleStore */ "webpack/container/remote/cyweb/VisualStyleStore");
/* harmony import */ var cyweb_VisualStyleStore__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(cyweb_VisualStyleStore__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _cytoscape_web_types__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @cytoscape-web/types */ "../node_modules/@cytoscape-web/types/dist/index.js");
/* harmony import */ var _cytoscape_web_types__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_cytoscape_web_types__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! cyweb/CreateNetworkFromCx2 */ "webpack/container/remote/cyweb/CreateNetworkFromCx2");
/* harmony import */ var cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_6__);

// Dynamic import from the host app






// Generate a random color in RGB format
const randomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
};
const HelloPanel = ({ message }) => {
    const initRef = (0,react__WEBPACK_IMPORTED_MODULE_5__.useRef)(false);
    const createNetworkFromCx2 = (0,cyweb_CreateNetworkFromCx2__WEBPACK_IMPORTED_MODULE_6__.useCreateNetworkFromCx2)();
    // Import the workspace data from the host app
    const workspace = (0,cyweb_WorkspaceStore__WEBPACK_IMPORTED_MODULE_1__.useWorkspaceStore)((state) => state.workspace);
    const initializeListener = () => {
        console.log('#############!!!!!!!!!!!!!!!!! adding');
        window.addEventListener('message', (event) => {
            const { data } = event;
            console.log('###3 Received message from child', data);
            const networkWithView = createNetworkFromCx2({ cxData: data.payload });
            console.log('Sample network created by external App', networkWithView);
            window.focus();
        });
    };
    (0,react__WEBPACK_IMPORTED_MODULE_5__.useEffect)(() => {
        // Check if the message listener is already added
        if (initRef.current) {
            return;
        }
        initializeListener();
        initRef.current = true;
    }, []);
    // Import a function from the host
    const setDefault = (0,cyweb_VisualStyleStore__WEBPACK_IMPORTED_MODULE_2__.useVisualStyleStore)((state) => state.setDefault);
    const [url, setUrl] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)('http://localhost:3000/hello-world/external-webapp/');
    const handleButtonClick = () => {
        const newNodeColor = randomColor();
        const newEdgeColor = randomColor();
        setDefault(workspace.currentNetworkId, _cytoscape_web_types__WEBPACK_IMPORTED_MODULE_4__.VisualPropertyName.NodeBackgroundColor, newNodeColor);
        setDefault(workspace.currentNetworkId, _cytoscape_web_types__WEBPACK_IMPORTED_MODULE_4__.VisualPropertyName.EdgeLineColor, newEdgeColor);
    };
    const handleOpen = () => {
        const newTab = window.open(url, '_blank');
        console.log('New tab instance', newTab);
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Box, { sx: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1em',
        }, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Typography, { variant: "h4", children: "Hello, Cytoscape Web!" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Typography, { variant: "body1", children: ["from an external App: ", message] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Box, { sx: { padding: '1em', width: '20em' }, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Button, { size: "large", fullWidth: true, color: "primary", onClick: handleButtonClick, children: "Click Me!" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.TextField, { label: "Enter URL", variant: "outlined", fullWidth: true, value: url, onChange: (e) => setUrl(e.target.value) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Button, { size: "large", fullWidth: true, color: "primary", onClick: handleOpen, children: "Open External App" })] })] }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HelloPanel);


/***/ })

}]);