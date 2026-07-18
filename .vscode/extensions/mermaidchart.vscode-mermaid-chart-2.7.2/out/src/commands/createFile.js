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
exports.openMermaidPreview = exports.getPreview = exports.createMermaidFile = void 0;
const vscode = __importStar(require("vscode"));
const previewPanel_1 = require("../panels/previewPanel");
const tempFileCache_1 = require("../cache/tempFileCache");
const analytics_1 = __importDefault(require("../analytics"));
const frontmatter_1 = require("../frontmatter");
async function createMermaidFile(context, diagramContent, isTempFile) {
    const exampleContent = `flowchart TD
    %% Nodes
        A("fab:fa-youtube Starter Guide")
        B("fab:fa-youtube Make Flowchart")
        n1@{ icon: "fa:gem", pos: "b", h: 24}
        C("fa:fa-book-open Learn More")
        D{"Use the editor"}
        n2(Many shapes)@{ shape: delay}
        E(fa:fa-shapes Visual Editor)
        F("fa:fa-chevron-up Add node in toolbar")
        G("fa:fa-comment-dots AI chat")
        H("fa:fa-arrow-left Open AI in side menu")
        I("fa:fa-code Text")
        J(fa:fa-arrow-left Type Mermaid syntax)

    %% Edge connections between nodes
        A --> B --> C --> n1 & D & n2
        D -- Build and Design --> E --> F
        D -- Use AI --> G --> H
        D -- Mermaid js --> I --> J

    %% Individual node styling. Try the visual editor toolbar for easier styling!
        style E color:#FFFFFF, fill:#AA00FF, stroke:#AA00FF
        style G color:#FFFFFF, stroke:#00C853, fill:#00C853
        style I color:#FFFFFF, stroke:#2962FF, fill:#2962FF

    %% You can add notes with two "%" signs in a row!`;
    try {
        const document = await vscode.workspace.openTextDocument({
            language: "mermaid",
            content: diagramContent ?? exampleContent
        });
        const editor = await vscode.window.showTextDocument(document);
        if (!editor?.document) {
            return null;
        }
        const uri = editor.document.uri.toString();
        if (isTempFile) {
            tempFileCache_1.TempFileCache.addTempUri(context, uri);
        }
        else {
            tempFileCache_1.TempFileCache.removeTempUri(context, uri);
        }
        previewPanel_1.PreviewPanel.createOrShow(editor.document);
        return editor;
    }
    catch (error) {
        console.error("Error creating Mermaid file:", error);
        analytics_1.default.trackException(error);
        return null;
    }
}
exports.createMermaidFile = createMermaidFile;
function getPreview() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showErrorMessage("No active editor. Open a .mmd file to preview.");
        return;
    }
    const document = activeEditor.document;
    if (document.languageId !== "plaintext" &&
        !document.fileName.endsWith(".mmd") &&
        !document.fileName.endsWith(".mermaid") &&
        !document.languageId.startsWith('mermaid')) {
        vscode.window.showErrorMessage("Mermaid Preview is only available for mermaid files.");
        return;
    }
    previewPanel_1.PreviewPanel.createOrShow(document);
}
exports.getPreview = getPreview;
async function openMermaidPreview(context, mermaidCode) {
    try {
        // Normalize the Mermaid code using the frontmatter utility
        const normalizedCode = (0, frontmatter_1.normalizeMermaidText)(mermaidCode);
        // Create new file with the normalized code
        return await createMermaidFile(context, normalizedCode, false);
    }
    catch (error) {
        console.error("Error opening Mermaid preview:", error);
        analytics_1.default.trackException(error);
        vscode.window.showErrorMessage("Failed to open Mermaid preview");
        return null;
    }
}
exports.openMermaidPreview = openMermaidPreview;
//# sourceMappingURL=createFile.js.map