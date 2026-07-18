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
exports.handleTextDocumentChange = void 0;
const path = __importStar(require("path"));
const syntaxHighlighter_1 = require("./syntaxHighlighter");
const frontmatter_1 = require("./frontmatter");
const firstWordCache = new Map();
// Function to handle text document change events
function handleTextDocumentChange(event, diagramMappings, isTextEditorChanged) {
    const document = event?.document || event?.document;
    if (!document) {
        return;
    }
    ;
    const fileExt = path.extname(document.uri.fsPath);
    if ((!document.isUntitled && (fileExt === ".mmd" || fileExt === ".mermaid")) || document.isUntitled) {
        const documentUri = document.uri.toString();
        const firstWord = (0, frontmatter_1.getFirstWordFromDiagram)(document.getText());
        if ((firstWordCache.get(documentUri) === firstWord || firstWord === '') && !isTextEditorChanged) {
            return;
        }
        // Update the cache with the new first word
        firstWordCache.set(documentUri, firstWord);
        // Check if the first word matches any diagram type
        const diagramType = (0, syntaxHighlighter_1.getDiagramTypeFromWord)(firstWord, diagramMappings);
        if (diagramType) {
            const grammarPath = path.join(__dirname, '..', 'syntaxes', `mermaid-${diagramType}.tmLanguage.json`);
            // Apply the syntax highlighting from the appropriate .tmLanguage file
            (0, syntaxHighlighter_1.applySyntaxHighlighting)(document, grammarPath);
        }
    }
}
exports.handleTextDocumentChange = handleTextDocumentChange;
//# sourceMappingURL=eventHandlers.js.map