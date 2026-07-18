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
exports.ValidationBridgeImpl = void 0;
const vscode = __importStar(require("vscode"));
const previewTemplate_1 = require("../../../templates/previewTemplate");
const packageJson = __importStar(require("../../../../package.json"));
class ValidationBridgeImpl {
    async validateDiagram(code) {
        return new Promise((resolve) => {
            // Create a webview panel but keep it invisible
            const panel = vscode.window.createWebviewPanel('mermaidValidator', 'Mermaid Validator', {
                viewColumn: vscode.ViewColumn.Two,
                preserveFocus: true
            }, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            // Get extension path correctly
            const extensionPath = vscode.extensions.getExtension(`${packageJson.publisher}.${packageJson.name}`)?.extensionPath;
            if (!extensionPath) {
                panel.dispose();
                resolve({ valid: false, error: "Unable to resolve the extension path" });
                return;
            }
            // Get the current active theme (dark or light)
            const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
            const config = vscode.workspace.getConfiguration();
            const darkTheme = config.get("mermaid.vscode.dark", "dark");
            const lightTheme = config.get("mermaid.vscode.light", "default");
            const currentTheme = isDarkTheme ? darkTheme : lightTheme;
            // Flag to track if we've already handled this validation
            let isResolved = false;
            // Listen for validation results from the webview
            const disposable = panel.webview.onDidReceiveMessage(message => {
                console.log('Received message from validation webview:', message);
                if (message.type === "validationResult" && !isResolved) {
                    isResolved = true;
                    resolve({
                        valid: message.valid,
                        error: message.valid ? undefined : message.message
                    });
                    panel.dispose();
                    disposable.dispose();
                    clearTimeout(timeoutId);
                    if (retryTimeoutId)
                        clearTimeout(retryTimeoutId);
                }
            });
            // Use the same template as the preview panel
            panel.webview.html = (0, previewTemplate_1.getWebviewHTML)(panel, extensionPath, code, currentTheme, true);
            // We need to wait for the webview to load and be visible momentarily
            setTimeout(() => {
                panel.reveal(vscode.ViewColumn.Two, true);
            }, 200);
            // Send message to trigger validation mode
            const sendValidationMessage = () => {
                panel.webview.postMessage({
                    type: 'update',
                    content: code,
                    currentTheme: currentTheme,
                    isFileChange: false,
                    validateOnly: true
                });
            };
            // First attempt at validation after a delay
            setTimeout(sendValidationMessage, 2000); // Increased initial delay
            // Set up a retry mechanism in case the first attempt fails
            let retryTimeoutId = null;
            retryTimeoutId = setTimeout(() => {
                if (!isResolved) {
                    sendValidationMessage();
                }
            }, 5000); // Try again after 5 seconds if no response
            // Set a timeout for validation
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    resolve({ valid: false, error: 'Validation timed out' });
                    panel.dispose();
                    disposable.dispose();
                    if (retryTimeoutId)
                        clearTimeout(retryTimeoutId);
                }
            }, 30000); // Increased timeout to 30 seconds
        });
    }
}
exports.ValidationBridgeImpl = ValidationBridgeImpl;
//# sourceMappingURL=validationTool.js.map