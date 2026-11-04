/* LinkStory Guard client helpers. Authorization is enforced by Supabase RLS, not by this file. */
(function () {
  const client = typeof linkstorySupabase !== 'undefined' ? linkstorySupabase : window.linkstorySupabase;
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
      if (!['profile','post','photo','manga','chapter','page','comment','message'].includes(target_type)) throw new Error('Tipo de conteúdo inválido.');
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Entre na sua conta para denunciar.');
      const { error } = await client.from('content_reports').insert({
        reporter_id: user.id, target_type, target_id, reason, details: String(details).slice(0, 2000)
      });
      if (error) throw error;
      return true;
    },

    mountReportButton(container, target, label = '⚑ Denunciar') {
      if (!container || !target?.target_type || !target?.target_id) return null;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = 'border:1px solid #dbe5ef;background:transparent;color:inherit;border-radius:10px;padding:9px 12px;font-weight:800;font-size:12px;cursor:pointer';
      const dialog = document.createElement('dialog');
      dialog.style.cssText = 'width:min(440px,calc(100% - 28px));border:1px solid #dbe5ef;border-radius:18px;padding:22px;color:#102033;box-shadow:0 24px 80px #0003';
      dialog.innerHTML = '<form method="dialog" style="display:flex;justify-content:flex-end"><button aria-label="Fechar" style="border:0;background:none;font-size:24px">×</button></form>' +
        '<h2 style="margin:0 0 8px;font-size:22px">Denunciar conteúdo</h2>' +
        '<p style="margin:0 0 16px;color:#66788d;font-size:13px">Escolha o motivo. A denúncia será enviada para análise.</p>' +
        '<form id="lsGuardReportForm"><label style="display:block;font-size:12px;font-weight:800;margin:12px 0 6px">Motivo</label>' +
        '<select name="reason" required style="width:100%;padding:12px;border:1px solid #dbe5ef;border-radius:10px;background:white">' +
        '<option value="">Selecione…</option><option value="harassment">Assédio ou bullying</option><option value="hate">Discurso de ódio</option><option value="sexual_content">Conteúdo sexual inadequado</option><option value="minor_safety">Risco envolvendo menor de idade</option><option value="violence">Violência ou ameaça</option><option value="self_harm">Incentivo à automutilação</option><option value="copyright">Violação de direitos autorais</option><option value="spam">Spam ou golpe</option><option value="privacy">Exposição de dados pessoais</option><option value="other">Outro</option></select>' +
        '<label style="display:block;font-size:12px;font-weight:800;margin:12px 0 6px">Detalhes (opcional)</label><textarea name="details" maxlength="2000" rows="4" placeholder="Conte o que aconteceu…" style="width:100%;padding:12px;border:1px solid #dbe5ef;border-radius:10px;resize:vertical"></textarea>' +
        '<p id="lsGuardReportStatus" role="status" style="font-size:12px;color:#66788d;min-height:18px"></p>' +
        '<button type="submit" style="width:100%;padding:13px;border:0;border-radius:11px;background:#0b72e7;color:#fff;font-weight:900">Enviar denúncia</button></form>';
      document.body.append(dialog);
      button.addEventListener('click', async () => {
        try {
          const { data: { user } } = await client.auth.getUser();
          if (!user) { location.href = 'login.html'; return; }
          dialog.showModal();
        } catch { location.href = 'login.html'; }
      });
      dialog.querySelector('#lsGuardReportForm').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget, status = dialog.querySelector('#lsGuardReportStatus');
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true; submit.textContent = 'Enviando…'; status.textContent = '';
        try {
          await window.LinkStoryGuard.submitReport({
            ...target,
            reason: form.elements.reason.value,
            details: form.elements.details.value
          });
          status.textContent = 'Denúncia enviada. Obrigado por ajudar a manter o LinkStory seguro.';
          form.reset();
          setTimeout(() => dialog.close(), 1600);
        } catch (error) {
          status.textContent = error?.message || 'Não foi possível enviar. Tente novamente.';
        } finally { submit.disabled = false; submit.textContent = 'Enviar denúncia'; }
      });
      container.append(button);
      return button;
    },
    async isUserBlocked(userId) {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) return false;
      const { data, error } = await client.from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    mountBlockButton(container, userId, label = 'Bloquear criador') {
      if (!container || !userId) return null;
      const button = document.createElement('button');
      const status = document.createElement('span');
      status.className = 'linkstory-block-status';
      status.setAttribute('role', 'status');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-pressed', 'false');
      let busy = false;
      const refresh = async () => {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user || user.id === userId) {
          button.hidden = true;
          status.hidden = true;
          return;
        }
        const blocked = await window.LinkStoryGuard.isUserBlocked(userId);
        button.textContent = blocked ? 'Desbloquear criador' : label;
        button.setAttribute('aria-pressed', String(blocked));
      };
      button.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        button.disabled = true;
        status.textContent = '';
        try {
          const blocked = await window.LinkStoryGuard.isUserBlocked(userId);
          if (blocked) {
            await window.LinkStoryGuard.unblockUser(userId);
            button.textContent = label;
            button.setAttribute('aria-pressed', 'false');
            status.textContent = 'Bloqueio removido.';
          } else {
            await window.LinkStoryGuard.blockUser(userId);
            button.textContent = 'Desbloquear criador';
            button.setAttribute('aria-pressed', 'true');
            status.textContent = 'Criador bloqueado. O conteúdo será atualizado ao sair desta página.';
          }
        } catch (error) {
          status.textContent = error?.message || 'Não foi possível alterar o bloqueio.';
        } finally {
          busy = false;
          button.disabled = false;
        }
      });
      container.append(button, status);
      refresh().catch(error => { status.textContent = error?.message || 'Não foi possível consultar o bloqueio.'; });
      return button;
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