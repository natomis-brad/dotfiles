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
exports.AppFileDecorationProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const appReviewPaths_1 = require("./appReviewPaths");
/** Purple tint in the explorer for in-review files and their parent folders (no badge/icons on names). */
const REVIEW_PURPLE = new vscode.ThemeColor("charts.purple");
class AppFileDecorationProvider {
    constructor(appReviewIntegration) {
        this.appReviewIntegration = appReviewIntegration;
        this._onDidChangeFileDecorations = new vscode.EventEmitter();
        this.onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;
        this.parentFolderToMappings = null;
    }
    getParentFolderToMappings() {
        if (!this.parentFolderToMappings) {
            const m = new Map();
            for (const mapping of this.appReviewIntegration.getReviewMappings().values()) {
                const parent = (0, appReviewPaths_1.repoRelativeParentDir)(mapping.relativePath);
                if (!parent) {
                    continue;
                }
                const list = m.get(parent);
                if (list) {
                    list.push(mapping);
                }
                else {
                    m.set(parent, [mapping]);
                }
            }
            this.parentFolderToMappings = m;
        }
        return this.parentFolderToMappings;
    }
    fileTooltip(mapping) {
        switch (mapping.status) {
            case "pending":
                return "Mermaid Diagram Sync — app review pending (see CodeLens in editor)";
            case "modified":
                return "Mermaid Diagram Sync — app review (modified; see CodeLens)";
            case "accepted":
                return "Mermaid Diagram Sync — app review accepted (see CodeLens)";
            case "rejected":
                return "Mermaid Diagram Sync — app review reverted to pre-app (see CodeLens)";
            default:
                return "Mermaid Diagram Sync — app review";
        }
    }
    folderTooltip(mappings) {
        const n = mappings.length;
        const names = mappings.map((x) => path.basename(x.originalFilePath));
        const preview = names.slice(0, 3).join(", ");
        const suffix = names.length > 3 ? ` (+${names.length - 3} more)` : "";
        return `Mermaid Diagram Sync — ${n} diagram(s) in app review in this folder: ${preview}${suffix}`;
    }
    provideFileDecoration(uri) {
        if (uri.scheme !== "file") {
            return undefined;
        }
        const mapping = this.appReviewIntegration.getReviewMapping(uri.fsPath);
        if (mapping) {
            return {
                color: REVIEW_PURPLE,
                tooltip: this.fileTooltip(mapping),
                propagate: false,
            };
        }
        const gitRoot = this.appReviewIntegration.getActiveGitRoot();
        if (gitRoot) {
            const relDir = (0, appReviewPaths_1.relativePathFromAbsolute)(gitRoot, uri.fsPath);
            if (relDir) {
                const parentMap = this.getParentFolderToMappings();
                const folderKey = (0, appReviewPaths_1.findMapKeyForRelativePath)(parentMap.keys(), relDir);
                const folderChildren = folderKey ? parentMap.get(folderKey) : undefined;
                if (folderChildren?.length) {
                    return {
                        color: REVIEW_PURPLE,
                        tooltip: this.folderTooltip(folderChildren),
                        propagate: false,
                    };
                }
            }
        }
        return undefined;
    }
    refresh() {
        this.parentFolderToMappings = null;
        const parentDirs = new Set();
        for (const mapping of this.appReviewIntegration.getReviewMappings().values()) {
            this._onDidChangeFileDecorations.fire(vscode.Uri.file(mapping.originalFilePath));
            parentDirs.add(path.dirname(mapping.originalFilePath));
        }
        for (const parentDir of parentDirs) {
            this._onDidChangeFileDecorations.fire(vscode.Uri.file(parentDir));
        }
        this._onDidChangeFileDecorations.fire(undefined);
    }
    updateFileStatus(originalFilePath, status) {
        const mapping = this.appReviewIntegration.getReviewMapping(originalFilePath);
        if (mapping) {
            mapping.status = status;
            this.parentFolderToMappings = null;
            const uri = vscode.Uri.file(mapping.originalFilePath);
            this._onDidChangeFileDecorations.fire(uri);
            this._onDidChangeFileDecorations.fire(vscode.Uri.file(path.dirname(mapping.originalFilePath)));
        }
    }
    dispose() {
        this._onDidChangeFileDecorations.dispose();
    }
}
exports.AppFileDecorationProvider = AppFileDecorationProvider;
//# sourceMappingURL=appFileDecorationProvider.js.map