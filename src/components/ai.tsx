// Shared AI pieces: the model chip next to each AI button, the editable result card, and the AI helper chat.
import { useEffect, useRef, useState } from "react";
import { listOpenAiModels } from "../lib/ai";
import { applyEdit, askHelper, currentText, editTarget, type HelperEdit } from "../lib/helper";
import type { Turn } from "../lib/llm";
import { CLAUDE_MODELS, fromKey, modelFor, modelLabel, toKey, useOpenAiModels, type Feature } from "../lib/models";
import { useStore } from "../store";
import type { Resume } from "../types";
import type { Strings } from "../i18n";
import { Icon } from "./Icon";
import { Menu, useT, type MenuItem } from "./ui";

export function featureName(t: Strings, f: Feature) {
  return {
    helper: t.featHelper,
    tailor: t.featTailor,
    rewrite: t.featRewrite,
    ats: t.featAts,
    translate: t.featTranslate,
    letters: t.featLetters,
    import: t.featImport,
  }[f];
}

export function featureDesc(t: Strings, f: Feature) {
  return {
    helper: t.descHelper,
    tailor: t.descTailor,
    rewrite: t.descRewrite,
    ats: t.descAts,
    translate: t.descTranslate,
    letters: t.descLetters,
    import: t.descImport,
  }[f];
}

/** Every model the saved keys can use, Claude first. */
export function useModelChoices() {
  const { settings } = useStore();
  const openai = useOpenAiModels(settings.openaiKey.trim(), listOpenAiModels);
  const claude = settings.apiKey.trim() ? CLAUDE_MODELS : [];
  return { claude, openai };
}

/** Shows which model a feature uses; clicking picks another for every action of that feature. */
export function ModelChip({ feature }: { feature: Feature }) {
  const { settings, setSettings, setView } = useStore();
  const t = useT();
  const current = modelFor(settings, feature);
  const { claude, openai } = useModelChoices();
  const pick = (key: string) => setSettings({ featureModels: { ...settings.featureModels, [feature]: key } });
  const curKey = toKey(current);
  const items: MenuItem[] = [
    ...claude.map((m) => {
      const key = `anthropic:${m.id}`;
      return { label: m.label, icon: key === curKey ? ("check" as const) : undefined, onClick: () => pick(key) };
    }),
    ...openai.map((id) => {
      const key = `openai:${id}`;
      return { label: `${id} · OpenAI`, icon: key === curKey ? ("check" as const) : undefined, onClick: () => pick(key) };
    }),
  ];
  if (!items.length) items.push({ label: t.noKeys, icon: "edit", onClick: () => setView({ page: "settings" }) });
  const name = featureName(t, feature);
  return (
    <Menu items={items} label={t.modelChipTitle.split("{feature}").join(name)} className="model-chip" align="start">
      <Icon name="ai-rewrite" size={14} />
      <span>{modelLabel(current)}</span>
      <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden>
        <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Menu>
  );
}

