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
exports.parseBotEditInfo = exports.GitTrailerDetector = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CONFIG_SECTION = "mermaidChart.prReview";
const DEFAULT_TRAILER = "Mermaid-Sync: regenerated";
/**
 * {@link BotEditDetector} backed by the VS Code built-in Git extension.
 *
 * Reads the most recent commit touching `uri`, looks for the configured
 * trailer (default `Mermaid-Sync: regenerated`), and returns
 * {@link BotEditInfo}. Caches per `uri+sha` so repeated banner / decoration
 * queries don't re-hit `git log`.
 *
 * Degrades gracefully — returns `null` whenever git is unavailable, the file
 * is untracked, the trailer is absent, or the user disabled PR-review
 * detection via `mermaidChart.prReview.enabled`.
 */
class GitTrailerDetector {
    constructor() {
        this.cache = new Map();
        this.emitter = new vscode.EventEmitter();
        this.disposables = [];
        this.watchedRepos = new WeakSet();
        this.onDidChange = this.emitter.event;
        this.disposables.push(this.emitter);
        this.disposables.push(vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(`${CONFIG_SECTION}.enabled`) ||
                e.affectsConfiguration(`${CONFIG_SECTION}.commitTrailer`)) {
                this.cache.clear();
                this.emitter.fire(undefined);
            }
        }));
        const gitApi = this.getGitApi();
        if (gitApi) {
            this.watchExistingRepos(gitApi);
            this.disposables.push(gitApi.onDidOpenRepository((repo) => {
                this.watchRepo(repo);
                // A repo just became known to VS Code (e.g. a loose file
                // opened from outside the workspace triggered auto-detection).
                // Drop cached null results so providers re-query.
                this.cache.clear();
                this.emitter.fire(undefined);
            }));
        }
    }
    dispose() {
        for (const d of this.disposables) {
            try {
                d.dispose();
            }
            catch { /* best-effort */ }
        }
        this.cache.clear();
    }
    async detect(uri) {
        console.log("[BotEditDetector] detect() called for", uri.fsPath);
        if (!this.isEnabled()) {
            console.log("[BotEditDetector] disabled by config");
            return null;
        }
        const gitApi = this.getGitApi();
        if (!gitApi) {
            console.log("[BotEditDetector] git API unavailable");
            return null;
        }
        let repo = gitApi.getRepository(uri);
        if (!repo) {
            console.log("[BotEditDetector] getRepository returned null, trying loose-file fallback");
            const root = findRepoRoot(uri.fsPath);
            console.log("[BotEditDetector] findRepoRoot →", root);
            if (!root) {
                return null;
            }
            try {
                repo = (await gitApi.openRepository(vscode.Uri.file(root))) ?? null;
                console.log("[BotEditDetector] openRepository →", repo ? "got repo" : "null");
            }
            catch (err) {
                console.warn("[BotEditDetector] openRepository failed:", err);
                return null;
            }
            if (!repo) {
                return null;
            }
            this.watchRepo(repo);
        }
        else {
            console.log("[BotEditDetector] getRepository returned repo at", repo.rootUri.fsPath);
        }
        let commit;
        try {
            const log = await repo.log({ path: uri.fsPath, maxEntries: 1 });
            console.log("[BotEditDetector] git log returned", log?.length ?? 0, "commits");
            commit = log?.[0];
            if (commit) {
                console.log("[BotEditDetector] latest commit:", commit.hash.slice(0, 7), "by", commit.authorName);
                console.log("[BotEditDetector] commit message:\n" + commit.message);
            }
        }
        catch (err) {
            console.warn("[BotEditDetector] git log failed:", err);
            return null;
        }
        if (!commit) {
            return null;
        }
        const cacheKey = uri.toString();
        const cached = this.cache.get(cacheKey);
        if (cached && cached.sha === commit.hash) {
            console.log("[BotEditDetector] cache hit:", cached.info ? "match" : "no match");
            return cached.info;
        }
        const trailerSpec = this.getTrailerPattern();
        console.log("[BotEditDetector] parsing with trailer:", trailerSpec);
        const info = parseBotEditInfo(commit, trailerSpec);
        console.log("[BotEditDetector] parseBotEditInfo →", info ? "MATCH" : "no match");
        this.cache.set(cacheKey, { sha: commit.hash, info });
        return info;
    }
    /**
     * Test seam: clear the per-uri cache. Production code relies on
     * git-state and config events to invalidate.
     */
    invalidate(uri) {
        if (uri) {
            this.cache.delete(uri.toString());
        }
        else {
            this.cache.clear();
        }
        this.emitter.fire(uri);
    }
    isEnabled() {
        return vscode.workspace
            .getConfiguration()
            .get(`${CONFIG_SECTION}.enabled`, true);
    }
    getTrailerPattern() {
        return vscode.workspace
            .getConfiguration()
            .get(`${CONFIG_SECTION}.commitTrailer`, DEFAULT_TRAILER);
    }
    getGitApi() {
        const ext = vscode.extensions.getExtension("vscode.git");
        if (!ext) {
            return undefined;
        }
        const exports = ext.isActive ? ext.exports : undefined;
        if (!exports || !exports.enabled) {
            return undefined;
        }
        try {
            return exports.getAPI(1);
        }
        catch (err) {
            console.warn("[BotEditDetector] git getAPI(1) failed:", err);
            return undefined;
        }
    }
    watchExistingRepos(api) {
        for (const repo of api.repositories) {
            this.watchRepo(repo);
        }
    }
    watchRepo(repo) {
        if (this.watchedRepos.has(repo)) {
            return;
        }
        this.watchedRepos.add(repo);
        this.disposables.push(repo.state.onDidChange(() => {
            this.cache.clear();
            this.emitter.fire(undefined);
        }));
    }
}
exports.GitTrailerDetector = GitTrailerDetector;
/**
 * Pure parsing function — public for unit testing without spinning up the
 * VS Code git extension.
 *
 * `trailerSpec` follows the human-friendly form `Key: value` (e.g.
 * `Mermaid-Sync: regenerated`). Matching is case-sensitive on the key,
 * case-insensitive on the value, and anchored to the start of a line so a
 * literal mention inside diagram source doesn't false-trigger.
 */
