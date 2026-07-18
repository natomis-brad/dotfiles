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
exports.showUpsellModal = void 0;
const vscode = __importStar(require("vscode"));
const analytics_1 = __importDefault(require("../../analytics"));
const FEATURE_COPY = {
    library: {
        title: "Engineering Docs library",
        body: "Add this diagram to your team's shared Mermaid Chart library so reviewers, designers, and PMs always see the latest version — without anyone having to clone the repo.",
        primaryAction: "signin",
    },
    comments: {
        title: "Comments thread",
        body: "Discuss diagram changes with your team — comments are scoped to the .mmd file and persist across review cycles, so you don't lose context between PRs.",
        primaryAction: "trial",
    },
    audit: {
        title: "Logged review history",
        body: "Every Accept / Reject / Edit on a Mermaid Sync PR is recorded with reviewer name and timestamp — required for audited compliance workflows in regulated orgs.",
        primaryAction: "trial",
    },
    aiEdit: {
        title: "AI-assisted edit",
        body: "When you click Edit on a bot's draft, get AI suggestions for fixes and refinements — trained on your team's diagram conventions.",
        primaryAction: "waitlist",
    },
    multiDiagram: {
        title: "Multi-diagram review",
        body: "When a PR touches more than one diagram, see them all in one place with bulk-accept, per-diagram comments, and a single audit trail.",
        primaryAction: "trial",
    },
};
const PRICING_URL = "https://www.mermaidchart.com/app/plans";
/**
 * Show the upsell modal for a paid feature. Buttons resolve from the
 * feature's `primaryAction`:
 *   - signin   → "Sign in" runs the existing `mermaidChart.login` command.
 *   - trial    → "Start trial" opens the pricing page in a browser.
 *   - waitlist → "Join waitlist" opens the pricing page in a browser.
 *
 * "Learn more" always opens the pricing page; "Not now" is a no-op.
 * The modal is non-blocking — VS Code resolves the promise once the
 * user picks a button or dismisses.
 */
async function showUpsellModal(featureId) {
    const copy = FEATURE_COPY[featureId];
    if (!copy) {
        return;
    }
    try {
        analytics_1.default.sendEvent(`VS Code PR Review Upsell ${copy.title}`, `VS_CODE_PLUGIN_PR_REVIEW_UPSELL_${featureId.toUpperCase()}`);
    }
    catch {
        // Best-effort; analytics failures shouldn't block the modal.
    }
    const primaryLabel = copy.primaryAction === "signin" ? "Sign in"
        : copy.primaryAction === "trial" ? "Start trial"
            : "Join waitlist";
    const choice = await vscode.window.showInformationMessage(`${copy.title} — ${copy.body}`, { modal: false }, primaryLabel, "Learn more", "Not now");
    if (choice === primaryLabel) {
        if (copy.primaryAction === "signin") {
            void vscode.commands.executeCommand("mermaidChart.login");
        }
        else {
            void vscode.env.openExternal(vscode.Uri.parse(PRICING_URL));
        }
    }
    else if (choice === "Learn more") {
        void vscode.env.openExternal(vscode.Uri.parse(PRICING_URL));
    }
}
exports.showUpsellModal = showUpsellModal;
//# sourceMappingURL=proFeatureUpsell.js.map