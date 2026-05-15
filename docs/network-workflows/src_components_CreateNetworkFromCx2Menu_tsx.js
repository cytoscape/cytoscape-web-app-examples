"use strict";
(self["webpackChunk_cytoscape_web_network_workflows"] = self["webpackChunk_cytoscape_web_network_workflows"] || []).push([["src_components_CreateNetworkFromCx2Menu_tsx"],{

/***/ "../node_modules/@mui/material/Typography/Typography.js"
/*!**************************************************************!*\
  !*** ../node_modules/@mui/material/Typography/Typography.js ***!
  \**************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TypographyRoot: () => (/* binding */ TypographyRoot),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _babel_runtime_helpers_esm_objectWithoutPropertiesLoose__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/esm/objectWithoutPropertiesLoose */ "../node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js");
/* harmony import */ var _babel_runtime_helpers_esm_extends__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime/helpers/esm/extends */ "../node_modules/@babel/runtime/helpers/esm/extends.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! prop-types */ "../node_modules/prop-types/index.js");
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var clsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! clsx */ "../node_modules/clsx/dist/clsx.mjs");
/* harmony import */ var _mui_system_styleFunctionSx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/system/styleFunctionSx */ "../node_modules/@mui/system/esm/styleFunctionSx/extendSxProp.js");
/* harmony import */ var _mui_utils_composeClasses__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @mui/utils/composeClasses */ "../node_modules/@mui/utils/esm/composeClasses/composeClasses.js");
/* harmony import */ var _styles_styled__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../styles/styled */ "../node_modules/@mui/material/styles/styled.js");
/* harmony import */ var _DefaultPropsProvider__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../DefaultPropsProvider */ "../node_modules/@mui/material/DefaultPropsProvider/DefaultPropsProvider.js");
/* harmony import */ var _utils_capitalize__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../utils/capitalize */ "../node_modules/@mui/material/utils/capitalize.js");
/* harmony import */ var _typographyClasses__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./typographyClasses */ "../node_modules/@mui/material/Typography/typographyClasses.js");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
'use client';



const _excluded = ["align", "className", "component", "gutterBottom", "noWrap", "paragraph", "variant", "variantMapping"];










const useUtilityClasses = ownerState => {
  const {
    align,
    gutterBottom,
    noWrap,
    paragraph,
    variant,
    classes
  } = ownerState;
  const slots = {
    root: ['root', variant, ownerState.align !== 'inherit' && `align${(0,_utils_capitalize__WEBPACK_IMPORTED_MODULE_9__["default"])(align)}`, gutterBottom && 'gutterBottom', noWrap && 'noWrap', paragraph && 'paragraph']
  };
  return (0,_mui_utils_composeClasses__WEBPACK_IMPORTED_MODULE_6__["default"])(slots, _typographyClasses__WEBPACK_IMPORTED_MODULE_10__.getTypographyUtilityClass, classes);
};
const TypographyRoot = (0,_styles_styled__WEBPACK_IMPORTED_MODULE_7__["default"])('span', {
  name: 'MuiTypography',
  slot: 'Root',
  overridesResolver: (props, styles) => {
    const {
      ownerState
    } = props;
    return [styles.root, ownerState.variant && styles[ownerState.variant], ownerState.align !== 'inherit' && styles[`align${(0,_utils_capitalize__WEBPACK_IMPORTED_MODULE_9__["default"])(ownerState.align)}`], ownerState.noWrap && styles.noWrap, ownerState.gutterBottom && styles.gutterBottom, ownerState.paragraph && styles.paragraph];
  }
})(({
  theme,
  ownerState
}) => (0,_babel_runtime_helpers_esm_extends__WEBPACK_IMPORTED_MODULE_1__["default"])({
  margin: 0
}, ownerState.variant === 'inherit' && {
  // Some elements, like <button> on Chrome have default font that doesn't inherit, reset this.
  font: 'inherit'
}, ownerState.variant !== 'inherit' && theme.typography[ownerState.variant], ownerState.align !== 'inherit' && {
  textAlign: ownerState.align
}, ownerState.noWrap && {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}, ownerState.gutterBottom && {
  marginBottom: '0.35em'
}, ownerState.paragraph && {
  marginBottom: 16
}));
const defaultVariantMapping = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  inherit: 'p'
};

