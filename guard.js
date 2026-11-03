/* LinkStory Guard client helpers. Authorization is enforced by Supabase RLS, not by this file. */
(function () {
  const client = window.linkstorySupabase;
  if (!client) return;
  const allowedReasons = new Set(['harassment','hate','sexual_content','minor_safety','violence','self_harm','copyright','spam','privacy','other']);
  window.LinkStoryGuard = {
    async getSafetySettings() {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Entre na sua conta para consultar a privacidade.');
      const { data, error } = await client.rpc('get_linkstory_safety_settings');
      if (error) throw error;
      return data?.[0] || { birth_date: null, profile_visibility: 'public', show_library: false, adult_content_enabled: false };
    },
    async saveSafetySettings(settings) {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Entre na sua conta para alterar a privacidade.');
      const { error } = await client.rpc('set_linkstory_safety_settings', {
        p_birth_date: settings.birth_date || null,
        p_profile_visibility: settings.profile_visibility === 'private' ? 'private' : 'public',
        p_show_library: Boolean(settings.show_library),
        p_adult_content_enabled: Boolean(settings.adult_content_enabled)
      });
      if (error) throw error;
      return true;
    },
    async submitReport({ target_type, target_id, reason, details = '' }) {
      if (!allowedReasons.has(reason)) throw new Error('Selecione um motivo válido.');
      if (!['profile','post','manga','chapter','comment','message'].includes(target_type)) throw new Error('Tipo de conteúdo inválido.');
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Entre na sua conta para denunciar.');
      const { error } = await client.from('content_reports').insert({
        reporter_id: user.id, target_type, target_id, reason, details: String(details).slice(0, 2000)
      });
      if (error) throw error;
      return true;
    },
    async blockUser(userId) {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Entre na sua conta para bloquear alguém.');
      if (user.id === userId) throw new Error('Você não pode bloquear sua própria conta.');
      const { error } = await client.from('user_blocks').insert({ blocker_id: user.id, blocked_id: userId });
      if (error && error.code !== '23505') throw error;
      return true;
    },
    async unblockUser(userId) {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Entre na sua conta para continuar.');
      const { error } = await client.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', userId);
      if (error) throw error;
      return true;
    }
  };
})();