(()=>{
  const style=document.createElement('style');
  style.id='linkstory-menu-button-style';
  style.textContent=`
    #openMenu,#lsGlobalMenuButton{
      position:relative!important;isolation:isolate!important;display:grid!important;place-items:center!important;
      flex:0 0 44px!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;
      margin-left:auto!important;padding:0!important;border:1px solid rgba(11,114,231,.2)!important;border-radius:15px!important;
      background:linear-gradient(145deg,#fff 0%,#f1f7ff 100%)!important;color:#0b72e7!important;
      box-shadow:0 7px 20px rgba(16,55,96,.10),inset 0 1px 0 rgba(255,255,255,.9)!important;
      font-size:0!important;line-height:0!important;cursor:pointer!important;appearance:none!important;-webkit-appearance:none!important;
      transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease!important;-webkit-tap-highlight-color:transparent
    }
    #openMenu::before,#lsGlobalMenuButton::before{
      content:""!important;position:absolute!important;display:block!important;width:19px!important;height:2px!important;
      border:0!important;border-radius:99px!important;background:currentColor!important;
      box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor!important;transition:transform .2s ease,box-shadow .2s ease!important
    }
    #openMenu::after,#lsGlobalMenuButton::after{content:""!important;position:absolute!important;display:block!important;width:19px!important;height:2px!important;border-radius:99px!important;background:transparent!important;transition:transform .2s ease!important}
    #openMenu.is-open::before,#lsGlobalMenuButton.is-open::before{box-shadow:none!important;transform:rotate(45deg)!important}
    #openMenu.is-open::after,#lsGlobalMenuButton.is-open::after{background:currentColor!important;transform:rotate(-45deg)!important}
    #openMenu:hover,#lsGlobalMenuButton:hover{border-color:rgba(11,114,231,.45)!important;box-shadow:0 10px 25px rgba(11,114,231,.16)!important;transform:translateY(-1px)}
    #openMenu:active,#lsGlobalMenuButton:active{transform:scale(.96)!important}
    #openMenu:focus-visible,#lsGlobalMenuButton:focus-visible{outline:3px solid rgba(11,114,231,.28)!important;outline-offset:3px!important}
    html[data-ls-theme="dark"] #openMenu,html[data-ls-theme="dark"] #lsGlobalMenuButton{color:#83bdff!important;background:linear-gradient(145deg,#1b2a3c,#142235)!important;border-color:rgba(131,189,255,.24)!important;box-shadow:0 8px 22px rgba(0,0,0,.24)!important}
    @media(max-width:600px){#openMenu,#lsGlobalMenuButton{width:42px!important;height:42px!important;flex-basis:42px!important;min-width:42px!important;min-height:42px!important;border-radius:14px!important}}
    @media(prefers-reduced-motion:reduce){#openMenu,#lsGlobalMenuButton,#openMenu::before,#openMenu::after,#lsGlobalMenuButton::before,#lsGlobalMenuButton::after{transition:none!important}}
  `;
  document.head.appendChild(style);
  const button=document.getElementById('openMenu')||document.getElementById('lsGlobalMenuButton');
  const dialog=document.getElementById('menuDialog')||document.getElementById('lsMenu');
  if(!button||!dialog)return;
  button.addEventListener('click',()=>button.classList.add('is-open'));
  const reset=()=>button.classList.remove('is-open');
  dialog.addEventListener('close',reset);
  dialog.addEventListener('cancel',reset);
})();