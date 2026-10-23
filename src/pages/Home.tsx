import { CoverPreview, ResignationPreview } from "../components/Preview";
import { PreviewFrame } from "../components/PreviewFrame";
import { CoverDocCard, ResignationDocCard, ResumeDocCard } from "../components/DocCard";
import { exportLetterDocx, exportPreviewPdf } from "../lib/export";
import { generateCoverLetter, generateResignation, pingAi } from "../lib/ai";
import { useStore } from "../store";
import { ACCENTS, BODY_FONTS, TEMPLATES, TITLE_FONTS } from "../types";
import type { CoverLetter, ResignationLetter, Resume } from "../types";
import { UI } from "../i18n";
import { useRef, useState } from "react";

function Field({
  label,
  value,
  onChange,
  area,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  secret?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <span className={secret ? "secret-field" : undefined}>
          <input
            type={secret && !visible ? "password" : "text"}
            value={value}
            autoComplete={secret ? "off" : undefined}
            spellCheck={secret ? false : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
          {secret ? (
            <button type="button" className="btn ghost secret-toggle" onClick={() => setVisible((v) => !v)}>
              {visible ? "Hide" : "Show"}
            </button>
          ) : null}
        </span>
      )}
    </label>
  );
}

export function CoverEditor({ letter }: { letter: CoverLetter }) {
  const { docs, settings, upsertCover, setView } = useStore();
  const previewRef = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const resume = docs.resumes.find((r) => r.id === letter.resumeId);
  const patch = (p: Partial<CoverLetter>) => upsertCover({ ...letter, ...p });

  async function generate() {
    if (!resume) {
      setErr("Link a resume first.");
      return;
    }
    setBusy("Writing cover letter…");
    setErr("");
    try {
      const body = await generateCoverLetter(
        settings,
        resume,
        letter.company,
        letter.jobTitle,
        letter.jobDescription,
        letter.hiringManager,
      );
      patch({ body });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "AI failed");
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
        <button className="btn" onClick={generate} disabled={!!busy}>
          Generate with AI
        </button>
        <button
          className="btn primary"
          onClick={() => previewRef.current && exportPreviewPdf(previewRef.current, letter.title)}
        >
          PDF
        </button>
        <button
          className="btn"
          onClick={() =>
            exportLetterDocx(letter.title, resume ? `${resume.contact.firstName} ${resume.contact.lastName}` : "Cover letter", [
              letter.company,
              letter.jobTitle,
              letter.date,
            ], letter.body)
          }
        >
          Word
        </button>
      </div>
      <p className="status">{busy || err}</p>
      <div className="editor-layout">
        <div className="editor-col">
          <div className="block">
            <Field label="Document title" value={letter.title} onChange={(title) => patch({ title })} />
            <label className="field">
              <span>Linked resume</span>
              <select value={letter.resumeId} onChange={(e) => patch({ resumeId: e.target.value })}>
                <option value="">None</option>
                {docs.resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="two">
              <Field label="Company" value={letter.company} onChange={(company) => patch({ company })} />
              <Field label="Job title" value={letter.jobTitle} onChange={(jobTitle) => patch({ jobTitle })} />
            </div>
            <Field label="Hiring manager" value={letter.hiringManager} onChange={(hiringManager) => patch({ hiringManager })} />
            <Field label="Date" value={letter.date} onChange={(date) => patch({ date })} />
            <Field
              label="Job description"
              area
              value={letter.jobDescription}
              onChange={(jobDescription) => patch({ jobDescription })}
            />
            <Field label="Letter body" area value={letter.body} onChange={(body) => patch({ body })} />
            <div className="chip-row">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className={`chip ${letter.template === t.id ? "active" : ""}`}
                  onClick={() => patch({ template: t.id })}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {ACCENTS.map((c) => (
                <button key={c} className="swatch" style={{ background: c }} onClick={() => patch({ accent: c })} />
              ))}
            </div>
            <div className="two" style={{ marginTop: 8 }}>
              <label className="field">
                <span>Title font</span>
                <select value={letter.titleFont} onChange={(e) => patch({ titleFont: e.target.value })}>
                  {TITLE_FONTS.map((f) => (
                    <option key={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Body font</span>
                <select value={letter.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
                  {BODY_FONTS.map((f) => (
                    <option key={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
        <div className="preview-col">
          <PreviewFrame>
            <div ref={(n) => { previewRef.current = n?.querySelector("article") ?? n; }}>
              <CoverPreview letter={letter} from={resume} />
            </div>
          </PreviewFrame>
        </div>
      </div>
    </div>
  );
}

export function ResignationEditor({ letter }: { letter: ResignationLetter }) {
  const { settings, upsertResignation, setView } = useStore();
  const previewRef = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const patch = (p: Partial<ResignationLetter>) => upsertResignation({ ...letter, ...p });

  async function generate() {
    setBusy("Writing resignation letter…");
    setErr("");
    try {
      const body = await generateResignation(settings, letter);
      patch({ body });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "AI failed");
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
        <button className="btn" onClick={generate} disabled={!!busy}>
          Generate with AI
        </button>
        <button
          className="btn primary"
          onClick={() => previewRef.current && exportPreviewPdf(previewRef.current, letter.title)}
        >
          PDF
        </button>
        <button
          className="btn"
          onClick={() =>
            exportLetterDocx(
              letter.title,
              "Resignation",
              [letter.company, letter.position, letter.lastDay],
              letter.body,
            )
          }
        >
          Word
        </button>
      </div>
      <p className="status">{busy || err}</p>
      <div className="editor-layout">
        <div className="editor-col">
          <div className="block">
            <Field label="Document title" value={letter.title} onChange={(title) => patch({ title })} />
            <div className="two">
              <Field label="Manager" value={letter.managerName} onChange={(managerName) => patch({ managerName })} />
              <Field label="Company" value={letter.company} onChange={(company) => patch({ company })} />
            </div>
            <div className="two">
              <Field label="Position" value={letter.position} onChange={(position) => patch({ position })} />
              <Field label="Last day" value={letter.lastDay} onChange={(lastDay) => patch({ lastDay })} />
            </div>
            <Field label="Notice" value={letter.notice} onChange={(notice) => patch({ notice })} />
            <Field label="Reason (optional)" value={letter.reason} onChange={(reason) => patch({ reason })} />
            <Field label="Letter body" area value={letter.body} onChange={(body) => patch({ body })} />
          </div>
        </div>
        <div className="preview-col">
          <PreviewFrame>
            <div ref={(n) => { previewRef.current = n?.querySelector("article") ?? n; }}>
              <ResignationPreview letter={letter} />
            </div>
          </PreviewFrame>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, setSettings, exportBackup, importBackup, setView } = useStore();
  const [testMsg, setTestMsg] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testOk, setTestOk] = useState(false);

  async function testConnection() {
    setTestBusy(true);
    setTestMsg("");
    setTestOk(false);
    try {
      const reply = await pingAi(settings);
      setTestOk(true);
      setTestMsg(`Connected. Model replied: ${reply}`);
    } catch (e) {
      setTestOk(false);
      setTestMsg(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn ghost" onClick={() => setView({ page: "home" })}>
          ← Home
        </button>
      </div>
      <h2>Settings</h2>
      <p className="lede">
        Paste an Anthropic <strong>API key</strong> from{" "}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
          console.anthropic.com/settings/keys
        </a>{" "}
        (<code>sk-ant-...</code>). Skip the identity-federation popup — click <strong>Continue with an API key</strong>.
        Base URL stays <code>https://api.anthropic.com</code>. Use Haiku for everyday ATS scoring; Sonnet only for a
        one-off rewrite. Then click Test connection.
      </p>
      <div className="block" style={{ maxWidth: 560 }}>
        <Field
          label="API key"
          secret
          value={settings.apiKey}
          onChange={(apiKey) => {
            const patch: Partial<typeof settings> = { apiKey };
            if (apiKey.trim().startsWith("sk-ant-")) {
              patch.baseUrl = "https://api.anthropic.com";
              if (!/claude/i.test(settings.model)) patch.model = "claude-haiku-4-5-20251001";
            }
            setSettings(patch);
          }}
        />
        <Field label="Base URL" value={settings.baseUrl} onChange={(baseUrl) => setSettings({ baseUrl })} />
        <Field label="Model" value={settings.model} onChange={(model) => setSettings({ model })} />
        <div className="row" style={{ marginBottom: 10 }}>
          <button
            className="chip"
            type="button"
            onClick={() =>
              setSettings({
                baseUrl: "https://api.anthropic.com",
                model: "claude-haiku-4-5-20251001",
              })
            }
          >
            Claude Haiku 4.5
          </button>
          <button
            className="chip"
            type="button"
            onClick={() =>
              setSettings({
                baseUrl: "https://api.anthropic.com",
                model: "claude-sonnet-4-5",
              })
            }
          >
            Claude Sonnet 4.5
          </button>
        </div>
        <div className="row">
          <button className="btn primary" onClick={testConnection} disabled={testBusy}>
            {testBusy ? "Testing…" : "Test connection"}
          </button>
          <button
            className="btn"
            onClick={() => {
              const blob = new Blob([exportBackup()], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "cv-workbench-backup.json";
              a.click();
            }}
          >
            Export backup
          </button>
          <label className="btn">
            Import backup
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                importBackup(await file.text());
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {testMsg ? <p className={`status ${testOk ? "ok" : "err"}`}>{testMsg}</p> : null}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { docs, newResume, newCover, newResignation, reloadMyCvs, setView, remove, duplicateResume, settings } =
    useStore();
  const t = UI[settings.uiLang];
  return (
    <div>
      <div className="dash-head">
        <div>
          <h2>{t.resumes}</h2>
          <p className="lede">{t.lede}</p>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={reloadMyCvs}>
            {t.reload}
          </button>
          <button className="btn" onClick={() => newCover()}>
            {t.cover}
          </button>
          <button className="btn" onClick={newResignation}>
            {t.resign}
          </button>
          <button className="btn primary create-new" onClick={newResume}>
            {t.createCv}
          </button>
        </div>
      </div>
      {docs.resumes.length === 0 ? <p className="lede">—</p> : null}
      <div className="grid-cards">
        {docs.resumes.map((r: Resume) => (
          <ResumeDocCard
            key={r.id}
            resume={r}
            uiLang={settings.uiLang}
            onEdit={() => setView({ page: "resume", id: r.id })}
            onDuplicate={() => duplicateResume(r.id)}
            onDelete={() => remove("resume", r.id)}
          />
        ))}
      </div>

      {docs.covers.length ? (
        <>
          <h3 className="dash-section">{t.covers}</h3>
          <div className="grid-cards">
            {docs.covers.map((c) => (
              <CoverDocCard
                key={c.id}
                letter={c}
                from={docs.resumes.find((r) => r.id === c.resumeId)}
                uiLang={settings.uiLang}
                onEdit={() => setView({ page: "cover", id: c.id })}
                onDelete={() => remove("cover", c.id)}
              />
            ))}
          </div>
        </>
      ) : null}

      {docs.resignations.length ? (
        <>
          <h3 className="dash-section">{t.resignations}</h3>
          <div className="grid-cards">
            {docs.resignations.map((c) => (
              <ResignationDocCard
                key={c.id}
                letter={c}
                uiLang={settings.uiLang}
                onEdit={() => setView({ page: "resignation", id: c.id })}
                onDelete={() => remove("resignation", c.id)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
