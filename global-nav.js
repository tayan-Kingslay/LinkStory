(()=>{
  const theme=localStorage.getItem('linkstory-theme')||'light';
  document.documentElement.dataset.lsTheme=theme;
  const css=`
    html[data-ls-theme="dark"],html[data-ls-theme="dark"] body{background:#111!important;color:#fff!important}
    html[data-ls-theme="dark"] body *{border-color:#303030!important}
    html[data-ls-theme="dark"] body h1,html[data-ls-theme="dark"] body h2,html[data-ls-theme="dark"] body h3,html[data-ls-theme="dark"] body h4,html[data-ls-theme="dark"] body h5,html[data-ls-theme="dark"] body h6,html[data-ls-theme="dark"] body strong,html[data-ls-theme="dark"] body label,html[data-ls-theme="dark"] body .suggestions-head{color:#fff!important}
    html[data-ls-theme="dark"] body p,html[data-ls-theme="dark"] body small,html[data-ls-theme="dark"] body .muted,html[data-ls-theme="dark"] body .intro p{color:#b8c0ca!important}
    html[data-ls-theme="dark"] body input,html[data-ls-theme="dark"] body textarea,html[data-ls-theme="dark"] body select{background:#1b1b1b!important;color:#fff!important;border-color:#444!important}
    html[data-ls-theme="dark"] body input::placeholder,html[data-ls-theme="dark"] body textarea::placeholder{color:#9da7b2!important;opacity:1}
    html[data-ls-theme="dark"] body .topbar,html[data-ls-theme="dark"] body .top,html[data-ls-theme="dark"] body .header,html[data-ls-theme="dark"] body header{background:#151515!important}
    html[data-ls-theme="dark"] body .back,html[data-ls-theme="dark"] body .menu-btn,html[data-ls-theme="dark"] body .ls-global-menu-btn,html[data-ls-theme="dark"] body .circle{background:#151515!important;color:#fff!important}
    html[data-ls-theme="dark"] body .logo img,html[data-ls-theme="dark"] body .brand img,html[data-ls-theme="dark"] body .footer-logo img{filter:invert(1)!important}
    html[data-ls-theme="dark"] body .creator a,html[data-ls-theme="dark"] body .feature a,html[data-ls-theme="dark"] body .login{background:#fff!important;color:#0b72e7!important}
    html[data-ls-theme="dark"] body .feature.empty{background:#1b1b1b!important;color:#fff!important}
    html[data-ls-theme="dark"] body .feature.empty .feature-content,html[data-ls-theme="dark"] body .feature.empty .feature-label{color:#fff!important}
    html[data-ls-theme="dark"] body .feature.empty p{color:#b8c0ca!important}
    html[data-ls-theme="dark"] body .empty-list,html[data-ls-theme="dark"] body .empty-state{background:#171717!important;color:#b8c0ca!important;border-color:#3b3b3b!important}
    html[data-ls-theme="dark"] body .empty-list strong,html[data-ls-theme="dark"] body .empty-state strong{color:#fff!important}
    html[data-ls-theme="dark"] body .suggestions,html[data-ls-theme="dark"] body .grid{background:transparent!important}
    html[data-ls-theme="dark"] body .suggestion-row{border-color:#303030!important}
    html[data-ls-theme="dark"] body .card{background:#151515!important}
    html[data-ls-theme="dark"] body .cover{background:#20252b!important}
    html[data-ls-theme="dark"] body .ey,html[data-ls-theme="dark"] body .eyebrow{color:#9ed2ff!important}
    html[data-ls-theme="dark"] body a{color:inherit}
    html[data-ls-theme="dark"] body dialog,html[data-ls-theme="dark"] body .menu-dialog,html[data-ls-theme="dark"] body #menuDialog,html[data-ls-theme="dark"] body .ls-menu-dialog,html[data-ls-theme="dark"] body #lsMenu{background:#151515!important;color:#fff!important}
    html[data-ls-theme="dark"] body dialog::backdrop{background:rgba(0,0,0,.62)!important}
    html[data-ls-theme="dark"] body .menu-dialog .menu-head,html[data-ls-theme="dark"] body #menuDialog .menu-head{border-color:#303030!important}
    html[data-ls-theme="dark"] body .menu-dialog .menu-head strong,html[data-ls-theme="dark"] body #menuDialog .menu-head strong,html[data-ls-theme="dark"] body .menu-dialog .close,html[data-ls-theme="dark"] body #menuDialog .close{color:#fff!important}
    html[data-ls-theme="dark"] body .menu-dialog .menu-list a,html[data-ls-theme="dark"] body #menuDialog .menu-list a{color:#fff!important;border-color:#303030!important}
    html[data-ls-theme="dark"] body .menu-dialog .menu-list strong,html[data-ls-theme="dark"] body #menuDialog .menu-list strong{color:#aab3be!important}
    html[data-ls-theme="dark"] #lsBottomNav{background:rgba(22,22,22,.98)!important;border-color:#333!important;box-shadow:0 14px 38px rgba(0,0,0,.45)!important}
    html[data-ls-theme="dark"] #lsBottomNav a{color:#aab3be!important}
    html[data-ls-theme="dark"] #lsBottomNav a.active{color:#0b72e7!important}
    #lsBottomNav{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);width:min(430px,calc(100% - 24px));height:72px;background:rgba(255,255,255,.98);border:1px solid #d9e5f0;border-radius:28px;box-shadow:0 14px 38px rgba(16,32,51,.13);display:grid;grid-template-columns:repeat(4,1fr);z-index:1000;backdrop-filter:blur(16px)}
    #lsBottomNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#687b90;text-decoration:none;font:700 12px/1 'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #lsBottomNav a.active{color:#0b72e7}
    #lsBottomNav .ls-icon{width:25px;height:25px;display:grid;place-items:center;font-size:21px;line-height:1;font-weight:700}#lsBottomNav .ls-icon svg{width:24px;height:24px;display:block;overflow:visible}#lsBottomNav a.active .ls-icon svg{filter:drop-shadow(0 2px 3px rgba(11,114,231,.12))}
    #lsBottomNav a:first-child .ls-icon{font-size:25px}#lsBottomNav a:nth-child(2) .ls-icon{font-size:23px}
    body{padding-bottom:96px!important}.desktop-nav{display:none!important}
    .ls-global-menu-btn{width:46px;height:46px;border:1px solid #dbe5ef;border-radius:50%;background:#fff;color:#102033;display:flex;align-items:center;justify-content:center;padding:0;font-size:21px;line-height:1;margin-left:auto;box-shadow:0 5px 18px rgba(16,32,51,.05)}
    .ls-global-menu-btn:hover{border-color:#0b72e7;color:#0b72e7}
    .ls-menu-dialog{position:fixed;width:min(420px,calc(100vw - 20px));height:calc(100dvh - 24px);max-height:none;margin:12px 10px 12px auto;border:1px solid #dce7f3;border-radius:28px;padding:0;background:#fff;color:#172334;box-shadow:0 24px 70px rgba(10,35,65,.24);overflow:hidden}
    .ls-menu-wrap{height:100%;padding:24px 20px;overflow:auto;background:#fff}
    .ls-menu-head{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 22px;border-bottom:1px solid #e5edf6}
    .ls-menu-brand{display:flex;align-items:center;gap:11px}.ls-menu-brand-mark{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#eaf4ff,#dcecff);color:#0877ec}
    .ls-menu-head strong{color:#172334;letter-spacing:1.8px;font:850 16px/1 'DM Sans',sans-serif}
    .ls-menu-close{width:40px;height:40px;display:grid;place-items:center;border:1px solid #e2eaf3;border-radius:13px;background:#f7faff;font-size:25px;line-height:1;color:#536b86}
    .ls-menu-section{margin:23px 4px 10px;color:#8a9bb0;font:800 10px/1 'DM Sans',sans-serif;letter-spacing:1.7px}
    .ls-menu-links{display:grid;gap:7px;margin-top:8px}
    .ls-menu-links a{display:flex;align-items:center;gap:13px;padding:12px 11px;border:1px solid transparent;border-radius:17px;text-decoration:none;color:#26374b;font:700 15px/1.2 'DM Sans',sans-serif;transition:background .16s,border-color .16s,transform .16s}
    .ls-menu-links a:hover{background:#f4f8fe;border-color:#e2edfa}
    .ls-menu-icon{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:13px;background:#eef5ff;color:#0877ec}
    .ls-menu-icon svg{width:21px;height:21px;display:block}
    .ls-menu-label{flex:1}.ls-menu-arrow{color:#9aabc0;font-size:22px;font-weight:500}
    dialog#menuDialog,dialog#lsMenu,dialog.ls-menu-dialog{position:fixed!important;inset:0 0 0 auto!important;width:min(420px,calc(100vw - 20px))!important;max-width:none!important;height:calc(100dvh - 24px)!important;max-height:none!important;margin:12px 10px 12px auto!important;padding:0!important;border:1px solid #dce7f3!important;border-radius:28px!important;background:#fff!important;color:#172334!important;opacity:1!important;z-index:2147483000!important;overflow:hidden!important;box-shadow:0 24px 70px rgba(10,35,65,.24)!important}
    dialog#menuDialog::backdrop,dialog#lsMenu::backdrop,dialog.ls-menu-dialog::backdrop{background:rgba(12,25,42,.48)!important}
    dialog#menuDialog .ls-menu-wrap,dialog#lsMenu .ls-menu-wrap{background:#fff!important;opacity:1!important}
    body:has(dialog[open]) #lsBottomNav{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
    body:has(dialog[open]) .ls-global-menu-btn,body:has(dialog[open]) #openMenu{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
    html[data-ls-theme="dark"] dialog#menuDialog,html[data-ls-theme="dark"] dialog#lsMenu,html[data-ls-theme="dark"] dialog.ls-menu-dialog{background:#151d29!important;color:#fff!important;border-color:#2b3b50!important}
    html[data-ls-theme="dark"] dialog#menuDialog .ls-menu-wrap,html[data-ls-theme="dark"] dialog#lsMenu .ls-menu-wrap{background:#151d29!important}
    html[data-ls-theme="dark"] .ls-menu-head{border-color:#2b3b50}html[data-ls-theme="dark"] .ls-menu-head strong,html[data-ls-theme="dark"] .ls-menu-links a{color:#f4f7fb!important}
    html[data-ls-theme="dark"] .ls-menu-section{color:#91a3b9}html[data-ls-theme="dark"] .ls-menu-links a:hover{background:#1d2a3b;border-color:#2b3b50}
    html[data-ls-theme="dark"] .ls-menu-icon{background:#20334b;color:#83bdff}html[data-ls-theme="dark"] .ls-menu-close{background:#1d2a3b;color:#dce9f8;border-color:#2b3b50}
    @media(max-width:560px){.ls-menu-dialog{width:calc(100vw - 20px);height:calc(100dvh - 24px);margin:12px 10px 12px auto}.ls-menu-wrap{padding:22px 17px}}


    html[data-ls-theme="dark"] .ls-menu-dialog,html[data-ls-theme="dark"] #lsMenu{background:#151515!important;color:#fff!important}
    html[data-ls-theme="dark"] .ls-menu-head{border-color:#303030}.ls-menu-dialog{color:#102033}
    html[data-ls-theme="dark"] .ls-menu-head strong,html[data-ls-theme="dark"] .ls-menu-close,html[data-ls-theme="dark"] .ls-menu-links a{color:#fff!important}
    html[data-ls-theme="dark"] .ls-menu-links a{border-color:#303030}html[data-ls-theme="dark"] .ls-menu-links span{color:#aab3be}
    @media(min-width:801px) and (pointer:fine){#lsBottomNav{display:none!important}body{padding-bottom:0!important}.ls-menu-dialog{border-radius:20px;margin:16px;max-height:calc(100dvh - 32px);height:auto}.ls-menu-wrap{min-height:520px}}
    @media(min-width:801px) and (pointer:coarse){#lsBottomNav{display:grid!important}body{padding-bottom:96px!important}.ls-menu-dialog{border-radius:0!important;margin:0!important;max-height:none!important;height:100dvh!important}.ls-menu-wrap{min-height:100%!important}}
    @media(max-width:560px),(pointer:coarse){#lsBottomNav{height:70px;bottom:8px}.ls-menu-wrap{padding:20px}.ls-menu-links a{padding:19px 2px;font-size:17px}}
  `;
  if(!document.getElementById('lsGlobalNavStyle')){const st=document.createElement('style');st.id='lsGlobalNavStyle';st.textContent=css;document.head.appendChild(st)}
  /* Reader has its own reading controls and must stay completely free of global navigation. */
  if(document.querySelector('.reader-title')) return;
  if(!document.getElementById('lsBottomNav')){
    const path=location.pathname.split('/').pop()||'index.html';
    const active=path==='library.html'?'library':path==='profile.html'?'profile':path==='fy.html'?'fy':'home';
    const nav=document.createElement('nav');nav.id='lsBottomNav';nav.setAttribute('aria-label','Navegação principal');
    nav.innerHTML=`<a href="index.html" class="${active==='home'?'active':''}"><span class="ls-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m3.5 10.8 8.5-7 8.5 7v9.1a1.6 1.6 0 0 1-1.6 1.6h-4.8v-6.2h-4.2v6.2H5.1a1.6 1.6 0 0 1-1.6-1.6z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Início</span></a><a href="fy.html" class="${active==='fy'?'active':''}"><span class="ls-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m12 2.8 2.1 6.1 6.1 2.1-6.1 2.1-2.1 6.1-2.1-6.1-6.1-2.1 6.1-2.1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" fill="currentColor"/></svg></span><span>Pra você</span></a><a href="profile.html" class="${active==='profile'?'active':''}"><span class="ls-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.8"/><path d="M4.8 20c.5-3.4 3.3-5.4 7.2-5.4s6.7 2 7.2 5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><span>Perfil</span></a><a href="library.html" class="${active==='library'?'active':''}"><span class="ls-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5.2A2.2 2.2 0 0 1 6.2 3H20v17H6.2A2.2 2.2 0 0 0 4 22z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 5.2v14.6A2.2 2.2 0 0 1 6.2 17.6H20M8 7h8M8 10.5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><span>Biblioteca</span></a>`;
    document.body.appendChild(nav);
  }
  const menuMarkup='<div class="ls-menu-wrap"><div class="ls-menu-head"><div class="ls-menu-brand"><span class="ls-menu-brand-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5h16v13H4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 9h8M8 12.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><strong>LINKSTORY</strong></div><button class="ls-menu-close" id="closeMenu" aria-label="Fechar menu">×</button></div><div class="ls-menu-section">EXPLORAR</div><nav class="ls-menu-links"><a href="fy.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24" fill="none"><path d="m12 2.8 2.1 6.1 6.1 2.1-6.1 2.1-2.1 6.1-2.1-6.1-6.1-2.1 6.1-2.1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span><span class="ls-menu-label">Pra você</span><span class="ls-menu-arrow">›</span></a><a href="notifications.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="ls-menu-label">Notificações</span><span class="ls-menu-arrow">›</span></a><a href="profile.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c.6-3.5 3.3-5.5 7.5-5.5s6.9 2 7.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><span class="ls-menu-label">Perfil</span><span class="ls-menu-arrow">›</span></a><a href="studio.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24" fill="none"><path d="m4 17 9.8-9.8 3 3L7 20H4zM12.5 8.5l2-2 3 3-2 2M14 4l1.5-1.5L21.5 8.5 20 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="ls-menu-label">Meu Estúdio</span><span class="ls-menu-arrow">›</span></a><a href="publish.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M5 3.5h10l4 4V20H5zM14.5 3.5V8H19M8 12h8M8 15.5h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="ls-menu-label">Publicar mangá</span><span class="ls-menu-arrow">›</span></a><a href="settings.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span><span class="ls-menu-label">Configurações</span><span class="ls-menu-arrow">›</span></a><a href="login.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="ls-menu-label">Entrar</span><span class="ls-menu-arrow">›</span></a></nav></div>';
  let menu=document.getElementById('menuDialog')||document.getElementById('lsMenu');
  let opener=document.getElementById('openMenu')||document.getElementById('lsGlobalMenuButton');
  if(!menu){menu=document.createElement('dialog');menu.id='lsMenu';document.body.appendChild(menu)}
  menu.classList.remove('menu-dialog');menu.classList.add('ls-menu-dialog');menu.innerHTML=menuMarkup;
  if(!opener){opener=document.createElement('button');opener.id='lsGlobalMenuButton';opener.className='ls-global-menu-btn';opener.type='button';opener.setAttribute('aria-label','Abrir menu');opener.innerHTML='☰';const header=document.querySelector('.topbar,.top,.header');if(header)header.appendChild(opener);else{opener.style.position='fixed';opener.style.top='14px';opener.style.right='14px';opener.style.zIndex='1001';document.body.appendChild(opener)}}
  opener.onclick=()=>{if(!menu.open)menu.showModal()};
  const close=menu.querySelector('.ls-menu-close');if(close)close.onclick=()=>menu.close();
  if(!menu.dataset.lsBound){menu.dataset.lsBound='1';menu.addEventListener('click',e=>{if(e.target===menu)menu.close()})}
})();