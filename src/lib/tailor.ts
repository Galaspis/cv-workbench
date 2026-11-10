// Tailor a CV to a job ad with Claude, through the official Anthropic SDK.
// Two modes: rewrite an existing CV for a job (facts stay, wording and emphasis change), or build a new
// CV for a job from pasted text (an old CV, a LinkedIn profile, notes). Claude returns structured JSON
// checked against the schema below; facts such as employers, titles and dates are copied from the
// original CV by code, not taken from the model.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { createLocalizedResume, uid } from "../factory";
import type { Resume, Settings } from "../types";

/** A strong model, as Gal asked; tailoring is worth it and runs a few times a week. */
export const TAILOR_MODEL = "claude-opus-5-5";

export class TailorError extends Error {}

const Tailored = z.object({
  title: z.string().describe("Short document name, e.g. 'Senior Product Manager - Acme'"),
  jobTitle: z.string().describe("Professional title to show under the name"),
  summary: z.string(),
  experience: z.array(
    z.object({
      sourceIndex: z.number().int().describe("Index of this role in the source CV's experience list, or -1 if it comes from pasted text"),
      company: z.string(),
      role: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
      current: z.boolean(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({ school: z.string(), degree: z.string(), location: z.string(), start: z.string(), end: z.string(), details: z.string() }),
  ),
  skills: z.array(z.object({ name: z.string(), items: z.string() })),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), year: z.string() })),
  contact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string(),
    website: z.string(),
    github: z.string(),
  }),
  changes: z.array(z.string()).describe("What was changed for this job and why, 3 to 6 short items"),
  missing: z.array(z.string()).describe("Requirements in the job ad the candidate's material does not show"),
});
type TailoredCv = z.infer<typeof Tailored>;

const SYSTEM = `You are an expert recruiter and CV writer. You tailor a candidate's CV to one specific job ad.

Rules:
- Truth first. Never invent employers, job titles, dates, degrees, numbers, achievements or skills. Use only what the source material supports. You may reword, combine, reorder and cut.
- Put what this job cares about first: lead each role with its most relevant achievements, and use the job ad's own terms where the candidate's experience genuinely matches them.
- The summary is 2 to 4 sentences, written for this job. It may name the target role, but must not claim the candidate held a title they did not hold.
- Keep it to one page: at most 5 bullets for recent roles, fewer for older ones, each under about 25 words, starting with a strong verb.
- Skills: only skills the material supports, the ones the job asks for first.
- Write in the language requested. Keep names, companies and technical terms as they are.
- In "changes", explain what you changed for this job in plain words. In "missing", list job requirements the material does not show, so the candidate can add them only if they are true.
- Leave a field as an empty string when the material does not give it.`;

