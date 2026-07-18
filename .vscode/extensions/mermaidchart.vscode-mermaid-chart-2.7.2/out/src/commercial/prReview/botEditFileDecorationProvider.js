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
exports.BotEditFileDecorationProvider = void 0;
const vscode = __importStar(require("vscode"));
const analytics_1 = __importDefault(require("../../analytics"));
/**
 * Tab-badge dot (•) for files the Mermaid Sync bot last edited. Uses the
 * built-in `charts.purple` ThemeColor — distinct from VS Code's git
 * decoration palette (modified-yellow, untracked-green, added-green) so the
 * indicator doesn't read as a duplicate git status.
 *
 * Also fires the `BotEdit Detected` analytics event once per `uri+sha` to
 * answer Slice 1's open question: "do users notice and care?"
 */
class BotEditFileDecorationProvider {
    constructor(detector) {
        this.detector = detector;
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeFileDecorations = this.emitter.event;
        this.disposables = [];
        this.detectedFor = new Set();
        this.disposables.push(this.emitter);
        this.disposables.push(this.detector.onDidChange((uri) => {
            this.detectedFor.clear();
            if (uri) {
                this.emitter.fire(uri);
            }
            else {
                this.refreshAllVisible();
            }
        }));
    }
    dispose() {
        for (const d of this.disposables) {
            try {
                d.dispose();
            }
            catch { /* best-effort */ }
        }
    }
    /**
     * Re-fire decorations for every Mermaid file currently open in a tab.
     * VS Code's decoration provider has no "refresh all" primitive — listing
     * the open tabs and firing per-uri is the canonical workaround.
     */
    refreshAllVisible() {
        const uris = [];
        for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                if (tab.input instanceof vscode.TabInputText) {
                    uris.push(tab.input.uri);
                }
            }
        }
        if (uris.length > 0) {
            this.emitter.fire(uris);
        }
    }
    async provideFileDecoration(uri) {
        if (uri.scheme !== "file") {
            return undefined;
        }
        if (!/\.(mmd|mermaid)$/i.test(uri.fsPath)) {
            return undefined;
        }
        const info = await this.detector.detect(uri);
        if (!info) {
            return undefined;
        }
        const detectedKey = `${uri.toString()}@${info.commitSha}`;
        if (!this.detectedFor.has(detectedKey)) {
            this.detectedFor.add(detectedKey);
            try {
                analytics_1.default.sendEvent("VS Code PR Review Bot Edit Detected", "VS_CODE_PLUGIN_PR_REVIEW_BOT_EDIT_DETECTED");
            }
            catch (err) {
                console.warn("[BotEditFileDecorationProvider] analytics failed:", err);
            }
        }
        return {
            badge: "•",
            tooltip: `Synced by Mermaid Sync · ${info.shortSha}`,
            color: new vscode.ThemeColor("charts.purple"),
            propagate: false,
        };
    }
}
exports.BotEditFileDecorationProvider = BotEditFileDecorationProvider;
//# sourceMappingURL=botEditFileDecorationProvider.js.map