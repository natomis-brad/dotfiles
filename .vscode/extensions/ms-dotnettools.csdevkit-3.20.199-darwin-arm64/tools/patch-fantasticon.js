/**
 * Temporary Windows compatibility patch for Fantasticon.
 *
 * Context: https://github.com/tancredi/fantasticon/issues/470
 *
 * Fantasticon 4.x builds the SVG discovery pattern internally using `path.join`
 * and then passes that pattern into `glob`. On Windows, `path.join` emits
 * backslashes, but `glob` does not interpret backslashes as path separators —
 * they are treated as escape characters. This causes "No SVGs found" errors
 * even though the SVG files exist on disk.
 *
 * This script patches the installed Fantasticon package on Windows to normalize
 * the generated glob path to forward slashes. It is a no-op on macOS/Linux.
 *
 * Based on: https://github.com/microsoft/vscode-codicons/pull/457
 */
const fs = require('fs');
const path = require('path');

if (process.platform !== 'win32') {
	process.exit(0);
}

const targetFiles = [
	path.resolve(__dirname, '..', 'node_modules', 'fantasticon', 'dist', 'index.cjs'),
	path.resolve(__dirname, '..', 'node_modules', 'fantasticon', 'dist', 'cli', 'index.cjs')
];

const replacementSuffix = ".replace(/\\\\/g, '/')";
const targetSnippet = '`**/*.${ASSETS_EXTENSION}`';
let patchedFileCount = 0;
let alreadyPatchedCount = 0;

for (const targetFile of targetFiles) {
	if (!fs.existsSync(targetFile)) {
		continue;
	}

	const originalContent = fs.readFileSync(targetFile, 'utf8');
	const patchedContent = originalContent
		.split('\n')
		.map((line) => {
			if (!line.includes('const globPath = ') || !line.includes(targetSnippet) || line.includes(replacementSuffix)) {
				return line;
			}

			return line.replace(';', `${replacementSuffix};`);
		})
		.join('\n');

	if (patchedContent !== originalContent) {
		fs.writeFileSync(targetFile, patchedContent, 'utf8');
		patchedFileCount += 1;
		continue;
	}

	if (originalContent.includes(replacementSuffix)) {
		alreadyPatchedCount += 1;
	}
}

if (patchedFileCount === 0 && alreadyPatchedCount === 0) {
	console.error('patch-fantasticon: expected globPath pattern not found in installed Fantasticon files.');
	process.exit(1);
}

if (patchedFileCount > 0) {
	console.log(`patch-fantasticon: patched ${patchedFileCount} file(s) for Windows glob compatibility.`);
}
