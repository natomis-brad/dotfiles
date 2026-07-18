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
exports.RemoteSyncHandler = void 0;
const vscode = __importStar(require("vscode"));
const mermaidChartProvider_1 = require("./mermaidChartProvider");
const diagramDiffView_1 = require("./commercial/sync/diagramDiffView");
class RemoteSyncHandler {
    constructor(mcAPI) {
        this.mcAPI = mcAPI;
        this.openDiffPreviews = new Set();
    }
    hasUnresolvedConflicts(content) {
        const conflictMarkers = [
            '<<<<<<< Current',
            '=======',
            '>>>>>>> Remote Changes'
        ];
        return conflictMarkers.some(marker => content.includes(marker));
    }
    async handleRemoteChanges(document, diagramId) {
        try {
            const currentContent = document.getText();
            // Check if there are unresolved conflicts
            if (this.hasUnresolvedConflicts(currentContent)) {
                vscode.window.showErrorMessage('Please resolve merge conflicts before saving.');
                return 'abort';
            }
            const remoteVersion = await this.mcAPI.getDocument({ documentID: diagramId });
            const originalDiagram = (0, mermaidChartProvider_1.getDiagramFromCache)(diagramId);
            if (!remoteVersion?.code || !originalDiagram?.code) {
                return 'continue';
            }
            // If no remote changes since last cache, return continue
            if (!remoteVersion || remoteVersion.code === originalDiagram.code) {
                return 'continue';
            }
            // If current content matches remote, just update cache and continue
            if (currentContent === remoteVersion.code) {
                const { updateDiagramInCache } = require('./mermaidChartProvider');
                updateDiagramInCache(diagramId, remoteVersion.code);
                return 'continue';
            }
            // Show non-modal notification at bottom right
            const result = await vscode.window.showInformationMessage('Remote diagram has been modified', 'Pull Remote Changes', 'Force Push Local Changes');
            if (result === 'Pull Remote Changes') {
                const canSaveFile = await this.insertMergeConflictMarkers(document, remoteVersion.code);
                // If conflict markers were added, show diagram previews
                if (!canSaveFile) {
                    this.showDiagramPreviews(document, currentContent, remoteVersion.code, diagramId);
                }
                return canSaveFile ? 'continue' : 'abort'; // Abort to prevent immediate save
            }
            else if (result === 'Force Push Local Changes') {
                (0, mermaidChartProvider_1.updateDiagramInCache)(diagramId, currentContent);
                return 'continue';
            }
            return 'abort';
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to check remote changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return 'abort';
        }
    }
    findDifferences(local, remote) {
        const localLines = local.split('\n');
        const remoteLines = remote.split('\n');
        const differentLines = {
            localLines: [],
            remoteLines: []
        };
        // Find the first different line
        let startDiff = 0;
        while (startDiff < localLines.length &&
            startDiff < remoteLines.length &&
            localLines[startDiff] === remoteLines[startDiff]) {
            startDiff++;
        }
        // Find the last different line
        let endDiffLocal = localLines.length - 1;
        let endDiffRemote = remoteLines.length - 1;
        while (endDiffLocal > startDiff &&
            endDiffRemote > startDiff &&
            localLines[endDiffLocal] === remoteLines[endDiffRemote]) {
            endDiffLocal--;
            endDiffRemote--;
        }
        // Extract the different sections
        differentLines.localLines = localLines.slice(startDiff, endDiffLocal + 1);
        differentLines.remoteLines = remoteLines.slice(startDiff, endDiffRemote + 1);
        return differentLines;
    }
    async insertMergeConflictMarkers(document, remoteContent) {
        const localContent = document.getText();
        // If contents are identical, can save
        if (localContent === remoteContent) {
            // vscode.window.showInformationMessage('No differences found between local and remote versions.');
            return true;
        }
        // Find the different sections
        const { localLines: diffLocalLines, remoteLines: diffRemoteLines } = this.findDifferences(localContent, remoteContent);
        // If both diff arrays are empty or contain only whitespace, can save
        if (diffLocalLines.every(line => !line.trim()) && diffRemoteLines.every(line => !line.trim())) {
            // vscode.window.showInformationMessage('No differences found between local and remote versions.');
            return true;
        }
        // Split both contents into lines for processing
        const allLocalLines = document.getText().split('\n');
        const allRemoteLines = remoteContent.split('\n');
        let mergedContent = '';
        // Add the common prefix
        const commonPrefixEndIndex = this.findFirstDifferentLine(allLocalLines, allRemoteLines);
        if (commonPrefixEndIndex > 0) {
            mergedContent += allLocalLines.slice(0, commonPrefixEndIndex).join('\n') + '\n';
        }
        // Only add conflict markers if there are actual non-empty differences
        if (diffLocalLines.some(line => line.trim()) || diffRemoteLines.some(line => line.trim())) {
            mergedContent += [
                '<<<<<<< Current',
                diffLocalLines.join('\n'),
                '=======',
                diffRemoteLines.join('\n'),
                '>>>>>>> Remote Changes'
            ].join('\n');
        }
        // Add the common suffix
        const commonSuffixStartIndex = this.findLastDifferentLine(allLocalLines, allRemoteLines);
        if (commonSuffixStartIndex < allLocalLines.length - 1) {
            mergedContent += '\n' + allLocalLines.slice(commonSuffixStartIndex + 1).join('\n');
        }
        // Only apply changes if there are actual differences and content has changed
        if (mergedContent !== localContent && mergedContent.trim()) {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
            edit.replace(document.uri, fullRange, mergedContent);
            await vscode.workspace.applyEdit(edit);
            // vscode.window.showInformationMessage(
            //     'Resolve the conflicts and save the file when ready.'
            // );
            return false; // Don't save immediately after adding conflict markers
        }
        else {
            // vscode.window.showInformationMessage('No differences found between local and remote versions.');
            return true; // Can save if no real differences found
        }
    }
    findFirstDifferentLine(localLines, remoteLines) {
        const minLength = Math.min(localLines.length, remoteLines.length);
        for (let i = 0; i < minLength; i++) {
            if (localLines[i] !== remoteLines[i]) {
                return i;
            }
        }
        return minLength;
    }
    findLastDifferentLine(localLines, remoteLines) {
        let localIndex = localLines.length - 1;
        let remoteIndex = remoteLines.length - 1;
        while (localIndex >= 0 && remoteIndex >= 0) {
            if (localLines[localIndex] !== remoteLines[remoteIndex]) {
                return Math.max(localIndex, remoteIndex);
            }
            localIndex--;
            remoteIndex--;
        }
        return -1;
    }
    showDiagramPreviews(document, localContent, remoteContent, diagramId) {
        try {
            // Dispose any previously open preview panels before opening new ones
            this.disposeDiffPanels?.();
            this.diffPanelCloseWatcher?.dispose();
            this.disposeDiffPanels = (0, diagramDiffView_1.openDiagramDiffWebviews)(localContent, remoteContent);
            this.openDiffPreviews.add(diagramId);
            const docUri = document.uri.toString();
            let cleaned = false;
            const cleanup = () => {
                if (cleaned) {
                    return;
                }
                cleaned = true;
                this.disposeDiffPanels?.();
                this.disposeDiffPanels = undefined;
                onConflictResolvedDisposable.dispose();
                onTabCloseDisposable.dispose();
                this.diffPanelCloseWatcher = undefined;
                this.openDiffPreviews.delete(diagramId);
            };
            // Trigger 1: user accepted current/incoming change — conflict markers removed from document
            const onConflictResolvedDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
                if (e.document.uri.toString() === docUri && !this.hasUnresolvedConflicts(e.document.getText())) {
                    cleanup();
                }
            });
            // Trigger 2: user closed the conflict file tab entirely
            const onTabCloseDisposable = vscode.window.tabGroups.onDidChangeTabs(({ closed }) => {
                for (const tab of closed) {
                    if (tab.input instanceof vscode.TabInputText &&
                        tab.input.uri.toString() === docUri) {
                        cleanup();
                        return;
                    }
                }
            });
            // Store a single disposable so dispose() on the class cleans up both listeners
            this.diffPanelCloseWatcher = { dispose: cleanup };
            vscode.window.showInformationMessage("Conflict detected. Diagram previews opened to help resolve differences. Edit the document to resolve conflicts, then save.");
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[Remote Sync Handler] Failed to open diagram diff previews:', err);
            vscode.window.showErrorMessage(`Could not open diagram previews: ${msg}`);
        }
    }
    dispose() {
        this.disposeDiffPanels?.();
        this.diffPanelCloseWatcher?.dispose();
        this.openDiffPreviews.clear();
    }
}
exports.RemoteSyncHandler = RemoteSyncHandler;
//# sourceMappingURL=remoteSyncHandler.js.map