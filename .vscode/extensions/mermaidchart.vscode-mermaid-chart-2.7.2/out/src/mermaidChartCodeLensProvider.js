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
exports.MermaidChartCodeLensProvider = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const util_1 = require("./util");
const mermaidChartAuthenticationProvider_1 = require("./mermaidChartAuthenticationProvider");
const frontmatter_1 = require("./frontmatter");
class MermaidChartCodeLensProvider {
    constructor(mermaidChartTokens) {
        this.mermaidChartTokens = mermaidChartTokens;
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    setMermaidChartTokens(mermaidChartTokens) {
        this.mermaidChartTokens = mermaidChartTokens;
    }
    refresh() {
        this._onDidChangeCodeLenses.fire();
    }
    async provideCodeLenses(document, _token) {
        const codeLenses = [];
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return codeLenses;
        const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], { silent: true });
        if (editor?.document?.languageId.startsWith('mermaid')) {
            this.provideCodeLensesForMermaid(document, codeLenses, session);
        }
        else if (this.isCodingFile(document) && this.showGenerateDiagramCodeLens()) {
            this.addCodingFileCodeLenses(codeLenses, document);
        }
        else {
            for (const token of this.mermaidChartTokens) {
                const documentText = editor.document.getText(token.range);
                const diagramId = (0, frontmatter_1.extractIdFromCode)(documentText);
                const isAux = (0, util_1.isAuxFile)(editor.document.fileName);
                if (isAux) {
                    this.addAuxFileCodeLenses(codeLenses, token, session, diagramId);
                }
                else {
                    this.addMainFileCodeLenses(codeLenses, token);
                }
            }
        }
        return codeLenses;
    }
    addAuxFileCodeLenses(codeLenses, token, session, diagramId) {
        if (session && !diagramId) {
            codeLenses.push(this.createCodeLens(token, "Connect Diagram", "mermaid.connectDiagram", [token.uri, token.range]));
        }
        else if (session && diagramId) {
            codeLenses.push(this.createCodeLens(token, "Edit Diagram in Mermaid Chart", "extension.editMermaidChart", [diagramId]));
        }
        codeLenses.push(this.createCodeLens(token, "Edit Diagram", "mermaid.editAuxFile", [token.uri, token.range]));
    }
    addMainFileCodeLenses(codeLenses, token) {
        codeLenses.push(this.createCodeLens(token, "View Diagram", "mermaidChart.viewMermaidChart", [token.uuid]));
        codeLenses.push(this.createCodeLens(token, "Edit Diagram in Mermaid Chart", "extension.editMermaidChart", [token.uuid]));
        codeLenses.push(this.createCodeLens(token, "Edit Diagram", "mermaidChart.editLocally", [token.uuid]));
    }
    createCodeLens(token, title, command, args) {
        return new vscode.CodeLens(token.range, { title, command, arguments: args });
    }
    /**
     * Check if the document is a coding file that should show our CodeLens commands
     */
    isCodingFile(document) {
        // Comprehensive list of coding file extensions
        const codingExtensions = [
            // JavaScript/TypeScript
            '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
            // Python
            '.py', '.pyw', '.pyi',
            // Java/JVM languages
            '.java', '.kt', '.scala', '.groovy',
            // C/C++
            '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
            // C#/.NET
            '.cs', '.vb', '.fs', '.fsx',
            // Go
            '.go',
            // Rust
            '.rs',
            // PHP
            '.php', '.phtml',
            // Ruby
            '.rb', '.rbx',
            // Swift
            '.swift',
            // Other popular languages
            '.dart', '.lua', '.perl', '.pl', '.r', '.m', '.mm',
            '.clj', '.cljs', '.elm', '.ex', '.exs', '.hs', '.jl',
            '.nim', '.pas', '.pp', '.sh', '.bash', '.zsh', '.fish',
            // Configuration/Scripting
            '.sql', '.ps1', '.psm1', '.psd1'
        ];
        const fileExt = path.extname(document.fileName).toLowerCase();
        if (!fileExt)
            return false;
        return codingExtensions.includes(fileExt);
    }
    showGenerateDiagramCodeLens() {
        return vscode.workspace
            .getConfiguration("mermaidChart")
            .get("showGenerateDiagramCodeLens", true);
    }
    /**
     * Add CodeLens commands for coding files at the end of the file
     */
    addCodingFileCodeLenses(codeLenses, document) {
        const lineCount = document.lineCount;
        if (lineCount === 0) {
            return;
        }
        // VS Code renders CodeLens above the target line: on a non-empty last line the lens
        const targetLine = lineCount - 1;
        const codeInRange = new vscode.Range(targetLine, 0, targetLine, 0);
        // Add "Generate Mermaid Diagram" command
        codeLenses.push(new vscode.CodeLens(codeInRange, {
            title: "▷ Generate Mermaid Diagram",
            command: "mermaidChart.generateDiagramFromCode",
            arguments: []
        }));
        // Add "Open Chat @mermaid-chart" command  
        codeLenses.push(new vscode.CodeLens(codeInRange, {
            title: "💬 Open Chat @mermaid-chart",
            command: "mermaidChart.openCopilotChat",
            arguments: []
        }));
    }
    provideCodeLensesForMermaid(document, codeLenses, session) {
        const text = document.getText();
        const metadata = (0, frontmatter_1.extractMetadataFromCode)(text);
        if (metadata?.references) {
            let workspacePath = '';
            // Handle untitled files differently
            if (document.uri.scheme === 'untitled') {
                // Use the first workspace folder as fallback for untitled files
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    workspacePath = workspaceFolders[0].uri.fsPath;
                }
            }
            else {
                // For regular files, use the containing workspace folder
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                workspacePath = workspaceFolder ? workspaceFolder.uri.fsPath : '';
            }
            // Only proceed with checking references if we have a valid workspace path
            if (workspacePath) {
                const changedReferencesList = (0, frontmatter_1.checkReferencedFiles)(metadata, workspacePath);
                if (changedReferencesList?.length > 0) {
                    // Get the position where diagram text starts
                    const diagramStartIndex = (0, frontmatter_1.findDiagramContentStartPosition)(text);
                    const diagramStartPosition = document.positionAt(diagramStartIndex);
                    // Create a range at the beginning of the line where diagram text starts
                    const codeLensPosition = new vscode.Range(diagramStartPosition.line, 0, diagramStartPosition.line, 0);
                    codeLenses.push(new vscode.CodeLens(codeLensPosition, {
                        title: "▷ Regenerate Diagram",
                        command: "mermaidChart.regenerateDiagram",
                        arguments: [document.uri, metadata.query, changedReferencesList, metadata, session ? true : false],
                    }));
                    (0, util_1.applyGutterIconDecoration)(codeLensPosition);
                }
            }
        }
    }
}
exports.MermaidChartCodeLensProvider = MermaidChartCodeLensProvider;
//# sourceMappingURL=mermaidChartCodeLensProvider.js.map