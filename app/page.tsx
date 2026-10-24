"use client";
import { useState } from "react";

type Rule = { id: string; label: string; points: number; max: number; passed: boolean; tip: string };
type Result = { score: number; rules: Rule[]; rewrites: { angle: string; text: string }[]; aiError: string | null };

export default function Page() {
  const [step, setStep] = useState<"landing" | "form" | "loading" | "results">("landing");
  const [form, setForm] = useState({ name: "", designation: "", email: "", hook: "" });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("loading");
    try {
      const res = await fetch("/api/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
      setStep("results");
    } catch (err: any) {
      setError(err.message);
      setStep("form");
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      {step === "landing" && (
        <>
          <h1>LinkedIn Hook Grader</h1>
          <p>Paste the first two lines of your LinkedIn post. Get a score out of 100 and 3 better rewrites. Free.</p>
          <button onClick={() => setStep("form")} style={btn}>Grade my hook</button>
        </>
      )}

      {(step === "form" || step === "loading") && (
        <form onSubmit={submit}>
          <h2>Your details and hook</h2>
          <input required placeholder="Name" value={form.name} onChange={set("name")} style={inp} />
          <input required placeholder="Designation" value={form.designation} onChange={set("designation")} style={inp} />
          <input required type="email" placeholder="Work email" value={form.email} onChange={set("email")} style={inp} />
          <textarea required rows={4} maxLength={600} placeholder="Paste the first two lines of your post" value={form.hook} onChange={set("hook")} style={inp} />
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <button disabled={step === "loading"} style={btn}>{step === "loading" ? "Grading..." : "Get my score"}</button>
        </form>
      )}

      {step === "results" && result && (
        <>
          <h2>Your score: {result.score}/100</h2>
          <ul style={{ paddingLeft: 18 }}>
            {result.rules.map((r) => (
              <li key={r.id} style={{ marginBottom: 6 }}>
                {r.passed ? "✅" : "❌"} <b>{r.label}</b> ({r.points}/{r.max})
                {!r.passed && <div style={{ color: "#555" }}>{r.tip}</div>}
              </li>
            ))}
          </ul>
          <h3>3 rewrites</h3>
          {result.rewrites.length === 0 && <p>Rewrites are unavailable right now. Your score above is still valid.</p>}
          {result.rewrites.map((r, i) => (
            <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <small style={{ color: "#777" }}>{r.angle}</small>
              <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{r.text}</p>
            </div>
          ))}
          <button onClick={() => { setResult(null); setStep("form"); }} style={btn}>Try another hook</button>
        </>
      )}
    </main>
  );
}

const inp: React.CSSProperties = { display: "block", width: "100%", padding: 10, marginBottom: 10, fontSize: 16, boxSizing: "border-box" };
const btn: React.CSSProperties = { padding: "10px 18px", fontSize: 16, cursor: "pointer" };
