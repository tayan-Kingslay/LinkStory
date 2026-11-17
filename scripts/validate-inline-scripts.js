const fs = require("node:fs");
const vm = require("node:vm");
const pages = [
  "panel-editor.html",
  "reader-experience.html",
  "trailer.html",
  "studio.html",
  "manga.html"
];
let checked = 0;
for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi);
  let index = 0;
  for (const match of scripts) {
    const source = match[1].trim();
    if (!source) continue;
    new vm.Script(source, { filename: file + "#inline-" + (++index) });
    checked++;
  }
}
if (!checked) throw new Error("No inline scripts were checked.");
process.stdout.write("Validated " + checked + " inline script(s) across " + pages.length + " HTML pages.\\n");
