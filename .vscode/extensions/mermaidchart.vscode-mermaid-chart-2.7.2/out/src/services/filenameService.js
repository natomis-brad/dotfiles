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
exports.getDefaultSaveUri = exports.generateDiagramFilenameWithAI = void 0;
const vscode = __importStar(require("vscode"));
const path_1 = __importDefault(require("path"));
/**
 * Attempts to generate a filename for a Mermaid diagram using AI
 */
async function generateDiagramFilenameWithAI(diagramCode) {
    try {
        // Check if VS Code LM API is available
        if (!vscode.lm) {
            return undefined;
        }
        // Try to get any available AI model
        const [model] = await vscode.lm.selectChatModels({});
        if (!model) {
            return undefined;
        }
        const messages = [
            vscode.LanguageModelChatMessage.Assistant('You generate concise, descriptive filenames for Mermaid diagrams.'),
            vscode.LanguageModelChatMessage.User(`Generate a short, descriptive filename (without extension) for this Mermaid diagram.
            Use only alphanumeric characters, underscores, and hyphens.
            
            IMPORTANT RULES:
            1. Keep it VERY concise - use at most 2-4 words total (max 25 characters).
            2. Focus on the main concept or purpose, not individual steps or details.
            3. Do NOT include the diagram type (like "flowchart", "sequence", "class", "gantt", etc.) in the filename.
            4. Ignore icon or formatting prefixes (like "fa:", "fab:", "fa-", etc.) when creating the filename.
            
            Examples:
            - For a sequence diagram about patient registration → "patient_registration"
            - For a flowchart about YouTube starter guide → "youtube_guide"
            - For a class diagram of a library system → "library_system"
            - For a CI/CD pipeline with code commits, tests, builds and deployments → "cicd_pipeline" (not "code_commit_test_build_deploy")
            
            Diagram: ${diagramCode}
            
            Respond with only the filename.`)
        ];
        const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
        // Process the response
        let suggestedName = '';
        for await (const chunk of response.text) {
            suggestedName += chunk;
        }
        // Clean and sanitize the filename
        suggestedName = suggestedName.trim()
            .replace(/[^\w\-]/g, '_') // Replace invalid chars
            .replace(/_+/g, '_') // Replace multiple underscores
            .toLowerCase();
        if (suggestedName && suggestedName.length > 0) {
            return suggestedName;
        }
    }
    catch (error) {
        console.log('AI filename suggestion failed:', error);
    }
    return undefined;
}
exports.generateDiagramFilenameWithAI = generateDiagramFilenameWithAI;
/**
 * Determines the default URI location to save a diagram file
 */
function getDefaultSaveUri(document, extension, diagramCode = '') {
    return new Promise(async (resolve) => {
        try {
            // Get either AI-suggested name or default name
            let baseName = '';
            const aiExportEnabled = vscode.workspace.getConfiguration('mermaid.vscode').get('aiExportName');
            // check for diagramCode and AI export setting - if true suggest name to a file using the AI 
            if (diagramCode && aiExportEnabled) {
                try {
                    const aiSuggestedName = await generateDiagramFilenameWithAI(diagramCode);
                    console.log('AI suggested name:', aiSuggestedName); // Debug log
                    if (aiSuggestedName && aiSuggestedName.trim() !== '') {
                        baseName = aiSuggestedName;
                        console.log('Using AI suggested name:', baseName); // Debug log
                    }
                    else {
                        console.log('AI returned empty name, fallback to document name'); // Debug log
                        baseName = path_1.default.basename(document.fileName || 'diagram', path_1.default.extname(document.fileName || ''));
                    }
                }
                catch (aiError) {
                    console.error('Error in AI name suggestion:', aiError);
                    baseName = path_1.default.basename(document.fileName || 'diagram', path_1.default.extname(document.fileName || ''));
                }
            }
            else {
                baseName = path_1.default.basename(document.fileName || 'diagram', path_1.default.extname(document.fileName || ''));
            }
            // Triple safety check - ensure baseName is never empty
            if (!baseName || baseName.trim() === '') {
                console.log('Fallback to untitled_diagram due to empty baseName'); // Debug log
                baseName = 'untitled_diagram';
            }
            console.log('Final baseName before URI construction:', baseName); // Debug log
            let fileUri;
            // If document has a URI, use its parent directory
            if (document.uri && document.uri.scheme === 'file') {
                fileUri = vscode.Uri.joinPath(document.uri, `../${baseName}.${extension}`);
                console.log('Using document URI path:', fileUri.fsPath); // Debug log
                resolve(fileUri);
                return;
            }
            // For untitled documents, try to use workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, `${baseName}.${extension}`);
                console.log('Using workspace folder path:', fileUri.fsPath); // Debug log
                resolve(fileUri);
                return;
            }
            // Ultimate fallback - if all else fails
            console.log('No valid URI could be constructed, returning undefined'); // Debug log
            resolve(undefined);
        }
        catch (error) {
            console.error('Error getting save location:', error);
            // Super-safe fallback with guaranteed non-empty name
            try {
                const safeBaseName = 'untitled_diagram';
                console.log('Using emergency fallback name:', safeBaseName); // Debug log
                if (document.uri && document.uri.scheme === 'file') {
                    const fileUri = vscode.Uri.joinPath(document.uri, `../${safeBaseName}.${extension}`);
                    console.log('Emergency fallback URI:', fileUri.fsPath); // Debug log
                    resolve(fileUri);
                }
                else {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders && workspaceFolders.length > 0) {
                        const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, `${safeBaseName}.${extension}`);
                        console.log('Emergency fallback workspace URI:', fileUri.fsPath); // Debug log
                        resolve(fileUri);
                    }
                    else {
                        console.log('No valid fallback URI could be constructed'); // Debug log
                        resolve(undefined);
                    }
                }
            }
            catch (emergencyError) {
                console.error('Critical error in fallback logic:', emergencyError);
                resolve(undefined);
            }
        }
    });
}
exports.getDefaultSaveUri = getDefaultSaveUri;
//# sourceMappingURL=filenameService.js.map