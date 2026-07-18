"use strict";
/**
 * Main entrypoint for the markdown preview.
 *
 * This runs in the markdown preview's webview.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mermaid_1 = __importDefault(require("@mermaid-chart/mermaid"));
const shared_mermaid_1 = require("../shared-mermaid");
function init() {
    const configSpan = document.getElementById('markdown-mermaid');
    const darkModeTheme = configSpan?.dataset.darkModeTheme;
    const lightModeTheme = configSpan?.dataset.lightModeTheme;
    const maxTextSize = configSpan?.dataset.maxTextSize;
    const config = {
        startOnLoad: false,
        maxTextSize: maxTextSize ? Number(maxTextSize) : 50000,
        theme: (document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast')
            ? darkModeTheme ?? 'dark'
            : lightModeTheme ?? 'default'),
    };
    mermaid_1.default.initialize(config);
    (0, shared_mermaid_1.registerMermaidAddons)();
    (0, shared_mermaid_1.renderMermaidBlocksInElement)(document.body, (mermaidContainer, content) => {
        mermaidContainer.innerHTML = content;
    });
}
window.addEventListener('vscode.markdown.updateContent', init);
init();
//# sourceMappingURL=index.js.map