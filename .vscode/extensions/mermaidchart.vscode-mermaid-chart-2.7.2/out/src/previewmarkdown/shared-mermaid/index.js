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
exports.loadMermaidConfig = exports.registerMermaidAddons = exports.renderMermaidBlocksInElement = void 0;
const layout_elk_1 = __importDefault(require("@mermaid-chart/layout-elk"));
const mermaid_1 = __importDefault(require("@mermaid-chart/mermaid"));
function renderMermaidElement(mermaidContainer, writeOut) {
    const containerId = `mermaid-container-${crypto.randomUUID()}`;
    const diagramId = `mermaid-${crypto.randomUUID()}`;
    const source = mermaidContainer.textContent ?? '';
    mermaidContainer.id = containerId;
    mermaidContainer.innerHTML = '';
    return {
        containerId,
        p: (async () => {
            try {
                // Catch any parsing errors
                await mermaid_1.default.parse(source);
                //  Render the diagram
                const renderResult = await mermaid_1.default.render(diagramId, source);
                writeOut(mermaidContainer, renderResult.svg);
                renderResult.bindFunctions?.(mermaidContainer);
            }
            catch (error) {
                if (error instanceof Error) {
                    const errorMessageNode = document.createElement('pre');
                    errorMessageNode.className = 'mermaid-error';
                    errorMessageNode.innerText = error.message;
                    writeOut(mermaidContainer, errorMessageNode.outerHTML);
                }
                throw error;
            }
        })()
    };
}
async function renderMermaidBlocksInElement(root, writeOut) {
    // Delete existing mermaid outputs
    for (const el of Array.from(root.querySelectorAll('.mermaid > svg'))) {
        el.remove();
    }
    for (const svg of Array.from(root.querySelectorAll('svg'))) {
        if (svg.parentElement?.id.startsWith('dmermaid')) {
            svg.parentElement.remove();
        }
    }
    // We need to generate all the container ids sync, but then do the actual rendering async
    const renderPromises = [];
    for (const mermaidContainer of Array.from(root.querySelectorAll('.mermaid'))) {
        renderPromises.push(renderMermaidElement(mermaidContainer, writeOut).p);
    }
    for (const p of renderPromises) {
        await p;
    }
}
exports.renderMermaidBlocksInElement = renderMermaidBlocksInElement;
async function registerMermaidAddons() {
    mermaid_1.default.registerLayoutLoaders(layout_elk_1.default);
    mermaid_1.default.registerIconPacks([
        {
            name: 'fa',
            loader: () => Promise.resolve().then(() => __importStar(require('@iconify-json/fa6-regular'))).then((m) => m.icons),
        },
        {
            name: 'aws',
            loader: () => Promise.resolve().then(() => __importStar(require('@mermaid-chart/icons-aws'))).then((m) => m.icons),
        },
        {
            name: 'azure',
            loader: () => Promise.resolve().then(() => __importStar(require('@mermaid-chart/icons-azure'))).then((m) => m.icons),
        },
        {
            name: 'gcp',
            loader: () => Promise.resolve().then(() => __importStar(require('@mermaid-chart/icons-gcp'))).then((m) => m.icons),
        },
        {
            name: 'logos',
            loader: () => Promise.resolve().then(() => __importStar(require('@iconify-json/logos'))).then((module) => module.icons),
        },
        {
            name: 'mdi',
            loader: () => Promise.resolve().then(() => __importStar(require('@iconify-json/mdi'))).then((module) => module.icons),
        },
    ]);
}
exports.registerMermaidAddons = registerMermaidAddons;
function loadMermaidConfig() {
    const configSpan = document.getElementById('markdown-mermaid');
    const darkModeTheme = configSpan?.dataset.darkModeTheme;
    const lightModeTheme = configSpan?.dataset.lightModeTheme;
    return {
        startOnLoad: false,
        theme: (document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast')
            ? darkModeTheme ?? 'dark'
            : lightModeTheme ?? 'default'),
    };
}
exports.loadMermaidConfig = loadMermaidConfig;
//# sourceMappingURL=index.js.map