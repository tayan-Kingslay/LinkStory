const SUPABASE_URL = "https://qwhpikyxilzwazeneddw.supabase.co";
const SUPABASE_KEY = "sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q";
const DEFAULT_VOICE = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
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
  const chapterUrl = SUPABASE_URL + "/rest/v1/manga_chapters?id=eq." + encodeURIComponent(ids.chapterId) + "&manga_id=eq." + encodeURIComponent(ids.mangaId) + "&select=id";
  const chapterResponse = await fetch(chapterUrl, { headers: headers });
  if (!chapterResponse.ok) throw new Error("Não foi possível validar o capítulo.");
  const chapters = await chapterResponse.json();
  if (!chapters.length) throw new Error("Este capítulo não pertence à obra informada.");
  if (requirePage) {
    const pageUrl = SUPABASE_URL + "/rest/v1/manga_pages?id=eq." + encodeURIComponent(ids.pageId) + "&chapter_id=eq." + encodeURIComponent(ids.chapterId) + "&select=id,image_url,panels";
    const pageResponse = await fetch(pageUrl, { headers: headers });
    if (!pageResponse.ok) throw new Error("Não foi possível validar a página.");
    const pages = await pageResponse.json();
    if (!pages.length) throw new Error("Esta página não pertence ao capítulo informado.");
    return pages[0];
  }
  return null;
}
async function store(token, path, bytes, type) {
  const safe = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(SUPABASE_URL + "/storage/v1/object/linkstory-media/" + safe, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token, "Content-Type": type, "x-upsert": "true" },
    body: bytes
  });
  if (!response.ok) throw new Error("Falha ao salvar mídia no LinkStory: " + (await response.text()).slice(0, 180));
  return SUPABASE_URL + "/storage/v1/object/public/linkstory-media/" + safe;
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
async function analyze(req, res, token, body, ids) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY não está configurada no Vercel.");
  const image = await getPage(body.pageImageUrl);
  const instruction = "Você é diretor de storyboard de mangá. Analise a página inteira e detecte cada quadro visível, sua posição e tamanho. Determine a ordem natural de leitura, respeitando evidências visuais e a direção típica do mangá. Não invente quadros nem falas ilegíveis. Retorne somente JSON válido em português com reading_direction e panels. Cada panel deve ter x,y,width,height normalizados entre 0 e 1, order, confidence, description, action, camera, narration, dialogue (lista de speaker,text,emotion,delivery), sound_effect e motion_prompt. Os retângulos devem conter um quadro por inteiro sem incluir quadros vizinhos. Limite a 24. A narração descreve a ação sem repetir falas. Dialogue vazio se não houver fala legível. Preserve exatamente o estilo e a aparência dos personagens. Não altere a página original.";
  const result = await gemini(key, { contents: [{ role: "user", parts: [{ text: instruction }, { inline_data: { mime_type: image.type, data: image.bytes.toString("base64") } }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } });
  const panels = (Array.isArray(result.panels) ? result.panels : []).slice(0, 24).map(function(p, i) {
    const x = Number(p.x), y = Number(p.y), width = Number(p.width), height = Number(p.height);
    if (![x,y,width,height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.001 || y + height > 1.001) return null;
    return {
      x:x, y:y, width:width, height:height, order:Number(p.order) || i + 1,
      confidence:Math.max(0,Math.min(1,Number(p.confidence) || 0)),
      description:String(p.description || "").slice(0,1000), action:String(p.action || "").slice(0,500),
      camera:String(p.camera || "").slice(0,250), narration:String(p.narration || "").slice(0,1000),
      dialogue:(Array.isArray(p.dialogue) ? p.dialogue : []).slice(0,8).map(function(d){
        return { speaker:String(d.speaker || "Personagem").slice(0,70), text:String(d.text || "").slice(0,450), emotion:String(d.emotion || "natural").slice(0,40), delivery:String(d.delivery || "").slice(0,70) };
      }).filter(function(d){ return d.text.trim(); }),
      sound_effect:String(p.sound_effect || "").slice(0,250), motion_prompt:String(p.motion_prompt || "").slice(0,800)
    };
  }).filter(Boolean).sort(function(a,b){return a.order-b.order;});
  if (!panels.length) throw new Error("A IA não encontrou quadros confiáveis. Nenhuma alteração foi feita.");
  return reply(res, 200, { ok:true, readingDirection:result.reading_direction || "rtl", panels:panels });
}
async function speech(token, body, ids) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY não está configurada no Vercel.");
  const lines = [];
  let remaining = 2000;
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
      lines.push({ text:safe, voice_id:String(line.voiceId || process.env.ELEVENLABS_CHARACTER_VOICE_ID || DEFAULT_VOICE) });
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
  return store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+"-voice.mp3",bytes,"audio/mpeg");
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
  return store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+"-sfx.mp3",bytes,"audio/mpeg");
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
async function startAnimation(token, body, ids) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY não está configurada no Vercel.");
  const image = imageData(body.panelImage);
  const prompt = "Anime este quadro como animação 2D de mangá. Preserve rigorosamente rosto, identidade, roupas, proporções, cores, cenário e traço original. Não acrescente personagens, objetos, textos ou balões. Não redesenhe o personagem. Movimento natural e controlado, sem deformações. Cena: " + String(body.description || "") + ". Ação: " + String(body.action || "movimento sutil") + ". Câmera: " + String(body.camera || "movimento suave") + ". Direção: " + String(body.motionPrompt || "");
  const aspect = Number(body.aspectRatio) >= 1 ? "16:9" : "9:16";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions?key=" + encodeURIComponent(key), {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"gemini-omni-1.1-flash",background:true,input:[{type:"image",data:image.bytes.toString("base64"),mime_type:image.type},{type:"text",text:prompt}],generation_config:{video_config:{task:"image_to_video"}},response_format:{type:"video",resolution:"360p",aspect_ratio:aspect}})
  });
  const data = await response.json().catch(function(){return {};});
  if (!response.ok) throw new Error(data.error && data.error.message ? data.error.message : "A IA de animação falhou.");
  if (data.output_video && data.output_video.data) {
    const bytes = Buffer.from(data.output_video.data,"base64");
    if (!bytes.length || bytes.length > 35*1024*1024) throw new Error("Vídeo excede o limite de 35 MB.");
    const url = await store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+".mp4",bytes,"video/mp4");
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
  const encoded = data.output_video && data.output_video.data || "";
  if (data.status!=="completed" || !encoded) return {pending:true,status:data.status||"running"};
  const bytes = Buffer.from(encoded,"base64");
  if (!bytes.length || bytes.length > 35*1024*1024) throw new Error("Vídeo excede o limite de 35 MB.");
  const url = await store(token,"mangas/"+ids.mangaId+"/chapters/"+ids.chapterId+"/experience/"+ids.pageId+"-panel-"+ids.panelIndex+".mp4",bytes,"video/mp4");
  await updatePanelData(token,ids,{video_url:url,video_job_id:null,video_error:null});
  return {pending:false,videoUrl:url};
}
async function reviewChapter(token, ids, decision, feedback) {
  const headers = { apikey: SUPABASE_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: "return=representation" };
  const chapterUrl = SUPABASE_URL + "/rest/v1/manga_chapters?id=eq." + encodeURIComponent(ids.chapterId) + "&manga_id=eq." + encodeURIComponent(ids.mangaId) + "&select=id,review_status";
  const chapterResponse = await fetch(chapterUrl, { headers: headers });
  if (!chapterResponse.ok) throw new Error("Não foi possível conferir o capítulo.");
  const chapters = await chapterResponse.json();
  if (!chapters.length) throw new Error("Capítulo não encontrado nesta obra.");
  if (decision === "approve") {
    const pagesResponse = await fetch(SUPABASE_URL + "/rest/v1/manga_pages?chapter_id=eq." + encodeURIComponent(ids.chapterId) + "&select=id,panels&order=page_number.asc", { headers: headers });
    if (!pagesResponse.ok) throw new Error("Não foi possível conferir as páginas.");
    const pages = await pagesResponse.json();
    if (!pages.length || pages.some(function(page) { return !Array.isArray(page.panels) || !page.panels.length || page.panels.some(function(panel) { return !panel || ![panel.x,panel.y,panel.width,panel.height].every(function(value){return Number.isFinite(Number(value));}) || Number(panel.x)<0 || Number(panel.y)<0 || Number(panel.width)<=0 || Number(panel.height)<=0 || Number(panel.x)+Number(panel.width)>1.000001 || Number(panel.y)+Number(panel.height)>1.000001; }); })) {
      throw new Error("Todas as páginas precisam ter seus quadrinhos organizados antes da aprovação.");
    }
  }
  const note = String(feedback || "").trim().slice(0,1000);
  if (decision === "reject" && !note) throw new Error("Explique qual parte precisa ser corrigida antes de reprovar.");
  const nextStatus = decision === "approve" ? "published" : "rejected";
  const updateChapter = await fetch(chapterUrl, { method: "PATCH", headers: headers, body: JSON.stringify({ review_status: nextStatus, review_feedback: decision === "reject" ? note : null, reviewed_at: new Date().toISOString() }) });
  if (!updateChapter.ok) throw new Error("Não foi possível salvar a decisão de revisão.");
  if (decision === "approve") {
    const mangaResponse = await fetch(SUPABASE_URL + "/rest/v1/mangas?id=eq." + encodeURIComponent(ids.mangaId) + "&select=id,status", { headers: headers });
    if (!mangaResponse.ok) throw new Error("Capítulo aprovado, mas não foi possível consultar a obra.");
    const mangas = await mangaResponse.json();
    if (mangas[0] && mangas[0].status !== "published") {
      const publishResponse = await fetch(SUPABASE_URL + "/rest/v1/mangas?id=eq." + encodeURIComponent(ids.mangaId), { method: "PATCH", headers: headers, body: JSON.stringify({ status: "published", updated_at: new Date().toISOString() }) });
      if (!publishResponse.ok) throw new Error("Capítulo aprovado, mas a obra ainda não pôde ser publicada. Tente novamente.");
    }
  }
  return { ok: true, reviewStatus: nextStatus };
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
    if (decision) return reply(res,200,await reviewChapter(auth.token,ids,body.action,body.reviewFeedback));
    if (body.action==="analyze") {
      if (String(body.pageImageUrl || "") !== String(verifiedPage.image_url || "")) throw new Error("A imagem enviada não corresponde à página deste capítulo.");
      return await analyze(req,res,auth.token,body,ids);
    }
    if (body.action==="speech") return reply(res,200,{ok:true,audioUrl:await speech(auth.token,body,ids)});
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
