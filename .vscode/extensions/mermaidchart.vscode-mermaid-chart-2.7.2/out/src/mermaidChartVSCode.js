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
exports.getBaseUrl = exports.MermaidChartVSCode = void 0;
const vscode = __importStar(require("vscode"));
const sdk_1 = require("@mermaidchart/sdk");
const mermaidChartAuthenticationProvider_1 = require("./mermaidChartAuthenticationProvider");
const util_1 = require("./util");
class MermaidChartVSCode extends sdk_1.MermaidChart {
    constructor() {
        const baseURL = getBaseUrl();
        const clientID = `469e30a6-2602-4022-aff8-2ab36842dc57`;
        const requestTimeout = 120000; // The repair diagram API can take up to 120 seconds to complete
        super({
            baseURL,
            clientID,
            requestTimeout,
        });
    }
    async initialize(context, mermaidWebviewProvider, mermaidChartProvider) {
        this.context = context;
        this.mermaidWebviewProvider = mermaidWebviewProvider;
        this.mermaidChartProvider = mermaidChartProvider;
        await this.registerListeners(context, mermaidWebviewProvider);
        await this.setupAPI();
    }
    // Wrapper method to handle API errors and auto-logout on 403/unauthorized
    async handleApiCall(apiCall) {
        try {
            return await apiCall();
        }
        catch (error) {
            // Check if error is 403 or unauthorized
            if (this.isUnauthorizedError(error)) {
                console.log('Unauthorized API call detected, logging out user');
                await this.handleUnauthorizedError();
                throw error;
            }
            throw error;
        }
    }
    isUnauthorizedError(error) {
        // Check for 403 status code
        if (error?.status === 403 || error?.response?.status === 403) {
            return true;
        }
        // Check for 401 (unauthorized) status code
        if (error?.status === 401 || error?.response?.status === 401) {
            return true;
        }
        // Check for unauthorized in error message
        if (error?.message && typeof error.message === 'string') {
            const message = error.message.toLowerCase();
            return message.includes('unauthorized') || message.includes('forbidden') || message.includes('403') || message.includes('401');
        }
        return false;
    }
    async handleUnauthorizedError() {
        if (!this.context) {
            console.error('Context not available for handling unauthorized error');
            return;
        }
        try {
            // Log out the user
            await this.logout(this.context);
            // Update view visibility to show login screen
            (0, util_1.updateViewVisibility)(false, this.mermaidWebviewProvider);
        }
        catch (logoutError) {
            console.error('Error during automatic logout:', logoutError);
        }
    }
    // Override API methods with error handling
    async getProjects() {
        return this.handleApiCall(() => super.getProjects());
    }
    async getDocuments(projectId) {
        return this.handleApiCall(() => super.getDocuments(projectId));
    }
    async getDocument(params) {
        return this.handleApiCall(() => super.getDocument(params));
    }
    async setDocument(params) {
        return this.handleApiCall(() => super.setDocument(params));
    }
    async createDocument(projectId) {
        return this.handleApiCall(() => super.createDocument(projectId));
    }
    async repairDiagram(request) {
        return this.handleApiCall(() => super.repairDiagram(request));
    }
    async regenerateDiagram(request) {
        return this.handleApiCall(() => super.regenerateDiagram(request));
    }
    async getAICredits() {
        return this.handleApiCall(() => super.getAICredits());
    }
    async deleteDocument(documentID) {
        return this.handleApiCall(() => super.deleteDocument(documentID));
    }
    async login() {
        await this.loginToMermaidChart();
    }
    async loginWithToken(token) {
        await this.loginWithManualToken(token);
    }
    async logout(context) {
        const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], { silent: true });
        if (session) {
            const authProvider = mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.getInstance(this, context);
            await authProvider.removeSession(session.id);
            vscode.window.showInformationMessage(`You have successfully signed out from ${session.account.id}.`);
        }
    }
    async registerListeners(context, mermaidWebviewProvider) {
        /**
         * Register the authentication provider with VS Code.
         * This will allow us to generate sessions when required
         */
        context.subscriptions.push(vscode.authentication.registerAuthenticationProvider(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.providerName, mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.getInstance(this, context)));
        /**
         * Sessions are changed when a user logs in or logs out.
         */
        context.subscriptions.push(vscode.authentication.onDidChangeSessions(async (e) => {
            if (e.provider.id === mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id) {
                const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], { silent: true });
                if (session) {
                    this.setAccessToken(session.accessToken);
                }
                else {
                    this.resetAccessToken();
                }
                if (!session) {
                    await context.globalState.update("isUserLoggedIn", false);
                    (0, util_1.updateViewVisibility)(false, mermaidWebviewProvider, this.mermaidChartProvider);
                }
                else {
                    await context.globalState.update("isUserLoggedIn", true);
                    (0, util_1.updateViewVisibility)(true, mermaidWebviewProvider, this.mermaidChartProvider);
                }
            }
        }));
        /**
         * When the configuration is changed, we need to refresh the base URL.
         */
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("mermaidChart.baseUrl")) {
                this.refreshBaseURL();
            }
        });
    }
    async setupAPI() {
        const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], {
            silent: true
        });
        if (session) {
            this.setAccessToken(session.accessToken);
        }
    }
    async loginToMermaidChart() {
        const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], {
            createIfNone: true,
        });
        this.setAccessToken(session.accessToken);
    }
    async loginWithManualToken(token) {
        if (!this.context) {
            throw new Error('Extension context not available');
        }
        try {
            // Set the manual token in the auth provider
            const authProvider = mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.getInstance(this, this.context);
            authProvider.setManualToken(token);
            // Use the same session creation flow as OAuth login
            // This will trigger the same session management events
            const session = await vscode.authentication.getSession(mermaidChartAuthenticationProvider_1.MermaidChartAuthenticationProvider.id, [], { createIfNone: true });
            // Set the access token (this should happen automatically via session events, but just to be sure)
            this.setAccessToken(session.accessToken);
        }
        catch (error) {
            this.resetAccessToken();
            const errorMessage = error.message || 'Invalid token';
            // Throw custom error with token validation message - authentication provider will show it
            throw new Error(`Token validation failed: ${errorMessage}`);
        }
    }
    async refreshBaseURL() {
        const baseURL = getBaseUrl();
        this.setBaseURL(baseURL);
    }
}
exports.MermaidChartVSCode = MermaidChartVSCode;
function getBaseUrl() {
    const config = vscode.workspace.getConfiguration("mermaidChart");
    const baseURL = config.get("baseUrl");
    if (baseURL) {
        return baseURL;
    }
    // If baseURL was not set, set it to default
    config.update("baseUrl", util_1.defaultBaseURL, true);
    return util_1.defaultBaseURL;
}
exports.getBaseUrl = getBaseUrl;
//# sourceMappingURL=mermaidChartVSCode.js.map