/* Remove any remaining interactive 3D option from the public UI. */
(()=>{
  const is3D=s=>/\b3\s*[-.]?\s*d\b/i.test(String(s||''));
  document.querySelectorAll('a,button,label,[role="button"],option').forEach(el=>{
    if(is3D(el.textContent)||is3D(el.getAttribute('aria-label'))||is3D(el.getAttribute('title'))||is3D(el.getAttribute('value'))) el.remove();
  });
})();
