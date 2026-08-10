/**
 * Builds the NativeAOT Node.js addon for local development.
 * Publishes the project and renames the output from .dll to .node
 * so that require() loads it as a native Node.js addon.
 *
 * Called automatically via the "build-native" npm script before webpack.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

if (os.platform() !== 'win32') {
    console.log('build-native: skipping (native addon is Windows-only)');
    process.exit(0);
}

const rid = process.arch === 'arm64' ? 'win-arm64' : 'win-x64';
const archDir = process.arch === 'arm64' ? 'win32-arm64' : 'win32-x64';
const outDir = path.join(__dirname, '..', 'dist', 'native', archDir);
const projectDir = path.join(__dirname, '..', 'src', 'native', 'NodeAddon');
const nodeFile = path.join(outDir, 'NodeAddon.node');

// Check if rebuild is needed by comparing source timestamps to output
if (fs.existsSync(nodeFile)) {
    const outputTime = fs.statSync(nodeFile).mtimeMs;
    const sourceDirs = [projectDir, path.join(__dirname, '..', 'src', 'native', 'shared')];
    let newest = 0;
    for (const dir of sourceDirs) {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
            if (f.endsWith('.cs') || f.endsWith('.csproj') || f.endsWith('.props')) {
                try { newest = Math.max(newest, fs.statSync(path.join(dir, f)).mtimeMs); } catch {}
            }
        }
    }
    if (newest < outputTime) {
        console.log('build-native: NodeAddon is up to date');
        process.exit(0);
    }
}

console.log(`build-native: publishing NodeAddon (${rid})...`);
execSync(`dotnet publish "${projectDir}" -c Release -r ${rid} -o "${outDir}" --nologo`, { stdio: 'inherit' });

// Rename .dll to .node
const dll = path.join(outDir, 'NodeAddon.dll');
if (fs.existsSync(dll)) {
    if (fs.existsSync(nodeFile)) fs.unlinkSync(nodeFile);
    fs.renameSync(dll, nodeFile);
}

console.log(`build-native: done → ${outDir}`);
