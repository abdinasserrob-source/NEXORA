/**
 * Réponse courte pour le widget chatbot (NEXORA+ / OpenAI).
 */
export async function openaiChatReply(userMessage: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "Tu es l’assistant NEXORA, e-commerce high-tech et lifestyle. Réponds en français, de façon concise et utile (livraison, retours, compte, produits). Ne invente pas de politiques contradictoires : renvoie vers le support pour les cas litigieux.",
          },
          { role: "user", content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[OpenAI]", res.status, t.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.error("[OpenAI]", e);
    return null;
  }
}
