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

export async function POST(req: Request) {
  try {
    const { buddyHistory, newTranscripts, lang } = (await req.json()) as {
      buddyHistory: string[];
      newTranscripts: string[];
      lang: string;
    };

    const systemPrompt = SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS["ja-JP"];

    // Build conversation: past buddy messages as assistant, new transcripts as user
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of buddyHistory) {
      messages.push({ role: "assistant", content: msg });
    }

    messages.push({
      role: "user",
      content: newTranscripts.join("\n"),
    });

    const response = await fetch("http://localhost:8080/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma4",
        messages,
        max_tokens: 80,
        temperature: 0.9,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() ?? "";

    return Response.json({ message });
  } catch {
    return Response.json({ message: "" });
  }
}
