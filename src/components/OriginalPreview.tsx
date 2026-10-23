import type { CSSProperties, ReactNode } from "react";
import type { Resume } from "../types";
import { OnePage } from "./OnePage";

function titleOf(resume: Resume, key: string) {
  return resume.titles[key] || key;
}

function spaced(text: string, locale: string) {
  if (locale === "he") return text;
  return text.toUpperCase();
}

function headerTitle(text: string, locale: string) {
  if (locale === "he") return text;
  return text.toUpperCase();
}

export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function PhoneIcon() {
  return (
    <svg className="cv-ico" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path
        fill="#fff"
        d="M8.1 6.4c.35-.35.9-.4 1.3-.15l1.55.85c.4.22.52.7.3 1.08l-.55.95a.7.7 0 0 0 .08.8 8.4 8.4 0 0 0 2.35 2.35.7.7 0 0 0 .8.08l.95-.55c.38-.22.86-.1 1.08.3l.85 1.55c.25.4.2.95-.15 1.3l-.55.55c-.5.5-1.2.7-1.9.5-1.9-.55-3.7-1.9-5.15-3.35S6.6 9.1 6.05 7.2c-.2-.7 0-1.4.5-1.9z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="cv-ico" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <rect x="6.2" y="8.2" width="11.6" height="8" rx="1.1" fill="none" stroke="#fff" strokeWidth="1.35" />
      <path d="M6.5 8.6 12 13.1 17.5 8.6" fill="none" stroke="#fff" strokeWidth="1.35" />
    </svg>
  );
}

function Timeline({ children }: { children: ReactNode }) {
  return <div className="cv-timeline">{children}</div>;
}

function SectionHead({ children }: { children: string }) {
  return <h2 className="cv-orig-h">{children}</h2>;
}

function SkillList({ resume }: { resume: Resume }) {
  const rows = resume.skills.filter((s) => s.name || s.items);
  if (!rows.length) return null;
  return (
    <section className="cv-sec">
      <SectionHead>{headerTitle(titleOf(resume, "skills"), resume.locale)}</SectionHead>
      <ul className="cv-circle">
        {rows.map((s) => (
          <li key={s.id}>{s.items ? `${s.name ? `${s.name}: ` : ""}${s.items}` : s.name}</li>
        ))}
      </ul>
    </section>
  );
}

function Links({ resume }: { resume: Resume }) {
  const c = resume.contact;
  const items = [
    c.linkedin ? ["Linkedin", c.linkedin] : null,
    c.github ? ["GitHub", c.github] : null,
    c.website ? ["Web", c.website] : null,
  ].filter(Boolean) as [string, string][];
  if (!items.length) return null;
  return (
    <section className="cv-sec">
      <SectionHead>{headerTitle(titleOf(resume, "links"), resume.locale)}</SectionHead>
      {items.map(([label, href]) => (
        <p className="cv-link" key={href}>
          {label}:
          <br />
          <a href={href.startsWith("http") ? href : `https://${href}`}>{href}</a>
        </p>
      ))}
    </section>
  );
}

