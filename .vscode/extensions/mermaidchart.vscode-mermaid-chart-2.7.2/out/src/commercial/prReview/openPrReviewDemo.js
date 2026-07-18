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
exports.offerPrReviewDemoInDevHost = exports.registerPrReviewDemoCommand = void 0;
const vscode = __importStar(require("vscode"));
const diagramNodeDiff_1 = require("./diagramNodeDiff");
const diagramDiffView_1 = require("../sync/diagramDiffView");
async function resolveDemoDir(context) {
    const candidates = [
        vscode.Uri.joinPath(context.extensionUri, "examples", "diff-demo"),
    ];
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        candidates.push(vscode.Uri.joinPath(folder.uri, "examples", "diff-demo"));
        candidates.push(vscode.Uri.joinPath(folder.uri, "diff-demo"));
    }
    for (const dir of candidates) {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.joinPath(dir, "before.mmd"));
            return dir;
        }
        catch {
            // try next
        }
    }
    return null;
}
async function readDemoFile(demoDir, name) {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(demoDir, name));
    return Buffer.from(bytes).toString("utf8");
}
async function runPrReviewDemo(context) {
    const demoDir = await resolveDemoDir(context);
    if (!demoDir) {
        vscode.window.showErrorMessage("PR Review demo not found. Open the vscode-mermaid-chart repo (or examples folder) in VS Code.");
        return;
    }
    try {
        const [oldContent, newContent] = await Promise.all([
            readDemoFile(demoDir, "before.mmd"),
            readDemoFile(demoDir, "after.mmd"),
        ]);
        const nodeDiff = (0, diagramNodeDiff_1.diffNodes)(oldContent, newContent);
        const counts = (0, diagramNodeDiff_1.summarizeNodeDiff)(nodeDiff);
        const changes = (0, diagramNodeDiff_1.buildChangeList)(oldContent, newContent, nodeDiff);
        let splitDispose;
        (0, diagramDiffView_1.openPrReviewPreview)({
            addedNodeIds: nodeDiff.addedNodeIds,
            modifiedNodeIds: nodeDiff.modifiedNodeIds,
            removedNodeIds: nodeDiff.removedNodeIds,
            counts,
            changes,
            oldContent,
            fileName: "flowchart-demo.mmd",
            prRef: "#5642",
            onCompareSideBySide: () => {
                splitDispose?.();
                splitDispose = (0, diagramDiffView_1.openDiagramDiffWebviews)(oldContent, newContent, {
                    addedNodeIds: nodeDiff.addedNodeIds,
                    modifiedNodeIds: nodeDiff.modifiedNodeIds,
                    removedNodeIds: nodeDiff.removedNodeIds,
                });
            },
        }, newContent, vscode.ViewColumn.Active);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`PR Review demo failed: ${msg}`);
    }
}
/** Dev/demo entry point — opens the Now/Before PR review preview without a git bot commit. */
function registerPrReviewDemoCommand(context) {
    context.subscriptions.push(vscode.commands.registerCommand("mermaidChart.prReview.openDemo", () => runPrReviewDemo(context)));
}
exports.registerPrReviewDemoCommand = registerPrReviewDemoCommand;
/**
 * When debugging (F5), offer to open the demo so you don't hunt the command palette.
 */
function offerPrReviewDemoInDevHost(context) {
    if (context.extensionMode !== vscode.ExtensionMode.Development) {
        return;
    }
    void (async () => {
        const demoDir = await resolveDemoDir(context);
        if (!demoDir) {
            return;
        }
        const choice = await vscode.window.showInformationMessage("Mermaid (Test) is running in this window. Open the PR Review demo? (Command: Open PR Review Demo)", "Open demo");
        if (choice === "Open demo") {
            await runPrReviewDemo(context);
        }
    })();
}
exports.offerPrReviewDemoInDevHost = offerPrReviewDemoInDevHost;
//# sourceMappingURL=openPrReviewDemo.js.map