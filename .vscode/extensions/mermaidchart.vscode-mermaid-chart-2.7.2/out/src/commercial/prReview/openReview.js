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
exports.REVIEW_ACTION_COMMANDS = exports.registerReviewCommands = exports.openReview = exports.COMMIT_EDITS_COMMAND = exports.EDIT_COMMAND = exports.REJECT_COMMAND = exports.ACCEPT_COMMAND = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const analytics_1 = __importDefault(require("../../analytics"));
const diagramDiffView_1 = require("../sync/diagramDiffView");
const botEditContentProvider_1 = require("./botEditContentProvider");
const diagramNodeDiff_1 = require("./diagramNodeDiff");
const reviewActions_1 = require("./reviewActions");
exports.ACCEPT_COMMAND = "mermaidChart.prReview.accept";
exports.REJECT_COMMAND = "mermaidChart.prReview.reject";
exports.EDIT_COMMAND = "mermaidChart.prReview.edit";
exports.COMMIT_EDITS_COMMAND = "mermaidChart.prReview.commitEdits";
let activeSession;
/**
 * Open the PR-review surface for `uri`:
 *
 * Default: full-size **Now** diagram with added (green) and changed (amber)
 * outlines, summary chips, collapsed changes list, and a Now/Before toggle.
 * Removed nodes appear in counts / list only — not on the diagram.
 *
 * Opt-in: "Compare side by side" opens the stacked before/after preview path.
 * Accept / Reject / Edit remain on the editor title bar.
 */
async function openReview(context, detector, contentProvider, uri) {
    try {
        const info = await detector.detect(uri);
        if (!info) {
            vscode.window.showInformationMessage("No bot edit detected for this file.");
            return;
        }
        if (!info.parentSha) {
            vscode.window.showInformationMessage(`Bot commit ${info.shortSha} has no parent in this branch — nothing to compare.`);
            return;
        }
        analytics_1.default.sendEvent("VS Code PR Review Banner Clicked", "VS_CODE_PLUGIN_PR_REVIEW_BANNER_CLICKED");
        let oldContent = "";
        let newContent = "";
        try {
            const oldVirtualUri = botEditContentProvider_1.BotEditContentProvider.buildUri(uri, info.parentSha);
            const oldDoc = await vscode.workspace.openTextDocument(oldVirtualUri);
            oldContent = oldDoc.getText();
            const newDoc = await vscode.workspace.openTextDocument(uri);
            newContent = newDoc.getText();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Couldn't load diagram history: ${msg}`);
            return;
        }
        const nodeDiff = (0, diagramNodeDiff_1.diffNodes)(oldContent, newContent);
        const counts = (0, diagramNodeDiff_1.summarizeNodeDiff)(nodeDiff);
        const changes = (0, diagramNodeDiff_1.buildChangeList)(oldContent, newContent, nodeDiff);
        const fileName = path.basename(uri.fsPath);
        activeSession?.closePanels();
        let splitDispose;
        const openSideBySide = () => {
            splitDispose?.();
            splitDispose = (0, diagramDiffView_1.openDiagramDiffWebviews)(oldContent, newContent, {
                addedNodeIds: nodeDiff.addedNodeIds,
                modifiedNodeIds: nodeDiff.modifiedNodeIds,
                removedNodeIds: nodeDiff.removedNodeIds,
            });
        };
        const preview = (0, diagramDiffView_1.openPrReviewPreview)({
            addedNodeIds: nodeDiff.addedNodeIds,
            modifiedNodeIds: nodeDiff.modifiedNodeIds,
            removedNodeIds: nodeDiff.removedNodeIds,
            counts,
            changes,
            oldContent,
            fileName,
            prRef: info.prRef,
            onCompareSideBySide: openSideBySide,
        }, newContent, vscode.ViewColumn.Active);
        const closePanels = () => {
            try {
                preview.dispose();
            }
            catch { /* best-effort */ }
            try {
                splitDispose?.();
            }
            catch { /* best-effort */ }
            splitDispose = undefined;
        };
        preview.panel?.onDidDispose(() => {
            if (activeSession?.closePanels === closePanels) {
                activeSession = undefined;
            }
        });
        activeSession = { uri, info, closePanels };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[PR Review] openReview failed:", err);
        vscode.window.showErrorMessage(`Mermaid PR Review failed to open: ${msg}`);
    }
}
exports.openReview = openReview;
/**
 * Resolve the {uri, info} pair an action should operate on.
 */
async function resolveTargetForAction(detector, uriArg) {
    const uri = uriArg ??
        activeSession?.uri ??
        vscode.window.activeTextEditor?.document.uri;
    if (!uri) {
        vscode.window.showWarningMessage("PR Review: open a synced .mmd file first.");
        return undefined;
    }
    if (activeSession && activeSession.uri.toString() === uri.toString()) {
        return {
            uri: activeSession.uri,
            info: activeSession.info,
            closePanels: () => {
                activeSession?.closePanels();
                activeSession = undefined;
            },
        };
    }
    const info = await detector.detect(uri);
    if (!info) {
        vscode.window.showInformationMessage("No bot edit detected for this file.");
        return undefined;
    }
    return {
        uri,
        info,
        closePanels: () => {
            if (activeSession && activeSession.uri.toString() === uri.toString()) {
                activeSession.closePanels();
                activeSession = undefined;
            }
        },
    };
}
function registerReviewCommands(context, detector, contentProvider) {
    return [
        vscode.workspace.registerTextDocumentContentProvider(botEditContentProvider_1.BotEditContentProvider.scheme, contentProvider),
        vscode.commands.registerCommand(exports.ACCEPT_COMMAND, async (uriArg) => {
            const target = await resolveTargetForAction(detector, uriArg);
            if (!target) {
                return;
            }
            await (0, reviewActions_1.acceptReview)(context, target.uri, target.info, target.closePanels);
        }),
        vscode.commands.registerCommand(exports.REJECT_COMMAND, async (uriArg) => {
            const target = await resolveTargetForAction(detector, uriArg);
            if (!target) {
                return;
            }
            await (0, reviewActions_1.rejectReview)(target.uri, target.info, target.closePanels);
        }),
        vscode.commands.registerCommand(exports.EDIT_COMMAND, async (uriArg) => {
            const target = await resolveTargetForAction(detector, uriArg);
            if (!target) {
                return;
            }
            await (0, reviewActions_1.editReview)(target.uri, target.info, target.closePanels);
        }),
        vscode.commands.registerCommand(exports.COMMIT_EDITS_COMMAND, async (uriArg) => {
            const target = await resolveTargetForAction(detector, uriArg);
            if (!target) {
                return;
            }
            await (0, reviewActions_1.commitEdits)(context, target.uri, target.info);
        }),
    ];
}
exports.registerReviewCommands = registerReviewCommands;
exports.REVIEW_ACTION_COMMANDS = {
    accept: exports.ACCEPT_COMMAND,
    reject: exports.REJECT_COMMAND,
    edit: exports.EDIT_COMMAND,
};
//# sourceMappingURL=openReview.js.map