import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreHook } from "@/lib/score";

// gemini-2.5-flash returns 404 for new API keys (seen in Make). Override with GEMINI_MODEL if needed.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const WRITING_RULES = `Rewrite the LinkedIn hook (first two lines of a post) three different ways.
Rules:
- Plain words, no jargon.
- Never use em dashes or en dashes. Use commas, full stops or colons.
- Do not invent numbers, results, clients or claims. Only use facts found in the original hook.
- Each rewrite is two short lines at most, under 40 words.
- Each rewrite uses a different angle: 1) a question, 2) a bold contrast, 3) a specific story opener.
- Keep the author's meaning and voice.`;

const responseSchema = {
  type: "OBJECT",
  properties: {
    rewrites: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          angle: { type: "STRING" },
          text: { type: "STRING" },
        },
        required: ["angle", "text"],
      },
    },
  },
  required: ["rewrites"],
};

function clean(s: string) {
  return s.replace(/[–—]/g, ",");
}

export async function POST(req: Request) {
  const { name, designation, email, hook } = await req.json();

  if (!name || !email || !hook || hook.length > 600 || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Please fill in name, a valid email and a hook (max 600 characters)." }, { status: 400 });
  }

  const { score, rules, failures } = scoreHook(hook);

  let rewrites: { angle: string; text: string }[] = [];
  let aiError: string | null = null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${WRITING_RULES}\n\nOriginal hook:\n${hook}\n\nIssues found by our checker:\n${failures.join("\n") || "None"}` }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.7 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
    rewrites = parsed.rewrites.map((r: any) => ({ angle: clean(r.angle), text: clean(r.text) }));
  } catch (e: any) {
    aiError = e.message ?? "AI error";
    console.error("gemini failed", aiError);
  }

  const session = { name, designation, email, hook, score, rules, rewrites, ai_error: aiError };

  // Save to Supabase. Failures are logged loudly, never swallowed.
  let saveError: string | null = null;
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { error } = await supabase.from("hook_sessions").insert({
      name, designation, email, hook, score, rules, rewrites, ai_error: aiError,
    });
    if (error) throw new Error(error.message);
  } catch (e: any) {
    saveError = e.message;
    console.error("hook_sessions insert failed", saveError);
  }

  // Send to Make.com webhook (Task 01 scenario).
  try {
    const hookUrl = process.env.MAKE_WEBHOOK_URL;
    if (hookUrl) {
      const r = await fetch(hookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "hook_grader", ...session }),
      });
      if (!r.ok) throw new Error(`Make ${r.status}`);
    }
  } catch (e: any) {
    console.error("make webhook failed", e.message);
  }

  return NextResponse.json({ score, rules, rewrites, aiError, saveError });
}
