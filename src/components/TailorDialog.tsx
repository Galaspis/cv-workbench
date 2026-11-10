import { useState } from "react";
import { tailorExistingCv, tailorNewCv } from "../lib/tailor";
import { useStore } from "../store";
import type { Resume } from "../types";
import { Icon } from "./Icon";
import { ModelChip } from "./ai";
import { useT } from "./ui";

/**
 * Tailor a CV to a job with Claude. With `source`, rewrites a copy of that CV; without it, builds a new
 * CV from pasted material. Either way the result is saved as a new document and opened.
 */
export function TailorDialog({ source, initialJob = "", onClose }: { source?: Resume; initialJob?: string; onClose: () => void }) {
  const { settings, upsertResume, setView } = useStore();
  const t = useT();
  const [job, setJob] = useState(initialJob);
  const [material, setMaterial] = useState("");
  const [locale, setLocale] = useState<"en" | "he">(settings.uiLang);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ready = job.trim().length > 40 && (source || material.trim().length > 40);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const result = source
        ? await tailorExistingCv(settings, source, job)
        : await tailorNewCv(settings, material, job, locale);
      upsertResume(result);
      setView({ page: "resume", id: result.id });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onClick={() => !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tailor-title" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title" id="tailor-title">{source ? t.tailorTitle : t.newForJobTitle}</h2>
        <p className="section-intro">{source ? t.tailorSub : t.newForJobSub}</p>
        {source ? <p className="tailor-source">{source.title}</p> : null}
        <div className="modal-model"><ModelChip feature="tailor" /></div>

        <label className="field">
          <span className="field-label">{t.jobAd}</span>
          <textarea rows={7} value={job} placeholder={t.jobAdPh} onChange={(e) => setJob(e.target.value)} disabled={busy} autoFocus />
        </label>

        {source ? null : (
          <>
            <label className="field">
              <span className="field-label">{t.yourMaterial}</span>
              <textarea rows={7} value={material} placeholder={t.yourMaterialPh} onChange={(e) => setMaterial(e.target.value)} disabled={busy} />
            </label>
            <p className="field-label">{t.cvLanguageShort}</p>
            <div className="seg">
              <button type="button" className={locale === "he" ? "active" : ""} onClick={() => setLocale("he")} lang="he" disabled={busy}>
                עברית
              </button>
              <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} lang="en" disabled={busy}>
                English
              </button>
            </div>
          </>
        )}

        {busy || err ? <p className={`status ${err ? "err" : "busy"}`}>{busy ? t.busyTailor : err}</p> : null}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            {t.cancel}
          </button>
          <button type="button" className="btn primary" onClick={run} disabled={busy || !ready}>
            <Icon name="ai-rewrite" size={18} />
            {source ? t.tailorBtn : t.createBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shown at the top of a tailored CV: what Claude changed, and what the job wants that the CV doesn't show. */
export function TailoredNote({ resume, onHide }: { resume: Resume; onHide: () => void }) {
  const t = useT();
  const note = resume.tailoredFor;
  const [showJob, setShowJob] = useState(false);
  if (!note) return null;
  return (
    <section className="panel tailored">
      <div className="section-head">
        <h2 className="panel-title">{t.tailoredFor}</h2>
        <button type="button" className="link-btn" onClick={onHide}>
          {t.dismiss}
        </button>
      </div>
      {note.changes.length ? (
        <>
          <p className="field-label">{t.changesMade}</p>
          <ul className="tailored-list">
            {note.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : null}
      {note.missing.length ? (
        <>
          <p className="field-label">{t.notShown}</p>
          <div className="tags">
            {note.missing.map((m) => (
              <span className="tag miss" key={m}>
                {m}
              </span>
            ))}
          </div>
          <p className="hint-text">{t.notShownHint}</p>
        </>
      ) : null}
      <button type="button" className="link-btn" onClick={() => setShowJob((v) => !v)} aria-expanded={showJob}>
        {t.viewJob}
      </button>
      {showJob ? <p className="tailored-job">{note.job}</p> : null}
    </section>
  );
}
