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
exports.AppReviewGitStatusTracker = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const GIT_STATUS_TIMEOUT_MS = 15000;
function runGitStdout(cwd, args) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)("git", args, { cwd, shell: false });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                child.kill();
                reject(new Error(`git ${args.join(" ")} timed out after ${GIT_STATUS_TIMEOUT_MS}ms`));
            }
        }, GIT_STATUS_TIMEOUT_MS);
        child.stdout?.on("data", (d) => {
            stdout += String(d);
        });
        child.stderr?.on("data", (d) => {
            stderr += String(d);
        });
        child.on("error", (err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                reject(err);
            }
        });
        child.on("close", (code) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve({ code: code ?? 1, stdout, stderr });
            }
        });
    });
}
/**
 * Tracks `git status --porcelain` per reviewed file so CodeLens can show Commit only when dirty.
 * Uses each mapping's `relativePath` (git index casing) for pathspecs.
 */
class AppReviewGitStatusTracker {
    constructor(appReviewIntegration) {
        this.appReviewIntegration = appReviewIntegration;
        this.dirtyByRepoRelativePath = new Map();
        this.debounceTimers = new Map();
        this._onDidChangeDirty = new vscode.EventEmitter();
        this.onDidChangeDirty = this._onDidChangeDirty.event;
    }
    isDirtyForFile(absolutePath) {
        const mapping = this.appReviewIntegration.getReviewMapping(absolutePath);
        if (!mapping) {
            return false;
        }
        return this.dirtyByRepoRelativePath.get(mapping.relativePath) === true;
    }
    async refreshPath(absolutePath) {
        const mapping = this.appReviewIntegration.getReviewMapping(absolutePath);
        const gitRoot = this.appReviewIntegration.getActiveGitRoot();
        if (!mapping || !gitRoot) {
            return;
        }
        try {
            const r = await runGitStdout(gitRoot, ["status", "--porcelain", "--", mapping.relativePath]);
            const dirty = r.code === 0 && r.stdout.trim().length > 0;
            this.dirtyByRepoRelativePath.set(mapping.relativePath, dirty);
            this._onDidChangeDirty.fire();
        }
        catch {
            // git status failed or timed out — leave existing dirty state, fire refresh anyway
            this._onDidChangeDirty.fire();
        }
    }
    async refreshAllMapped() {
        for (const mapping of this.appReviewIntegration.getReviewMappings().values()) {
            await this.refreshPath(mapping.originalFilePath);
        }
    }
    invalidatePath(absolutePath) {
        const mapping = this.appReviewIntegration.getReviewMapping(absolutePath);
        if (mapping) {
            this.dirtyByRepoRelativePath.delete(mapping.relativePath);
            this._onDidChangeDirty.fire();
        }
    }
    scheduleRefreshPath(absolutePath, delayMs = 400) {
        const mapping = this.appReviewIntegration.getReviewMapping(absolutePath);
        if (!mapping) {
            return;
        }
        const timerKey = mapping.relativePath;
        const prev = this.debounceTimers.get(timerKey);
        if (prev) {
            clearTimeout(prev);
        }
        const t = setTimeout(() => {
            this.debounceTimers.delete(timerKey);
            void this.refreshPath(absolutePath);
        }, delayMs);
        this.debounceTimers.set(timerKey, t);
    }
    dispose() {
        for (const t of this.debounceTimers.values()) {
            clearTimeout(t);
        }
        this.debounceTimers.clear();
        this._onDidChangeDirty.dispose();
    }
}
exports.AppReviewGitStatusTracker = AppReviewGitStatusTracker;
//# sourceMappingURL=appReviewGitStatus.js.map