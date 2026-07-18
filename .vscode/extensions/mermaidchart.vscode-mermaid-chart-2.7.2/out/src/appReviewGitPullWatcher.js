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
exports.AppReviewGitPullWatcher = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const node_fs_1 = require("node:fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const GIT_EXEC_TIMEOUT_MS = 15000;
const PULL_CHECK_DEBOUNCE_MS = 800;
/**
 * Detects git pull by watching remote-fetch signals only (not local commits).
 *
 * - `git commit`  → updates refs/heads only        → we do NOT watch that
 * - `git pull`    → updates FETCH_HEAD + origin   → we watch those, then check HEAD moved
 */
class AppReviewGitPullWatcher {
    constructor(integration) {
        this.integration = integration;
        this.lastHeadByRepo = new Map();
        this.debounceTimers = new Map();
        this.fsWatchers = [];
    }
    start(context) {
        void this.setupFileWatchersForWorkspace();
        context.subscriptions.push(this);
    }
    async setupFileWatchersForWorkspace() {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return;
        }
        const gitRoot = (await this.integration.resolveGitRepositoryRoot(workspaceRoot)) ??
            path.normalize(workspaceRoot);
        const gitDir = await this.resolveGitDir(gitRoot);
        if (!gitDir) {
            return;
        }
        const repoKey = path.normalize(gitRoot);
        const headSha = await this.readHeadSha(gitRoot);
        if (headSha) {
            this.lastHeadByRepo.set(repoKey, headSha);
        }
        const schedule = () => this.schedulePullCheck(gitRoot);
        // Pull/fetch touches remote metadata — local `git commit` does not.
        try {
            this.fsWatchers.push((0, node_fs_1.watch)(path.join(gitDir, "FETCH_HEAD"), schedule));
        }
        catch {
            /* FETCH_HEAD may not exist yet */
        }
        try {
            this.fsWatchers.push((0, node_fs_1.watch)(path.join(gitDir, "refs", "remotes"), schedule));
        }
        catch {
            /* ignore */
        }
    }
    schedulePullCheck(gitRoot) {
        const repoKey = path.normalize(gitRoot);
        const prev = this.debounceTimers.get(repoKey);
        if (prev) {
            clearTimeout(prev);
        }
        const timer = setTimeout(() => {
            this.debounceTimers.delete(repoKey);
            void this.checkPullAndMaybeReview(gitRoot);
        }, PULL_CHECK_DEBOUNCE_MS);
        this.debounceTimers.set(repoKey, timer);
    }
    /** Remote refs changed — run review only if HEAD also moved (pull merged), not fetch-only. */
    async checkPullAndMaybeReview(gitRoot) {
        const repoKey = path.normalize(gitRoot);
        const headSha = await this.readHeadSha(gitRoot);
        if (!headSha) {
            return;
        }
        const previous = this.lastHeadByRepo.get(repoKey);
        if (!previous || previous === headSha) {
            if (!previous) {
                this.lastHeadByRepo.set(repoKey, headSha);
            }
            return;
        }
        this.lastHeadByRepo.set(repoKey, headSha);
        await this.integration.reviewAppCommits({ trigger: "git-update", fromSHA: previous });
    }
    async readHeadSha(cwd) {
        try {
            const { stdout } = await execAsync("git rev-parse HEAD", {
                cwd,
                timeout: GIT_EXEC_TIMEOUT_MS,
            });
            const sha = stdout.trim();
            return sha || null;
        }
        catch {
            return null;
        }
    }
    async resolveGitDir(gitRoot) {
        try {
            const { stdout } = await execAsync("git rev-parse --git-dir", {
                cwd: gitRoot,
                timeout: GIT_EXEC_TIMEOUT_MS,
            });
            const gitDir = stdout.trim();
            if (!gitDir) {
                return null;
            }
            return path.isAbsolute(gitDir) ? path.normalize(gitDir) : path.join(gitRoot, gitDir);
        }
        catch {
            return null;
        }
    }
    dispose() {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        for (const watcher of this.fsWatchers) {
            watcher.close();
        }
        this.fsWatchers.length = 0;
        this.lastHeadByRepo.clear();
    }
}
exports.AppReviewGitPullWatcher = AppReviewGitPullWatcher;
//# sourceMappingURL=appReviewGitPullWatcher.js.map