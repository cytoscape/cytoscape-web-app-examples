"use strict";
(self["webpackChunk_cytoscape_web_network_workflows"] = self["webpackChunk_cytoscape_web_network_workflows"] || []).push([["src_components_JupyterConnectorPanel_tsx"],{

/***/ "./src/components/JupyterConnectorPanel.tsx"
/*!**************************************************!*\
  !*** ./src/components/JupyterConnectorPanel.tsx ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_material_Snackbar__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/Snackbar */ "../node_modules/@mui/material/Snackbar/Snackbar.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! cyweb/NetworkApi */ "webpack/container/remote/cyweb/NetworkApi");
/* harmony import */ var cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_4__);





const JupyterType = 'jupyter_cx2';
const JupyterConnectorPanel = () => {
    // Check the connection to the Jupyter Instance
    const [isLinked, setIsLinked] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const [snackbarOpen, setSnackbarOpen] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const [jupyterWindow, setJupyterWindow] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    const networkApi = (0,cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_4__.useNetworkApi)();
    const messageHandler = (event) => {
        const { data } = event;
        if (!data || !data.payload) {
            return;
        }
        // Check data type and create network
        const { type, payload } = data;
        if (!type || !payload || type !== JupyterType) {
            return;
        }
        const result = networkApi.createNetworkFromCx2({
            cxData: payload,
            navigate: true,
            addToWorkspace: true,
        });
        if (!result.success) {
            console.error(result.error.message);
            return;
        }
        window.focus();
    };
    const initializeListener = () => {
        window.removeEventListener('message', messageHandler);
        window.addEventListener('message', messageHandler);
    };
    const [url, setUrl] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('http://localhost:8888/lab');
    const handleOpen = () => {
        const childWindow = window.open(url + '?parentName=' + window.name, 'newWindow', 'height=800,width=800');
        // Add delay to wait for the new window to be ready
        setTimeout(() => {
            initializeListener();
            setIsLinked(true);
            setJupyterWindow(childWindow);
        }, 2000);
        const checkWindowInterval = setInterval(() => {
            if (!childWindow || childWindow.closed) {
                clearInterval(checkWindowInterval);
                setIsLinked(false);
                setSnackbarOpen(true);
            }
        }, 2000);
    };
    const handleFocus = () => {
        if (jupyterWindow) {
            jupyterWindow.focus();
        }
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Box, { sx: {
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '1em',
                }, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Box, { sx: { marginBottom: '1em', textAlign: 'center' }, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("img", { src: "https://jupyter.org/assets/homepage/main-logo.svg", alt: "Jupyter Logo", style: { width: '10em', marginBottom: '1em' } }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Typography, { variant: "h4", children: "Jupyter Link App" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Typography, { variant: "subtitle1", children: "Visualize networks generated in Jupyter Lab" })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Grid, { sx: { paddingTop: '2em' }, container: true, spacing: 2, alignItems: "center", justifyContent: "center", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Grid, { item: true, xs: 12, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Typography, { variant: "body1", children: "How to connect to Jupyter Lab:" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Typography, { component: "div", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("ol", { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { children: "Start your Jupyter Lab instance." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { children: "Enter the URL of your Jupyter Lab instance in the field below. You may need to inclued the URL with the access token." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { children: "Click the \"Open Jupyter Lab\" button." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { children: "New Jupyter Lab window will be opened." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { children: "Now you can send CX2 network data from Jupyter Lab to this app. Use the following code snippet in your Jupyter Lab notebook:" })] }) })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Grid, { item: true, xs: 12, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.TextField, { label: "Target Jupyter Lab URL", variant: "outlined", fullWidth: true, value: url, onChange: (e) => setUrl(e.target.value) }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Grid, { item: true, xs: 12, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Grid, { container: true, spacing: 1, paddingTop: '1em', justifyContent: "flex-end", alignItems: "end", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Grid, { item: true, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Button, { size: "medium", color: "primary", variant: "contained", onClick: handleOpen, disabled: isLinked, children: isLinked ? 'Connected' : 'Open Jupyter Lab' }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Grid, { item: true, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material__WEBPACK_IMPORTED_MODULE_3__.Button, { size: "medium", color: "secondary", variant: "contained", onClick: handleFocus, disabled: !isLinked, children: "Focus to Jupyter Lab window" }) })] }) })] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material_Snackbar__WEBPACK_IMPORTED_MODULE_2__["default"], { open: snackbarOpen, autoHideDuration: 5000, onClose: () => setSnackbarOpen(false), message: "Disconnected from Jupyter Lab" })] }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (JupyterConnectorPanel);


/***/ }

}]);