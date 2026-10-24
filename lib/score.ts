// Deterministic hook scoring. No AI. Same hook always gives the same score.
export type RuleResult = { id: string; label: string; points: number; max: number; passed: boolean; tip: string };

const FILLER_OPENERS = [
  /^(i am|i'm) (excited|thrilled|happy|proud|pleased)/i,
  /^(hi|hello|hey) (everyone|all|connections|network)/i,
  /^(today|just) (i|we) (want|wanted) to (share|announce)/i,
  /^(i am|i'm) (writing|posting) (this|to)/i,
  /^(as we all know|in today's world)/i,
];

export function scoreHook(raw: string): { score: number; rules: RuleResult[]; failures: string[] } {
  const hook = raw.trim().replace(/\s+/g, " ");
  const lines = raw.trim().split(/\n+/).filter(Boolean);
  const words = hook.split(" ").filter(Boolean);
  const first = lines[0] ?? hook;
  const firstWords = first.split(" ").filter(Boolean).length;

  const rules: RuleResult[] = [
    {
      id: "length",
      label: "Short enough to read in the feed",
      max: 20,
      passed: words.length >= 8 && words.length <= 30,
      points: 0,
      tip: "Keep the two lines between 8 and 30 words total so they fit before the 'see more' cut.",
    },
    {
      id: "first_line",
      label: "Punchy first line",
      max: 20,
      passed: firstWords >= 3 && firstWords <= 12,
      points: 0,
      tip: "Make the first line 3 to 12 words. It has to stand alone.",
    },
    {
      id: "specific",
      label: "Contains a specific number",
      max: 20,
      passed: /\d/.test(hook),
      points: 0,
      tip: "Add one real number (days, clients, percent, rupees). Specifics beat vague claims.",
    },
    {
      id: "curiosity",
      label: "Creates curiosity or tension",
      max: 20,
      passed: /\?|\b(but|until|nobody|never|stop|mistake|wrong|truth|secret|why|how i|what i)\b/i.test(hook),
      points: 0,
      tip: "Open a loop: a question, a contrast, or a 'mistake' or 'why' angle that makes people tap see more.",
    },
    {
      id: "no_filler",
      label: "No filler opener",
      max: 20,
      passed: !FILLER_OPENERS.some((r) => r.test(first)),
      points: 0,
      tip: "Cut openers like 'I am excited to share'. Start with the point.",
    },
  ];

  for (const r of rules) r.points = r.passed ? r.max : 0;
  const score = rules.reduce((s, r) => s + r.points, 0);
  const failures = rules.filter((r) => !r.passed).map((r) => r.tip);
  return { score, rules, failures };
}
