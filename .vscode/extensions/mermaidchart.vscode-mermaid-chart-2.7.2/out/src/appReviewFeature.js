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
exports.AppReviewFeature = void 0;
const vscode = __importStar(require("vscode"));
const appReviewIntegration_1 = require("./appReviewIntegration");
const appReviewGitStatus_1 = require("./appReviewGitStatus");
const appFileDecorationProvider_1 = require("./appFileDecorationProvider");
const appDiffViewProvider_1 = require("./appDiffViewProvider");
const appReviewCodeLensProvider_1 = require("./appReviewCodeLensProvider");
const appCommitWorkflow_1 = require("./appCommitWorkflow");
const appReviewGitPullWatcher_1 = require("./appReviewGitPullWatcher");
/**
 * Facade that owns all app review sub-components and wires them together.
 * extension.ts calls `AppReviewFeature.register(context)` — nothing else.
 */
class AppReviewFeature {
    constructor() {
        this.integration = new appReviewIntegration_1.AppReviewIntegration();
        this.gitStatusTracker = new appReviewGitStatus_1.AppReviewGitStatusTracker(this.integration);
        this.fileDecorationProvider = new appFileDecorationProvider_1.AppFileDecorationProvider(this.integration);
        this.diffViewProvider = new appDiffViewProvider_1.AppDiffViewProvider(this.integration, this.fileDecorationProvider);
        this.codeLensProvider = new appReviewCodeLensProvider_1.AppReviewCodeLensProvider(this.integration, this.gitStatusTracker);
        this.commitWorkflow = new appCommitWorkflow_1.AppCommitWorkflow(this.integration, this.gitStatusTracker);
        this.gitPullWatcher = new appReviewGitPullWatcher_1.AppReviewGitPullWatcher(this.integration);
    }
    register(context) {
        this.registerProviders(context);
        this.registerCommands(context);
        this.registerEventListeners(context);
        this.gitPullWatcher.start(context);
        context.subscriptions.push(this);
    }
    registerProviders(context) {
        context.subscriptions.push(vscode.window.registerFileDecorationProvider(this.fileDecorationProvider));
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            context.subscriptions.push(vscode.languages.registerCodeLensProvider([
                { language: "mermaid" },
                { pattern: new vscode.RelativePattern(workspaceFolder, "**/*.mmd") },
                { pattern: new vscode.RelativePattern(workspaceFolder, "**/*.mermaid") },
            ], this.codeLensProvider));
        }
        else {
            context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: "mermaid" }, this.codeLensProvider));
        }
    }
    registerCommands(context) {
        context.subscriptions.push(vscode.commands.registerCommand("mermaidChart.reviewAppCommits", () => this.integration.reviewAppCommits()), vscode.commands.registerCommand("mermaidChart.connectGitHub", () => this.integration.connectGitHub()), vscode.commands.registerCommand("mermaidChart.disconnectGitHub", () => this.integration.disconnectGitHub()), vscode.commands.registerCommand("mermaidChart.showAppSyncInfo", (uri) => this.codeLensProvider.showAppSyncInfo(uri)), vscode.commands.registerCommand("mermaidChart.showAppReviewStatus", (uri, status) => this.codeLensProvider.showAppReviewStatus(uri, status)), vscode.commands.registerCommand("mermaidChart.openAppReview", (uri) => this.codeLensProvider.openAppReview(uri)), vscode.commands.registerCommand("mermaidChart.acceptModifiedChanges", (uri) => this.codeLensProvider.acceptModifiedChanges(uri)), vscode.commands.registerCommand("mermaidChart.openReviewFileDiff", async (uri) => {
            const target = uri ?? vscode.window.activeTextEditor?.document.uri;
            if (target) {
                await this.diffViewProvider.showAppDiff(target);
            }
        }), vscode.commands.registerCommand("mermaidChart.appReviewAccept", async (uri) => {
            const target = uri ?? vscode.window.activeTextEditor?.document.uri;
            if (target) {
                await this.diffViewProvider.acceptAppChanges(target);
                await this.gitStatusTracker.refreshPath(target.fsPath);
            }
        }), vscode.commands.registerCommand("mermaidChart.appReviewReject", async (uri) => {
            const target = uri ?? vscode.window.activeTextEditor?.document.uri;
            if (target) {
                await this.diffViewProvider.rejectAppChanges(target);
                await this.gitStatusTracker.refreshPath(target.fsPath);
            }
        }), vscode.commands.registerCommand("mermaidChart.appReviewBackToPending", async (uri) => {
            const target = uri ?? vscode.window.activeTextEditor?.document.uri;
            if (target) {
                await this.diffViewProvider.restoreAppProposalAndPending(target);
                await this.gitStatusTracker.refreshPath(target.fsPath);
            }
        }), vscode.commands.registerCommand("mermaidChart.commitAppReview", (uri) => this.commitWorkflow.commitAppReview(uri)), vscode.commands.registerCommand("mermaidChart.closeAppReview", async (uri) => {
            const target = uri ?? vscode.window.activeTextEditor?.document.uri;
            if (!target) {
                return;
            }
            const absolutePath = target.fsPath;
            await this.diffViewProvider.cancelSessionsForOriginal(absolutePath);
            const removed = this.integration.removeReviewForFile(absolutePath);
            this.gitStatusTracker.invalidatePath(absolutePath);
            this.fileDecorationProvider.refresh();
            this.codeLensProvider.refresh();
            if (removed) {
                vscode.window.showInformationMessage("Review closed for this file.");
            }
            else {
                vscode.window.showWarningMessage("No active app review for this file.");
            }
        }));
    }
    registerEventListeners(context) {
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => {
            if (doc.uri.scheme !== "file") {
                return;
            }
            const filePath = doc.uri.fsPath;
            if (this.integration.getReviewMapping(filePath)) {
                void this.gitStatusTracker.refreshPath(filePath);
            }
        }), vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.scheme !== "file") {
                return;
            }
            const filePath = e.document.uri.fsPath;
            if (this.integration.getReviewMapping(filePath)) {
                this.gitStatusTracker.scheduleRefreshPath(filePath);
            }
        }));
        context.subscriptions.push(this.gitStatusTracker.onDidChangeDirty(() => {
            this.codeLensProvider.refresh();
        }));
        context.subscriptions.push(this.integration.onDidChangePendingReviews(() => {
            this.fileDecorationProvider.refresh();
            this.codeLensProvider.refresh();
            void this.gitStatusTracker.refreshAllMapped();
        }));
    }
    dispose() {
        this.gitPullWatcher.dispose();
        this.integration.dispose();
        this.gitStatusTracker.dispose();
        this.fileDecorationProvider.dispose();
        this.diffViewProvider.dispose();
        this.codeLensProvider.dispose();
    }
}
exports.AppReviewFeature = AppReviewFeature;
//# sourceMappingURL=appReviewFeature.js.map