// TODO v6: deprecate these color values in v5.x and remove the transformation in v6
const colorTransformations = {
  primary: 'primary.main',
  textPrimary: 'text.primary',
  secondary: 'secondary.main',
  textSecondary: 'text.secondary',
  error: 'error.main'
};
const transformDeprecatedColors = color => {
  return colorTransformations[color] || color;
};
const Typography = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_2__.forwardRef(function Typography(inProps, ref) {
  const themeProps = (0,_DefaultPropsProvider__WEBPACK_IMPORTED_MODULE_8__.useDefaultProps)({
    props: inProps,
    name: 'MuiTypography'
  });
  const color = transformDeprecatedColors(themeProps.color);
  const props = (0,_mui_system_styleFunctionSx__WEBPACK_IMPORTED_MODULE_5__["default"])((0,_babel_runtime_helpers_esm_extends__WEBPACK_IMPORTED_MODULE_1__["default"])({}, themeProps, {
    color
  }));
  const {
      align = 'inherit',
      className,
      component,
      gutterBottom = false,
      noWrap = false,
      paragraph = false,
      variant = 'body1',
      variantMapping = defaultVariantMapping
    } = props,
    other = (0,_babel_runtime_helpers_esm_objectWithoutPropertiesLoose__WEBPACK_IMPORTED_MODULE_0__["default"])(props, _excluded);
  const ownerState = (0,_babel_runtime_helpers_esm_extends__WEBPACK_IMPORTED_MODULE_1__["default"])({}, props, {
    align,
    color,
    className,
    component,
    gutterBottom,
    noWrap,
    paragraph,
    variant,
    variantMapping
  });
  const Component = component || (paragraph ? 'p' : variantMapping[variant] || defaultVariantMapping[variant]) || 'span';
  const classes = useUtilityClasses(ownerState);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_11__.jsx)(TypographyRoot, (0,_babel_runtime_helpers_esm_extends__WEBPACK_IMPORTED_MODULE_1__["default"])({
    as: Component,
    ref: ref,
    ownerState: ownerState,
    className: (0,clsx__WEBPACK_IMPORTED_MODULE_4__["default"])(classes.root, className)
  }, other));
});
 true ? Typography.propTypes /* remove-proptypes */ = {
  // ┌────────────────────────────── Warning ──────────────────────────────┐
  // │ These PropTypes are generated from the TypeScript type definitions. │
  // │    To update them, edit the d.ts file and run `pnpm proptypes`.     │
  // └─────────────────────────────────────────────────────────────────────┘
  /**
   * Set the text-align on the component.
   * @default 'inherit'
   */
  align: prop_types__WEBPACK_IMPORTED_MODULE_3___default().oneOf(['center', 'inherit', 'justify', 'left', 'right']),
  /**
   * The content of the component.
   */
  children: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().node),
  /**
   * Override or extend the styles applied to the component.
   */
  classes: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().object),
  /**
   * @ignore
   */
  className: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().string),
  /**
   * The component used for the root node.
   * Either a string to use a HTML element or a component.
   */
  component: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().elementType),
  /**
   * If `true`, the text will have a bottom margin.
   * @default false
   */
  gutterBottom: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().bool),
  /**
   * If `true`, the text will not wrap, but instead will truncate with a text overflow ellipsis.
   *
   * Note that text overflow can only happen with block or inline-block level elements
   * (the element needs to have a width in order to overflow).
   * @default false
   */
  noWrap: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().bool),
  /**
   * If `true`, the element will be a paragraph element.
   * @default false
   */
  paragraph: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().bool),
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx: prop_types__WEBPACK_IMPORTED_MODULE_3___default().oneOfType([prop_types__WEBPACK_IMPORTED_MODULE_3___default().arrayOf(prop_types__WEBPACK_IMPORTED_MODULE_3___default().oneOfType([(prop_types__WEBPACK_IMPORTED_MODULE_3___default().func), (prop_types__WEBPACK_IMPORTED_MODULE_3___default().object), (prop_types__WEBPACK_IMPORTED_MODULE_3___default().bool)])), (prop_types__WEBPACK_IMPORTED_MODULE_3___default().func), (prop_types__WEBPACK_IMPORTED_MODULE_3___default().object)]),
  /**
   * Applies the theme typography styles.
   * @default 'body1'
   */
  variant: prop_types__WEBPACK_IMPORTED_MODULE_3___default().oneOfType([prop_types__WEBPACK_IMPORTED_MODULE_3___default().oneOf(['body1', 'body2', 'button', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'inherit', 'overline', 'subtitle1', 'subtitle2']), (prop_types__WEBPACK_IMPORTED_MODULE_3___default().string)]),
  /**
   * The component maps the variant prop to a range of different HTML element types.
   * For instance, subtitle1 to `<h6>`.
   * If you wish to change that mapping, you can provide your own.
   * Alternatively, you can use the `component` prop.
   * @default {
   *   h1: 'h1',
   *   h2: 'h2',
   *   h3: 'h3',
   *   h4: 'h4',
   *   h5: 'h5',
   *   h6: 'h6',
   *   subtitle1: 'h6',
   *   subtitle2: 'h6',
   *   body1: 'p',
   *   body2: 'p',
   *   inherit: 'p',
   * }
   */
  variantMapping: (prop_types__WEBPACK_IMPORTED_MODULE_3___default().object)
} : 0;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Typography);

