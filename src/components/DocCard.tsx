import { CoverPreview, ResignationPreview, ResumePreview } from "./Preview";
import { exportLetterDocx, exportPreviewPdf } from "../lib/export";
import { UI, type UiLang } from "../i18n";
import type { CoverLetter, ResignationLetter, Resume } from "../types";
import { useRef, useState, type ReactNode } from "react";

function capturePage(node: HTMLDivElement | null) {
  return node?.querySelector(".cv-page") as HTMLElement | null;
}

function formatUpdated(ts: number, lang: UiLang) {
  return new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

function IconBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`icon-btn ${danger ? "danger" : ""}`} onClick={onClick} title={label} aria-label={label}>
      {children}
    </button>
  );
}

export function ResumeDocCard({
  resume,
  uiLang,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  resume: Resume;
  uiLang: UiLang;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = UI[uiLang];
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState("");

  async function pdf() {
    const el = capturePage(hiddenRef.current);
    if (!el) return;
    setBusy("pdf");
    try {
      await exportPreviewPdf(el, resume.title);
    } finally {
      setBusy("");
    }
  }

  return (
    <article className="card doc-card">
      <button type="button" className="doc-thumb" onClick={onEdit} aria-label={t.preview}>
        <div className="doc-thumb-frame">
          <div className="doc-thumb-scale">
            <ResumePreview resume={resume} />
          </div>
        </div>
      </button>
      <div className="pdf-capture" ref={hiddenRef} aria-hidden>
        <ResumePreview resume={resume} />
      </div>
      <div className="doc-card-body">
        <h3>{resume.title}</h3>
        <p className="doc-updated">
          {t.updated} {formatUpdated(resume.updatedAt, uiLang)}
        </p>
        <button className="doc-download" onClick={pdf} disabled={!!busy}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path
              fill="currentColor"
              d="M11 3h2v10.2l3.3-3.2 1.4 1.4L12 16.1 7.3 11.4l1.4-1.4L11 13.2V3zM5 18h14v2H5z"
            />
          </svg>
          {t.pdf}
        </button>
      </div>
      <div className="doc-card-tools">
        <IconBtn label={t.duplicate} onClick={onDuplicate}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="8" y="8" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <rect x="4" y="4" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </IconBtn>
        <IconBtn label={t.preview} onClick={onEdit}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              d="M6 5.5h12v13H6zM9 9h6M9 12h6M9 15h4"
            />
          </svg>
        </IconBtn>
        <IconBtn label={t.delete} danger onClick={onDelete}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              d="M7 7h10l-.8 12H7.8L7 7zm2-2h6l.5 2H8.5L9 5zM10 10v6M14 10v6"
            />
          </svg>
        </IconBtn>
      </div>
    </article>
  );
}

export function CoverDocCard({
  letter,
  from,
  uiLang,
  onEdit,
  onDelete,
}: {
  letter: CoverLetter;
  from?: Resume;
  uiLang: UiLang;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = UI[uiLang];
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState("");
  const heading = from ? `${from.contact.firstName} ${from.contact.lastName}` : letter.title;

  return (
    <article className="card doc-card">
      <button type="button" className="doc-thumb" onClick={onEdit} aria-label={t.preview}>
        <div className="doc-thumb-frame">
          <div className="doc-thumb-scale">
            <CoverPreview letter={letter} from={from} />
          </div>
        </div>
      </button>
      <div className="pdf-capture" ref={hiddenRef} aria-hidden>
        <CoverPreview letter={letter} from={from} />
      </div>
      <div className="doc-card-body">
        <h3>{letter.title}</h3>
        <p className="doc-updated">
          {t.updated} {formatUpdated(letter.updatedAt, uiLang)}
        </p>
        <button
          className="doc-download"
          disabled={!!busy}
          onClick={async () => {
            const el = capturePage(hiddenRef.current);
            if (!el) return;
            setBusy("pdf");
            try {
              await exportPreviewPdf(el, letter.title);
            } finally {
              setBusy("");
            }
          }}
        >
          {t.pdf}
        </button>
      </div>
      <div className="doc-card-tools">
        <IconBtn label={t.preview} onClick={onEdit}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" stroke="currentColor" strokeWidth="1.7" d="M6 5.5h12v13H6zM9 9h6M9 12h6M9 15h4" />
          </svg>
        </IconBtn>
        <IconBtn
          label={t.word}
          onClick={async () => {
            setBusy("word");
            try {
              await exportLetterDocx(letter.title, heading, [letter.company, letter.jobTitle, letter.date], letter.body);
            } finally {
              setBusy("");
            }
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" stroke="currentColor" strokeWidth="1.7" d="M7 4h8l4 4v12H7zM15 4v4h4" />
          </svg>
        </IconBtn>
        <IconBtn label={t.delete} danger onClick={onDelete}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" stroke="currentColor" strokeWidth="1.7" d="M7 7h10l-.8 12H7.8L7 7zm2-2h6l.5 2H8.5L9 5z" />
          </svg>
        </IconBtn>
      </div>
    </article>
  );
}

export function ResignationDocCard({
  letter,
  uiLang,
  onEdit,
  onDelete,
}: {
  letter: ResignationLetter;
  uiLang: UiLang;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = UI[uiLang];
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState("");

  return (
    <article className="card doc-card">
      <button type="button" className="doc-thumb" onClick={onEdit} aria-label={t.preview}>
        <div className="doc-thumb-frame">
          <div className="doc-thumb-scale">
            <ResignationPreview letter={letter} />
          </div>
        </div>
      </button>
      <div className="pdf-capture" ref={hiddenRef} aria-hidden>
        <ResignationPreview letter={letter} />
      </div>
      <div className="doc-card-body">
        <h3>{letter.title}</h3>
        <p className="doc-updated">
          {t.updated} {formatUpdated(letter.updatedAt, uiLang)}
        </p>
        <button
          className="doc-download"
          disabled={!!busy}
          onClick={async () => {
            const el = capturePage(hiddenRef.current);
            if (!el) return;
            setBusy("pdf");
            try {
              await exportPreviewPdf(el, letter.title);
            } finally {
              setBusy("");
            }
          }}
        >
          {t.pdf}
        </button>
      </div>
      <div className="doc-card-tools">
        <IconBtn label={t.preview} onClick={onEdit}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" stroke="currentColor" strokeWidth="1.7" d="M6 5.5h12v13H6z" />
          </svg>
        </IconBtn>
        <IconBtn label={t.delete} danger onClick={onDelete}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="none" stroke="currentColor" strokeWidth="1.7" d="M7 7h10l-.8 12H7.8L7 7z" />
          </svg>
        </IconBtn>
      </div>
    </article>
  );
}
