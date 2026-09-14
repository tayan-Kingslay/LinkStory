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
    #lsBottomNav{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);width:min(430px,calc(100% - 28px));height:78px;background:rgba(255,255,255,.98);border:1px solid #d9e5f0;border-radius:28px;box-shadow:0 14px 38px rgba(16,32,51,.13);display:grid;grid-template-columns:repeat(3,1fr);z-index:1000;backdrop-filter:blur(16px)}
    #lsBottomNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#687b90;text-decoration:none;font:700 12px/1 'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #lsBottomNav a.active{color:#0b72e7}
    #lsBottomNav .ls-icon{width:25px;height:25px;display:grid;place-items:center;font-size:21px;line-height:1;font-weight:700}
    #lsBottomNav a:first-child .ls-icon{font-size:25px}#lsBottomNav a:nth-child(2) .ls-icon{font-size:23px}#lsBottomNav a:nth-child(3) .ls-icon{font-size:23px}
    body{padding-bottom:104px!important}.desktop-nav{display:none!important}
    .ls-global-menu-btn{width:46px;height:46px;border:1px solid #dbe5ef;border-radius:50%;background:#fff;color:#102033;display:flex;align-items:center;justify-content:center;padding:0;font-size:21px;line-height:1;margin-left:auto;box-shadow:0 5px 18px rgba(16,32,51,.05)}
    .ls-global-menu-btn:hover{border-color:#0b72e7;color:#0b72e7}
    .ls-menu-dialog{width:min(100%,520px);height:100dvh;max-height:none;margin:0 0 0 auto;border:0;padding:0;background:#fff;color:#102033}.ls-menu-wrap{height:100%;padding:24px 20px;overflow:auto}.ls-menu-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:22px;border-bottom:1px solid #dbe5ef}.ls-menu-head strong{color:#102033;letter-spacing:2.5px;font:800 17px/1 'DM Sans',sans-serif}.ls-menu-close{border:0;background:none;font-size:38px;line-height:1;color:#102033}.ls-menu-links{display:grid;margin-top:4px}.ls-menu-links a{display:flex;align-items:center;justify-content:space-between;padding:21px 2px;border-bottom:1px solid #dbe5ef;text-decoration:none;color:#102033;font:700 18px/1.2 'DM Sans',sans-serif}.ls-menu-links span{color:#7a8da0;font-size:27px}
    html[data-ls-theme="dark"] .ls-menu-dialog,html[data-ls-theme="dark"] #lsMenu{background:#151515!important;color:#fff!important}
    html[data-ls-theme="dark"] .ls-menu-head{border-color:#303030}.ls-menu-dialog{color:#102033}
    html[data-ls-theme="dark"] .ls-menu-head strong,html[data-ls-theme="dark"] .ls-menu-close,html[data-ls-theme="dark"] .ls-menu-links a{color:#fff!important}
    html[data-ls-theme="dark"] .ls-menu-links a{border-color:#303030}html[data-ls-theme="dark"] .ls-menu-links span{color:#aab3be}
    @media(min-width:801px){#lsBottomNav{bottom:18px;height:82px}.ls-menu-dialog{border-radius:20px;margin:16px;max-height:calc(100dvh - 32px);height:auto}.ls-menu-wrap{min-height:520px}}
    @media(max-width:560px){#lsBottomNav{height:76px;bottom:8px}.ls-menu-wrap{padding:20px}.ls-menu-links a{padding:19px 2px;font-size:17px}}
  `;
  if(!document.getElementById('lsGlobalNavStyle')){const st=document.createElement('style');st.id='lsGlobalNavStyle';st.textContent=css;document.head.appendChild(st)}
  if(!document.getElementById('lsBottomNav')){
    const path=location.pathname.split('/').pop()||'index.html';
    const active=path==='explore.html'?'explore':path==='library.html'?'library':'home';
    const nav=document.createElement('nav');nav.id='lsBottomNav';nav.setAttribute('aria-label','Navegação principal');
    nav.innerHTML=`<a href="index.html" class="${active==='home'?'active':''}"><span class="ls-icon">⌂</span><span>Início</span></a><a href="explore.html" class="${active==='explore'?'active':''}"><span class="ls-icon">◉</span><span>Explorar</span></a><a href="library.html" class="${active==='library'?'active':''}"><span class="ls-icon">▣</span><span>Biblioteca</span></a>`;
    document.body.appendChild(nav);
  }
  let menu=document.getElementById('menuDialog');let opener=document.getElementById('openMenu');
  if(menu){menu.querySelectorAll('a[href="index.html"],a[href="explore.html"],a[href="library.html"]').forEach(a=>a.remove());const list=menu.querySelector('.menu-links,.menu-list');if(list&&!list.querySelector('a'))list.innerHTML='<a href="profile.html">Perfil <strong>›</strong></a><a href="studio.html">Meu Estúdio <strong>›</strong></a><a href="publish.html">Publicar mangá <strong>›</strong></a><a href="settings.html">Configurações <strong>›</strong></a><a href="login.html">Entrar <strong>›</strong></a>'}
  else{menu=document.createElement('dialog');menu.id='lsMenu';menu.className='ls-menu-dialog';menu.innerHTML=`<div class="ls-menu-wrap"><div class="ls-menu-head"><strong>LINKSTORY</strong><button class="ls-menu-close" aria-label="Fechar">×</button></div><nav class="ls-menu-links"><a href="profile.html">Perfil <span>›</span></a><a href="studio.html">Meu Estúdio <span>›</span></a><a href="publish.html">Publicar mangá <span>›</span></a><a href="settings.html">Configurações <span>›</span></a><a href="login.html">Entrar <span>›</span></a></nav></div>`;document.body.appendChild(menu);opener=document.createElement('button');opener.id='lsGlobalMenuButton';opener.className='ls-global-menu-btn';opener.setAttribute('aria-label','Abrir menu');opener.innerHTML='☰';const header=document.querySelector('.topbar,.top,.header');if(header)header.appendChild(opener);else{opener.style.position='fixed';opener.style.top='14px';opener.style.right='14px';opener.style.zIndex='1001';document.body.appendChild(opener)}}
  if(opener&&!opener.dataset.lsBound){opener.dataset.lsBound='1';opener.addEventListener('click',()=>menu.showModal())}
  const close=menu.querySelector('.ls-menu-close,.dialog-close,.close');if(close&&!close.dataset.lsBound){close.dataset.lsBound='1';close.addEventListener('click',()=>menu.close())}
  if(!menu.dataset.lsBound){menu.dataset.lsBound='1';menu.addEventListener('click',e=>{if(e.target===menu)menu.close()})}
})();