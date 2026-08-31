/* LinkStory FY V7 — profile publication viewer + controls */
(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const SUPABASE_URL='https://qwhpikyxilzwazeneddw.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const toast=m=>typeof window.toast==='function'?window.toast(m):console.log(m);
  const style=document.createElement('style');
  style.id='linkstory-fy-v7-style';
  style.textContent=`
    #feed{background:#070707;position:relative;overflow:hidden}
    #feed:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.055;background-image:radial-gradient(#fff .7px,transparent .7px);background-size:7px 7px;z-index:0}
    #feed>*{position:relative;z-index:1}
    #feed .page-title{display:none}
    #feed .story-strip{display:none!important}
    #feed .tabs{position:sticky;top:62px;z-index:20;height:52px;padding:0 16px;border-bottom:1px solid #272727;background:rgba(7,7,7,.88);backdrop-filter:blur(18px);display:flex;align-items:center;gap:8px}
    #feed .tabs:before{content:"FY";font-size:19px;font-weight:950;letter-spacing:-1px;color:#f5f5f5;margin-right:auto}
    #feed .tabs .tab{flex:0 0 auto;min-width:92px;height:32px;padding:0 14px;border:1px solid #2d2d2d;border-radius:999px;background:#0d0d0d;color:#858585;font-size:11px;font-weight:900}
    #feed .tabs .tab.active{border-color:#eee;background:#eee;color:#080808;box-shadow:2px 2px 0 #000}
    #feed .quick-post{position:sticky;top:114px;z-index:15;margin:0;padding:12px 16px;width:100%;border:0;border-bottom:1px solid #222;border-radius:0;background:#0a0a0ae8;color:#aaa;font-size:12px;text-align:left;backdrop-filter:blur(15px)}
    #feed .quick-post:before{content:"＋";display:inline-grid;place-items:center;width:28px;height:28px;margin-right:9px;border:1px solid #444;border-radius:50%;color:#eee;font-size:18px;vertical-align:middle}
    #feed .feed-v6-list{padding:8px 0 30px}
    #feed .feed-v6-card{margin:8px 10px 14px;border:1px solid #292929;border-radius:18px;overflow:hidden;background:#0a0a0a;box-shadow:0 10px 30px rgba(0,0,0,.26)}
    #feed .feed-v6-card .post{margin:0!important;border:0!important;background:transparent!important;padding:13px 13px 10px!important}
    #feed .feed-v6-card .post-user{gap:9px}
    #feed .feed-v6-card .post-user b{font-size:13px;letter-spacing:-.1px}
    #feed .feed-v6-card .post-user small{font-size:9px}
    #feed .feed-v6-card .more{border:0;background:transparent;padding:5px 7px;color:#777}
    #feed .feed-v6-card .post>p{font-size:13px;line-height:1.45;margin:10px 1px 12px;color:#ddd}
    #feed .feed-v6-card .post-media,#feed .feed-v6-card .video-wrap{border-radius:12px;border:1px solid #242424}
    #feed .feed-v6-card .post-media{max-height:620px;object-fit:cover}
    #feed .feed-v6-card .video-wrap video{max-height:680px}
    #feed .feed-v6-card .actions{margin-top:9px;padding:7px 2px 0;border-top:1px solid #1e1e1e;gap:2px}
    #feed .feed-v6-card .actions button{min-width:45px;padding:7px 5px;color:#8c8c8c;font-size:11px;border-radius:9px}
    #feed .feed-v6-card .actions button:hover{background:#141414;color:#eee}
    #feed .feed-v6-card .actions .liked{color:#fff}
    #feed .feed-v6-card .actions .danger{margin-left:auto}
    #feed .feed-v6-card .idea{border-radius:12px;background:#101010}
    #feed .feed-v6-empty{padding:60px 24px;text-align:center;color:#777;font-size:13px}
    .fy-v6-floating{position:fixed;right:18px;bottom:94px;z-index:35;width:52px;height:52px;border-radius:16px;border:1px solid #555;background:#eee;color:#080808;display:grid;place-items:center;font-size:27px;font-weight:900;box-shadow:4px 4px 0 #000}
    .profile-grid-item{position:relative;cursor:pointer}
    .profile-remove-btn{position:absolute!important;right:7px!important;top:7px!important;z-index:9;width:28px!important;height:28px!important;border-radius:50%!important;border:1px solid #777!important;background:#090909e8!important;color:#fff!important;font-size:19px!important;padding:0!important;display:grid!important;place-items:center}
    .avatar-remove-btn{display:block;margin:8px auto;border:1px solid #333;background:#101010;color:#aaa;border-radius:999px;padding:7px 11px;font-size:10px}

    .ls-post-viewer{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:18px;overflow:hidden}
    .ls-post-viewer.hidden{display:none}
    .ls-post-viewer-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(14px)}
    .ls-post-viewer-blur{position:absolute;inset:-35px;background:center/cover no-repeat;filter:blur(30px);transform:scale(1.12);opacity:.42}
    .ls-post-viewer-box{position:relative;z-index:2;width:min(680px,100%);max-height:92vh;overflow:auto;background:rgba(10,10,10,.94);border:1px solid rgba(255,255,255,.22);border-radius:22px;box-shadow:0 30px 90px #000;animation:lsViewerIn .25s ease both}
    @keyframes lsViewerIn{from{opacity:0;transform:scale(.96) translateY(12px)}to{opacity:1;transform:none}}
    .ls-post-viewer-close{position:absolute;right:12px;top:10px;width:38px;height:38px;border:1px solid #555;border-radius:50%;background:#090909;color:#fff;font-size:23px;z-index:5}
    .ls-viewer-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #262626}
    .ls-viewer-avatar{width:42px;height:42px;border-radius:50%;overflow:hidden;background:#222;border:1px solid #555;display:grid;place-items:center;font-weight:900;flex:none}.ls-viewer-avatar img{width:100%;height:100%;object-fit:cover}
    .ls-viewer-author{min-width:0;flex:1}.ls-viewer-author b{display:block;font-size:14px}.ls-viewer-author small{display:block;color:#777;margin-top:3px;font-size:10px}
    .ls-viewer-more{border:0;background:none;color:#ddd;font-size:25px}
    .ls-viewer-media-wrap{background:#000;display:grid;place-items:center;min-height:180px}.ls-post-viewer-box img,.ls-post-viewer-box video{display:block;width:100%;max-height:68vh;object-fit:contain;background:#000}.ls-viewer-text-post{padding:60px 24px;font-size:18px;line-height:1.55;color:#eee;min-height:240px}
    .ls-viewer-body{padding:12px 16px 18px}.ls-viewer-actions{display:flex;gap:18px;margin-bottom:7px}.ls-viewer-actions button{border:0;background:none;color:#eee;font-size:24px;padding:2px}.ls-viewer-body p{margin:7px 0;color:#ddd;line-height:1.45;font-size:13px}.ls-viewer-origin{color:#666;font-size:10px}
    .ls-viewer-loading,.ls-viewer-error{padding:70px 20px;text-align:center;color:#aaa}
    @media(max-width:600px){.ls-post-viewer{padding:0}.ls-post-viewer-box{width:100%;max-height:100%;border-radius:0;border-left:0;border-right:0}.ls-post-viewer-box img,.ls-post-viewer-box video{max-height:70vh}.ls-post-viewer-close{right:10px;top:8px}.fy-v6-floating{right:14px}}
  `;
  document.head.appendChild(style);
  function getSessionUser(){return client?.auth.getUser().then(r=>r.data.user).catch(()=>null)}
  async function removeAvatar(e){e?.stopPropagation();if(!client)return;const u=await getSessionUser();if(!u)return toast('Entre na sua conta para remover a foto.');if(!confirm('Remover sua foto de perfil?'))return;const r=await client.from('profiles').update({avatar_url:null}).eq('id',u.id);if(r.error)return toast('Não foi possível remover a foto.');if(typeof window.loadProfile==='function')await window.loadProfile();if(typeof window.renderProfile==='function')await window.renderProfile();toast('Foto de perfil removida.')}
  async function removePost(e){e?.preventDefault();e?.stopPropagation();const item=e?.currentTarget?.closest('.profile-grid-item');const id=item?.dataset.postId||item?.dataset.id||item?.dataset.profilePost||item?.dataset.gridPost;if(!id||!client)return toast('Publicação sem identificação.');const u=await getSessionUser();if(!u)return toast('Entre na sua conta para remover a publicação.');if(!confirm('Remover esta publicação?'))return;const r=await client.from('posts').delete().eq('id',id).eq('author_id',u.id);if(r.error)return toast('Não foi possível remover: '+r.error.message);item.remove();if(typeof window.renderProfile==='function')await window.renderProfile();toast('Publicação removida.')}
  function ensureProfileControls(){const av=$('#profileAvatar');if(av&&av.parentElement&&!av.parentElement.querySelector('.avatar-remove-btn')){const b=document.createElement('button');b.className='avatar-remove-btn';b.type='button';b.textContent='Remover foto de perfil';b.onclick=removeAvatar;av.parentElement.appendChild(b)}$$('.profile-grid-item').forEach(item=>{if(item.querySelector('.profile-remove-btn'))return;const id=item.dataset.postId||item.dataset.id||item.dataset.profilePost||item.dataset.gridPost;if(!id)return;const b=document.createElement('button');b.className='profile-remove-btn';b.type='button';b.textContent='×';b.title='Remover publicação';b.onclick=removePost;item.appendChild(b)})}
  function closeViewer(){const v=$('#lsPostViewer');if(v)v.classList.add('hidden');document.body.style.overflow=''}
  async function openOwnPost(item){
    const id=item?.dataset.postId||item?.dataset.id||item?.dataset.profilePost||item?.dataset.gridPost;
    if(!id)return;
    let viewer=$('#lsPostViewer');
    if(!viewer){
      viewer=document.createElement('div');viewer.id='lsPostViewer';viewer.className='ls-post-viewer hidden';
      viewer.innerHTML='<div class="ls-post-viewer-backdrop"></div><div class="ls-post-viewer-blur"></div><div class="ls-post-viewer-box"><button class="ls-post-viewer-close" type="button" aria-label="Fechar">×</button><div class="ls-viewer-content"></div></div>';
      document.body.appendChild(viewer);viewer.querySelector('.ls-post-viewer-close').onclick=closeViewer;viewer.querySelector('.ls-post-viewer-backdrop').onclick=closeViewer;
    }
    const content=viewer.querySelector('.ls-viewer-content');content.innerHTML='<div class="ls-viewer-loading">Abrindo publicação…</div>';viewer.classList.remove('hidden');document.body.style.overflow='hidden';
    try{
      const r=await client.from('posts').select('id,author_id,body,post_type,media_url,media_type,thumbnail_url,created_at').eq('id',id).maybeSingle();
      if(r.error||!r.data)throw new Error('Publicação não encontrada.');
      const p=r.data;let a={display_name:'Usuário',username:'usuario',avatar_url:null};
      const pr=await client.from('profiles').select('display_name,username,avatar_url').eq('id',p.author_id).maybeSingle();if(pr.data)a=pr.data;
      const own=!!window.user&&p.author_id===window.user.id;
      const avatar=a.avatar_url?`<img src="${String(a.avatar_url).replace(/\"/g,'&quot;')}" alt="">`:`<span>${String(a.display_name||'?').slice(0,2).toUpperCase()}</span>`;
      const media=p.media_type==='video'&&p.media_url?`<video controls playsinline class="ls-viewer-media" src="${String(p.media_url).replace(/\"/g,'&quot;')}"></video>`:p.media_url?`<img class="ls-viewer-media" src="${String(p.media_url).replace(/\"/g,'&quot;')}" alt="Publicação">`:'';
      content.innerHTML=`<header class="ls-viewer-head"><div class="ls-viewer-avatar">${avatar}</div><div class="ls-viewer-author"><b>${escP(a.display_name)}</b><small>@${escP(a.username)} · ${new Date(p.created_at).toLocaleString('pt-BR')}</small></div>${own?'<button class="ls-viewer-more" id="lsViewerMore">⋯</button>':''}</header><div class="ls-viewer-media-wrap">${media||`<div class="ls-viewer-text-post">${escP(p.body||'')}</div>`}</div><div class="ls-viewer-body"><div class="ls-viewer-actions"><button type="button">♡</button><button type="button">◯</button><button type="button">↗</button><button type="button">⌑</button></div>${p.body?`<p><b>${escP(a.username)}</b> ${escP(p.body)}</p>`:''}<small class="ls-viewer-origin">Publicação do perfil</small></div>`;
      const blur=viewer.querySelector('.ls-post-viewer-blur');if(p.media_url)blur.style.backgroundImage=`url("${String(p.media_url).replace(/\"/g,'')}")`;
      if(own)content.querySelector('#lsViewerMore').onclick=()=>removePostById(p.id);
    }catch(e){content.innerHTML=`<div class="ls-viewer-error">${escP(e.message||'Não foi possível abrir a publicação.')}</div>`}
  }
  const escP=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function removePostById(id){const u=await getSessionUser();if(!u||!id)return;if(!confirm('Remover esta publicação?'))return;const r=await client.from('posts').delete().eq('id',id).eq('author_id',u.id);if(r.error)return toast('Não foi possível remover: '+r.error.message);closeViewer();if(typeof window.renderProfile==='function')await window.renderProfile();toast('Publicação removida.')}
  function profileClickGuard(e){const item=e.target.closest('.profile-grid-item');if(!item||e.target.closest('.profile-remove-btn'))return;e.preventDefault();e.stopPropagation();openOwnPost(item)}
  function redesignFeed(){const feed=$('#feed');if(!feed)return;feed.classList.add('fy-v6');const tabs=feed.querySelector('.tabs');const list=feed.querySelector('#feedList');if(!tabs||!list)return;if(!tabs.dataset.v6){tabs.dataset.v6='1';const title=feed.querySelector('.page-title');if(title)title.hidden=true}if(!list.classList.contains('feed-v6-list'))list.classList.add('feed-v6-list');[...list.children].forEach(node=>{if(node.classList.contains('feed-v6-card'))return;if(node.classList.contains('feed-loading')||node.classList.contains('empty-state'))return;if(node.classList.contains('post')){const card=document.createElement('article');card.className='feed-v6-card';node.parentNode.insertBefore(card,node);card.appendChild(node)}});let floating=$('#fyV6Create');if(!floating){floating=document.createElement('button');floating.id='fyV6Create';floating.className='fy-v6-floating';floating.type='button';floating.textContent='＋';floating.setAttribute('aria-label','Criar publicação');floating.onclick=()=>$('#quickPost')?.click();document.body.appendChild(floating)}}
  const feedObserver=new MutationObserver(()=>redesignFeed());const profileObserver=new MutationObserver(()=>ensureProfileControls());
  function boot(){redesignFeed();ensureProfileControls();feedObserver.observe($('#feed')||document.body,{childList:true,subtree:true});profileObserver.observe($('#profile')||document.body,{childList:true,subtree:true});document.addEventListener('click',profileClickGuard,true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
