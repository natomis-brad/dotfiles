"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TempFileCache = void 0;
class TempFileCache {
    // Retrieve stored URIs or initialize as an empty list
    static getAllTempUris(context) {
        return context.globalState.get(this.cacheKey, []);
    }
    // Add a URI to the temporary files list
    static addTempUri(context, uri) {
        const uris = this.getAllTempUris(context);
        if (!uris.includes(uri)) {
            uris.push(uri);
            context.globalState.update(this.cacheKey, uris);
        }
    }
    // Remove a URI from the temporary files list
    static removeTempUri(context, uri) {
        let uris = this.getAllTempUris(context);
        uris = uris.filter((existingUri) => existingUri !== uri);
        context.globalState.update(this.cacheKey, uris);
    }
    // Check if a URI is in the temporary files list
    static hasTempUri(context, uri) {
        return this.getAllTempUris(context).includes(uri);
    }
    // Clear the entire temporary file URI list
    static clearTempUris(context) {
        context.globalState.update(this.cacheKey, []);
    }
}
exports.TempFileCache = TempFileCache;
TempFileCache.cacheKey = "mermaidTempFileURIs"; // Unique key for storing temporary file URIs
//# sourceMappingURL=tempFileCache.js.map