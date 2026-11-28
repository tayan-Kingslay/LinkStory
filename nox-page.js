(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const messages = $("messages");
  let conversationId = null;
  let recorder = null;
  let recordingChunks = [];
  let serviceReady = false;
  let busy = false;
  let authorizedChapterContext = null;
  let contextConversationId = null;
  let assistantName = "Nox";
  let assistantAvatarUrl = "";

  function setStatus(text, ready = false) {
    $("statusText").textContent = text;
    $("statusDot").classList.toggle("ready", ready);
  }

  function applyAssistantProfile(preferences) {
    assistantName = preferences.assistant_name || "Nox";
    assistantAvatarUrl = preferences.assistant_avatar_url || "";
    const initial = assistantName.trim().charAt(0).toUpperCase() || "N";
    const nameLabel = document.querySelector(".nox-sidebar-foot strong");
    if (nameLabel) nameLabel.textContent = assistantName;
    const welcomeTitle = document.querySelector(".nox-welcome h1");
    if (welcomeTitle) welcomeTitle.textContent = "Oi! Eu sou " + assistantName + ".";
    const orb = document.querySelector(".nox-orb");
    if (orb) {
      orb.replaceChildren();
      if (assistantAvatarUrl) {
        const img = document.createElement("img");
        img.src = assistantAvatarUrl;
        img.alt = "";
        img.onerror = () => { orb.replaceChildren(Object.assign(document.createElement("span"), { textContent: initial })); };
        orb.append(img);
      } else {
        const letter = document.createElement("span");
        letter.textContent = initial;
        orb.append(letter);
      }
    }
    const sidebarAvatar = document.querySelector(".nox-avatar-small");
    if (sidebarAvatar) {
      sidebarAvatar.replaceChildren();
      if (assistantAvatarUrl) {
        const img = document.createElement("img");
        img.src = assistantAvatarUrl;
        img.alt = "";
        img.onerror = () => { sidebarAvatar.textContent = initial; };
        sidebarAvatar.append(img);
      } else sidebarAvatar.textContent = initial;
    }
  }

  function clearChapterContext() {
    authorizedChapterContext = null;
    contextConversationId = null;
    $("chapterContextNotice").hidden = true;
    $("chapterContextNotice").textContent = "";
  }

  async function loadAuthorizedChapterContext() {
    const params = new URLSearchParams(location.search);
    if (params.get("share_chapter") !== "1") return;
    const mangaId = params.get("manga_id");
    const chapterId = params.get("chapter_id");
    if (!mangaId || !chapterId || typeof linkstorySupabase === "undefined") {
      throw new Error("Não foi possível identificar o capítulo autorizado.");
    }
    const sessionResult = await getLinkStorySession();
    const session = sessionResult?.data?.session;
    if (sessionResult?.error || !session?.user?.id) {
      throw new Error("Entre na sua conta para compartilhar um capítulo com o Nox.");
    }
    const { data: manga, error: mangaError } = await linkstorySupabase
      .from("mangas")
      .select("id, creator_id, title, description, genres")
      .eq("id", mangaId)
      .maybeSingle();
    if (mangaError) throw mangaError;
    if (!manga || manga.creator_id !== session.user.id) {
      throw new Error("Por segurança, o Nox só pode receber uma obra sua.");
    }
    const { data: chapter, error: chapterError } = await linkstorySupabase
      .from("manga_chapters")
      .select("id, manga_id, chapter_number, title")
      .eq("id", chapterId)
      .maybeSingle();
    if (chapterError) throw chapterError;
    if (!chapter || chapter.manga_id !== manga.id) {
      throw new Error("Este capítulo não pertence à obra selecionada.");
    }
    const { data: pages, error: pagesError } = await linkstorySupabase
      .from("manga_pages")
      .select("page_number, panels")
      .eq("chapter_id", chapterId)
      .order("page_number", { ascending: true });
    if (pagesError) throw pagesError;
    chapter.pages = pages || [];

    const sections = [
      "OBRA: " + (manga.title || "Sem título"),
      "DESCRIÇÃO DA OBRA: " + (manga.description || "Não informada"),
      "GÊNEROS: " + (manga.genres || "Não informados"),
      "CAPÍTULO: " + (chapter.title || ("Capítulo " + chapter.chapter_number)),
      "PÁGINAS: " + chapter.pages.length
    ];
    let textCount = 0;
    (chapter.pages || []).forEach((page, pageIndex) => {
      const panels = Array.isArray(page.panels) ? page.panels.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
      panels.forEach((panel, panelIndex) => {
        const lines = [];
        const add = (label, value) => {
          if (typeof value === "string" && value.trim()) lines.push(label + ": " + value.trim());
        };
        add("Descrição", panel.description);
        add("Ação", panel.action);
        add("Câmera", panel.camera);
        add("Narração", panel.narration);
        if (Array.isArray(panel.dialogue)) {
          panel.dialogue.forEach((line) => {
            if (typeof line === "string" && line.trim()) lines.push("Diálogo: " + line.trim());
            else if (line && typeof line === "object") {
              const speaker = line.character || line.speaker || line.name || "Personagem";
              const spoken = line.text || line.line || line.dialogue || "";
              if (spoken) lines.push("Diálogo — " + speaker + ": " + spoken);
            }
          });
        } else {
          add("Diálogo", panel.dialogue);
        }
        if (lines.length) {
          sections.push("PÁGINA " + (page.page_number || pageIndex + 1) + " · QUADRO " + (panel.order || panelIndex + 1) + "\n" + lines.join("\n"));
          textCount += lines.join(" ").length;
        }
      });
    });
    if (!textCount) {
      sections.push("OBSERVAÇÃO: não há texto estruturado nos quadros deste capítulo. As imagens das páginas não foram enviadas e não serão interpretadas nesta análise.");
    }
    authorizedChapterContext = sections.join("\n\n").slice(0, 12000);
    $("chapterContextNotice").textContent = "Capítulo autorizado: " + manga.title + " · " + (chapter.title || ("Capítulo " + chapter.chapter_number)) + ". O Nox receberá somente os textos e metadados disponíveis quando você enviar uma pergunta. As imagens não são enviadas.";
    $("chapterContextNotice").hidden = false;
    addMessage("assistant", "Recebi o contexto autorizado do seu capítulo. Quando você enviar sua pergunta, vou usar os dados textuais disponíveis para ajudar na análise. Não recebi as imagens das páginas.");
  }

  function scrollMessages() {
    messages.scrollTop = messages.scrollHeight;
  }

  function showWelcome() {
    messages.replaceChildren($("welcome"));
    $("welcome").hidden = false;
  }

  function addMessage(role, content) {
    $("welcome").hidden = true;
    const item = document.createElement("article");
    item.className = "nox-message " + (role === "user" ? "user" : "assistant");
    const avatar = document.createElement("span");
    avatar.className = "nox-message-avatar";
    if (role === "user") {
      avatar.textContent = "Você";
    } else if (assistantAvatarUrl) {
      const image = document.createElement("img");
      image.src = assistantAvatarUrl;
      image.alt = "";
      image.onerror = () => { avatar.textContent = assistantName.trim().charAt(0).toUpperCase() || "N"; };
      avatar.append(image);
    } else {
      avatar.textContent = assistantName.trim().charAt(0).toUpperCase() || "N";
    }
    const bubble = document.createElement("div");
    bubble.className = "nox-message-content";
    bubble.textContent = content;
    item.append(avatar, bubble);
    messages.append(item);
    scrollMessages();
    return item;
  }

  function setBusy(value) {
    busy = value;
    $("sendButton").disabled = !serviceReady || value;
    $("messageInput").disabled = !serviceReady || value;
    $("sendButton").textContent = value ? "Pensando…" : "Enviar ↑";
  }

  function showError(error) {
    const message = error?.message || "Não foi possível concluir agora.";
    addMessage("assistant", "Não consegui concluir essa ação: " + message);
  }

  async function refreshConversations() {
    const box = $("conversationList");
    try {
      const result = await LinkStoryAI.conversations();
      box.replaceChildren();
      if (!result.conversations?.length) {
        const empty = document.createElement("p");
        empty.className = "nox-muted";
        empty.textContent = "Suas conversas aparecerão aqui.";
        box.append(empty);
        return;
      }
      result.conversations.forEach((conversation) => {
        const row = document.createElement("div");
        row.className = "nox-conversation-row";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nox-conversation" + (conversation.conversation_id === conversationId ? " active" : "");
        const title = document.createElement("strong");
        title.textContent = conversation.title || "Conversa";
        const preview = document.createElement("small");
        preview.textContent = conversation.preview || "";
        button.append(title, preview);
        button.addEventListener("click", () => openConversation(conversation.conversation_id));
        const rename = document.createElement("button");
        rename.type = "button";
        rename.className = "nox-conversation-edit";
        rename.textContent = "✎";
        rename.title = "Renomear conversa";
        rename.setAttribute("aria-label", "Renomear conversa");
        rename.addEventListener("click", async () => {
          const nextTitle = window.prompt("Nome desta conversa:", conversation.title || "");
          if (nextTitle === null || !nextTitle.trim()) return;
          try {
            await LinkStoryAI.updateConversationTitle(conversation.conversation_id, nextTitle.trim());
            await refreshConversations();
          } catch (error) {
            showError(error);
          }
        });
        row.append(button, rename);
        box.append(row);
      });
    } catch (error) {
      box.replaceChildren();
      const note = document.createElement("p");
      note.className = "nox-muted";
      note.textContent = error.message;
      box.append(note);
    }
  }

  async function openConversation(id) {
    if (!serviceReady || busy) return;
    if (id !== contextConversationId) clearChapterContext();
    try {
      const result = await LinkStoryAI.history(id);
      conversationId = result.conversation_id;
      messages.replaceChildren();
      (result.messages || []).forEach((message) => addMessage(message.role, message.content));
      await refreshConversations();
    } catch (error) {
      showError(error);
    }
  }

  function newConversation() {
    if (busy) return;
    conversationId = null;
    clearChapterContext();
    showWelcome();
    refreshConversations();
    $("messageInput").focus();
  }

  async function speakAnswer(text) {
    if (!$("voiceReplies").checked) return;
    try {
      const result = await LinkStoryAI.speak(text, $("voiceChoice").value);
      const audioUrl = URL.createObjectURL(result.audio);
      const audio = new Audio(audioUrl);
      audio.addEventListener("ended", () => URL.revokeObjectURL(audioUrl), { once: true });
      audio.addEventListener("error", () => URL.revokeObjectURL(audioUrl), { once: true });
      await audio.play();
    } catch (error) {
      addMessage("assistant", "A resposta em texto está pronta, mas não consegui reproduzir a voz: " + error.message);
    }
  }

  async function sendMessage(text) {
    const message = String(text || "").trim();
    if (!message || !serviceReady || busy) return;
    addMessage("user", message);
    $("messageInput").value = "";
    setBusy(true);
    try {
      const result = await LinkStoryAI.chat(message, conversationId, authorizedChapterContext);
      conversationId = result.conversation_id;
      if (authorizedChapterContext) contextConversationId = conversationId;
      addMessage("assistant", result.answer);
      await refreshConversations();
      await speakAnswer(result.answer);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
      $("messageInput").focus();
    }
  }

  async function checkService() {
    try {
      const health = await LinkStoryAI.health();
      if (health.authentication_configured) {
        try { applyAssistantProfile(await LinkStoryAI.preferences()); } catch (_) {}
      }
      if (health.status === "ready") {
        serviceReady = true;
        const voiceReady = Boolean(health.audio_models_ready);
        setStatus("Nox conectado", true);
        $("serviceNotice").classList.toggle("ready", voiceReady);
        if (!voiceReady) {
          $("serviceNotice").textContent = "Nox já está pronto para conversar por texto. Os recursos de voz ainda estão sendo preparados.";
        }
        ["messageInput", "sendButton"].forEach((id) => $(id).disabled = false);
        ["micButton", "voiceReplies", "voiceChoice"].forEach((id) => $(id).disabled = !voiceReady);
        $("memoryOpen").disabled = false;
        await refreshConversations();
      } else {
        $("memoryOpen").disabled = !health.authentication_configured;
        if (health.authentication_configured) await refreshConversations();
        const missing = [];
        if (!health.authentication_configured) missing.push("autenticação");
        if (!health.ollama_reachable) missing.push("servidor do modelo");
        if (!health.chat_model_ready) missing.push("modelo de conversa");
        if (!health.embedding_model_ready || !health.knowledge_base_ready) missing.push("base de conhecimento");
        if (!health.audio_models_ready) missing.push("modelos de voz");
        setStatus("Servidor ainda não está pronto");
        $("serviceNotice").textContent = "O servidor respondeu, mas ainda faltam: " + (missing.join(", ") || "verificações de prontidão") + ".";
      }
    } catch (error) {
      setStatus("Nox ainda não está conectado");
      $("serviceNotice").textContent = error.message + " A página está preparada, mas o servidor de IA ainda precisa ser hospedado e configurado.";
    }
  }

  async function openMemory() {
    if (!serviceReady) return;
    if (!$("memoryDialog").open) $("memoryDialog").showModal();
    $("memoryStatus").textContent = "Carregando suas memórias…";
    try {
      const [prefs, result] = await Promise.all([LinkStoryAI.preferences(), LinkStoryAI.memories()]);
      $("memoryEnabled").checked = Boolean(prefs.memory_enabled);
      $("assistantName").value = prefs.assistant_name || "Nox";
      $("assistantAvatarUrl").value = prefs.assistant_avatar_url || "";
      applyAssistantProfile(prefs);
      renderMemories(result.memories || []);
      $("memoryStatus").textContent = "";
    } catch (error) {
      $("memoryStatus").textContent = error.message;
    }
  }

  function renderMemories(items) {
    const box = $("memoryList");
    box.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "nox-muted";
      empty.textContent = "Você ainda não salvou nenhuma memória.";
      box.append(empty);
      return;
    }
    items.forEach((memory) => {
      const row = document.createElement("div");
      row.className = "nox-memory-item";
      const text = document.createElement("p");
      text.textContent = memory.content;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Editar";
      edit.addEventListener("click", async () => {
        const changed = window.prompt("Edite esta memória:", memory.content);
        if (changed === null || !changed.trim()) return;
        try {
          await LinkStoryAI.updateMemory(memory.id, changed.trim());
          await openMemory();
        } catch (error) {
          $("memoryStatus").textContent = error.message;
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Apagar";
      remove.addEventListener("click", async () => {
        if (!window.confirm("Apagar esta memória?")) return;
        try {
          await LinkStoryAI.deleteMemory(memory.id);
          await openMemory();
        } catch (error) {
          $("memoryStatus").textContent = error.message;
        }
      });
      row.append(text, edit, remove);
      box.append(row);
    });
  }

  async function toggleMemory() {
    try {
      const result = await LinkStoryAI.updatePreferences($("memoryEnabled").checked);
      $("memoryEnabled").checked = result.memory_enabled;
      $("memoryStatus").textContent = result.memory_enabled
        ? "Memória ativada. Suas notas podem ser usadas nas respostas."
        : "Memória desativada. Suas notas continuam sob seu controle, mas não entram nas respostas.";
    } catch (error) {
      $("memoryEnabled").checked = !$("memoryEnabled").checked;
      $("memoryStatus").textContent = error.message;
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      $("memoryStatus").textContent = "Este navegador não oferece gravação de áudio compatível.";
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recordingChunks = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) recordingChunks.push(event.data);
      });
      recorder.addEventListener("stop", async () => {
        stream.getTracks().forEach((track) => track.stop());
        $("micButton").textContent = "…";
        try {
          const blob = new Blob(recordingChunks, { type: recorder.mimeType || "audio/webm" });
          const extension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
          const result = await LinkStoryAI.transcribe(blob, "recording." + extension);
          $("messageInput").value = result.text || "";
          $("messageInput").focus();
        } catch (error) {
          showError(error);
        } finally {
          $("micButton").textContent = "🎙";
        }
      }, { once: true });
      recorder.start();
      $("micButton").textContent = "■";
      $("micButton").title = "Parar gravação";
    } catch (error) {
      showError(error);
    }
  }

  $("composer").addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage($("messageInput").value);
  });
  $("messageInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      $("composer").requestSubmit();
    }
  });
  $("newConversation").addEventListener("click", newConversation);
  $("sidebarNew").addEventListener("click", newConversation);
  $("memoryOpen").addEventListener("click", openMemory);
  $("memoryClose").addEventListener("click", () => $("memoryDialog").close());
  $("memoryEnabled").addEventListener("change", toggleMemory);
  $("saveAssistantProfile").addEventListener("click", async () => {
    const name = $("assistantName").value.trim();
    const avatarUrl = $("assistantAvatarUrl").value.trim();
    if (!name) {
      $("memoryStatus").textContent = "Escolha um nome para o assistente.";
      return;
    }
    try {
      const preferences = await LinkStoryAI.updateAssistantProfile(name, avatarUrl);
      applyAssistantProfile(preferences);
      $("memoryStatus").textContent = "Identidade salva somente na sua conta.";
    } catch (error) {
      $("memoryStatus").textContent = error.message;
    }
  });
  $("memoryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = $("memoryContent").value.trim();
    if (!content) return;
    try {
      await LinkStoryAI.saveMemory(content);
      $("memoryContent").value = "";
      await openMemory();
    } catch (error) {
      $("memoryStatus").textContent = error.message;
    }
  });
  $("micButton").addEventListener("click", () => {
    if (recorder?.state === "recording") {
      recorder.stop();
      $("micButton").title = "Gravar mensagem de voz";
    } else {
      startRecording();
    }
  });
  $("voiceReplies").checked = localStorage.getItem("nox_voice_replies") === "1";
  $("voiceReplies").addEventListener("change", () => {
    localStorage.setItem("nox_voice_replies", $("voiceReplies").checked ? "1" : "0");
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      $("messageInput").value = button.dataset.prompt;
      $("messageInput").focus();
      if (serviceReady) sendMessage(button.dataset.prompt);
    });
  });

  (async () => {
    try {
      const session = await getLinkStorySession();
      if (session.error || !session.data?.session?.access_token) {
        location.href = "login.html?next=nox.html";
        return;
      }
    } catch (_) {
      location.href = "login.html?next=nox.html";
      return;
    }
    $("memoryOpen").disabled = true;
    try {
      await loadAuthorizedChapterContext();
    } catch (error) {
      $("chapterContextNotice").textContent = error.message;
      $("chapterContextNotice").hidden = false;
    }
    await checkService();
  })();
})();
