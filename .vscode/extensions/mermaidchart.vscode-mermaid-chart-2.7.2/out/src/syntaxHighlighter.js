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
exports.clearTmLanguageCache = exports.applySyntaxHighlighting = exports.loadTmLanguage = exports.getDiagramTypeFromWord = void 0;
const fs = __importStar(require("fs"));
const vscode = __importStar(require("vscode"));
// Function to map the first word to a diagram type
function getDiagramTypeFromWord(firstWord, diagramMappings) {
    for (const [diagramType, aliases] of Object.entries(diagramMappings)) {
        if (aliases.map(alias => alias.toLowerCase()).includes(firstWord.toLowerCase())) {
            return diagramType;
        }
    }
    return null;
}
exports.getDiagramTypeFromWord = getDiagramTypeFromWord;
// Create a cache for loaded tmLanguage files
const tmLanguageCache = {};
// Function to load the .tmLanguage file with caching
function loadTmLanguage(filePath) {
    // Check if the file is already in cache
    if (tmLanguageCache[filePath]) {
        return tmLanguageCache[filePath];
    }
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        // Store in cache for future use
        tmLanguageCache[filePath] = parsed;
        return parsed;
    }
    catch (error) {
        console.error(`Error loading tmLanguage file: ${filePath}`, error);
        return null;
    }
}
exports.loadTmLanguage = loadTmLanguage;
// Function to apply syntax highlighting
function applySyntaxHighlighting(document, tmLanguageFilePath) {
    const tmLanguage = loadTmLanguage(tmLanguageFilePath);
    if (tmLanguage) {
        const languageId = `mermaid.${tmLanguage.name}`; // Get languageId from tmLanguage name
        // Set the text document language using languageId
        vscode.languages.setTextDocumentLanguage(document, languageId).then(() => {
            // console.log(`Applied syntax highlighting for ${languageId}`);
        }, (error) => {
            console.error('Failed to apply syntax highlighting:', error);
        });
    }
}
exports.applySyntaxHighlighting = applySyntaxHighlighting;
// Function to clear the cache (useful if files are updated)
function clearTmLanguageCache() {
    Object.keys(tmLanguageCache).forEach(key => delete tmLanguageCache[key]);
}
exports.clearTmLanguageCache = clearTmLanguageCache;
//# sourceMappingURL=syntaxHighlighter.js.map