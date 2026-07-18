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
exports.saveDiagramAsPng = exports.saveDiagramAsSvg = void 0;
const vscode = __importStar(require("vscode"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const filenameService_1 = require("./filenameService");
async function saveDiagramAsSvg(document, svgcode, diagramCode = '') {
    try {
        const defaultUri = await (0, filenameService_1.getDefaultSaveUri)(document, 'svg', diagramCode);
        // Final safety check - if defaultUri is undefined, create an emergency one
        const safeUri = defaultUri || vscode.Uri.file(path_1.default.join(os_1.default.homedir(), 'untitled_diagram.svg'));
        // Ask user where to save the file
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: safeUri,
            filters: {
                'SVG Image': ['svg']
            },
            title: `Export Mermaid Diagram as SVG image`
        });
        if (saveUri) {
            // Convert base64 to buffer
            const svgBuffer = Buffer.from(svgcode, 'base64');
            // Write the SVG file
            await vscode.workspace.fs.writeFile(saveUri, svgBuffer);
            vscode.window.showInformationMessage(`Diagram exported to ${saveUri.fsPath}`);
        }
    }
    catch (error) {
        console.error('Error in SVG export:', error);
        vscode.window.showErrorMessage(`Sorry, we were unable to generate a SVG of your diagram. Please make sure your diagram has no syntax errors in it and try again.`);
    }
}
exports.saveDiagramAsSvg = saveDiagramAsSvg;
async function saveDiagramAsPng(document, pngBase64, diagramCode = '') {
    try {
        const defaultUri = await (0, filenameService_1.getDefaultSaveUri)(document, 'png', diagramCode);
        // Final safety check - if defaultUri is undefined, create an emergency one
        const safeUri = defaultUri || vscode.Uri.file(path_1.default.join(os_1.default.homedir(), 'untitled_diagram.png'));
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: safeUri,
            filters: {
                'PNG Image': ['png']
            },
            title: `Export Mermaid Diagram as PNG image`
        });
        if (saveUri) {
            // Convert base64 to buffer
            const pngBuffer = Buffer.from(pngBase64, 'base64');
            await vscode.workspace.fs.writeFile(saveUri, pngBuffer);
            vscode.window.showInformationMessage(`Diagram exported to ${saveUri.fsPath}`);
        }
    }
    catch (error) {
        console.error('Error in PNG export:', error);
        vscode.window.showErrorMessage(`Sorry, we were unable to generate a PNG of your diagram. Please make sure your diagram has no syntax errors in it and try again.`);
    }
}
exports.saveDiagramAsPng = saveDiagramAsPng;
//# sourceMappingURL=renderService.js.map