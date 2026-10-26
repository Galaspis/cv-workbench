import { ResumePreview } from "../components/Preview";
import { PreviewFrame } from "../components/PreviewFrame";
import { EditorBar } from "../components/EditorBar";
import { Icon, type IconName } from "../components/Icon";
import { Field, Suggestion, Tabs, useT } from "../components/ui";
import {
  improveSummary,
  parseResumeText,
  rewriteBullet,
  scoreAts,
  suggestBullets,
  suggestSkills,
  translateResume,
  type AtsScoreResult,
} from "../lib/ai";
import { analyzeAts } from "../lib/ats";
import { exportPreviewPdf, exportResumeDocx, exportTxt } from "../lib/export";
import { localePatch, uid } from "../factory";
import { useStore } from "../store";
import type { Strings } from "../i18n";
import { ACCENTS, BODY_FONTS, DEFAULT_SECTION_ORDER, TEMPLATES, TITLE_FONTS } from "../types";
import type { Resume, Settings } from "../types";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ContentSection =
  | "personal"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "projects"
  | "certifications"
  | "ats"
  | "translate";
type DesignSection = "template" | "style" | "order";

type Ctx = {
  resume: Resume;
  settings: Settings;
  patch: (p: Partial<Resume>) => void;
  t: Strings;
  busy: string;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<T | null>;
};

// ---------- large preview ----------

const PAGE_W = 794;
const PAGE_H = 1123;

function fitScale() {
  return Math.min((window.innerHeight - 110) / PAGE_H, (window.innerWidth - 48) / PAGE_W, 1.5);
}

