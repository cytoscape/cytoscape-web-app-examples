"use strict";
(self["webpackChunk_cytoscape_web_project_template"] = self["webpackChunk_cytoscape_web_project_template"] || []).push([[603],{

/***/ 7603
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ components_TemplatePanel)
});

// EXTERNAL MODULE: ../node_modules/react/jsx-runtime.js
var jsx_runtime = __webpack_require__(2540);
// EXTERNAL MODULE: ../node_modules/@babel/runtime/helpers/esm/extends.js
var esm_extends = __webpack_require__(8102);
// EXTERNAL MODULE: ../node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
var objectWithoutPropertiesLoose = __webpack_require__(9257);
// EXTERNAL MODULE: consume shared module (default) react@=18.3.1 (singleton) (fallback: ../node_modules/react/index.js)
var index_js_ = __webpack_require__(9983);
// EXTERNAL MODULE: ../node_modules/clsx/dist/clsx.mjs
var clsx = __webpack_require__(1750);
// EXTERNAL MODULE: ../node_modules/@mui/styled-engine/index.js + 6 modules
var styled_engine = __webpack_require__(1319);
// EXTERNAL MODULE: ../node_modules/@mui/system/esm/styleFunctionSx/styleFunctionSx.js
var styleFunctionSx = __webpack_require__(2927);
// EXTERNAL MODULE: ../node_modules/@mui/system/esm/styleFunctionSx/extendSxProp.js
var extendSxProp = __webpack_require__(523);
// EXTERNAL MODULE: ../node_modules/@mui/system/esm/createTheme/createTheme.js + 2 modules
var createTheme = __webpack_require__(8953);
// EXTERNAL MODULE: ../node_modules/@emotion/react/dist/emotion-element-f0de968e.browser.esm.js
var emotion_element_f0de968e_browser_esm = __webpack_require__(184);
;// ../node_modules/@mui/system/esm/useThemeWithoutDefault.js
'use client';



function isObjectEmpty(obj) {
  return Object.keys(obj).length === 0;
}
function useTheme(defaultTheme = null) {
  const contextTheme = index_js_.useContext(emotion_element_f0de968e_browser_esm.T);
  return !contextTheme || isObjectEmpty(contextTheme) ? defaultTheme : contextTheme;
}
/* harmony default export */ const useThemeWithoutDefault = (useTheme);
;// ../node_modules/@mui/system/esm/useTheme.js
'use client';



const systemDefaultTheme = (0,createTheme/* default */.A)();
function useTheme_useTheme(defaultTheme = systemDefaultTheme) {
  return useThemeWithoutDefault(defaultTheme);
}
/* harmony default export */ const esm_useTheme = (useTheme_useTheme);
;// ../node_modules/@mui/system/esm/createBox.js
'use client';



const _excluded = ["className", "component"];






function createBox(options = {}) {
  const {
    themeId,
    defaultTheme,
    defaultClassName = 'MuiBox-root',
    generateClassName
  } = options;
  const BoxRoot = (0,styled_engine["default"])('div', {
    shouldForwardProp: prop => prop !== 'theme' && prop !== 'sx' && prop !== 'as'
  })(styleFunctionSx/* default */.A);
  const Box = /*#__PURE__*/index_js_.forwardRef(function Box(inProps, ref) {
    const theme = esm_useTheme(defaultTheme);
    const _extendSxProp = (0,extendSxProp/* default */.A)(inProps),
      {
        className,
        component = 'div'
      } = _extendSxProp,
      other = (0,objectWithoutPropertiesLoose/* default */.A)(_extendSxProp, _excluded);
    return /*#__PURE__*/(0,jsx_runtime.jsx)(BoxRoot, (0,esm_extends/* default */.A)({
      as: component,
      ref: ref,
      className: (0,clsx/* default */.A)(className, generateClassName ? generateClassName(defaultClassName) : defaultClassName),
      theme: themeId ? theme[themeId] || theme : theme
    }, other));
  });
  return Box;
}
// EXTERNAL MODULE: ../node_modules/@mui/utils/esm/ClassNameGenerator/ClassNameGenerator.js
var ClassNameGenerator = __webpack_require__(1027);
// EXTERNAL MODULE: ../node_modules/@mui/material/styles/createTheme.js + 14 modules
var styles_createTheme = __webpack_require__(7890);
// EXTERNAL MODULE: ../node_modules/@mui/material/styles/identifier.js
var identifier = __webpack_require__(3724);
// EXTERNAL MODULE: ../node_modules/@mui/utils/esm/generateUtilityClasses/generateUtilityClasses.js
var generateUtilityClasses = __webpack_require__(9009);
;// ../node_modules/@mui/material/Box/boxClasses.js

const boxClasses = (0,generateUtilityClasses/* default */.A)('MuiBox', ['root']);
/* harmony default export */ const Box_boxClasses = (boxClasses);
;// ../node_modules/@mui/material/Box/Box.js
'use client';







const defaultTheme = (0,styles_createTheme/* default */.A)();
const Box = createBox({
  themeId: identifier/* default */.A,
  defaultTheme,
  defaultClassName: Box_boxClasses.root,
  generateClassName: ClassNameGenerator/* default */.A.generate
});
 false ? 0 : void 0;
/* harmony default export */ const Box_Box = (Box);
// EXTERNAL MODULE: ../node_modules/@mui/material/Typography/Typography.js + 10 modules
var Typography = __webpack_require__(9755);
// EXTERNAL MODULE: remote cyweb/WorkspaceApi
var WorkspaceApi = __webpack_require__(2695);
;// ./src/components/TemplatePanel.tsx

/**
 * TemplatePanel — Minimal right-panel component.
 *
 * Demonstrates:
 *   - Reading workspace info via useWorkspaceApi()
 *   - ApiResult<T> pattern (check .success before .data)
 *   - MUI components (shared singletons from host)
 *
 * Replace this with your own panel UI.
 */



const TemplatePanel = () => {
    const workspaceApi = (0,WorkspaceApi.useWorkspaceApi)();
    const result = workspaceApi.getWorkspaceInfo();
    const workspaceName = result.success && result.data.name !== ''
        ? result.data.name
        : 'Untitled Workspace';
    return ((0,jsx_runtime.jsxs)(Box_Box, { sx: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 3,
        }, children: [(0,jsx_runtime.jsx)(Typography/* default */.A, { variant: "h5", children: "App Template" }), (0,jsx_runtime.jsx)(Typography/* default */.A, { color: "text.secondary", children: "Start building your panel here." }), (0,jsx_runtime.jsxs)(Box_Box, { children: [(0,jsx_runtime.jsx)(Typography/* default */.A, { variant: "overline", color: "text.secondary", children: "Workspace" }), (0,jsx_runtime.jsx)(Typography/* default */.A, { variant: "body1", children: workspaceName })] })] }));
};
/* harmony default export */ const components_TemplatePanel = (TemplatePanel);


/***/ }

}]);