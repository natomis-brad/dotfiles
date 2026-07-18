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
exports.openSingleDiagramPreview = exports.openPrReviewPreview = exports.openDiagramDiffWebviews = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const frontmatter_1 = require("../../frontmatter");
const previewTemplate_1 = require("../../templates/previewTemplate");
const packageJson = __importStar(require("../../../package.json"));
const prReviewCodePanel_1 = require("../prReview/prReviewCodePanel");
const diagramDiffHighlighter_1 = require("./diagramDiffHighlighter");
function previewWebviewOptions(extensionPath) {
    return {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
            vscode.Uri.file(path.join(extensionPath, "out")),
            vscode.Uri.file(path.join(extensionPath, "media")),
        ],
    };
}
function readPreviewLimits() {
    const config = vscode.workspace.getConfiguration();
    return {
        maxZoom: config.get("mermaid.vscode.maxZoom", 5),
        maxCharLength: config.get("mermaid.vscode.maxCharLength", 90000),
        maxEdges: config.get("mermaid.vscode.maxEdges", 1000),
    };
}
/**
 * Open the diagram diff view: two separate webviews (Current and Updated), each with
 * full preview UI (zoom, pan, theme, export).
 *
 * Opt-in power-user path — the default PR-review flow uses
 * {@link openPrReviewPreview} with a Now/Before toggle instead.
 *
 * Returns a dispose function — call it to close both preview panels programmatically.
 */
