(()=>{
  const src="/assets/linkstory-wordmark.svg?v=2";
  const add=(rel,href)=>{const x=document.createElement("link");x.rel=rel;x.href=href;document.head.appendChild(x)};
  add("icon",src); add("apple-touch-icon",src);
  const style=document.createElement("style");
  style.textContent=`
    .logo,.brand,.menu-logo,.menu-brand,.footer-logo{font-size:0!important;letter-spacing:0!important;color:transparent!important;white-space:nowrap!important;}
    .linkstory-exact-logo{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;}
    .logo,.brand{display:inline-flex!important;align-items:center!important;width:clamp(145px,18vw,205px)!important;height:44px!important;}
    .menu-logo,.menu-brand,.footer-logo{display:inline-flex!important;align-items:center!important;width:190px!important;height:38px!important;}
    @media(max-width:600px){.logo,.brand{width:150px!important;height:38px!important}.menu-logo,.menu-brand,.footer-logo{width:180px!important;height:34px!important}}
  `;
  document.head.appendChild(style);
  const selectors=".logo,.brand,.menu-logo,.menu-brand,.footer-logo";
  document.querySelectorAll(selectors).forEach(el=>{
    el.querySelectorAll(".brand-mark,span,b,img").forEach(n=>n.remove());
    const img=document.createElement("img");
    img.className="linkstory-exact-logo";
    img.src=src;
    img.alt="LinkStory";
    img.setAttribute("aria-hidden","true");
    el.appendChild(img);
  });
})();
