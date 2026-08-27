// Pre-submission check of build/ against the Chrome Web Store policies that
// previously got this extension removed (Red Titanium / Blue Argon).
// Run: node utils/cws-audit.js
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const js = String(fs.readFileSync(path.join(buildDir, 'contentScript.bundle.js')));
const lines = js.split('\n');

let failures = 0;

function assert(label, ok, detail) {
  if (!ok) failures++;
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + label.padEnd(46) + (detail || ''));
}

function count(re) {
  return (js.match(re) || []).length;
}

console.log('=== PACKAGE CONTENTS ===');
for (const f of fs.readdirSync(buildDir)) {
  console.log('  ' + f.padEnd(28) + fs.statSync(path.join(buildDir, f)).size + ' bytes');
}

console.log('\n=== Red Titanium: obfuscated code ===');
assert('no base64-encoded JavaScript', count(/data:(application|text)\/(x-)?(java|ecma)script[^"'`]*base64/gi) === 0);
assert('no atob() / base64 decoding', count(/\batob\s*\(/g) + count(/Buffer\.from\([^)]*base64/g) === 0);
assert('no eval()', count(/[^.\w$]eval\s*\(/g) === 0);
assert('no hex-mangled identifiers', count(/_0x[0-9a-f]{4,}/g) === 0);
assert('no packed/self-defending payloads', count(/eval\(function\(p,a,c,k,e/g) === 0);

// Chrome's second obfuscation example is character encoding used to hide text.
// Escapes for control or non-ASCII codepoints are legitimate, so decode and check.
const runs = js.match(/(?:\\x[0-9a-fA-F]{2}|\\u\{?[0-9a-fA-F]{4,6}\}?){2,}/g) || [];
const concealed = runs.filter(function (r) {
  const decoded = r.replace(/\\x([0-9a-fA-F]{2})|\\u\{([0-9a-fA-F]{4,6})\}|\\u([0-9a-fA-F]{4})/g,
    function (_, a, b, c) { return String.fromCodePoint(parseInt(a || b || c, 16)); });
  return /[a-zA-Z0-9]{2,}/.test(decoded);
});
assert('no character-encoded text', concealed.length === 0,
  runs.length + ' escape runs, all control/non-ASCII');

console.log('\n=== Blue Argon: remotely hosted code ===');
assert('publicPath resolves inside the package',
  count(/__webpack_require__\.p\s*=\s*['"`]https?:/g) === 0,
  (js.match(/__webpack_require__\.p\s*=\s*[^;\n]+/g) || []).join(' | '));
assert('no script src pointing at a remote URL',
  (js.match(/\.src\s*=\s*[^;\n]{0,80}/g) || []).filter(function (s) { return /https?:\/\//.test(s); }).length === 0);
assert('no remote CSS/font/image hosts', count(/url\(\s*['"]?https?:\/\//gi) === 0);
assert('no fetch/XHR to a hardcoded remote host',
  count(/(fetch|open)\s*\(\s*['"`]https?:\/\//g) === 0);

console.log('\n=== Readability (minification is permitted by policy) ===');
const longChars = lines.filter(function (l) { return l.length > 5000; })
  .reduce(function (a, l) { return a + l.length; }, 0);
console.log('  ' + lines.length + ' lines, ' +
  (100 * longChars / js.length).toFixed(1) + '% of bytes on lines >5000 chars (minified deps)');

console.log('\n=== Manifest ===');
const mf = JSON.parse(fs.readFileSync(path.join(buildDir, 'manifest.json')));
console.log('  version ' + mf.version + ', MV' + mf.manifest_version +
  ', permissions: ' + JSON.stringify(mf.permissions || []) +
  ', host_permissions: ' + JSON.stringify(mf.host_permissions || []));
const declared = mf.web_accessible_resources.reduce(function (a, w) { return a.concat(w.resources); }, []);
fs.readdirSync(buildDir)
  .filter(function (f) { return !/\.(json|js)$/.test(f); })
  .forEach(function (f) {
    const ok = declared.some(function (p) {
      return p === f || (p.startsWith('*') && f.endsWith(p.slice(1)));
    });
    assert('asset reachable from page: ' + f, ok);
  });

console.log('\n=== ' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED') + ' ===');
process.exit(failures === 0 ? 0 : 1);
