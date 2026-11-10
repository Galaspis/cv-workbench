// The AI helper: a chat about the open CV. The model answers and may propose specific edits (summary,
// professional title, one bullet, a new bullet, a skills group). Nothing changes until the person applies
// an edit; applying is done here, by index, against the current CV.
import { z } from "zod";
import type { Resume, Settings } from "../types";
import { askStructured, type Turn } from "./llm";
import { modelFor } from "./models";

const Edit = z.object({
  field: z.enum(["summary", "jobTitle", "bullet", "newBullet", "skillGroup"]),
  roleIndex: z.number().int().describe("Role index for bullet/newBullet; skills group index for skillGroup (-1 adds a new group); -1 otherwise"),
  bulletIndex: z.number().int().describe("Bullet index for bullet; -1 otherwise"),
  text: z.string().describe("The full new text. For skillGroup: 'Group name: item, item, item'"),
  why: z.string().describe("One short sentence on why this helps"),
});
const HelperReply = z.object({
  reply: z.string().describe("Your answer to the person, in plain words"),
  edits: z.array(Edit).describe("Proposed changes; empty when no change is needed or asked for"),
});
export type HelperEdit = z.infer<typeof Edit>;
export type HelperAnswer = z.infer<typeof HelperReply>;

const SYSTEM = `You are a sharp, friendly career coach inside a CV editor. You help the person improve the CV shown below.

How to answer:
- Reply in the same language as the person's last message, briefly and concretely.
- When they ask for changes, or a change would clearly help with what they asked, propose edits. Each edit replaces one piece of the CV, so give the full new text.
- Truth first: never invent employers, titles, dates, degrees, numbers, achievements or skills. Reword, reorder, tighten and emphasise what is there. If something would need facts you don't have, ask for them instead.
- Write edits in the CV's own language (the "language" field), whatever language the person writes in.
- Use the indexes exactly as they appear in the CV data. Bullets: start with a strong verb, under about 25 words.
- If a job ad is given, aim the CV at that job.`;

/** The CV as the model sees it, with the indexes the edits refer to. */
function cvForHelper(resume: Resume) {
  return JSON.stringify({
    language: resume.locale === "he" ? "Hebrew" : resume.locale === "en" ? "English" : resume.locale,
    jobTitle: resume.contact.jobTitle,
    summary: resume.summary,
    experience: resume.experience.map((e, roleIndex) => ({
      roleIndex,
      role: e.role,
      company: e.company,
      dates: `${e.start} - ${e.current ? "present" : e.end}`,
      bullets: e.bullets.map((text, bulletIndex) => ({ bulletIndex, text })),
    })),
    education: resume.education.map((e) => `${e.degree}, ${e.school} (${e.end})`),
    skillGroups: resume.skills.map((s, index) => ({ index, name: s.name, items: s.items })),
    languages: resume.languages.map((l) => `${l.name} (${l.level})`),
  });
}

export function askHelper(settings: Settings, resume: Resume, history: Turn[], job: string): Promise<HelperAnswer> {
  const context = `<cv>\n${cvForHelper(resume)}\n</cv>${job.trim() ? `\n\n<job_ad>\n${job.slice(0, 6000)}\n</job_ad>` : ""}`;
  return askStructured(settings, modelFor(settings, "helper"), {
    system: `${SYSTEM}\n\n${context}`,
    messages: history.slice(-12),
    schema: HelperReply,
    name: "helper_reply",
    effort: "medium",
  });
}

/** What the edit would replace right now, or null when its target no longer exists. */
export function currentText(resume: Resume, e: HelperEdit): string | null {
  switch (e.field) {
    case "summary":
      return resume.summary;
    case "jobTitle":
      return resume.contact.jobTitle;
    case "bullet":
      return resume.experience[e.roleIndex]?.bullets[e.bulletIndex] ?? null;
    case "newBullet":
      return resume.experience[e.roleIndex] ? "" : null;
    case "skillGroup": {
      if (e.roleIndex === -1) return "";
      const g = resume.skills[e.roleIndex];
      return g ? (g.items ? `${g.name}: ${g.items}` : g.name) : null;
    }
  }
}

/** Where the edit lands, for the card's heading. */
export function editTarget(resume: Resume, e: HelperEdit, labels: { summary: string; jobTitle: string; skills: string; newBullet: string }) {
  const role = resume.experience[e.roleIndex];
  switch (e.field) {
    case "summary":
      return labels.summary;
    case "jobTitle":
      return labels.jobTitle;
    case "bullet":
      return role ? `${role.role || role.company} · #${e.bulletIndex + 1}` : "";
    case "newBullet":
      return role ? `${role.role || role.company} · ${labels.newBullet}` : "";
    case "skillGroup":
      return labels.skills;
  }
}

/** The change to make to the CV, or null if the target is gone. `text` may have been edited by the person. */
export function applyEdit(resume: Resume, e: HelperEdit, text: string): Partial<Resume> | null {
  if (currentText(resume, e) === null) return null;
  switch (e.field) {
    case "summary":
      return { summary: text };
    case "jobTitle":
      return { contact: { ...resume.contact, jobTitle: text } };
    case "bullet":
    case "newBullet":
      return {
        experience: resume.experience.map((job, i) => {
          if (i !== e.roleIndex) return job;
          const bullets = [...job.bullets];
          if (e.field === "bullet") bullets[e.bulletIndex] = text;
          else bullets.push(text);
          return { ...job, bullets };
        }),
      };
    case "skillGroup": {
      const at = text.indexOf(":");
      const name = at >= 0 ? text.slice(0, at).trim() : "";
      const items = at >= 0 ? text.slice(at + 1).trim() : text.trim();
      if (e.roleIndex === -1) return { skills: [...resume.skills, { id: crypto.randomUUID(), name, items }] };
      return { skills: resume.skills.map((g, i) => (i === e.roleIndex ? { ...g, name: name || g.name, items } : g)) };
    }
  }
}
