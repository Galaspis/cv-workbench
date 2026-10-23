import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { resumePlainText } from "./ai";
import type { CoverLetter, ResignationLetter, Resume } from "../types";

const PAGE_PX_W = 794;
const PAGE_PX_H = 1123;

function fileBase(name: string) {
  return name.replace(/[^\p{L}\p{N}\s_-]+/gu, "").trim() || "document";
}

function plain(text: string) {
  return text.replace(/\*\*/g, "");
}

function findPage(element: HTMLElement) {
  return (element.classList.contains("cv-page") ? element : element.querySelector(".cv-page")) as HTMLElement | null;
}

async function nextFrame() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export async function exportPreviewPdf(element: HTMLElement, filename: string) {
  const source = findPage(element) ?? element;
  await document.fonts.ready;

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:0;top:0;width:794px;background:#fff;z-index:-2147483647;pointer-events:none;opacity:1;";
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${PAGE_PX_W}px`;
  clone.style.minHeight = "0";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.boxShadow = "none";
  clone.style.zoom = "1";
  clone.style.transform = "none";
  const inner = clone.querySelector(".cv-fit-inner") as HTMLElement | null;
  if (inner) {
    inner.style.zoom = "1";
    inner.style.transform = "none";
    inner.style.width = "100%";
  }
  host.appendChild(clone);
  document.body.appendChild(host);
  await nextFrame();
  await nextFrame();

  const naturalH = Math.max(clone.scrollHeight, clone.offsetHeight);
  const fits = naturalH <= PAGE_PX_H + 2;
  if (fits) {
    clone.style.height = `${PAGE_PX_H}px`;
    clone.style.overflow = "hidden";
  }

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: PAGE_PX_W,
      height: fits ? PAGE_PX_H : naturalH,
      windowWidth: PAGE_PX_W,
      windowHeight: fits ? PAGE_PX_H : naturalH,
      scrollX: 0,
      scrollY: 0,
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const maxW = pageW;
    const maxH = pageH - 0.15;
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", (pageW - w) / 2, 0, w, h, undefined, "FAST");
    while (pdf.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.getNumberOfPages());
    }
    pdf.save(`${fileBase(filename)}.pdf`);
  } finally {
    host.remove();
  }
}

export function exportTxt(resume: Resume) {
  const blob = new Blob([resumePlainText(resume)], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${fileBase(resume.title)}.txt`);
}

function p(text: string, opts?: { bold?: boolean; size?: number; color?: string }) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 22,
        font: "Calibri",
        color: opts?.color,
      }),
    ],
  });
}

export async function exportResumeDocx(resume: Resume) {
  const name = `${resume.contact.firstName} ${resume.contact.lastName}`.trim() || resume.title;
  const children: Paragraph[] = [
    p(name, { bold: true, size: 36 }),
    p(resume.contact.jobTitle, { size: 24, color: "334155" }),
    p(
      [resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.linkedin]
        .filter(Boolean)
        .join("  ·  "),
      { size: 20 },
    ),
  ];
  if (resume.summary) {
    children.push(p(resume.titles.summary || "Profile", { bold: true, size: 26 }));
    children.push(p(resume.summary));
  }
  if (resume.experience.length) {
    children.push(p(resume.titles.experience || "Experience", { bold: true, size: 26 }));
    for (const job of resume.experience) {
      children.push(
        p(
          `${job.role} — ${job.company}  (${job.start}–${job.current ? "Present" : job.end})`,
          { bold: true },
        ),
      );
      job.bullets.filter(Boolean).forEach((b) => children.push(p(`• ${plain(b)}`)));
    }
  }
  if (resume.education.length) {
    children.push(p(resume.titles.education || "Education", { bold: true, size: 26 }));
    for (const ed of resume.education) {
      children.push(p(`${ed.degree} — ${ed.school}  (${ed.start}–${ed.end})`, { bold: true }));
      if (ed.details) children.push(p(ed.details));
    }
  }
  if (resume.skills.some((s) => s.items || s.name)) {
    children.push(p(resume.titles.skills || "Skills", { bold: true, size: 26 }));
    resume.skills.forEach((g) => children.push(p(g.items ? `${g.name}: ${g.items}` : g.name)));
  }
  resume.projects.forEach((proj, i) => {
    if (i === 0) children.push(p(resume.titles.projects || "Projects", { bold: true, size: 26 }));
    children.push(p(proj.name, { bold: true }));
    if (proj.description) children.push(p(proj.description));
    proj.bullets.filter(Boolean).forEach((b) => children.push(p(`• ${b}`)));
  });
  if (resume.languages.some((l) => l.name)) {
    children.push(p(resume.titles.languages || "Languages", { bold: true, size: 26 }));
    children.push(p(resume.languages.map((l) => `${l.name} (${l.level})`).join("  ·  ")));
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileBase(name)}.docx`);
}

export async function exportLetterDocx(
  title: string,
  heading: string,
  meta: string[],
  body: string,
) {
  const children = [
    p(heading, { bold: true, size: 32 }),
    ...meta.filter(Boolean).map((m) => p(m, { size: 20 })),
    p(""),
    ...body.split(/\n{2,}/).map((para) => p(para.replace(/\n/g, " "))),
  ];
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileBase(title)}.docx`);
}

export function letterFileTitle(doc: CoverLetter | ResignationLetter) {
  return doc.title;
}
