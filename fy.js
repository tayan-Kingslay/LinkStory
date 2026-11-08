(()=>{'use strict';
const sb=()=>linkstorySupabase,$=id=>document.getElementById(id);
const state={user:null,profile:null,tab:'for-you',offset:0,limit:20,loading:false,more:true,posts:[],queue:[],queueCursor:0,activeCommentPost:null,reportsEnabled:false};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Agora':d.toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2800)}
function avatar(p){return p?.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="">':esc((p?.display_name||p?.username||'LS').slice(0,2).toUpperCase())}
async function init(){try{const{data,error}=await sb().auth.getUser();if(error)throw error;state.user=data.user||null;if(state.user){const p=await sb().from('profiles').select('id,username,display_name,avatar_url,role').eq('id',state.user.id).maybeSingle();if(p.error)throw p.error;state.profile=p.data||null;const reportProbe=await sb().from('content_reports').select('id',{head:true,count:'exact'});state.reportsEnabled=!reportProbe.error;$('myAvatar').innerHTML=avatar(state.profile)}else{$('myAvatar').textContent='LS';$('openComposer').textContent='Entre para publicar na comunidade';$('composer').querySelectorAll('button').forEach(b=>b.disabled=true)}await loadFeed(true)}catch(e){console.error('FY init:',e);$('feedStatus').textContent='Não foi possível conectar ao FY. Recarregue a página.'}}
function setTab(tab){state.tab=tab;document.querySelectorAll('[data-feed]').forEach(b=>b.classList.toggle('active',b.dataset.feed===tab));loadFeed(true)}
async function loadFeed(reset=false){
 if(state.loading)return;
 if(reset){state.offset=0;state.queue=[];state.queueCursor=0;state.posts=[];state.more=true;$('feedList').replaceChildren();$('feedStatus').hidden=false;$('feedStatus').className='loading';$('feedStatus').textContent='Preparando recomendações…'}
 if(!reset&&state.tab==='for-you'&&state.queueCursor<state.queue.length){renderQueuePage();return}
 if(!state.more&&!reset)return;
 state.loading=true;$('loadMore').disabled=true;
 try{
  let rows=[],data=[];
  if(state.tab==='for-you'){
   const result=await sb().from('posts').select('id,author_id,body,post_type,idea_title,media_url,media_type,thumbnail_url,created_at,profiles:author_id(id,username,display_name,avatar_url)').neq('post_type','story').order('created_at',{ascending:false}).range(0,199);
   if(result.error)throw result.error;data=result.data||[];rows=data;
  }else{
   let followedIds=[];
   if(state.tab==='following'){
    if(!state.user)followedIds=[];
    else{const f=await sb().from('follows').select('following_id').eq('follower_id',state.user.id);if(f.error)throw f.error;followedIds=(f.data||[]).map(x=>x.following_id)}
   }
   if(state.tab==='following'&&!followedIds.length){rows=[];data=[]}
   else{
    let q=sb().from('posts').select('id,author_id,body,post_type,idea_title,media_url,media_type,thumbnail_url,created_at,profiles:author_id(id,username,display_name,avatar_url)').neq('post_type','story').order('created_at',{ascending:false}).range(state.offset,state.offset+state.limit-1);
    if(state.tab==='ideas')q=q.eq('post_type','idea');
    if(state.tab==='following')q=q.in('author_id',followedIds);
    const result=await q;if(result.error)throw result.error;data=result.data||[];rows=data;
   }
  }
  const ids=rows.map(p=>p.id);let likes=[],comments=[],mine=[];
  if(ids.length){
   const [l,c,m]=await Promise.all([
    sb().from('post_likes').select('post_id').in('post_id',ids),
    sb().from('comments').select('post_id').in('post_id',ids),
    state.user?sb().from('post_likes').select('post_id').eq('user_id',state.user.id).in('post_id',ids):Promise.resolve({data:[],error:null})
   ]);
   if(l.error)throw l.error;if(c.error)throw c.error;if(m.error)throw m.error;likes=l.data||[];comments=c.data||[];mine=m.data||[];
  }
  const counts=arr=>arr.reduce((a,x)=>(a[x.post_id]=(a[x.post_id]||0)+1,a),{});
  const lc=counts(likes),cc=counts(comments),liked=new Set(mine.map(x=>x.post_id));
  rows=rows.map(p=>({...p,likes:lc[p.id]||0,comments:cc[p.id]||0,liked:liked.has(p.id)}));
  if(state.tab==='for-you'){
   const follows=state.user?await sb().from('follows').select('following_id').eq('follower_id',state.user.id):{data:[],error:null};
   if(follows.error)throw follows.error;
   const followed=new Set((follows.data||[]).map(x=>x.following_id));
   const now=Date.now();
   rows.forEach(p=>{
    const ageHours=Math.max(0,(now-new Date(p.created_at).getTime())/3600000);
    const freshness=30*Math.exp(-ageHours/42);
    const engagement=Math.min(26,p.likes*1.6+p.comments*2.8);
    const network=followed.has(p.author_id)?11:0;
    const mediaBonus=p.media_url?1.5:0;
    p._recommendationScore=freshness+engagement+network+mediaBonus+(p.post_type==='idea'?2:0)+(p.author_id===state.user?.id?-100:0);
   });
   const remaining=rows.slice(),authorCounts=new Map(),ranked=[];
   while(remaining.length){
    remaining.sort((a,b)=>(b._recommendationScore-(authorCounts.get(b.author_id)||0)*5)-(a._recommendationScore-(authorCounts.get(a.author_id)||0)*5));
    const next=remaining.shift();ranked.push(next);authorCounts.set(next.author_id,(authorCounts.get(next.author_id)||0)+1);
   }
   state.queue=ranked;state.queueCursor=0;state.more=ranked.length>0;
   $('feedStatus').hidden=true;
   if(!ranked.length){$('feedStatus').hidden=false;$('feedStatus').className='empty';$('feedStatus').innerHTML='<strong>Ainda não há publicações.</strong>Quando a comunidade publicar, elas aparecerão aqui.';$('loadMore').hidden=true}
   else renderQueuePage();
  }else{
   state.posts=state.posts.concat(rows);state.offset+=data.length;state.more=data.length===state.limit;
   $('feedStatus').hidden=true;renderPosts(rows);$('loadMore').hidden=!state.more;
   if(!state.posts.length){$('feedStatus').hidden=false;$('feedStatus').className='empty';$('feedStatus').innerHTML=state.tab==='following'?'<strong>Seu FY está esperando sua rede.</strong>Siga criadores para ver as publicações deles aqui.':'<strong>Ainda não há ideias publicadas.</strong>Quando alguém compartilhar uma ideia, ela aparecerá aqui.'}
  }
 }catch(e){console.error('FY load:',e);$('feedStatus').hidden=false;$('feedStatus').textContent='Erro ao carregar o feed: '+(e.message||'tente novamente');$('loadMore').hidden=true}
 finally{state.loading=false;$('loadMore').disabled=false}
}
function renderQueuePage(){
 const page=state.queue.slice(state.queueCursor,state.queueCursor+state.limit);
 state.queueCursor+=page.length;state.posts=state.posts.concat(page);renderPosts(page);
 state.more=state.queueCursor<state.queue.length;$('loadMore').hidden=!state.more;
 if(!state.posts.length){$('feedStatus').hidden=false;$('feedStatus').className='empty';$('feedStatus').innerHTML='<strong>Ainda não há publicações.</strong>Quando a comunidade publicar, elas aparecerão aqui.'}
}
function postBodyMarkup(body){
 const text=String(body||'');
 if(text.length<=280)return '<p class="body">'+esc(text)+'</p>';
 return '<div class="body post-body is-collapsed">'+esc(text)+'</div><button class="read-more" type="button" data-expand-post aria-expanded="false">Ler tudo</button>';
}
function renderPosts(posts){const box=$('feedList');posts.forEach(p=>{const el=document.createElement('article');el.className='post'+(p.author_id===state.user?.id?' own':'');el.dataset.id=p.id;const name=p.profiles?.display_name||p.profiles?.username||'Usuário';const handle=p.profiles?.username?'@'+p.profiles.username:'LinkStory';const kind=p.post_type==='idea'?'IDEIA PROCURANDO CRIADOR':p.post_type==='video'?'VÍDEO':'PUBLICAÇÃO';const media=p.media_url?(p.media_type==='video'?'<video class="media" controls playsinline preload="metadata" src="'+esc(p.media_url)+'"></video>':'<img class="media" loading="lazy" src="'+esc(p.media_url)+'" alt="Mídia da publicação">'):'';el.innerHTML='<header class="post-head"><div class="avatar">'+avatar(p.profiles)+'</div><div class="author"><strong>'+esc(name)+'</strong><small>'+esc(handle)+' · '+date(p.created_at)+'</small><span class="kind">'+kind+'</span></div>'+(state.reportsEnabled?'<button class="more" data-action="report" aria-label="Denunciar publicação">⋯</button>':'')+'</header>'+(p.idea_title?'<div class="idea-title">'+esc(p.idea_title)+'</div>':'')+(p.body?postBodyMarkup(p.body):'')+media+'<div class="post-stats"><span>'+p.likes+' curtida(s)</span><span>'+p.comments+' comentário(s)</span></div><div class="actions"><button class="action '+(p.liked?'liked':'')+'" data-action="like"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.1 4.7 4.7 0 0 1 8.8 2.1Z"/></svg></span><span class="action-label">'+(p.liked?'Curtido':'Curtir')+'</span></button><button class="action" data-action="comment"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3A7.5 7.5 0 1 1 20 11.5Z"/></svg></span><span class="action-label">Comentar</span></button><button class="action" data-action="share"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg></span><span class="action-label">Compartilhar</span></button><button class="action" data-action="follow"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M19 8v6m-3-3h6"/></svg></span><span class="action-label">'+(p.author_id===state.user?.id?'Você':'Seguir')+'</span></button>'+(p.author_id===state.user?.id?'<button class="action delete-action" data-action="delete"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg></span><span class="action-label">Apagar</span></button>':'')+'</div>';box.appendChild(el)})}
async function uploadMedia(file){if(!state.user)throw new Error('Entre na sua conta para publicar.');if(file.size>25*1024*1024)throw new Error('O arquivo ultrapassa o limite de 25 MB.');const video=file.type.startsWith('video/'),image=file.type.startsWith('image/');if(!video&&!image)throw new Error('Escolha uma imagem ou vídeo compatível.');const ext=(file.name.split('.').pop()|| (video?'mp4':'jpg')).toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';const path='posts/'+state.user.id+'/'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))+'.'+ext;const{error}=await sb().storage.from('linkstory-media').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return{url:sb().storage.from('linkstory-media').getPublicUrl(path).data.publicUrl,type:video?'video':'image',path}}
async function publishPost(e){e.preventDefault();if(!state.user)return toast('Entre na sua conta para publicar.');const type=$('postType').value,body=$('postBody').value.trim(),idea=$('ideaTitle').value.trim(),file=$('postMedia').files?.[0];if(!body&&!file)return toast('Escreva algo ou escolha uma mídia.');if(type==='idea'&&!idea)return toast('Dê um título para sua ideia.');if(type==='video'&&(!file||!file.type.startsWith('video/')))return toast('Escolha um arquivo de vídeo para este tipo de publicação.');const b=$('publishPost');b.disabled=true;b.textContent='Publicando…';let uploaded=null;try{if(file)uploaded=await uploadMedia(file);const row={author_id:state.user.id,body,post_type:type,idea_title:type==='idea'?idea:null,media_url:uploaded?.url||null,media_type:uploaded?.type||null};const{error}=await sb().from('posts').insert(row);if(error)throw error;$('composeDialog').close();$('composeForm').reset();$('ideaTitleField').hidden=true;$('mediaPreview').replaceChildren();toast('Publicação enviada!');setTab(type==='idea'?'ideas':'for-you')}catch(e){console.error('FY publish:',e);if(uploaded?.path)await sb().storage.from('linkstory-media').remove([uploaded.path]).catch(()=>{});toast(e.message||'Não foi possível publicar.')}finally{b.disabled=false;b.textContent='Publicar'}}
async function toggleLike(postId,button){if(!state.user)return toast('Entre na sua conta para curtir.');const p=state.posts.find(x=>x.id===postId);if(!p)return;button.disabled=true;try{if(p.liked){const{error}=await sb().from('post_likes').delete().eq('post_id',postId).eq('user_id',state.user.id);if(error)throw error;p.liked=false;p.likes=Math.max(0,p.likes-1)}else{const{error}=await sb().from('post_likes').insert({post_id:postId,user_id:state.user.id});if(error)throw error;p.liked=true;p.likes++}const card=button.closest('.post');button.classList.toggle('liked',p.liked);button.textContent=p.liked?'♥ Curtido':'♡ Curtir';card.querySelector('.post-stats').innerHTML='<span>'+p.likes+' curtida(s)</span><span>'+p.comments+' comentário(s)</span>'}catch(e){toast(e.message||'Não foi possível curtir.')}finally{button.disabled=false}}
async function lockCommentsBackground(){
 state.commentsScrollY=window.scrollY||window.pageYOffset||0;
 document.body.classList.add('comments-open');
 document.body.style.top='-'+state.commentsScrollY+'px';
}
function unlockCommentsBackground(){
 if(!document.body.classList.contains('comments-open'))return;
 document.body.classList.remove('comments-open');
 document.body.style.top='';
 window.scrollTo(0,state.commentsScrollY||0);
}
function openComments(postId){
 state.activeCommentPost=postId;
 $('commentComposeAvatar').innerHTML=avatar(state.profile);
 const post=state.posts.find(x=>x.id===postId);
 const context=$('commentPostContext');
 context.innerHTML=post?'<div class="comment-post-author"><div class="avatar">'+avatar(post.profiles)+'</div><div><strong>'+esc(post.profiles?.display_name||post.profiles?.username||'Usuário')+'</strong><small>'+esc(post.profiles?.username?'@'+post.profiles.username:'LinkStory')+' · '+date(post.created_at)+'</small></div></div>'+(post.idea_title?'<h3>'+esc(post.idea_title)+'</h3>':'')+(post.body?'<p>'+esc(post.body)+'</p>':'')+(post.media_url?(post.media_type==='video'?'<video controls playsinline preload="metadata" src="'+esc(post.media_url)+'"></video>':'<img src="'+esc(post.media_url)+'" alt="Mídia da publicação">'):''):'';
 const box=$('commentList');box.textContent='Carregando comentários…';
 $('commentBody').value='';lockCommentsBackground();$('commentsDialog').showModal();
 try{
  const{data,error}=await sb().from('comments').select('id,body,created_at,profiles:author_id(display_name,username,avatar_url)').eq('post_id',postId).order('created_at',{ascending:true});
  if(error)throw error;box.replaceChildren();
  if(!data?.length){box.innerHTML='<div class="comments-empty"><strong>Comece a conversa</strong><span>Seja a primeira pessoa a comentar nesta publicação.</span></div>';return}
  data.forEach(c=>appendComment(c));
 }catch(e){box.textContent='Não foi possível carregar os comentários. '+e.message}
}
function appendComment(c){
 const box=$('commentList');box.querySelector('.comments-empty')?.remove();
 const el=document.createElement('article');el.className='comment';
 el.innerHTML='<div class="comment-avatar">'+avatar(c.profiles)+'</div><div class="comment-content"><div class="comment-meta"><strong>'+esc(c.profiles?.display_name||c.profiles?.username||'Usuário')+'</strong><small>'+date(c.created_at)+'</small></div><p>'+esc(c.body)+'</p></div>';
 box.appendChild(el);
}
async function sendComment(e){
 e.preventDefault();if(!state.user)return toast('Entre na sua conta para comentar.');
 const body=$('commentBody').value.trim();if(!body)return;
 const b=$('sendComment');b.disabled=true;b.textContent='Enviando…';
 try{
  const{error}=await sb().from('comments').insert({post_id:state.activeCommentPost,author_id:state.user.id,body});
  if(error)throw error;
  appendComment({body,created_at:new Date().toISOString(),profiles:state.profile});
  $('commentBody').value='';
  const post=state.posts.find(x=>x.id===state.activeCommentPost);
  if(post){post.comments=(post.comments||0)+1;const card=document.querySelector('.post[data-id="'+state.activeCommentPost+'"]');const stats=card?.querySelector('.post-stats');if(stats)stats.innerHTML='<span>'+post.likes+' curtida(s)</span><span>'+post.comments+' comentário(s)</span>'}
  $('commentList').scrollTop=$('commentList').scrollHeight;
  toast('Comentário publicado.');
 }catch(e){toast(e.message||'Não foi possível comentar.')}
 finally{b.disabled=false;b.textContent='Responder'}
}
async function followAuthor(postId,button){const p=state.posts.find(x=>x.id===postId);if(!state.user)return toast('Entre na sua conta para seguir criadores.');if(!p||p.author_id===state.user.id)return;button.disabled=true;try{const{error}=await sb().from('follows').insert({follower_id:state.user.id,following_id:p.author_id});if(error&&error.code!=='23505')throw error;button.textContent='✓ Seguindo';toast('Agora você segue este criador.')}catch(e){toast(e.message||'Não foi possível seguir.')}finally{button.disabled=false}}
async function deletePost(postId,card,button){if(!state.user)return toast('Entre na sua conta para apagar.');const post=state.posts.find(x=>x.id===postId);if(!post||post.author_id!==state.user.id)return toast('Você só pode apagar suas próprias publicações.');if(!confirm('Apagar esta publicação permanentemente?'))return;button.disabled=true;button.textContent='Apagando…';try{const{error}=await sb().from('posts').delete().eq('id',postId).eq('author_id',state.user.id);if(error)throw error;if(post.media_url){const marker='/storage/v1/object/public/linkstory-media/';const at=post.media_url.indexOf(marker);if(at>=0){const path=decodeURIComponent(post.media_url.slice(at+marker.length));if(path.startsWith('posts/'+state.user.id+'/')){const cleanup=await sb().storage.from('linkstory-media').remove([path]);if(cleanup.error)console.warn('Mídia da publicação removida do feed, mas não do armazenamento:',cleanup.error)}}}state.posts=state.posts.filter(x=>x.id!==postId);card.remove();toast('Publicação apagada.');if(!state.posts.length)await loadFeed(true)}catch(e){button.disabled=false;button.textContent='⌫ Apagar';toast(e.message||'Não foi possível apagar a publicação.')}}
async function reportPost(postId){if(!state.reportsEnabled)return toast('Denúncias serão ativadas junto com a proteção do banco.');if(!state.user)return toast('Entre na sua conta para denunciar.');if(!window.LinkStoryGuard)return toast('Sistema de denúncia indisponível.');const choice=prompt('Motivo da denúncia — digite o número:\n1 Spam\n2 Assédio\n3 Discurso de ódio\n4 Conteúdo sexual\n5 Segurança de menores\n6 Violência\n7 Automutilação\n8 Direitos autorais\n9 Privacidade\n10 Outro');const reasons=['spam','harassment','hate','sexual_content','minor_safety','violence','self_harm','copyright','privacy','other'];const reason=reasons[Number(choice)-1];if(!reason)return toast('Escolha um motivo válido.');try{await window.LinkStoryGuard.submitReport({target_type:'post',target_id:postId,reason,details:''});toast('Denúncia enviada para análise.')}catch(e){toast(e.message||'Não foi possível denunciar.')}}
document.querySelectorAll('[data-feed]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.feed)));
$('openComposer').onclick=()=>{if(!state.user)return location.href='login.html';$('composeDialog').showModal()};
$('quickPost').onclick=()=>{if(!state.user)return location.href='login.html';$('postType').value='post';$('ideaTitleField').hidden=true;$('composeDialog').showModal()};
$('quickIdea').onclick=()=>{if(!state.user)return location.href='login.html';$('postType').value='idea';$('ideaTitleField').hidden=false;$('composeDialog').showModal()};
$('quickVideo').onclick=()=>{if(!state.user)return location.href='login.html';$('postType').value='video';$('composeDialog').showModal()};
$('postType').onchange=()=>{$('ideaTitleField').hidden=$('postType').value!=='idea'};
$('postMedia').onchange=()=>{const f=$('postMedia').files?.[0],box=$('mediaPreview');box.textContent=f?f.name+' · '+Math.round(f.size/1024/1024*10)/10+' MB':''};
$('composeForm').addEventListener('submit',publishPost);$('commentForm').addEventListener('submit',sendComment);
$('commentsDialog').addEventListener('close',unlockCommentsBackground);

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('loadMore').onclick=()=>loadFeed(false);
$('feedList').addEventListener('click',async e=>{
 const expand=e.target.closest('[data-expand-post]');
 if(expand){const card=expand.closest('.post'),body=card?.querySelector('.post-body');if(!body)return;const expanded=body.classList.toggle('is-expanded');body.classList.toggle('is-collapsed',!expanded);expand.textContent=expanded?'Mostrar menos':'Ler tudo';expand.setAttribute('aria-expanded',String(expanded));return}
 const b=e.target.closest('[data-action]');if(!b)return;const card=b.closest('.post'),id=card?.dataset.id;if(!id)return;switch(b.dataset.action){case'like':return toggleLike(id,b);case'comment':return openComments(id);case'share':try{await navigator.clipboard.writeText(location.origin+'/fy.html?post='+id);toast('Link da publicação copiado.')}catch{toast('Não foi possível copiar o link neste navegador.')}return;case'follow':return followAuthor(id,b);case'delete':return deletePost(id,card,b);case'report':return reportPost(id)}});
init();
})();