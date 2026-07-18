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
const assert = __importStar(require("assert"));
const gitTrailerDetector_1 = require("../../commercial/prReview/gitTrailerDetector");
function makeCommit(overrides = {}) {
    return {
        hash: "abcdef1234567890abcdef1234567890abcdef12",
        message: "regen flow",
        parents: ["1234567890abcdef1234567890abcdef12345678"],
        authorDate: new Date("2026-04-01T10:00:00Z"),
        authorName: "Mermaid Sync Bot",
        authorEmail: "bot@mermaidchart.com",
        ...overrides,
    };
}
suite("GitTrailerDetector / parseBotEditInfo", () => {
    test("returns info when the configured trailer is present", () => {
        const commit = makeCommit({
            message: "Regenerate diagrams\n\nMermaid-Sync: regenerated\n",
        });
        const info = (0, gitTrailerDetector_1.parseBotEditInfo)(commit, "Mermaid-Sync: regenerated");
        assert.ok(info);
        assert.strictEqual(info?.commitSha, commit.hash);
        assert.strictEqual(info?.shortSha, "abcdef1");
        assert.strictEqual(info?.parentSha, commit.parents[0]);
        assert.strictEqual(info?.authorName, "Mermaid Sync Bot");
    });
    test("captures the optional Mermaid-Sync-Source trailer", () => {
        const commit = makeCommit({
            message: "Regen\n\nMermaid-Sync: regenerated\nMermaid-Sync-Source: pr-1234\n",
        });
        const info = (0, gitTrailerDetector_1.parseBotEditInfo)(commit, "Mermaid-Sync: regenerated");
        assert.strictEqual(info?.sourceRef, "pr-1234");
    });
    test("returns null when the trailer is absent", () => {
        const commit = makeCommit({ message: "Hand-authored change" });
        assert.strictEqual((0, gitTrailerDetector_1.parseBotEditInfo)(commit, "Mermaid-Sync: regenerated"), null);
    });
    test("returns null when only a similar-looking line appears mid-message (not anchored)", () => {
        const commit = makeCommit({
            message: "Refactor: see Mermaid-Sync: regenerated for context",
        });
        assert.strictEqual((0, gitTrailerDetector_1.parseBotEditInfo)(commit, "Mermaid-Sync: regenerated"), null);
    });
    test("matches case-insensitively on the value but anchors to a line start", () => {
        const commit = makeCommit({
            message: "header\n\nMermaid-Sync:   REGENERATED  \n",
        });
        const info = (0, gitTrailerDetector_1.parseBotEditInfo)(commit, "Mermaid-Sync: regenerated");
        assert.ok(info);
    });
    test("returns null for malformed trailer specs", () => {
        const commit = makeCommit({
            message: "header\n\nMermaid-Sync: regenerated\n",
        });
        assert.strictEqual((0, gitTrailerDetector_1.parseBotEditInfo)(commit, "no-colon-here"), null);
        assert.strictEqual((0, gitTrailerDetector_1.parseBotEditInfo)(commit, ""), null);
    });
    test("respects a custom trailer spec", () => {
        const commit = makeCommit({
            message: "header\n\nX-Sync-Bot: ran-it\n",
        });
        const info = (0, gitTrailerDetector_1.parseBotEditInfo)(commit, "X-Sync-Bot: ran-it");
        assert.ok(info);
    });
});
//# sourceMappingURL=botEditDetector.test.js.map