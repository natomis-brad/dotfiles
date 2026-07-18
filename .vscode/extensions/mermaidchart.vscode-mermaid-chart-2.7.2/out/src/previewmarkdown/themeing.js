"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectMermaidTheme = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("../util");
const defaultMermaidTheme = 'default';
const validMermaidThemes = [
    'neo',
    'redux',
    'mc',
    'null',
    'default',
    'base',
    'forest',
    'dark',
    'neutral',
    'neo-dark',
    'redux-dark',
    'redux-color',
    'redux-dark-color'
];
function sanitizeMermaidTheme(theme) {
    return typeof theme === 'string' && validMermaidThemes.includes(theme) ? theme : defaultMermaidTheme;
}
function injectMermaidTheme(md) {
    const render = md.renderer.render;
    md.renderer.render = function (...args) {
        const config = vscode.workspace.getConfiguration(util_1.configSection);
        const darkModeTheme = sanitizeMermaidTheme(config.get('vscode.dark'));
        const lightModeTheme = sanitizeMermaidTheme(config.get('vscode.light'));
        const maxTextSize = config.get('maxTextSize');
        return `<span id="${util_1.configSection}" aria-hidden="true"
                    data-dark-mode-theme="${darkModeTheme}"
                    data-light-mode-theme="${lightModeTheme}"
                    data-max-text-size="${maxTextSize}"></span>
                ${render.apply(md.renderer, args)}`;
    };
    return md;
}
exports.injectMermaidTheme = injectMermaidTheme;
//# sourceMappingURL=themeing.js.map