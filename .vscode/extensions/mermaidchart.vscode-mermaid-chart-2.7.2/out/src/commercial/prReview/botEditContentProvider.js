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
exports.BotEditContentProvider = void 0;
const vscode = __importStar(require("vscode"));
const SCHEME = "mermaid-bot-edit";
/**
 * Provides the contents of a tracked file *as of a specific commit* under a
 * dedicated URI scheme so VS Code's built-in `vscode.diff` editor can render
 * "before" (parent commit) vs "after" (working tree) without us building a
 * custom diff renderer.
 *
 * URI shape: `mermaid-bot-edit://<sha>/<absolute-path>?<original-uri>`
 *
 * `<original-uri>` is the encoded working-tree URI; we use it to find the
 * owning git repository because the absolute path alone may live in a
 * sub-repo of a multi-root workspace.
 */
class BotEditContentProvider {
    constructor() {
        this.emitter = new vscode.EventEmitter();
        this.onDidChange = this.emitter.event;
    }
    dispose() {
        this.emitter.dispose();
    }
    /**
     * Build a virtual URI that {@link provideTextDocumentContent} can resolve.
     */
    static buildUri(originalUri, sha) {
        return vscode.Uri.parse(`${SCHEME}://${sha}${originalUri.path}?${encodeURIComponent(originalUri.toString())}`);
    }
    async provideTextDocumentContent(uri) {
        const sha = uri.authority;
        const filePath = uri.path;
        const originalUriEncoded = uri.query;
        if (!sha || !filePath || !originalUriEncoded) {
            return "";
        }
        const originalUri = vscode.Uri.parse(decodeURIComponent(originalUriEncoded));
        const gitApi = getGitApi();
        if (!gitApi) {
            return "";
        }
        const repo = gitApi.getRepository(originalUri);
        if (!repo) {
            return "";
        }
        try {
            const relPath = vscode.workspace.asRelativePath(originalUri, false);
            return await repo.show(sha, relPath);
        }
        catch (err) {
            console.warn("[BotEditContentProvider] repo.show failed:", err);
            return "";
        }
    }
}
exports.BotEditContentProvider = BotEditContentProvider;
BotEditContentProvider.scheme = SCHEME;
function getGitApi() {
    const ext = vscode.extensions.getExtension("vscode.git");
    if (!ext?.exports?.enabled) {
        return undefined;
    }
    try {
        return ext.exports.getAPI(1);
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=botEditContentProvider.js.map