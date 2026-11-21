/* LinkStory — transições entre páginas internas; não interfere em âncoras, downloads ou links externos. */
(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reduced)return;
  const page=location.pathname.split('/').filter(Boolean).pop()||'index.html';
  if(page==='reader.html'||page==='reader-experience.html')return;
  const overlay=document.createElement('div');
  overlay.id='lsPageTransition';
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML='<div class="ls-transition-inner"><img src="assets/linkstory-logo.svg" alt=""><span class="ls-transition-track"></span></div>';
  const mount=()=>{if(!document.body)return;document.body.appendChild(overlay);document.body.classList.add('ls-page-enter')};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  let navigating=false;
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download')||link.hasAttribute('data-no-transition'))return;
    let destination;
    try{destination=new URL(link.href,location.href)}catch{return}
    if(destination.origin!==location.origin||destination.pathname===location.pathname&&destination.search===location.search)return;
    if(destination.hash&&destination.pathname===location.pathname&&destination.search===location.search)return;
    if(/^mailto:|^tel:/i.test(link.getAttribute('href')||''))return;
    if(navigating)return;
    navigating=true;
    event.preventDefault();
    overlay.classList.add('is-active');
    window.setTimeout(()=>{location.href=destination.href},180);
  });
  window.addEventListener('pageshow',()=>{navigating=false;overlay.classList.remove('is-active')});
})();
