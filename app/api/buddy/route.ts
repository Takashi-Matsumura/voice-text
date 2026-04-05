const UPSTREAM_BASE = "http://localhost:8080";
const CHAT_URL = `${UPSTREAM_BASE}/v1/chat/completions`;
const MODELS_URL = `${UPSTREAM_BASE}/v1/models`;
const MODEL = "gemma4";

const SYSTEM_PROMPTS: Record<string, string> = {
  "ja-JP": `あなたは「ツッコミ仲間」のぶたキャラです。子供が音声入力で話した言葉を見守っています。
短い一言でツッコミやリアクションをしてください。
ルール：
- 必ず1文以内で返す（15〜30文字くらい）
- 面白く、やさしく、励ますように
- 子供が新しく言った言葉に対してツッコミ、感想、驚き、共感などをする
- 前に自分が言ったことと被らないようにする
- 絵文字は1個まで使ってOK
- 説教や説明はしない
- 相手は子供なので、わかりやすい言葉で`,
  "en-US": `You are a witty pig buddy watching a kid use voice-to-text. React to their NEW words with a short, funny comment.
Rules:
- Reply in ONE short sentence (under 40 characters ideal)
- Be funny, kind, and encouraging
- Don't repeat what you said before
- Max 1 emoji allowed
- Never lecture or explain
- Keep it simple — your audience is a kid`,
};

// GET: health / status check against the llama.cpp server
export async function GET() {
  const start = Date.now();
  try {
    const res = await fetch(MODELS_URL, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json().catch(() => null);
    const models = Array.isArray(data?.data)
      ? data.data.map((m: { id?: string }) => m?.id).filter(Boolean)
      : [];
    return Response.json({
      reachable: res.ok,
      httpStatus: res.status,
      latencyMs: Date.now() - start,
      upstreamUrl: MODELS_URL,
      configuredModel: MODEL,
      models,
    });
  } catch (e) {
    return Response.json({
      reachable: false,
      latencyMs: Date.now() - start,
      upstreamUrl: MODELS_URL,
      configuredModel: MODEL,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function POST(req: Request) {
  const start = Date.now();
  let requestMessages: { role: string; content: string }[] = [];

  try {
    const { buddyHistory, newTranscripts, lang } = (await req.json()) as {
      buddyHistory: string[];
      newTranscripts: string[];
      lang: string;
    };

    const systemPrompt = SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS["ja-JP"];

    // Build conversation: past buddy messages as assistant, new transcripts as user
    requestMessages = [{ role: "system", content: systemPrompt }];

    for (const msg of buddyHistory) {
      requestMessages.push({ role: "assistant", content: msg });
    }

    requestMessages.push({
      role: "user",
      content: newTranscripts.join("\n"),
    });

    const requestBody = {
      model: MODEL,
      messages: requestMessages,
      max_tokens: 80,
      temperature: 0.9,
    };

    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() ?? "";

    return Response.json({
      message,
      debug: {
        upstreamUrl: CHAT_URL,
        model: MODEL,
        httpStatus: response.status,
        latencyMs: Date.now() - start,
        requestMessages,
        requestParams: {
          max_tokens: requestBody.max_tokens,
          temperature: requestBody.temperature,
        },
        rawResponse: data,
      },
    });
  } catch (e) {
    return Response.json({
      message: "",
      debug: {
        upstreamUrl: CHAT_URL,
        model: MODEL,
        latencyMs: Date.now() - start,
        requestMessages,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}
