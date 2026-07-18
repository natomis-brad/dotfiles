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
const httpClient_1 = __importDefault(require("./httpClient"));
const vscode = __importStar(require("vscode"));
const packageJson = __importStar(require("../package.json"));
class Analytics {
    sendEvent(eventName, eventID, errorMessage, diagramType) {
        const analyticsID = vscode.env.machineId;
        const pluginID = packageJson.name === "vscode-mermaid-chart" ? "MERMAIDCHART_VS_CODE_PLUGIN" : "MERMAID_PREVIEW_VS_CODE_PLUGIN";
        const payload = {
            analyticsID,
            pluginID,
            eventName,
            eventID,
            errorMessage,
            diagramType
        };
        httpClient_1.default.post('/rest-api/plugins/pulse', payload).catch(error => {
            console.error('Failed to send analytics event:', error);
        });
    }
    trackException(error) {
        if (error instanceof Error) {
            this.sendEvent('VS Code Extension Exception', 'VS_CODE_PLUGIN_EXCEPTION', error.message);
        }
        else {
            this.sendEvent('VS Code Extension Exception', 'VS_CODE_PLUGIN_EXCEPTION', "Unknown error occurred");
        }
    }
    trackLogin() {
        this.sendEvent('VS Code User Logged In', 'VS_CODE_PLUGIN_LOGIN');
    }
    trackLogout() {
        this.sendEvent('VS Code User Logged Out', 'VS_CODE_PLUGIN_LOGOUT');
    }
    trackAIChatInvocation() {
        this.sendEvent('VS Code AI Chat Participant Invoked', 'VS_CODE_PLUGIN_AI_CHAT_INVOCATION');
    }
    trackAIGeneratedDiagram(diagramType) {
        this.sendEvent(`VS Code AI Chat Generated Diagram`, 'VS_CODE_PLUGIN_AI_CHAT_GENERATE_DIAGRAM', undefined, diagramType);
    }
    trackRegenerateCommandInvoked() {
        this.sendEvent('VS Code Regenerate Command Invoked', 'VS_CODE_PLUGIN_REGENERATE_DIAGRAM');
    }
    // Pre-commit sync
    trackPreCommitDiagramRegenerate() {
        this.sendEvent("VS Code Pre-Commit Diagram Regenerate", "VS_CODE_PLUGIN_PRE_COMMIT_DIAGRAM_REGENERATE");
    }
    // App review sync
    trackAppReviewTriggered() {
        this.sendEvent("VS Code Mermaid Sync App Review Triggered", "VS_CODE_PLUGIN_MERMAID_SYNC_APP_REVIEW_TRIGGERED");
    }
    // Generate diagram from code
    trackOpenCopilotChat() {
        this.sendEvent("VS Code Open Chat @mermaid-chart CodeLens", "VS_CODE_PLUGIN_OPEN_COPILOT_CHAT_CODELENS");
    }
    trackGenerateDiagramFromCode() {
        this.sendEvent("VS Code Generate Diagram From Code", "VS_CODE_PLUGIN_GENERATE_DIAGRAM_FROM_CODE");
    }
}
exports.default = new Analytics();
//# sourceMappingURL=analytics.js.map