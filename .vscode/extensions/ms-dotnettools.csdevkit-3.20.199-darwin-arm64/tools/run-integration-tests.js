// Runs integration tests, with an optional --skip-loc flag to skip the
// localization step (useful in CI where loc has already been built).
//
// Usage:
//   node tools/run-integration-tests.js [--skip-loc] [--suite perf|experimental] [-- ...args]
//
// Without --suite, runs the functional test suite by default.

const { execSync } = require('child_process')

const args = process.argv.slice(2)

const skipLoc = args.includes('--skip-loc')
const passthrough = []

let suite = 'functional'
for (let i = 0; i < args.length; i++) {
	if (args[i] === '--skip-loc') continue
	if (args[i] === '--suite' && i + 1 < args.length) {
		suite = args[++i]
		continue
	}
	if (args[i] === '--') {
		passthrough.push(...args.slice(i + 1))
		break
	}
	passthrough.push(args[i])
}

const suiteScripts = {
	functional: './out/test/integration/runTestFunctionalSuite.js',
	perf: './out/test/integration/runTestPerformanceSuite.js',
	experimental: './out/test/integration/runExperimentalTestSuite.js',
}

const script = suiteScripts[suite]
if (!script) {
	console.error(`Unknown suite: ${suite}. Expected one of: ${Object.keys(suiteScripts).join(', ')}`)
	process.exit(1)
}

function run(cmd) {
	console.log(`> ${cmd}`)
	execSync(cmd, { stdio: 'inherit' })
}

if (!skipLoc) {
	// Suppress verbose per-language "Message file not found" warnings during test runs.
	// These are expected when translation files haven't been produced yet.
	process.env.SUPPRESS_LOC_WARNINGS = '1'
	run('yarn run localize')
}

const extra = passthrough.length > 0 ? ' ' + passthrough.join(' ') : ''
run(`node ${script}${extra}`)
