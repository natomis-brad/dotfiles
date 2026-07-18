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
exports.githubApiHttpStatus = exports.repoRelativeParentDir = exports.pathsEqualAbsolute = exports.findMapKeyForRelativePath = exports.relativePathFromAbsolute = exports.toPosixRepoPath = void 0;
const path = __importStar(require("path"));
/** Repo-relative path with forward slashes (from git or path.relative). */
function toPosixRepoPath(relativePath) {
    return relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
}
exports.toPosixRepoPath = toPosixRepoPath;
/** Workspace absolute file → repo-relative posix path; null if outside gitRoot. */
function relativePathFromAbsolute(gitRoot, absolutePath) {
    const rel = path.relative(path.normalize(gitRoot), path.normalize(absolutePath));
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        return null;
    }
    return toPosixRepoPath(rel.split(path.sep).join("/"));
}
exports.relativePathFromAbsolute = relativePathFromAbsolute;
/** Match a relative path to a Map key (case-insensitive on Windows). */
function findMapKeyForRelativePath(mapKeys, relPath) {
    const posix = toPosixRepoPath(relPath);
    for (const key of mapKeys) {
        if (key === posix) {
            return key;
        }
    }
    if (process.platform === "win32") {
        const lower = posix.toLowerCase();
        for (const key of mapKeys) {
            if (key.toLowerCase() === lower) {
                return key;
            }
        }
    }
    return null;
}
exports.findMapKeyForRelativePath = findMapKeyForRelativePath;
/** Compare two absolute paths (case-insensitive on Windows). */
function pathsEqualAbsolute(a, b) {
    const na = path.normalize(a);
    const nb = path.normalize(b);
    if (process.platform === "win32") {
        return na.toLowerCase() === nb.toLowerCase();
    }
    return na === nb;
}
exports.pathsEqualAbsolute = pathsEqualAbsolute;
/** Parent folder key for explorer decoration (relativePath is posix). */
function repoRelativeParentDir(relativePath) {
    const dir = path.posix.dirname(relativePath);
    return dir === "." ? "" : dir;
}
exports.repoRelativeParentDir = repoRelativeParentDir;
/** HTTP status from Octokit / GitHub request errors. */
function githubApiHttpStatus(error) {
    if (error !== null && typeof error === "object" && "status" in error) {
        const status = error.status;
        return typeof status === "number" ? status : undefined;
    }
    return undefined;
}
exports.githubApiHttpStatus = githubApiHttpStatus;
//# sourceMappingURL=appReviewPaths.js.map