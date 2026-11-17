const SUPABASE_URL = 'https://qwhpikyxilzwazeneddw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método não permitido.' });
  }
  const bearer = req.headers.authorization || '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
  if (!token) return send(res, 401, { error: 'Entre na sua conta para analisar esta cena.' });

  try {
    const auth = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!auth.ok) return send(res, 401, { error: 'Sua sessão expirou. Entre novamente.' });
    const user = await auth.json();
    if (!user?.id) return send(res, 401, { error: 'Sessão inválida.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const mangaId = String(body.mangaId || ''), chapterId = String(body.chapterId || '');
    if (!/^[0-9a-f-]{36}$/i.test(mangaId) || !/^[0-9a-f-]{36}$/i.test(chapterId)) return send(res, 400, { error: 'Identificação da obra e do capítulo é obrigatória.' });
    const ownerResponse = await fetch(SUPABASE_URL + '/rest/v1/mangas?id=eq.' + encodeURIComponent(mangaId) + '&select=id,creator_id', { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
    const owners = ownerResponse.ok ? await ownerResponse.json() : [];
    if (!Array.isArray(owners) || owners.length !== 1 || owners[0].creator_id !== user.id) return send(res, 403, { error: 'Somente o autor da obra pode analisar suas cenas.' });
    const chapterResponse = await fetch(SUPABASE_URL + '/rest/v1/manga_chapters?id=eq.' + encodeURIComponent(chapterId) + '&manga_id=eq.' + encodeURIComponent(mangaId) + '&select=id', { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
    const chapters = chapterResponse.ok ? await chapterResponse.json() : [];
    if (!Array.isArray(chapters) || chapters.length !== 1) return send(res, 403, { error: 'O capítulo não pertence a esta obra.' });
 typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const image = String(body.imageBase64 || '');
    const mimeType = String(body.mimeType || 'image/jpeg');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return send(res, 400, { error: 'Formato de imagem não suportado.' });
    if (!image || image.length > 4_500_000 || !/^[A-Za-z0-9+/]+=*$/.test(image)) return send(res, 413, { error: 'Imagem ausente ou maior que o limite de análise.' });
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return send(res, 503, { error: 'A análise visual está preparada, mas falta configurar GOOGLE_GEMINI_API_KEY no Vercel.' });

    const prompt = `Você é o diretor de cena e leitor de mangá da Hora da História do LinkStory. Analise SOMENTE o quadro enviado. Leia e transcreva fielmente o texto legível dos balões e caixas de narração em português (ou preserve o idioma original); não invente falas. Identifique visualmente quem parece falar apenas quando houver evidência; se não souber, use "Narrador". Crie spoken_text em formato natural para áudio: primeiro falas visíveis identificáveis e depois uma narração curta que conecte a cena sem repetir tudo. Se não houver texto legível, descreva somente a ação visível, sem criar acontecimentos. Não invente personagens, cenário, falas ou emoções. Preserve integralmente a arte original. Planeje apresentação cinematográfica de imagem estática com movimentos virtuais discretos: zoom lento, pan, tremor curto para impacto ou quadro estático. Não recomende movimentos que mudem a ação desenhada. Retorne APENAS JSON válido com estas chaves: scene_description (até 450 caracteres), visible_elements (array até 6), mood, shot_type, camera_motion, lighting, visual_effect, sound_effect_prompt (efeito curto e específico, ou string vazia), spoken_text (texto completo para voz, até 1200 caracteres), narration_suggestion (até 450 caracteres), confidence ("alta","média" ou "baixa"), cautions (array de avisos). `;;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: image } }] }],
        generationConfig: { temperature: 0.25, responseMimeType: 'application/json' }
      })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Gemini scene analysis error', response.status, detail.slice(0, 500));
      return send(res, response.status === 429 ? 429 : 502, { error: response.status === 429 ? 'A análise visual atingiu o limite temporário. Tente novamente.' : 'Não foi possível analisar este quadro agora.' });
    }
    const result = await response.json();
    const raw = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!raw) return send(res, 502, { error: 'A IA não retornou uma análise válida.' });
    let analysis;
    try { analysis = JSON.parse(raw); } catch { return send(res, 502, { error: 'A resposta da IA não veio em formato válido.' }); }
    return send(res, 200, { analysis });
  } catch (error) {
    console.error('Story director failed', error);
    return send(res, 500, { error: 'Erro interno ao analisar a cena.' });
  }
};
