// Curated starter templates for the "New Prompt" flow. Each is a genuinely useful
// prompt skeleton with {{placeholders}} the author fills in. Pure data + helpers
// so it can be imported by both server (gallery page) and client (/new prefill).
//
// `category` MUST be one of PROMPT_CATEGORIES (see lib/constants.ts) so the
// prefilled category is valid in the create form's <select>.

export type PromptTemplate = {
  id: string;
  emoji: string;
  title: string; // gallery heading
  blurb: string; // one-line "what it's for"
  promptName: string; // prefilled prompt name
  description: string; // prefilled description
  category: string;
  tags: string[];
  body: string; // starter prompt body, with {{placeholders}}
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "cold-email",
    emoji: "✉️",
    title: "Cold outreach email",
    blurb: "A concise, personalized B2B cold email that gets replies.",
    promptName: "Cold outreach email",
    description: "Write a short, personalized cold email with a clear ask and one strong hook.",
    category: "Email",
    tags: ["sales", "outreach", "b2b"],
    body: `You are a senior B2B copywriter. Write a cold email to {{prospect_role}} at {{company}}.

Context about us: {{what_we_do}}
Why them specifically: {{personalized_hook}}
The one action I want: {{call_to_action}}

Rules:
- Under 120 words, 5th-grade reading level.
- Open with the personalized hook, not about us.
- One clear CTA, no more than one link.
- No buzzwords ("synergy", "leverage", "circle back").
- Plain, warm, human tone. Sign off as {{my_name}}.

Return: subject line + body.`,
  },
  {
    id: "code-review",
    emoji: "🔍",
    title: "Code review",
    blurb: "A focused review that flags real bugs before style nits.",
    promptName: "Code review assistant",
    description: "Review a code diff for correctness bugs first, then clarity and simplifications.",
    category: "Code Review",
    tags: ["code-review", "engineering", "quality"],
    body: `You are a meticulous staff engineer reviewing a pull request.

Review this code:
\`\`\`{{language}}
{{paste_code_or_diff}}
\`\`\`

Prioritize in this order:
1. Correctness bugs, edge cases, and data-loss / security risks.
2. Misleading names, dead code, and missing error handling.
3. Simplifications and reuse opportunities.

For each finding: cite the exact line, explain the impact in one sentence, and show the minimal fix. Skip subjective style. If the code is solid, say so plainly.`,
  },
  {
    id: "debug-helper",
    emoji: "🐞",
    title: "Debug an error",
    blurb: "Turn a stack trace into ranked hypotheses and next steps.",
    promptName: "Debugging assistant",
    description: "Diagnose an error from a stack trace with ranked root-cause hypotheses.",
    category: "Debugging",
    tags: ["debugging", "engineering"],
    body: `You are an expert debugger. Help me find the root cause.

Stack/error:
\`\`\`
{{paste_error}}
\`\`\`
What I expected: {{expected}}
What happened: {{actual}}
Relevant code:
\`\`\`{{language}}
{{paste_code}}
\`\`\`

Give me:
1. The 3 most likely root causes, ranked, with why.
2. The single fastest check to confirm #1.
3. The concrete fix once confirmed.
Be specific; no generic "add logging" advice unless you say exactly what to log.`,
  },
  {
    id: "blog-post",
    emoji: "📝",
    title: "Blog post draft",
    blurb: "A structured first draft from a title and a few bullet points.",
    promptName: "Blog post writer",
    description: "Draft an engaging, well-structured blog post from a topic and key points.",
    category: "Content Creation",
    tags: ["writing", "blog", "content"],
    body: `You are an experienced content writer.

Write a blog post.
Title/topic: {{topic}}
Audience: {{audience}}
Key points to cover: {{key_points}}
Desired tone: {{tone}}
Target length: {{word_count}} words

Structure: a hook intro, scannable H2 sections, short paragraphs, one practical example per section, and a takeaway conclusion. Avoid filler and AI clichés ("in today's fast-paced world", "unlock", "delve"). Write in active voice.`,
  },
  {
    id: "summarize",
    emoji: "📄",
    title: "Summarize anything",
    blurb: "A tight summary with key points and action items.",
    promptName: "Summarizer",
    description: "Summarize long text into a brief, key points, and action items.",
    category: "Summarization",
    tags: ["summary", "productivity"],
    body: `Summarize the text below for a busy {{audience}}.

Text:
"""
{{paste_text}}
"""

Return exactly:
- TL;DR: one sentence.
- Key points: 3–5 bullets.
- Action items: only if any are implied, as a checklist.
Preserve numbers and names accurately. Do not add information that isn't in the text.`,
  },
  {
    id: "translate",
    emoji: "🌍",
    title: "Translate with nuance",
    blurb: "Natural translation that keeps tone and intent, not word-for-word.",
    promptName: "Nuanced translator",
    description: "Translate text naturally while preserving tone, register, and intent.",
    category: "Translation",
    tags: ["translation", "localization"],
    body: `Translate the text from {{source_language}} to {{target_language}}.

Text:
"""
{{paste_text}}
"""

Translate for meaning and natural flow, not word-for-word. Match the register ({{formal_or_casual}}). Keep names, brands, and code untouched. If a phrase is idiomatic, use the closest natural equivalent and add a short [note] only if meaning would otherwise be lost.`,
  },
  {
    id: "seo-meta",
    emoji: "🔑",
    title: "SEO title & meta",
    blurb: "Click-worthy titles and meta descriptions within length limits.",
    promptName: "SEO meta generator",
    description: "Generate SEO titles and meta descriptions optimized for a target keyword.",
    category: "SEO",
    tags: ["seo", "marketing"],
    body: `You are an SEO specialist. For the page below, write metadata optimized for the keyword "{{target_keyword}}".

Page topic: {{page_topic}}
Audience intent: {{search_intent}}

Return 3 options, each with:
- Title tag (≤60 chars, keyword near the front, compelling).
- Meta description (≤155 chars, includes the keyword and a clear benefit + soft CTA).
Avoid clickbait and keyword stuffing. Output as a table.`,
  },
  {
    id: "social-thread",
    emoji: "🧵",
    title: "Social thread / post",
    blurb: "A hook-driven thread or post tuned to one platform.",
    promptName: "Social media post",
    description: "Turn an idea into a platform-tuned, hook-first social post or thread.",
    category: "Social Media",
    tags: ["social", "marketing", "content"],
    body: `You are a social media writer for {{platform}}.

Turn this idea into a post/thread: {{idea}}
Audience: {{audience}}
Goal: {{goal}}

Rules:
- Start with a scroll-stopping hook in the first line.
- One idea per line/post; concrete over abstract.
- Match {{platform}} norms and length limits.
- End with a light CTA or question.
No hashtags unless they add reach on this platform. Give me the full post/thread ready to paste.`,
  },
  {
    id: "explain-concept",
    emoji: "🎓",
    title: "Explain like I'm new",
    blurb: "Clear, layered explanation with an analogy and a check.",
    promptName: "Concept explainer",
    description: "Explain a complex concept simply, with an analogy and a quick comprehension check.",
    category: "Learning",
    tags: ["learning", "education", "explainer"],
    body: `Explain {{concept}} to someone who is {{background}}.

Do it in layers:
1. One-sentence plain-English definition.
2. A concrete everyday analogy.
3. How it actually works, in 3–5 steps.
4. One common misconception, corrected.
5. A single question to check I understood it.

Avoid jargon; when a technical term is unavoidable, define it inline.`,
  },
  {
    id: "brainstorm",
    emoji: "💡",
    title: "Brainstorm ideas",
    blurb: "Diverse, non-obvious ideas with quick pros/cons.",
    promptName: "Idea brainstormer",
    description: "Generate diverse, non-obvious ideas for a goal, with quick trade-offs.",
    category: "Brainstorming",
    tags: ["brainstorm", "ideation", "strategy"],
    body: `Brainstorm ideas for: {{goal}}

Constraints/context: {{constraints}}

Give me 10 ideas spanning safe → bold. For each: a one-line pitch, the main upside, and the main risk. Deliberately include 2 unconventional options most people would skip. Then recommend the top 3 to try first and why.`,
  },
  {
    id: "image-gen",
    emoji: "🎨",
    title: "Image generation prompt",
    blurb: "A detailed, controllable prompt for image models.",
    promptName: "Image generation prompt",
    description: "Craft a detailed image-generation prompt with subject, style, and composition.",
    category: "Image Generation",
    tags: ["image", "midjourney", "design"],
    body: `Write an image-generation prompt for {{subject}}.

Build it with these controls, comma-separated, most important first:
- Subject & action: {{subject_detail}}
- Style/medium: {{style}} (e.g. photo, 3D render, watercolor)
- Composition: {{shot}} (e.g. close-up, wide shot), {{angle}}
- Lighting & mood: {{lighting}}
- Color palette: {{palette}}
- Quality/detail tags: {{quality_tags}}

Then add a short "negative prompt" of things to avoid. Keep it concrete and visual; no vague adjectives like "beautiful" without specifics.`,
  },
];

export function listTemplates(): PromptTemplate[] {
  return PROMPT_TEMPLATES;
}

export function getTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}
