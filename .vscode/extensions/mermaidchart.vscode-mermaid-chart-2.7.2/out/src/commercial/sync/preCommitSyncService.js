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
exports.PreCommitSyncService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const frontmatter_1 = require("../../frontmatter");
const mermaidChartAuthenticationProvider_1 = require("../../mermaidChartAuthenticationProvider");
const analytics_1 = __importDefault(require("../../analytics"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const GIT_TIMEOUT_MS = 5000;
/** Maps a unified diff (+/-/ ) into the [ADDED]/[REMOVED]/[CONTEXT] format. */
function buildSourceFileContext(filePath, unifiedDiff) {
    const lines = [];
    lines.push('=== DETAILED CHANGE SUMMARY ===');
    lines.push('Source File Changes:');
    lines.push(`MODIFIED: ${filePath} (changes detected)`);
    lines.push('');
    for (const line of unifiedDiff.replace(/\r\n?/g, '\n').split('\n')) {
        // Skip file header lines (--- a/... +++ b/...) and hunk headers (@@ ... @@)
        if (line.startsWith('--- ') ||
            line.startsWith('+++ ') ||
            line.startsWith('diff ') ||
            line.startsWith('index ') ||
            line.startsWith('@@')) {
            continue;
        }
        if (line.startsWith('+')) {
            lines.push(`[ADDED]   ${line.slice(1)}`);
        }
        else if (line.startsWith('-')) {
            lines.push(`[REMOVED] ${line.slice(1)}`);
        }
        else if (line.startsWith(' ')) {
            lines.push(`[CONTEXT] ${line.slice(1)}`);
        }
        // empty lines at end of diff — skip
    }
    return lines.join('\n');
}
/**
 * Extract the resolved absolute file path from a reference string like "File: /src/auth.ts".
 *
 * Convention: a leading "/" in a reference means workspace-relative (not POSIX root).
 * Only Windows drive paths (e.g. C:\...) are treated as truly absolute and used as-is.
 * On POSIX, path.isAbsolute('/src/auth.ts') returns true but that path is still
 * workspace-relative by this codebase's convention, so we must not use path.isAbsolute.
 */
function resolveReferencePath(reference, workspacePath) {
    const match = reference.match(/File: (.*?)(\s|$|\()/);
    if (!match)
        return undefined;
    const filePath = match[1].trim();
    if (!filePath.includes('/') && !filePath.includes('\\'))
        return undefined;
    // Windows absolute path (e.g. C:\proj\src\auth.ts) — use as-is.
    if (/^[a-zA-Z]:[\\/]/.test(filePath)) {
        return path.normalize(filePath);
    }
    if (workspacePath) {
        // Strip any leading slashes/backslashes (workspace-relative convention).
        const relative = filePath.replace(/^[/\\]+/, '');
        return path.normalize(path.join(workspacePath, relative));
    }
    return path.normalize(filePath);
}
/** Run a git command asynchronously. Returns stdout/stderr or null on failure. */
async function runGit(args, cwd) {
    try {
        const { stdout, stderr } = await execFileAsync('git', args, {
            cwd,
            encoding: 'utf-8',
            timeout: GIT_TIMEOUT_MS,
            maxBuffer: 10 * 1024 * 1024,
        });
        return { stdout, stderr };
    }
    catch (error) {
        console.error({ cwd, args, error }, 'PreCommitSync: git command failed');
        return null;
    }
}
class PreCommitSyncService {
    static register(context, mcAPI) {
        // vscode.workspace.createFileSystemWatcher excludes .git/** by default, so
        // we use Node's fs.watch() directly.
        // IMPORTANT: git never modifies .git/index in place — it writes to
        // .git/index.lock then atomically renames it to .git/index.
        // Watching the file inode directly goes dead after the first rename.
        // Watching the .git/ DIRECTORY and filtering for 'index' events is reliable.
        const setupWatcher = (workspaceFolder) => {
            const folderPath = workspaceFolder.uri.fsPath;
            const gitDir = path.join(folderPath, '.git');
            if (!fs.existsSync(gitDir)) {
                // .git doesn't exist yet (folder opened before git init).
                // Poll every 5s; once it appears, set up the real watcher.
                const retryInterval = setInterval(() => {
                    if (fs.existsSync(gitDir) && !PreCommitSyncService.folderWatchers.has(folderPath)) {
                        clearInterval(retryInterval);
                        PreCommitSyncService.retryIntervals.delete(folderPath);
                        setupWatcher(workspaceFolder);
                    }
                }, 5000);
                PreCommitSyncService.retryIntervals.set(folderPath, retryInterval);
                context.subscriptions.push({
                    dispose: () => {
                        const interval = PreCommitSyncService.retryIntervals.get(folderPath);
                        if (interval) {
                            clearInterval(interval);
                            PreCommitSyncService.retryIntervals.delete(folderPath);
                        }
                    },
                });
                return;
            }
            const nodeWatcher = fs.watch(gitDir, (_eventType, filename) => {
                if (filename === 'index') {
                    PreCommitSyncService.onIndexChanged(workspaceFolder, mcAPI);
                }
            });
            PreCommitSyncService.folderWatchers.set(folderPath, nodeWatcher);
            // Look up the watcher from the map at dispose time so teardownWatcher
            // (folder removal) and subscription dispose (extension deactivate) don't
            // double-close the same watcher instance.
            context.subscriptions.push({
                dispose: () => {
                    const watcher = PreCommitSyncService.folderWatchers.get(folderPath);
                    if (watcher) {
                        watcher.close();
                        PreCommitSyncService.folderWatchers.delete(folderPath);
                    }
                    const timer = PreCommitSyncService.debounceTimers.get(folderPath);
                    if (timer) {
                        clearTimeout(timer);
                        PreCommitSyncService.debounceTimers.delete(folderPath);
                    }
                },
            });
        };
        const teardownWatcher = (workspaceFolder) => {
            const folderPath = workspaceFolder.uri.fsPath;
            const watcher = PreCommitSyncService.folderWatchers.get(folderPath);
            if (watcher) {
                watcher.close();
                PreCommitSyncService.folderWatchers.delete(folderPath);
            }
            const timer = PreCommitSyncService.debounceTimers.get(folderPath);
            if (timer) {
                clearTimeout(timer);
                PreCommitSyncService.debounceTimers.delete(folderPath);
            }
            const retryInterval = PreCommitSyncService.retryIntervals.get(folderPath);
            if (retryInterval) {
                clearInterval(retryInterval);
                PreCommitSyncService.retryIntervals.delete(folderPath);
            }
        };
        (vscode.workspace.workspaceFolders ?? []).forEach(setupWatcher);
        context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders((e) => {
            e.added.forEach(setupWatcher);
            e.removed.forEach(teardownWatcher);
        }));
    }
    static onIndexChanged(workspaceFolder, mcAPI) {
        const key = workspaceFolder.uri.fsPath;
        const existing = PreCommitSyncService.debounceTimers.get(key);
        if (existing)
            clearTimeout(existing);
        const timer = setTimeout(() => PreCommitSyncService.handleStagingChange(workspaceFolder, mcAPI), 300);
        PreCommitSyncService.debounceTimers.set(key, timer);
    }
    static async handleStagingChange(workspaceFolder, mcAPI) {
        const repoRoot = workspaceFolder.uri.fsPath;
        // Check if feature is enabled in settings
        const enabled = vscode.workspace
            .getConfiguration('mermaidChart')
            .get('preCommitSync.enabled', true);
        if (!enabled)
            return;
        // Get staged file paths via git directly — no VSCode Git API dependency.
        // --diff-filter=ACMR: only Added, Copied, Modified, Renamed files.
        // Excludes Deleted (D) so unstaging/discarding changes doesn't trigger the popup.
        const stagedResult = await runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], repoRoot);
        if (!stagedResult) {
            console.error({ repoRoot }, 'PreCommitSync: failed to get staged files');
            return;
        }
        const stagedOutput = stagedResult.stdout.trim();
        if (!stagedOutput)
            return;
        const allStagedPaths = stagedOutput
            .split('\n')
            .filter(Boolean)
            .map((p) => path.join(repoRoot, p));
        // Ignore staging events that only contain .mmd/.mermaid files themselves —
        // those aren't source files that drive diagram regeneration.
        const sourceStagedPaths = allStagedPaths.filter((p) => !p.endsWith('.mmd') && !p.endsWith('.mermaid'));
        if (sourceStagedPaths.length === 0)
            return;
        // Build a set of .mmd/.mermaid paths that should be skipped:
        //   1. Already staged — regenerated and added by the user.
        //   2. Has unstaged modifications — regenerated but not yet staged, OR was
        //      staged then unstaged (git restore --staged). In both cases the
        //      regenerated content is already on disk; no popup needed.
        const stagedMmdPaths = new Set(allStagedPaths.filter((p) => p.endsWith('.mmd') || p.endsWith('.mermaid')));
        const unstagedResult = await runGit(['diff', '--name-only'], repoRoot);
        if (unstagedResult?.stdout) {
            for (const rel of unstagedResult.stdout.split('\n').filter(Boolean)) {
                if (rel.endsWith('.mmd') || rel.endsWith('.mermaid')) {
                    stagedMmdPaths.add(path.join(repoRoot, rel));
                }
            }
        }
        // Phase 1: run the scan inside a progress notification that closes as soon as
        // we have results. The info toast is shown AFTER the progress notification dismisses.
        let affected = [];
        let sourceFilesContext = new Map();
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Mermaid Chart: Scanning staged files for diagram sync...',
            cancellable: false,
        }, async () => {
            affected = await PreCommitSyncService.findAffectedDiagrams(workspaceFolder, sourceStagedPaths, stagedMmdPaths);
            if (affected.length === 0)
                return;
            sourceFilesContext = await PreCommitSyncService.buildSourceFilesContext(repoRoot, affected);
        });
        // Phase 2: show the info toast only after the scanning notification is gone.
        if (affected.length > 0) {
            await PreCommitSyncService.showSyncPopup(affected, sourceFilesContext, mcAPI);
        }
    }
    /**
     * Lazily scan all .mmd/.mermaid files and find which ones reference any staged source file.
     * Skips any diagram that is itself already staged — it was already regenerated and synced.
     */
    static async findAffectedDiagrams(workspaceFolder, stagedPaths, stagedMmdPaths) {
        const mmdUris = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, '**/*.{mmd,mermaid}'));
        const affected = [];
        for (const mmdUri of mmdUris) {
            // If the diagram file itself is already staged, it was already updated — skip.
            if (stagedMmdPaths.has(mmdUri.fsPath))
                continue;
            try {
                const bytes = await vscode.workspace.fs.readFile(mmdUri);
                const text = Buffer.from(bytes).toString('utf-8');
                const metadata = (0, frontmatter_1.extractMetadataFromCode)(text);
                if (!metadata.references || metadata.references.length === 0)
                    continue;
                const matchedStagedFiles = [];
                for (const ref of metadata.references) {
                    const refPath = resolveReferencePath(ref, workspaceFolder.uri.fsPath);
                    if (!refPath)
                        continue;
                    // Normalize both to absolute paths and compare with strict equality.
                    // Push the staged path (not refPath) so downstream git diff uses the
                    // exact path that came from git output.
                    const normalizedRef = path.normalize(refPath);
                    const matchedStagedPath = stagedPaths.find((sp) => path.normalize(sp) === normalizedRef);
                    if (matchedStagedPath) {
                        matchedStagedFiles.push(matchedStagedPath);
                    }
                }
                if (matchedStagedFiles.length > 0) {
                    affected.push({
                        mmdUri,
                        mmdFileName: path.basename(mmdUri.fsPath),
                        stagedSourceFiles: matchedStagedFiles,
                    });
                }
            }
            catch (error) {
                console.error({ mmdUri: mmdUri.fsPath, error }, 'PreCommitSync: failed to read diagram file');
            }
        }
        return affected;
    }
    /**
     * For each staged source file referenced by an affected diagram, build
     * [ADDED]/[REMOVED]/[CONTEXT] context strings. Uses a single batched
     * git diff --cached call to avoid one fork per file.
     */
    static async buildSourceFilesContext(repoRoot, affected) {
        const relevantPaths = new Set();
        for (const d of affected) {
            for (const p of d.stagedSourceFiles)
                relevantPaths.add(p);
        }
        // path.relative on Windows produces backslashes; git always expects forward slashes.
        const relPaths = [...relevantPaths].map((p) => path.relative(repoRoot, p).replace(/\\/g, '/'));
        // Single git call for all relevant files — avoids a process fork per file.
        const diffResult = await runGit(['diff', '--cached', '--', ...relPaths], repoRoot);
        const combinedDiff = diffResult?.stdout ?? '';
        // Split combined diff output per file on "diff --git" section boundaries.
        const diffsByFile = new Map();
        if (combinedDiff.trim()) {
            const fileSections = combinedDiff.split(/^(?=diff --git )/m);
            for (const section of fileSections) {
                if (!section.trim())
                    continue;
                const headerMatch = section.match(/^diff --git a\/.+ b\/(.+)$/m);
                if (!headerMatch)
                    continue;
                const absPath = path.join(repoRoot, headerMatch[1].trim());
                if (relevantPaths.has(absPath)) {
                    diffsByFile.set(absPath, section);
                }
            }
        }
        const contextMap = new Map();
        for (const absPath of relevantPaths) {
            const relPath = path.relative(repoRoot, absPath);
            const diff = diffsByFile.get(absPath) ?? '';
            if (diff.trim()) {
                contextMap.set(absPath, buildSourceFileContext(relPath, diff));
            }
            else {
                // New file — no HEAD version, send full content as [ADDED]
                try {
                    const content = (await fs.promises.readFile(absPath, 'utf-8')).replace(/\r\n?/g, '\n');
                    const lines = content.split('\n').map((l) => `[ADDED]   ${l}`).join('\n');
                    contextMap.set(absPath, `=== DETAILED CHANGE SUMMARY ===\nSource File Changes:\nADDED: ${relPath} (new file)\n\n${lines}`);
                }
                catch (error) {
                    console.error({ absPath, error }, 'PreCommitSync: failed to read source file');
                }
            }
        }
        return contextMap;
    }
    static async showSyncPopup(affected, sourceFilesContext, mcAPI) {
        const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], { silent: true });
        // Build the file list description
        const fileLines = affected
            .map((d) => `• ${d.stagedSourceFiles.map((p) => path.basename(p)).join(', ')} → ${d.mmdFileName}`)
            .join('\n');
        if (!session) {
            const pick = await vscode.window.showInformationMessage(`Pre-commit Mermaid Diagram Sync: Staged changes may affect diagrams\n\n${fileLines}\n\nYou are not signed in to Mermaid Chart. Sign in to regenerate diagrams using Mermaid AI.\n\nTo disable this check: Settings → Mermaid Chart: Pre Commit Sync Enabled`, { modal: false }, 'Login to Mermaid Chart', 'Discard');
            if (pick === 'Login to Mermaid Chart') {
                await mcAPI.login();
            }
            return;
        }
        const pick = await vscode.window.showInformationMessage(`Pre-commit Mermaid Diagram Sync\n\n The following staged source files are referenced by Mermaid diagrams that may be out of sync:\n\n${fileLines}\n\n Regenerate diagrams now using Mermaid AI? This will use your AI credits.\n\n To disable this: Settings → Mermaid Chart: Pre Commit Sync Enabled`, { modal: false }, 'Regenerate', 'Discard');
        if (pick !== 'Regenerate')
            return;
        analytics_1.default.trackPreCommitDiagramRegenerate();
        for (const diagram of affected) {
            const sourceFiles = diagram.stagedSourceFiles
                .map((p) => sourceFilesContext.get(p))
                .filter((s) => s !== undefined);
            await vscode.commands.executeCommand('mermaidChart.regenerateDiagramWithMermaidAI', diagram.mmdUri, sourceFiles);
        }
    }
}
exports.PreCommitSyncService = PreCommitSyncService;
PreCommitSyncService.debounceTimers = new Map();
PreCommitSyncService.folderWatchers = new Map();
PreCommitSyncService.retryIntervals = new Map();
//# sourceMappingURL=preCommitSyncService.js.map