const SUPABASE_URL = 'https://qwhpikyxilzwazeneddw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FjocCd5CH-v6Un0Qg_HBdQ_ujxKhD9q';

function reply(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Método não permitido.' });
  }

  const authorization = req.headers.authorization || '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!accessToken) return reply(res, 401, { error: 'Entre na sua conta para usar a Hora da História.' });

  try {
    const authResponse = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + accessToken }
    });
    if (!authResponse.ok) return reply(res, 401, { error: 'Sua sessão expirou. Entre novamente.' });
    const user = await authResponse.json();
    if (!user || !user.id) return reply(res, 401, { error: 'Sessão inválida.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const mangaId = String(body.mangaId || '');
    const chapterId = String(body.chapterId || '');
    if (!/^[0-9a-f-]{36}$/i.test(mangaId) || !/^[0-9a-f-]{36}$/i.test(chapterId)) {
      return reply(res, 400, { error: 'Identificação da obra e do capítulo é obrigatória.' });
    }
    const mangaUrl = SUPABASE_URL + '/rest/v1/mangas?id=eq.' + encodeURIComponent(mangaId) + '&select=id,creator_id';
    const mangaResponse = await fetch(mangaUrl, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + accessToken } });
    if (!mangaResponse.ok) return reply(res, 403, { error: 'Não foi possível confirmar a permissão para gerar áudio.' });
    const mangaRows = await mangaResponse.json();
    if (!Array.isArray(mangaRows) || mangaRows.length !== 1 || mangaRows[0].creator_id !== user.id) {
      return reply(res, 403, { error: 'Somente o autor da obra pode gerar os áudios da experiência.' });
    }
    const chapterUrl = SUPABASE_URL + '/rest/v1/manga_chapters?id=eq.' + encodeURIComponent(chapterId) + '&manga_id=eq.' + encodeURIComponent(mangaId) + '&select=id';
    const chapterResponse = await fetch(chapterUrl, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + accessToken } });
    if (!chapterResponse.ok) return reply(res, 403, { error: 'Não foi possível confirmar o capítulo.' });
    const chapterRows = await chapterResponse.json();
    if (!Array.isArray(chapterRows) || chapterRows.length !== 1) return reply(res, 403, { error: 'O capítulo não pertence a esta obra.' });
    const text = String(body.text || '').trim();
    const provider = String(body.provider || 'fish');
    const kind = String(body.kind || 'voice');
    if (!text) return reply(res, 400, { error: 'Escreva o texto que será narrado.' });
    if (text.length > 1800) return reply(res, 413, { error: 'Divida a narração em trechos de até 1.800 caracteres.' });

    let upstream;
    if (provider === 'fish' && kind === 'voice') {
      const apiKey = process.env.FISH_AUDIO_API_KEY;
      if (!apiKey) return reply(res, 503, { error: 'Fish Audio ainda não está configurado neste ambiente.' });
      const payload = { text, format: 'mp3' };
      if (typeof body.voiceId === 'string' && body.voiceId.trim()) payload.reference_id = body.voiceId.trim();
      upstream = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          model: 's2.1-pro'
        },
        body: JSON.stringify(payload)
      });
    } else if (provider === 'elevenlabs' && (kind === 'sfx' || kind === 'music')) {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) return reply(res, 503, { error: 'ElevenLabs ainda não está configurado neste ambiente.' });
      const duration = Number(body.durationSeconds);
      const payload = {
        text,
        model_id: 'eleven_text_to_sound_v3',
        output_format: 'mp3_44100_128',
        ...(kind === 'music' ? { loop: true, prompt_influence: 0.45 } : {}),
        ...(Number.isFinite(duration) ? { duration_seconds: Math.max(0.5, Math.min(kind === 'music' ? 30 : 12, duration)) } : {})
      };
      upstream = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      return reply(res, 400, { error: 'Combinação de serviço e tipo de áudio inválida.' });
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('Story audio provider error', upstream.status, detail.slice(0, 500));
      return reply(res, upstream.status === 429 ? 429 : 502, {
        error: upstream.status === 429
          ? 'O serviço de áudio está ocupado. Tente novamente em instantes.'
          : 'Não foi possível gerar o áudio agora. Verifique o serviço e tente novamente.'
      });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    if (!audio.length) return reply(res, 502, { error: 'O serviço não retornou áudio.' });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.end(audio);
  } catch (error) {
    console.error('Story audio handler failed', error);
    return reply(res, 500, { error: 'Erro interno ao preparar o áudio.' });
  }
};
