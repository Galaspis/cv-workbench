import type {
  Contact,
  CoverLetter,
  Education,
  Experience,
  ResignationLetter,
  Resume,
  Settings,
} from "./types";
import { DEFAULT_SECTION_ORDER, DEFAULT_SIDEBAR_KEYS, DEFAULT_TITLES } from "./types";

export function uid() {
  return crypto.randomUUID();
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyContact(): Contact {
  return {
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
  };
}

export function emptyExperience(): Experience {
  return {
    id: uid(),
    company: "",
    role: "",
    location: "",
    start: "",
    end: "",
    current: false,
    bullets: [""],
  };
}

export function emptyEducation(): Education {
  return {
    id: uid(),
    school: "",
    degree: "",
    location: "",
    start: "",
    end: "",
    details: "",
  };
}

export function createResume(partial?: Partial<Resume>): Resume {
  return {
    id: uid(),
    kind: "resume",
    title: "Untitled resume",
    updatedAt: Date.now(),
    template: "original",
    accent: "#111111",
    titleFont: "Open Sans",
    bodyFont: "Open Sans",
    photo: "",
    sidebar: "left",
    locale: "en",
    sidebarKeys: [...DEFAULT_SIDEBAR_KEYS],
    contact: emptyContact(),
    summary: "",
    experience: [emptyExperience()],
    education: [emptyEducation()],
    skills: [{ id: uid(), name: "Core", items: "" }],
    languages: [{ id: uid(), name: "", level: "" }],
    projects: [],
    certifications: [],
    custom: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hidden: [],
    titles: { ...DEFAULT_TITLES },
    ...partial,
  };
}

export function createCoverLetter(resumeId = ""): CoverLetter {
  return {
    id: uid(),
    kind: "cover",
    title: "Cover letter",
    updatedAt: Date.now(),
    resumeId,
    template: "classic",
    accent: "#0f766e",
    titleFont: "Fraunces",
    bodyFont: "Figtree",
    hiringManager: "",
    company: "",
    jobTitle: "",
    jobDescription: "",
    date: todayIso(),
    body: "",
  };
}

export function createResignation(): ResignationLetter {
  return {
    id: uid(),
    kind: "resignation",
    title: "Resignation letter",
    updatedAt: Date.now(),
    managerName: "",
    company: "",
    position: "",
    lastDay: "",
    notice: "two weeks",
    reason: "",
    body: "",
    accent: "#0f766e",
    titleFont: "Fraunces",
    bodyFont: "Figtree",
  };
}

export function demoResume(): Resume {
  return createResume({
    title: "Sample — Maya Ellison",
    template: "sidebar",
    accent: "#1d4ed8",
    contact: {
      firstName: "Maya",
      lastName: "Ellison",
      jobTitle: "Product Designer",
      email: "maya.ellison@example.com",
      phone: "+1 415 555 0148",
      location: "Lisbon, PT",
      website: "example.com",
      linkedin: "linkedin.com/in/example",
      github: "",
    },
    summary:
      "Product designer with 8 years shipping B2B and consumer products. I turn messy research into clear interfaces, and I partner closely with engineering to land work that is both usable and buildable.",
    experience: [
      {
        id: uid(),
        company: "Northwind Labs",
        role: "Senior Product Designer",
        location: "Remote",
        start: "2022",
        end: "",
        current: true,
        bullets: [
          "Led the redesign of the core workspace used by 40k weekly users, lifting task completion by 22%.",
          "Built a shared design system with engineering, cutting UI implementation time by ~30%.",
          "Ran quarterly research sprints with sales and CS to prioritize the roadmap around real churn drivers.",
        ],
      },
      {
        id: uid(),
        company: "Harbor",
        role: "Product Designer",
        location: "London",
        start: "2018",
        end: "2022",
        current: false,
        bullets: [
          "Shipped onboarding that reduced time-to-first-value from 9 days to 2.",
          "Partnered with data to instrument funnels and kill three low-impact features.",
        ],
      },
    ],
    education: [
      {
        id: uid(),
        school: "Royal College of Art",
        degree: "MA Design Products",
        location: "London",
        start: "2015",
        end: "2017",
        details: "",
      },
    ],
    skills: [
      { id: uid(), name: "Design", items: "Figma, Prototyping, Design systems, User research" },
      { id: uid(), name: "Delivery", items: "Agile, Stakeholder workshops, Accessibility (WCAG)" },
    ],
    languages: [
      { id: uid(), name: "English", level: "Native" },
      { id: uid(), name: "Portuguese", level: "Conversational" },
    ],
    projects: [
      {
        id: uid(),
        name: "Atlas hiring kit",
        link: "",
        description: "Open-source kit for structured design interviews.",
        bullets: ["Used by 12 hiring teams in the first quarter after launch."],
      },
    ],
    certifications: [
      { id: uid(), name: "NN/g UX Certification", issuer: "Nielsen Norman Group", year: "2021" },
    ],
  });
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  uiLang: "en",
};
