import { EN_TITLES, HE_TITLES } from "../i18n";
import type { Resume, SkillGroup } from "../types";

// Demo resumes shipped with the app. Invented people, invented employers and careers,
// placeholder contact details. Replace or delete them from the UI.

function skills(items: string[]): SkillGroup[] {
  return items.map((name, i) => ({ id: `sk-${i}-${name.slice(0, 12)}`, name, items: "" }));
}

const originalBase = {
  kind: "resume" as const,
  template: "original" as const,
  accent: "#111111",
  titleFont: "Assistant",
  bodyFont: "Assistant",
  photo: "",
  hidden: ["projects", "certifications", "custom"],
  projects: [],
  certifications: [],
  custom: [],
};

export const SEED_RESUMES: Resume[] = [
  {
    ...originalBase,
    id: "demo-en-v2",
    title: "Demo — English",
    updatedAt: Date.now(),
    sidebar: "left",
    locale: "en",
    titleFont: "Open Sans",
    bodyFont: "Open Sans",
    sidebarKeys: ["summary", "skills", "links", "languages"],
    sectionOrder: ["summary", "skills", "links", "languages", "experience", "education"],
    titles: { ...EN_TITLES },
    contact: {
      firstName: "SAM",
      lastName: "RIVERA",
      jobTitle: "",
      email: "sam.rivera@example.com",
      phone: "050-0000000",
      location: "",
      website: "",
      linkedin: "https://www.linkedin.com/in/example",
      github: "",
    },
    summary:
      "Supply chain analyst who turns warehouse and shipping data into fewer stock-outs and lower freight costs. Comfortable on the warehouse floor and in a spreadsheet.",
    skills: skills([
      "Demand Forecasting",
      "Inventory Planning",
      "SAP S/4HANA",
      "Excel, Power BI",
      "Route Optimization",
      "Lean Six Sigma (Green Belt)",
    ]),
    languages: [
      { id: "demo-en-l1", name: "English", level: "Native" },
      { id: "demo-en-l2", name: "Spanish", level: "Fluent" },
    ],
    experience: [
      {
        id: "demo-en-exp-1",
        company: "RIVERBEND FREIGHT",
        role: "SENIOR SUPPLY CHAIN ANALYST",
        location: "",
        start: "JUN 2022",
        end: "PRESENT",
        current: true,
        bullets: [
          "Rebuilt the weekly **demand forecast** for 1,200 products, cutting stock-outs by a third.",
          "Planned new delivery routes for 40 trucks, saving 9% on fuel in the first year.",
          "Built a Power BI dashboard that warehouse managers use in every morning meeting.",
        ],
      },
      {
        id: "demo-en-exp-2",
        company: "LAKESIDE DISTRIBUTION",
        role: "INVENTORY PLANNER",
        location: "",
        start: "SEP 2019",
        end: "MAY 2022",
        current: false,
        bullets: [
          "Owned reorder points for two regional warehouses.",
          "Ran quarterly cycle counts and brought inventory accuracy to 99.2%.",
          "Worked with suppliers to shorten average lead time from 21 to 14 days.",
        ],
      },
      {
        id: "demo-en-exp-3",
        company: "HARBORLINE SHIPPING",
        role: "LOGISTICS COORDINATOR",
        location: "",
        start: "JUL 2017",
        end: "AUG 2019",
        current: false,
        bullets: [
          "Booked and tracked container shipments across three ports.",
          "Prepared customs paperwork and solved delays with brokers.",
        ],
      },
    ],
    education: [
      {
        id: "demo-en-ed-1",
        school: "EXAMPLE STATE UNIVERSITY",
        degree: "B.SC, INDUSTRIAL ENGINEERING",
        location: "",
        start: "2017",
        end: "2017",
        details: "",
      },
    ],
  },
  {
    ...originalBase,
    id: "demo-he-v2",
    title: "דוגמה — עברית",
    updatedAt: Date.now(),
    sidebar: "right",
    locale: "he",
    sidebarKeys: ["skills", "links", "languages"],
    sectionOrder: ["summary", "experience", "education", "skills", "links", "languages"],
    titles: {
      ...HE_TITLES,
      summary: "אודותיי",
      experience: "ניסיון תעסוקתי",
      links: "קישורים",
    },
    contact: {
      firstName: "תמר",
      lastName: "אורן",
      jobTitle: "אחות מוסמכת",
      email: "tamar.oren@example.com",
      phone: "050-0000000",
      location: "",
      website: "",
      linkedin: "",
      github: "",
    },
    summary:
      "אחות מוסמכת עם ניסיון במחלקה פנימית ובמרפאה בקהילה. רגועה במצבי לחץ, מדייקת בתיעוד ואוהבת ללמד מטופלים ומשפחות.",
    skills: skills([
      "ניטור מטופלים",
      "מתן תרופות ועירויים",
      "תיעוד ממוחשב",
      "הדרכת מטופלים",
      "החייאה מתקדמת (ALS)",
    ]),
    languages: [],
    hidden: ["projects", "certifications", "custom", "languages"],
    experience: [
      {
        id: "demo-he-exp-1",
        company: "מרכז רפואי לדוגמה",
        role: "אחות אחראית משמרת, מחלקה פנימית",
        location: "",
        start: "מרץ 2021",
        end: "הווה",
        current: true,
        bullets: [
          "אחריות על צוות של שש אחיות במשמרת ועל 32 מיטות",
          "חניכת אחיות חדשות בחודשי העבודה הראשונים",
          "הובלת נוהל חדש לקליטת מטופלים שקיצר את זמן הקליטה",
        ],
      },
      {
        id: "demo-he-exp-2",
        company: "מרפאה קהילתית לדוגמה",
        role: "אחות מרפאה",
        location: "",
        start: "אוק 2018",
        end: "פבר 2021",
        current: false,
        bullets: [
          "מעקב אחר מטופלים עם סוכרת ויתר לחץ דם",
          "מתן חיסונים ובדיקות שגרתיות",
          "הדרכה אישית וקבוצתית למטופלים",
        ],
      },
    ],
    education: [
      {
        id: "demo-he-ed-1",
        school: "אוניברסיטה לדוגמה",
        degree: "B.Sc בסיעוד",
        location: "",
        start: "2018",
        end: "2018",
        details: "",
      },
    ],
  },
];

export const SEED_IDS = new Set(SEED_RESUMES.map((r) => r.id));

// Earlier demo resumes, dropped from saved data so they don't linger next to the new ones.
export const RETIRED_SEED_IDS = new Set(["demo-en-2026", "demo-he-2026"]);
