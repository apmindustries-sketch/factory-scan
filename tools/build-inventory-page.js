// Builds inventory.html (the APM Stores admin page on GitHub Pages) from gas-inventory/Index.html.
// The page is the same; only google.script.run is replaced by POSTs to the web app's doPost ({ admin, arg }),
// because phones signed in to several Google accounts cannot open script.google.com pages.
// Run after every change to Index.html:  node tools/build-inventory-page.js
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../gas-inventory/Index.html');
const OUT = path.resolve(__dirname, '../inventory.html');
const INV_API = 'https://script.google.com/macros/s/AKfycbxDeKxI1rxckSq8kMr1FQCbnpHVJleQUcBsQ0bx3CcHhKZ3zujJH9YmU_A3-dkAYsGx/exec';

const shim = `<meta name="robots" content="noindex">
<script>
// google.script.run stand-in: same chained calls, answered by the web app's doPost.
var google = { script: {} };
Object.defineProperty(google.script, 'run', { get: function() {
  var ok = function() {}, fail = function() {};
  var runner = {
    withSuccessHandler: function(f) { ok = f; return runner; },
    withFailureHandler: function(f) { fail = f; return runner; }
  };
  ${JSON.stringify(GS_NAMES())}.forEach(function(name) {
    runner[name] = function(arg) {
      fetch(${JSON.stringify(INV_API)}, { method: 'POST', body: JSON.stringify({ admin: name, arg: arg || {} }) })
        .then(function(r) { return r.json(); })
        .then(function(v) { ok(v); })
        .catch(function() { fail(new Error('Could not reach the server. Check the internet and try again.')); });
    };
  });
  return runner;
}});
</script>`;

function GS_NAMES() {
  const names = [...fs.readFileSync(SRC, 'utf8').matchAll(/gsr\.(gs\w+)\(/g)].map(m => m[1]);
  return [...new Set(names)];
}

let html = fs.readFileSync(SRC, 'utf8');
if (/<\?/.test(html)) throw new Error('Index.html has GAS template scriptlets; the GitHub copy cannot fill them in.');
const anchor = '<title>APM Inventory</title>';
if (!html.includes(anchor)) throw new Error('Could not find ' + anchor + ' in Index.html');
html = html.replace(anchor, anchor + '\n' + shim);
html = '<!-- Generated from gas-inventory/Index.html by tools/build-inventory-page.js. Do not edit here. -->\n' + html;
fs.writeFileSync(OUT, html);
console.log('Wrote ' + OUT + ' (' + GS_NAMES().length + ' server functions)');
