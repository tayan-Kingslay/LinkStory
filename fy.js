(()=>{'use strict';
const sb=()=>linkstorySupabase,$=id=>document.getElementById(id);
const state={user:null,profile:null,tab:'for-you',offset:0,limit:20,loading:false,more:true,posts:[],queue:[],queueCursor:0,activeCommentPost:null,replyTo:null,comments:[],commentLikes:{},activeActionComment:null,reportsEnabled:false};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Agora':d.toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2800)}
function avatar(p){return p?.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="">':esc((p?.display_name||p?.username||'LS').slice(0,2).toUpperCase())}
async function init(){try{const{data,error}=await sb().auth.getUser();if(error)throw error;state.user=data.user||null;if(state.user){const p=await sb().from('profiles').select('id,username,display_name,avatar_url,role').eq('id',state.user.id).maybeSingle();if(p.error)throw p.error;state.profile=p.data||null;const reportProbe=await sb().from('content_reports').select('id',{head:true,count:'exact'});state.reportsEnabled=!reportProbe.error;$('myAvatar').innerHTML=avatar(state.profile)}else{$('myAvatar').textContent='LS';$('openComposer').textContent='Entre para publicar na comunidade';$('composer').querySelectorAll('button').forEach(b=>b.disabled=true)}await loadFeed(true)}catch(e){console.error('FY init:',e);$('feedStatus').textContent='Não foi possível conectar à página Pra você. Recarregue a página.'}}
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
   const result=await sb().from('posts').select('id,author_id,body,post_type,idea_title,media_url,media_type,thumbnail_url,created_at,profiles:author_id(id,username,display_name,avatar_url,verification_type)').neq('post_type','story').order('created_at',{ascending:false}).range(0,199);
   if(result.error)throw result.error;data=result.data||[];rows=data;
  }else{
   let followedIds=[];
   if(state.tab==='following'){
    if(!state.user)followedIds=[];
    else{const f=await sb().from('follows').select('following_id').eq('follower_id',state.user.id);if(f.error)throw f.error;followedIds=(f.data||[]).map(x=>x.following_id)}
   }
   if(state.tab==='following'&&!followedIds.length){rows=[];data=[]}
   else{
    let q=sb().from('posts').select('id,author_id,body,post_type,idea_title,media_url,media_type,thumbnail_url,created_at,profiles:author_id(id,username,display_name,avatar_url,verification_type)').neq('post_type','story').order('created_at',{ascending:false}).range(state.offset,state.offset+state.limit-1);
    if(state.tab==='ideas')q=q.eq('post_type','idea');
    if(state.tab==='videos')q=q.eq('post_type','video');
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
   if(!state.posts.length){$('feedStatus').hidden=false;$('feedStatus').className='empty';$('feedStatus').innerHTML=state.tab==='following'?'<strong>Seu feed está esperando sua rede.</strong>Siga criadores para ver as publicações deles aqui.':'<strong>Ainda não há ideias publicadas.</strong>Quando alguém compartilhar uma ideia, ela aparecerá aqui.'}
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
function renderPosts(posts){const box=$('feedList');posts.forEach(p=>{const el=document.createElement('article');el.className='post'+(p.author_id===state.user?.id?' own':'');el.dataset.id=p.id;const name=p.profiles?.display_name||p.profiles?.username||'Usuário';const handle=p.profiles?.username?'@'+p.profiles.username:'LinkStory';const badge=window.LinkStoryVerification?.html(p.profiles?.verification_type)||'';const kind=p.post_type==='idea'?'IDEIA PROCURANDO CRIADOR':p.post_type==='video'?'VÍDEO':'PUBLICAÇÃO';const media=p.media_url?(p.media_type==='video'?'<video class="media" controls playsinline preload="metadata" src="'+esc(p.media_url)+'"></video>':'<img class="media" loading="lazy" src="'+esc(p.media_url)+'" alt="Mídia da publicação">'):'';el.innerHTML='<header class="post-head"><div class="avatar">'+avatar(p.profiles)+'</div><div class="author"><strong>'+esc(name)+'</strong><small>'+esc(handle)+' · '+date(p.created_at)+'</small><span class="kind">'+kind+'</span></div>'+(state.reportsEnabled?'<button class="more" data-action="report" aria-label="Denunciar publicação">⋯</button>':'')+'</header>'+(p.idea_title?'<div class="idea-title">'+esc(p.idea_title)+'</div>':'')+(p.body?postBodyMarkup(p.body):'')+media+'<div class="post-stats"><span>'+p.likes+' curtida(s)</span><span>'+p.comments+' comentário(s)</span></div><div class="actions"><button class="action '+(p.liked?'liked':'')+'" data-action="like"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.1 4.7 4.7 0 0 1 8.8 2.1Z"/></svg></span><span class="action-label">'+(p.liked?'Curtido':'Curtir')+'</span></button><button class="action" data-action="comment"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3A7.5 7.5 0 1 1 20 11.5Z"/></svg></span><span class="action-label">Comentar</span></button><button class="action" data-action="share"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg></span><span class="action-label">Compartilhar</span></button><button class="action" data-action="follow"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M19 8v6m-3-3h6"/></svg></span><span class="action-label">'+(p.author_id===state.user?.id?'Você':'Seguir')+'</span></button>'+(p.author_id===state.user?.id?'<button class="action delete-action" data-action="delete"><span class="action-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg></span><span class="action-label">Apagar</span></button>':'')+'</div>';box.appendChild(el)})}
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
async function openComments(postId){
 state.activeCommentPost=postId;
 $('commentComposeAvatar').innerHTML=avatar(state.profile);
 const post=state.posts.find(x=>x.id===postId);
 const context=$('commentPostContext');
 context.replaceChildren();
 state.commentLikes={};state.activeActionComment=null;
 const box=$('commentList');box.textContent='Carregando comentários…';
 $('commentBody').value='';lockCommentsBackground();$('commentsDialog').showModal();
 try{
  const{data,error}=await sb().from('comments').select('id,body,parent_comment_id,author_id,created_at,profiles:author_id(display_name,username,avatar_url,verification_type)').eq('post_id',postId).order('created_at',{ascending:true});
  if(error)throw error;state.comments=data||[];
  await loadCommentLikes();renderComments();
 }catch(e){box.textContent='Não foi possível carregar os comentários. '+e.message}
}
function renderComments(){
 const box=$('commentList');box.replaceChildren();
 if(!state.comments.length){box.innerHTML='<div class="comments-empty"><strong>Comece a conversa</strong><span>Seja a primeira pessoa a comentar nesta publicação.</span></div>';return}
 const byParent=new Map();state.comments.forEach(c=>{const key=c.parent_comment_id||'root';if(!byParent.has(key))byParent.set(key,[]);byParent.get(key).push(c)});
 const build=(comment,depth=0)=>{
  const wrap=document.createElement('div');wrap.className='comment-thread'+(depth?' is-reply':'');
  const el=document.createElement('article');el.className='comment';
  const name=comment.profiles?.display_name||comment.profiles?.username||'Usuário';const badge=window.LinkStoryVerification?.html(comment.profiles?.verification_type)||'';
  const likes=state.commentLikes[comment.id]||{count:0,liked:false};
  const own=state.user?.id===comment.author_id;
  el.innerHTML='<div class="comment-avatar">'+avatar(comment.profiles)+'</div><div class="comment-content"><div class="comment-meta"><strong>'+esc(name)+'</strong><small>'+date(comment.created_at)+'</small></div><p>'+esc(comment.body)+'</p><div class="comment-actions-row"><button type="button" class="comment-like-button'+(likes.liked?' liked':'')+'" data-comment-like="'+esc(comment.id)+'" aria-pressed="'+String(likes.liked)+'">♥ <span>'+likes.count+'</span> Curtir</button><button type="button" class="comment-reply-button" data-reply-comment="'+esc(comment.id)+'" data-reply-name="'+esc(name)+'">Responder</button>'+(own?'<button type="button" class="comment-edit-button" data-edit-comment="'+esc(comment.id)+'">Editar</button>':'')+'</div></div>';
  wrap.appendChild(el);
  const children=byParent.get(comment.id)||[];
  if(children.length){wrap.classList.add('has-replies');const replies=document.createElement('div');replies.className='comment-replies';children.forEach(child=>replies.appendChild(build(child,depth+1)));wrap.appendChild(replies)}
  return wrap;
 };
 (byParent.get('root')||[]).forEach(c=>box.appendChild(build(c)));
 const visible=new Set();const mark=c=>{visible.add(c.id);(byParent.get(c.id)||[]).forEach(mark)};(byParent.get('root')||[]).forEach(mark);
 state.comments.filter(c=>!visible.has(c.id)).forEach(c=>box.appendChild(build(c)));
}
async function loadCommentLikes(){
 const ids=state.comments.map(c=>c.id);state.commentLikes={};
 if(!ids.length)return;
 const{data,error}=await sb().from('comment_likes').select('comment_id,user_id').in('comment_id',ids);
 if(error)throw error;
 (data||[]).forEach(row=>{const item=state.commentLikes[row.comment_id]||(state.commentLikes[row.comment_id]={count:0,liked:false});item.count++;if(row.user_id===state.user?.id)item.liked=true});
}
async function toggleCommentLike(id,button){
 if(!state.user)return toast('Entre na sua conta para curtir comentários.');
 button.disabled=true;
 try{
  const current=state.commentLikes[id]||{count:0,liked:false};
  if(current.liked){const{error}=await sb().from('comment_likes').delete().eq('comment_id',id).eq('user_id',state.user.id);if(error)throw error;current.count=Math.max(0,current.count-1);current.liked=false}
  else{const{error}=await sb().from('comment_likes').insert({comment_id:id,user_id:state.user.id});if(error&&error.code!=='23505')throw error;if(!error)current.count++;current.liked=true}
  state.commentLikes[id]=current;button.classList.toggle('liked',current.liked);button.setAttribute('aria-pressed',String(current.liked));button.innerHTML='♥ <span>'+current.count+'</span> Curtir';
 }catch(e){toast(e.message||'Não foi possível curtir o comentário.')}
 finally{button.disabled=false}
}
async function editComment(id){
 const comment=state.comments.find(c=>c.id===id);if(!comment||comment.author_id!==state.user?.id)return;
 const next=prompt('Edite seu comentário:',comment.body);if(next===null)return;
 const body=next.trim();if(!body)return toast('O comentário não pode ficar vazio.');
 if(body===comment.body)return;
 try{
  const{data,error}=await sb().from('comments').update({body}).eq('id',id).eq('author_id',state.user.id).select('id,body').single();
  if(error)throw error;comment.body=data.body;renderComments();toast('Comentário atualizado.');
 }catch(e){toast(e.message||'Não foi possível editar o comentário.')}
}
function setReplyTarget(id,name){
 state.replyTo={id,name};const label=$('commentReplyingTo');
 label.innerHTML='Respondendo a <strong>'+esc(name)+'</strong><button type="button" id="cancelCommentReply" aria-label="Cancelar resposta">×</button>';
 label.hidden=false;$('commentBody').placeholder='Escreva sua resposta…';$('commentBody').focus();
}
function clearReplyTarget(){state.replyTo=null;const label=$('commentReplyingTo');label.hidden=true;label.replaceChildren();$('commentBody').placeholder='Escreva sua resposta…'}
async function sendComment(e){
 e.preventDefault();if(!state.user)return toast('Entre na sua conta para comentar.');
 const body=$('commentBody').value.trim();if(!body)return;
 const b=$('sendComment');b.disabled=true;b.textContent='Enviando…';
 try{
  const row={post_id:state.activeCommentPost,author_id:state.user.id,body,parent_comment_id:state.replyTo?.id||null};
  const{data,error}=await sb().from('comments').insert(row).select('id,body,parent_comment_id,created_at,profiles:author_id(display_name,username,avatar_url,verification_type)').single();
  if(error)throw error;
  state.comments.push(data);state.commentLikes[data.id]={count:0,liked:false};renderComments();
  $('commentBody').value='';clearReplyTarget();
  const post=state.posts.find(x=>x.id===state.activeCommentPost);
  if(post){post.comments=(post.comments||0)+1;const card=document.querySelector('.post[data-id="'+state.activeCommentPost+'"]');const stats=card?.querySelector('.post-stats');if(stats)stats.innerHTML='<span>'+post.likes+' curtida(s)</span><span>'+post.comments+' comentário(s)</span>'}
  $('commentList').scrollTop=$('commentList').scrollHeight;
  toast('Comentário publicado.');
 }catch(e){toast(e.message||'Não foi possível comentar.')}
 finally{b.disabled=false;b.textContent='Responder'}
}
async function sharePostWithFriend(postId){
 if(!state.user)return toast('Entre na sua conta para compartilhar.');
 let dialog=document.getElementById('sharePostDialog');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='sharePostDialog';
  dialog.style.cssText='width:min(440px,calc(100% - 24px));max-height:80dvh;border:1px solid #dbe5ef;border-radius:18px;padding:0;background:#fff;color:#17263a;box-shadow:0 24px 80px #10203355';
  dialog.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #e2e8f0"><strong>Enviar para um amigo</strong><button type="button" data-share-close style="border:0;background:#f1f5f9;border-radius:50%;width:32px;height:32px;font-size:20px">×</button></div><div id="shareFriendList" style="padding:14px 18px;overflow:auto;max-height:55dvh"><p>Carregando amigos…</p></div><div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px"><button type="button" data-share-close style="padding:10px 14px;border:1px solid #dbe5ef;border-radius:10px;background:#f8fafc">Cancelar</button><button type="button" id="sendSharedPost" disabled style="padding:10px 15px;border:0;border-radius:10px;background:#1769d2;color:white;font-weight:800">Enviar publicação</button></div>';
  document.body.append(dialog);dialog.querySelectorAll('[data-share-close]').forEach(b=>b.onclick=()=>dialog.close());
 }
 const list=dialog.querySelector('#shareFriendList'),send=dialog.querySelector('#sendSharedPost');list.innerHTML='<p>Carregando amigos…</p>';send.disabled=true;send.onclick=null;dialog.showModal();
 try{
  const fr=await sb().from('friendships').select('user_a,user_b').or('user_a.eq.'+state.user.id+',user_b.eq.'+state.user.id);
  if(fr.error)throw fr.error;
  const ids=[...new Set((fr.data||[]).map(x=>x.user_a===state.user.id?x.user_b:x.user_a))];
  if(!ids.length){list.innerHTML='<p style="color:#64748b;text-align:center;padding:18px 4px">Você ainda não tem amigos adicionados. Encontre pessoas na área Amigos.</p>';return}
  const pr=await sb().from('profiles').select('id,username,display_name,avatar_url').in('id',ids).order('display_name');
  if(pr.error)throw pr.error;
  list.replaceChildren();let selected=null;
  pr.data.forEach(p=>{
   const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:11px;padding:10px 4px;border-bottom:1px solid #edf1f5;cursor:pointer';
   const radio=document.createElement('input');radio.type='radio';radio.name='shareFriend';radio.value=p.id;radio.style.accentColor='#1769d2';
   const img=document.createElement('span');img.style.cssText='width:40px;height:40px;flex:none;border-radius:50%;overflow:hidden;background:#eaf3ff;display:grid;place-items:center;color:#1769d2;font-weight:800';
   if(p.avatar_url){const image=document.createElement('img');image.src=p.avatar_url;image.alt='';image.style.cssText='width:100%;height:100%;object-fit:cover';img.append(image)}else img.textContent=(p.display_name||p.username||'L').slice(0,1).toUpperCase();
   const name=document.createElement('span');name.style.cssText='font-weight:750;font-size:14px';name.textContent=p.display_name||p.username||'Pessoa';const handle=document.createElement('small');handle.style.cssText='display:block;color:#718096;font-weight:400;margin-top:3px';handle.textContent='@'+(p.username||'linkstory');name.append(handle);
   radio.onchange=()=>{selected=p.id;send.disabled=false};label.append(radio,img,name);list.append(label);
  });
  send.onclick=async()=>{if(!selected)return;send.disabled=true;send.textContent='Enviando…';try{
   const c=await sb().rpc('create_or_get_direct_conversation',{p_friend_id:selected});if(c.error)throw c.error;
   const link=location.origin+'/fy.html?post='+encodeURIComponent(postId);
   const message='📌 Publicação compartilhada no LinkStory\n'+link;
   const sent=await sb().from('messages').insert({conversation_id:c.data,sender_id:state.user.id,body:message});if(sent.error)throw sent.error;
   dialog.close();toast('Publicação enviada para seu amigo!');
  }catch(e){toast(e.message||'Não foi possível enviar.');send.disabled=false;send.textContent='Enviar publicação'}};
 }catch(e){list.innerHTML='<p style="color:#b42332">Não foi possível carregar seus amigos: '+esc(e.message)+'</p>'}
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
$('commentsDialog').addEventListener('close',()=>{clearReplyTarget();unlockCommentsBackground()});
$('commentsDialog').addEventListener('click',e=>{if(e.target===$('commentsDialog'))$('commentsDialog').close()});
if(window.visualViewport){const syncCommentViewport=()=>document.documentElement.style.setProperty('--ls-visual-height',window.visualViewport.height+'px');window.visualViewport.addEventListener('resize',syncCommentViewport);syncCommentViewport()}

$('commentList').addEventListener('click',e=>{
 const like=e.target.closest('[data-comment-like]');if(like)return toggleCommentLike(like.dataset.commentLike,like);
 const edit=e.target.closest('[data-edit-comment]');if(edit)return editComment(edit.dataset.editComment);
 const reply=e.target.closest('[data-reply-comment]');if(reply)setReplyTarget(reply.dataset.replyComment,reply.dataset.replyName);
});
$('commentReplyingTo').addEventListener('click',e=>{if(e.target.closest('#cancelCommentReply'))clearReplyTarget()});

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('loadMore').onclick=()=>loadFeed(false);
$('commentPostContext').addEventListener('click',e=>{
 const expand=e.target.closest('[data-expand-post]');
 if(!expand)return;
 const body=expand.previousElementSibling;
 if(!body?.classList.contains('post-body'))return;
 const expanded=body.classList.toggle('is-expanded');
 body.classList.toggle('is-collapsed',!expanded);
 expand.textContent=expanded?'Mostrar menos':'Ler tudo';
 expand.setAttribute('aria-expanded',String(expanded));
});
$('feedList').addEventListener('click',async e=>{
 const expand=e.target.closest('[data-expand-post]');
 if(expand){const card=expand.closest('.post'),body=card?.querySelector('.post-body');if(!body)return;const expanded=body.classList.toggle('is-expanded');body.classList.toggle('is-collapsed',!expanded);expand.textContent=expanded?'Mostrar menos':'Ler tudo';expand.setAttribute('aria-expanded',String(expanded));return}
 const b=e.target.closest('[data-action]');if(!b)return;const card=b.closest('.post'),id=card?.dataset.id;if(!id)return;switch(b.dataset.action){case'like':return toggleLike(id,b);case'comment':return openComments(id);case'share':return sharePostWithFriend(id);case'follow':return followAuthor(id,b);case'delete':return deletePost(id,card,b);case'report':return reportPost(id)}});
init();
})();