import { OriginalPreview } from "./OriginalPreview";
import { OnePage } from "./OnePage";
import type { CSSProperties } from "react";
import type { CoverLetter, ResignationLetter, Resume } from "../types";

function visible(resume: Resume, key: string) {
  return !resume.hidden.includes(key);
}

function titleOf(resume: Resume, key: string) {
  return resume.titles[key] || key;
}

function contactLine(resume: Resume) {
  const c = resume.contact;
  return [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean);
}

function Section({
  resume,
  id,
}: {
  resume: Resume;
  id: string;
}) {
  if (!visible(resume, id)) return null;
  if (id === "summary" && resume.summary) {
    return (
      <section className="cv-sec">
        <h2>{titleOf(resume, "summary")}</h2>
        <p className="cv-prose">{resume.summary}</p>
      </section>
    );
  }
  if (id === "experience" && resume.experience.some((j) => j.role || j.company)) {
    return (
      <section className="cv-sec">
        <h2>{titleOf(resume, "experience")}</h2>
        {resume.experience.map((job) => (
          <div className="cv-item" key={job.id}>
            <div className="cv-item-head">
              <strong>{job.role}</strong>
              <span>
                {job.start}
                {job.start || job.end || job.current ? " – " : ""}
                {job.current ? "Present" : job.end}
              </span>
            </div>
            <div className="cv-item-sub">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </div>
            <ul>
              {job.bullets.filter(Boolean).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    );
  }
  if (id === "education" && resume.education.some((e) => e.school || e.degree)) {
    return (
      <section className="cv-sec">
        <h2>{titleOf(resume, "education")}</h2>
        {resume.education.map((ed) => (
          <div className="cv-item" key={ed.id}>
            <div className="cv-item-head">
              <strong>{ed.degree}</strong>
              <span>
                {ed.start}
                {ed.start || ed.end ? " – " : ""}
                {ed.end}
              </span>
            </div>
            <div className="cv-item-sub">
              {ed.school}
              {ed.location ? ` · ${ed.location}` : ""}
            </div>
            {ed.details ? <p className="cv-prose">{ed.details}</p> : null}
          </div>
        ))}
      </section>
    );
  }
  if (id === "skills" && resume.skills.some((s) => s.items || s.name)) {
    return (
      <section className="cv-sec">
        <h2>{titleOf(resume, "skills")}</h2>
        {resume.skills.map((g) => (
          <p className="cv-skill" key={g.id}>
            {g.items ? (
              <>
                {g.name ? <strong>{g.name}: </strong> : null}
                {g.items}
              </>
            ) : (
              g.name
            )}
          </p>
        ))}
      </section>
    );
  }
  if (id === "projects" && resume.projects.some((p) => p.name)) {
    return (
      <section className="cv-sec">
        <h2>{titleOf(resume, "projects")}</h2>
        {resume.projects.map((p) => (
          <div className="cv-item" key={p.id}>
            <div className="cv-item-head">
              <strong>{p.name}</strong>
              {p.link ? <span>{p.link}</span> : null}
            </div>
            {p.description ? <p className="cv-prose">{p.description}</p> : null}
            <ul>
              {p.bullets.filter(Boolean).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    );
  }
  if (id === "certifications" && resume.certifications.some((c) => c.name)) {
    return (
      <section className="cv-sec">
        <h2>{titleOf(resume, "certifications")}</h2>
        {resume.certifications.map((c) => (
          <div className="cv-item" key={c.id}>
            <div className="cv-item-head">
              <strong>{c.name}</strong>
              <span>{c.year}</span>
            </div>
            <div className="cv-item-sub">{c.issuer}</div>
          </div>
        ))}
      </section>
    );
  }
  if (id === "languages" && resume.languages.some((l) => l.name)) {
    return (
      <section className="cv-sec">
        <h2>{titleOf(resume, "languages")}</h2>
        <p className="cv-skill">
          {resume.languages
            .filter((l) => l.name)
            .map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`)
            .join("  ·  ")}
        </p>
      </section>
    );
  }
  if (id === "custom" && resume.custom.some((c) => c.title || c.body)) {
    return (
      <>
        {resume.custom.map((c) => (
          <section className="cv-sec" key={c.id}>
            <h2>{c.title || titleOf(resume, "custom")}</h2>
            <p className="cv-prose">{c.body}</p>
          </section>
        ))}
      </>
    );
  }
  return null;
}

const SIDEBAR_KEYS = new Set(["skills", "languages", "certifications"]);

export function ResumePreview({ resume }: { resume: Resume }) {
  if (resume.template === "original") return <OriginalPreview resume={resume} />;
  const c = resume.contact;
  const name = `${c.firstName} ${c.lastName}`.trim() || "Your name";
  const twoCol = resume.template === "sidebar";
  const mainIds = twoCol
    ? resume.sectionOrder.filter((id) => !SIDEBAR_KEYS.has(id))
    : resume.sectionOrder;
  const sideIds = twoCol ? resume.sectionOrder.filter((id) => SIDEBAR_KEYS.has(id)) : [];

  return (
    <OnePage
      className={`tpl-${resume.template} side-${resume.sidebar}`}
      style={
        {
          "--accent": resume.accent,
          "--title-font": resume.titleFont,
          "--body-font": resume.bodyFont,
        } as CSSProperties
      }
    >
      <header className="cv-head">
        {resume.photo ? <img className="cv-photo" src={resume.photo} alt="" /> : null}
        <div>
          <h1>{name}</h1>
          {c.jobTitle ? <p className="cv-role">{c.jobTitle}</p> : null}
          <p className="cv-meta">{contactLine(resume).join("  ·  ")}</p>
        </div>
      </header>
      {twoCol ? (
        <div className="cv-cols">
          <aside>
            {sideIds.map((id) => (
              <Section key={id} resume={resume} id={id} />
            ))}
          </aside>
          <div className="cv-main">
            {mainIds.map((id) => (
              <Section key={id} resume={resume} id={id} />
            ))}
          </div>
        </div>
      ) : (
        resume.sectionOrder.map((id) => <Section key={id} resume={resume} id={id} />)
      )}
    </OnePage>
  );
}

export function CoverPreview({
  letter,
  from,
}: {
  letter: CoverLetter;
  from?: Resume;
}) {
  const name = from
    ? `${from.contact.firstName} ${from.contact.lastName}`.trim()
    : "";
  return (
    <OnePage
      className={`tpl-${letter.template} letter`}
      style={
        {
          "--accent": letter.accent,
          "--title-font": letter.titleFont,
          "--body-font": letter.bodyFont,
        } as CSSProperties
      }
    >
      <header className="cv-head">
        <div>
          <h1>{name || "Your name"}</h1>
          {from?.contact.jobTitle ? <p className="cv-role">{from.contact.jobTitle}</p> : null}
          <p className="cv-meta">
            {[from?.contact.email, from?.contact.phone, from?.contact.location]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </div>
      </header>
      <p className="cv-date">{letter.date}</p>
      <p className="cv-prose">
        {letter.hiringManager ? `Dear ${letter.hiringManager},` : `Dear ${letter.company || "Hiring Manager"},`}
      </p>
      {letter.body.split(/\n{2,}/).map((para, i) => (
        <p className="cv-prose" key={i}>
          {para}
        </p>
      ))}
      <p className="cv-prose">Sincerely,</p>
      <p className="cv-prose">{name}</p>
    </OnePage>
  );
}

export function ResignationPreview({ letter }: { letter: ResignationLetter }) {
  return (
    <OnePage
      className="tpl-classic letter"
      style={
        {
          "--accent": letter.accent,
          "--title-font": letter.titleFont,
          "--body-font": letter.bodyFont,
        } as CSSProperties
      }
    >
      <header className="cv-head">
        <div>
          <h1>Resignation</h1>
          <p className="cv-role">
            {letter.position}
            {letter.company ? ` · ${letter.company}` : ""}
          </p>
        </div>
      </header>
      {letter.lastDay ? <p className="cv-date">Last day: {letter.lastDay}</p> : null}
      <p className="cv-prose">{letter.managerName ? `Dear ${letter.managerName},` : "Dear Manager,"}</p>
      {letter.body.split(/\n{2,}/).map((para, i) => (
        <p className="cv-prose" key={i}>
          {para}
        </p>
      ))}
      <p className="cv-prose">Sincerely,</p>
    </OnePage>
  );
}
