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
exports.MermaidChartProvider = exports.Document = exports.MCTreeItem = exports.updateDiagramInCache = exports.getDiagramFromCache = exports.getProjectIdForDocument = exports.getAllTreeViewProjectsCache = exports.setAllTreeViewProjectsCache = exports.ITEM_TYPE_UNKNOWN = exports.ITEM_TYPE_DOCUMENT = exports.ITEM_TYPE_PROJECT = void 0;
const vscode = __importStar(require("vscode"));
exports.ITEM_TYPE_PROJECT = "project";
exports.ITEM_TYPE_DOCUMENT = "document";
exports.ITEM_TYPE_UNKNOWN = "unknown";
let allTreeViewProjectsCache = [];
function setAllTreeViewProjectsCache(projects) {
    allTreeViewProjectsCache = projects;
}
exports.setAllTreeViewProjectsCache = setAllTreeViewProjectsCache;
function getAllTreeViewProjectsCache() {
    return allTreeViewProjectsCache;
}
exports.getAllTreeViewProjectsCache = getAllTreeViewProjectsCache;
function getProjectIdForDocument(diagramId) {
    function findProjectId(projects) {
        for (const project of projects) {
            if (project?.children) {
                if (project.children.some((child) => child.uuid === diagramId)) {
                    return project.uuid;
                }
                const foundId = findProjectId(project.children);
                if (foundId)
                    return foundId;
            }
        }
        return null;
    }
    return findProjectId(allTreeViewProjectsCache) || "";
}
exports.getProjectIdForDocument = getProjectIdForDocument;
function getDiagramFromCache(diagramId) {
    function findDiagram(projects) {
        for (const project of projects) {
            if (project?.children) {
                const foundDiagram = project.children.find((child) => child.uuid === diagramId && child instanceof Document);
                if (foundDiagram && foundDiagram instanceof Document) {
                    return foundDiagram;
                }
                const nestedDiagram = findDiagram(project.children);
                if (nestedDiagram)
                    return nestedDiagram;
            }
        }
        return null;
    }
    return findDiagram(allTreeViewProjectsCache);
}
exports.getDiagramFromCache = getDiagramFromCache;
function updateDiagramInCache(diagramId, newCode) {
    function updateDiagram(projects) {
        for (const project of projects) {
            if (project?.children) {
                const foundDiagram = project.children.find((child) => child.uuid === diagramId && child instanceof Document);
                if (foundDiagram && foundDiagram instanceof Document) {
                    foundDiagram.code = newCode;
                    return true;
                }
                const updated = updateDiagram(project.children);
                if (updated)
                    return true;
            }
        }
        return false;
    }
    updateDiagram(allTreeViewProjectsCache);
}
exports.updateDiagramInCache = updateDiagramInCache;
class MCTreeItem extends vscode.TreeItem {
    constructor(uuid, range, title, code, children) {
        super(title, children === undefined
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Collapsed);
        this.uuid = uuid;
        this.code = code || "";
        this.range = range;
        this.title = title;
    }
}
exports.MCTreeItem = MCTreeItem;
class Document {
    constructor(uuid, range, title, code, collapsibleState) {
        this.uuid = uuid;
        this.range = range;
        this.title = title;
        this.code = code || "";
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }
    getTreeItem() {
        return {
            collapsibleState: vscode.TreeItemCollapsibleState.None,
        };
    }
}
exports.Document = Document;
class Project {
    constructor(uuid, range, title, code, collapsibleState, children) {
        this.uuid = uuid;
        this.range = range;
        this.title = title;
        this.code = code || "";
        this.collapsibleState = collapsibleState;
        this.children = children;
    }
    getTreeItem() {
        return {
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
    }
}
class MermaidChartProvider {
    constructor(mcAPI) {
        this.mcAPI = mcAPI;
        this.lastClickTime = 0;
        this.lastClickedUuid = '';
        this.doubleClickDelay = 300; // milliseconds
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        // Register a smart double-click command
        vscode.commands.registerCommand('mermaidChart.smartClick', (uuid) => {
            const currentTime = Date.now();
            const timeSinceLastClick = currentTime - this.lastClickTime;
            if (uuid === this.lastClickedUuid && timeSinceLastClick < this.doubleClickDelay) {
                // Double-click detected - trigger edit
                vscode.commands.executeCommand('mermaidChart.editLocally', uuid);
                // Reset to prevent triple clicks
                this.lastClickTime = 0;
                this.lastClickedUuid = '';
            }
            else {
                // Single click - just remember it
                this.lastClickTime = currentTime;
                this.lastClickedUuid = uuid;
            }
        });
    }
    refresh() {
        allTreeViewProjectsCache = [];
        this._onDidChangeTreeData.fire();
    }
    static async waitForSync() {
        if (!MermaidChartProvider.isSyncing) {
            return true;
        }
        return new Promise((resolve) => {
            const checkSync = () => {
                if (!MermaidChartProvider.isSyncing) {
                    resolve(true);
                }
                else {
                    setTimeout(checkSync, 100);
                }
            };
            checkSync();
        });
    }
    getItemTypeFromUuid(uuid) {
        if (allTreeViewProjectsCache.length === 0) {
            this.refresh();
        }
        const findItemType = (items) => {
            for (const item of items) {
                if (item.uuid === uuid) {
                    return item instanceof Project ? exports.ITEM_TYPE_PROJECT : exports.ITEM_TYPE_DOCUMENT;
                }
                const type = item.children?.length ? findItemType(item.children) : exports.ITEM_TYPE_UNKNOWN;
                if (type !== exports.ITEM_TYPE_UNKNOWN)
                    return type;
            }
            return exports.ITEM_TYPE_UNKNOWN;
        };
        return findItemType(allTreeViewProjectsCache);
    }
    getProjectOfDocument(uuid) {
        let allProjects = [];
        if (allTreeViewProjectsCache.length === 0) {
            this.refresh();
        }
        allProjects = allTreeViewProjectsCache;
        for (const project of allProjects) {
            for (const document of project.children ?? []) {
                if (document.uuid === uuid) {
                    return project;
                }
            }
        }
        return undefined;
    }
    getTreeItem(element) {
        let collapsibleState;
        if (element instanceof Document) {
            collapsibleState = vscode.TreeItemCollapsibleState.None;
        }
        else if (element instanceof Project) {
            collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        }
        else {
            collapsibleState = vscode.TreeItemCollapsibleState.None;
        }
        const treeItem = new vscode.TreeItem(`${element.title}`, collapsibleState);
        // Set smart double-click command for documents (diagrams)
        if (element instanceof Document) {
            treeItem.command = {
                command: "mermaidChart.smartClick",
                title: "Smart Click",
                arguments: [element.uuid]
            };
        }
        treeItem.contextValue = element.children ? "project" : "document";
        return treeItem;
    }
    async getChildren(element) {
        if (!element) {
            if (allTreeViewProjectsCache.length > 0) {
                return Promise.resolve(allTreeViewProjectsCache);
            }
            return this.syncMermaidChart();
        }
        return element.children ?? [];
    }
    async syncMermaidChart() {
        try {
            MermaidChartProvider.isSyncing = true;
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Mermaid Chart",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Syncing diagrams from Mermaid..." });
                const projects = await this.fetchAndProcessProjects();
                this._onDidChangeTreeData.fire();
                MermaidChartProvider.isSyncing = false;
                return projects;
            });
        }
        finally {
            MermaidChartProvider.isSyncing = false;
            console.log('ending MermaidChartProvider.isSyncing', MermaidChartProvider.isSyncing);
        }
    }
    async fetchAndProcessProjects() {
        const mermaidChartProjects = await this.mcAPI.getProjects();
        const projectMap = this.createProjectMap(mermaidChartProjects);
        const allTreeViewProjects = this.buildProjectHierarchy(mermaidChartProjects, projectMap);
        await this.fetchAndAttachDocuments(projectMap);
        allTreeViewProjectsCache = allTreeViewProjects;
        return allTreeViewProjects;
    }
    createProjectMap(projects) {
        const projectMap = new Map();
        for (const project of projects) {
            const projectInstance = new Project(project.id, new vscode.Range(0, 0, 0, 1), project.title, "", vscode.TreeItemCollapsibleState.Collapsed, []);
            projectMap.set(project.id, projectInstance);
        }
        return projectMap;
    }
    buildProjectHierarchy(projects, projectMap) {
        const allTreeViewProjects = [];
        for (const project of projects) {
            const projectInstance = projectMap.get(project.id);
            if (!projectInstance)
                continue;
            if (project.parentID) {
                const parentProject = projectMap.get(project.parentID);
                if (parentProject) {
                    if (!parentProject.children) {
                        parentProject.children = [];
                    }
                    parentProject.children.push(projectInstance);
                }
            }
            else {
                allTreeViewProjects.push(projectInstance);
            }
        }
        return allTreeViewProjects;
    }
    async fetchAndAttachDocuments(projectMap) {
        for (const [projectId, projectInstance] of projectMap) {
            const mermaidChartDocuments = await this.mcAPI.getDocuments(projectId);
            for (const document of mermaidChartDocuments) {
                const documentTitle = document.title || "Untitled Diagram";
                const treeViewDocument = new Document(document.documentID, new vscode.Range(0, 0, 0, 1), documentTitle, document.code || "", vscode.TreeItemCollapsibleState.None);
                if (!projectInstance.children) {
                    projectInstance.children = [];
                }
                projectInstance.children.push(treeViewDocument);
            }
        }
    }
}
exports.MermaidChartProvider = MermaidChartProvider;
MermaidChartProvider.isSyncing = false;
//# sourceMappingURL=mermaidChartProvider.js.map