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
exports.findDiagramContentStartPosition = exports.checkReferencedFiles = exports.extractMetadataFromCode = exports.addMetadataToFrontmatter = exports.normalizeMermaidText = exports.getFirstWordFromDiagram = exports.cleanupComments = exports.removeDirectives = exports.extractIdFromCode = exports.ensureIdField = exports.splitFrontMatter = exports.parseFrontMatterYAML = exports.anyCommentRegex = void 0;
const yaml_1 = require("yaml");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// const frontMatterRegex = /^-{3}\s*[\n\r](.*?[\n\r])-{3}\s*[\n\r]+/s;
const COMMENT_REGEX = /^\s*%%(?!{)[^\n]+\n?/gm;
const DIRECTIVE_REGEX = /%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi;
const FIRST_WORD_REGEX = /^\s*(\w+)/;
exports.anyCommentRegex = /\s*%%.*\n/gm;
function parseFrontMatterYAML(frontMatterYaml) {
    const document = (0, yaml_1.parseDocument)(frontMatterYaml);
    if (!(0, yaml_1.isMap)(document.contents)) {
        document.contents = new yaml_1.YAMLMap();
    }
    return document;
}
exports.parseFrontMatterYAML = parseFrontMatterYAML;
function splitFrontMatter(text) {
    // Normalize line endings and trim the text
    const normalizedText = text.replace(/\r\n?/g, '\n').trim();
    // More flexible regex that handles indentation before front matter
    const frontMatterRegex = /^\s*-{3}[\s\S]*?[\n\r]\s*-{3}/;
    const matches = normalizedText.match(frontMatterRegex);
    if (!matches) {
        return {
            diagramText: normalizedText,
            frontMatter: '',
        };
    }
    const frontMatter = matches[0]
        .replace(/^\s*---/, '') // Remove opening dashes with any preceding whitespace
        .replace(/\s*---$/, '') // Remove closing dashes with any trailing whitespace
        .trim();
    return {
        diagramText: normalizedText.slice(matches[0].length).trim(),
        frontMatter: frontMatter,
    };
}
exports.splitFrontMatter = splitFrontMatter;
/**
 * Ensures the diagram code has an ID field in the frontmatter.
 * @param code The original diagram code.
 * @param diagramId The ID to include in the frontmatter.
 * @returns The updated diagram code.
 */
function ensureIdField(code, diagramId) {
    const { diagramText, frontMatter } = splitFrontMatter(code);
    const document = parseFrontMatterYAML(frontMatter);
    document.contents.set('id', diagramId);
    return `---\n${document.toString()}---\n${diagramText}`;
}
exports.ensureIdField = ensureIdField;
/**
 * Extracts the 'id' field from the YAML frontmatter of the given code.
 * @param code The input code containing YAML frontmatter.
 * @returns The extracted ID, or null if not found.
 */
function extractIdFromCode(code) {
    const { frontMatter } = splitFrontMatter(code);
    if (!frontMatter)
        return undefined; // No frontmatter present
    const document = parseFrontMatterYAML(frontMatter);
    const id = document.contents.get('id');
    return typeof id === 'string' ? id : undefined; // Ensure 'id' is a string
}
exports.extractIdFromCode = extractIdFromCode;
const cleanupText = (code) => {
    return (code
        // parser problems on CRLF ignore all CR and leave LF;;
        .replace(/\r\n?/g, '\n')
        // clean up html tags so that all attributes use single quotes, parser throws error on double quotes
        .replace(/<(\w+)([^>]*)>/g, (match, tag, attributes) => '<' + tag + attributes.replace(/="([^"]*)"/g, "='$1'") + '>'));
};
/**
 * Removes Mermaid-specific directives enclosed in `%%{ ... }%%`.
 *
 * @param text - The diagram text.
 * @returns The text with directives removed.
 */
const removeDirectives = function (text) {
    return text.replace(DIRECTIVE_REGEX, '');
};
exports.removeDirectives = removeDirectives;
/**
 * Remove all lines starting with `%%` from the text that don't contain a `%%{`
 * @param text - The text to remove comments from
 * @returns cleaned text
 */
const cleanupComments = (text) => {
    return text.replace(COMMENT_REGEX, '').trimStart();
};
exports.cleanupComments = cleanupComments;
/**
 * Extracts the first word from a Mermaid diagram after cleaning directives and comments.
 *
 * @param text - The raw Mermaid diagram text.
 * @returns The first word in lowercase, or an empty string if not found.
 */
function getFirstWordFromDiagram(text) {
    const cleanedCode = cleanupText(text);
    const { diagramText } = splitFrontMatter(cleanedCode); // Extract diagram text
    const directiveResult = (0, exports.removeDirectives)(diagramText);
    const code = (0, exports.cleanupComments)(directiveResult);
    const match = code.match(FIRST_WORD_REGEX);
    if (match) {
        return match[1].toLowerCase(); // Return the first word in lowercase
    }
    return ''; // Return an empty string if no word is found
}
exports.getFirstWordFromDiagram = getFirstWordFromDiagram;
/**
 * Normalizes Mermaid diagram text by properly formatting the front matter and content.
 * @param code The original diagram code.
 * @returns The normalized diagram code.
 */
function normalizeMermaidText(code) {
    const { diagramText, frontMatter } = splitFrontMatter(code);
    if (!frontMatter) {
        return diagramText;
    }
    // Reconstruct the text with proper formatting
    return `---\n${frontMatter.trim()}\n---\n${diagramText}`;
}
exports.normalizeMermaidText = normalizeMermaidText;
/**
 * Adds metadata to the frontmatter of a Mermaid diagram
 * @param code The original diagram code
 * @param metadata The metadata to add (query, references, generationTime)
 * @returns The diagram code with updated frontmatter
 */
function addMetadataToFrontmatter(code, metadata) {
    const { diagramText, frontMatter } = splitFrontMatter(code);
    const document = parseFrontMatterYAML(frontMatter);
    // Add metadata fields if they exist
    if (metadata.query) {
        document.contents.set('query', sanitizeQuery(metadata.query)); // Cleaned query
    }
    if (metadata.references && metadata.references.length > 0) {
        document.contents.set('references', metadata.references);
    }
    if (metadata.generationTime) {
        document.contents.set('generationTime', metadata.generationTime.toISOString());
    }
    return `---\n${document.toString()}---\n${diagramText}`;
}
exports.addMetadataToFrontmatter = addMetadataToFrontmatter;
/**
 * Extracts metadata from the YAML frontmatter of a Mermaid diagram
 * @param code The diagram code with frontmatter
 * @returns Object containing metadata (references, query)
 */
function extractMetadataFromCode(code) {
    const { frontMatter } = splitFrontMatter(code);
    if (!frontMatter) {
        return { references: [] };
    }
    const document = parseFrontMatterYAML(frontMatter);
    const result = {
        references: []
    };
    // Extract references
    if (document.contents && document.contents.items) {
        document.contents.items.forEach((item) => {
            if (item.key && item.key.value === 'references' && item.value && item.value.items) {
                result.references = item.value.items.map((ref) => ref.value ? String(ref.value) : String(ref));
            }
            else if (item.key && item.key.value === 'generationTime' && item.value) {
                try {
                    result.generationTime = new Date(String(item.value));
                }
                catch (error) {
                    console.error('Error parsing generation time:', error);
                }
            }
            else if (item.key && item.key.value === 'query' && item.value) {
                result.query = String(item.value);
            }
        });
    }
    return result;
}
exports.extractMetadataFromCode = extractMetadataFromCode;
function sanitizeQuery(query) {
    return query
        .split("\n")
        .filter(line => !line.includes("^") && !line.trim().startsWith("---")) // Remove lines with ^ and ---
        .join("\n");
}
function checkReferencedFiles(metadata, workspacePath = '') {
    const changedReferences = [];
    // If no references, return empty array
    if (!metadata.references || !Array.isArray(metadata.references) || metadata.references.length === 0) {
        return changedReferences;
    }
    // Get generation time from metadata
    let generationTime = 0;
    if (metadata.generationTime) {
        generationTime = new Date(metadata.generationTime).getTime();
    }
    else {
        console.log('No generation time available in metadata');
    }
    for (const reference of metadata.references) {
        // Extract file path from reference (assuming format "File: /path/to/file")
        const match = reference.match(/File: (.*?)(\s|$|\()/);
        if (!match)
            continue;
        let filePath = match[1].trim();
        // Early return if reference only contains a filename without a path
        if (!filePath.includes('/') && !filePath.includes('\\')) {
            console.log(`Skipping reference without path: ${filePath}`);
            return [];
        }
        // Windows absolute path (e.g. C:\proj\src\auth.ts) — use as-is.
        // On POSIX, path.isAbsolute('/src/auth.ts') is true but that path is
        // workspace-relative by convention, so we check for a drive letter explicitly.
        if (/^[a-zA-Z]:[\\/]/.test(filePath)) {
            filePath = path.normalize(filePath);
        }
        else if (workspacePath) {
            // Strip any leading slashes/backslashes (workspace-relative convention).
            const relative = filePath.replace(/^[/\\]+/, '');
            filePath = path.normalize(path.join(workspacePath, relative));
        }
        if (!fs.existsSync(filePath)) {
            changedReferences.push(`${filePath} (deleted)`);
            continue;
        }
        // Get last modification time of the reference file
        const stats = fs.statSync(filePath);
        const lastModified = stats.mtimeMs;
        // If reference file was modified after generation time
        if (generationTime > 0 && lastModified > generationTime) {
            changedReferences.push(filePath);
        }
    }
    return changedReferences;
}
exports.checkReferencedFiles = checkReferencedFiles;
/**
 * Finds the position where diagram content starts (after frontmatter if any)
 * @param text The complete document text
 * @returns The index where actual diagram content begins
 */
function findDiagramContentStartPosition(text) {
    const { diagramText } = splitFrontMatter(text);
    // Find the first non-whitespace character in diagram text
    const firstNonWhitespaceMatch = diagramText.match(/\S/);
    if (firstNonWhitespaceMatch) {
        // Get the offset of the first non-whitespace character
        const firstContentCharOffset = diagramText.indexOf(firstNonWhitespaceMatch[0]);
        // Find where diagramText begins in the original text
        const diagramTextOffset = text.indexOf(diagramText);
        // Return the position of the first content character
        return diagramTextOffset + firstContentCharOffset;
    }
    // Return 0 if no content found
    return 0;
}
exports.findDiagramContentStartPosition = findDiagramContentStartPosition;
// /**
//  * Extract theme, look, and layout settings from the frontmatter of a diagram
//  * @param code The Mermaid diagram code with frontmatter
//  * @returns Object containing theme, look, and layout if found
//  */
// export function extractConfigFromFrontmatter(code: string): {
//   theme?: string;
//   look?: string;
//   layout?: string;
// } {
//   const { frontMatter } = splitFrontMatter(code);
//   if (!frontMatter) {
//     return {}; // No frontmatter present
//   }
//   const document = parseFrontMatterYAML(frontMatter);
//   const result: {
//     theme?: string;
//     look?: string;
//     layout?: string;
//   } = {};
//   // Look for config block which might contain these properties
//   const config = document.contents.get('config');
//   console.log("config", config);
//   // Check if config exists and has the expected structure
//   if (config && typeof config === 'object' && config !== null) {
//     // Use type assertion to tell TypeScript this is a specific type
//     const configObj = config as any;
//     if (configObj.items && Array.isArray(configObj.items)) {
//       // Iterate through the items in the config object
//       for (const item of configObj.items) {
//         if (item && typeof item === 'object' && 'key' in item && 'value' in item) {
//           const key = item.key.value;
//           const value = item.value.value;
//           if (key === 'theme' && typeof value === 'string' && !result.theme) {
//             result.theme = value;
//           } else if (key === 'look' && typeof value === 'string' && !result.look) {
//             result.look = value;
//           } else if (key === 'layout' && typeof value === 'string' && !result.layout) {
//             result.layout = value;
//           }
//         }
//       }
//     }
//   }
//   return result;
// }
//# sourceMappingURL=frontmatter.js.map