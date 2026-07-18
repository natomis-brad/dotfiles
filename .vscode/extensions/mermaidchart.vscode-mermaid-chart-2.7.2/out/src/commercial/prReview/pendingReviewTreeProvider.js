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
exports.registerPendingReviewCommands = exports.SHOW_UPSELL_COMMAND = exports.PendingReviewTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const botEditCodeLensProvider_1 = require("./botEditCodeLensProvider");
const proFeatureUpsell_1 = require("./proFeatureUpsell");
/**
 * Marker class so `getTreeItem`/`getChildren` can dispatch by type
 * without sprawling instance-of chains.
 */
class PendingReviewItem extends vscode.TreeItem {
    constructor(label, kind, featureId, diagramUri) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.kind = kind;
        this.featureId = featureId;
        this.diagramUri = diagramUri;
    }
}
class PendingReviewTreeProvider {
    constructor(detector) {
        this.detector = detector;
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.emitter.event;
        this.disposables = [];
        this.disposables.push(this.emitter);
        this.disposables.push(this.detector.onDidChange(() => this.emitter.fire()));
    }
    dispose() {
        for (const d of this.disposables) {
            try {
                d.dispose();
            }
            catch { /* best-effort */ }
        }
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        const detected = await this.findPendingDiagrams();
        const items = [];
        if (detected.length === 0) {
            const empty = new PendingReviewItem("No pending diagrams", "empty");
            empty.description = "No bot edits detected in this workspace";
            empty.iconPath = new vscode.ThemeIcon("check");
            items.push(empty);
        }
        else {
            for (const d of detected) {
                const fileName = d.uri.path.split("/").pop() ?? d.uri.fsPath;
                const item = new PendingReviewItem(fileName, "diagram", undefined, d.uri);
                item.description = d.info.shortSha;
                item.tooltip = `Synced by Mermaid Sync · ${d.info.shortSha} — click to review`;
                item.iconPath = new vscode.ThemeIcon("sync");
                item.contextValue = "mermaidSync.pendingDiagram";
                item.command = {
                    command: botEditCodeLensProvider_1.OPEN_REVIEW_COMMAND,
                    title: "Open review",
                    arguments: [d.uri],
                };
                items.push(item);
            }
        }
        // The two locked rows are always present so the upsell story is
        // legible even when the workspace has zero pending diagrams.
        const multi = new PendingReviewItem("Multi-diagram review", "locked", "multiDiagram");
        multi.description = "PRO";
        multi.tooltip = "Review every diagram a PR touches in one place — available on Pro plan";
        multi.iconPath = new vscode.ThemeIcon("lock");
        multi.command = {
            command: "mermaidChart.prReview.showUpsell",
            title: "Show upsell",
            arguments: ["multiDiagram"],
        };
        items.push(multi);
        const bulk = new PendingReviewItem("Bulk accept", "locked", "multiDiagram");
        bulk.description = "PRO";
        bulk.tooltip = "Accept every diagram in a PR at once — available on Pro plan";
        bulk.iconPath = new vscode.ThemeIcon("lock");
        bulk.command = {
            command: "mermaidChart.prReview.showUpsell",
            title: "Show upsell",
            arguments: ["multiDiagram"],
        };
        items.push(bulk);
        return items;
    }
    /**
     * Scan the workspace for tracked .mmd files and ask the detector
     * about each. The detector itself caches by uri+sha so repeated
     * calls are cheap; we cap the search to a sane upper bound to keep
     * the panel responsive in larger repos.
     */
    async findPendingDiagrams() {
        const uris = await vscode.workspace.findFiles("**/*.{mmd,mermaid}", "**/node_modules/**", 50);
        const detected = [];
        for (const uri of uris) {
            try {
                const info = await this.detector.detect(uri);
                if (info) {
                    detected.push({ uri, info });
                }
            }
            catch {
                // Skip any file the detector can't read.
            }
        }
        return detected;
    }
}
exports.PendingReviewTreeProvider = PendingReviewTreeProvider;
exports.SHOW_UPSELL_COMMAND = "mermaidChart.prReview.showUpsell";
function registerPendingReviewCommands() {
    return [
        vscode.commands.registerCommand(exports.SHOW_UPSELL_COMMAND, (featureId) => {
            void (0, proFeatureUpsell_1.showUpsellModal)(featureId);
        }),
    ];
}
exports.registerPendingReviewCommands = registerPendingReviewCommands;
//# sourceMappingURL=pendingReviewTreeProvider.js.map