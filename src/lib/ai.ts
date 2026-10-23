import type { Resume, Settings } from "../types";

export class AiError extends Error {}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function cleanApiKey(raw: string) {
  return raw
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^API[_ ]?KEY\s*[:=]\s*/i, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, "");
}

function keyHint(apiKey: string) {
  const prefix = apiKey.startsWith("sk-ant-") ? "sk-ant-…" : `${apiKey.slice(0, 6)}…`;
  return `${prefix} (${apiKey.length} chars)`;
}

function readySettings(settings: Settings) {
  const apiKey = cleanApiKey(settings.apiKey);
  const model = settings.model.trim() || "gpt-4o-mini";
  const base = settings.baseUrl.trim().replace(/\/$/, "") || "https://api.openai.com/v1";
  if (!apiKey) {
    throw new AiError("Add an API key in Settings to use AI features.");
  }
  return { apiKey, model, base, anthropic: apiKey.startsWith("sk-ant-") || /anthropic/i.test(base) };
}

function formatApiError(status: number, text: string) {
  const snippet = text.slice(0, 500);
  if (/<!doctype html|<html/i.test(text)) {
    return "Could not reach Anthropic. Restart the app with npm run dev and try Test connection again.";
  }
  let msg = snippet || `AI request failed (${status})`;
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; type?: string };
      message?: string;
    };
    msg = parsed.error?.message || parsed.message || msg;
  } catch {
    /* keep snippet */
  }
  if (/cors/i.test(msg)) {
    return `HTTP ${status}: Anthropic blocked a browser Origin header. Restart npm run dev so the local proxy can retry without it. (${msg})`;
  }
  if (status === 401 || /invalid x-api-key|authentication_error|invalid api key/i.test(msg)) {
    return `HTTP ${status}: ${msg}`;
  }
  return `HTTP ${status}: ${msg}`;
}

function parseJsonContent<T>(content: string): T {
  const trimmed = content.trim();
  if (!trimmed) throw new AiError("The model returned an empty reply.");
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) return JSON.parse(fence[1]) as T;
    const brace = trimmed.match(/\{[\s\S]*\}/);
    if (brace) return JSON.parse(brace[0]) as T;
    throw new AiError("The model did not return JSON. Try claude-haiku-4-5-20251001.");
  }
}

function claudeModel(model: string) {
  if (/claude/i.test(model)) return model;
  return "claude-haiku-4-5-20251001";
}

async function postAnthropic(
  settings: Settings,
  body: Record<string, unknown>,
): Promise<{ choices?: { message?: { content?: string } }[] }> {
  const { apiKey } = readySettings(settings);
  const messages = (body.messages as ChatMessage[]) ?? [];
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const converted = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  if (!converted.length || converted[0].role !== "user") {
    converted.unshift({ role: "user", content: "Continue." });
  }
  const payload = JSON.stringify({
    model: claudeModel(settings.model),
    max_tokens: (body.max_tokens as number) || 2048,
    temperature: body.temperature ?? 0.4,
    ...(system ? { system } : {}),
    messages: converted,
  });
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    Authorization: `Bearer ${apiKey}`,
    "anthropic-version": "2023-06-01",
  };
  let res = await fetch("/anthropic-api/v1/messages", { method: "POST", headers, body: payload });
  let text = await res.text();
  if (!res.ok && (res.status === 404 || /<!doctype html|<html/i.test(text))) {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        ...headers,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: payload,
    });
    text = await res.text();
  }
  if (!res.ok) {
    throw new AiError(`${formatApiError(res.status, text)} Saved key ${keyHint(apiKey)}.`);
  }
  const data = JSON.parse(text) as { content?: { type?: string; text?: string }[] };
  const reply = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  return { choices: [{ message: { content: reply } }] };
}

async function postChat(
  settings: Settings,
  body: Record<string, unknown>,
): Promise<{ choices?: { message?: { content?: string } }[] }> {
  const { apiKey, model, base, anthropic } = readySettings(settings);
  if (anthropic) return postAnthropic(settings, body);
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, ...body }),
  });
  if (!res.ok) {
    throw new AiError(formatApiError(res.status, await res.text()));
  }
  return (await res.json()) as { choices?: { message?: { content?: string } }[] };
}

export async function chatJson<T>(settings: Settings, messages: ChatMessage[]): Promise<T> {
  const payload = { temperature: 0.4, messages };
  try {
    const data = await postChat(settings, { ...payload, response_format: { type: "json_object" } });
    return parseJsonContent<T>(data.choices?.[0]?.message?.content ?? "");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!/response_format|json_object|json mode/i.test(msg)) throw e;
    const data = await postChat(settings, payload);
    return parseJsonContent<T>(data.choices?.[0]?.message?.content ?? "");
  }
}

