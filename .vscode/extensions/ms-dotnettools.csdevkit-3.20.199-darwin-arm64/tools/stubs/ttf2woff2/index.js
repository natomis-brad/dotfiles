// No-op stub for ttf2woff2.
// The extension only generates WOFF fonts (not WOFF2), so the native
// ttf2woff2 module is never used. This stub replaces the real package
// to avoid requiring node-gyp, Python, and C++ build tools.
//
// If WOFF2 support is ever needed, remove the "ttf2woff2" resolution
// override from the root package.json.

const { Transform } = require('stream');

module.exports = function ttf2woff2(opts) {
    return new Transform({
        transform(chunk, encoding, callback) {
            callback(new Error(
                'ttf2woff2 is stubbed out. The extension only generates WOFF fonts. ' +
                'If you need WOFF2, remove the ttf2woff2 resolution override from package.json.'
            ));
        }
    });
};
