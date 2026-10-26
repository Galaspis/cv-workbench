export type TemplateId = "original" | "classic" | "sidebar" | "editorial" | "compact" | "aurora";
export type SidebarSide = "left" | "right";
export type DocumentKind = "resume" | "cover" | "resignation";

export type Contact = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
};

export type Experience = {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  details: string;
};

export type SkillGroup = {
  id: string;
  name: string;
  items: string;
};

export type Language = {
  id: string;
  name: string;
  level: string;
};

export type Project = {
  id: string;
  name: string;
  link: string;
  description: string;
  bullets: string[];
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  year: string;
};

export type CustomSection = {
  id: string;
  title: string;
  body: string;
};

export type Resume = {
  id: string;
  kind: "resume";
  title: string;
  updatedAt: number;
  template: TemplateId;
  accent: string;
  titleFont: string;
  bodyFont: string;
  photo: string;
  sidebar: SidebarSide;
  locale: string;
  sidebarKeys: string[];
  contact: Contact;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  languages: Language[];
  projects: Project[];
  certifications: Certification[];
  custom: CustomSection[];
  sectionOrder: string[];
  hidden: string[];
  titles: Record<string, string>;
};

export type CoverLetter = {
  id: string;
  kind: "cover";
  title: string;
  updatedAt: number;
  resumeId: string;
  template: TemplateId;
  accent: string;
  titleFont: string;
  bodyFont: string;
  hiringManager: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  date: string;
  body: string;
};

export type ResignationLetter = {
  id: string;
  kind: "resignation";
  title: string;
  updatedAt: number;
  managerName: string;
  company: string;
  position: string;
  lastDay: string;
  notice: string;
  reason: string;
  body: string;
  accent: string;
  titleFont: string;
  bodyFont: string;
};

export type Settings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  uiLang: "en" | "he";
};

export type AppView =
  | { page: "home" }
  | { page: "resume"; id: string; intent?: "import" }
  | { page: "cover"; id: string }
  | { page: "resignation"; id: string }
  | { page: "settings" };

export const DEFAULT_SECTION_ORDER = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "custom",
];

export const DEFAULT_TITLES: Record<string, string> = {
  summary: "About me",
  experience: "Work experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
  links: "Links",
  custom: "Additional",
};

export const DEFAULT_SIDEBAR_KEYS = ["summary", "skills", "links", "languages"];

export const ACCENTS = [
  "#0f766e",
  "#1d4ed8",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#334155",
  "#0f172a",
  "#047857",
];

export const TITLE_FONTS = [
  { id: "Open Sans", label: "Open Sans" },
  { id: "Calibri", label: "Calibri" },
  { id: "Figtree", label: "Figtree" },
  { id: "Assistant", label: "Assistant" },
  { id: "Fraunces", label: "Fraunces" },
  { id: "IBM Plex Serif", label: "IBM Plex Serif" },
  { id: "Libre Baskerville", label: "Libre Baskerville" },
  { id: "Source Serif 4", label: "Source Serif 4" },
];

export const BODY_FONTS = [
  { id: "Open Sans", label: "Open Sans" },
  { id: "Calibri", label: "Calibri" },
  { id: "Figtree", label: "Figtree" },
  { id: "Assistant", label: "Assistant" },
  { id: "IBM Plex Sans", label: "IBM Plex Sans" },
  { id: "Georgia", label: "Georgia" },
];

export const TEMPLATES: { id: TemplateId; label: string; note: string }[] = [
  { id: "original", label: "Perth", note: "Two-column timeline, one page" },
  { id: "classic", label: "Classic", note: "Single column, ATS-safe" },
  { id: "sidebar", label: "Sidebar", note: "Two columns, photo-ready" },
  { id: "editorial", label: "Editorial", note: "Serif header, clean rules" },
  { id: "compact", label: "Compact", note: "Dense one-pager" },
  { id: "aurora", label: "Aurora", note: "Bold name, color band" },
];
