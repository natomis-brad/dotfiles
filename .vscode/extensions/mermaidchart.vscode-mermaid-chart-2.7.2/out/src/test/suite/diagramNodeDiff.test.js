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
const diagramNodeDiff_1 = require("../../commercial/prReview/diagramNodeDiff");
suite("diagramNodeDiff / extractNodeIds", () => {
    test("collects ids from a flowchart graph", () => {
        const ids = (0, diagramNodeDiff_1.extractNodeIds)(`flowchart LR
    A[Start] --> B[Middle]
    B --> C{Decision}
    C -->|yes| D
`);
        assert.deepStrictEqual([...ids].sort(), ["A", "B", "C", "D"]);
    });
    test("ignores reserved keywords and direction tokens", () => {
        const ids = (0, diagramNodeDiff_1.extractNodeIds)(`graph TD
    subgraph auth [Authentication]
        A --> B
    end
`);
        assert.ok(!ids.has("graph"));
        assert.ok(!ids.has("TD"));
        assert.ok(!ids.has("subgraph"));
        assert.ok(!ids.has("end"));
        assert.ok(ids.has("A"));
        assert.ok(ids.has("B"));
        assert.ok(ids.has("auth"));
    });
    test("does not pick up tokens inside labels", () => {
        const ids = (0, diagramNodeDiff_1.extractNodeIds)(`flowchart LR
    A["Click here B C D"] --> E
`);
        assert.ok(ids.has("A"));
        assert.ok(ids.has("E"));
        assert.ok(!ids.has("B"));
        assert.ok(!ids.has("C"));
        assert.ok(!ids.has("D"));
    });
    test("ignores comment lines", () => {
        const ids = (0, diagramNodeDiff_1.extractNodeIds)(`flowchart LR
    %% comment with FAKE id
    A --> B
`);
        assert.ok(!ids.has("FAKE"));
    });
    test("strips frontmatter before parsing", () => {
        const ids = (0, diagramNodeDiff_1.extractNodeIds)(`---
title: My diagram
id: 12345
---
flowchart LR
    A --> B
`);
        assert.ok(ids.has("A"));
        assert.ok(ids.has("B"));
        assert.ok(!ids.has("title"));
    });
});
suite("diagramNodeDiff / diffNodes", () => {
    test("identifies a single added node", () => {
        const before = `flowchart LR
    A --> B
`;
        const after = `flowchart LR
    A --> B --> C
`;
        const result = (0, diagramNodeDiff_1.diffNodes)(before, after);
        assert.deepStrictEqual(result.addedNodeIds, ["C"]);
        assert.deepStrictEqual(result.modifiedNodeIds, []);
        assert.deepStrictEqual(result.removedNodeIds, []);
    });
    test("identifies a single removed node", () => {
        const before = `flowchart LR
    A --> B --> C
`;
        const after = `flowchart LR
    A --> B
`;
        const result = (0, diagramNodeDiff_1.diffNodes)(before, after);
        assert.deepStrictEqual(result.addedNodeIds, []);
        assert.deepStrictEqual(result.modifiedNodeIds, []);
        assert.deepStrictEqual(result.removedNodeIds, ["C"]);
    });
    test("returns empty diffs for identical diagrams", () => {
        const src = `flowchart LR\n    A --> B\n`;
        const result = (0, diagramNodeDiff_1.diffNodes)(src, src);
        assert.deepStrictEqual(result.addedNodeIds, []);
        assert.deepStrictEqual(result.modifiedNodeIds, []);
        assert.deepStrictEqual(result.removedNodeIds, []);
    });
    test("detects label-only edits as modified", () => {
        const before = `flowchart LR
    A[Old label] --> B
`;
        const after = `flowchart LR
    A[New label] --> B
`;
        const result = (0, diagramNodeDiff_1.diffNodes)(before, after);
        assert.deepStrictEqual(result.addedNodeIds, []);
        assert.deepStrictEqual(result.modifiedNodeIds, ["A"]);
        assert.deepStrictEqual(result.removedNodeIds, []);
    });
    test("buildChangeList includes removed nodes for the overlay", () => {
        const before = `flowchart LR
    A --> B --> C
`;
        const after = `flowchart LR
    A --> B
`;
        const diff = (0, diagramNodeDiff_1.diffNodes)(before, after);
        const changes = (0, diagramNodeDiff_1.buildChangeList)(before, after, diff);
        assert.ok(changes.some((c) => c.kind === "removed" && c.nodeId === "C"));
    });
    test("formatDiffCountSummary omits zero buckets", () => {
        const summary = (0, diagramNodeDiff_1.formatDiffCountSummary)({
            added: 2,
            modified: 0,
            removed: 1,
            total: 3,
        });
        assert.strictEqual(summary, "2 added, 1 removed");
    });
});
//# sourceMappingURL=diagramNodeDiff.test.js.map