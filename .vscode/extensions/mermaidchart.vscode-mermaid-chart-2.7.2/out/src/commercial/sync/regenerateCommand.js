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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRegenerateCommand = void 0;
const vscode = __importStar(require("vscode"));
const analytics_1 = __importDefault(require("../../analytics"));
const vscode_utils_1 = require("@mermaid-chart/vscode-utils");
function registerRegenerateCommand(context, mcAPI) {
    context.subscriptions.push(vscode.commands.registerCommand('mermaidChart.regenerateDiagram', async (uri, originalQuery, changedFiles, metadata, isLoggedIn) => {
        // Track regenerate command invocation
        analytics_1.default.trackRegenerateCommandInvoked();
        if (isLoggedIn) {
            await vscode_utils_1.DiagramRegenerator.regenerateDiagram(uri, originalQuery, changedFiles, metadata);
        }
        else {
            const result = await vscode.window.showInformationMessage('Please login to Mermaid Chart to regenerate diagrams.', { modal: true }, 'Login');
            if (result === 'Login') {
                await mcAPI.login();
            }
            else {
                console.log('Login cancelled');
            }
        }
    }));
}
exports.registerRegenerateCommand = registerRegenerateCommand;
//# sourceMappingURL=regenerateCommand.js.map