#!/usr/bin/env node

const fs = require('fs')

/**
 * Merges prerelease-specific settings into package.json for prerelease builds.
 * The checked-in package.json contains the release defaults, and this script only
 * applies overrides for prerelease builds to enable preview functionality.
 *
 * Supported branches:
 * - refs/heads/release: Uses original package.json release defaults (no merge)
 * - PRs targeting refs/heads/release: Uses original package.json release defaults (no merge)
 * - All other branches: Uses settings.prerelease.json overrides
 *
 * Usage: node merge-settings.js <branch-name> [pr-target-branch]
 *
 * Examples:
 * - node merge-settings.js refs/heads/main
 * - node merge-settings.js refs/heads/feature/my-feature refs/heads/release
 */

function mergeSettings(branchName, prTargetBranch) {
	console.log(`Merging settings for branch: ${branchName}`)
	if (prTargetBranch) {
		console.log(`PR target branch: ${prTargetBranch}`)
	}

	// Read the original package.json
	const packageJsonPath = 'package.json'
	if (!fs.existsSync(packageJsonPath)) {
		console.error('package.json not found')
		process.exit(1)
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

	// Determine if this should be treated as a release build
	const isReleaseBuild = branchName === 'refs/heads/release' || prTargetBranch === 'refs/heads/release'

	// Only apply overrides for prerelease builds (everything except release branch or PRs into release)
	let settingsFile
	if (!isReleaseBuild) {
		settingsFile = 'settings.prerelease.json'
	} else {
		console.log(`Branch ${branchName}${prTargetBranch ? ` (PR target: ${prTargetBranch})` : ''} uses release defaults from package.json`)
		return // No merge needed - use package.json release defaults
	}

	console.log(`Using settings file: ${settingsFile}`)

	// Read the settings file
	if (!fs.existsSync(settingsFile)) {
		console.warn(`Settings file ${settingsFile} not found, skipping merge`)
		return
	}

	const branchSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))

	// Deep merge the settings
	mergeDeep(packageJson, branchSettings)

	// Write the merged package.json back
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t'), 'utf8')
	console.log(`Successfully merged settings from ${settingsFile} into package.json`)
}

/**
 * Deep merge utility function that handles arrays properly for VS Code package.json structure
 */
function mergeDeep(target, source) {
	for (const key in source) {
		// Delete a setting in pre-release
		if (source[key] === '__delete') {
			console.log(`Deleting property: ${key}`)
			delete target[key]
			continue
		}

		if (source[key] && typeof source[key] === 'object') {
			if (Array.isArray(source[key])) {
				// For arrays like configuration[], we need to merge elements by index
				if (!Array.isArray(target[key])) {
					target[key] = []
				}
				source[key].forEach((sourceItem, index) => {
					if (!target[key][index]) {
						target[key][index] = {}
					}
					// Only merge if sourceItem is a object, otherwise replace (e.g. tags[])
					if (sourceItem && typeof sourceItem === 'object' && !Array.isArray(sourceItem)) {
						if (!target[key][index] || typeof target[key][index] !== 'object' || Array.isArray(target[key][index])) {
							target[key][index] = {}
						}
						mergeDeep(target[key][index], sourceItem)
					} else {
						target[key][index] = sourceItem
					}
				})
			} else {
				// For objects, do regular deep merge
				if (!target[key]) {
					target[key] = {}
				}
				mergeDeep(target[key], source[key])
			}
		} else {
			target[key] = source[key]
		}
	}
}

// Get branch name and optional PR target branch from command line arguments
const branchName = process.argv[2]
const prTargetBranch = process.argv[3] // Optional: PR target branch

if (!branchName) {
	console.error('Usage: node merge-settings.js <branch-name> [pr-target-branch]')
	process.exit(1)
}

mergeSettings(branchName, prTargetBranch)
