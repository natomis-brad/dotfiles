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
exports.MermaidWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const loginTemplate_1 = require("../templates/loginTemplate");
const authOptionsTemplate_1 = require("../templates/authOptionsTemplate");
class MermaidWebviewProvider {
    constructor(context) {
        this.currentState = 'login';
        this.context = context;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, "images"),
                vscode.Uri.joinPath(this.context.extensionUri, "media"),
            ],
        };
        this.updateWebviewContent();
        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "signIn":
                    // Show auth options instead of directly logging in
                    this.currentState = 'authOptions';
                    this.updateWebviewContent();
                    break;
                case "startOAuthFlow":
                    // Start the existing OAuth flow
                    vscode.commands.executeCommand("mermaidChart.login");
                    break;
                case "validateManualToken":
                    // Handle manual token validation
                    this.handleManualToken(message.token);
                    break;
                case "backToLogin":
                    // Go back to login screen
                    this.currentState = 'login';
                    this.updateWebviewContent();
                    break;
            }
        });
    }
    refresh() {
        if (this._view) {
            this.currentState = 'login'; // Reset to login state on refresh
            this.updateWebviewContent();
        }
    }
    // Reset state after successful authentication
    resetToLoginState() {
        this.currentState = 'login';
        if (this._view) {
            this.updateWebviewContent();
        }
    }
    updateWebviewContent() {
        if (this._view) {
            switch (this.currentState) {
                case 'login':
                    this._view.webview.html = (0, loginTemplate_1.generateWebviewContent)(this._view.webview, this.context.extensionUri);
                    break;
                case 'authOptions':
                    this._view.webview.html = (0, authOptionsTemplate_1.generateAuthOptionsContent)(this._view.webview, this.context.extensionUri);
                    break;
            }
        }
    }
    async handleManualToken(token) {
        if (!token || token.trim().length === 0) {
            vscode.window.showErrorMessage("Please enter a valid token");
            return;
        }
        try {
            // Show progress while validating
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Validating token...",
                cancellable: false,
            }, async () => {
                // Trigger manual token validation command
                await vscode.commands.executeCommand("mermaidChart.validateManualToken", token.trim());
            });
        }
        catch (error) {
            console.error("Manual token validation failed:", error);
        }
    }
}
exports.MermaidWebviewProvider = MermaidWebviewProvider;
//# sourceMappingURL=loginPanel.js.map