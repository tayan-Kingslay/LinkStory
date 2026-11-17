const SUPABASE_URL='https://qwhpikyxilzwazeneddw.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
module.exports=async function(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Método não permitido.'})}
 const authHeader=req.headers.authorization||'',token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
 if(!token)return send(res,401,{error:'Entre na sua conta para analisar a página.'});
 try{
  const auth=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
  if(!auth.ok)return send(res,401,{error:'Sua sessão expirou. Entre novamente.'});
  const user=await auth.json();if(!user?.id)return send(res,401,{error:'Sessão inválida.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
  const mangaId=String(body.mangaId||''),chapterId=String(body.chapterId||'');
  if(!/^[0-9a-f-]{36}$/i.test(mangaId)||!/^[0-9a-f-]{36}$/i.test(chapterId))return send(res,400,{error:'Identificação da obra e do capítulo é obrigatória.'});
  const ownerResponse=await fetch(SUPABASE_URL+'/rest/v1/mangas?id=eq.'+encodeURIComponent(mangaId)+'&select=id,creator_id',{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
  const owners=ownerResponse.ok?await ownerResponse.json():[];
  if(!Array.isArray(owners)||owners.length!==1||owners[0].creator_id!==user.id)return send(res,403,{error:'Somente o autor da obra pode analisar suas páginas.'});
  const chapterResponse=await fetch(SUPABASE_URL+'/rest/v1/manga_chapters?id=eq.'+encodeURIComponent(chapterId)+'&manga_id=eq.'+encodeURIComponent(mangaId)+'&select=id',{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
  const chapters=chapterResponse.ok?await chapterResponse.json():[];
  if(!Array.isArray(chapters)||chapters.length!==1)return send(res,403,{error:'O capítulo não pertence a esta obra.'});
  const image=String(body.imageBase64||''),mime=String(body.mimeType||'image/jpeg');typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
  const image=String(body.imageBase64||''),mime=String(body.mimeType||'image/jpeg');
  if(!['image/jpeg','image/png','image/webp'].includes(mime))return send(res,400,{error:'Formato de imagem não suportado.'});
  if(!image||image.length>5_500_000||!/^[A-Za-z0-9+/]+=*$/.test(image))return send(res,413,{error:'A imagem está vazia ou grande demais. Tente uma página menor.'});
  const key=process.env.GOOGLE_GEMINI_API_KEY;if(!key)return send(res,503,{error:'Falta configurar GOOGLE_GEMINI_API_KEY no Vercel.'});
  const prompt=`Você é um sistema especializado em reconhecer a estrutura de páginas de mangá e quadrinhos. Analise a página inteira enviada. Identifique APENAS quadros/painéis delimitados por bordas, margens ou espaços/gutters visíveis. Não confunda balões, personagens, caixas de texto, efeitos de velocidade ou cenas desenhadas dentro de um quadro com quadros independentes. Não corte nem altere a imagem. Retorne coordenadas NORMALIZADAS de cada quadro em relação à imagem inteira: x,y,width,height entre 0 e 1. Cada retângulo deve incluir a área visual do quadro, sem incluir margens externas desnecessárias. Ordene os quadros conforme o fluxo de leitura japonês (da direita para esquerda, de cima para baixo) quando a página indicar esse padrão; caso contrário, use o fluxo visual mais claro. Se houver um quadro irregular ou que atravesse outros espaços, descreva a incerteza em notes e proponha um retângulo que preserve a cena inteira. Não invente divisões quando os limites forem ambíguos. Retorne SOMENTE JSON válido neste formato: {"panels":[{"x":0.1,"y":0.1,"width":0.4,"height":0.3,"order":1,"confidence":"alta","notes":""}],"page_reading_direction":"rtl|ltr|uncertain","notes":"observação geral","confidence":"alta|media|baixa"}. Se não conseguir distinguir com confiança, retorne panels vazio e explique em notes. Máximo de 40 quadros. `;
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:mime,data:image}}]}],generationConfig:{temperature:0.1,responseMimeType:'application/json'}})});
  if(!response.ok){const detail=await response.text().catch(()=> '');console.error('Gemini panel detection',response.status,detail.slice(0,400));if(response.status===429)return send(res,429,{error:'A análise atingiu o limite temporário do Gemini. Aguarde um pouco e tente novamente.'});return send(res,502,{error:'O Gemini não conseguiu analisar esta página agora. Você pode tentar novamente ou marcar os quadros manualmente.'})}
  const result=await response.json(),raw=result.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();if(!raw)return send(res,502,{error:'A IA não retornou uma análise utilizável.'});
  let parsed;try{parsed=JSON.parse(raw)}catch{return send(res,502,{error:'A resposta da IA veio em formato inválido. Tente novamente.'})}
  const source=Array.isArray(parsed.panels)?parsed.panels:[],panels=[];
  for(const p of source.slice(0,40)){const vals=[p.x,p.y,p.width,p.height].map(Number);if(!vals.every(Number.isFinite))continue;let [x,y,width,height]=vals;x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));width=Math.max(0,Math.min(1-x,width));height=Math.max(0,Math.min(1-y,height));if(width<.025||height<.025)continue;panels.push({x,y,width,height,order:panels.length+1,confidence:String(p.confidence||'média').slice(0,20),notes:String(p.notes||'').slice(0,240)})}
  return send(res,200,{panels,pageReadingDirection:parsed.page_reading_direction||'uncertain',notes:String(parsed.notes||'').slice(0,500),confidence:parsed.confidence||'média'});
 }catch(error){console.error('Panel detection failed',error);return send(res,500,{error:'Falha inesperada na análise. Tente novamente.'})}
};