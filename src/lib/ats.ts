import { resumePlainText } from "./ai";
import type { Resume } from "../types";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "our",
  "are",
  "this",
  "that",
  "from",
  "will",
  "have",
  "has",
  "not",
  "but",
  "all",
  "any",
  "can",
  "into",
  "about",
  "ability",
  "experience",
  "required",
  "requirements",
  "responsibilities",
  "role",
  "team",
  "work",
  "working",
  "job",
  "position",
  "skills",
  "using",
  "including",
  "such",
  "other",
  "over",
  "years",
  "year",
  "must",
  "able",
  "etc",
]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/[\s,/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

function phrases(text: string) {
  const found = new Set<string>();
  const re =
    /\b(react|typescript|javascript|python|java|kotlin|swift|figma|sql|aws|gcp|azure|kubernetes|docker|graphql|node\.js|product design|user research|machine learning|project management|agile|scrum|accessibility|seo|copywriting|salesforce|excel|powerpoint|notion|jira)\b/gi;
  for (const m of text.matchAll(re)) found.add(m[0].toLowerCase());
  return [...found];
}

export function analyzeAts(resume: Resume, jobDescription: string) {
  const resumeText = resumePlainText(resume).toLowerCase();
  const jd = jobDescription.trim();
  if (!jd) {
    return { score: 0, matched: [] as string[], missing: [] as string[], keywords: [] as string[] };
  }
  const keywordSet = new Set([...phrases(jd), ...tokens(jd).filter((t) => t.length > 4)]);
  const keywords = [...keywordSet].slice(0, 40);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    if (resumeText.includes(k.toLowerCase())) matched.push(k);
    else missing.push(k);
  }
  const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { score, matched, missing: missing.slice(0, 24), keywords };
}
