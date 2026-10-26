import { CoverPreview, ResignationPreview, ResumePreview } from "../components/Preview";
import { PreviewFrame } from "../components/PreviewFrame";
import { GalleryCard } from "../components/DocCard";
import { EditorBar } from "../components/EditorBar";
import { Icon } from "../components/Icon";
import { Field, Menu, Tabs, useT } from "../components/ui";
import { exportLetterDocx, exportPreviewPdf, exportResumeDocx, exportTxt } from "../lib/export";
import { generateCoverLetter, generateResignation, pingAi } from "../lib/ai";
import { useStore } from "../store";
import { ACCENTS, BODY_FONTS, TEMPLATES, TITLE_FONTS } from "../types";
import type { CoverLetter, ResignationLetter, Resume } from "../types";
import { useMemo, useRef, useState, type ReactNode } from "react";

function localeBadge(locale: string) {
  if (locale === "he") return "עברית";
  if (locale === "en") return "EN";
  return locale;
}

// ---------- letters ----------

function LetterDesign({
  doc,
  patch,
}: {
  doc: { template: string; accent: string; titleFont: string; bodyFont: string };
  patch: (p: Partial<{ template: Resume["template"]; accent: string; titleFont: string; bodyFont: string }>) => void;
}) {
  const t = useT();
  return (
    <section className="panel">
      <h3 className="panel-title">{t.docDesign}</h3>
      <div className="chip-row">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className={`chip ${doc.template === tpl.id ? "active" : ""}`}
            onClick={() => patch({ template: tpl.id })}
          >
            {tpl.label}
          </button>
        ))}
      </div>
      <div className="swatches">
        {ACCENTS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${doc.accent === c ? "active" : ""}`}
            style={{ background: c }}
            onClick={() => patch({ accent: c })}
            aria-label={c}
          />
        ))}
      </div>
      <div className="two">
        <label className="field">
          <span className="field-label">{t.titleFont}</span>
          <select value={doc.titleFont} onChange={(e) => patch({ titleFont: e.target.value })}>
            {TITLE_FONTS.map((f) => (
              <option key={f.id}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t.bodyFont}</span>
          <select value={doc.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
            {BODY_FONTS.map((f) => (
              <option key={f.id}>{f.label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function LetterLayout({
  bar,
  status,
  form,
  preview,
}: {
  bar: ReactNode;
  status: string;
  form: ReactNode;
  preview: ReactNode;
}) {
  const t = useT();
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  return (
    <div className="editor">
      {bar}
      <Tabs
        className="pane-switch"
        value={pane}
        onChange={setPane}
        options={[
          { id: "edit", label: t.editTab },
          { id: "preview", label: t.previewTab },
        ]}
      />
      <div className={`letter-layout show-${pane}`}>
        <div className="editor-main">
          {status ? <p className="status">{status}</p> : null}
          {form}
        </div>
        <div className="preview-col">{preview}</div>
      </div>
    </div>
  );
}

export function CoverEditor({ letter }: { letter: CoverLetter }) {
  const { docs, settings, upsertCover } = useStore();
  const t = useT();
  const previewRef = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const resume = docs.resumes.find((r) => r.id === letter.resumeId);
  const patch = (p: Partial<CoverLetter>) => upsertCover({ ...letter, ...p });

  async function generate() {
    if (!resume) {
      setErr(t.linkCvFirst);
      return;
    }
    setBusy(t.busyWrite);
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
      setErr(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy("");
    }
  }

  const word = () =>
    exportLetterDocx(
      letter.title,
      resume ? `${resume.contact.firstName} ${resume.contact.lastName}` : t.newCover,
      [letter.company, letter.jobTitle, letter.date],
      letter.body,
    );

  return (
    <LetterLayout
      bar={
        <EditorBar
          title={letter.title}
          downloads={[
            { label: t.pdf, icon: "document", onClick: () => previewRef.current && exportPreviewPdf(previewRef.current, letter.title) },
            { label: t.word, icon: "download", onClick: word },
          ]}
        />
      }
      status={busy || err}
      form={
        <>
          <section className="panel">
            <div className="panel-head">
              <h2 className="section-title">{t.newCover}</h2>
              <button type="button" className="btn soft" onClick={generate} disabled={!!busy}>
                <Icon name="ai-rewrite" size={18} />
                {t.generate}
              </button>
            </div>
            <Field label={t.docTitle} value={letter.title} onChange={(title) => patch({ title })} />
            <label className="field">
              <span className="field-label">{t.linkedCv}</span>
              <select value={letter.resumeId} onChange={(e) => patch({ resumeId: e.target.value })}>
                <option value="">{t.none}</option>
                {docs.resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="two">
              <Field label={t.company} value={letter.company} onChange={(company) => patch({ company })} />
              <Field label={t.letterJob} value={letter.jobTitle} onChange={(jobTitle) => patch({ jobTitle })} />
            </div>
            <div className="two">
              <Field label={t.hiringManager} value={letter.hiringManager} onChange={(hiringManager) => patch({ hiringManager })} />
              <Field label={t.date} value={letter.date} onChange={(date) => patch({ date })} />
            </div>
            <Field
              label={t.jobDescription}
              area
              rows={5}
              value={letter.jobDescription}
              onChange={(jobDescription) => patch({ jobDescription })}
            />
            <Field label={t.letterBody} area rows={12} value={letter.body} onChange={(body) => patch({ body })} />
          </section>
          <LetterDesign doc={letter} patch={patch} />
        </>
      }
      preview={
        <PreviewFrame>
          <div ref={(n) => { previewRef.current = n?.querySelector("article") ?? n; }}>
            <CoverPreview letter={letter} from={resume} />
          </div>
        </PreviewFrame>
      }
    />
  );
}

export function ResignationEditor({ letter }: { letter: ResignationLetter }) {
  const { settings, upsertResignation } = useStore();
  const t = useT();
  const previewRef = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const patch = (p: Partial<ResignationLetter>) => upsertResignation({ ...letter, ...p });

  async function generate() {
    setBusy(t.busyWrite);
    setErr("");
    try {
      const body = await generateResignation(settings, letter);
      patch({ body });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy("");
    }
  }

  return (
    <LetterLayout
      bar={
        <EditorBar
          title={letter.title}
          downloads={[
            { label: t.pdf, icon: "document", onClick: () => previewRef.current && exportPreviewPdf(previewRef.current, letter.title) },
            {
              label: t.word,
              icon: "download",
              onClick: () =>
                exportLetterDocx(letter.title, t.newResign, [letter.company, letter.position, letter.lastDay], letter.body),
            },
          ]}
        />
      }
      status={busy || err}
      form={
        <section className="panel">
          <div className="panel-head">
            <h2 className="section-title">{t.newResign}</h2>
            <button type="button" className="btn soft" onClick={generate} disabled={!!busy}>
              <Icon name="ai-rewrite" size={18} />
              {t.generate}
            </button>
          </div>
          <Field label={t.docTitle} value={letter.title} onChange={(title) => patch({ title })} />
          <div className="two">
            <Field label={t.manager} value={letter.managerName} onChange={(managerName) => patch({ managerName })} />
            <Field label={t.company} value={letter.company} onChange={(company) => patch({ company })} />
          </div>
          <div className="two">
            <Field label={t.position} value={letter.position} onChange={(position) => patch({ position })} />
            <Field label={t.lastDay} value={letter.lastDay} onChange={(lastDay) => patch({ lastDay })} />
          </div>
          <div className="two">
            <Field label={t.notice} value={letter.notice} onChange={(notice) => patch({ notice })} />
            <Field label={t.reason} value={letter.reason} onChange={(reason) => patch({ reason })} />
          </div>
          <Field label={t.letterBody} area rows={12} value={letter.body} onChange={(body) => patch({ body })} />
        </section>
      }
      preview={
        <PreviewFrame>
          <div ref={(n) => { previewRef.current = n?.querySelector("article") ?? n; }}>
            <ResignationPreview letter={letter} />
          </div>
        </PreviewFrame>
      }
    />
  );
}

// ---------- settings ----------

export function SettingsPage() {
  const { settings, setSettings, exportBackup, importBackup } = useStore();
  const t = useT();
  const [testMsg, setTestMsg] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [showKey, setShowKey] = useState(false);

  async function testConnection() {
    setTestBusy(true);
    setTestMsg("");
    setTestOk(false);
    try {
      const reply = await pingAi(settings);
      setTestOk(true);
      setTestMsg(`${t.connected} ${reply}`);
    } catch (e) {
      setTestOk(false);
      setTestMsg(e instanceof Error ? e.message : t.failed);
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <h1 className="page-title">{t.settings}</h1>
      <section className="panel">
        <h2 className="section-title">{t.aiTitle}</h2>
        <p className="lede">{t.aiHelp}</p>
        <label className="field">
          <span className="field-label">{t.apiKey}</span>
          <span className="secret-field">
            <input
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              onChange={(e) => {
                const apiKey = e.target.value;
                const patch: Partial<typeof settings> = { apiKey };
                if (apiKey.trim().startsWith("sk-ant-")) {
                  patch.baseUrl = "https://api.anthropic.com";
                  if (!/claude/i.test(settings.model)) patch.model = "claude-haiku-4-5-20251001";
                }
                setSettings(patch);
              }}
            />
            <button type="button" className="btn ghost" onClick={() => setShowKey((v) => !v)}>
              {showKey ? t.hideKey : t.showKey}
            </button>
          </span>
        </label>
        <Field label={t.baseUrl} dir="ltr" value={settings.baseUrl} onChange={(baseUrl) => setSettings({ baseUrl })} />
        <Field label={t.model} dir="ltr" value={settings.model} onChange={(model) => setSettings({ model })} />
        <div className="chip-row">
          <button
            className="chip"
            type="button"
            onClick={() => setSettings({ baseUrl: "https://api.anthropic.com", model: "claude-haiku-4-5-20251001" })}
          >
            Claude Haiku 4.5
          </button>
          <button
            className="chip"
            type="button"
            onClick={() => setSettings({ baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-5" })}
          >
            Claude Sonnet 4.5
          </button>
        </div>
        <div className="row">
          <button className="btn primary" onClick={testConnection} disabled={testBusy}>
            {testBusy ? t.testing : t.test}
          </button>
        </div>
        {testMsg ? <p className={`status ${testOk ? "ok" : "err"}`}>{testMsg}</p> : null}
      </section>

      <section className="panel">
        <h2 className="section-title">{t.backupTitle}</h2>
        <p className="lede">{t.backupHelp}</p>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              const blob = new Blob([exportBackup()], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "korot-backup.json";
              a.click();
            }}
          >
            <Icon name="download" size={18} />
            {t.exportBackup}
          </button>
          <label className="btn">
            <Icon name="upload" size={18} />
            {t.importBackup}
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
      </section>
    </div>
  );
}

// ---------- gallery ----------

type LetterItem =
  | { kind: "cover"; doc: CoverLetter }
  | { kind: "resignation"; doc: ResignationLetter };

export function Dashboard() {
  const { docs, newResume, newCover, newResignation, setView, remove, duplicateResume } = useStore();
  const t = useT();
  const [tab, setTab] = useState<"cvs" | "letters">("cvs");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");

  const q = query.trim().toLowerCase();
  const order = <T extends { title: string; updatedAt: number }>(a: T, b: T) =>
    sort === "name" ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt;

  const resumes = useMemo(
    () =>
      docs.resumes
        .filter((r) =>
          !q
            ? true
            : `${r.title} ${r.contact.firstName} ${r.contact.lastName} ${r.contact.jobTitle}`.toLowerCase().includes(q),
        )
        .sort(order),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docs.resumes, q, sort],
  );

  const letters = useMemo(() => {
    const all: LetterItem[] = [
      ...docs.covers.map((doc) => ({ kind: "cover" as const, doc })),
      ...docs.resignations.map((doc) => ({ kind: "resignation" as const, doc })),
    ];
    return all
      .filter((l) => (!q ? true : `${l.doc.title} ${l.doc.company}`.toLowerCase().includes(q)))
      .sort((a, b) => order(a.doc, b.doc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs.covers, docs.resignations, q, sort]);

  const confirmDelete = (title: string) => window.confirm(t.confirmDelete.replace("{name}", title));

  const list = tab === "cvs" ? resumes : letters;
  const total = tab === "cvs" ? docs.resumes.length : docs.covers.length + docs.resignations.length;

  return (
    <div className="page">
      <div className="dash-head">
        <div>
          <h1 className="page-title">{t.myDocs}</h1>
          <p className="page-sub">{t.dashSub}</p>
        </div>
        <div className="dash-actions">
          <button type="button" className="btn outline" onClick={() => newResume("import")}>
            <Icon name="upload" size={20} />
            {t.importDoc}
          </button>
          <Menu
            className="btn primary big"
            label={t.newDoc}
            align="end"
            items={[
              { label: t.newCv, icon: "document", onClick: () => newResume() },
              { label: t.newCover, icon: "edit", onClick: () => newCover() },
              { label: t.newResign, icon: "archive", onClick: () => newResignation() },
            ]}
          >
            <Icon name="add" size={22} />
            {t.newDoc}
          </Menu>
        </div>
      </div>

      <div className="dash-tools">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { id: "cvs", label: t.tabCvs },
            { id: "letters", label: t.tabLetters },
          ]}
        />
        <div className="dash-filters">
          <label className="select">
            <span className="sr-only">{t.sortRecent}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as "recent" | "name")}>
              <option value="recent">{t.sortRecent}</option>
              <option value="name">{t.sortName}</option>
            </select>
          </label>
          <label className="search">
            <Icon name="search" size={20} />
            <input type="search" value={query} placeholder={t.search} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="empty">{q ? t.noMatch : total === 0 ? (tab === "cvs" ? t.emptyCvs : t.emptyLetters) : t.noMatch}</p>
      ) : null}

      <div className="gallery">
        {tab === "cvs"
          ? resumes.map((r) => (
              <GalleryCard
                key={r.id}
                title={r.title}
                badge={localeBadge(r.locale)}
                updatedAt={r.updatedAt}
                onOpen={() => setView({ page: "resume", id: r.id })}
                items={(pdf) => [
                  { label: t.duplicate, icon: "duplicate", onClick: () => duplicateResume(r.id) },
                  { label: t.downloadPdf, icon: "download", onClick: pdf },
                  { label: t.downloadWord, icon: "document", onClick: () => void exportResumeDocx(r) },
                  { label: t.txt, icon: "summary", onClick: () => exportTxt(r) },
                  {
                    label: t.delete,
                    icon: "delete",
                    danger: true,
                    onClick: () => confirmDelete(r.title) && remove("resume", r.id),
                  },
                ]}
              >
                <ResumePreview resume={r} />
              </GalleryCard>
            ))
          : letters.map((l) =>
              l.kind === "cover" ? (
                <GalleryCard
                  key={l.doc.id}
                  title={l.doc.title}
                  badge={t.coverBadge}
                  updatedAt={l.doc.updatedAt}
                  onOpen={() => setView({ page: "cover", id: l.doc.id })}
                  items={(pdf) => [
                    { label: t.downloadPdf, icon: "download", onClick: pdf },
                    {
                      label: t.delete,
                      icon: "delete",
                      danger: true,
                      onClick: () => confirmDelete(l.doc.title) && remove("cover", l.doc.id),
                    },
                  ]}
                >
                  <CoverPreview letter={l.doc} from={docs.resumes.find((r) => r.id === l.doc.resumeId)} />
                </GalleryCard>
              ) : (
                <GalleryCard
                  key={l.doc.id}
                  title={l.doc.title}
                  badge={t.resignBadge}
                  updatedAt={l.doc.updatedAt}
                  onOpen={() => setView({ page: "resignation", id: l.doc.id })}
                  items={(pdf) => [
                    { label: t.downloadPdf, icon: "download", onClick: pdf },
                    {
                      label: t.delete,
                      icon: "delete",
                      danger: true,
                      onClick: () => confirmDelete(l.doc.title) && remove("resignation", l.doc.id),
                    },
                  ]}
                >
                  <ResignationPreview letter={l.doc} />
                </GalleryCard>
              ),
            )}
      </div>
    </div>
  );
}