/** Settings: a dropdown of every available model for one feature. */
export function ModelSelect({ feature }: { feature: Feature }) {
  const { settings, setSettings } = useStore();
  const t = useT();
  const { claude, openai } = useModelChoices();
  const current = toKey(modelFor(settings, feature));
  const known = [...claude.map((m) => `anthropic:${m.id}`), ...openai.map((id) => `openai:${id}`)];
  const ref = fromKey(current)!;
  const missingKey = ref.provider === "anthropic" ? !settings.apiKey.trim() : !settings.openaiKey.trim();
  return (
    <div className="model-select">
      <select
        dir="ltr"
        value={current}
        onChange={(e) => setSettings({ featureModels: { ...settings.featureModels, [feature]: e.target.value } })}
        aria-label={featureName(t, feature)}
      >
        {known.includes(current) ? null : <option value={current}>{modelLabel(ref)}</option>}
        {claude.length ? (
          <optgroup label="Claude">
            {claude.map((m) => (
              <option key={m.id} value={`anthropic:${m.id}`}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {openai.length ? (
          <optgroup label="OpenAI">
            {openai.map((id) => (
              <option key={id} value={`openai:${id}`}>
                {id}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {missingKey ? <span className="model-warn">{t.needsKey.replace("{provider}", ref.provider === "anthropic" ? "Claude" : "OpenAI")}</span> : null}
    </div>
  );
}

/**
 * An AI rewrite you can work with: edit it, try again, steer it with a quick request or your own words,
 * then apply it. `onRetry` gets the instruction and the text currently in the box.
 */
export function AiResult({
  text,
  model,
  busy,
  onApply,
  onCancel,
  onRetry,
}: {
  text: string;
  model: string;
  busy: boolean;
  onApply: (text: string) => void;
  onCancel: () => void;
  onRetry: (instruction: string, previous: string) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(text);
  const [own, setOwn] = useState("");
  useEffect(() => {
    setDraft(text);
  }, [text]);
  const quick = [t.refineShorter, t.refineSpecific, t.refineSenior, t.refineResults, t.refineSimpler];
  return (
    <div className="ai-result">
      <p className="ai-result-by">{t.writtenBy.replace("{model}", model)}</p>
      <textarea className="input" rows={Math.min(8, Math.max(2, Math.ceil(draft.length / 70)))} dir="auto" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} />
      <div className="ai-refine">
        <button type="button" className="chip" disabled={busy} onClick={() => onRetry("", draft)}>
          <Icon name="undo" size={14} /> {t.tryAgain}
        </button>
        {quick.map((q) => (
          <button key={q} type="button" className="chip" disabled={busy} onClick={() => onRetry(q, draft)}>
            {q}
          </button>
        ))}
      </div>
      <form
        className="ai-own"
        onSubmit={(e) => {
          e.preventDefault();
          if (own.trim()) {
            onRetry(own.trim(), draft);
            setOwn("");
          }
        }}
      >
        <input className="input" value={own} placeholder={t.ownInstruction} onChange={(e) => setOwn(e.target.value)} disabled={busy} dir="auto" />
        <button type="submit" className="btn outline" disabled={busy || !own.trim()}>
          {t.rewriteBtn}
        </button>
      </form>
      <div className="suggestion-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
          {t.cancel}
        </button>
        <button type="button" className="btn primary" onClick={() => onApply(draft)} disabled={busy || !draft.trim()}>
          {t.apply}
        </button>
      </div>
    </div>
  );
}

// ---------- AI helper ----------

type EditState = { edit: HelperEdit; text: string; status: "open" | "applied" | "skipped" | "gone"; before: string };
type Msg = { role: "user" | "assistant"; content: string; model?: string; edits?: EditState[] };

const summarise = (m: Msg) =>
  m.edits?.length
    ? `${m.content}\n\n[Suggested edits: ${m.edits.map((e) => `${e.edit.field} -> "${e.text}" (${e.status})`).join("; ")}]`
    : m.content;

export function AiHelper({ resume, patch, job }: { resume: Resume; patch: (p: Partial<Resume>) => void; job: string }) {
  const { settings } = useStore();
  const t = useT();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef(resume);
  resumeRef.current = resume;

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect must not return one.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setErr("");
    try {
      const history: Turn[] = next.map((m) => ({ role: m.role, content: summarise(m) }));
      const answer = await askHelper(settings, resumeRef.current, history, job);
      const edits: EditState[] = answer.edits.map((edit) => {
        const before = currentText(resumeRef.current, edit);
        return { edit, text: edit.text, before: before ?? "", status: before === null ? "gone" : "open" };
      });
      setMsgs((m) => [...m, { role: "assistant", content: answer.reply, model: modelLabel(modelFor(settings, "helper")), edits }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  }

  const updateEdit = (mi: number, ei: number, change: Partial<EditState>) =>
    setMsgs((all) =>
      all.map((m, i) => (i === mi && m.edits ? { ...m, edits: m.edits.map((e, j) => (j === ei ? { ...e, ...change } : e)) } : m)),
    );

  const apply = (mi: number, ei: number) => {
    const st = msgs[mi].edits![ei];
    const change = applyEdit(resumeRef.current, st.edit, st.text);
    if (!change) return updateEdit(mi, ei, { status: "gone" });
    patch(change);
    resumeRef.current = { ...resumeRef.current, ...change };
    updateEdit(mi, ei, { status: "applied" });
  };

  const applyAll = (mi: number) => {
    let cv = resumeRef.current;
    const results: EditState["status"][] = [];
    for (const st of msgs[mi].edits ?? []) {
      if (st.status !== "open") {
        results.push(st.status);
        continue;
      }
      const change = applyEdit(cv, st.edit, st.text);
      if (change) cv = { ...cv, ...change };
      results.push(change ? "applied" : "gone");
    }
    const changed = Object.fromEntries((["summary", "contact", "experience", "skills"] as const).map((k) => [k, cv[k]]));
    patch(changed as Partial<Resume>);
    resumeRef.current = cv;
    setMsgs((all) => all.map((m, i) => (i === mi && m.edits ? { ...m, edits: m.edits.map((e, j) => ({ ...e, status: results[j] })) } : m)));
  };

  const labels = { summary: t.secSummary, jobTitle: t.jobTitle, skills: t.secSkills, newBullet: t.newBulletLabel };
  const starters = [t.helperStart1, t.helperStart2, ...(job.trim() ? [t.helperStart3] : []), t.helperStart4];

  return (
    <section className="panel helper">
      <div className="section-head">
        <div>
          <h2 className="section-title">{t.secHelper}</h2>
          <p className="section-intro">{t.introHelper}</p>
        </div>
        <ModelChip feature="helper" />
      </div>

      <div className="helper-log" aria-live="polite">
        {msgs.length === 0 ? (
          <div className="helper-starters">
            {starters.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => void send(s)} disabled={busy}>
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {msgs.map((m, mi) => (
          <div key={mi} className={`helper-msg ${m.role}`}>
            <p className="helper-who">{m.role === "user" ? t.you : m.model}</p>
            <p className="helper-text" dir="auto">
              {m.content}
            </p>
            {m.edits?.length ? (
              <div className="helper-edits">
                {m.edits.map((st, ei) => (
                  <div key={ei} className={`helper-edit ${st.status}`}>
                    <p className="helper-edit-target">{editTarget(resume, st.edit, labels)}</p>
                    {st.before ? (
                      <p className="helper-before" dir="auto">
                        <span className="field-label">{t.nowLabel}</span> {st.before}
                      </p>
                    ) : null}
                    <span className="field-label">{t.proposed}</span>
                    <textarea
                      className="input"
                      rows={Math.min(6, Math.max(2, Math.ceil(st.text.length / 70)))}
                      dir="auto"
                      value={st.text}
                      disabled={st.status !== "open"}
                      onChange={(e) => updateEdit(mi, ei, { text: e.target.value })}
                    />
                    {st.edit.why ? <p className="hint-text">{st.edit.why}</p> : null}
                    {st.status === "open" ? (
                      <div className="suggestion-actions">
                        <button type="button" className="btn ghost" onClick={() => updateEdit(mi, ei, { status: "skipped" })}>
                          {t.skip}
                        </button>
                        <button type="button" className="btn primary" onClick={() => apply(mi, ei)} disabled={!st.text.trim()}>
                          {t.apply}
                        </button>
                      </div>
                    ) : (
                      <p className="helper-status">
                        {st.status === "applied" ? `✓ ${t.applied}` : st.status === "skipped" ? t.skipped : t.targetGone}
                      </p>
                    )}
                  </div>
                ))}
                {m.edits.filter((e) => e.status === "open").length > 1 ? (
                  <button type="button" className="btn soft" onClick={() => applyAll(mi)}>
                    <Icon name="check" size={16} /> {t.applyAll}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        {busy ? <p className="status busy">{t.thinking}</p> : null}
        {err ? <p className="status err">{err}</p> : null}
        <div ref={endRef} />
      </div>

      <form
        className="helper-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          className="input"
          rows={2}
          dir="auto"
          value={input}
          placeholder={t.helperPh}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          disabled={busy}
        />
        <button type="submit" className="btn primary" disabled={busy || !input.trim()}>
          {t.send}
        </button>
      </form>
      <div className="helper-foot">
        <span className="hint-text inline">{t.helperNote}</span>
        {msgs.length ? (
          <button type="button" className="link-btn" onClick={() => setMsgs([])} disabled={busy}>
            {t.clearChat}
          </button>
        ) : null}
      </div>
    </section>
  );
}
