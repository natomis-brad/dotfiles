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
exports.flattenProjects = exports.triggerSuggestIfEmpty = exports.getDiagramTemplates = exports.applyGutterIconDecoration = exports.findDiagramCode = exports.getHelpUrl = exports.isAuxFile = exports.syncFiles = exports.syncAuxFile = exports.getMermaidChartTokenDecoration = exports.updateViewVisibility = exports.insertMermaidChartToken = exports.editMermaidChart = exports.viewMermaidChart = exports.ensureAuthenticated = exports.getImageDataURL = exports.findComments = exports.applyMermaidChartTokenHighlighting = exports.findMermaidChartTokensFromAuxFiles = exports.findMermaidChartTokens = exports.getEncodedSHA256Hash = exports.promiseFromEvent = exports.pattern = exports.configSection = exports.defaultBaseURL = void 0;
const mermaidChartAuthenticationProvider_1 = require("./mermaidChartAuthenticationProvider");
const vscode_1 = require("vscode");
const crypto_1 = require("crypto");
const vscode = __importStar(require("vscode"));
const mermaidChartProvider_1 = require("./mermaidChartProvider");
const path = __importStar(require("path"));
const frontmatter_1 = require("./frontmatter");
const packageJson = __importStar(require("../package.json"));
const activeListeners = new Map();
const REOPEN_CHECK_DELAY_MS = 500; // Delay before checking if temp file is reopened
const diagramTemplates_1 = require("./constants/diagramTemplates");
const config = vscode.workspace.getConfiguration();
exports.defaultBaseURL = config.get('mermaidChart.baseUrl', 'https://mermaid.ai');
const DARK_BACKGROUND = "rgba(176, 19, 74, 0.5)"; // #B0134A with 50% opacity
const LIGHT_BACKGROUND = "#FDE0EE";
const DARK_COLOR = "#FFFFFF";
const LIGHT_COLOR = "#1E1A2E";
exports.configSection = 'mermaid';
exports.pattern = {
    ".md": /```mermaid([\s\S]*?)```/g,
    ".html": /<div class=["']mermaid["']>([\s\S]*?)<\/div>/g,
    ".hugo": /{{<mermaid[^>]*>}}([\s\S]*?){{<\/mermaid>}}/g,
    ".rst": /\.\. mermaid::(?:[ \t]*)?$(?:(?:\n[ \t]+:(?:(?:\\:\s)|[^:])+:[^\n]*$)+\n)?((?:\n(?:[ \t][^\n]*)?$)+)?/gm,
};
const passthrough = (value, resolve) => resolve(value);
/**
 * Return a promise that resolves with the next emitted event, or with some future
 * event as decided by an adapter.
 *
 * If specified, the adapter is a function that will be called with
 * `(event, resolve, reject)`. It will be called once per event until it resolves or
 * rejects.
 *
 * The default adapter is the passthrough function `(value, resolve) => resolve(value)`.
 *
 * @param event the event
 * @param adapter controls resolution of the returned promise
 * @returns a promise that resolves or rejects as specified by the adapter
 */
function promiseFromEvent(event, adapter = passthrough) {
    let subscription;
    let cancel = new vscode_1.EventEmitter();
    return {
        promise: new Promise((resolve, reject) => {
            cancel.event((_) => reject("Cancelled"));
            subscription = event((value) => {
                try {
                    Promise.resolve(adapter(value, resolve, reject)).catch(reject);
                }
                catch (error) {
                    reject(error);
                }
            });
        }).then((result) => {
            subscription.dispose();
            return result;
        }, (error) => {
            subscription.dispose();
            throw error;
        }),
        cancel,
    };
}
exports.promiseFromEvent = promiseFromEvent;
const getEncodedSHA256Hash = (str) => {
    const hash = (0, crypto_1.createHash)("sha256").update(str).digest("hex");
    return Buffer.from(hash)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};
exports.getEncodedSHA256Hash = getEncodedSHA256Hash;
function findMermaidChartTokens(document, comments) {
    const mermaidChartTokens = [];
    for (const commentRange of comments) {
        const commentText = document.getText(commentRange);
        const mermaidChartTokenRegex = /\[MermaidChart: ([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})]/g;
        let match;
        while ((match = mermaidChartTokenRegex.exec(commentText)) !== null) {
            const uuid = match[1];
            const startCharacter = commentRange.start.character + (match.index || 0);
            const endCharacter = startCharacter + match[0].length;
            const lineNumber = commentRange.start.line;
            mermaidChartTokens.push({
                uuid,
                title: `Chart - ${uuid}`,
                range: new vscode.Range(lineNumber, startCharacter, lineNumber, endCharacter),
            });
        }
    }
    return mermaidChartTokens;
}
exports.findMermaidChartTokens = findMermaidChartTokens;
function findMermaidChartTokensFromAuxFiles(document) {
    const mermaidChartTokens = [];
    const text = document.getText();
    const fileExt = path.extname(document.fileName);
    const regex = exports.pattern[fileExt];
    let match;
    while ((match = regex.exec(text)) !== null) {
        // Get the full match range
        const fullRange = new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
        // Extract only the Mermaid content (match[1] contains the content between delimiters)
        const contentStart = match.index + match[0].indexOf(match[1]);
        const contentRange = new vscode.Range(document.positionAt(contentStart), document.positionAt(contentStart + match[1].length));
        const extractedId = (0, frontmatter_1.extractIdFromCode)(match[1]) || "";
        mermaidChartTokens.push({
            title: `Chart - ${extractedId}`,
            uri: document.uri,
            range: contentRange,
            uuid: extractedId,
        });
    }
    return mermaidChartTokens;
}
exports.findMermaidChartTokensFromAuxFiles = findMermaidChartTokensFromAuxFiles;
function applyMermaidChartTokenHighlighting(editor, mermaidChartTokens, mermaidChartTokenDecoration, mermaidChartGutterIconDecoration, isAuxFile) {
    if (!isAuxFile) {
        const fullBlockDecorations = mermaidChartTokens.map(token => ({
            range: token.range,
        }));
        editor.setDecorations(mermaidChartTokenDecoration, fullBlockDecorations);
    }
    const gutterIconDecorations = mermaidChartTokens.map(token => ({
        range: new vscode.Range(token.range.start, token.range.start), // Only first line for gutter icon
    }));
    editor.setDecorations(mermaidChartGutterIconDecoration, gutterIconDecorations);
}
exports.applyMermaidChartTokenHighlighting = applyMermaidChartTokenHighlighting;
function findComments(document) {
    const comments = [];
    const commentPattern = /(?:\/\/|#|\/\*|<!--).*$/gm;
    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
        const line = document.lineAt(lineNumber);
        let match;
        while ((match = commentPattern.exec(line.text)) !== null) {
            const startPosition = new vscode.Position(lineNumber, match.index);
            const endPosition = new vscode.Position(lineNumber, match.index + match[0].length);
            comments.push(new vscode.Range(startPosition, endPosition));
        }
    }
    return comments;
}
exports.findComments = findComments;
/**
 * Convert SVG xml to png base64 url
 * @param {any} svgXml
 */
function getImageDataURL(svgXml) {
    let base64 = encodeURIComponent(Buffer.from(svgXml, "utf8").toString("base64"));
    return "data:image/svg+xml;base64," + base64;
}
exports.getImageDataURL = getImageDataURL;
async function ensureAuthenticated() {
    const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], { silent: true });
    if (!session) {
        const selection = await vscode.window.showInformationMessage("You need to be logged in to perform this action.", "Login");
        if (selection === "Login") {
            vscode.commands.executeCommand("mermaidChart.login");
        }
        return false;
    }
    return true;
}
exports.ensureAuthenticated = ensureAuthenticated;
async function viewMermaidChart(mcAPI, uuid) {
    if (!(await ensureAuthenticated())) {
        return;
    }
    const panel = vscode.window.createWebviewPanel("mermaidChartView", `Mermaid Chart: ${uuid}`, vscode.ViewColumn.One, {});
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark; //ColorTheme.Light;
    // Choose the appropriate URL based on the current theme
    const themeParameter = isDarkTheme ? "dark" : "light";
    const svgContent = await mcAPI.getRawDocument({
        documentID: uuid,
        major: 0,
        minor: 1,
    }, themeParameter);
    panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en" style="height: 100%;">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="height: 100%; margin: 0; padding: 0; overflow: hidden;">
        <iframe sandbox="allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation-by-user-activation" src="${getImageDataURL(svgContent)}" style="width: 100%; height: 100%; border: none;"></iframe>
    </body>
    </html>`;
}
exports.viewMermaidChart = viewMermaidChart;
async function editMermaidChart(mcAPI, uuid, provider) {
    if (!(await ensureAuthenticated())) {
        return;
    }
    // Retrieve the document details to get the required fields
    const document = await mcAPI.getDocument({ documentID: uuid });
    if (!document || !document.projectID) {
        vscode.window.showErrorMessage("Document details not found. Unable to edit the chart.");
        return;
    }
    const editUrl = await mcAPI.getEditURL({
        documentID: document.documentID,
        major: document.major,
        minor: document.minor,
        projectID: document.projectID,
    });
    vscode.env.openExternal(vscode.Uri.parse(editUrl));
}
exports.editMermaidChart = editMermaidChart;
async function insertMermaidChartToken(uuid, provider) {
    // If a project is selected from tree-view, no token shall be inserted
    const itemType = provider.getItemTypeFromUuid(uuid);
    if (itemType !== mermaidChartProvider_1.ITEM_TYPE_DOCUMENT) {
        return;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const mermaidChartTokenLine = getCommentLine(editor, uuid);
    editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(editor.selection.active.line, 0), `${mermaidChartTokenLine}\n`);
    });
}
exports.insertMermaidChartToken = insertMermaidChartToken;
function updateViewVisibility(isLoggedIn, webviewProvider, mermaidChartProvider) {
    vscode.commands.executeCommand("setContext", "mermaid.showChart", isLoggedIn);
    vscode.commands.executeCommand("setContext", "mermaid.showWebview", !isLoggedIn);
    if (isLoggedIn) {
        mermaidChartProvider?.refresh();
    }
    else {
        webviewProvider?.refresh();
    }
}
exports.updateViewVisibility = updateViewVisibility;
function getMermaidChartTokenDecoration() {
    // Determine the current theme
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    // Set the decoration type based on the theme
    const backgroundColor = isDarkTheme ? DARK_BACKGROUND : LIGHT_BACKGROUND;
    const color = isDarkTheme ? DARK_COLOR : LIGHT_COLOR;
    return vscode.window.createTextEditorDecorationType({
        backgroundColor,
        color,
    });
}
exports.getMermaidChartTokenDecoration = getMermaidChartTokenDecoration;
const getCommentLine = (editor, uuid) => {
    const languageId = editor.document.languageId;
    switch (languageId) {
        case "markdown":
        case "html":
            return `<!-- [MermaidChart: ${uuid}] -->`;
        case "yaml":
        case "python":
            return `# [MermaidChart: ${uuid}]`;
        case "json":
        case "javascript":
        case "typescript":
        case "java":
        case "c":
        case "c++":
        case "c#":
        default:
            return `// [MermaidChart: ${uuid}]`;
    }
};
function syncAuxFile(tempFileUri, originalFileUri, range) {
    if (activeListeners.has(tempFileUri)) {
        activeListeners.get(tempFileUri)?.dispose();
        activeListeners.delete(tempFileUri);
    }
    const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.toString() === tempFileUri) {
            syncFiles(originalFileUri, event.document.getText(), range);
        }
    });
    activeListeners.set(tempFileUri, disposable);
    vscode.workspace.onDidCloseTextDocument((closedDoc) => {
        if (closedDoc.uri.toString() === tempFileUri) {
            setTimeout(() => {
                const isReopened = vscode.workspace.textDocuments.some((doc) => doc.uri.toString() === tempFileUri);
                // Only remove the listener if the file was not reopened
                if (!isReopened) {
                    activeListeners.get(tempFileUri)?.dispose();
                    activeListeners.delete(tempFileUri);
                }
            }, REOPEN_CHECK_DELAY_MS);
        }
    });
}
exports.syncAuxFile = syncAuxFile;
function syncFiles(fileUri, mermaidCode, range) {
    if (!mermaidCode || mermaidCode.trim() === "") {
        return;
    }
    vscode.workspace.openTextDocument(fileUri).then((doc) => {
        const text = doc.getText();
        const fileExt = fileUri.fsPath.split('.').pop()?.toLowerCase();
        const patterns = {
            "md": /```mermaid([\s\S]*?)```/g,
            "html": /<div class=["']mermaid["']>([\s\S]*?)<\/div>/g,
            "hugo": /{{<mermaid[^>]*>}}([\s\S]*?){{<\/mermaid>}}/g,
            "rst": /\.\. mermaid::(?:[ \t]*)?$(?:(?:\n[ \t]+:(?:(?:\\:\s)|[^:])+:[^\n]*$)+\n)?((?:\n(?:[ \t][^\n]*)?$)+)?/gm
        };
        const startTags = {
            "md": "```mermaid\n",
            "html": '<div class="mermaid">\n',
            "hugo": "{{<mermaid>}}\n",
            "rst": ".. mermaid::\n"
        };
        const endTags = {
            "md": "\n```",
            "html": "\n</div>",
            "hugo": "\n{{</mermaid>}}",
            "rst": ""
        };
        if (!fileExt || !patterns[fileExt]) {
            vscode.window.showErrorMessage(`Unsupported file type: .${fileExt}`);
            return;
        }
        const regex = patterns[fileExt];
        let match = regex.exec(text);
        let lastMatchRange = null;
        while (match) {
            const start = match.index;
            const end = start + match[0].length;
            lastMatchRange = new vscode.Range(doc.positionAt(start), doc.positionAt(end));
            if (lastMatchRange.contains(range.start)) {
                const workspaceEdit = new vscode.WorkspaceEdit();
                let formattedCode = `${startTags[fileExt]}${mermaidCode}${endTags[fileExt]}`;
                // Add indentation for .rst files
                if (fileExt === "rst") {
                    formattedCode = startTags[fileExt] +
                        mermaidCode
                            .split("\n")
                            .map(line => `  ${line}`) // Add 2 spaces at the start of each line
                            .join("\n") +
                        endTags[fileExt];
                }
                workspaceEdit.replace(fileUri, lastMatchRange, formattedCode);
                vscode.workspace.applyEdit(workspaceEdit);
                break;
            }
            match = regex.exec(text);
        }
    });
}
exports.syncFiles = syncFiles;
function isAuxFile(fileName) {
    const allowedExt = [".md", ".html", ".hugo", ".rst"];
    const fileExt = path.extname(fileName).toLowerCase();
    return allowedExt.includes(fileExt);
}
exports.isAuxFile = isAuxFile;
const getHelpUrl = (diagramType) => {
    switch (diagramType) {
        case 'erdiagram': {
            diagramType = 'entityRelationshipDiagram';
            break;
        }
        case 'gitgraph': {
            diagramType = 'gitgraph';
            break;
        }
        case 'journey': {
            diagramType = 'userJourney';
            break;
        }
        case 'classdiagram': {
            diagramType = 'classDiagram';
            break;
        }
        case 'statediagram': {
            diagramType = 'stateDiagram';
            break;
        }
        case 'sequencediagram': {
            diagramType = 'sequenceDiagram';
            break;
        }
        case 'requirementdiagram': {
            diagramType = 'requirementDiagram';
            break;
        }
        case 'xychart': {
            diagramType = 'xyChart';
            break;
        }
        case 'quadrantchart': {
            diagramType = 'quadrantChart';
            break;
        }
        case 'c4context': {
            diagramType = 'c4';
            break;
        }
        // No default
    }
    return diagramType
        ? `https://mermaid.js.org/syntax/${diagramType}.html`
        : 'https://mermaid.js.org/intro/';
};
exports.getHelpUrl = getHelpUrl;
const findDiagramCode = (items, uuid) => {
    for (const item of items) {
        if (item.uuid === uuid)
            return item.code;
        if (item.children?.length) {
            const foundCode = (0, exports.findDiagramCode)(item.children, uuid);
            if (foundCode)
                return foundCode;
        }
    }
    return undefined;
};
exports.findDiagramCode = findDiagramCode;
const mermaidChartGutterIconDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.file(vscode.extensions.getExtension(`${packageJson.publisher}.${packageJson.name}`).extensionPath + "/images/mermaid-icon.svg"),
    gutterIconSize: "16x16",
});
function applyGutterIconDecoration(position) {
    vscode.window.activeTextEditor?.setDecorations(mermaidChartGutterIconDecoration, [
        position,
    ]);
}
exports.applyGutterIconDecoration = applyGutterIconDecoration;
function getDiagramTemplates() {
    return (0, diagramTemplates_1.getSampleDiagrams)();
}
exports.getDiagramTemplates = getDiagramTemplates;
function triggerSuggestIfEmpty(document) {
    if (document.languageId.startsWith("mermaid") && document.getText().trim() === "") {
        setTimeout(() => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === document) {
                vscode.commands.executeCommand("editor.action.triggerSuggest");
            }
        }, 100);
    }
}
exports.triggerSuggestIfEmpty = triggerSuggestIfEmpty;
function flattenProjects(projects) {
    const flatList = [];
    for (const project of projects) {
        if (project.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed || project.children) {
            flatList.push(project);
            if (project.children && project.children.length > 0) {
                flatList.push(...flattenProjects(project.children));
            }
        }
    }
    return flatList;
}
exports.flattenProjects = flattenProjects;
//# sourceMappingURL=util.js.map