function Languages({ resume }: { resume: Resume }) {
  const rows = resume.languages.filter((l) => l.name);
  if (!rows.length) return null;
  return (
    <section className="cv-sec">
      <SectionHead>{headerTitle(titleOf(resume, "languages"), resume.locale)}</SectionHead>
      <ul className="cv-circle">
        {rows.map((l) => (
          <li key={l.id}>
            {l.name}
            {l.level ? ` - ${l.level}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Summary({ resume }: { resume: Resume }) {
  if (!resume.summary) return null;
  return (
    <section className="cv-sec">
      <SectionHead>{headerTitle(titleOf(resume, "summary"), resume.locale)}</SectionHead>
      <p className="cv-prose cv-about">{resume.summary}</p>
    </section>
  );
}

function dateRange(start: string, end: string, current: boolean, locale: string) {
  const present = locale === "he" ? "הווה" : "PRESENT";
  return [start, current ? end || present : end].filter(Boolean).join(" - ");
}

function Experience({ resume }: { resume: Resume }) {
  const jobs = resume.experience.filter((j) => j.role || j.company);
  if (!jobs.length) return null;
  return (
    <section className="cv-sec">
      <SectionHead>{headerTitle(titleOf(resume, "experience"), resume.locale)}</SectionHead>
      <Timeline>
        {jobs.map((job) => (
          <div className="cv-job" key={job.id}>
            <p className="cv-job-role">
              {spaced(job.role, resume.locale)}
              {job.start || job.end || job.current ? " | " : ""}
              {spaced(dateRange(job.start, job.end, job.current, resume.locale), resume.locale)}
            </p>
            <p className="cv-job-co">{spaced(job.company, resume.locale)}</p>
            <ul className="cv-dashes">
              {job.bullets.filter(Boolean).map((b, i) => (
                <li key={i}>
                  <RichText text={b} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Timeline>
    </section>
  );
}

function Education({ resume }: { resume: Resume }) {
  const rows = resume.education.filter((e) => e.school || e.degree);
  if (!rows.length) return null;
  return (
    <section className="cv-sec">
      <SectionHead>{headerTitle(titleOf(resume, "education"), resume.locale)}</SectionHead>
      <Timeline>
        {rows.map((ed) => {
          const year = ed.end && ed.start && ed.end !== ed.start ? `${ed.start} - ${ed.end}` : ed.end || ed.start;
          return (
            <div className="cv-job" key={ed.id}>
              <p className="cv-job-role">
                {spaced(ed.degree, resume.locale)}
                {year ? ` | ${year}` : ""}
              </p>
              <p className="cv-job-co">{spaced(ed.school, resume.locale)}</p>
              {ed.details ? <p className="cv-prose cv-ed-note">{ed.details}</p> : null}
            </div>
          );
        })}
      </Timeline>
    </section>
  );
}

const BLOCKS: Record<string, (r: Resume) => ReactNode> = {
  summary: (r) => <Summary resume={r} />,
  skills: (r) => <SkillList resume={r} />,
  links: (r) => <Links resume={r} />,
  languages: (r) => <Languages resume={r} />,
  experience: (r) => <Experience resume={r} />,
  education: (r) => <Education resume={r} />,
};

export function OriginalPreview({ resume }: { resume: Resume }) {
  const c = resume.contact;
  const rtl = resume.locale === "he";
  const side = new Set(resume.sidebarKeys?.length ? resume.sidebarKeys : ["summary", "skills", "links", "languages"]);
  const mainIds = resume.sectionOrder.filter((id) => !side.has(id) && BLOCKS[id]);
  const sideIds = resume.sectionOrder.filter((id) => side.has(id) && BLOCKS[id]);

  return (
    <OnePage
      className="tpl-original"
      dir={rtl ? "rtl" : "ltr"}
      lang={rtl ? "he" : "en"}
      style={
        {
          "--accent": "#111",
          "--title-font": resume.titleFont,
          "--body-font": resume.bodyFont,
        } as CSSProperties
      }
    >
      <header className="cv-orig-head">
        <div className="cv-orig-name">
          <h1>
            {c.firstName}
            {c.lastName ? (
              <>
                <br />
                {c.lastName}
              </>
            ) : null}
          </h1>
          {c.jobTitle ? <p className="cv-orig-title">{c.jobTitle}</p> : null}
        </div>
        <div className="cv-orig-contact">
          {c.phone ? (
            <>
              <PhoneIcon />
              <span>{c.phone}</span>
            </>
          ) : null}
          {c.email ? (
            <>
              <MailIcon />
              <span>{c.email}</span>
            </>
          ) : null}
        </div>
      </header>
      <div className="cv-orig-cols">
        <aside>{sideIds.map((id) => <div key={id}>{BLOCKS[id](resume)}</div>)}</aside>
        <div className="cv-main">{mainIds.map((id) => <div key={id}>{BLOCKS[id](resume)}</div>)}</div>
      </div>
    </OnePage>
  );
}
