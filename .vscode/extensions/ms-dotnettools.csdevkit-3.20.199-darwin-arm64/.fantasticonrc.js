const { FontAssetType } = require('fantasticon')
const path = require('path')

// Use path.resolve + replace to ensure forward slashes on Windows.
// fantasticon v4 uses path.join(inputDir, '**/*.svg') internally, and glob v13
// treats backslashes as escape characters rather than path separators.
const inputDir = path.resolve(__dirname, 'media', 'icon-font').replace(/\\/g, '/')

module.exports = {
	name: 'csharp-dev-kit-icon-font',
	prefix: 'csharp-dev-kit-icon-font',
	inputDir,
	outputDir: './media',
	fontTypes: [FontAssetType.WOFF],
	assetTypes: [], // by default it will generate additional assets like ts mapping and html with icons demo
	normalize: true,
	codepoints: {
		'statusbar-no-entitlement': 65, // mapping between the svg file name and corresponding character in the font
		'statusbar-attention-needed': 66,
		'statusbar-entitlement': 67
	}
};