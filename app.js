const $=s=>document.querySelector(s);
const SUPABASE_URL='https://qwhpikyxilzwazeneddw.supabase.co';
const SUPABASE_KEY='sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';
let db=null,mangas=[];
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__t);window.__t=setTimeout(()=>t.classList.remove('show'),2400)}
function card(m){const title=String(m.title||'Sem título').replace(/[&<>]/g,'');const author=String(m.profiles?.display_name||m.profiles?.username||'Criador').replace(/[&<>]/g,'');const genres=String(m.genres||'').replace(/[&<>]/g,'');return `<a class="manga-card" href="manga.html?id=${encodeURIComponent(m.id)}"><div class="cover">${m.cover_url?`<img src="${m.cover_url}" alt="Capa de ${title}" style="width:100%;height:100%;object-fit:cover">`:`<span>${title}</span>`}</div><h3>${title}</h3><p>${genres||author}</p></a>`}
function render(){const t=$('#trending'),n=$('#newManga');if(!t&&!n)return;if(!mangas.length){if(t)t.innerHTML='<div style="grid-column:1/-1;padding:28px;border:1px dashed #dbe5ef;border-radius:15px;text-align:center;color:#66788d"><b style="display:block;color:#102033;margin-bottom:6px">Ainda não há mangás publicados.</b>Quando um criador publicar, ele aparecerá aqui.</div>';if(n)n.innerHTML='';return}if(t)t.innerHTML=mangas.slice(0,5).map(card).join('');if(n)n.innerHTML=mangas.slice(0,5).map(card).join('')}
async function loadMangas(){try{if(!window.supabase)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);const {data,error}=await db.from('mangas').select('*,profiles:creator_id(display_name,username)').eq('status','published').order('created_at',{ascending:false});if(error)throw error;mangas=data||[];render()}catch(e){console.error(e);mangas=[];render()}}
function openSearch(){const d=$('#searchDialog');if(!d)return;d.showModal();$('#searchInput').value='';$('#searchResults').innerHTML='';setTimeout(()=>$('#searchInput').focus(),50)}
const searchButton=$('#openSearch');if(searchButton)searchButton.onclick=openSearch;
const searchInput=$('#searchInput');if(searchInput)searchInput.oninput=e=>{const q=e.target.value.trim().toLowerCase();const r=mangas.filter(m=>(m.title+' '+(m.profiles?.display_name||'')+' '+(m.genres||'')).toLowerCase().includes(q));$('#searchResults').innerHTML=q?(r.length?r.map(m=>`<a class="result" href="manga.html?id=${encodeURIComponent(m.id)}"><b>${m.title}</b><br><small>${m.profiles?.display_name||'Criador'} · ${m.genres||'Mangá'}</small></a>`).join(''):'<p class="detail-meta">Nenhum mangá encontrado.</p>'):''};
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;document.querySelectorAll('[data-install-app]').forEach(b=>b.hidden=false)});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;document.querySelectorAll('[data-install-app]').forEach(b=>{b.textContent='✓ App instalado';b.disabled=true})});
function installLinkStory(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();deferredInstallPrompt.userChoice.finally(()=>{deferredInstallPrompt=null});return}const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);if(isIOS)toast('No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');else if(location.protocol==='https:')toast('O navegador pode mostrar a opção de instalar o LinkStory no menu dele.');else toast('A instalação precisa ser feita pelo LinkStory online.')}
window.installLinkStory=installLinkStory;
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
const navScript=document.createElement('script');navScript.src='global-nav.js?v=3';document.head.appendChild(navScript);
loadMangas();
