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
exports.BotEditCodeLensProvider = exports.OPEN_REVIEW_COMMAND = void 0;
const vscode = __importStar(require("vscode"));
const analytics_1 = __importDefault(require("../../analytics"));
const openReview_1 = require("./openReview");
exports.OPEN_REVIEW_COMMAND = "mermaidChart.prReview.openReview";
/**
 * CodeLens at line 0 of any bot-edited Mermaid file. Acts as the "tinted
 * banner" called for in the PM mockup — VS Code has no first-class banner
 * API, and a pinned CodeLens matches the pattern already used elsewhere in
 * this extension (see `mermaidChartCodeLensProvider`).
 *
 * Copy is the canonical phrase from the plan ("Synced by Mermaid Sync ·
 * <sha>") — names the agent, no AI-flavored "auto-regenerated" filler.
 */
class BotEditCodeLensProvider {
    constructor(detector) {
        this.detector = detector;
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this.emitter.event;
        this.disposables = [];
        this.bannerShownFor = new Set();
        this.disposables.push(this.emitter);
        this.disposables.push(this.detector.onDidChange(() => {
            this.bannerShownFor.clear();
            this.emitter.fire();
        }));
        // Re-render when the document goes dirty/clean so the
        // "Commit edits" lens appears or disappears the moment the user
        // saves or types.
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(() => this.emitter.fire()), vscode.workspace.onDidSaveTextDocument(() => this.emitter.fire()));
        // Re-render when the Git working tree changes for any open repo
        // (catches `git add` from terminal, post-commit cleanup, etc).
        try {
            const ext = vscode.extensions.getExtension("vscode.git");
            const api = ext?.exports?.enabled ? ext.exports.getAPI(1) : undefined;
            if (api) {
                for (const repo of api.repositories) {
                    this.disposables.push(repo.state.onDidChange(() => this.emitter.fire()));
                }
                this.disposables.push(api.onDidOpenRepository((repo) => this.disposables.push(repo.state.onDidChange(() => this.emitter.fire()))));
            }
        }
        catch { /* git ext optional */ }
    }
    dispose() {
        for (const d of this.disposables) {
            try {
                d.dispose();
            }
            catch { /* best-effort */ }
        }
    }
    async provideCodeLenses(document) {
        if (!document.languageId.startsWith("mermaid")) {
            return [];
        }
        if (document.uri.scheme !== "file") {
            return [];
        }
        const info = await this.detector.detect(document.uri);
        if (!info) {
            return [];
        }
        const bannerKey = `${document.uri.toString()}@${info.commitSha}`;
        if (!this.bannerShownFor.has(bannerKey)) {
            this.bannerShownFor.add(bannerKey);
            try {
                analytics_1.default.sendEvent("VS Code PR Review Banner Shown", "VS_CODE_PLUGIN_PR_REVIEW_BANNER_SHOWN");
            }
            catch (err) {
                console.warn("[BotEditCodeLensProvider] analytics failed:", err);
            }
        }
        const range = new vscode.Range(0, 0, 0, 0);
        const lenses = [
            new vscode.CodeLens(range, {
                title: `$(sync) Synced by Mermaid Sync · ${info.shortSha} — Review`,
                tooltip: `Open the side-by-side review for ${info.shortSha}.`,
                command: exports.OPEN_REVIEW_COMMAND,
                arguments: [document.uri],
            }),
            new vscode.CodeLens(range, {
                title: `$(check) Accept`,
                tooltip: `Keep ${info.shortSha} and mark this diagram as reviewed.`,
                command: openReview_1.ACCEPT_COMMAND,
                arguments: [document.uri],
            }),
            new vscode.CodeLens(range, {
                title: `$(discard) Reject`,
                tooltip: `Restore the diagram to the version before ${info.shortSha}.`,
                command: openReview_1.REJECT_COMMAND,
                arguments: [document.uri],
            }),
            new vscode.CodeLens(range, {
                title: `$(edit) Edit`,
                tooltip: `Open the bot's draft for editing.`,
                command: openReview_1.EDIT_COMMAND,
                arguments: [document.uri],
            }),
        ];
        // "Commit edits" only appears once the user actually has edits
        // to commit on this file — either dirty in-buffer or staged /
        // working-tree-changed in Git. We resolve both signals so the
        // CodeLens never shows when there's nothing to do.
        if (hasPendingEditsFor(document)) {
            lenses.push(new vscode.CodeLens(range, {
                title: `$(git-commit) Commit edits`,
                tooltip: `Commit your follow-up edits with a Mermaid-Sync-Reviewed-By trailer.`,
                command: openReview_1.COMMIT_EDITS_COMMAND,
                arguments: [document.uri],
            }));
        }
        return lenses;
    }
}
exports.BotEditCodeLensProvider = BotEditCodeLensProvider;
function hasPendingEditsFor(document) {
    if (document.isDirty) {
        return true;
    }
    try {
        const ext = vscode.extensions.getExtension("vscode.git");
        const api = ext?.exports?.enabled ? ext.exports.getAPI(1) : undefined;
        const repo = api?.getRepository(document.uri);
        if (!repo) {
            return false;
        }
        const fsPath = document.uri.fsPath;
        return (repo.state.workingTreeChanges.some((c) => c.uri.fsPath === fsPath) ||
            repo.state.indexChanges.some((c) => c.uri.fsPath === fsPath));
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=botEditCodeLensProvider.js.map