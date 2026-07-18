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
exports.PreviewBridgeImpl = void 0;
const vscode = __importStar(require("vscode"));
const previewPanel_1 = require("../../../panels/previewPanel");
class PreviewBridgeImpl {
    async createOrShowPreview(documentUri, code) {
        try {
            // If a documentUri is provided, use that existing document
            if (documentUri) {
                const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri));
                previewPanel_1.PreviewPanel.createOrShow(document);
                return;
            }
            // Otherwise use the code parameter
            if (code) {
                const activeEditor = vscode.window.activeTextEditor;
                const activeDocument = activeEditor?.document;
                if (!activeDocument || activeDocument.getText() !== code) {
                    await vscode.commands.executeCommand("mermaidChart.openResponsePreview", code);
                }
                else {
                    previewPanel_1.PreviewPanel.createOrShow(activeDocument);
                }
            }
        }
        catch (error) {
            console.error("Error in preview bridge:", error);
            throw error;
        }
    }
}
exports.PreviewBridgeImpl = PreviewBridgeImpl;
//# sourceMappingURL=previewTool.js.map