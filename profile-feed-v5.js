/* LinkStory UI V8 — FY + Perfil + funções sociais
   Interface inspirada no fluxo visual de redes sociais modernas,
   sem copiar código proprietário de terceiros.
*/
(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SUPABASE_URL='https://qwhpikyxilzwazeneddw.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const toast=m=>typeof window.toast==='function'?window.toast(m):console.log(m);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

const css=`
:root{--ls-bg:#070b13;--ls-panel:#0d121c;--ls-panel2:#111827;--ls-line:rgba(255,255,255,.12);--ls-soft:#aeb8c9;--ls-text:#f6f8fb;--ls-blue:#a9c8ff;--ls-glow:rgba(123,166,255,.22)}
html,body{background:var(--ls-bg)!important;color:var(--ls-text)}
body{background-image:radial-gradient(rgba(180,205,255,.12) .65px,transparent .65px),linear-gradient(135deg,#070b13 0%,#0a1020 45%,#111020 100%)!important;background-size:8px 8px,100% 100%!important}
.topbar{height:68px!important;padding:8px 16px!important;background:linear-gradient(180deg,rgba(8,12,22,.97),rgba(8,12,22,.80))!important;border-bottom:1px solid var(--ls-line)!important;backdrop-filter:blur(20px)!important}
.brand-mark{width:48px!important;height:48px!important;border-radius:15px!important;background:linear-gradient(145deg,#17263d,#080b12)!important;border:1px solid rgba(180,205,255,.42)!important;box-shadow:0 8px 24px rgba(0,0,0,.35)!important;position:relative}
.brand-mascot{display:grid!important;width:100%!important;height:100%!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:15px!important}
.brand-mascot svg{display:none!important}
.brand-mascot:after{content:'LS';font-weight:950;font-size:20px;letter-spacing:-2px;color:#fff;text-shadow:0 2px 8px #000}
.topbar-actions{align-items:center!important;gap:9px!important}
.ls-top-profile{width:42px;height:42px;border-radius:50%;padding:0;overflow:hidden;border:1px solid rgba(210,225,255,.55);background:#151b28;display:grid;place-items:center;font-weight:900;color:#fff}
.ls-top-profile img{width:100%;height:100%;object-fit:cover}
.icon-btn{width:42px!important;height:42px!important;border-radius:14px!important;background:rgba(17,24,39,.82)!important;border:1px solid var(--ls-line)!important;color:#dce6f7!important}
#app{max-width:760px!important;padding-bottom:96px!important}

/* FY */
#feed{background:transparent!important;position:relative!important;overflow:visible!important}
#feed .page-title,#feed .story-strip{display:none!important}
#feed .tabs{position:sticky!important;top:68px!important;height:62px!important;z-index:20!important;padding:8px 16px!important;border-bottom:1px solid var(--ls-line)!important;background:rgba(8,12,22,.84)!important;backdrop-filter:blur(20px)!important;display:flex!important;align-items:center!important;gap:8px!important}
#feed .tabs:before{content:'FY';font-size:25px;font-weight:950;letter-spacing:-1.5px;color:#fff;margin-right:auto}
#feed .tabs .tab{flex:0 0 auto!important;min-width:102px!important;height:38px!important;padding:0 15px!important;border:1px solid rgba(255,255,255,.13)!important;border-radius:999px!important;background:rgba(255,255,255,.035)!important;color:#7e8ba0!important;font-size:12px!important;font-weight:900!important}
#feed .tabs .tab.active{border-color:rgba(205,222,255,.55)!important;background:linear-gradient(180deg,#dce8ff,#a9c5ed)!important;color:#101725!important;box-shadow:0 5px 20px var(--ls-glow)!important}
#feed .quick-post{position:relative!important;top:auto!important;margin:12px 16px!important;width:calc(100% - 32px)!important;padding:13px 16px!important;border:1px solid rgba(200,220,255,.18)!important;border-radius:18px!important;background:linear-gradient(120deg,rgba(21,30,46,.94),rgba(12,17,28,.94))!important;color:#aab5c6!important;box-shadow:0 12px 35px rgba(0,0,0,.22)!important;backdrop-filter:blur(16px)!important}
#feed .quick-post:before{content:'+';display:inline-grid;place-items:center;width:32px;height:32px;margin-right:10px;border:1px solid rgba(210,225,255,.35);border-radius:50%;color:#eef5ff;font-size:20px;vertical-align:middle;background:#182337}
#feedList{padding:4px 0 24px!important}
#feedList .post{margin:10px 12px 15px!important;padding:15px!important;border:1px solid rgba(195,215,255,.14)!important;border-radius:20px!important;background:linear-gradient(145deg,rgba(17,24,38,.97),rgba(8,12,20,.97))!important;box-shadow:0 15px 40px rgba(0,0,0,.26)!important}
#feedList .post-user{gap:11px!important}
#feedList .post-user b{font-size:14px!important;color:#f6f8fb!important}
#feedList .post-user small{font-size:10px!important;color:#7f8ca1!important}
#feedList .avatar{width:43px!important;height:43px!important;border-color:rgba(205,222,255,.32)!important;background:#182337!important}
#feedList .more{border:0!important;background:transparent!important;color:#8e9bb0!important;font-size:24px!important;padding:3px 7px!important}
#feedList .post>p{font-size:14px!important;line-height:1.52!important;color:#e4e9f2!important;margin:12px 2px 13px!important}
#feedList .post-media,#feedList .video-wrap{border-radius:16px!important;border:1px solid rgba(200,220,255,.12)!important;overflow:hidden!important}
#feedList .post-media{max-height:650px!important;object-fit:cover!important}
#feedList .video-wrap video{max-height:720px!important}
#feedList .actions{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:2px!important;margin-top:11px!important;padding-top:9px!important;border-top:1px solid rgba(255,255,255,.08)!important}
#feedList .actions button{border:0!important;background:transparent!important;color:#8794a8!important;border-radius:12px!important;padding:9px 5px!important;font-size:12px!important;transition:.16s ease!important}
#feedList .actions button:hover{background:rgba(255,255,255,.055)!important;color:#f2f6ff!important}
#feedList .actions .liked{color:#ff7b9f!important}
#feedList .actions .danger{margin-left:0!important}
.feed-v8-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border:1px solid rgba(180,205,255,.14);border-radius:999px;color:#7e8ca2;font-size:9px;margin-top:5px}

/* Perfil */
#profile{background:transparent!important}
.profile-topline{height:62px!important;top:68px!important;background:rgba(8,12,22,.84)!important;border-bottom:1px solid var(--ls-line)!important;backdrop-filter:blur(20px)!important}
.profile-topline strong{font-size:16px!important;color:#f7f9fd!important}
.profile-icon,.profile-plus{color:#d7e2f4!important}
.instagram-head{padding:25px 18px 13px!important;gap:17px!important;align-items:flex-start!important}
.profile-avatar{width:94px!important;height:94px!important;border:2px solid rgba(205,222,255,.52)!important;background:#111827!important;box-shadow:0 8px 25px rgba(0,0,0,.25)!important}
.profile-name-row h1{font-size:22px!important}
.profile-main .profile-bio{color:#b7c0cf!important;font-size:12px!important}
.profile-role-badge{border-color:rgba(180,205,255,.25)!important;color:#b9c8df!important;background:rgba(120,160,220,.08)!important}
.stats{border-top:1px solid var(--ls-line)!important;border-bottom:1px solid var(--ls-line)!important;background:rgba(10,15,24,.55)!important}
.stats div{padding:13px 5px!important;cursor:pointer!important;transition:.15s ease}
.stats div:hover{background:rgba(255,255,255,.035)}
.stats b{font-size:17px!important}
.stats span{font-size:10px!important;color:#8490a3!important}
.profile-actions{padding:14px 18px!important}
.profile-actions .outline{background:linear-gradient(145deg,#111b2b,#0b111c)!important;border-color:rgba(190,215,255,.22)!important}
.profile-tabs{background:rgba(8,12,20,.62)!important;border-color:var(--ls-line)!important}
.profile-tab{color:#68758a!important;padding:14px!important}
.profile-tab.active{color:#edf4ff!important;border-bottom-color:#d9e8ff!important}
.profile-grid{gap:3px!important}
.profile-grid-item{background:#0c111b!important}
.profile-grid-item img,.profile-grid-item video{transition:transform .18s ease,filter .18s ease}
.profile-grid-item:hover img,.profile-grid-item:hover video{transform:scale(1.025);filter:brightness(1.06)}
.profile-remove-btn{background:rgba(5,8,13,.88)!important;border-color:rgba(210,225,255,.35)!important}
.avatar-remove-btn{border-color:rgba(190,215,255,.2)!important;background:#0d1522!important;color:#b7c4d8!important}

/* Sem stories no produto final */
#storyStrip,#profileStories,#profileStoryBtn,#storyModal,#storyViewerModal{display:none!important}

/* Modal de publicação: visual de app moderno */
.ls-v8-modal{position:fixed;inset:0;z-index:9990;display:grid;place-items:end center;padding:12px;background:rgba(1,4,9,.68);backdrop-filter:blur(14px)}
.ls-v8-modal.hidden{display:none}
.ls-v8-box{position:relative;width:min(680px,100%);max-height:92vh;overflow:auto;border:1px solid rgba(200,220,255,.18);border-radius:24px;background:linear-gradient(145deg,#111a29,#080d16);box-shadow:0 30px 90px #000;padding:20px}
.ls-v8-box h2{margin:5px 0 8px;font-size:25px}
.ls-v8-close{position:absolute;right:14px;top:12px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(200,220,255,.2);background:#0a111d;color:#fff;font-size:23px}
.ls-follow-list{display:grid;gap:8px;margin-top:14px}
.ls-follow-item{display:flex;align-items:center;gap:11px;padding:10px;border:1px solid rgba(190,215,255,.12);border-radius:14px;background:rgba(255,255,255,.025)}
.ls-follow-item .avatar{width:42px;height:42px}
.ls-follow-item .meta{min-width:0;flex:1}
.ls-follow-item b{display:block;font-size:13px}
.ls-follow-item small{display:block;color:#7f8ca0;font-size:10px;margin-top:2px}
.ls-follow-item button{border:1px solid rgba(190,215,255,.2);background:#101a29;color:#dbe8fa;border-radius:10px;padding:7px 10px;font-size:10px;font-weight:900}
.ls-follow-empty{padding:30px 15px;text-align:center;color:#8591a4;line-height:1.5}
@media(max-width:460px){#feed .tabs{top:68px!important;padding:8px 12px!important}#feed .tabs .tab{min-width:88px!important;padding:0 11px!important}.ls-v8-modal{padding:0}.ls-v8-box{max-height:94vh;border-radius:22px 22px 0 0}.profile-avatar{width:86px!important;height:86px!important}}
`;
const style=document.createElement('style');style.id='linkstory-v8-style';style.textContent=css;document.head.appendChild(style);

function getUser(){return client?.auth.getUser().then(r=>r.data.user).catch(()=>null)}
function addTopProfile(){
 const actions=$('.topbar-actions');if(!actions||$('#lsTopProfile'))return;
 const b=document.createElement('button');b.id='lsTopProfile';b.className='ls-top-profile';b.type='button';b.setAttribute('aria-label','Abrir perfil');
 b.onclick=()=>typeof window.nav==='function'&&window.nav('profile');actions.insertBefore(b,actions.firstChild);
 refreshTopProfile();
}
async function refreshTopProfile(){const b=$('#lsTopProfile');if(!b)return;const u=await getUser();if(!u){b.innerHTML='○';return}let p=null;try{p=(await client.from('profiles').select('display_name,avatar_url').eq('id',u.id).maybeSingle()).data}catch{};b.innerHTML=p?.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:esc((p?.display_name||'U').slice(0,1).toUpperCase())}

function hideStories(){['#storyStrip','#profileStories','#profileStoryBtn','#storyModal','#storyViewerModal'].forEach(s=>{const el=$(s);if(el)el.style.display='none'});}

function openListModal(title,rows){
 let m=$('#lsFollowModal');if(!m){m=document.createElement('div');m.id='lsFollowModal';m.className='ls-v8-modal hidden';m.innerHTML='<div class="ls-v8-box"><button class="ls-v8-close" type="button">×</button><span class="eyebrow">SUA REDE</span><h2 id="lsFollowTitle"></h2><div id="lsFollowList" class="ls-follow-list"></div></div>';document.body.appendChild(m);m.querySelector('.ls-v8-close').onclick=()=>m.classList.add('hidden');m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')})}
 $('#lsFollowTitle').textContent=title;const box=$('#lsFollowList');
 if(!rows.length){box.innerHTML='<div class="ls-follow-empty">Ainda não há ninguém aqui.<br>Quando sua rede crescer, ela vai aparecer nesta tela.</div>'}else{box.innerHTML=rows.map(r=>`<div class="ls-follow-item"><div class="avatar">${r.avatar_url?`<img class="avatar-img" src="${esc(r.avatar_url)}" alt="">`:esc((r.display_name||r.username||'?').slice(0,2).toUpperCase())}</div><div class="meta"><b>${esc(r.display_name||r.username||'Usuário')}</b><small>@${esc(r.username||'usuario')}</small></div></div>`).join('')}
 m.classList.remove('hidden');
}
async function openNetwork(kind){
 const u=await getUser();if(!u)return toast('Entre na sua conta para ver sua rede.');
 try{
  const key=kind==='followers'?'follower_id':'following_id';
  const r=await client.from('follows').select('follower_id,following_id').eq(kind==='followers'?'following_id':'follower_id',u.id);
  if(r.error)throw r.error;
  const ids=(r.data||[]).map(x=>kind==='followers'?x.follower_id:x.following_id).filter(Boolean);
  let rows=[];if(ids.length){const p=await client.from('profiles').select('id,display_name,username,avatar_url').in('id',ids);if(p.error)throw p.error;rows=p.data||[]}
  openListModal(kind==='followers'?'Seguidores':'Seguindo',rows);
 }catch(e){toast('Não foi possível carregar sua rede: '+(e.message||'erro'))}
}
function wireNetworkButtons(){
 const stats=$$('.stats div');if(stats.length>=3){stats[1].onclick=()=>openNetwork('followers');stats[2].onclick=()=>openNetwork('following');stats[0].onclick=()=>{};}
}

async function removeAvatar(e){e?.stopPropagation();const u=await getUser();if(!u)return toast('Entre na sua conta para remover a foto.');if(!confirm('Remover sua foto de perfil?'))return;const r=await client.from('profiles').update({avatar_url:null}).eq('id',u.id);if(r.error)return toast('Não foi possível remover a foto.');if(typeof window.loadProfile==='function')await window.loadProfile();if(typeof window.renderProfile==='function')await window.renderProfile();refreshTopProfile();toast('Foto de perfil removida.')}
function ensureAvatarRemove(){const av=$('#profileAvatar');if(!av||!av.parentElement||av.parentElement.querySelector('.avatar-remove-btn'))return;const b=document.createElement('button');b.type='button';b.className='avatar-remove-btn';b.textContent='Remover foto';b.onclick=removeAvatar;av.parentElement.appendChild(b)}

async function removePost(e){e?.preventDefault();e?.stopPropagation();const item=e?.currentTarget?.closest('.profile-grid-item');const id=item?.dataset.profilePost||item?.dataset.gridPost||item?.dataset.postId||item?.dataset.id;if(!id)return;const u=await getUser();if(!u)return toast('Entre na sua conta para remover a publicação.');if(!confirm('Remover esta publicação?'))return;const r=await client.from('posts').delete().eq('id',id).eq('author_id',u.id);if(r.error)return toast('Não foi possível remover: '+r.error.message);if(typeof window.renderProfile==='function')await window.renderProfile();toast('Publicação removida.')}
function ensurePostRemove(){
 $$('#profileGrid .profile-grid-item').forEach(item=>{if(item.querySelector('.profile-remove-btn'))return;const id=item.dataset.profilePost||item.dataset.gridPost||item.dataset.postId||item.dataset.id;if(!id)return;item.dataset.profilePost=id;const b=document.createElement('button');b.type='button';b.className='profile-remove-btn';b.textContent='×';b.title='Remover publicação';b.onclick=removePost;item.appendChild(b)})
}

let viewer=null;
function closeViewer(){if(viewer)viewer.classList.add('hidden');document.body.style.overflow=''}
async function openOwnPost(item){
 const id=item?.dataset.profilePost||item?.dataset.gridPost||item?.dataset.postId||item?.dataset.id;if(!id||!client)return;
 if(!viewer){viewer=document.createElement('div');viewer.className='ls-post-viewer ls-v8-modal hidden';viewer.innerHTML='<div class="ls-post-viewer-blur"></div><div class="ls-v8-box"><button class="ls-v8-close" type="button">×</button><div id="lsOwnPostContent"></div></div>';document.body.appendChild(viewer);viewer.querySelector('.ls-v8-close').onclick=closeViewer;viewer.addEventListener('click',e=>{if(e.target===viewer)closeViewer()})}
 const box=$('#lsOwnPostContent');box.innerHTML='<div class="ls-follow-empty">Abrindo publicação…</div>';viewer.classList.remove('hidden');document.body.style.overflow='hidden';
 try{
  const r=await client.from('posts').select('id,author_id,body,post_type,media_url,media_type,thumbnail_url,created_at').eq('id',id).maybeSingle();if(r.error||!r.data)throw new Error('Publicação não encontrada.');
  const p=r.data;const pr=await client.from('profiles').select('display_name,username,avatar_url').eq('id',p.author_id).maybeSingle();const a=pr.data||{};
  const avatar=a.avatar_url?`<img src="${esc(a.avatar_url)}" alt="">`:esc((a.display_name||'?').slice(0,2).toUpperCase());
  const media=p.media_type==='video'&&p.media_url?`<video controls playsinline style="display:block;width:100%;max-height:70vh;object-fit:contain;background:#000" src="${esc(p.media_url)}"></video>`:p.media_url?`<img style="display:block;width:100%;max-height:70vh;object-fit:contain;background:#000" src="${esc(p.media_url)}" alt="Publicação">`:'';
  box.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div class="avatar">${avatar}</div><div style="min-width:0;flex:1"><b>${esc(a.display_name||'Usuário')}</b><small style="display:block;color:#7f8ca0;margin-top:3px">@${esc(a.username||'usuario')} · ${new Date(p.created_at).toLocaleString('pt-BR')}</small></div></div>${media||`<div style="padding:55px 20px;border-radius:16px;background:#080d16;color:#eef4ff;font-size:18px;line-height:1.55">${esc(p.body||'')}</div>`}<p style="color:#c4cddd;line-height:1.5;font-size:13px">${p.body?`<b>${esc(a.username||'usuario')}</b> ${esc(p.body)}`:''}</p><small style="color:#68758a">Publicação do perfil</small>`;
 }catch(e){box.innerHTML=`<div class="ls-follow-empty">${esc(e.message||'Não foi possível abrir a publicação.')}</div>`}
}
function profileClickGuard(e){const item=e.target.closest('#profileGrid .profile-grid-item');if(!item||e.target.closest('.profile-remove-btn'))return;e.preventDefault();e.stopPropagation();openOwnPost(item)}

function redesignFeed(){
 hideStories();
 const feed=$('#feed');if(!feed)return;
 const list=$('#feedList');if(!list)return;
 list.classList.add('feed-v8-list');
 $$('#feedList > .post').forEach(p=>p.dataset.v8='1');
}

function wireTopActions(){
 const edit=$('#profileEditTop');if(edit)edit.onclick=()=>typeof window.openEditProfile==='function'?window.openEditProfile():toast('Abra o menu do perfil para editar.');
 const avatar=$('#profileAvatar');if(avatar)avatar.onclick=()=>{};
}

const feedObserver=new MutationObserver(()=>redesignFeed());
const profileObserver=new MutationObserver(()=>{hideStories();ensureAvatarRemove();ensurePostRemove();wireNetworkButtons();wireTopActions()});
function boot(){
 addTopProfile();hideStories();redesignFeed();ensureAvatarRemove();ensurePostRemove();wireNetworkButtons();wireTopActions();
 if($('#feed'))feedObserver.observe($('#feed'),{childList:true,subtree:true});
 if($('#profile'))profileObserver.observe($('#profile'),{childList:true,subtree:true});
 document.addEventListener('click',profileClickGuard,true);
 refreshTopProfile();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
