"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MermaidChartAuthenticationProvider = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode_1 = require("vscode");
const uuid_1 = require("uuid");
const util_1 = require("./util");
const analytics_1 = __importDefault(require("./analytics"));
const utmSource = 'mermaid_chart_vs_code';
const utmCampaign = "VSCode extension";
class UriEventHandler extends vscode_1.EventEmitter {
    handleUri(uri) {
        this.fire(uri);
    }
}
class MermaidChartAuthenticationProvider {
    static getInstance(mcAPI, context) {
        if (!MermaidChartAuthenticationProvider.instance) {
            MermaidChartAuthenticationProvider.instance = new MermaidChartAuthenticationProvider(mcAPI, context);
        }
        return MermaidChartAuthenticationProvider.instance;
    }
    constructor(mcAPI, context) {
        this.mcAPI = mcAPI;
        this.context = context;
        this.sessionsKey = `${MermaidChartAuthenticationProvider.id}.sessions`;
        this._sessionChangeEmitter = new vscode_1.EventEmitter();
        this._codeExchangePromises = new Map();
        this._uriHandler = new UriEventHandler();
        this._manualToken = null; // For manual token storage
        /**
         * Handle the redirect to VS Code (after sign in from Auth0)
         * @param scopes
         * @returns
         */
        this.handleUri = (scopes) => async (uri, resolve, reject) => {
            await this.mcAPI.handleAuthorizationResponse(`?${uri.query}`);
            resolve("done");
        };
        this._disposable = vscode_1.Disposable.from(vscode_1.window.registerUriHandler(this._uriHandler));
        this.mcAPI.setRedirectURI(this.redirectUri);
    }
    get onDidChangeSessions() {
        return this._sessionChangeEmitter.event;
    }
    get redirectUri() {
        const publisher = this.context.extension.packageJSON.publisher;
        const name = this.context.extension.packageJSON.name;
        return `${vscode_1.env.uriScheme}://${publisher}.${name}`;
    }
    /**
     * Get the existing sessions
     * @param scopes
     * @returns
     */
    async getSessions(scopes, options) {
        const allSessions = await this.context.secrets.get(this.sessionsKey);
        if (allSessions) {
            return JSON.parse(allSessions);
        }
        return [];
    }
    /**
     * Create a new auth session
     * @param scopes
     * @returns
     */
    async createSession(scopes) {
        try {
            let token;
            let user;
            // Check if we have a manual token to use
            if (this._manualToken) {
                token = this._manualToken;
                this._manualToken = null; // Clear after use
                // Set token and validate by getting user info
                this.mcAPI.setAccessToken(token);
                user = await this.getUserInfo();
                if (!user || !user.emailAddress) {
                    throw new Error('Invalid manual token - unable to fetch user information');
                }
            }
            else {
                // Regular OAuth flow
                await this.login(scopes);
                token = await this.mcAPI.getAccessToken();
                if (!token) {
                    throw new Error(`MermaidChart login failure`);
                }
                user = await this.getUserInfo();
            }
            const session = {
                id: (0, uuid_1.v4)(),
                accessToken: token,
                account: {
                    label: user.fullName ? user.fullName : user.emailAddress,
                    id: user.emailAddress,
                },
                scopes: [],
            };
            await this.context.secrets.store(this.sessionsKey, JSON.stringify([session]));
            this._sessionChangeEmitter.fire({
                added: [session],
                removed: [],
                changed: [],
            });
            vscode_1.window.showInformationMessage(`Signed in with ${session.account.id}`);
            return session;
        }
        catch (e) {
            vscode_1.window.showErrorMessage(`Sign in failed: ${e}`);
            analytics_1.default.trackException(e);
            throw e;
        }
    }
    /**
     * Remove an existing session
     * @param sessionId
     */
    async removeSession(sessionId) {
        analytics_1.default.trackLogout();
        const allSessions = await this.context.secrets.get(this.sessionsKey);
        if (allSessions) {
            let sessions = JSON.parse(allSessions);
            const sessionIdx = sessions.findIndex((s) => s.id === sessionId);
            const session = sessions[sessionIdx];
            sessions.splice(sessionIdx, 1);
            this.mcAPI.resetAccessToken();
            await this.context.secrets.store(this.sessionsKey, JSON.stringify(sessions));
            if (session) {
                this._sessionChangeEmitter.fire({
                    added: [],
                    removed: [session],
                    changed: [],
                });
            }
        }
    }
    /**
     * Dispose the registered services
     */
    async dispose() {
        this._disposable.dispose();
    }
    /**
     * Log in to MermaidChart
     */
    async login(scopes = []) {
        return await vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: "Signing in to MermaidChart...",
            cancellable: true,
        }, async (_, token) => {
            const authData = await this.mcAPI.getAuthorizationData({
                scope: scopes,
                trackingParams: {
                    utm_source: utmSource,
                    utm_medium: vscode_1.env.uriScheme,
                    utm_campaign: utmCampaign,
                },
            });
            const uri = vscode_1.Uri.parse(authData.url);
            await vscode_1.env.openExternal(uri);
            const scope = authData.scope.join(" ");
            let codeExchangePromise = this._codeExchangePromises.get(scope);
            if (!codeExchangePromise) {
                codeExchangePromise = (0, util_1.promiseFromEvent)(this._uriHandler.event, this.handleUri(scopes));
                this._codeExchangePromises.set(scope, codeExchangePromise);
            }
            try {
                return await Promise.race([
                    codeExchangePromise.promise,
                    new Promise((_, reject) => setTimeout(() => reject("Cancelled"), 60000)),
                    (0, util_1.promiseFromEvent)(token.onCancellationRequested, (_, __, reject) => {
                        reject("User Cancelled");
                    }).promise,
                ]);
            }
            finally {
                codeExchangePromise?.cancel.fire();
                this._codeExchangePromises.delete(scope);
            }
        });
    }
    async getUserInfo() {
        return await this.mcAPI.getUser();
    }
    /**
     * Set manual token for next createSession call
     * This allows manual token to go through the same VS Code session management flow
     */
    setManualToken(token) {
        this._manualToken = token;
    }
}
exports.MermaidChartAuthenticationProvider = MermaidChartAuthenticationProvider;
MermaidChartAuthenticationProvider.id = "mermaidchart";
MermaidChartAuthenticationProvider.providerName = "MermaidChart";
MermaidChartAuthenticationProvider.instance = null;
//# sourceMappingURL=mermaidChartAuthenticationProvider.js.map