function openDiagramDiffWebviews(oldContent, newContent, highlightOptions) {
    let panelCurrent;
    let panelUpdated;
    const disposePanels = () => {
        panelCurrent?.dispose();
        panelUpdated?.dispose();
        panelCurrent = undefined;
        panelUpdated = undefined;
    };
    const openPanels = async (oldDiagramText, newDiagramText, newDiagramInstructions, oldDiagramInstructions) => {
        const extensionPath = vscode.extensions.getExtension(`${packageJson.publisher}.${packageJson.name}`)?.extensionPath;
        if (!extensionPath) {
            console.error("[Mermaid Diagram Diff] Unable to resolve extension path");
            vscode.window.showErrorMessage("Unable to resolve extension path for diagram diff.");
            return;
        }
        const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
        const config = vscode.workspace.getConfiguration();
        const darkTheme = config.get("mermaid.vscode.dark", "redux-dark");
        const lightTheme = config.get("mermaid.vscode.light", "redux");
        const theme = isDarkTheme ? darkTheme : lightTheme;
        panelCurrent = vscode.window.createWebviewPanel("mermaidDiagramDiffCurrent", "Before", vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        panelCurrent.webview.html = (0, previewTemplate_1.getWebviewHTML)(panelCurrent, extensionPath, oldDiagramText, theme, false);
        panelUpdated = vscode.window.createWebviewPanel("mermaidDiagramDiffUpdated", "Now", vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        panelUpdated.webview.html = (0, previewTemplate_1.getWebviewHTML)(panelUpdated, extensionPath, newDiagramText, theme, false, undefined, highlightOptions?.addedNodeIds, highlightOptions
            ? {
                counts: {
                    added: highlightOptions.addedNodeIds.length,
                    modified: highlightOptions.modifiedNodeIds.length,
                    removed: highlightOptions.removedNodeIds.length,
                    total: highlightOptions.addedNodeIds.length +
                        highlightOptions.modifiedNodeIds.length +
                        highlightOptions.removedNodeIds.length,
                },
                changes: [],
                addedNodeIds: highlightOptions.addedNodeIds,
                modifiedNodeIds: highlightOptions.modifiedNodeIds,
            }
            : undefined);
        if (highlightOptions) {
            wireHighlightRepost(panelUpdated, highlightOptions);
        }
        if (newDiagramInstructions.length > 0 || oldDiagramInstructions.length > 0) {
            setTimeout(() => {
                if (newDiagramInstructions.length > 0) {
                    panelUpdated?.webview.postMessage({
                        type: "applyHighlights",
                        highlights: newDiagramInstructions,
                    });
                }
                if (oldDiagramInstructions.length > 0) {
                    panelCurrent?.webview.postMessage({
                        type: "applyHighlights",
                        highlights: oldDiagramInstructions,
                    });
                }
            }, 1000);
        }
        setTimeout(() => {
            void vscode.commands.executeCommand("vscode.setEditorLayout", {
                orientation: 0,
                groups: [
                    { size: 0.5 },
                    {
                        groups: [{ size: 0.5 }, { size: 0.5 }],
                        size: 0.5,
                        orientation: 1,
                    },
                ],
            });
        }, 150);
    };
    try {
        const { diagramText: oldDiagramText } = (0, frontmatter_1.splitFrontMatter)(oldContent);
        const { diagramText: newDiagramText } = (0, frontmatter_1.splitFrontMatter)(newContent);
        void (0, diagramDiffHighlighter_1.calculateDiagramDiff)(oldDiagramText, newDiagramText)
            .then(async (diagramDiff) => {
            const { newDiagramInstructions, oldDiagramInstructions } = await (0, diagramDiffHighlighter_1.createHighlightInstructions)(diagramDiff);
            await openPanels(oldDiagramText, newDiagramText, newDiagramInstructions, oldDiagramInstructions);
        })
            .catch(async (error) => {
            const msg = error instanceof Error ? error.message : String(error);
            console.error({ err: msg }, "[Mermaid Diagram Diff] AST diff failed; opening previews without highlights");
            vscode.window.showWarningMessage(`Diagram diff highlights unavailable: ${msg}`);
            await openPanels(oldDiagramText, newDiagramText, [], []);
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Mermaid Diagram Diff] Error opening diagram diff view:", err);
        vscode.window.showErrorMessage(`Diagram diff view failed: ${msg}`);
    }
    return disposePanels;
}
exports.openDiagramDiffWebviews = openDiagramDiffWebviews;
/**
 * Default PR-review surface: a single full-size diagram with Now/Before toggle,
 * summary chips, and a collapsed changes list. Removed nodes appear in the list
 * only — not drawn on the after diagram.
 */
function openPrReviewPreview(options, newContent, viewColumn = vscode.ViewColumn.Active) {
    let panel;
    let currentPhase = "now";
    const dispose = () => {
        (0, prReviewCodePanel_1.disposePrReviewCodePanel)();
        panel?.dispose();
        panel = undefined;
    };
    try {
        const { diagramText: newDiagramText } = (0, frontmatter_1.splitFrontMatter)(newContent);
        const { diagramText: oldDiagramText } = (0, frontmatter_1.splitFrontMatter)(options.oldContent);
        const extensionPath = vscode.extensions.getExtension(`${packageJson.publisher}.${packageJson.name}`)?.extensionPath;
        if (!extensionPath) {
            console.error("[Mermaid PR Review] Unable to resolve extension path");
            return { panel, dispose };
        }
        const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
        const config = vscode.workspace.getConfiguration();
        const darkTheme = config.get("mermaid.vscode.dark", "redux-dark");
        const lightTheme = config.get("mermaid.vscode.light", "redux");
        const theme = isDarkTheme ? darkTheme : lightTheme;
        const themeLabel = formatThemeLabel(theme);
        const titleParts = ["After"];
        const countParts = [];
        if (options.counts.added > 0) {
            countParts.push(`${options.counts.added} added`);
        }
        if (options.counts.modified > 0) {
            countParts.push(`${options.counts.modified} changed`);
        }
        if (options.counts.removed > 0) {
            countParts.push(`${options.counts.removed} removed`);
        }
        const title = countParts.length
            ? `${titleParts[0]} · ${countParts.join(", ")}`
            : `${titleParts[0]} · ${options.fileName}`;
        const prReviewCtx = {
            counts: options.counts,
            changes: options.changes,
            addedNodeIds: options.addedNodeIds,
            modifiedNodeIds: options.modifiedNodeIds,
            removedNodeIds: options.removedNodeIds,
            prRef: options.prRef,
            themeLabel,
            currentTheme: theme,
            fileName: options.fileName,
            beforeDiagramText: oldDiagramText,
        };
        panel = vscode.window.createWebviewPanel("mermaidPrReviewPreview", title, viewColumn, previewWebviewOptions(extensionPath));
        panel.webview.html = (0, previewTemplate_1.getWebviewHTML)(panel, extensionPath, newDiagramText, theme, false, undefined, options.addedNodeIds, prReviewCtx);
        wireHighlightRepost(panel, options);
        wirePrReviewMessages(panel, options, newDiagramText, oldDiagramText, theme, options.fileName, () => currentPhase, (p) => { currentPhase = p; }, options.onCompareSideBySide);
        const limits = readPreviewLimits();
        const sendInitialDiagram = () => {
            panel?.webview.postMessage({
                type: "update",
                content: newDiagramText,
                currentTheme: theme,
                isFileChange: true,
                maxZoom: limits.maxZoom,
                maxCharLength: limits.maxCharLength,
                maxEdge: limits.maxEdges,
            });
        };
        const sendInitialHighlights = () => {
            panel?.webview.postMessage({
                type: "highlightNodes",
                phase: "now",
                addedNodeIds: options.addedNodeIds,
                modifiedNodeIds: options.modifiedNodeIds,
                removedNodeIds: [],
            });
        };
        setTimeout(sendInitialDiagram, 100);
        setTimeout(sendInitialDiagram, 600);
        setTimeout(sendInitialHighlights, 950);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Mermaid PR Review] Failed to open preview:", err);
        vscode.window.showErrorMessage(`Mermaid preview failed: ${msg}`);
    }
    return { panel, dispose };
}
exports.openPrReviewPreview = openPrReviewPreview;
/**
 * @deprecated Use {@link openPrReviewPreview} for PR review. Kept for callers
 * that only need a single highlighted preview without review chrome.
 */
function openSingleDiagramPreview(newContent, title, highlightOptions, viewColumn = vscode.ViewColumn.Beside) {
    let panel;
    const dispose = () => {
        panel?.dispose();
        panel = undefined;
    };
    try {
        const { diagramText: newDiagramText } = (0, frontmatter_1.splitFrontMatter)(newContent);
        const extensionPath = vscode.extensions.getExtension(`${packageJson.publisher}.${packageJson.name}`)?.extensionPath;
        if (!extensionPath) {
            console.error("[Mermaid PR Review] Unable to resolve extension path");
            return { panel, dispose };
        }
        const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
        const config = vscode.workspace.getConfiguration();
        const darkTheme = config.get("mermaid.vscode.dark", "redux-dark");
        const lightTheme = config.get("mermaid.vscode.light", "redux");
        const theme = isDarkTheme ? darkTheme : lightTheme;
        panel = vscode.window.createWebviewPanel("mermaidPrReviewPreview", title, viewColumn, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = (0, previewTemplate_1.getWebviewHTML)(panel, extensionPath, newDiagramText, theme, false, undefined, highlightOptions?.addedNodeIds);
        wireHighlightRepost(panel, highlightOptions);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Mermaid PR Review] Failed to open preview:", err);
        vscode.window.showErrorMessage(`Mermaid preview failed: ${msg}`);
    }
    return { panel, dispose };
}
exports.openSingleDiagramPreview = openSingleDiagramPreview;
function wireHighlightRepost(panel, highlightOptions) {
    if (!panel || !highlightOptions) {
        return;
    }
    const hasHighlights = (highlightOptions.addedNodeIds?.length ?? 0) > 0 ||
        (highlightOptions.modifiedNodeIds?.length ?? 0) > 0 ||
        (highlightOptions.removedNodeIds?.length ?? 0) > 0;
    if (!hasHighlights) {
        return;
    }
    const repost = () => {
        if (panel?.visible) {
            panel.webview.postMessage({
                type: "highlightNodes",
                addedNodeIds: highlightOptions.addedNodeIds ?? [],
                modifiedNodeIds: highlightOptions.modifiedNodeIds ?? [],
                removedNodeIds: highlightOptions.removedNodeIds ?? [],
            });
        }
    };
    panel.onDidChangeViewState(repost);
    setTimeout(repost, 200);
    setTimeout(repost, 800);
}
function wirePrReviewMessages(panel, highlightOptions, newDiagramText, oldDiagramText, initialTheme, fileName, getPhase, setPhase, onCompareSideBySide) {
    let currentTheme = initialTheme;
    const limits = readPreviewLimits();
    panel.webview.onDidReceiveMessage((message) => {
        if (!message?.type) {
            return;
        }
        if (message.type === "switchPhase" && (message.phase === "now" || message.phase === "before")) {
            if (getPhase() === message.phase) {
                return;
            }
            setPhase(message.phase);
            const content = message.phase === "now" ? newDiagramText : oldDiagramText;
            const isNow = message.phase === "now";
            panel.webview.postMessage({
                type: "update",
                content,
                currentTheme,
                isFileChange: true,
                fade: true,
                maxZoom: limits.maxZoom,
                maxCharLength: limits.maxCharLength,
                maxEdge: limits.maxEdges,
            });
            panel.webview.postMessage({ type: "resetInitialZoom" });
            setTimeout(() => {
                panel.webview.postMessage({
                    type: "highlightNodes",
                    phase: isNow ? "now" : "before",
                    addedNodeIds: isNow ? highlightOptions.addedNodeIds : [],
                    modifiedNodeIds: highlightOptions.modifiedNodeIds,
                    removedNodeIds: isNow ? [] : (highlightOptions.removedNodeIds ?? []),
                });
            }, 280);
            return;
        }
        if (message.type === "setTheme" && message.theme) {
            currentTheme = message.theme;
            const content = getPhase() === "now" ? newDiagramText : oldDiagramText;
            panel.webview.postMessage({
                type: "update",
                content,
                currentTheme,
                isFileChange: true,
                maxZoom: limits.maxZoom,
                maxCharLength: limits.maxCharLength,
                maxEdge: limits.maxEdges,
            });
            return;
        }
        if (message.type === "openExport") {
            panel.webview.postMessage({ type: "openExportModal" });
            return;
        }
        if (message.type === "viewDiffCode") {
            (0, prReviewCodePanel_1.openPrReviewCodeBeside)(panel, oldDiagramText, newDiagramText, fileName);
            return;
        }
        if (message.type === "viewChangeCode" && message.nodeId) {
            const kind = message.kind === "added" || message.kind === "modified" || message.kind === "removed"
                ? message.kind
                : "modified";
            (0, prReviewCodePanel_1.openPrReviewCodeBeside)(panel, oldDiagramText, newDiagramText, fileName, {
                nodeId: message.nodeId,
                kind,
                changeLabel: message.changeLabel,
            });
            return;
        }
        if (message.type === "focusChange" && message.nodeId) {
            panel.webview.postMessage({ type: "focusNode", nodeId: message.nodeId });
            panel.webview.postMessage({ type: "centerOnNode", nodeId: message.nodeId, autofocus: true });
            return;
        }
        if (message.type === "compareSideBySide") {
            onCompareSideBySide?.();
        }
    });
}
function formatThemeLabel(theme) {
    return theme
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
//# sourceMappingURL=diagramDiffView.js.map