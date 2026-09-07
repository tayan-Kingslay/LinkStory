const fs=require('fs');
const path=require('path');
const root=process.cwd(), out=path.join(root,'dist');
function copy(src,dst){const st=fs.statSync(src);if(st.isDirectory()){if(['dist','.git','node_modules'].includes(path.basename(src)))return;fs.mkdirSync(dst,{recursive:true});for(const n of fs.readdirSync(src))copy(path.join(src,n),path.join(dst,n));}else{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}}
fs.rmSync(out,{recursive:true,force:true});
for(const n of fs.readdirSync(root)){if(['dist','.git','node_modules','build.js','package.json','vercel.json'].includes(n))continue;copy(path.join(root,n),path.join(out,n));}
function walk(d){for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(n.endsWith('.html')){let s=fs.readFileSync(p,'utf8');if(!s.includes('src="brand.js"'))s=s.replace(/<\/body>/i,'<script src="brand.js"></script></body>');fs.writeFileSync(p,s);}}}
walk(out);
