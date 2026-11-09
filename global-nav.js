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

    /* Neutralize the blue hamburger bars in dark mode. */
    html[data-ls-theme="dark"] body .menu:before,html[data-ls-theme="dark"] body .menu-btn:before,html[data-ls-theme="dark"] body .ls-global-menu-btn:before{background:linear-gradient(#c4ced9 0 2px,transparent 2px 7.5px,#c4ced9 7.5px 9.5px,transparent 9.5px 15px,#c4ced9 15px 17px)!important}
    html[data-ls-theme="dark"] body .ls-global-menu-btn{color:#c4ced9!important}
    /* Messages list and account profile surfaces. */
    html[data-ls-theme="dark"] body:has(.conversation),html[data-ls-theme="dark"] body:has(.profile){background:#101720!important;color:#edf3fa!important}
    html[data-ls-theme="dark"] body .list,html[data-ls-theme="dark"] body .conversation,html[data-ls-theme="dark"] body .request,html[data-ls-theme="dark"] body .empty{background:#182330!important;border-color:#344255!important;color:#edf3fa!important}
    html[data-ls-theme="dark"] body .conversation:active{background:#223246!important}
    html[data-ls-theme="dark"] body .conversation .avatar,html[data-ls-theme="dark"] body .request .avatar,html[data-ls-theme="dark"] body .avatar{background:#22364c!important;color:#b8d8ff!important;border-color:#3b526b!important}
    html[data-ls-theme="dark"] body .conversation .preview,html[data-ls-theme="dark"] body .conversation .time,html[data-ls-theme="dark"] body .conversation small,html[data-ls-theme="dark"] body .request small{color:#a8b5c5!important}
    html[data-ls-theme="dark"] body .head h1,html[data-ls-theme="dark"] body .profile h1,html[data-ls-theme="dark"] body .profile h2{color:#f2f6fb!important}
    html[data-ls-theme="dark"] body .profile,html[data-ls-theme="dark"] body .section,html[data-ls-theme="dark"] body .account-pill,html[data-ls-theme="dark"] body .work,html[data-ls-theme="dark"] body .empty{background:#182330!important;border-color:#344255!important;color:#edf3fa!important}
    html[data-ls-theme="dark"] body .profile .muted,html[data-ls-theme="dark"] body .profile .ey,html[data-ls-theme="dark"] body .account-meta{color:#a8b5c5!important}
    html[data-ls-theme="dark"] body .work .info,html[data-ls-theme="dark"] body .work h3,html[data-ls-theme="dark"] body .work p{color:#edf3fa!important}
    html[data-ls-theme="dark"] body .profile-action,html[data-ls-theme="dark"] body .account-pill{background:#202d3b!important;border-color:#3b4d61!important;color:#dce9f7!important}
    html[data-ls-theme="dark"] body .profile .publish{color:#8fc2ff!important}
    /* FY feed: ensure cards, controls and dialogs follow the selected dark theme. */
    html[data-ls-theme="dark"] body:has(.post){background:#101720!important;background-image:radial-gradient(rgba(180,205,255,.035) .65px,transparent .65px),linear-gradient(135deg,#0c121b 0%,#101a28 52%,#151827 100%)!important;color:#edf3fa!important}
    html[data-ls-theme="dark"] body:has(.post) .topbar,html[data-ls-theme="dark"] body:has(.post) .tabs{background:rgba(16,23,32,.94)!important;border-color:#344255!important}
    html[data-ls-theme="dark"] body:has(.post) .post,html[data-ls-theme="dark"] body:has(.post) .composer,html[data-ls-theme="dark"] body:has(.post) .empty,html[data-ls-theme="dark"] body:has(.post) .loading{background:#182330!important;border-color:#344255!important;color:#edf3fa!important}
    html[data-ls-theme="dark"] body:has(.post) .body,html[data-ls-theme="dark"] body:has(.post) .idea-title,html[data-ls-theme="dark"] body:has(.post) .post-head strong{color:#edf3fa!important}
    html[data-ls-theme="dark"] body:has(.post) .post-stats,html[data-ls-theme="dark"] body:has(.post) .author small,html[data-ls-theme="dark"] body:has(.post) .muted{color:#a8b5c5!important}
    html[data-ls-theme="dark"] body:has(.post) .tab{background:#202d3b!important;color:#c2cedb!important;border-color:#3b4d61!important}
    html[data-ls-theme="dark"] body:has(.post) .tab.active{background:#286bb5!important;color:#fff!important;border-color:#438bd6!important}
    html[data-ls-theme="dark"] body:has(.post) .compose-open,html[data-ls-theme="dark"] body:has(.post) .chip,html[data-ls-theme="dark"] body:has(.post) .action{background:#202d3b!important;color:#dce9f7!important;border-color:#3b4d61!important}
    html[data-ls-theme="dark"] body:has(.post) .field input,html[data-ls-theme="dark"] body:has(.post) .field textarea,html[data-ls-theme="dark"] body:has(.post) .field select{background:#111b27!important;color:#edf3fa!important;border-color:#3b4d61!important}
    html[data-ls-theme="dark"] body:has(.post) dialog{background:#182330!important;color:#edf3fa!important;border-color:#344255!important}
    html[data-ls-theme="dark"] body:has(.post) dialog .modal-head{border-color:#344255!important}
    html[data-ls-theme="dark"] body:has(.post) dialog p,html[data-ls-theme="dark"] body:has(.post) dialog label{color:#c2cedb!important}

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
    html[data-ls-theme="dark"] #lsBottomNav{background:rgba(22,25,30,.96)!important;border-color:#303944!important;box-shadow:0 8px 28px rgba(0,0,0,.34)!important}
    html[data-ls-theme="dark"] #lsBottomNav a{color:#aab3be!important}
    html[data-ls-theme="dark"] #lsBottomNav a.active{color:#0b72e7!important}
#lsBottomNav{position:fixed;left:0;right:0;bottom:0;width:100%;height:calc(62px + env(safe-area-inset-bottom));padding:5px 10px max(5px,env(safe-area-inset-bottom));gap:0;background:rgba(255,255,255,.98);border:0;border-top:1px solid #e6edf5;border-radius:0;box-shadow:0 -5px 22px rgba(16,32,51,.055);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));z-index:1000;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
#lsBottomNav a{position:relative;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#8290a1;text-decoration:none;font:600 10px/1.1 "DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;border-radius:10px;transition:color .18s ease}
#lsBottomNav a.active{color:#0877ed;background:transparent}
#lsBottomNav a.active:before{content:"";position:absolute;top:-5px;left:calc(50% - 14px);width:28px;height:3px;border-radius:0 0 4px 4px;background:#0877ed}
#lsBottomNav .ls-icon{width:24px;height:24px;display:grid;place-items:center}
#lsBottomNav .ls-icon svg{width:22px;height:22px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#lsBottomNav a:focus-visible{outline:2px solid #0877ed;outline-offset:-3px}
html[data-ls-theme="dark"] #lsBottomNav{background:rgba(19,24,31,.98);border-top-color:#303944;box-shadow:0 -5px 22px rgba(0,0,0,.24)}
html[data-ls-theme="dark"] #lsBottomNav a{color:#aab5c3}
html[data-ls-theme="dark"] #lsBottomNav a.active{color:#69b2ff}
html[data-ls-theme="dark"] #lsBottomNav a.active:before{background:#69b2ff}
        .ls-menu-dialog,.menu-dialog{width:min(430px,100%);height:100dvh;max-height:none;margin:0 0 0 auto;padding:0;border:0;border-radius:26px 0 0 26px;background:#f8faff;color:#14243a;box-shadow:-18px 0 55px rgba(18,39,67,.16);overflow:hidden}
    .ls-menu-dialog[open],.menu-dialog[open]{animation:lsDrawerIn .24s cubic-bezier(.2,.8,.2,1)}
    @keyframes lsDrawerIn{from{transform:translateX(28px);opacity:.6}to{transform:translateX(0);opacity:1}}
    .ls-menu-wrap{height:100%;overflow:auto;padding:26px 22px 34px;font-family:'DM Sans','DM Sans',sans-serif}
    .ls-menu-head{display:flex;align-items:center;justify-content:space-between;padding:5px 2px 24px;border-bottom:1px solid #e4eaf2}
    .ls-menu-brand{display:flex;flex-direction:column;gap:5px}
    .ls-menu-brand strong{font:800 17px/1 'DM Sans',sans-serif;letter-spacing:2.5px;color:#14243a}
    .ls-menu-brand span{font:600 10px/1.3 'DM Sans',sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#8493a7}
    .ls-menu-close{width:40px;height:40px;border:1px solid #e1e8f1;border-radius:13px;background:#fff;color:#53657b;font:400 27px/1 'DM Sans',sans-serif;cursor:pointer}
    .ls-menu-intro{padding:24px 3px 20px}
    .ls-menu-intro strong{display:block;font:800 24px/1.2 'DM Sans',sans-serif;letter-spacing:-.8px;color:#14243a}
    .ls-menu-intro p{margin:7px 0 0;font:500 12px/1.6 'DM Sans',sans-serif;color:#8190a3}
    .ls-menu-group{margin-top:17px}
    .ls-menu-label{display:block;padding:0 4px 9px;font:800 10px/1 'DM Sans',sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#8a98aa}
    .ls-menu-links{display:grid;gap:7px}
    .ls-menu-links a{display:flex;align-items:center;gap:13px;min-height:58px;padding:9px 12px;border:1px solid #e8edf4;border-radius:15px;background:#fff;text-decoration:none;color:#25374d;font:700 13px/1.2 'DM Sans',sans-serif;transition:background .16s ease,border-color .16s ease,transform .16s ease}
    .ls-menu-links a:hover{background:#f1f7ff;border-color:#cfe2fb;transform:translateX(2px)}
    .ls-menu-icon{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border-radius:11px;background:#f0f6fd;color:#1676dc}
    .ls-menu-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .ls-menu-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
    .ls-menu-copy small{font:500 10px/1.3 'DM Sans',sans-serif;color:#8997a8}
    .ls-menu-arrow{margin-left:auto;color:#a0adbc;font:500 20px/1 'DM Sans',sans-serif}
    .ls-menu-footer{margin-top:22px;padding:16px 4px 0;border-top:1px solid #e4eaf2;color:#9aa6b5;font:600 10px/1.5 'DM Sans',sans-serif;letter-spacing:.4px}
    .ls-menu-dialog::backdrop,.menu-dialog::backdrop{background:rgba(13,25,42,.38);backdrop-filter:blur(3px)}
    html[data-ls-theme="dark"] .ls-menu-dialog,html[data-ls-theme="dark"] .menu-dialog{background:#141c27;color:#edf3fb}
    html[data-ls-theme="dark"] .ls-menu-head{border-color:#303d4d}
    html[data-ls-theme="dark"] .ls-menu-brand strong,html[data-ls-theme="dark"] .ls-menu-intro strong{color:#edf3fb}
    html[data-ls-theme="dark"] .ls-menu-brand span,html[data-ls-theme="dark"] .ls-menu-intro p,html[data-ls-theme="dark"] .ls-menu-label{color:#91a1b5}
    html[data-ls-theme="dark"] .ls-menu-close,html[data-ls-theme="dark"] .ls-menu-links a{background:#1c2735;border-color:#303d4d;color:#edf3fb}
    html[data-ls-theme="dark"] .ls-menu-links a:hover{background:#22354a;border-color:#38516d}
    html[data-ls-theme="dark"] .ls-menu-icon{background:#22354a;color:#79baff}
    html[data-ls-theme="dark"] .ls-menu-copy small,html[data-ls-theme="dark"] .ls-menu-arrow,html[data-ls-theme="dark"] .ls-menu-footer{color:#91a1b5}
    @media(min-width:801px) and (pointer:fine){.ls-menu-dialog,.menu-dialog{height:calc(100dvh - 32px);max-height:calc(100dvh - 32px);margin:16px;border-radius:24px}}
    @media(max-width:560px),(pointer:coarse){.ls-menu-dialog,.menu-dialog{width:min(430px,100%);height:100dvh;max-height:100dvh;border-radius:22px 0 0 22px}.ls-menu-wrap{padding:22px 18px 30px}}
    body{padding-bottom:82px!important}.desktop-nav{display:none!important}
    .ls-global-menu-btn{width:46px;height:46px;border:1px solid #dbe5ef;border-radius:50%;background:#fff;color:#102033;display:flex;align-items:center;justify-content:center;padding:0;font-size:21px;line-height:1;margin-left:auto;box-shadow:0 5px 18px rgba(16,32,51,.05)}
    .ls-global-menu-btn:hover{border-color:#0b72e7;color:#0b72e7}
    .ls-menu-dialog{width:min(100%,520px);height:100dvh;max-height:none;margin:0 0 0 auto;border:0;padding:0;background:#fff;color:#102033}.ls-menu-wrap{height:100%;padding:24px 20px;overflow:auto}.ls-menu-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:22px;border-bottom:1px solid #dbe5ef}.ls-menu-head strong{color:#102033;letter-spacing:2.5px;font:800 17px/1 'DM Sans',sans-serif}.ls-menu-close{border:0;background:none;font-size:38px;line-height:1;color:#102033}.ls-menu-links{display:grid;margin-top:4px}.ls-menu-links a{display:flex;align-items:center;justify-content:space-between;padding:21px 2px;border-bottom:1px solid #dbe5ef;text-decoration:none;color:#102033;font:700 18px/1.2 'DM Sans',sans-serif}.ls-menu-links span{color:#7a8da0;font-size:27px}
    html[data-ls-theme="dark"] .ls-menu-dialog,html[data-ls-theme="dark"] #lsMenu{background:#151515!important;color:#fff!important}
    html[data-ls-theme="dark"] .ls-menu-head{border-color:#303030}.ls-menu-dialog{color:#102033}
    html[data-ls-theme="dark"] .ls-menu-head strong,html[data-ls-theme="dark"] .ls-menu-close,html[data-ls-theme="dark"] .ls-menu-links a{color:#fff!important}
    html[data-ls-theme="dark"] .ls-menu-links a{border-color:#303030}html[data-ls-theme="dark"] .ls-menu-links span{color:#aab3be}
    @media(min-width:801px) and (pointer:fine){#lsBottomNav{display:none!important}body{padding-bottom:0!important}.ls-menu-dialog{border-radius:20px;margin:16px;max-height:calc(100dvh - 32px);height:auto}.ls-menu-wrap{min-height:520px}}
    @media(min-width:801px) and (pointer:coarse){#lsBottomNav{display:grid!important}body{padding-bottom:96px!important}.ls-menu-dialog{border-radius:0!important;margin:0!important;max-height:none!important;height:100dvh!important}.ls-menu-wrap{min-height:100%!important}}
    @media(max-width:560px),(pointer:coarse){#lsBottomNav{height:calc(62px + env(safe-area-inset-bottom));bottom:0;width:100%;max-width:none}.ls-menu-wrap{padding:20px}.ls-menu-links a{padding:19px 2px;font-size:17px}}

    /* LinkStory 2026 navigation refresh: keep the existing glass surface intact. */
    :where(.topbar,.top,.header){
      min-height:68px!important;height:auto!important;padding:10px clamp(14px,2.4vw,26px)!important;
      gap:14px!important;border-radius:0 0 22px 22px!important;
      border-bottom:1px solid rgba(139,164,192,.2)!important;
      box-shadow:0 8px 26px rgba(21,43,70,.055)!important;
    }
    :where(.topbar,.top,.header) :where(.back,.menu-btn,.menu-button,.circle,.menu,.icon-btn,.ls-global-menu-btn){
      width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;
      border-radius:14px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;
      border:1px solid rgba(125,151,181,.24)!important;box-shadow:0 3px 10px rgba(21,43,70,.045)!important;
    }
    :where(.topbar,.top,.header) .logo{display:flex!important;align-items:center!important;min-width:0}
    :where(.topbar,.top,.header) .logo img{display:block!important;object-fit:contain}
    :where(.topbar,.top,.header) .menu-btn{position:relative!important;overflow:hidden}
    :where(.topbar,.top,.header) .menu-btn:before{
      content:""!important;position:absolute!important;left:50%!important;top:50%!important;
      width:17px!important;height:12px!important;transform:translate(-50%,-50%)!important;
      border-top:2px solid currentColor!important;border-bottom:2px solid currentColor!important;
    }
    :where(.topbar,.top,.header) .menu-btn:after{
      content:""!important;position:absolute!important;left:50%!important;top:50%!important;
      width:17px!important;transform:translate(-50%,-50%)!important;border-top:2px solid currentColor!important;
    }
    .ls-menu-dialog{
      width:min(430px,100%)!important;height:100dvh!important;max-height:100dvh!important;
      margin:0 0 0 auto!important;padding:0!important;border:1px solid rgba(139,164,192,.2)!important;
      border-right:0!important;border-radius:26px 0 0 26px!important;overflow:hidden!important;
      background:#f7f9fc!important;color:#17263a!important;
      box-shadow:-22px 0 70px rgba(14,34,59,.18)!important;
    }
    .ls-menu-wrap{height:100%!important;overflow:auto!important;padding:26px 22px 34px!important;font-family:'DM Sans',"DM Sans",sans-serif!important}
    .ls-menu-head{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:4px 2px 20px!important;border-bottom:1px solid #e3eaf2!important}
    .ls-menu-brand strong{font:800 16px/1 'DM Sans',sans-serif!important;letter-spacing:2.4px!important;color:#17263a!important}
    .ls-menu-brand span{font:700 9px/1.4 'DM Sans',sans-serif!important;letter-spacing:1.4px!important;text-transform:uppercase!important;color:#8392a5!important}
    .ls-menu-close{width:40px!important;height:40px!important;border:1px solid #e0e7f0!important;border-radius:13px!important;background:#fff!important;color:#52647a!important;font:400 26px/1 'DM Sans',sans-serif!important}
    .ls-menu-intro{padding:23px 3px 18px!important}
    .ls-menu-intro strong{font:800 25px/1.15 'DM Sans',sans-serif!important;letter-spacing:-1px!important;color:#17263a!important}
    .ls-menu-intro p{margin:7px 0 0!important;font:500 12px/1.55 'DM Sans',sans-serif!important;color:#7d8da1!important}
    .ls-menu-group{margin-top:17px!important}
    .ls-menu-label{display:block!important;padding:0 4px 9px!important;font:800 9px/1 'DM Sans',sans-serif!important;letter-spacing:1.6px!important;text-transform:uppercase!important;color:#8b99aa!important}
    .ls-menu-links{display:grid!important;gap:7px!important;margin:0!important}
    .ls-menu-links a{
      min-height:61px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;
      padding:9px 12px!important;border:1px solid #e5ebf3!important;border-radius:16px!important;
      background:#fff!important;color:#24364c!important;text-decoration:none!important;
      font:700 13px/1.2 'DM Sans',sans-serif!important;transition:transform .16s ease,border-color .16s ease,background .16s ease!important;
    }
    .ls-menu-links a:hover{transform:translateY(-1px)!important;border-color:#c9dcf3!important;background:#f2f7fd!important}
    .ls-menu-icon{width:37px!important;height:37px!important;flex:0 0 37px!important;display:grid!important;place-items:center!important;border-radius:12px!important;background:#edf4fc!important;color:#1676dc!important}
    .ls-menu-icon svg{width:19px!important;height:19px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
    .ls-menu-copy{display:flex!important;flex:1!important;flex-direction:column!important;gap:4px!important;min-width:0!important;color:inherit!important;font:700 13px/1.2 'DM Sans',sans-serif!important}
    .ls-menu-copy small{font:500 10px/1.35 'DM Sans',sans-serif!important;color:#8997a8!important}
    .ls-menu-arrow{margin-left:auto!important;color:#9aa8b8!important;font:500 20px/1 'DM Sans',sans-serif!important}
    .ls-menu-footer{margin-top:22px!important;padding:16px 4px 0!important;border-top:1px solid #e3eaf2!important;color:#94a1b0!important;font:700 9px/1.5 'DM Sans',sans-serif!important;letter-spacing:.7px!important}
    html[data-ls-theme="dark"] .ls-menu-dialog{background:#121c28!important;color:#edf4fc!important;border-color:#303e4e!important}
    html[data-ls-theme="dark"] .ls-menu-head,html[data-ls-theme="dark"] .ls-menu-footer{border-color:#2b3949!important}
    html[data-ls-theme="dark"] .ls-menu-brand strong,html[data-ls-theme="dark"] .ls-menu-intro strong{color:#edf4fc!important}
    html[data-ls-theme="dark"] .ls-menu-brand span,html[data-ls-theme="dark"] .ls-menu-intro p,html[data-ls-theme="dark"] .ls-menu-label{color:#91a2b6!important}
    html[data-ls-theme="dark"] .ls-menu-close,html[data-ls-theme="dark"] .ls-menu-links a{background:#1a2736!important;border-color:#304052!important;color:#edf4fc!important}
    html[data-ls-theme="dark"] .ls-menu-links a:hover{background:#21354a!important;border-color:#3b5876!important}
    html[data-ls-theme="dark"] .ls-menu-icon{background:#223a52!important;color:#83bdff!important}
    html[data-ls-theme="dark"] .ls-menu-copy small,html[data-ls-theme="dark"] .ls-menu-arrow,html[data-ls-theme="dark"] .ls-menu-footer{color:#91a2b6!important}
    @media(max-width:560px),(pointer:coarse){.ls-menu-dialog{width:min(430px,100%)!important;border-radius:22px 0 0 22px!important}.ls-menu-wrap{padding:22px 18px 30px!important}}

    /* Unified modern hamburger control — shared by every page using global navigation. */
    :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn),
    button#lsGlobalMenuButton,
    button#openMenu{
      position:relative!important;isolation:isolate!important;flex:0 0 44px!important;
      width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;
      display:inline-flex!important;align-items:center!important;justify-content:center!important;
      padding:0!important;margin-left:auto!important;border:1px solid rgba(117,145,178,.24)!important;
      border-radius:15px!important;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(241,247,253,.92))!important;
      color:#176fc2!important;box-shadow:0 5px 16px rgba(30,65,105,.09),inset 0 1px 0 rgba(255,255,255,.95)!important;
      font-size:0!important;line-height:0!important;cursor:pointer!important;
      -webkit-tap-highlight-color:transparent!important;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease!important;
    }
    :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn)::before,
    button#lsGlobalMenuButton::before,
    button#openMenu::before{
      content:""!important;position:absolute!important;left:50%!important;top:50%!important;
      width:18px!important;height:2px!important;border:0!important;border-radius:3px!important;
      background:currentColor!important;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor!important;
      transform:translate(-50%,-50%)!important;opacity:1!important;
    }
    :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn)::after,
    button#lsGlobalMenuButton::after,
    button#openMenu::after{content:none!important;display:none!important}
    :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn):hover,
    button#lsGlobalMenuButton:hover,button#openMenu:hover{
      transform:translateY(-1px)!important;border-color:rgba(22,119,220,.48)!important;
      background:linear-gradient(145deg,#fff,#eaf4ff)!important;
      box-shadow:0 8px 20px rgba(22,105,190,.14),inset 0 1px 0 #fff!important;
    }
    :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn):active,
    button#lsGlobalMenuButton:active,button#openMenu:active{transform:scale(.95)!important}
    :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn):focus-visible,
    button#lsGlobalMenuButton:focus-visible,button#openMenu:focus-visible{
      outline:3px solid rgba(22,119,220,.28)!important;outline-offset:3px!important
    }
    html[data-ls-theme="dark"] :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn),
    html[data-ls-theme="dark"] button#lsGlobalMenuButton,
    html[data-ls-theme="dark"] button#openMenu{
      background:linear-gradient(145deg,#223247,#182536)!important;color:#a9d3ff!important;
      border-color:rgba(139,177,218,.24)!important;
      box-shadow:0 6px 18px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.045)!important
    }
    html[data-ls-theme="dark"] :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn):hover,
    html[data-ls-theme="dark"] button#lsGlobalMenuButton:hover,
    html[data-ls-theme="dark"] button#openMenu:hover{
      background:linear-gradient(145deg,#29415d,#1d3046)!important;border-color:rgba(130,190,255,.48)!important
    }
    @media(prefers-reduced-motion:reduce){
      :where(.topbar,.top,.header,header) :is(button#openMenu,button.menu-btn,button.menu,button.menu-button,button.ls-global-menu-btn),
      button#lsGlobalMenuButton,button#openMenu{transition:none!important}
    }
  `;
  /* Reuse DM Sans already loaded by the site; avoid a second font-family request. */
  if(!document.getElementById('lsGlobalNavStyle')){const st=document.createElement('style');st.id='lsGlobalNavStyle';st.textContent=css;document.head.appendChild(st)}

  /* Layout do cabeçalho: busca | logo centralizada | notificações | menu. */
  const headerLayoutCss = `
    :where(.topbar,.top,.header){display:grid!important;grid-template-columns:44px minmax(0,1fr) 44px 44px!important;align-items:center!important;column-gap:10px!important}
    :where(.topbar,.top,.header) > .logo{grid-column:2!important;grid-row:1!important;justify-self:center!important;align-self:center!important;margin:0!important}
    :where(.topbar,.top,.header) > .header-actions,:where(.topbar,.top,.header) > .top-actions,:where(.topbar,.top,.header) > .actions{display:contents!important}
    :where(.topbar,.top,.header) #openSearch,:where(.topbar,.top,.header) #lsHeaderSearchShortcut{grid-column:1!important;grid-row:1!important;justify-self:start!important;margin:0!important;flex:0 0 44px!important}
    :where(.topbar,.top,.header) #lsNotificationShortcut,:where(.topbar,.top,.header) a[href="notifications.html"]{grid-column:3!important;grid-row:1!important;justify-self:center!important;margin:0!important;flex:0 0 44px!important}
    :where(.topbar,.top,.header) #openMenu,:where(.topbar,.top,.header) #lsGlobalMenuButton{grid-column:4!important;grid-row:1!important;justify-self:end!important;margin:0!important;flex:0 0 44px!important}
    :where(.topbar,.top,.header) .login{display:none!important}
    #lsHeaderSearchShortcut{width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(125,151,181,.24);border-radius:15px;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(241,247,253,.92));color:#176fc2;box-shadow:0 5px 16px rgba(30,65,105,.09);text-decoration:none}
    #lsHeaderSearchShortcut svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    html[data-ls-theme="dark"] #lsHeaderSearchShortcut{background:#223247!important;color:#a9d3ff!important;border-color:#40546c!important}
    @media(max-width:560px),(pointer:coarse){
      :where(.topbar,.top,.header){grid-template-columns:40px minmax(0,1fr) 40px 40px!important;column-gap:7px!important}
      :where(.topbar,.top,.header) #openSearch,:where(.topbar,.top,.header) #lsHeaderSearchShortcut,:where(.topbar,.top,.header) #lsNotificationShortcut,:where(.topbar,.top,.header) a[href="notifications.html"],:where(.topbar,.top,.header) #openMenu,:where(.topbar,.top,.header) #lsGlobalMenuButton{width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important}
    }
  `;
  if(!document.getElementById('lsHeaderLayoutStyle')){
    const layoutStyle=document.createElement('style');
    layoutStyle.id='lsHeaderLayoutStyle';
    layoutStyle.textContent=headerLayoutCss;
    document.head.appendChild(layoutStyle);
  }

  /* Reader has its own reading controls and must stay completely free of global navigation. */
  if(document.querySelector('.reader-title')) return;
  if(!document.getElementById('lsBottomNav')){
    const path=location.pathname.split('/').pop()||'index.html';
    const active=path==='fy.html'?'fy':path==='library.html'?'library':path==='profile.html'?'profile':'home';
    const nav=document.createElement('nav');nav.id='lsBottomNav';nav.setAttribute('aria-label','Navegação principal');
    nav.innerHTML=`<a href="index.html" class="${active==='home'?'active':''}"><span class="ls-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5h-17z"/><path d="M9 20.5v-6h6v6"/></svg></span><span>Início</span></a><a href="fy.html" class="${active==='fy'?'active':''}"><span class="ls-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/></svg></span><span>Pra você</span></a><a href="messages.html" class="${path==='messages.html'||path==='chat.html'?'active':''}"><span class="ls-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4H12a8 8 0 0 1 8 7.5Z"/><path d="M8 11h8M8 14.5h5"/></svg></span><span>Mensagens</span></a><a href="library.html" class="${active==='library'?'active':''}"><span class="ls-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M4 18.5a2 2 0 0 1 2-2h13M8 8h7M8 11.5h7"/></svg></span><span>Biblioteca</span></a><a href="profile.html" class="${active==='profile'?'active':''}"><span class="ls-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg></span><span>Perfil</span></a>`;
    document.body.appendChild(nav);
  }

  {
    const header=document.querySelector('.topbar,.top,.header');
    const actions=header?.querySelector('.header-actions,.top-actions,.actions')||header;
    if(header&&actions&&!document.getElementById('openSearch')&&!document.getElementById('lsHeaderSearchShortcut')){
      const searchLink=document.createElement('a');
      searchLink.id='lsHeaderSearchShortcut';searchLink.href='explore.html';
      searchLink.setAttribute('aria-label','Buscar');searchLink.title='Buscar';
      searchLink.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>';
      actions.insertBefore(searchLink,actions.firstChild);
    }
  }

  let menu=document.getElementById('menuDialog')||document.getElementById('lsMenu');let opener=document.getElementById('openMenu');
  const menuMarkup=`<div class="ls-menu-wrap">
    <div class="ls-menu-head"><div class="ls-menu-brand"><strong>LINKSTORY</strong><span>Seu universo de histórias</span></div><button class="ls-menu-close" aria-label="Fechar menu">×</button></div>
    <div class="ls-menu-intro"><strong>O que vamos explorar?</strong><p>Encontre histórias, acompanhe suas leituras e cuide do seu espaço.</p></div>
    <section class="ls-menu-group"><span class="ls-menu-label">Comunicação</span><nav class="ls-menu-links">
      <a href="kx-mail.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span><span class="ls-menu-copy">KX Mail<small>Sua caixa de mensagens @kx.mail</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="messages.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 8a3 3 0 0 1 0 6m1 2a5 5 0 0 1 3 4"/></svg></span><span class="ls-menu-copy">Mensagens<small>Converse em particular com seus amigos</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="friends.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m2-12a3 3 0 0 1 0 6m1 2a5 5 0 0 1 3 4"/></svg></span><span class="ls-menu-copy">Amigos<small>Gerencie suas conexões e pedidos</small></span><span class="ls-menu-arrow">›</span></a>\n      <a href="notifications.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span><span class="ls-menu-copy">Notificações<small>Novas amizades, mensagens e mangás</small></span><span class="ls-menu-arrow">›</span></a>
    </nav></section>
    <section class="ls-menu-group"><span class="ls-menu-label">Navegar</span><nav class="ls-menu-links">
      <a href="index.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="m3.5 10 8.5-7 8.5 7v10.5h-17z"/><path d="M9 20.5v-6h6v6"/></svg></span><span class="ls-menu-copy">Início<small>Volte para a página principal</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="fy.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg></span><span class="ls-menu-copy">Pra você<small>Descubra recomendações e novidades</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="explore.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5M10.8 7.5v6.6M7.5 10.8h6.6"/></svg></span><span class="ls-menu-copy">Explorar<small>Encontre novas histórias e criadores</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="library.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="M4 4.5h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M4 18.5a2 2 0 0 1 2-2h13M8 8h7"/></svg></span><span class="ls-menu-copy">Biblioteca<small>Continue lendo e veja seus mangás salvos</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="profile.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg></span><span class="ls-menu-copy">Meu perfil<small>Veja sua página e suas publicações</small></span><span class="ls-menu-arrow">›</span></a>
    </nav></section>
    <section class="ls-menu-group" id="lsCreatorMenu" hidden><span class="ls-menu-label">Área do criador</span><nav class="ls-menu-links">
      <a href="studio.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="M4 19.5 5.5 14 16.8 2.7a2.1 2.1 0 0 1 3 3L8.5 17z"/><path d="m14.8 4.7 4.5 4.5M4 22h16"/></svg></span><span class="ls-menu-copy">Meu Estúdio<small>Organize suas obras e capítulos</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="publish.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 14v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/></svg></span><span class="ls-menu-copy">Publicar mangá<small>Traga uma nova história para o LinkStory</small></span><span class="ls-menu-arrow">›</span></a>
    </nav></section>
    <section class="ls-menu-group"><span class="ls-menu-label">Conta e preferências</span><nav class="ls-menu-links">
      <a href="settings.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L5.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1L9 7.4h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2z"/></svg></span><span class="ls-menu-copy">Configurações<small>Privacidade, conta e preferências</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="login.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg></span><span class="ls-menu-copy">Trocar de conta<small>Entrar com outro acesso</small></span><span class="ls-menu-arrow">›</span></a>
    </nav></section>
    <section class="ls-menu-group"><span class="ls-menu-label">Comunidade</span><nav class="ls-menu-links">
      <a href="regras.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></svg></span><span class="ls-menu-copy">Regras da comunidade<small>Convivência e segurança para todos</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="privacidade.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/></svg></span><span class="ls-menu-copy">Privacidade<small>Saiba como seus dados são tratados</small></span><span class="ls-menu-arrow">›</span></a>
      <a href="termos.html"><span class="ls-menu-icon"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg></span><span class="ls-menu-copy">Termos de uso<small>Condições para usar a plataforma</small></span><span class="ls-menu-arrow">›</span></a>
    </nav></section>
    <div class="ls-menu-footer">LINKSTORY · HISTÓRIAS QUE CONECTAM</div>
  </div>`
  if(!menu){menu=document.createElement('dialog');menu.id='lsMenu';document.body.appendChild(menu)}
  menu.classList.add('ls-menu-dialog');menu.innerHTML=menuMarkup;
  (async()=>{
    const creatorSection=menu.querySelector('#lsCreatorMenu');
    if(!creatorSection)return;
    try{
      const client=window.linkstorySupabase;
      if(!client){creatorSection.hidden=true;return}
      const {data:{user}}=await client.auth.getUser();
      if(!user){creatorSection.hidden=true;return}
      const {data:profile,error}=await client.from('profiles').select('role').eq('id',user.id).maybeSingle();
      creatorSection.hidden=!!error||profile?.role!=='criador';
    }catch{creatorSection.hidden=true}
  })();
  if(!opener){opener=document.createElement('button');opener.id='lsGlobalMenuButton';opener.className='ls-global-menu-btn';opener.setAttribute('aria-label','Abrir menu');opener.innerHTML='☰';const header=document.querySelector('.topbar,.top,.header');if(header)header.appendChild(opener);else{opener.style.position='fixed';opener.style.top='14px';opener.style.right='14px';opener.style.zIndex='1001';document.body.appendChild(opener)}}
  if(opener&&!opener.dataset.lsBound){opener.dataset.lsBound='1';opener.addEventListener('click',()=>{if(typeof menu.showModal==='function'){if(!menu.open)menu.showModal()}else menu.setAttribute('open','')})}
  {
    const page=location.pathname.split('/').filter(Boolean).pop()||'index.html';
    const showNotifications=true;
    const headerActions=document.querySelector('.header-actions,.top-actions,.reader-right,.header .actions');
    const notificationContainer=headerActions||document.querySelector('.header,.topbar,.top');
    const notificationSelector='a[href="notifications.html"],a[href$="/notifications.html"],[aria-label*="notifica" i],[title*="notifica" i],[data-notifications],#lsNotificationShortcut';
    const injected=document.getElementById('lsNotificationShortcut');
    if(!showNotifications){
      if(notificationContainer)notificationContainer.querySelectorAll(notificationSelector).forEach(el=>el.remove());
      if(injected)injected.remove();
    }else{
      const existing=notificationContainer?[...notificationContainer.querySelectorAll(notificationSelector)]:[];
      const unique=[...new Set(existing)];
      const keep=unique[0]||null;
      unique.slice(1).forEach(el=>el.remove());
      if(keep&&injected&&keep!==injected)injected.remove();
      if(!keep&&!injected){
        const notify=document.createElement('a');notify.id='lsNotificationShortcut';notify.href='notifications.html';notify.setAttribute('aria-label','Notificações');notify.title='Notificações';
        notify.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
        notify.style.cssText='position:relative;flex:0 0 42px;width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;margin-left:auto;border:1px solid #dbe5ef;border-radius:14px;background:#fff;color:#1676dc;box-shadow:0 3px 10px #1020330c;text-decoration:none;z-index:2';
        notify.querySelector('svg').style.cssText='width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round';
        if(headerActions){headerActions.insertBefore(notify,opener&&opener.parentElement===headerActions?opener:null)}
        else if(opener&&opener.parentElement){opener.parentElement.insertBefore(notify,opener)}
        else {notify.style.position='fixed';notify.style.top='14px';notify.style.right='68px';document.body.appendChild(notify)}
      }
    }
  }
  const close=menu.querySelector('.ls-menu-close');if(close&&!close.dataset.lsBound){close.dataset.lsBound='1';close.addEventListener('click',()=>{if(typeof menu.close==='function')menu.close();else menu.removeAttribute('open')})}
  if(!menu.dataset.lsBound){menu.dataset.lsBound='1';menu.addEventListener('click',e=>{if(e.target===menu){if(typeof menu.close==='function')menu.close();else menu.removeAttribute('open')}})}
})();