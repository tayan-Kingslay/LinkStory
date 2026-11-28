(() => {
  "use strict";

  function apiBase() {
    const value = window.LINKSTORY_AI_API_URL;
    if (!value || typeof value !== "string") {
      throw new Error("O serviço da LinkStory AI ainda não foi configurado.");
    }
    return value.replace(/\/+$/, "");
  }

  async function sessionToken() {
    if (typeof getLinkStorySession !== "function") {
      throw new Error("O módulo de autenticação do LinkStory não foi carregado.");
    }
    const { data, error } = await getLinkStorySession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) throw new Error("Entre na sua conta LinkStory para usar a IA.");
    return token;
  }

  async function request(path, options = {}) {
    const token = await sessionToken();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", "Bearer " + token);
    const response = await fetch(apiBase() + path, { ...options, headers });
    if (!response.ok) {
      let message = "A LinkStory AI não conseguiu concluir a solicitação.";
      try {
        const body = await response.json();
        if (body?.detail) message = body.detail;
      } catch (_) {}
      throw new Error(message);
    }
    return response;
  }

  function decodeTimings(value) {
    if (!value) return [];
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function chat(message, conversationId = null, context = null) {
    const response = await request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversation_id: conversationId, context })
    });
    return response.json();
  }

  async function history(conversationId) {
    const response = await request("/conversations/" + encodeURIComponent(conversationId));
    return response.json();
  }

  async function updateConversationTitle(conversationId, title) {
    const response = await request("/conversations/" + encodeURIComponent(conversationId) + "/title", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    return response.json();
  }

  async function conversations() {
    const response = await request("/conversations");
    return response.json();
  }

  async function preferences() {
    const response = await request("/preferences");
    return response.json();
  }

  async function updatePreferences(memoryEnabled) {
    const response = await request("/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memory_enabled: Boolean(memoryEnabled) })
    });
    return response.json();
  }

  async function updateAssistantProfile(name, avatarUrl) {
    const response = await request("/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistant_name: name, assistant_avatar_url: avatarUrl })
    });
    return response.json();
  }

  async function updateMemory(memoryId, content) {
    const response = await request("/memories/" + encodeURIComponent(memoryId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    return response.json();
  }

  async function transcribe(blob, filename = "recording.webm") {
    const form = new FormData();
    form.append("file", blob, filename);
    const response = await request("/transcribe", { method: "POST", body: form });
    return response.json();
  }

  async function speak(text, voice) {
    if (voice !== "pf_dora" && voice !== "pm_alex") {
      throw new Error("Escolha uma voz antes de iniciar a fala.");
    }
    const response = await request("/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice })
    });
    return {
      audio: await response.blob(),
      voice: response.headers.get("X-LinkStory-Voice") || voice,
      wordTimings: decodeTimings(response.headers.get("X-LinkStory-Word-Timings"))
    };
  }

  async function memories() {
    const response = await request("/memories");
    return response.json();
  }

  async function saveMemory(content) {
    const response = await request("/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    return response.json();
  }

  async function deleteMemory(memoryId) {
    const response = await request("/memories/" + encodeURIComponent(memoryId), {
      method: "DELETE"
    });
    return response.json();
  }

  async function health() {
    const response = await fetch(apiBase() + "/health", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível verificar a LinkStory AI.");
    return response.json();
  }

  window.LinkStoryAI = Object.freeze({
    chat, history, conversations, updateConversationTitle, preferences, updatePreferences, updateAssistantProfile,
    transcribe, speak, memories, saveMemory, updateMemory, deleteMemory, health
  });
})();
