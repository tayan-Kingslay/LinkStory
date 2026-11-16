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
    const image = String(body.imageBase64 || '');
    const mimeType = String(body.mimeType || 'image/jpeg');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return send(res, 400, { error: 'Formato de imagem não suportado.' });
    if (!image || image.length > 4_500_000 || !/^[A-Za-z0-9+/]+=*$/.test(image)) return send(res, 413, { error: 'Imagem ausente ou maior que o limite de análise.' });
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return send(res, 503, { error: 'A análise visual está preparada, mas falta configurar GOOGLE_GEMINI_API_KEY no Vercel.' });

    const prompt = `Você é o diretor visual da Hora da História do LinkStory. Analise SOMENTE o quadro de mangá enviado. Não invente acontecimentos, personagens, falas, cenário ou emoções que não estejam visualmente sustentados. Descreva o que é visível com cautela e marque como incerto o que não puder identificar. Preserve integralmente a arte original: não proponha redesenhar nem alterar personagens. Sua função é planejar uma apresentação cinematográfica de uma imagem estática, usando movimentos de câmera virtuais, enquadramento, ritmo, luz/atmosfera e efeitos discretos. Movimentos permitidos incluem zoom lento, pan horizontal/vertical, aproximação, afastamento, parallax muito sutil somente se não deformar a arte, tremor curto para impacto e quadro estático. Nunca recomende movimentos que mudem a ação desenhada. Retorne APENAS JSON válido com estas chaves: scene_description (descrição objetiva em português, até 450 caracteres), visible_elements (array de até 6 itens), mood (clima em poucas palavras), shot_type, camera_motion (um movimento seguro e sua intensidade), lighting (tratamento sugerido sem alterar cores da arte), visual_effect (efeito sutil ou "nenhum"), sound_effect_prompt (sugestão sonora curta, sem música), narration_suggestion (narração descritiva opcional, sem inventar diálogos), confidence ("alta","média" ou "baixa"), cautions (array de incertezas/avisos). Respeite que isto é um quadro estático de mangá, não um pedido para gerar vídeo.`;
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
