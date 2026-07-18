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
exports.registerRegenerateWithMermaidAICommand = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const frontmatter_1 = require("../../frontmatter");
const mermaidChartAuthenticationProvider_1 = require("../../mermaidChartAuthenticationProvider");
/** Extracts clean Mermaid code from a markdown response that may contain a ```mermaid block. */
function extractMermaidCode(markdownText) {
    const mermaidBlockRegex = /```mermaid\s*\n?([\s\S]*?)```/gi;
    const match = mermaidBlockRegex.exec(markdownText);
    return match?.[1]?.trim() ?? markdownText.trim();
}
function registerRegenerateWithMermaidAICommand(context, mcAPI) {
    context.subscriptions.push(vscode.commands.registerCommand('mermaidChart.regenerateDiagramWithMermaidAI', async (mmdUri, sourceFiles) => {
        const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], { silent: true });
        if (!session) {
            const pick = await vscode.window.showInformationMessage('Please login to Mermaid Chart to regenerate diagrams with Mermaid AI.', { modal: true }, 'Login');
            if (pick === 'Login') {
                await mcAPI.login();
            }
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Regenerating ${path.basename(mmdUri.fsPath)} with Mermaid AI...`,
            cancellable: false,
        }, async () => {
            try {
                // Read current diagram content
                const bytes = await vscode.workspace.fs.readFile(mmdUri);
                const fullContent = Buffer.from(bytes).toString('utf-8');
                const { diagramText } = (0, frontmatter_1.splitFrontMatter)(fullContent);
                const result = await mcAPI.regenerateDiagram({
                    code: diagramText,
                    sourceFiles,
                });
                // SDK returns result: 'ok' | 'fail' — 'solved' is optional and may be absent.
                if (result.result !== 'ok' || !result.code) {
                    vscode.window.showWarningMessage(`Mermaid AI could not regenerate ${path.basename(mmdUri.fsPath)}. No changes made.`);
                    return;
                }
                // SDK documents result.code as "Markdown message that may contain a
                // valid mermaid code block." Extract the diagram before writing to disk.
                const cleanedCode = extractMermaidCode(result.code);
                // Preserve existing frontmatter metadata, update generationTime
                const existingMetadata = (0, frontmatter_1.extractMetadataFromCode)(fullContent);
                const updatedContent = (0, frontmatter_1.addMetadataToFrontmatter)(cleanedCode, {
                    query: existingMetadata.query,
                    references: existingMetadata.references,
                    generationTime: new Date(),
                });
                await vscode.workspace.fs.writeFile(mmdUri, Buffer.from(updatedContent, 'utf-8'));
                vscode.window.showInformationMessage(`✅ ${path.basename(mmdUri.fsPath)} updated. Remember to \`git add\` it before committing.`);
            }
            catch (error) {
                // AICreditsLimitExceededError is not exported from @mermaidchart/sdk's
                // public API surface, so we check error.name which the class sets explicitly.
                const isCreditsError = error instanceof Error && error.name === 'AICreditsLimitExceededError';
                if (isCreditsError) {
                    vscode.window.showErrorMessage('Mermaid AI credits limit exceeded. Please check your account at mermaid.ai.');
                }
                else {
                    vscode.window.showErrorMessage(`Failed to regenerate ${path.basename(mmdUri.fsPath)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });
    }));
}
exports.registerRegenerateWithMermaidAICommand = registerRegenerateWithMermaidAICommand;
//# sourceMappingURL=regenerateWithMermaidAICommand.js.map