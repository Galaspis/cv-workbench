// Which AI model each feature uses. Every feature (rewrite, ATS, tailoring, ...) has its own model, from
// Claude or OpenAI, saved in Settings as "anthropic:<id>" or "openai:<id>".
import { useEffect, useState } from "react";
import type { Settings } from "../types";

export type Provider = "anthropic" | "openai";
export type ModelRef = { provider: Provider; id: string };
export type Feature = "rewrite" | "ats" | "tailor" | "translate" | "letters" | "import" | "helper";

export const FEATURES: Feature[] = ["helper", "tailor", "rewrite", "ats", "translate", "letters", "import"];

/** Claude models offered in the pickers (current generation, plus Haiku 4.5 for existing setups). */
export const CLAUDE_MODELS: { id: string; label: string }[] = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];

/** Claude defaults: strong models where quality matters most, a fast one for scoring and reading. */
const CLAUDE_DEFAULTS: Record<Feature, string> = {
  helper: "claude-sonnet-5-5",
  tailor: "claude-opus-5-5",
  rewrite: "claude-sonnet-5-5",
  ats: "claude-haiku-5-5",
  translate: "claude-sonnet-5-5",
  letters: "claude-sonnet-5-5",
  import: "claude-haiku-5-5",
};

export const toKey = (ref: ModelRef) => `${ref.provider}:${ref.id}`;

export function fromKey(key: string | undefined): ModelRef | null {
  if (!key) return null;
  const i = key.indexOf(":");
  if (i < 0) return null;
  const provider = key.slice(0, i);
  const id = key.slice(i + 1);
  return (provider === "anthropic" || provider === "openai") && id ? { provider, id } : null;
}

export function modelLabel(ref: ModelRef) {
  if (ref.provider === "anthropic") return CLAUDE_MODELS.find((m) => m.id === ref.id)?.label ?? ref.id;
  return `${ref.id} · OpenAI`;
}

const hasKey = (settings: Settings, provider: Provider) =>
  provider === "anthropic" ? !!settings.apiKey.trim() : !!settings.openaiKey.trim();

/** The model a feature uses: its saved choice, else a sensible default for the keys you have. */
export function modelFor(settings: Settings, feature: Feature): ModelRef {
  const saved = fromKey(settings.featureModels?.[feature]);
  if (saved) return saved;
  if (!hasKey(settings, "anthropic") && hasKey(settings, "openai") && settings.openaiModel) {
    return { provider: "openai", id: settings.openaiModel };
  }
  return { provider: "anthropic", id: CLAUDE_DEFAULTS[feature] };
}

/** The per-feature choices to save when settings from before per-feature models are loaded. */
export function migratedFeatureModels(saved: Partial<Settings>): Partial<Record<Feature, string>> {
  if (saved.featureModels) return saved.featureModels;
  if (saved.provider === "openai" && saved.openaiModel) {
    return Object.fromEntries(FEATURES.map((f) => [f, `openai:${saved.openaiModel}`]));
  }
  return {};
}

// ---- OpenAI model list: loaded with the key, kept in this browser so pickers show it at once ----

const CACHE_KEY = "cvw.openaiModels";
let cache: { forKey: string; models: string[] } | null = null;
const listeners = new Set<(m: string[]) => void>();

function readCache(apiKey: string) {
  if (cache?.forKey === apiKey) return cache.models;
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null") as { forKey: string; models: string[] } | null;
    if (raw && raw.forKey === apiKey.slice(-6)) {
      cache = { forKey: apiKey, models: raw.models };
      return raw.models;
    }
  } catch {
    /* no cache */
  }
  return null;
}

export function rememberOpenAiModels(apiKey: string, models: string[]) {
  cache = { forKey: apiKey, models };
  try {
    // Only the last 6 characters of the key, to tell keys apart; the key itself is never stored here.
    localStorage.setItem(CACHE_KEY, JSON.stringify({ forKey: apiKey.slice(-6), models }));
  } catch {
    /* storage blocked */
  }
  listeners.forEach((fn) => fn(models));
}

/** The OpenAI models known for this key (empty until loaded in Settings or by a picker). */
export function useOpenAiModels(apiKey: string, load: (key: string) => Promise<string[]>) {
  const [models, setModels] = useState<string[]>(() => (apiKey ? readCache(apiKey) ?? [] : []));
  useEffect(() => {
    if (!apiKey) {
      setModels([]);
      return;
    }
    const known = readCache(apiKey);
    if (known) setModels(known);
    else
      void load(apiKey)
        .then((m) => rememberOpenAiModels(apiKey, m))
        .catch(() => undefined);
    const fn = (m: string[]) => setModels(m);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [apiKey, load]);
  return models;
}