function LargePreview({
  resume,
  onClose,
  onPdf,
  onWord,
}: {
  resume: Resume;
  onClose: () => void;
  onPdf: () => void;
  onWord: () => void;
}) {
  const t = useT();
  const [zoom, setZoom] = useState("fit");
  const [fit, setFit] = useState(fitScale);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onResize = () => setFit(fitScale());
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const scale = zoom === "fit" ? fit : Number(zoom);
  const zooms = [
    { id: "fit", label: t.fit },
    { id: "1", label: "100%" },
    { id: "1.25", label: "125%" },
    { id: "1.5", label: "150%" },
  ];

  return (
    <div className="large-preview" onClick={onClose}>
      <div className="large-preview-bar" onClick={(e) => e.stopPropagation()}>
        <strong>{resume.title}</strong>
        <div className="chip-row">
          {zooms.map((z) => (
            <button key={z.id} type="button" className={`chip ${zoom === z.id ? "active" : ""}`} onClick={() => setZoom(z.id)}>
              {z.label}
            </button>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn primary" onClick={onPdf}>
            <Icon name="download" size={18} />
            {t.downloadPdf}
          </button>
          <button type="button" className="btn" onClick={onWord}>
            {t.downloadWord}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} title="Esc">
            ✕ {t.close}
          </button>
        </div>
      </div>
      <div className="large-preview-stage">
        <div className="large-preview-page" style={{ zoom: scale }} onClick={(e) => e.stopPropagation()}>
          <ResumePreview resume={resume} />
        </div>
      </div>
    </div>
  );
}

// ---------- small building blocks ----------

function SectionHead({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {intro ? <p className="section-intro">{intro}</p> : null}
      </div>
      {action}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn soft" onClick={onClick}>
      <Icon name="add" size={18} />
      {label}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn danger" onClick={onClick} aria-label={label} title={label}>
      <Icon name="delete" size={18} />
    </button>
  );
}

function SectionTitleField({ id, ctx }: { id: string; ctx: Ctx }) {
  const { resume, patch, t } = ctx;
  return (
    <Field
      label={t.sectionTitle}
      value={resume.titles[id] ?? ""}
      onChange={(v) => patch({ titles: { ...resume.titles, [id]: v } })}
    />
  );
}

// ---------- content sections ----------

function PersonalSection({ ctx, onDesign }: { ctx: Ctx; onDesign: () => void }) {
  const { resume, patch, t } = ctx;
  const c = resume.contact;
  const set = (p: Partial<Resume["contact"]>) => patch({ contact: { ...c, ...p } });
  const template = TEMPLATES.find((x) => x.id === resume.template);
  return (
    <>
      <section className="panel">
        <SectionHead title={t.secPersonal} intro={t.introPersonal} />
        <div className="two">
          <Field label={t.firstName} value={c.firstName} onChange={(firstName) => set({ firstName })} />
          <Field label={t.lastName} value={c.lastName} onChange={(lastName) => set({ lastName })} />
        </div>
        <Field label={t.jobTitle} value={c.jobTitle} onChange={(jobTitle) => set({ jobTitle })} />
        <div className="two">
          <Field label={t.email} dir="ltr" value={c.email} onChange={(email) => set({ email })} />
          <Field label={t.phone} dir="ltr" value={c.phone} onChange={(phone) => set({ phone })} />
        </div>
        <div className="two">
          <Field label={t.linkedin} dir="ltr" value={c.linkedin} onChange={(linkedin) => set({ linkedin })} />
          <Field label={t.location} value={c.location} onChange={(location) => set({ location })} />
        </div>
        <div className="two">
          <Field label={t.website} dir="ltr" value={c.website} onChange={(website) => set({ website })} />
          <Field label={t.github} dir="ltr" value={c.github ?? ""} onChange={(github) => set({ github })} />
        </div>
        <div className="photo-row">
          <span className="field-label">{t.photo}</span>
          <div className="row">
            {resume.photo ? <img className="photo-thumb" src={resume.photo} alt="" /> : null}
            <label className="btn outline">
              <Icon name="upload" size={18} />
              {t.uploadPhoto}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => patch({ photo: String(reader.result) });
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </label>
            {resume.photo ? (
              <button type="button" className="btn ghost" onClick={() => patch({ photo: "" })}>
                {t.removePhoto}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHead
          title={t.docDesign}
          intro={t.docDesignSub}
          action={
            <button type="button" className="link-btn" onClick={onDesign}>
              <Icon name="edit" size={18} />
              {t.changeDesign}
            </button>
          }
        />
        <div className="design-summary">
          <div>
            <span className="field-label">{t.colour}</span>
            <span className="dot" style={{ background: resume.accent }} />
          </div>
          <div>
            <span className="field-label">{t.bodyFont}</span>
            <strong>{resume.bodyFont}</strong>
          </div>
          <div>
            <span className="field-label">{t.titleFont}</span>
            <strong>{resume.titleFont}</strong>
          </div>
          <div>
            <span className="field-label">{t.template}</span>
            <strong>{template?.label ?? resume.template}</strong>
          </div>
        </div>
      </section>
    </>
  );
}

function SummarySection({ ctx, job }: { ctx: Ctx; job: string }) {
  const { resume, patch, t, busy, run, settings } = ctx;
  const [proposal, setProposal] = useState("");
  return (
    <section className="panel">
      <SectionHead
        title={t.secSummary}
        intro={t.introSummary}
        action={
          <button
            type="button"
            className="btn soft"
            disabled={!!busy}
            onClick={async () => {
              const next = await run(t.busyRewrite, () => improveSummary(settings, resume, job));
              if (next) setProposal(next);
            }}
          >
            <Icon name="ai-rewrite" size={18} />
            {t.improve}
          </button>
        }
      />
      <Field label={t.summary} area rows={6} max={600} value={resume.summary} onChange={(summary) => patch({ summary })} />
      {proposal ? (
        <Suggestion
          text={proposal}
          onCancel={() => setProposal("")}
          onAccept={() => {
            patch({ summary: proposal });
            setProposal("");
          }}
        />
      ) : null}
      <SectionTitleField id="summary" ctx={ctx} />
    </section>
  );
}


function ExperienceSection({ ctx }: { ctx: Ctx }) {
  const { resume, patch, t, busy, run, settings } = ctx;
  const [openId, setOpenId] = useState<string | null>(resume.experience[0]?.id ?? null);
  const [proposals, setProposals] = useState<Record<string, string>>({});
  const jobs = resume.experience;
  const setJobs = (experience: Resume["experience"]) => patch({ experience });
  const update = (id: string, p: Partial<Resume["experience"][number]>) =>
    setJobs(jobs.map((j) => (j.id === id ? { ...j, ...p } : j)));

  return (
    <section className="section-stack">
      <SectionHead
        title={t.secExperience}
        intro={t.introExperience}
        action={
          <AddButton
            label={t.addRole}
            onClick={() => {
              const id = uid();
              setJobs([{ id, company: "", role: "", location: "", start: "", end: "", current: false, bullets: [""] }, ...jobs]);
              setOpenId(id);
            }}
          />
        }
      />
      {jobs.map((job, idx) => {
        const open = openId === job.id;
        const dates = [job.start, job.current ? t.present : job.end].filter(Boolean).join(" – ");
        return (
          <article key={job.id} className={`panel item ${open ? "open" : ""}`}>
            <button type="button" className="item-head" onClick={() => setOpenId(open ? null : job.id)} aria-expanded={open}>
              <strong>{job.role || t.newRole}</strong>
              <span>{job.company}</span>
              <span className="item-dates" dir="ltr">
                {dates}
              </span>
              <svg className="chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {open ? (
              <div className="item-body">
                <div className="two">
                  <Field label={t.role} value={job.role} onChange={(role) => update(job.id, { role })} />
                  <Field label={t.company} value={job.company} onChange={(company) => update(job.id, { company })} />
                </div>
                <div className="three">
                  <Field label={t.start} value={job.start} onChange={(start) => update(job.id, { start })} />
                  <Field
                    label={t.end}
                    value={job.current ? t.present : job.end}
                    onChange={(end) => update(job.id, { end, current: false })}
                  />
                  <Field label={t.location} value={job.location} onChange={(location) => update(job.id, { location })} />
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={job.current}
                    onChange={(e) => update(job.id, { current: e.target.checked })}
                  />
                  {t.current}
                </label>

                <p className="field-label strong">{t.achievements}</p>
                {job.bullets.map((b, bi) => {
                  const key = `${job.id}:${bi}`;
                  const setBullet = (text: string) => {
                    const bullets = [...job.bullets];
                    bullets[bi] = text;
                    update(job.id, { bullets });
                  };
                  return (
                    <div key={bi} className="bullet">
                      <div className="bullet-row">
                        <div className="bullet-box">
                          <textarea
                            value={b}
                            rows={3}
                            placeholder={t.achievementPh}
                            onChange={(e) => setBullet(e.target.value)}
                          />
                          <button
                            type="button"
                            className="improve"
                            disabled={!!busy || !b.trim()}
                            onClick={async () => {
                              const next = await run(t.busyRewrite, () => rewriteBullet(settings, b, job.role));
                              if (next) setProposals((p) => ({ ...p, [key]: next }));
                            }}
                          >
                            <Icon name="ai-rewrite" size={18} />
                            {t.improve}
                          </button>
                        </div>
                        <RemoveButton
                          label={t.remove}
                          onClick={() => update(job.id, { bullets: job.bullets.filter((_, i) => i !== bi) })}
                        />
                      </div>
                      {proposals[key] ? (
                        <Suggestion
                          text={proposals[key]}
                          onCancel={() => setProposals(({ [key]: _, ...rest }) => rest)}
                          onAccept={() => {
                            setBullet(proposals[key]);
                            setProposals(({ [key]: _, ...rest }) => rest);
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
                <div className="item-actions">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => update(job.id, { bullets: [...job.bullets, ""] })}
                  >
                    <Icon name="add" size={18} />
                    {t.addAchievement}
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={!!busy}
                    onClick={async () => {
                      const extra = await run(t.busySuggest, () => suggestBullets(settings, job.role, job.company));
                      if (extra) update(job.id, { bullets: [...job.bullets.filter(Boolean), ...extra] });
                    }}
                  >
                    <Icon name="ai-rewrite" size={18} />
                    {t.suggestBullets}
                  </button>
                  <span className="spacer" />
                  {idx > 0 ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        const next = [...jobs];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setJobs(next);
                      }}
                    >
                      {t.moveUp}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn ghost danger"
                    onClick={() => setJobs(jobs.filter((j) => j.id !== job.id))}
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
      <section className="panel">
        <SectionTitleField id="experience" ctx={ctx} />
      </section>
    </section>
  );
}

/** Generic list section: a card per item with its fields and a remove button. */
function ListSection<T extends { id: string }>({
  ctx,
  id,
  title,
  intro,
  items,
  setItems,
  blank,
  addLabel,
  render,
}: {
  ctx: Ctx;
  id: string;
  title: string;
  intro: string;
  items: T[];
  setItems: (items: T[]) => void;
  blank: () => T;
  addLabel: string;
  render: (item: T, set: (p: Partial<T>) => void) => ReactNode;
}) {
  const { t } = ctx;
  return (
    <section className="section-stack">
      <SectionHead title={title} intro={intro} action={<AddButton label={addLabel} onClick={() => setItems([...items, blank()])} />} />
      {items.map((item) => (
        <article key={item.id} className="panel item-card">
          <div className="item-card-fields">
            {render(item, (p) => setItems(items.map((x) => (x.id === item.id ? { ...x, ...p } : x))))}
          </div>
          <RemoveButton label={t.remove} onClick={() => setItems(items.filter((x) => x.id !== item.id))} />
        </article>
      ))}
      <section className="panel">
        <SectionTitleField id={id} ctx={ctx} />
      </section>
    </section>
  );
}

function AtsSection({
  ctx,
  job,
  setJob,
  atsAi,
  setAtsAi,
}: {
  ctx: Ctx;
  job: string;
  setJob: (v: string) => void;
  atsAi: AtsScoreResult | null;
  setAtsAi: (v: AtsScoreResult | null) => void;
}) {
  const { resume, patch, t, busy, run, settings } = ctx;
  const ats = useMemo(() => analyzeAts(resume, job), [resume, job]);
  const tone = (score: number) => (score >= 70 ? "good" : score >= 50 ? "mid" : "low");
  return (
    <section className="panel">
      <SectionHead title={t.secAts} intro={t.introAts} />
      <Field
        label={t.jobAd}
        area
        rows={8}
        value={job}
        placeholder={t.jobAdPh}
        onChange={(v) => {
          setJob(v);
          setAtsAi(null);
        }}
      />
      <div className="row">
        <button
          type="button"
          className="btn primary"
          disabled={!!busy || !job.trim()}
          onClick={async () => {
            const data = await run(t.busyScore, () => scoreAts(settings, resume, job));
            if (data) setAtsAi(data);
          }}
        >
          <Icon name="search" size={18} />
          {t.scoreAts}
        </button>
        <button
          type="button"
          className="btn outline"
          disabled={!!busy || !job.trim()}
          onClick={async () => {
            const missing = atsAi?.missing_keywords?.length
              ? atsAi.missing_keywords
              : (await run(t.busySkills, () => suggestSkills(settings, resume, job)))?.missing;
            if (!missing?.length) return;
            const extra = missing.slice(0, 8).join(", ");
            const first = resume.skills[0];
            if (!first) {
              patch({ skills: [{ id: uid(), name: "", items: extra }] });
              return;
            }
            patch({
              skills: resume.skills.map((s, i) => (i === 0 ? { ...s, items: [s.items, extra].filter(Boolean).join(", ") } : s)),
            });
          }}
        >
          <Icon name="add" size={18} />
          {t.addMissing}
        </button>
      </div>

      {atsAi ? (
        <div className="ats-result">
          <div className={`ats-score ${tone(atsAi.score)}`}>
            <span className="ats-number">{Math.round(atsAi.score)}</span>
            <div>
              <strong>{atsAi.score >= 70 ? t.verdictYes : atsAi.score >= 50 ? t.verdictMaybe : t.verdictNo}</strong>
              <span className="ats-sub">
                {t.atsScore}
                {atsAi.verdict ? ` · ${atsAi.verdict}` : ""}
              </span>
            </div>
          </div>
          {atsAi.matched_keywords?.length ? (
            <>
              <p className="field-label">{t.matchedKw}</p>
              <div className="tags">
                {atsAi.matched_keywords.slice(0, 12).map((k) => (
                  <span className="tag" key={k}>
                    {k}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {atsAi.missing_keywords?.length ? (
            <>
              <p className="field-label">{t.missingKwAi}</p>
              <div className="tags">
                {atsAi.missing_keywords.slice(0, 12).map((k) => (
                  <span className="tag miss" key={k}>
                    {k}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {atsAi.suggestions?.length ? (
            <>
              <p className="field-label">{t.suggestions}</p>
              <ul className="ats-suggestions">
                {atsAi.suggestions.slice(0, 5).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : job.trim() ? (
        <div className="ats-result">
          <p className="field-label">
            {t.quickScan} · {ats.score}%
          </p>
          <div className="ats-bar">
            <span style={{ width: `${ats.score}%` }} />
          </div>
          <p className="field-label">{t.presentKw}</p>
          <div className="tags">
            {ats.matched.slice(0, 12).map((k) => (
              <span className="tag" key={k}>
                {k}
              </span>
            ))}
          </div>
          <p className="field-label">{t.missingKw}</p>
          <div className="tags">
            {ats.missing.slice(0, 12).map((k) => (
              <span className="tag miss" key={k}>
                {k}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TranslateSection({ ctx }: { ctx: Ctx }) {
  const { resume, patch, t, busy, run, settings } = ctx;
  const [lang, setLang] = useState(resume.locale === "he" ? "English" : "Hebrew");
  return (
    <section className="panel">
      <SectionHead title={t.secTranslate} intro={t.introTranslate} />
      <Field label={t.targetLang} value={lang} onChange={setLang} />
      <button
        type="button"
        className="btn primary"
        disabled={!!busy || !lang.trim()}
        onClick={async () => {
          const data = await run(t.busyTranslate, () => translateResume(settings, resume, lang));
          if (data) patch({ ...data, locale: /^he|hebrew|עברית/i.test(lang) ? "he" : /^en|english/i.test(lang) ? "en" : lang });
        }}
      >
        <Icon name="language" size={18} />
        {t.translateBtn}
      </button>
    </section>
  );
}

// ---------- design sections ----------

function TemplateSection({ ctx }: { ctx: Ctx }) {
  const { resume, patch, t } = ctx;
  return (
    <section className="panel">
      <SectionHead title={t.templateLang} />
      <Field label={t.docName} value={resume.title} onChange={(title) => patch({ title })} />
      <p className="field-label">{t.template}</p>
      <div className="tpl-grid">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className={`tpl-card ${resume.template === tpl.id ? "active" : ""}`}
            onClick={() => patch({ template: tpl.id })}
          >
            <strong>{tpl.label}</strong>
            <span>{tpl.note}</span>
          </button>
        ))}
      </div>
      <p className="field-label">{t.cvLanguage}</p>
      <div className="seg">
        <button
          type="button"
          className={resume.locale === "he" ? "active" : ""}
          onClick={() => patch(localePatch("he", resume.titles))}
          lang="he"
        >
          עברית
        </button>
        <button
          type="button"
          className={resume.locale === "en" ? "active" : ""}
          onClick={() => patch(localePatch("en", resume.titles))}
          lang="en"
        >
          English
        </button>
      </div>
      {resume.template === "sidebar" ? (
        <>
          <p className="field-label">{t.sidebarSide}</p>
          <div className="seg">
            <button type="button" className={resume.sidebar === "right" ? "active" : ""} onClick={() => patch({ sidebar: "right" })}>
              {t.right}
            </button>
            <button type="button" className={resume.sidebar === "left" ? "active" : ""} onClick={() => patch({ sidebar: "left" })}>
              {t.left}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function StyleSection({ ctx }: { ctx: Ctx }) {
  const { resume, patch, t } = ctx;
  return (
    <section className="panel">
      <SectionHead title={t.coloursFonts} />
      <p className="field-label">{t.accent}</p>
      <div className="swatches">
        {ACCENTS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${resume.accent === c ? "active" : ""}`}
            style={{ background: c }}
            onClick={() => patch({ accent: c })}
            aria-label={c}
          />
        ))}
      </div>
      <div className="two">
        <label className="field">
          <span className="field-label">{t.titleFont}</span>
          <select value={resume.titleFont} onChange={(e) => patch({ titleFont: e.target.value })}>
            {TITLE_FONTS.map((f) => (
              <option key={f.id}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t.bodyFont}</span>
          <select value={resume.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
            {BODY_FONTS.map((f) => (
              <option key={f.id}>{f.label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function OrderSection({ ctx }: { ctx: Ctx }) {
  const { resume, patch, t } = ctx;
  return (
    <section className="panel">
      <SectionHead title={t.order} intro={t.orderSub} />
      {resume.sectionOrder.map((id, idx) => {
        const hidden = resume.hidden.includes(id);
        return (
          <div className={`order-row ${hidden ? "is-hidden" : ""}`} key={id}>
            <input
              className="input"
              value={resume.titles[id] ?? id}
              onChange={(e) => patch({ titles: { ...resume.titles, [id]: e.target.value } })}
            />
            <button
              type="button"
              className="btn ghost"
              disabled={idx === 0}
              onClick={() => {
                const next = [...resume.sectionOrder];
                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                patch({ sectionOrder: next });
              }}
            >
              {t.up}
            </button>
            <button
              type="button"
              className="btn outline"
              onClick={() => patch({ hidden: hidden ? resume.hidden.filter((h) => h !== id) : [...resume.hidden, id] })}
            >
              {hidden ? t.show : t.hide}
            </button>
          </div>
        );
      })}
      <button type="button" className="link-btn" onClick={() => patch({ sectionOrder: [...DEFAULT_SECTION_ORDER] })}>
        <Icon name="undo" size={18} />
        {t.resetOrder}
      </button>
    </section>
  );
}

// ---------- the editor ----------

export function ResumeEditor({ resume, intent }: { resume: Resume; intent?: "import" }) {
  const { settings, upsertResume, newCover } = useStore();
  const t = useT();
  const previewRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<"content" | "design">("content");
  const [section, setSection] = useState<ContentSection>("personal");
  const [designSection, setDesignSection] = useState<DesignSection>("template");
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [job, setJob] = useState("");
  const [atsAi, setAtsAi] = useState<AtsScoreResult | null>(null);
  const [importOpen, setImportOpen] = useState(intent === "import");
  const [importText, setImportText] = useState("");
  const [largeOpen, setLargeOpen] = useState(false);
  const closeLarge = useCallback(() => setLargeOpen(false), []);

  const patch = (p: Partial<Resume>) => upsertResume({ ...resume, ...p });

  async function run<T>(label: string, fn: () => Promise<T>) {
    setBusy(label);
    setErr("");
    try {
      return await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.failed);
      return null;
    } finally {
      setBusy("");
    }
  }

  const ctx: Ctx = { resume, settings, patch, t, busy, run };
  const pdf = () => previewRef.current && exportPreviewPdf(previewRef.current, resume.title);
  const word = () => void exportResumeDocx(resume);

  const contentNav: { id: ContentSection; label: string; icon: IconName; hideKey?: string }[] = [
    { id: "personal", label: t.secPersonal, icon: "profile" },
    { id: "summary", label: t.secSummary, icon: "summary", hideKey: "summary" },
    { id: "experience", label: t.secExperience, icon: "experience", hideKey: "experience" },
    { id: "education", label: t.secEducation, icon: "education", hideKey: "education" },
    { id: "skills", label: t.secSkills, icon: "skills", hideKey: "skills" },
    { id: "languages", label: t.secLanguages, icon: "language", hideKey: "languages" },
    { id: "projects", label: t.secProjects, icon: "document", hideKey: "projects" },
    { id: "certifications", label: t.secCertifications, icon: "check", hideKey: "certifications" },
  ];
  const toolNav: { id: ContentSection; label: string; icon: IconName }[] = [
    { id: "ats", label: t.secAts, icon: "search" },
    { id: "translate", label: t.secTranslate, icon: "ai-rewrite" },
  ];
  const designNav: { id: DesignSection; label: string; icon: IconName }[] = [
    { id: "template", label: t.templateLang, icon: "layout" },
    { id: "style", label: t.coloursFonts, icon: "palette" },
    { id: "order", label: t.order, icon: "filter" },
  ];

  const navButton = (active: boolean, label: string, icon: IconName, onClick: () => void, dim?: boolean) => (
    <button
      key={label}
      type="button"
      className={`nav-item ${active ? "active" : ""} ${dim ? "dim" : ""}`}
      onClick={() => {
        onClick();
        setPane("edit");
      }}
      aria-current={active ? "true" : undefined}
    >
      <Icon name={icon} tone size={24} />
      <span>{label}</span>
    </button>
  );

  let body: ReactNode;
  if (mode === "design") {
    body =
      designSection === "template" ? (
        <TemplateSection ctx={ctx} />
      ) : designSection === "style" ? (
        <StyleSection ctx={ctx} />
      ) : (
        <OrderSection ctx={ctx} />
      );
  } else {
    switch (section) {
      case "personal":
        body = <PersonalSection ctx={ctx} onDesign={() => setMode("design")} />;
        break;
      case "summary":
        body = <SummarySection ctx={ctx} job={job} />;
        break;
      case "experience":
        body = <ExperienceSection ctx={ctx} />;
        break;
      case "education":
        body = (
          <ListSection
            ctx={ctx}
            id="education"
            title={t.secEducation}
            intro={t.introEducation}
            items={resume.education}
            setItems={(education) => patch({ education })}
            addLabel={t.addEducation}
            blank={() => ({ id: uid(), school: "", degree: "", location: "", start: "", end: "", details: "" })}
            render={(ed, set) => (
              <>
                <div className="two">
                  <Field label={t.degree} value={ed.degree} onChange={(degree) => set({ degree })} />
                  <Field label={t.school} value={ed.school} onChange={(school) => set({ school })} />
                </div>
                <div className="three">
                  <Field label={t.start} value={ed.start} onChange={(start) => set({ start })} />
                  <Field label={t.end} value={ed.end} onChange={(end) => set({ end })} />
                  <Field label={t.location} value={ed.location} onChange={(location) => set({ location })} />
                </div>
                <Field label={t.details} value={ed.details} onChange={(details) => set({ details })} />
              </>
            )}
          />
        );
        break;
      case "skills":
        body = (
          <ListSection
            ctx={ctx}
            id="skills"
            title={t.secSkills}
            intro={t.introSkills}
            items={resume.skills}
            setItems={(skills) => patch({ skills })}
            addLabel={t.addGroup}
            blank={() => ({ id: uid(), name: "", items: "" })}
            render={(g, set) => (
              <div className="two">
                <Field label={t.group} value={g.name} onChange={(name) => set({ name })} />
                <Field label={t.items} value={g.items} onChange={(items) => set({ items })} />
              </div>
            )}
          />
        );
        break;
      case "languages":
        body = (
          <ListSection
            ctx={ctx}
            id="languages"
            title={t.secLanguages}
            intro={t.introLanguages}
            items={resume.languages}
            setItems={(languages) => patch({ languages })}
            addLabel={t.addLanguage}
            blank={() => ({ id: uid(), name: "", level: "" })}
            render={(l, set) => (
              <div className="two">
                <Field label={t.language} value={l.name} onChange={(name) => set({ name })} />
                <Field label={t.level} value={l.level} onChange={(level) => set({ level })} />
              </div>
            )}
          />
        );
        break;
      case "projects":
        body = (
          <ListSection
            ctx={ctx}
            id="projects"
            title={t.secProjects}
            intro={t.introProjects}
            items={resume.projects}
            setItems={(projects) => patch({ projects })}
            addLabel={t.addProject}
            blank={() => ({ id: uid(), name: "", link: "", description: "", bullets: [] })}
            render={(p, set) => (
              <>
                <div className="two">
                  <Field label={t.name} value={p.name} onChange={(name) => set({ name })} />
                  <Field label={t.link} dir="ltr" value={p.link} onChange={(link) => set({ link })} />
                </div>
                <Field label={t.description} area rows={3} value={p.description} onChange={(description) => set({ description })} />
              </>
            )}
          />
        );
        break;
      case "certifications":
        body = (
          <ListSection
            ctx={ctx}
            id="certifications"
            title={t.secCertifications}
            intro={t.introCertifications}
            items={resume.certifications}
            setItems={(certifications) => patch({ certifications })}
            addLabel={t.addCert}
            blank={() => ({ id: uid(), name: "", issuer: "", year: "" })}
            render={(c, set) => (
              <div className="three">
                <Field label={t.name} value={c.name} onChange={(name) => set({ name })} />
                <Field label={t.issuer} value={c.issuer} onChange={(issuer) => set({ issuer })} />
                <Field label={t.year} value={c.year} onChange={(year) => set({ year })} />
              </div>
            )}
          />
        );
        break;
      case "ats":
        body = <AtsSection ctx={ctx} job={job} setJob={setJob} atsAi={atsAi} setAtsAi={setAtsAi} />;
        break;
      case "translate":
        body = <TranslateSection ctx={ctx} />;
        break;
    }
  }

  return (
    <div className="editor">
      <EditorBar
        title={resume.title}
        tabs={
          <Tabs
            value={mode}
            onChange={setMode}
            options={[
              { id: "content", label: t.content },
              { id: "design", label: t.design },
            ]}
          />
        }
        downloads={[
          { label: t.pdf, icon: "document", onClick: () => void pdf() },
          { label: t.word, icon: "download", onClick: word },
          { label: t.txt, icon: "summary", onClick: () => exportTxt(resume) },
        ]}
        more={[
          { label: t.largePreview, icon: "search", onClick: () => setLargeOpen(true) },
          { label: t.writeCover, icon: "edit", onClick: () => newCover(resume.id) },
          { label: t.importCv, icon: "upload", onClick: () => setImportOpen(true) },
        ]}
      />

      <Tabs
        className="pane-switch"
        value={pane}
        onChange={setPane}
        options={[
          { id: "edit", label: t.editTab },
          { id: "preview", label: t.previewTab },
        ]}
      />

      <div className={`editor-grid show-${pane}`}>
        <aside className="section-nav" aria-label={mode === "content" ? t.content : t.design}>
          {mode === "content" ? (
            <>
              {contentNav.map((n) =>
                navButton(section === n.id, n.label, n.icon, () => setSection(n.id), !!n.hideKey && resume.hidden.includes(n.hideKey)),
              )}
              <p className="nav-group">{t.tools}</p>
              {toolNav.map((n) => navButton(section === n.id, n.label, n.icon, () => setSection(n.id)))}
            </>
          ) : (
            designNav.map((n) => navButton(designSection === n.id, n.label, n.icon, () => setDesignSection(n.id)))
          )}
        </aside>

        <div className="editor-main">
          {busy || err ? <p className={`status ${err ? "err" : "busy"}`}>{busy || err}</p> : null}
          {body}
        </div>

        <div className="preview-col">
          <PreviewFrame className="clickable" onClick={() => setLargeOpen(true)} title={t.largePreview}>
            <div
              ref={(n) => {
                previewRef.current = n?.querySelector(".cv-page") ?? n;
              }}
            >
              <ResumePreview resume={resume} />
            </div>
          </PreviewFrame>
        </div>
      </div>

      {largeOpen ? <LargePreview resume={resume} onClose={closeLarge} onPdf={() => void pdf()} onWord={word} /> : null}

      {importOpen ? (
        <div className="modal-back" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title">{t.importTitle}</h2>
            <p className="section-intro">{t.importSub}</p>
            <textarea className="input" value={importText} onChange={(e) => setImportText(e.target.value)} rows={10} autoFocus />
            {busy || err ? <p className={`status ${err ? "err" : "busy"}`}>{busy || err}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setImportOpen(false)}>
                {t.cancel}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!!busy || !importText.trim()}
                onClick={async () => {
                  const data = await run(t.busyParse, () => parseResumeText(settings, importText));
                  if (!data) return;
                  patch({
                    contact: { ...resume.contact, ...data.contact },
                    summary: data.summary ?? resume.summary,
                    experience: data.experience?.length ? data.experience : resume.experience,
                    education: data.education?.length ? data.education : resume.education,
                    skills: data.skills?.length ? data.skills : resume.skills,
                    languages: data.languages?.length ? data.languages : resume.languages,
                    projects: data.projects ?? resume.projects,
                    certifications: data.certifications ?? resume.certifications,
                  });
                  setImportOpen(false);
                }}
              >
                <Icon name="ai-rewrite" size={18} />
                {t.importBtn}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
