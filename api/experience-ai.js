const SUPABASE_URL = "https://qwhpikyxilzwazeneddw.supabase.co";
const SUPABASE_KEY = "sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q";
const DEFAULT_VOICE = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
function normalizeSpeaker(value) {
  return String(value || "personagem").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().slice(0,80) || "personagem";
}
async function loadVoiceCast(token,mangaId) {
  const url=SUPABASE_URL+"/rest/v1/mangas?id=eq."+encodeURIComponent(mangaId)+"&select=experience_voice_cast";
  const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token}});
  if(!response.ok)throw new Error("Não foi possível carregar o elenco de vozes da obra.");
  const rows=await response.json();
  return rows[0]&&rows[0].experience_voice_cast&&typeof rows[0].experience_voice_cast==="object"?rows[0].experience_voice_cast:{};
}
async function assignCharacterVoices(token,mangaId,dialogue) {
  const lines=(Array.isArray(dialogue)?dialogue:[]).filter(function(line){return String(line.text||"").trim()});
  const cast=await loadVoiceCast(token,mangaId);
  const missing=[];
  lines.forEach(function(line){
    const key=normalizeSpeaker(line.speaker);
    if(Number(line.speaker_confidence)<0.6&&!line.speaker_confirmed)
      throw new Error("Confirme quem está falando em cada balão marcado como incerto antes de gerar a dublagem.");
    if(line.voiceId||cast[key]&&cast[key].voice_id)return;
    if(!missing.some(function(item){return item.key===key;}))
      missing.push({key:key,speaker:String(line.speaker||"Personagem").slice(0,70),profile:String(line.voice_profile||"").slice(0,350),sample:String(line.text||"").slice(0,180)});
  });
  if(!missing.length)return cast;
  const apiKey=process.env.ELEVENLABS_API_KEY;
  const geminiKey=process.env.GOOGLE_GEMINI_API_KEY;
  if(!apiKey||!geminiKey)throw new Error("As chaves da ElevenLabs e do Gemini precisam estar configuradas para escolher as vozes dos personagens.");
  const voiceResponse=await fetch("https://api.elevenlabs.io/v2/voices?page_size=100&language=pt&include_total_count=false",{headers:{"xi-api-key":apiKey}});
  const voiceData=await voiceResponse.json().catch(function(){return {}});
  if(!voiceResponse.ok)throw new Error("Não foi possível consultar as vozes disponíveis na ElevenLabs: "+String(voiceData.detail||voiceData.message||"verifique a chave e o plano").slice(0,180));
  let voiceRows=Array.isArray(voiceData.voices)?voiceData.voices:[];
  if(!voiceRows.length){
    const fallbackResponse=await fetch("https://api.elevenlabs.io/v2/voices?page_size=100&include_total_count=false",{headers:{"xi-api-key":apiKey}});
    const fallbackData=await fallbackResponse.json().catch(function(){return {}});
    if(fallbackResponse.ok)voiceRows=Array.isArray(fallbackData.voices)?fallbackData.voices:[];
  }
  const voices=voiceRows.map(function(v){
    return {voice_id:String(v.voice_id||""),name:String(v.name||"Voz"),category:String(v.category||""),description:String(v.description||"").slice(0,240),labels:v.labels||{}};
  }).filter(function(v){return v.voice_id});
  if(!voices.length)throw new Error("A ElevenLabs não retornou vozes em português disponíveis para esta conta.");
  const candidates=voices.slice(0,100);
  const instruction="Você é diretor de elenco de dublagem de mangá em português brasileiro. Para cada personagem, escolha a voz mais adequada entre as vozes reais disponíveis. Considere perfil vocal, idade aparente fictícia, apresentação vocal, timbre, energia, personalidade e naturalidade em pt-BR. Não escolha pela semelhança do nome. Cada personagem deve ter uma voz diferente sempre que houver opções adequadas. Retorne apenas JSON: assignments com speaker_key e voice_id. Só use IDs da lista fornecida. Personagens: "+JSON.stringify(missing)+". Vozes disponíveis: "+JSON.stringify(candidates);
  const chosen=await gemini(geminiKey,{contents:[{role:"user",parts:[{text:instruction}]}],generationConfig:{responseMimeType:"application/json"}});
  const byId=new Map(candidates.map(function(v){return[v.voice_id,v]}));
  const used=new Set(Object.keys(cast).map(function(k){return cast[k]&&cast[k].voice_id}).filter(Boolean));
  const assigned=Array.isArray(chosen.assignments)?chosen.assignments:[];
  missing.forEach(function(character){
    const pick=assigned.find(function(item){return item.speaker_key===character.key||normalizeSpeaker(item.speaker_key||item.speaker)===character.key})||assigned.find(function(item){return normalizeSpeaker(item.speaker||item.character)===character.key});
    let voice=pick&&byId.get(String(pick.voice_id||""));
    if(!voice||used.has(voice.voice_id))voice=candidates.find(function(v){return !used.has(v.voice_id)});
    if(!voice)throw new Error("Não há vozes diferentes suficientes para todos os personagens deste capítulo.");
    used.add(voice.voice_id);
    cast[character.key]={speaker:character.speaker,voice_id:voice.voice_id,voice_name:voice.name,voice_profile:character.profile,source:"ai",updated_at:new Date().toISOString()};
  });
  const saveUrl=SUPABASE_URL+"/rest/v1/mangas?id=eq."+encodeURIComponent(mangaId);
  const save=await fetch(saveUrl,{method:"PATCH",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({experience_voice_cast:cast})});
  if(!save.ok)throw new Error("As vozes foram escolhidas, mas não foi possível salvar o elenco permanente da obra.");
  return cast;
}
function reply(res, status, data) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(data));
}
function validId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
async function verifyOwner(req, mangaId) {
  const auth = String(req.headers.authorization || "");
  const token = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : "";
  if (!token) throw new Error("Entre novamente na sua conta.");
  const headers = { apikey: SUPABASE_KEY, Authorization: "Bearer " + token };
  const userRes = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: headers });
  if (!userRes.ok) throw new Error("Sua sessão expirou. Entre novamente.");
  const user = await userRes.json();
  const mangaRes = await fetch(SUPABASE_URL + "/rest/v1/mangas?id=eq." + encodeURIComponent(mangaId) + "&select=creator_id,publication_mode", { headers: headers });
  if (!mangaRes.ok) throw new Error("Não foi possível verificar a autoria.");
  const rows = await mangaRes.json();
  if (!rows[0] || rows[0].creator_id !== user.id) throw new Error("Somente o autor pode gerar esta experiência.");
  if (rows[0].publication_mode !== "experience") throw new Error("Esta obra não está no modo Melhor Experiência.");
  return { token: token, userId: user.id };
}
async function verifyChapterAndPage(token, ids, requirePage) {
  const headers = { apikey: SUPABASE_KEY, Authorization: "Bearer " + token };
  const chapterUrl = SUPABASE_URL + "/rest/v1/manga_chapters?id=eq." + encodeURIComponent(ids.chapterId) + "&manga_id=eq." + encodeURIComponent(ids.mangaId) + "&select=id,review_status";
  const chapterResponse = await fetch(chapterUrl, { headers: headers });
  if (!chapterResponse.ok) throw new Error("Não foi possível validar o capítulo.");
  const chapters = await chapterResponse.json();
  if (!chapters.length) throw new Error("Este capítulo não pertence à obra informada.");
  if (requirePage) {
    const pageUrl = SUPABASE_URL + "/rest/v1/manga_pages?id=eq." + encodeURIComponent(ids.pageId) + "&chapter_id=eq." + encodeURIComponent(ids.chapterId) + "&select=id,image_url,private_image_path,panels";
    const pageResponse = await fetch(pageUrl, { headers: headers });
    if (!pageResponse.ok) throw new Error("Não foi possível validar a página.");
    const pages = await pageResponse.json();
    if (!pages.length) throw new Error("Esta página não pertence ao capítulo informado.");
    pages[0].review_status=chapters[0].review_status;
    return pages[0];
  }
  return null;
}
function safeDraftPath(path){
  const parts=String(path||"").split("/");
  if(parts.length<3||parts[0]!=="mangas"||! /^[0-9a-f-]{36}$/i.test(parts[1])||parts.some(function(part){return !part||part==="."||part===".."||!/^[A-Za-z0-9._-]+$/.test(part);}))throw new Error("Caminho de arquivo privado inválido.");
  return parts.map(encodeURIComponent).join("/");
}
async function store(token,path,bytes,type,privateDraft){
  const safe=privateDraft?safeDraftPath(path):path.split("/").map(encodeURIComponent).join("/"),bucket=privateDraft?"linkstory-drafts":"linkstory-media";
  const response=await fetch(SUPABASE_URL+"/storage/v1/object/"+bucket+"/"+safe,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":type,"x-upsert":"true"},body:bytes});
  if(!response.ok)throw new Error("Falha ao salvar mídia no LinkStory: "+(await response.text()).slice(0,180));
  return privateDraft?"private://"+path:SUPABASE_URL+"/storage/v1/object/public/linkstory-media/"+safe;
}
async function getPrivateAsset(token,path){
  const safe=safeDraftPath(path);
  const response=await fetch(SUPABASE_URL+"/storage/v1/object/authenticated/linkstory-drafts/"+safe,{headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token}});
  if(!response.ok)throw new Error("Não foi possível abrir o arquivo privado do rascunho.");
  const type=(response.headers.get("content-type")||"").split(";")[0],bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.length||bytes.length>50*1024*1024)throw new Error("Arquivo privado inválido ou muito grande.");
  return {type:type,bytes:bytes};
}
async function getPageForOwner(token,page){if(page.private_image_path)return getPrivateAsset(token,page.private_image_path);return getPage(page.image_url)}
async function promotePrivateAsset(token,value,destinationPath){
  const marker=String(value||"");if(!marker.startsWith("private://"))return marker;
  const path=marker.slice(10),asset=await getPrivateAsset(token,path);
  return store(token,destinationPath||path,asset.bytes,asset.type||"application/octet-stream",false);
}
async function deletePrivateAsset(token,path){
  const safe=safeDraftPath(path);
  const response=await fetch(SUPABASE_URL+"/storage/v1/object/linkstory-drafts/"+safe,{method:"DELETE",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token}});
  if(!response.ok)console.warn("[experience-ai] private media cleanup failed",response.status);
}
async function getPage(url) {
  const parsed = new URL(String(url || ""));
  if (parsed.protocol !== "https:" || parsed.hostname !== "qwhpikyxilzwazeneddw.supabase.co") throw new Error("Página original inválida.");
  const response = await fetch(parsed);
  if (!response.ok) throw new Error("Não foi possível carregar a página original.");
  const type = (response.headers.get("content-type") || "").split(";")[0];
  if (["image/jpeg", "image/png", "image/webp"].indexOf(type) < 0) throw new Error("Formato de imagem não suportado.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error("A página precisa ter até 12 MB.");
  return { type: type, bytes: bytes };
}
function parseJsonText(text) {
  const clean = String(text || "").replace(/^\s*```json\s*/i, "").replace(/^\s*```\s*/i, "").replace(/\s*```\s*$/, "");
  try { return JSON.parse(clean); } catch (e) { throw new Error("A IA retornou uma análise inválida. Tente novamente."); }
}
async function gemini(apiKey, payload) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(function(){ return {}; });
  if (!response.ok) throw new Error(data.error && data.error.message ? data.error.message : "Gemini não conseguiu analisar a página.");
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content ? data.candidates[0].content.parts || [] : [];
  const text = parts.map(function(part){ return part.text || ""; }).join("\n");
  if (!text) throw new Error("A IA não retornou a análise.");
  return parseJsonText(text);
}
async function analyze(req, res, token, body, ids, verifiedPage) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY não está configurada no Vercel.");
  const image = await getPageForOwner(token,verifiedPage);
  const instruction = "Você é diretor de storyboard e diretor de dublagem de mangá. Analise a página inteira e detecte cada quadro visível, sua posição e tamanho. Determine a ordem natural de leitura. Não invente quadros nem falas ilegíveis. Retorne JSON válido em português com reading_direction e panels. Cada panel deve ter x,y,width,height normalizados, order, confidence, description, action, camera, narration, dialogue, sound_effect e motion_prompt. Cada item de dialogue deve conter speaker, speaker_confidence, text, emotion, delivery e voice_profile. voice_profile deve descrever em até 240 caracteres o perfil vocal sugerido para aquele personagem: faixa etária aparente fictícia, apresentação vocal, timbre, altura, textura, energia e personalidade vocal, sempre adequado a português brasileiro. Baseie-se apenas no que é visível e no contexto da fala; não trate isso como fato sobre uma pessoa real. Quando não houver evidência clara do locutor, speaker_confidence abaixo de 0.6 e não invente identidade. A narração não repete falas. Preserve integralmente arte, lettering e identidade dos personagens.";
  const result = await gemini(key, { contents: [{ role: "user", parts: [{ text: instruction }, { inline_data: { mime_type: image.type, data: image.bytes.toString("base64") } }] }], generationConfig: { responseMimeType: "application/json" } });
  const panels = (Array.isArray(result.panels) ? result.panels : []).slice(0, 24).map(function(p, i) {
    const x = Number(p.x), y = Number(p.y), width = Number(p.width), height = Number(p.height);
    if (![x,y,width,height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.001 || y + height > 1.001) return null;
    return {
      x:x, y:y, width:width, height:height, order:Number(p.order) || i + 1,
      confidence:Math.max(0,Math.min(1,Number(p.confidence) || 0)),
      description:String(p.description || "").slice(0,1000), action:String(p.action || "").slice(0,500),
      camera:String(p.camera || "").slice(0,250), narration:String(p.narration || "").slice(0,1000),
      dialogue:(Array.isArray(p.dialogue) ? p.dialogue : []).slice(0,8).map(function(d){
        return { speaker:String(d.speaker || "Personagem").slice(0,70), speaker_confidence:Math.max(0,Math.min(1,Number(d.speaker_confidence)||0)), text:String(d.text || "").slice(0,450), emotion:String(d.emotion || "natural").slice(0,40), delivery:String(d.delivery || "").slice(0,70), voice_profile:String(d.voice_profile||"").slice(0,350), speaker_confirmed:d.speaker_confirmed===true };
      }).filter(function(d){ return d.text.trim(); }),
      sound_effect:String(p.sound_effect || "").slice(0,250), motion_prompt:String(p.motion_prompt || "").slice(0,800)
    };
  }).filter(Boolean).sort(function(a,b){return a.order-b.order;});
  if (!panels.length) throw new Error("A IA não encontrou quadros confiáveis. Nenhuma alteração foi feita.");
  return reply(res, 200, { ok:true, readingDirection:result.reading_direction || "rtl", panels:panels });
}
async function planTrailer(token, ids) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY não está configurada no Vercel.");
  const mangaResponse = await fetch(SUPABASE_URL + "/rest/v1/mangas?id=eq." + encodeURIComponent(ids.mangaId) + "&select=id,title,status,cover_url", { headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token} });
  if (!mangaResponse.ok) throw new Error("Não foi possível consultar a obra.");
  const mangas = await mangaResponse.json();
  if (!mangas[0] || mangas[0].status !== "published") throw new Error("O trailer só pode ser criado depois que a obra estiver publicada.");
  const chaptersResponse = await fetch(SUPABASE_URL + "/rest/v1/manga_chapters?manga_id=eq." + encodeURIComponent(ids.mangaId) + "&review_status=eq.published&select=id,chapter_number,title&order=chapter_number.asc", { headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token} });
  if (!chaptersResponse.ok) throw new Error("Não foi possível consultar os capítulos publicados.");
  const chapters = await chaptersResponse.json();
  if (!chapters.length) throw new Error("A obra ainda não tem capítulos aprovados.");
  const chapterIds = chapters.map(function(ch){return ch.id;});
  const pagesResponse = await fetch(SUPABASE_URL + "/rest/v1/manga_pages?chapter_id=in.(" + chapterIds.map(encodeURIComponent).join(",") + ")&select=id,chapter_id,page_number,image_url,panels&order=page_number.asc", { headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token} });
  if (!pagesResponse.ok) throw new Error("Não foi possível carregar as páginas publicadas.");
  const pages = await pagesResponse.json();
  const chapterMap = Object.fromEntries(chapters.map(function(ch){return[ch.id,ch];}));
  const candidates = [];
  pages.forEach(function(page){
    (Array.isArray(page.panels)?page.panels:[]).forEach(function(panel,index){
      if (!panel || ![panel.x,panel.y,panel.width,panel.height].every(function(v){return Number.isFinite(Number(v));})) return;
      candidates.push({
        pageId:page.id,panelIndex:index+1,chapterId:page.chapter_id,
        chapterNumber:chapterMap[page.chapter_id].chapter_number,
        chapterTitle:chapterMap[page.chapter_id].title,
        pageNumber:page.page_number,pageImageUrl:page.image_url,
        panelImageUrl:panel.image_url||null,videoUrl:panel.video_url||null,audioUrl:panel.audio_url||null,soundUrl:panel.sound_url||null,
        narration:String(panel.narration||"").slice(0,500),
        dialogue:(Array.isArray(panel.dialogue)?panel.dialogue:[]).slice(0,4).map(function(d){return String(d.text||"").slice(0,180)}),
        description:String(panel.description||"").slice(0,350),
        action:String(panel.action||"").slice(0,250),
        soundEffect:String(panel.sound_effect||"").slice(0,120),
        x:Number(panel.x),y:Number(panel.y),width:Number(panel.width),height:Number(panel.height)
      });
    });
  });
  if (!candidates.length) throw new Error("Organize os quadros dos capítulos publicados antes de criar o trailer.");
  const sampled = candidates.length<=100 ? candidates : Array.from({length:100},function(_,i){return candidates[Math.round(i*(candidates.length-1)/99)];});
  const compact = sampled.map(function(c,i){return {id:i,chapter:c.chapterNumber,page:c.pageNumber,description:c.description,action:c.action,narration:c.narration,dialogue:c.dialogue,soundEffect:c.soundEffect,hasAnimation:!!c.videoUrl};});
  const instruction = "Você é editor de trailers de mangá. Escolha de 4 a 8 cenas entre os IDs fornecidos, sem repetir IDs. Crie uma progressão curta: gancho inicial, escalada, momento emocional ou de ação e encerramento que desperte curiosidade sem revelar o final. Prefira cenas com contexto e falas fortes. Não invente acontecimentos. Retorne JSON válido em português: title (até 80 caracteres), hook (até 140), scenes (lista de id, caption até 100 caracteres, reason até 160, duration entre 2 e 5 segundos). Não escolha cenas sem descrição suficiente se houver opções melhores. IDs disponíveis: " + JSON.stringify(compact);
  const result = await gemini(key,{contents:[{role:"user",parts:[{text:instruction}]}],generationConfig:{responseMimeType:"application/json"}});
  const seen = new Set();
  const scenes = (Array.isArray(result.scenes)?result.scenes:[]).slice(0,8).map(function(scene){
    const id=Number(scene.id);
    if (!Number.isInteger(id)||id<0||id>=sampled.length||seen.has(id)) return null;
    seen.add(id);
    const c=sampled[id];
    return Object.assign({},c,{caption:String(scene.caption||"").slice(0,100),reason:String(scene.reason||"").slice(0,160),duration:Math.max(2,Math.min(5,Number(scene.duration)||3.5))});
  }).filter(Boolean);
  if (scenes.length<3) throw new Error("A IA não encontrou cenas suficientes para um trailer consistente.");
  return {ok:true,title:String(result.title||mangas[0].title).slice(0,80),hook:String(result.hook||"Uma nova história começa.").slice(0,140),coverUrl:mangas[0].cover_url||null,scenes:scenes};
}
async function revisePanel(token,body,ids,verifiedPage){
  const key=process.env.GOOGLE_GEMINI_API_KEY;
  if(!key)throw new Error("GOOGLE_GEMINI_API_KEY não está configurada no Vercel.");
  const panels=Array.isArray(verifiedPage.panels)?verifiedPage.panels:[];
  const current=panels[ids.panelIndex-1];
  if(!current)throw new Error("Quadro não encontrado nesta página.");
  const image=imageData(body.panelImage);
  const instruction="Revise somente o conteúdo narrativo do quadro indicado, obedecendo exatamente ao pedido do autor. Não invente personagens, falas, ações ou efeitos que não estejam visíveis. Preserve a identidade dos personagens e o sentido da cena. Se a fala não puder ser atribuída com segurança, use speaker_confidence abaixo de 0.6 e não chute o nome. Retorne JSON com description, action, camera, narration, dialogue (speaker,speaker_confidence,text,emotion,delivery), sound_effect e motion_prompt. Pedido do autor: "+String(body.feedback||"").slice(0,1000)+". Conteúdo atual: "+JSON.stringify({description:current.description,action:current.action,camera:current.camera,narration:current.narration,dialogue:current.dialogue,sound_effect:current.sound_effect,motion_prompt:current.motion_prompt});
  const result=await gemini(key,{contents:[{role:"user",parts:[{inline_data:{mime_type:image.type,data:image.bytes.toString("base64")}},{text:instruction}]}],generationConfig:{responseMimeType:"application/json"}});
  const dialogue=Array.isArray(result.dialogue)?result.dialogue.slice(0,8).map(function(d){return {speaker:String(d.speaker||"Personagem").slice(0,70),speaker_confidence:Math.max(0,Math.min(1,Number(d.speaker_confidence)||0)),text:String(d.text||"").slice(0,450),emotion:String(d.emotion||"natural").slice(0,40),delivery:String(d.delivery||"").slice(0,70),voice_profile:String(d.voice_profile||"").slice(0,350),speaker_confirmed:false}}):[];
  const revised=Object.assign({},current,{description:String(result.description||current.description||"").slice(0,500),action:String(result.action||current.action||"").slice(0,300),camera:String(result.camera||current.camera||"").slice(0,180),narration:String(result.narration||"").slice(0,1000),dialogue:dialogue,sound_effect:String(result.sound_effect||"").slice(0,180),motion_prompt:String(result.motion_prompt||"").slice(0,500),audio_url:null,sound_url:null,video_url:null,video_job_id:null,audio_error:null,sound_error:null,video_error:null});
  await updatePanelData(token,ids,revised);
  return {ok:true,panel:revised};
}
async function speech(token, body, ids) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY não está configurada no Vercel.");
  const lines = [];
  let remaining = 2000;
  const voiceCast=await assignCharacterVoices(token,ids.mangaId,body.dialogue);
  const voiceAssignments=[];
  const narrator = String(body.narration || "").trim();
  const narratorVoice = String(body.narratorVoiceId || process.env.ELEVENLABS_NARRATOR_VOICE_ID || DEFAULT_VOICE);
  if (narrator && remaining > 0) {
    const tagged = "[narrando com emoção natural] " + narrator;
    const safe = tagged.slice(0, remaining);
    lines.push({ text:safe, voice_id:narratorVoice });
    remaining -= safe.length;
  }
  (Array.isArray(body.dialogue) ? body.dialogue : []).slice(0,8).forEach(function(line){
    if (remaining <= 0) return;
    const raw = String(line.text || "").trim();
    if (!raw) return;
    const tagged = "[" + String(line.emotion || "natural").slice(0,40) + "] " + raw;
    const safe = tagged.slice(0, Math.min(450, remaining));
    if (safe) {
      const speakerKey=normalizeSpeaker(line.speaker),assigned=voiceCast[speakerKey];
      const selectedVoice=String(line.voiceId||(assigned&&assigned.voice_id)||process.env.ELEVENLABS_CHARACTER_VOICE_ID||DEFAULT_VOICE);
      lines.push({ text:safe, voice_id:selectedVoice });
      if(assigned)voiceAssignments.push({speaker:String(line.speaker||"Personagem"),speaker_key:speakerKey,voiceId:assigned.voice_id,voiceName:assigned.voice_name});
      remaining -= safe.length;
    }
  });
  if (!lines.length) return null;
  const response = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128", {
    method:"POST", headers:{"xi-api-key":key,"Content-Type":"application/json"},
    body:JSON.stringify({inputs:lines,model_id:"eleven_v3",language_code:"pt"})
  });
  if (!response.ok) throw new Error("Falha na dublagem: " + (await response.text()).slice(0,180));
  const bytes = Buffer.from(await response.arrayBuffer());
  const audioUrl=await store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+"-voice.mp3",bytes,"audio/mpeg",ids.privateDraft);
  return {audioUrl:audioUrl,voiceAssignments:voiceAssignments};
}
async function sound(token, body, ids) {
  const prompt = String(body.soundEffect || "").trim();
  if (!prompt) return null;
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY não está configurada no Vercel.");
  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method:"POST", headers:{"xi-api-key":key,"Content-Type":"application/json"},
    body:JSON.stringify({text:prompt.slice(0,350),duration_seconds:3,prompt_influence:0.65,model_id:"eleven_text_to_sound_v3"})
  });
  if (!response.ok) throw new Error("Falha no efeito sonoro: " + (await response.text()).slice(0,180));
  const bytes = Buffer.from(await response.arrayBuffer());
  return store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+"-sfx.mp3",bytes,"audio/mpeg",ids.privateDraft);
}
function imageData(value) {
  const match = String(value || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Imagem do quadro inválida.");
  const bytes = Buffer.from(match[2],"base64");
  if (!bytes.length || bytes.length > 12*1024*1024) throw new Error("Imagem do quadro excede 12 MB.");
  return {type:match[1],bytes:bytes};
}
async function updatePanelData(token, ids, patch) {
  const headers = { apikey: SUPABASE_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: "return=representation" };
  const pageUrl = SUPABASE_URL + "/rest/v1/manga_pages?id=eq." + encodeURIComponent(ids.pageId) + "&chapter_id=eq." + encodeURIComponent(ids.chapterId) + "&select=id,panels";
  const get = await fetch(pageUrl, { headers: headers });
  if (!get.ok) throw new Error("Não foi possível carregar o quadro para atualizar a geração.");
  const rows = await get.json();
  if (!rows.length) throw new Error("Página não encontrada.");
  const panels = Array.isArray(rows[0].panels) ? rows[0].panels.slice() : [];
  const index = ids.panelIndex - 1;
  if (!panels[index]) throw new Error("Quadro não encontrado nesta página.");
  panels[index] = Object.assign({}, panels[index], patch);
  const update = await fetch(pageUrl, { method:"PATCH", headers:headers, body:JSON.stringify({panels:panels}) });
  if (!update.ok) throw new Error("Não foi possível salvar o estado da animação.");
  return panels[index];
}
function extractVideoData(interaction){
  if(interaction&&interaction.output_video&&interaction.output_video.data)return interaction.output_video.data;
  const steps=interaction&&Array.isArray(interaction.steps)?interaction.steps:[];
  for(let i=steps.length-1;i>=0;i--){
    const step=steps[i];
    if(step&&step.type==="model_output"&&Array.isArray(step.content)){
      const video=step.content.find(function(item){return item&&item.type==="video"&&item.data;});
      if(video)return video.data;
    }
  }
  return "";
}
async function startAnimation(token, body, ids) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY não está configurada no Vercel.");
  const image = imageData(body.panelImage);
  const prompt = "Anime este quadro como uma única tomada contínua de mangá 2D. Preserve rigorosamente rosto, identidade, roupas, proporções, cores, cenário, balões, lettering e traço original. Não acrescente personagens, objetos, textos ou balões. Não redesenhe nem estilize novamente. Movimento natural, sutil e controlado, sem deformações ou cortes. Cena: " + String(body.description || "") + ". Ação: " + String(body.action || "movimento sutil") + ". Câmera: " + String(body.camera || "movimento suave") + ". Direção: " + String(body.motionPrompt || "");
  const aspect = Number(body.aspectRatio) >= 1 ? "16:9" : "9:16";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions?key=" + encodeURIComponent(key), {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"gemini-omni-1.1-flash",background:true,input:[{type:"image",data:image.bytes.toString("base64"),mime_type:image.type},{type:"text",text:prompt}],generation_config:{video_config:{task:"image_to_video"}},response_format:{type:"video",resolution:"360p",aspect_ratio:aspect}})
  });
  const data = await response.json().catch(function(){return {};});
  if (!response.ok) throw new Error(data.error && data.error.message ? data.error.message : "A IA de animação falhou.");
  const encodedVideo=extractVideoData(data);
  if (encodedVideo) {
    const bytes = Buffer.from(encodedVideo,"base64");
    if (!bytes.length || bytes.length > 35*1024*1024) throw new Error("Vídeo excede o limite de 35 MB.");
    const url = await store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+".mp4",bytes,"video/mp4",ids.privateDraft);
    await updatePanelData(token,ids,{video_url:url,video_job_id:null,video_error:null});
    return {videoUrl:url,pending:false};
  }
  if (!data.id) throw new Error("O Google não retornou o identificador da animação.");
  await updatePanelData(token,ids,{video_job_id:data.id,video_error:null});
  return {jobId:data.id,pending:true};
}
async function animationStatus(token, body, ids) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  const jobId = String(body.jobId || "");
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY não está configurada no Vercel.");
  if (!/^[A-Za-z0-9_-]{5,200}$/.test(jobId)) throw new Error("Identificador de geração inválido.");
  const pageUrl = SUPABASE_URL + "/rest/v1/manga_pages?id=eq." + encodeURIComponent(ids.pageId) + "&chapter_id=eq." + encodeURIComponent(ids.chapterId) + "&select=id,panels";
  const headers = { apikey:SUPABASE_KEY, Authorization:"Bearer "+token };
  const pageResponse = await fetch(pageUrl,{headers:headers});
  if (!pageResponse.ok) throw new Error("Não foi possível validar a geração.");
  const pages = await pageResponse.json();
  const panel = pages[0] && Array.isArray(pages[0].panels) ? pages[0].panels[ids.panelIndex-1] : null;
  if (!panel || panel.video_job_id !== jobId) throw new Error("Esta geração não pertence ao quadro selecionado.");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions/"+encodeURIComponent(jobId)+"?key="+encodeURIComponent(key),{headers:{"Content-Type":"application/json"}});
  const data = await response.json().catch(function(){return {};});
  if (!response.ok) throw new Error(data.error && data.error.message ? data.error.message : "Não foi possível consultar a animação.");
  if (data.status==="failed" || data.status==="cancelled" || data.status==="canceled") {
    await updatePanelData(token,ids,{video_job_id:null,video_error:String(data.error && data.error.message || "A geração de vídeo falhou.").slice(0,300)});
    throw new Error("A geração da animação falhou. Você pode tentar novamente.");
  }
  const encoded = extractVideoData(data);
  if (data.status!=="completed" || !encoded) return {pending:true,status:data.status||"running"};
  const bytes = Buffer.from(encoded,"base64");
  if (!bytes.length || bytes.length > 35*1024*1024) throw new Error("Vídeo excede o limite de 35 MB.");
  const url = await store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+".mp4",bytes,"video/mp4",ids.privateDraft);
  await updatePanelData(token,ids,{video_url:url,video_job_id:null,video_error:null});
  return {pending:false,videoUrl:url};
}
async function publishDraftPages(token,ids,pages){
  const headers={apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json",Prefer:"return=representation"};
  const cleanup=[];
  for(const page of pages){
    let imageUrl=page.image_url;
    if(page.private_image_path){
      cleanup.push(page.private_image_path);
      imageUrl=await promotePrivateAsset(token,"private://"+page.private_image_path,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/page-"+String(page.page_number).padStart(4,"0")+".webp");
    }else imageUrl=await promotePrivateAsset(token,imageUrl);
    const panels=Array.isArray(page.panels)?page.panels.slice():[];
    for(let i=0;i<panels.length;i++){
      const panel=Object.assign({},panels[i]);
      for(const field of ["image_url","video_url","audio_url","sound_url"]){
        if(typeof panel[field]==="string"&&panel[field].startsWith("private://")){
          cleanup.push(panel[field].slice(10));
          panel[field]=await promotePrivateAsset(token,panel[field]);
        }
      }
      panel.video_job_id=null;panels[i]=panel;
    }
    const update=await fetch(SUPABASE_URL+"/rest/v1/manga_pages?id=eq."+encodeURIComponent(page.id)+"&chapter_id=eq."+encodeURIComponent(ids.chapterId),{
      method:"PATCH",headers:headers,body:JSON.stringify({image_url:imageUrl,private_image_path:null,panels:panels})
    });
    if(!update.ok)throw new Error("Não foi possível liberar os arquivos do capítulo para leitura pública.");
  }
  return cleanup;
}
async function publishDraftMangaAssets(token,mangaId){
  const headers={apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json",Prefer:"return=representation"};
  const url=SUPABASE_URL+"/rest/v1/mangas?id=eq."+encodeURIComponent(mangaId)+"&select=id,cover_url,logo_url,private_cover_path,private_logo_path";
  const response=await fetch(url,{headers:headers});
  if(!response.ok)throw new Error("Não foi possível conferir a capa da obra.");
  const rows=await response.json();if(!rows.length)return [];
  const manga=rows[0],cleanup=[],patch={};
  if(manga.private_cover_path){cleanup.push(manga.private_cover_path);patch.cover_url=await promotePrivateAsset(token,"private://"+manga.private_cover_path,"mangas/"+mangaId+"/cover.webp");patch.private_cover_path=null}
  if(manga.private_logo_path){cleanup.push(manga.private_logo_path);patch.logo_url=await promotePrivateAsset(token,"private://"+manga.private_logo_path,"mangas/"+mangaId+"/logo.webp");patch.private_logo_path=null}
  if(Object.keys(patch).length){const update=await fetch(url,{method:"PATCH",headers:headers,body:JSON.stringify(patch)});if(!update.ok)throw new Error("Não foi possível publicar a capa e o logotipo da obra.")}
  return cleanup;
}
async function reviewChapter(token,ids,decision,feedback){
  const headers={apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json",Prefer:"return=representation"};
  const chapterUrl=SUPABASE_URL+"/rest/v1/manga_chapters?id=eq."+encodeURIComponent(ids.chapterId)+"&manga_id=eq."+encodeURIComponent(ids.mangaId)+"&select=id,review_status";
  const chapterResponse=await fetch(chapterUrl,{headers:headers});
  if(!chapterResponse.ok)throw new Error("Não foi possível conferir o capítulo.");
  const chapters=await chapterResponse.json();
  if(!chapters.length)throw new Error("Capítulo não encontrado nesta obra.");
  const note=String(feedback||"").trim().slice(0,1000);
  if(decision==="reject"&&!note)throw new Error("Explique qual parte precisa ser corrigida antes de reprovar.");
  let cleanup=[];
  if(decision==="approve"){
    const pagesResponse=await fetch(SUPABASE_URL+"/rest/v1/manga_pages?chapter_id=eq."+encodeURIComponent(ids.chapterId)+"&select=id,page_number,image_url,private_image_path,panels&order=page_number.asc",{headers:headers});
    if(!pagesResponse.ok)throw new Error("Não foi possível conferir as páginas.");
    const pages=await pagesResponse.json();
    const invalid=pages.some(function(page){
      return !Array.isArray(page.panels)||!page.panels.length||page.panels.some(function(panel){
        return !panel||![panel.x,panel.y,panel.width,panel.height].every(function(value){return Number.isFinite(Number(value));})||
          Number(panel.x)<0||Number(panel.y)<0||Number(panel.width)<=0||Number(panel.height)<=0||
          Number(panel.x)+Number(panel.width)>1.000001||Number(panel.y)+Number(panel.height)>1.000001||
          !!panel.video_job_id||!panel.video_url||
          (!!(panel.narration||(Array.isArray(panel.dialogue)&&panel.dialogue.length))&&!panel.audio_url)||
          (!!panel.sound_effect&&!panel.sound_url);
      });
    });
    if(!pages.length||invalid)throw new Error("Todas as páginas precisam ter seus quadros, animações e os áudios/efeitos necessários concluídos antes da aprovação.");
    cleanup=await publishDraftPages(token,ids,pages);cleanup.push(...await publishDraftMangaAssets(token,ids.mangaId));
  }
  const nextStatus=decision==="approve"?"published":"rejected";
  const updateChapter=await fetch(chapterUrl,{method:"PATCH",headers:headers,body:JSON.stringify({review_status:nextStatus,review_feedback:decision==="reject"?note:null,reviewed_at:new Date().toISOString()})});
  if(!updateChapter.ok)throw new Error("Não foi possível salvar a decisão de revisão.");
  if(decision==="approve"){
    const mangaResponse=await fetch(SUPABASE_URL+"/rest/v1/mangas?id=eq."+encodeURIComponent(ids.mangaId)+"&select=id,status",{headers:headers});
    if(!mangaResponse.ok)throw new Error("Capítulo aprovado, mas não foi possível consultar a obra.");
    const mangas=await mangaResponse.json();
    if(mangas[0]&&mangas[0].status!=="published"){
      const publishResponse=await fetch(SUPABASE_URL+"/rest/v1/mangas?id=eq."+encodeURIComponent(ids.mangaId),{method:"PATCH",headers:headers,body:JSON.stringify({status:"published",updated_at:new Date().toISOString()})});
      if(!publishResponse.ok)throw new Error("Capítulo aprovado, mas a obra ainda não pôde ser publicada. Tente novamente.");
    }
    for(const path of cleanup)await deletePrivateAsset(token,path);
  }
  return {ok:true,reviewStatus:nextStatus};
}
module.exports = async function handler(req,res) {
  if (req.method !== "POST") return reply(res,405,{error:"Método não permitido."});
  try {
    const body=req.body || {};
    const mangaId=body.mangaId, chapterId=body.chapterId, pageId=body.pageId;
    const decision = body.action==="approve" || body.action==="reject";
    if (!validId(mangaId) || !validId(chapterId) || (!decision && !validId(pageId))) return reply(res,400,{error:"Identificadores inválidos."});
    const auth=await verifyOwner(req,mangaId);
    const ids={mangaId:mangaId,chapterId:chapterId,pageId:pageId,panelIndex:Math.max(1,Math.min(24,Number(body.panelIndex)||1))};
    const verifiedPage = await verifyChapterAndPage(auth.token,ids,!decision);
    if(verifiedPage)ids.privateDraft=verifiedPage.review_status!=="published";
    if (decision) return reply(res,200,await reviewChapter(auth.token,ids,body.action,body.reviewFeedback));
    if (body.action==="trailer-plan") return reply(res,200,await planTrailer(auth.token,ids));
    if (body.action==="revise-panel") return reply(res,200,await revisePanel(auth.token,body,ids,verifiedPage));
    if (body.action==="analyze") {
      return await analyze(req,res,auth.token,body,ids,verifiedPage);
    }
    if (body.action==="speech") { const result=await speech(auth.token,body,ids); return reply(res,200,Object.assign({ok:true},result||{audioUrl:null,voiceAssignments:[]})); }
    if (body.action==="sound") return reply(res,200,{ok:true,soundUrl:await sound(auth.token,body,ids)});
    if (body.action==="animate") return reply(res,200,Object.assign({ok:true},await startAnimation(auth.token,body,ids)));
    if (body.action==="animate-status") return reply(res,200,Object.assign({ok:true},await animationStatus(auth.token,body,ids)));
    return reply(res,400,{error:"Etapa de geração desconhecida."});
  } catch(error) {
    console.error("[experience-ai]",error);
    return reply(res,400,{error:String(error && error.message || "Erro ao gerar experiência.").slice(0,500)});
  }
};
module.exports.config={maxDuration:60,bodyParser:{sizeLimit:"18mb"}};
