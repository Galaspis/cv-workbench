import { ResumePreview } from "../components/Preview";
import { PreviewFrame } from "../components/PreviewFrame";
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
import { uid } from "../factory";
import { useStore } from "../store";
import { EN_TITLES, HE_TITLES } from "../i18n";
import {
  ACCENTS,
  BODY_FONTS,
  DEFAULT_SECTION_ORDER,
  TEMPLATES,
  TITLE_FONTS,
} from "../types";
import type { Resume } from "../types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE_W = 794;
const PAGE_H = 1123;
const ZOOMS = [
  { id: "fit", label: "Fit" },
  { id: "1", label: "100%" },
  { id: "1.25", label: "125%" },
  { id: "1.5", label: "150%" },
];

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

  return (
    <div className="large-preview" onClick={onClose}>
      <div className="large-preview-bar" onClick={(e) => e.stopPropagation()}>
        <strong>{resume.title}</strong>
        <div className="chip-row">
          {ZOOMS.map((z) => (
            <button key={z.id} className={`chip ${zoom === z.id ? "active" : ""}`} onClick={() => setZoom(z.id)}>
              {z.label}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn primary" onClick={onPdf}>
            Download PDF
          </button>
          <button className="btn" onClick={onWord}>
            Download Word
          </button>
          <button className="btn ghost" onClick={onClose} title="Close (Esc)">
            ✕ Close
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

function Field({
  label,
  value,
  onChange,
  area,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function ResumeEditor({ resume }: { resume: Resume }) {
  const { settings, upsertResume, setView, newCover } = useStore();
  const previewRef = useRef<HTMLElement | null>(null);
  const [job, setJob] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [largeOpen, setLargeOpen] = useState(false);
  const closeLarge = useCallback(() => setLargeOpen(false), []);
  const [importText, setImportText] = useState("");
  const [lang, setLang] = useState("French");
  const [atsAi, setAtsAi] = useState<AtsScoreResult | null>(null);
  const ats = useMemo(() => analyzeAts(resume, job), [resume, job]);
  const patch = (p: Partial<Resume>) => upsertResume({ ...resume, ...p });

  async function run<T>(label: string, fn: () => Promise<T>) {
    setBusy(label);
    setErr("");
    try {
      return await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      return null;
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn ghost" onClick={() => setView({ page: "home" })}>
          ← Home
        </button>
        <button className="btn" onClick={() => setImportOpen(true)}>
          Improve existing CV
        </button>
        <button className="btn" onClick={() => newCover(resume.id)}>
          Cover letter
        </button>
        <button className="btn" onClick={() => setLargeOpen(true)}>
          Preview
        </button>
        <button
          className="btn primary"
          onClick={() => previewRef.current && exportPreviewPdf(previewRef.current, resume.title)}
        >
          Download PDF
        </button>
        <button className="btn" onClick={() => exportResumeDocx(resume)}>
          Download Word
        </button>
        <button className="btn" onClick={() => exportTxt(resume)}>
          TXT
        </button>
      </div>
      <p className={`status ${err ? "err" : ""}`}>{busy || err}</p>

      <div className="editor-layout">
        <div className="editor-col">
          <div className="block">
            <div className="block-head">
              <h3>Design</h3>
            </div>
            <Field label="Resume title" value={resume.title} onChange={(title) => patch({ title })} />
            <div className="chip-row">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className={`chip ${resume.template === t.id ? "active" : ""}`}
                  onClick={() => patch({ template: t.id })}
                  title={t.note}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ background: c, outline: resume.accent === c ? "2px solid #1c1917" : "none" }}
                  onClick={() => patch({ accent: c })}
                />
              ))}
            </div>
            <div className="two" style={{ marginTop: 8 }}>
              <label className="field">
                <span>Title font</span>
                <select value={resume.titleFont} onChange={(e) => patch({ titleFont: e.target.value })}>
                  {TITLE_FONTS.map((f) => (
                    <option key={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Body font</span>
                <select value={resume.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
                  {BODY_FONTS.map((f) => (
                    <option key={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              <button
                className={`chip ${resume.locale === "en" ? "active" : ""}`}
                onClick={() =>
                  patch({
                    locale: "en",
                    sidebar: "left",
                    titles: { ...resume.titles, ...EN_TITLES },
                    titleFont: "Calibri",
                    bodyFont: "Calibri",
                  })
                }
              >
                English
              </button>
              <button
                className={`chip ${resume.locale === "he" ? "active" : ""}`}
                onClick={() =>
                  patch({
                    locale: "he",
                    sidebar: "right",
                    titles: { ...resume.titles, ...HE_TITLES },
                    titleFont: "Assistant",
                    bodyFont: "Assistant",
                  })
                }
              >
                עברית
              </button>
            </div>
            {resume.template === "sidebar" ? (
              <div className="chip-row">
                <button className={`chip ${resume.sidebar === "left" ? "active" : ""}`} onClick={() => patch({ sidebar: "left" })}>
                  Sidebar left
                </button>
                <button className={`chip ${resume.sidebar === "right" ? "active" : ""}`} onClick={() => patch({ sidebar: "right" })}>
                  Sidebar right
                </button>
              </div>
            ) : null}
            <label className="field">
              <span>Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => patch({ photo: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {resume.photo ? (
              <button className="btn ghost" onClick={() => patch({ photo: "" })}>
                Remove photo
              </button>
            ) : null}
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Contact</h3>
            </div>
            <div className="two">
              <Field label="First name" value={resume.contact.firstName} onChange={(firstName) => patch({ contact: { ...resume.contact, firstName } })} />
              <Field label="Last name" value={resume.contact.lastName} onChange={(lastName) => patch({ contact: { ...resume.contact, lastName } })} />
            </div>
            <Field label="Job title" value={resume.contact.jobTitle} onChange={(jobTitle) => patch({ contact: { ...resume.contact, jobTitle } })} />
            <div className="two">
              <Field label="Email" value={resume.contact.email} onChange={(email) => patch({ contact: { ...resume.contact, email } })} />
              <Field label="Phone" value={resume.contact.phone} onChange={(phone) => patch({ contact: { ...resume.contact, phone } })} />
            </div>
            <Field label="Location" value={resume.contact.location} onChange={(location) => patch({ contact: { ...resume.contact, location } })} />
            <div className="two">
              <Field label="Website" value={resume.contact.website} onChange={(website) => patch({ contact: { ...resume.contact, website } })} />
              <Field label="LinkedIn" value={resume.contact.linkedin} onChange={(linkedin) => patch({ contact: { ...resume.contact, linkedin } })} />
            </div>
            <Field
              label="GitHub"
              value={resume.contact.github ?? ""}
              onChange={(github) => patch({ contact: { ...resume.contact, github } })}
            />
          </div>

          <div className="block">
            <div className="block-head">
              <h3>{resume.titles.summary || "Profile"}</h3>
              <button
                className="btn"
                disabled={!!busy}
                onClick={async () => {
                  const summary = await run("Rewriting summary…", () => improveSummary(settings, resume, job));
                  if (summary) patch({ summary });
                }}
              >
                AI rewrite
              </button>
            </div>
            <Field label="Summary" area value={resume.summary} onChange={(summary) => patch({ summary })} />
            <Field
              label="Section title"
              value={resume.titles.summary ?? ""}
              onChange={(summary) => patch({ titles: { ...resume.titles, summary } })}
            />
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Experience</h3>
              <button
                className="btn"
                onClick={() =>
                  patch({
                    experience: [
                      ...resume.experience,
                      { id: uid(), company: "", role: "", location: "", start: "", end: "", current: false, bullets: [""] },
                    ],
                  })
                }
              >
                Add role
              </button>
            </div>
            {resume.experience.map((jobItem, idx) => (
              <div key={jobItem.id} className="block" style={{ boxShadow: "none" }}>
                <div className="two">
                  <Field
                    label="Role"
                    value={jobItem.role}
                    onChange={(role) =>
                      patch({ experience: resume.experience.map((j) => (j.id === jobItem.id ? { ...j, role } : j)) })
                    }
                  />
                  <Field
                    label="Company"
                    value={jobItem.company}
                    onChange={(company) =>
                      patch({ experience: resume.experience.map((j) => (j.id === jobItem.id ? { ...j, company } : j)) })
                    }
                  />
                </div>
                <div className="two">
                  <Field
                    label="Start"
                    value={jobItem.start}
                    onChange={(start) =>
                      patch({ experience: resume.experience.map((j) => (j.id === jobItem.id ? { ...j, start } : j)) })
                    }
                  />
                  <Field
                    label="End"
                    value={jobItem.current ? "Present" : jobItem.end}
                    onChange={(end) =>
                      patch({ experience: resume.experience.map((j) => (j.id === jobItem.id ? { ...j, end, current: false } : j)) })
                    }
                  />
                </div>
                <label className="tiny">
                  <input
                    type="checkbox"
                    checked={jobItem.current}
                    onChange={(e) =>
                      patch({
                        experience: resume.experience.map((j) =>
                          j.id === jobItem.id ? { ...j, current: e.target.checked } : j,
                        ),
                      })
                    }
                  />{" "}
                  Current role
                </label>
                {jobItem.bullets.map((b, bi) => (
                  <div key={bi} className="row" style={{ marginTop: 8 }}>
                    <textarea
                      className="inline-input bullet-input"
                      value={b}
                      rows={3}
                      placeholder="Achievement bullet"
                      onChange={(e) => {
                        const bullets = [...jobItem.bullets];
                        bullets[bi] = e.target.value;
                        patch({
                          experience: resume.experience.map((j) => (j.id === jobItem.id ? { ...j, bullets } : j)),
                        });
                      }}
                    />
                    <button
                      className="btn"
                      disabled={!!busy}
                      onClick={async () => {
                        const next = await run("Rewriting bullet…", () => rewriteBullet(settings, b, jobItem.role));
                        if (!next) return;
                        const bullets = [...jobItem.bullets];
                        bullets[bi] = next;
                        patch({
                          experience: resume.experience.map((j) => (j.id === jobItem.id ? { ...j, bullets } : j)),
                        });
                      }}
                    >
                      AI
                    </button>
                  </div>
                ))}
                <div className="row" style={{ marginTop: 8 }}>
                  <button
                    className="btn ghost"
                    onClick={() =>
                      patch({
                        experience: resume.experience.map((j) =>
                          j.id === jobItem.id ? { ...j, bullets: [...j.bullets, ""] } : j,
                        ),
                      })
                    }
                  >
                    Add bullet
                  </button>
                  <button
                    className="btn"
                    disabled={!!busy}
                    onClick={async () => {
                      const extra = await run("Suggesting bullets…", () =>
                        suggestBullets(settings, jobItem.role, jobItem.company),
                      );
                      if (extra)
                        patch({
                          experience: resume.experience.map((j) =>
                            j.id === jobItem.id ? { ...j, bullets: [...j.bullets.filter(Boolean), ...extra] } : j,
                          ),
                        });
                    }}
                  >
                    Suggest bullets
                  </button>
                  <button
                    className="btn danger"
                    onClick={() =>
                      patch({ experience: resume.experience.filter((j) => j.id !== jobItem.id) })
                    }
                  >
                    Remove
                  </button>
                  {idx > 0 ? (
                    <button
                      className="btn ghost"
                      onClick={() => {
                        const next = [...resume.experience];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        patch({ experience: next });
                      }}
                    >
                      Up
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Education</h3>
              <button
                className="btn"
                onClick={() =>
                  patch({
                    education: [
                      ...resume.education,
                      { id: uid(), school: "", degree: "", location: "", start: "", end: "", details: "" },
                    ],
                  })
                }
              >
                Add
              </button>
            </div>
            {resume.education.map((ed) => (
              <div key={ed.id}>
                <div className="two">
                  <Field
                    label="Degree"
                    value={ed.degree}
                    onChange={(degree) =>
                      patch({ education: resume.education.map((x) => (x.id === ed.id ? { ...x, degree } : x)) })
                    }
                  />
                  <Field
                    label="School"
                    value={ed.school}
                    onChange={(school) =>
                      patch({ education: resume.education.map((x) => (x.id === ed.id ? { ...x, school } : x)) })
                    }
                  />
                </div>
                <div className="two">
                  <Field
                    label="Start"
                    value={ed.start}
                    onChange={(start) =>
                      patch({ education: resume.education.map((x) => (x.id === ed.id ? { ...x, start } : x)) })
                    }
                  />
                  <Field
                    label="End"
                    value={ed.end}
                    onChange={(end) =>
                      patch({ education: resume.education.map((x) => (x.id === ed.id ? { ...x, end } : x)) })
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Skills</h3>
              <button
                className="btn"
                onClick={() => patch({ skills: [...resume.skills, { id: uid(), name: "", items: "" }] })}
              >
                Add group
              </button>
            </div>
            {resume.skills.map((g) => (
              <div className="two" key={g.id}>
                <Field
                  label="Group"
                  value={g.name}
                  onChange={(name) =>
                    patch({ skills: resume.skills.map((x) => (x.id === g.id ? { ...x, name } : x)) })
                  }
                />
                <Field
                  label="Items"
                  value={g.items}
                  onChange={(items) =>
                    patch({ skills: resume.skills.map((x) => (x.id === g.id ? { ...x, items } : x)) })
                  }
                />
              </div>
            ))}
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Projects</h3>
              <button
                className="btn"
                onClick={() =>
                  patch({
                    projects: [...resume.projects, { id: uid(), name: "", link: "", description: "", bullets: [""] }],
                  })
                }
              >
                Add
              </button>
            </div>
            {resume.projects.map((p) => (
              <div key={p.id}>
                <Field
                  label="Name"
                  value={p.name}
                  onChange={(name) =>
                    patch({ projects: resume.projects.map((x) => (x.id === p.id ? { ...x, name } : x)) })
                  }
                />
                <Field
                  label="Description"
                  value={p.description}
                  onChange={(description) =>
                    patch({ projects: resume.projects.map((x) => (x.id === p.id ? { ...x, description } : x)) })
                  }
                />
              </div>
            ))}
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Languages</h3>
            </div>
            {resume.languages.map((l) => (
              <div className="two" key={l.id}>
                <Field
                  label="Language"
                  value={l.name}
                  onChange={(name) =>
                    patch({ languages: resume.languages.map((x) => (x.id === l.id ? { ...x, name } : x)) })
                  }
                />
                <Field
                  label="Level"
                  value={l.level}
                  onChange={(level) =>
                    patch({ languages: resume.languages.map((x) => (x.id === l.id ? { ...x, level } : x)) })
                  }
                />
              </div>
            ))}
            <button
              className="btn ghost"
              onClick={() => patch({ languages: [...resume.languages, { id: uid(), name: "", level: "" }] })}
            >
              Add language
            </button>
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Certifications</h3>
              <button
                className="btn"
                onClick={() =>
                  patch({
                    certifications: [...resume.certifications, { id: uid(), name: "", issuer: "", year: "" }],
                  })
                }
              >
                Add
              </button>
            </div>
            {resume.certifications.map((c) => (
              <div className="two" key={c.id}>
                <Field
                  label="Name"
                  value={c.name}
                  onChange={(name) =>
                    patch({ certifications: resume.certifications.map((x) => (x.id === c.id ? { ...x, name } : x)) })
                  }
                />
                <Field
                  label="Issuer / year"
                  value={`${c.issuer}${c.year ? ` (${c.year})` : ""}`}
                  onChange={(v) => {
                    const match = v.match(/^(.*?)(?:\s*\((\d{4})\))?$/);
                    patch({
                      certifications: resume.certifications.map((x) =>
                        x.id === c.id ? { ...x, issuer: match?.[1] ?? v, year: match?.[2] ?? "" } : x,
                      ),
                    });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Section order & titles</h3>
            </div>
            {resume.sectionOrder.map((id, idx) => (
              <div className="row" key={id} style={{ marginBottom: 8 }}>
                <input
                  className="inline-input"
                  value={resume.titles[id] ?? id}
                  onChange={(e) => patch({ titles: { ...resume.titles, [id]: e.target.value } })}
                />
                <button
                  className="btn ghost"
                  disabled={idx === 0}
                  onClick={() => {
                    const next = [...resume.sectionOrder];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    patch({ sectionOrder: next });
                  }}
                >
                  Up
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    patch({
                      hidden: resume.hidden.includes(id)
                        ? resume.hidden.filter((h) => h !== id)
                        : [...resume.hidden, id],
                    })
                  }
                >
                  {resume.hidden.includes(id) ? "Show" : "Hide"}
                </button>
              </div>
            ))}
            <button className="btn ghost" onClick={() => patch({ sectionOrder: [...DEFAULT_SECTION_ORDER] })}>
              Reset order
            </button>
          </div>

          <div className="block">
            <div className="block-head">
              <h3>ATS & job match</h3>
            </div>
            <p className="tiny" style={{ marginBottom: 8 }}>
              Same scoring as your Job Searcher extension: paste a job description, then score this CV.
            </p>
            <Field
              label="Paste a job description"
              area
              value={job}
              onChange={(v) => {
                setJob(v);
                setAtsAi(null);
              }}
              placeholder="Paste the role you are targeting"
            />
            <button
              className="btn primary"
              disabled={!!busy || !job.trim()}
              onClick={async () => {
                const data = await run("Scoring CV against this job…", () => scoreAts(settings, resume, job));
                if (data) setAtsAi(data);
              }}
            >
              Score ATS
            </button>
            {err ? <p className="status err">{err}</p> : null}
            {atsAi ? (
              <>
                <div className="ats-score-row">
                  <div
                    className="ats-score-circle"
                    style={{
                      color: atsAi.score >= 70 ? "#188038" : atsAi.score >= 50 ? "#e37400" : "#c5221f",
                    }}
                  >
                    {Math.round(atsAi.score)}
                  </div>
                  <div>
                    <div
                      className="ats-verdict"
                      style={{
                        color: atsAi.score >= 70 ? "#188038" : atsAi.score >= 50 ? "#e37400" : "#c5221f",
                      }}
                    >
                      {atsAi.score >= 70
                        ? "Recommended to apply"
                        : atsAi.score >= 50
                          ? "Can apply"
                          : "Improve first"}
                    </div>
                    <div className="ats-sublabel">ATS score (0–100){atsAi.verdict ? ` · ${atsAi.verdict}` : ""}</div>
                  </div>
                </div>
                {atsAi.matched_keywords?.length ? (
                  <>
                    <p className="tiny">Matched keywords</p>
                    {atsAi.matched_keywords.slice(0, 12).map((k) => (
                      <span className="tag" key={k}>
                        {k}
                      </span>
                    ))}
                  </>
                ) : null}
                {atsAi.missing_keywords?.length ? (
                  <>
                    <p className="tiny">Missing keywords</p>
                    {atsAi.missing_keywords.slice(0, 12).map((k) => (
                      <span className="tag miss" key={k}>
                        {k}
                      </span>
                    ))}
                  </>
                ) : null}
                {atsAi.suggestions?.length ? (
                  <>
                    <p className="tiny">Suggestions</p>
                    <ul className="ats-suggestions">
                      {atsAi.suggestions.slice(0, 5).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : job.trim() ? (
              <>
                <div className="ats-bar">
                  <span style={{ width: `${ats.score}%` }} />
                </div>
                <p className="tiny">Quick keyword scan {ats.score}%</p>
                <p className="tiny">Present</p>
                {ats.matched.slice(0, 12).map((k) => (
                  <span className="tag" key={k}>
                    {k}
                  </span>
                ))}
                <p className="tiny">Possibly missing</p>
                {ats.missing.slice(0, 12).map((k) => (
                  <span className="tag miss" key={k}>
                    {k}
                  </span>
                ))}
              </>
            ) : null}
            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="btn"
                disabled={!!busy || !job}
                onClick={async () => {
                  const missing = atsAi?.missing_keywords?.length
                    ? atsAi.missing_keywords
                    : (await run("Finding missing skills…", () => suggestSkills(settings, resume, job)))?.missing;
                  if (!missing?.length) return;
                  const extra = missing.slice(0, 8).join(", ");
                  const first = resume.skills[0];
                  if (!first) {
                    patch({ skills: [{ id: uid(), name: "Suggested", items: extra }] });
                    return;
                  }
                  patch({
                    skills: resume.skills.map((s, i) =>
                      i === 0 ? { ...s, items: [s.items, extra].filter(Boolean).join(", ") } : s,
                    ),
                  });
                }}
              >
                Add missing skills
              </button>
            </div>
          </div>

          <div className="block">
            <div className="block-head">
              <h3>Translate</h3>
            </div>
            <Field label="Language" value={lang} onChange={setLang} />
            <button
              className="btn"
              disabled={!!busy}
              onClick={async () => {
                const data = await run(`Translating to ${lang}…`, () => translateResume(settings, resume, lang));
                if (data) patch({ ...data, locale: lang });
              }}
            >
              Translate resume
            </button>
          </div>
        </div>

        <div className="preview-col">
          <PreviewFrame className="clickable" onClick={() => setLargeOpen(true)} title="Click to preview in large">
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

      {largeOpen ? (
        <LargePreview
          resume={resume}
          onClose={closeLarge}
          onPdf={() => previewRef.current && exportPreviewPdf(previewRef.current, resume.title)}
          onWord={() => exportResumeDocx(resume)}
        />
      ) : null}

      {importOpen ? (
        <div className="modal-back" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Improve an existing CV</h3>
            <p className="lede">Paste your current resume. AI will map it into the editor.</p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} style={{ minHeight: 180 }} />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setImportOpen(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                disabled={!!busy || !importText.trim()}
                onClick={async () => {
                  const data = await run("Parsing resume…", () => parseResumeText(settings, importText));
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
                Parse with AI
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