function parseBotEditInfo(commit, trailerSpec) {
    const trailerKey = trailerSpec.split(":")[0]?.trim();
    const trailerValue = trailerSpec.split(":").slice(1).join(":").trim();
    if (!trailerKey || !trailerValue) {
        return null;
    }
    const escapedKey = escapeRegex(trailerKey);
    const escapedValue = escapeRegex(trailerValue);
    const trailerRegex = new RegExp(`^${escapedKey}:\\s*${escapedValue}\\b`, "im");
    if (!trailerRegex.test(commit.message)) {
        return null;
    }
    const matchTrailer = (key) => {
        const re = new RegExp(`^${escapeRegex(key)}:\\s*(.+)$`, "im");
        return commit.message.match(re)?.[1]?.trim();
    };
    return {
        commitSha: commit.hash,
        shortSha: commit.hash.slice(0, 7),
        parentSha: commit.parents[0],
        commitMessage: commit.message,
        authorName: commit.authorName ?? "unknown",
        authoredAt: commit.authorDate ?? new Date(0),
        sourceRef: matchTrailer("Mermaid-Sync-Source"),
        prRef: matchTrailer("Mermaid-Sync-PR"),
        prTitle: matchTrailer("Mermaid-Sync-PR-Title"),
        reason: matchTrailer("Mermaid-Sync-Reason"),
    };
}
exports.parseBotEditInfo = parseBotEditInfo;
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Walk up from `filePath` looking for a `.git` entry (directory or file —
 * worktrees use a `.git` file). Returns the absolute path of the directory
 * containing it, or `null` when no repo is found before reaching the
 * filesystem root. Synchronous because the existence check is cheap and the
 * walk depth is bounded by the path length.
 */
function findRepoRoot(filePath) {
    let current = path.dirname(filePath);
    const root = path.parse(current).root;
    while (true) {
        try {
            if (fs.existsSync(path.join(current, ".git"))) {
                return current;
            }
        }
        catch { /* continue walking */ }
        if (current === root) {
            return null;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            return null;
        }
        current = parent;
    }
}
//# sourceMappingURL=gitTrailerDetector.js.map