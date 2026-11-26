const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = process.cwd();
const ignored = new Set([".git", "node_modules", "dist", ".vercel"]);
const htmlFiles = [];

function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) collect(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      htmlFiles.push(path.join(dir, entry.name));
    }
  }
}

collect(root);
if (!htmlFiles.length) throw new Error("No HTML pages found.");

let checked = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi);
  let index = 0;
  for (const match of scripts) {
    const source = match[1].trim();
    if (!source) continue;
    new vm.Script(source, { filename: path.relative(root, file) + "#inline-" + (++index) });
    checked++;
  }
}

if (!checked) throw new Error("No inline scripts were checked.");

const sharedScripts = [
  "global-nav.js",
  "reader-behavior.js",
  "api/site-assistant.js",
  "api/experience-ai.js",
  "api/publication-assistant.js"
];
let externalChecked = 0;
for (const relative of sharedScripts) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  new vm.Script(fs.readFileSync(file, "utf8"), { filename: relative });
  externalChecked++;
}
process.stdout.write("Validated " + checked + " inline script(s) across " + htmlFiles.length + " HTML pages and " + externalChecked + " shared JavaScript file(s).\\n");
