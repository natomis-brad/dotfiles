"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeLineDiff = void 0;
function computeLineDiff(oldText, newText) {
    const a = splitLines(oldText);
    const b = splitLines(newText);
    const lcs = buildLcsTable(a, b);
    const entries = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            entries.push({ op: "keep", oldLine: i, newLine: j, text: a[i - 1] });
            i--;
            j--;
        }
        else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
            entries.push({ op: "add", oldLine: null, newLine: j, text: b[j - 1] });
            j--;
        }
        else {
            entries.push({ op: "remove", oldLine: i, newLine: null, text: a[i - 1] });
            i--;
        }
    }
    entries.reverse();
    let addedCount = 0;
    let removedCount = 0;
    for (const e of entries) {
        if (e.op === "add") {
            addedCount++;
        }
        else if (e.op === "remove") {
            removedCount++;
        }
    }
    return { entries, addedCount, removedCount };
}
exports.computeLineDiff = computeLineDiff;
function splitLines(text) {
    if (text === "") {
        return [];
    }
    return text.split(/\r\n|\n/);
}
function buildLcsTable(a, b) {
    const m = a.length;
    const n = b.length;
    const t = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
        }
    }
    return t;
}
//# sourceMappingURL=lineDiff.js.map