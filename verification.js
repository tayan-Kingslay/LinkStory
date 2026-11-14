/* LinkStory · selos de verificação. As imagens podem ser substituídas mantendo os nomes dos arquivos. */
(function(){
 'use strict';
 if(window.LinkStoryVerification)return;
 var BADGES={
  influencer:{src:'assets/badges/badge-influencer.webp',label:'Influenciador verificado'},
  kairox:{src:'assets/badges/badge-kairox.webp',label:'Membro oficial Kairox'}
 };
 function valid(type){return typeof type==='string'&&Object.prototype.hasOwnProperty.call(BADGES,type)}
 function label(type){return valid(type)?BADGES[type].label:''}
 var style=document.createElement('style');
 style.textContent='.ls-vbadge{position:relative;isolation:isolate;display:inline-flex;flex:none;box-sizing:border-box;width:20px!important;height:20px!important;min-width:20px!important;min-height:20px!important;max-width:20px!important;max-height:20px!important;margin-left:5px;vertical-align:-.22em;cursor:help;line-height:0;-webkit-tap-highlight-color:transparent;filter:saturate(1.55) brightness(1.12) drop-shadow(0 0 4px rgba(65,155,255,.55))}.ls-vbadge img{position:relative;z-index:1;display:block!important;box-sizing:border-box;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;border-radius:0;background:none;margin:0!important;padding:0!important}.ls-vbadge--lg{width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;max-width:28px!important;max-height:28px!important}.ls-vbadge--lg{width:32px;height:32px;margin-left:0}.ls-vbadge:after{content:"";position:absolute;z-index:2;inset:-35% -65%;pointer-events:none;background:linear-gradient(110deg,transparent 38%,rgba(255,255,255,0) 43%,rgba(255,255,255,.95) 50%,rgba(255,255,255,0) 57%,transparent 63%);transform:translateX(-115%) rotate(8deg);animation:lsBadgeShine 3.8s ease-in-out infinite;mix-blend-mode:screen}.ls-vbadge--kairox{filter:saturate(1.8) brightness(1.18) drop-shadow(0 0 6px rgba(255,193,70,.62))}.ls-vbadge--influencer{filter:saturate(1.75) brightness(1.16) drop-shadow(0 0 6px rgba(55,155,255,.65))}@keyframes lsBadgeShine{0%,62%{transform:translateX(-115%) rotate(8deg);opacity:0}70%{opacity:1}90%,100%{transform:translateX(115%) rotate(8deg);opacity:0}}@media(prefers-reduced-motion:reduce){.ls-vbadge:after{animation:none;display:none}}.ls-vtip{position:fixed;z-index:2147483000;max-width:calc(100vw - 24px);padding:7px 10px;border-radius:9px;background:#102033;color:#fff;font:700 12px/1.2 Inter,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);pointer-events:none}';
 (document.head||document.documentElement).appendChild(style);
 function element(type,opts){
  if(!valid(type))return null;
  var cfg=BADGES[type],span=document.createElement('span'),img=document.createElement('img');
  span.className='ls-vbadge ls-vbadge--'+type+(opts&&opts.size==='lg'?' ls-vbadge--lg':'');
  span.setAttribute('role','img');span.setAttribute('aria-label',cfg.label);span.title=cfg.label;span.dataset.label=cfg.label;
  img.src=cfg.src;img.alt='';img.width=20;img.height=20;img.decoding='async';img.loading='lazy';
  img.onerror=function(){if(span.parentNode)span.remove()};
  span.appendChild(img);return span;
 }
 function html(type,opts){
  if(!valid(type))return '';
  var cfg=BADGES[type],size=opts&&opts.size==='lg'?' ls-vbadge--lg':'';
  return '<span class="ls-vbadge ls-vbadge--'+type+size+'" role="img" aria-label="'+cfg.label+'" title="'+cfg.label+'" data-label="'+cfg.label+'"><img src="'+cfg.src+'" alt="" width="20" height="20" decoding="async" loading="lazy"></span>';
 }
 function decorate(node,type){
  if(!node)return node;
  Array.from(node.children||[]).filter(function(child){return child.classList&&child.classList.contains('ls-vbadge')}).forEach(function(child){child.remove()});
  var badge=element(type);if(badge)node.appendChild(badge);return node;
 }
 var tip=null,timer=0;
 document.addEventListener('click',function(ev){
  var target=ev.target&&ev.target.closest?ev.target.closest('.ls-vbadge'):null;
  if(tip){tip.remove();tip=null;clearTimeout(timer)}
  if(!target)return;
  ev.preventDefault();ev.stopPropagation();
  tip=document.createElement('div');tip.className='ls-vtip';tip.setAttribute('role','status');tip.textContent=target.dataset.label||target.title||'';
  document.body.appendChild(tip);
  var rect=target.getBoundingClientRect(),left=Math.max(12,Math.min(rect.left+rect.width/2-tip.offsetWidth/2,window.innerWidth-tip.offsetWidth-12));
  var top=rect.top-tip.offsetHeight-8;if(top<8)top=rect.bottom+8;
  tip.style.left=left+'px';tip.style.top=top+'px';
  timer=setTimeout(function(){if(tip){tip.remove();tip=null}},2200);
 },true);
 window.LinkStoryVerification={BADGES:BADGES,isValid:valid,label:label,element:element,html:html,decorate:decorate};
})();