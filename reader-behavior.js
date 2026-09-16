(()=>{
  if(!document.querySelector('.reader-title')) return;
  const header=document.querySelector('.top');
  if(!header) return;
  let lastY=window.scrollY||0;
  let locked=false;
  const update=()=>{
    const y=window.scrollY||0;
    const delta=y-lastY;
    if(Math.abs(delta)<3){locked=false;return}
    if(delta>0 && y>24) header.classList.add('reader-hidden');
    else if(delta<0) header.classList.remove('reader-hidden');
    if(y<=8) header.classList.remove('reader-hidden');
    lastY=y;
    locked=false;
  };
  window.addEventListener('scroll',()=>{if(!locked){locked=true;requestAnimationFrame(update)}},{passive:true});
})();