export async function chatText(settings: Settings, messages: ChatMessage[]): Promise<string> {
  const data = await postChat(settings, { temperature: 0.5, messages });
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

export async function pingAi(settings: Settings) {
  const data = await postChat(settings, {
    temperature: 0,
    max_tokens: 8,
    messages: [{ role: "user", content: "Reply with the single word pong" }],
  });
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new AiError("Connected, but the model returned an empty reply. Check the model name.");
  return text;
}

export function resumePlainText(resume: Resume) {
  const name = `${resume.contact.firstName} ${resume.contact.lastName}`.trim();
  const lines: string[] = [
    name,
    resume.contact.jobTitle,
    [resume.contact.email, resume.contact.phone, resume.contact.location].filter(Boolean).join(" · "),
    "",
    resume.summary,
    "",
  ];
  for (const job of resume.experience) {
    lines.push(`${job.role} — ${job.company} (${job.start}–${job.current ? "present" : job.end})`);
    job.bullets.filter(Boolean).forEach((b) => lines.push(`- ${b}`));
  }
  lines.push("");
  for (const ed of resume.education) {
    lines.push(`${ed.degree}, ${ed.school} (${ed.start}–${ed.end})`);
  }
  lines.push("");
  resume.skills.forEach((g) => lines.push(`${g.name}: ${g.items}`));
  resume.languages.forEach((l) => lines.push(`${l.name}: ${l.level}`));
  resume.projects.forEach((p) => {
    lines.push(p.name);
    p.bullets.filter(Boolean).forEach((b) => lines.push(`- ${b}`));
  });
  return lines.filter((l) => l !== undefined).join("\n");
}

export async function improveSummary(settings: Settings, resume: Resume, jobDescription = "") {
  const data = await chatJson<{ summary: string }>(settings, [
    {
      role: "system",
      content:
        "You rewrite resume summaries. Keep facts. Be specific, 3-4 sentences max, first person implied without using I. Return JSON {summary}.",
    },
    {
      role: "user",
      content: JSON.stringify({
        current: resume.summary,
        role: resume.contact.jobTitle,
        experience: resume.experience,
        jobDescription,
      }),
    },
  ]);
  return data.summary;
}

export async function rewriteBullet(settings: Settings, bullet: string, role: string) {
  const data = await chatJson<{ bullet: string }>(settings, [
    {
      role: "system",
      content:
        "Rewrite one resume bullet. Start with a strong verb, include a metric if present, no first person. Return JSON {bullet}.",
    },
    { role: "user", content: JSON.stringify({ bullet, role }) },
  ]);
  return data.bullet;
}

export async function suggestBullets(settings: Settings, role: string, company: string) {
  const data = await chatJson<{ bullets: string[] }>(settings, [
    {
      role: "system",
      content:
        "Suggest 4 achievement-style resume bullets for this role. Return JSON {bullets: string[]}.",
    },
    { role: "user", content: JSON.stringify({ role, company }) },
  ]);
  return data.bullets ?? [];
}

export async function suggestSkills(settings: Settings, resume: Resume, jobDescription: string) {
  const data = await chatJson<{ missing: string[]; keep: string[] }>(settings, [
    {
      role: "system",
      content:
        "Compare a resume to a job description. Return JSON {missing: string[], keep: string[]} with skills the resume should consider adding, and skills already present that match.",
    },
    {
      role: "user",
      content: JSON.stringify({ resume: resumePlainText(resume), jobDescription }),
    },
  ]);
  return data;
}

export type AtsScoreResult = {
  score: number;
  verdict: string;
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: string[];
};

export async function scoreAts(settings: Settings, resume: Resume, jobDescription: string) {
  return chatJson<AtsScoreResult>(settings, [
    {
      role: "system",
      content:
        "You are an expert ATS (Applicant Tracking System) resume screener. Score the CV against the job description. Focus on keyword match, required skills, relevant experience, and education. Reply ONLY with JSON: {score:0-100, verdict:string, matched_keywords:string[], missing_keywords:string[], suggestions:string[]}. verdict should be one of: apply, maybe, fix.",
    },
    {
      role: "user",
      content: `JOB DESCRIPTION:\n${jobDescription.slice(0, 8000)}\n\nCV:\n${resumePlainText(resume)}`,
    },
  ]);
}

export async function translateResume(settings: Settings, resume: Resume, language: string) {
  return chatJson<Pick<
    Resume,
    | "summary"
    | "experience"
    | "education"
    | "skills"
    | "languages"
    | "projects"
    | "certifications"
    | "custom"
    | "titles"
    | "contact"
  >>(settings, [
    {
      role: "system",
      content: `Translate resume content into ${language}. Keep company names, product names, and URLs. Preserve JSON shape of the provided object. Return that same JSON object.`,
    },
    {
      role: "user",
      content: JSON.stringify({
        contact: resume.contact,
        summary: resume.summary,
        experience: resume.experience,
        education: resume.education,
        skills: resume.skills,
        languages: resume.languages,
        projects: resume.projects,
        certifications: resume.certifications,
        custom: resume.custom,
        titles: resume.titles,
      }),
    },
  ]);
}

export async function parseResumeText(settings: Settings, text: string) {
  return chatJson<{
    contact: Resume["contact"];
    summary: string;
    experience: Resume["experience"];
    education: Resume["education"];
    skills: Resume["skills"];
    languages: Resume["languages"];
    projects: Resume["projects"];
    certifications: Resume["certifications"];
  }>(settings, [
    {
      role: "system",
      content:
        "Extract a structured resume from messy text. Invent ids as uuid-like strings. Return JSON with contact, summary, experience, education, skills, languages, projects, certifications.",
    },
    { role: "user", content: text },
  ]);
}

export async function generateCoverLetter(
  settings: Settings,
  resume: Resume,
  company: string,
  jobTitle: string,
  jobDescription: string,
  hiringManager: string,
) {
  return chatText(settings, [
    {
      role: "system",
      content:
        "Write a professional cover letter of 3 short paragraphs plus a closing. No markdown. Use only facts from the resume. Address the hiring manager if provided.",
    },
    {
      role: "user",
      content: JSON.stringify({
        resume: resumePlainText(resume),
        company,
        jobTitle,
        jobDescription,
        hiringManager,
      }),
    },
  ]);
}

export async function generateResignation(
  settings: Settings,
  input: {
    managerName: string;
    company: string;
    position: string;
    lastDay: string;
    notice: string;
    reason: string;
  },
) {
  return chatText(settings, [
    {
      role: "system",
      content:
        "Write a short, courteous resignation letter. 3 paragraphs. No markdown. Grateful tone, clear last day, offer a clean handoff.",
    },
    { role: "user", content: JSON.stringify(input) },
  ]);
}