function client(settings: Settings) {
  const apiKey = settings.apiKey.trim();
  if (!apiKey.startsWith("sk-ant-")) {
    throw new TailorError("Tailoring uses Claude. Add an Anthropic API key (sk-ant-…) in Settings.");
  }
  // The browser talks to the site's own /anthropic-api relay, never straight to the internet.
  return new Anthropic({
    apiKey,
    baseURL: `${window.location.origin}/anthropic-api`,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
}

function cvAsText(resume: Resume) {
  const { contact, summary, experience, education, skills, languages, certifications, projects } = resume;
  return JSON.stringify(
    {
      contact,
      summary,
      experience: experience.map((e, i) => ({ index: i, ...e, id: undefined })),
      education: education.map((e) => ({ ...e, id: undefined })),
      skills: skills.map((s) => ({ name: s.name, items: s.items })),
      languages: languages.map((l) => ({ name: l.name, level: l.level })),
      certifications: certifications.map((c) => ({ name: c.name, issuer: c.issuer, year: c.year })),
      projects: projects.map((p) => ({ name: p.name, description: p.description, bullets: p.bullets })),
    },
    null,
    1,
  );
}

async function ask(settings: Settings, userText: string): Promise<TailoredCv> {
  const anthropic = client(settings);
  let response;
  try {
    response = await anthropic.beta.messages.parse({
      model: TAILOR_MODEL,
      max_tokens: 16000,
      output_config: { effort: "high", format: betaZodOutputFormat(Tailored) },
      // If Claude declines, the API finishes the same request on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: userText }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new TailorError("Anthropic rejected the API key. Check it in Settings.");
    if (e instanceof Anthropic.RateLimitError) throw new TailorError("Too many requests right now. Wait a minute and try again.");
    if (e instanceof Anthropic.APIError) throw new TailorError(`Claude could not tailor the CV (${e.status ?? "network"}): ${e.message}`);
    throw e;
  }
  if (response.stop_reason === "refusal") throw new TailorError("Claude declined this request. Try rewording the job ad.");
  if (response.stop_reason === "max_tokens") throw new TailorError("The CV was too long to tailor in one go. Shorten the pasted text and try again.");
  if (!response.parsed_output) throw new TailorError("Claude's answer could not be read. Try again.");
  return response.parsed_output;
}

const tailoredNote = (job: string, t: TailoredCv) => ({
  job: job.slice(0, 4000),
  changes: t.changes,
  missing: t.missing,
  at: Date.now(),
});

/** A new copy of an existing CV, rewritten for the job. The original is not changed. */
export async function tailorExistingCv(settings: Settings, source: Resume, job: string): Promise<Resume> {
  const language = source.locale === "he" ? "Hebrew" : source.locale === "en" ? "English" : source.locale;
  const t = await ask(
    settings,
    `<job_ad>\n${job}\n</job_ad>\n\n<cv format="json">\n${cvAsText(source)}\n</cv>\n\nTailor this CV to the job ad. Write in ${language}. Keep every role from the CV and set sourceIndex to the role's "index".`,
  );
  const byIndex = new Map(t.experience.filter((e) => e.sourceIndex >= 0).map((e) => [e.sourceIndex, e]));
  return {
    ...structuredClone(source),
    id: uid(),
    title: t.title || `${source.title} (tailored)`,
    updatedAt: Date.now(),
    contact: { ...source.contact, jobTitle: t.jobTitle || source.contact.jobTitle },
    summary: t.summary || source.summary,
    // Facts (company, title, dates) stay from the original; only the bullets are rewritten.
    experience: source.experience.map((orig, i) => {
      const fresh = byIndex.get(i);
      return { ...orig, id: uid(), bullets: fresh?.bullets.length ? fresh.bullets : orig.bullets };
    }),
    skills: t.skills.length ? t.skills.map((s) => ({ id: uid(), name: s.name, items: s.items })) : source.skills,
    tailoredFor: tailoredNote(job, t),
  };
}

/** A brand-new CV for the job, built from pasted material. */
export async function tailorNewCv(settings: Settings, material: string, job: string, locale: "en" | "he"): Promise<Resume> {
  const t = await ask(
    settings,
    `<job_ad>\n${job}\n</job_ad>\n\n<candidate_material>\n${material}\n</candidate_material>\n\nBuild a complete CV for this job from the candidate's material. Write in ${locale === "he" ? "Hebrew" : "English"}. Set sourceIndex to -1 for every role.`,
  );
  const base = createLocalizedResume(locale);
  return {
    ...base,
    title: t.title || base.title,
    contact: { ...base.contact, ...t.contact, jobTitle: t.jobTitle },
    summary: t.summary,
    experience: t.experience.map((e) => ({
      id: uid(),
      company: e.company,
      role: e.role,
      location: e.location,
      start: e.start,
      end: e.end,
      current: e.current,
      bullets: e.bullets,
    })),
    education: t.education.map((e) => ({ id: uid(), ...e })),
    skills: t.skills.map((s) => ({ id: uid(), name: s.name, items: s.items })),
    languages: t.languages.map((l) => ({ id: uid(), name: l.name, level: l.level })),
    certifications: t.certifications.map((c) => ({ id: uid(), name: c.name, issuer: c.issuer, year: c.year })),
    hidden: t.certifications.length ? base.hidden : [...base.hidden, "certifications"],
    tailoredFor: tailoredNote(job, t),
  };
}
