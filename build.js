const fs = require('fs');
const path = require('path');
const root = process.cwd();
const out = path.join(root, 'dist');

const ignoredDirectories = new Set([
  '.git', '.vercel', '.github', '.source-inspect',
  'node_modules', 'dist', 'supabase', 'coverage', 'tests'
]);
const ignoredFiles = new Set([
  'build.js', 'package.json', 'vercel.json'
]);

function shouldIgnore(source) {
  const relative = path.relative(root, source);
  const parts = relative.split(path.sep);
  const name = parts[parts.length - 1] || '';
  if (parts.some(part => ignoredDirectories.has(part))) return true;
  if (ignoredFiles.has(name)) return true;
  if (/^\.env(?:\.|$)/i.test(name)) return true;
  if (/\.(?:zip|sql|map|log|bak|old|tmp)$/i.test(name)) return true;
  return false;
}

function copy(source, destination) {
  if (shouldIgnore(source)) return;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      copy(path.join(source, name), path.join(destination, name));
    }
    return;
  }
  if (!stat.isFile()) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

fs.rmSync(out, { recursive: true, force: true });
for (const name of fs.readdirSync(root)) {
  const source = path.join(root, name);
  if (shouldIgnore(source)) continue;
  copy(source, path.join(out, name));
}

function walk(directory) {
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      walk(file);
      continue;
    }
    if (!name.endsWith('.html')) continue;
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/<link[^>]+href=["']fonts\.css(?:\?v=[^"']*)?["'][^>]*>/gi, '');
    html = html.replace(/<link[^>]+href=["']theme-fixes\.css(?:\?v=[^"']*)?["'][^>]*>/gi, '');
    html = html.replace(/<link[^>]+href=["']modern\.css(?:\?v=[^"']*)?["'][^>]*>/gi, '');
    html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="fonts.css?v=1"><link rel="stylesheet" href="theme-fixes.css?v=2"><link rel="stylesheet" href="modern.css?v=4"></head>');
    html = html.replace(/src="brand\.js(?:\?v=[^"]*)?"/g, 'src="brand.js?v=4"');
    if (!html.includes('src="brand.js?v=4"')) {
      html = html.replace(/<\/body>/i, '<script src="brand.js?v=4"></script></body>');
    }
    html = html.replace(/<script src="global-nav\.js(?:\?v=[^"']*)?"><\/script>/g, '');
    const injected = ['<script src="global-nav.js?v=20261123-4"></script>'];
    if (!html.includes('src="reader-behavior.js')) injected.push('<script src="reader-behavior.js?v=1"></script>');
    if (!html.includes('src="cleanup.js')) injected.push('<script src="cleanup.js?v=1"></script>');
    html = html.replace(/<\/body>/i, injected.join('') + '</body>');
    fs.writeFileSync(file, html);
  }
}
walk(out);