/***/ },

/***/ "../node_modules/@mui/material/Typography/typographyClasses.js"
/*!*********************************************************************!*\
  !*** ../node_modules/@mui/material/Typography/typographyClasses.js ***!
  \*********************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getTypographyUtilityClass: () => (/* binding */ getTypographyUtilityClass)
/* harmony export */ });
/* harmony import */ var _mui_utils_generateUtilityClasses__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @mui/utils/generateUtilityClasses */ "../node_modules/@mui/utils/esm/generateUtilityClasses/generateUtilityClasses.js");
/* harmony import */ var _mui_utils_generateUtilityClass__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/utils/generateUtilityClass */ "../node_modules/@mui/utils/esm/generateUtilityClass/generateUtilityClass.js");


function getTypographyUtilityClass(slot) {
  return (0,_mui_utils_generateUtilityClass__WEBPACK_IMPORTED_MODULE_1__["default"])('MuiTypography', slot);
}
const typographyClasses = (0,_mui_utils_generateUtilityClasses__WEBPACK_IMPORTED_MODULE_0__["default"])('MuiTypography', ['root', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'inherit', 'button', 'caption', 'overline', 'alignLeft', 'alignRight', 'alignCenter', 'alignJustify', 'noWrap', 'gutterBottom', 'paragraph']);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (typographyClasses);

/***/ },

/***/ "./src/components/CreateNetworkFromCx2Menu.tsx"
/*!*****************************************************!*\
  !*** ./src/components/CreateNetworkFromCx2Menu.tsx ***!
  \*****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "../node_modules/react/jsx-runtime.js");
/* harmony import */ var _mui_material_Typography__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material/Typography */ "../node_modules/@mui/material/Typography/Typography.js");
/* harmony import */ var cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! cyweb/NetworkApi */ "webpack/container/remote/cyweb/NetworkApi");
/* harmony import */ var cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2__);



const sampleUrl = 'https://raw.githubusercontent.com/cytoscape/cytoscape-web-app-examples/refs/heads/development/docs/data/sample2.cx2';
/**
 * Menu item that fetches a CX2 file from a remote URL and creates a network.
 * Registered with closeOnAction: true — the host auto-closes the menu.
 */
const CreateNetworkFromCx2Menu = () => {
    const networkApi = (0,cyweb_NetworkApi__WEBPACK_IMPORTED_MODULE_2__.useNetworkApi)();
    const fetchCx2fromURL = async (url) => {
        const response = await fetch(url);
        return (await response.json());
    };
    const handleClick = () => {
        fetchCx2fromURL(sampleUrl).then((cx2) => {
            const result = networkApi.createNetworkFromCx2({
                cxData: cx2,
                navigate: true,
                addToWorkspace: true,
            });
            if (!result.success) {
                console.error(result.error.message);
            }
        });
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_1__["default"], { onClick: handleClick, sx: {
            width: '100%',
            px: 2,
            py: 1,
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' },
        }, children: "Create a network from remote CX2" }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (CreateNetworkFromCx2Menu);


/***/ }

}]);