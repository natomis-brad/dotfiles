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
exports.AppReviewIntegration = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const rest_1 = require("@octokit/rest");
const analytics_1 = __importDefault(require("./analytics"));
const appReviewPaths_1 = require("./appReviewPaths");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/** Max ms per git exec (Node kills the child on timeout). */
const GIT_EXEC_TIMEOUT_MS = 15000;
const GIT_LOG_EXEC_TIMEOUT_MS = 60000;
/** https://docs.github.com/en/rest/about-the-rest-api/api-versions */
const GITHUB_REST_API_VERSION = "2026-03-10";
class AppReviewIntegration {
    constructor() {
        this.reviewMappings = new Map();
        /** Set for the current review session (same repo as last registerPendingAppReviews). */
        this.activeGitRoot = null;
        this.octokit = null;
        this.githubContext = null;
        this._onDidChangePendingReviews = new vscode.EventEmitter();
        this.onDidChangePendingReviews = this._onDidChangePendingReviews.event;
        /** GitHub Actions bot identity — keep [bot] literals; not user-facing "app" naming. */
        this.syncBotEmailPattern = /(\d+\+)?mermaid-diagram-sync-assistant\[bot\]@users\.noreply\.github\.com/;
        this.syncBotNamePattern = /mermaid-diagram-sync-assistant\[bot\]/;
        this.syncBotMessagePattern = /Automated diagram update \(PR #(\d+)\)/;
    }
    notifyReviewMappingsChanged() {
        this._onDidChangePendingReviews.fire();
    }
    async reviewAppCommits(options = {}) {
        const trigger = options.trigger ?? "manual";
        const silent = trigger === "git-update";
        try {
            const workspaceRoot = this.getWorkspaceRoot();
            if (!workspaceRoot) {
                if (!silent) {
                    vscode.window.showErrorMessage("Open a folder workspace to review app sync commits.");
                }
                return;
            }
            const authed = await this.ensureGitHubAuthentication(silent);
            if (!authed) {
                return;
            }
            this.githubContext = null;
            const gh = await this.getCurrentGitHubContext();
            if (!gh?.pr) {
                if (!silent) {
                    vscode.window.showErrorMessage("No open GitHub pull request found for this branch. App review needs PR base content from GitHub.");
                }
                return;
            }
            const gitRoot = (await this.getGitRepositoryRoot(workspaceRoot)) ?? path.normalize(workspaceRoot);
            const { stdout: headShaOut } = await execAsync("git rev-parse HEAD", {
                cwd: workspaceRoot,
                timeout: GIT_EXEC_TIMEOUT_MS,
            });
            const headSHA = headShaOut.trim();
            if (!headSHA) {
                if (!silent) {
                    vscode.window.showErrorMessage("Could not read HEAD. Is this a git repository?");
                }
                return;
            }
            // Manual: entire PR (PR base → HEAD). Pull: only this pull (pre-pull HEAD → HEAD).
            const fromSHA = options.fromSHA ?? gh.pr.base.sha;
            const clearExisting = !options.fromSHA;
            const relPaths = await this.collectAppSyncTouchedMermaidRelPaths(gitRoot, fromSHA);
            if (relPaths.length === 0) {
                if (!silent) {
                    vscode.window.showInformationMessage("No .mmd/.mermaid files touched by Mermaid Sync app commits in the selected range.");
                }
                return;
            }
            await this.registerPendingAppReviews(workspaceRoot, gitRoot, fromSHA, headSHA, relPaths, silent, clearExisting);
            analytics_1.default.trackAppReviewTriggered();
            const message = `Mermaid Sync app updated ${relPaths.length} diagram file(s). Open each file to Review / Accept / Reject from CodeLens.`;
            if (silent) {
                vscode.window.showInformationMessage(message);
            }
            else {
                vscode.window.showInformationMessage(`Marked ${relPaths.length} diagram file(s) for Mermaid Sync app review. Open each file for Review / Accept / Reject / Submit.`);
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (!silent) {
                vscode.window.showErrorMessage(`App review failed: ${msg}`);
            }
        }
    }
    /**
     * Load Octokit + PR base vs HEAD snapshots into memory; decorate original paths only.
     * Removes legacy review temp folders if present.
     */
    async registerPendingAppReviews(workspaceRoot, gitRoot, originalSHA, headSHA, relativeMermaidPaths, silent = false, clearExisting = true) {
        const context = this.githubContext;
        if (!context || !this.octokit) {
            throw new Error("GitHub context missing");
        }
        for (const legacyName of [".mermaid-bot-review-temp", ".mermaid-app-review-temp"]) {
            const legacyFolder = path.join(workspaceRoot, legacyName);
            try {
                await vscode.workspace.fs.delete(vscode.Uri.file(legacyFolder), { recursive: true });
            }
            catch {
                /* not present */
            }
        }
        this.activeGitRoot = path.normalize(gitRoot);
        if (clearExisting) {
            this.reviewMappings.clear();
        }
        for (const rel of relativeMermaidPaths) {
            const relPosix = (0, appReviewPaths_1.toPosixRepoPath)(rel);
            const mapKey = relPosix;
            let originalContent;
            try {
                originalContent = await this.fetchFileContentApi(context.owner, context.repo, relPosix, originalSHA);
            }
            catch (e) {
                if ((0, appReviewPaths_1.githubApiHttpStatus)(e) === 404) {
                    // New diagram on this PR — no file at PR base ref.
                    originalContent = "";
                }
                else {
                    this.warnSkipFile(relPosix, "PR base", e, silent);
                    continue;
                }
            }
            let appContent;
            try {
                appContent = await this.fetchFileContentApi(context.owner, context.repo, relPosix, headSHA);
            }
            catch (e) {
                this.warnSkipFile(relPosix, "HEAD", e, silent);
                continue;
            }
            const originalFilePath = path.normalize(path.join(gitRoot, ...relPosix.split("/")));
            this.reviewMappings.set(mapKey, {
                relativePath: relPosix,
                originalFilePath,
                originalContent,
                appContent,
                status: "pending",
            });
        }
        if (this.reviewMappings.size === 0) {
            this.activeGitRoot = null;
        }
        this.notifyReviewMappingsChanged();
    }
    /** Git root for the current review session (null when no files are in review). */
    getActiveGitRoot() {
        return this.activeGitRoot;
    }
    /** Repo-relative Map key for an absolute path; null if outside active git root or no session. */
    lookupRepoRelativeKey(absolutePath) {
        if (!this.activeGitRoot) {
            return null;
        }
        const rel = (0, appReviewPaths_1.relativePathFromAbsolute)(this.activeGitRoot, absolutePath);
        if (!rel) {
            return null;
        }
        return (0, appReviewPaths_1.findMapKeyForRelativePath)(this.reviewMappings.keys(), rel);
    }
    warnSkipFile(relPosix, refLabel, error, silent) {
        if (silent) {
            return;
        }
        const status = (0, appReviewPaths_1.githubApiHttpStatus)(error);
        const detail = status !== undefined ? ` (HTTP ${status})` : "";
        vscode.window.showWarningMessage(`Skipping ${relPosix}: could not load file at ${refLabel} from GitHub${detail}.`);
    }
    /** All repo-relative .mmd/.mermaid paths touched in sync-app commits between `baseSHA` (exclusive) and `HEAD` (inclusive). */
    async collectAppSyncTouchedMermaidRelPaths(cwd, baseSHA) {
        const relSet = new Set();
        try {
            const { stdout: logOut } = await execAsync(`git log ${baseSHA}..HEAD --pretty=format:%H`, {
                cwd,
                timeout: GIT_LOG_EXEC_TIMEOUT_MS,
            });
            const hashes = logOut
                .trim()
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
            for (const hash of hashes) {
                const { stdout: metaOut } = await execAsync(`git show -s --format=%ae%n%an%n%s ${hash}`, {
                    cwd,
                    timeout: GIT_EXEC_TIMEOUT_MS,
                });
                const lines = metaOut.trim().split("\n");
                const authorEmail = lines[0] ?? "";
                const authorName = lines[1] ?? "";
                const message = lines.slice(2).join("\n");
                if (!this.isSyncAppBotCommit({ authorEmail, authorName, message })) {
                    continue;
                }
                const { stdout: namesOut } = await execAsync(`git diff-tree --no-commit-id --name-only -r ${hash}`, { cwd, timeout: GIT_EXEC_TIMEOUT_MS });
                for (const p of namesOut
                    .trim()
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)) {
                    if (p.endsWith(".mmd") || p.endsWith(".mermaid")) {
                        relSet.add(p.replace(/\\/g, "/"));
                    }
                }
            }
        }
        catch (e) {
            // swallow — returns empty set
        }
        return [...relSet];
    }
    /** Public: git repo root for workspace folder (normalized). */
    async resolveGitRepositoryRoot(workspaceRoot) {
        return this.getGitRepositoryRoot(workspaceRoot);
    }
    /** Remove a single file from active app review (Submit, or after push). */
    removeReviewForFile(absoluteFilePath) {
        const key = this.lookupRepoRelativeKey(absoluteFilePath);
        if (!key) {
            return false;
        }
        if (this.reviewMappings.delete(key)) {
            if (this.reviewMappings.size === 0) {
                this.activeGitRoot = null;
            }
            this.notifyReviewMappingsChanged();
            return true;
        }
        return false;
    }
    isSyncAppBotCommit(info) {
        return (this.syncBotEmailPattern.test(info.authorEmail) &&
            this.syncBotNamePattern.test(info.authorName) &&
            this.syncBotMessagePattern.test(info.message));
    }
    async connectGitHub() {
        try {
            const authed = await this.ensureGitHubAuthentication(false);
            if (!authed) {
                throw new Error("GitHub sign-in was cancelled.");
            }
            vscode.window.showInformationMessage("Connected to GitHub successfully.");
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`GitHub connection failed: ${msg}`);
        }
    }
    async disconnectGitHub() {
        this.octokit = null;
        this.githubContext = null;
        try {
            await vscode.authentication.getSession("github", ["repo"], {
                createIfNone: false,
                clearSessionPreference: true,
            });
        }
        catch {
            /* ignore — preference may not be set */
        }
        vscode.window.showInformationMessage("Disconnected from GitHub. Run \"MermaidChart: Connect GitHub\" to reconnect.");
    }
    async ensureGitHubAuthentication(silent = false) {
        const session = await vscode.authentication.getSession("github", ["repo"], {
            createIfNone: !silent,
        });
        if (!session) {
            return false;
        }
        this.octokit = new rest_1.Octokit({
            auth: session.accessToken,
            headers: { "X-GitHub-Api-Version": GITHUB_REST_API_VERSION },
        });
        return true;
    }
    async getCurrentGitHubContext() {
        if (this.githubContext) {
            return this.githubContext;
        }
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot || !this.octokit) {
            return null;
        }
        const { stdout: remoteUrl } = await execAsync("git config --get remote.origin.url", {
            cwd: workspaceRoot,
            timeout: GIT_EXEC_TIMEOUT_MS,
        });
        const { owner, repo } = this.parseGitHubUrl(remoteUrl.trim());
        const { stdout: currentBranch } = await execAsync("git branch --show-current", {
            cwd: workspaceRoot,
            timeout: GIT_EXEC_TIMEOUT_MS,
        });
        const branch = currentBranch.trim();
        const pr = await this.findPRForCurrentBranch(owner, repo, branch);
        this.githubContext = { owner, repo, currentBranch: branch, pr };
        return this.githubContext;
    }
    parseGitHubUrl(remoteUrl) {
        let match = null;
        if (remoteUrl.startsWith("git@github.com:")) {
            match = remoteUrl.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
        }
        else if (remoteUrl.startsWith("https://github.com/")) {
            match = remoteUrl.match(/https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
        }
        if (!match) {
            throw new Error(`Not a github.com remote: ${remoteUrl}`);
        }
        return { owner: match[1], repo: match[2] };
    }
    async findPRForCurrentBranch(owner, repo, branch) {
        if (!this.octokit) {
            return null;
        }
        try {
            const { data: pulls } = await this.octokit.rest.pulls.list({
                owner,
                repo,
                state: "open",
                head: `${owner}:${branch}`,
            });
            if (pulls.length > 0) {
                return pulls[0];
            }
            const { data: pullsAlt } = await this.octokit.rest.pulls.list({
                owner,
                repo,
                state: "open",
                head: branch,
            });
            if (pullsAlt.length > 0) {
                return pullsAlt[0];
            }
            return null;
        }
        catch (e) {
            return null;
        }
    }
    async fetchFileContentApi(owner, repo, filePath, ref) {
        if (!this.octokit) {
            throw new Error("Octokit not ready");
        }
        const { data } = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref,
        });
        if ("content" in data && typeof data.content === "string") {
            return Buffer.from(data.content, "base64").toString("utf8");
        }
        throw new Error("Not a file or empty");
    }
    /**
     * Re-fetch app sync proposal from GitHub at local HEAD and refresh mapping.appContent.
     * Used when restoring the bot proposal after user edits.
     */
    async fetchAppContentAtHead(absoluteFilePath) {
        const mapping = this.getReviewMapping(absoluteFilePath);
        if (!mapping) {
            return null;
        }
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return null;
        }
        const authed = await this.ensureGitHubAuthentication(false);
        if (!authed) {
            return null;
        }
        const gh = await this.getCurrentGitHubContext();
        if (!gh) {
            return null;
        }
        try {
            const { stdout: headShaOut } = await execAsync("git rev-parse HEAD", {
                cwd: workspaceRoot,
                timeout: GIT_EXEC_TIMEOUT_MS,
            });
            const headSHA = headShaOut.trim();
            if (!headSHA) {
                return null;
            }
            const content = await this.fetchFileContentApi(gh.owner, gh.repo, mapping.relativePath, headSHA);
            mapping.appContent = content;
            return content;
        }
        catch {
            return null;
        }
    }
    /** Lookup by absolute path to the real diagram file. */
    getReviewMapping(absoluteFilePath) {
        const key = this.lookupRepoRelativeKey(absoluteFilePath);
        if (!key) {
            return undefined;
        }
        return this.reviewMappings.get(key);
    }
    async getGitRepositoryRoot(cwd) {
        try {
            const { stdout } = await execAsync("git rev-parse --show-toplevel", {
                cwd,
                timeout: GIT_EXEC_TIMEOUT_MS,
            });
            const root = stdout.trim();
            return root ? path.normalize(root) : null;
        }
        catch {
            return null;
        }
    }
    getReviewMappings() {
        return this.reviewMappings;
    }
    dispose() {
        this.reviewMappings.clear();
        this.activeGitRoot = null;
        this._onDidChangePendingReviews.dispose();
    }
    getWorkspaceRoot() {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
    }
}
exports.AppReviewIntegration = AppReviewIntegration;
//# sourceMappingURL=appReviewIntegration.js.map