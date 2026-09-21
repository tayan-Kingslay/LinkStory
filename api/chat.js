export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Configure OPENAI_API_KEY na Vercel para conectar a IA." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const input = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions: "Você é a LinkStory AI, assistente oficial do site LinkStory. Responda em português do Brasil, de forma natural, amigável e direta. Ajude usuários a entender, encontrar e usar o LinkStory. Não invente funcionalidades que não existem. Se não souber algo específico sobre o site, diga isso.",
        input
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Não foi possível falar com a IA." });

    const text = data.output_text ||
      data.output?.flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("") || "";

    return res.status(200).json({ text: text || "Não consegui gerar uma resposta agora." });
  } catch {
    return res.status(500).json({ error: "Erro ao conectar com a LinkStory AI." });
  }
}
