// Supabase Edge Function: ai-doctor
// Proxies chat requests to OpenAI or Anthropic using secrets stored in Supabase

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { "Content-Type": "application/json", ...corsHeaders } as HeadersInit;

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers,
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = body.messages ?? [];
    const provider: string | undefined = body.provider;
    const model: string | undefined = body.model;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages array" }), {
        status: 400,
        headers,
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    const chosenProvider =
      provider ||
      (OPENAI_API_KEY
        ? "openai"
        : ANTHROPIC_API_KEY
        ? "anthropic"
        : PERPLEXITY_API_KEY
        ? "perplexity"
        : undefined);

    if (!chosenProvider) {
      return new Response(
        JSON.stringify({
          error:
            "No provider configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY or PERPLEXITY_API_KEY to Supabase secrets and redeploy the function.",
        }),
        { status: 400, headers }
      );
    }

    const systemPrompt =
      "You are an AI medical assistant. Provide clear, empathetic, evidence-informed guidance. " +
      "You do not diagnose. Encourage seeking in-person care when appropriate and include safety warnings. " +
      "If you detect emergency red flags (e.g., chest pain, severe bleeding, shortness of breath, stroke signs, suicidal ideation), " +
      "instruct the user to seek emergency care immediately. Keep answers concise and actionable.";

    if (chosenProvider === "openai") {
      if (!OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 400, headers });
      }

      const oaiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
      ];

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "gpt-4.1-2025-04-14",
          messages: oaiMessages,
          temperature: 0.2,
          top_p: 0.9,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 800,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: `OpenAI error: ${errText}` }), { status: 500, headers });
      }

      const data = await resp.json();
      const reply = data?.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ reply }), { status: 200, headers });
    }

    // Perplexity
    if (chosenProvider === "perplexity") {
      if (!PERPLEXITY_API_KEY) {
        return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY not set" }), { status: 400, headers });
      }

      const pplxMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
      ];

      const pResp = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "llama-3.1-sonar-small-128k-online",
          messages: pplxMessages,
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 800,
        }),
      });

      if (!pResp.ok) {
        const errText = await pResp.text();
        return new Response(JSON.stringify({ error: `Perplexity error: ${errText}` }), { status: 500, headers });
      }

      const pData = await pResp.json();
      const reply = pData?.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ reply }), { status: 200, headers });
    }

    // Anthropic
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 400, headers });
    }

    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: [
        {
          type: "text",
          text: m.content,
        },
      ],
    }));

    const aResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: anthropicMessages,
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!aResp.ok) {
      const errText = await aResp.text();
      return new Response(JSON.stringify({ error: `Anthropic error: ${errText}` }), { status: 500, headers });
    }

    const aData = await aResp.json();
    const reply: string = aData?.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ reply }), { status: 200, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
