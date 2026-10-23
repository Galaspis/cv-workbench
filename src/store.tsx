import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, createCoverLetter, createResignation, createResume } from "./factory";
import { RETIRED_SEED_IDS, SEED_IDS, SEED_RESUMES } from "./data/seedResumes";
import { CloudConflict, CloudUnavailable, cloudStore } from "./lib/cloud";
import type {
  AppView,
  CoverLetter,
  ResignationLetter,
  Resume,
  Settings,
} from "./types";

const DOCS_KEY = "cvw.docs.v2";
const SETTINGS_KEY = "cvw.settings.v1";

type Docs = {
  resumes: Resume[];
  covers: CoverLetter[];
  resignations: ResignationLetter[];
};

export type SyncState = "connecting" | "synced" | "saving" | "offline" | "error";

type Store = {
  docs: Docs;
  sync: SyncState;
  syncError: string;
  settings: Settings;
  view: AppView;
  setView: (view: AppView) => void;
  setSettings: (patch: Partial<Settings>) => void;
  upsertResume: (resume: Resume) => void;
  upsertCover: (letter: CoverLetter) => void;
  upsertResignation: (letter: ResignationLetter) => void;
  remove: (kind: "resume" | "cover" | "resignation", id: string) => void;
  duplicateResume: (id: string) => void;
  newResume: () => void;
  newCover: (resumeId?: string) => void;
  newResignation: () => void;
  loadSample: () => void;
  reloadMyCvs: () => void;
  importBackup: (json: string) => void;
  exportBackup: () => string;
};

const Ctx = createContext<Store | null>(null);

function mergeSeeds(docs: Docs): Docs {
  const extras = docs.resumes.filter(
    (r) => !SEED_IDS.has(r.id) && !RETIRED_SEED_IDS.has(r.id) && !r.title.includes("Maya Ellison"),
  );
  const existingById = new Map(docs.resumes.map((r) => [r.id, r]));
  const seeded = SEED_RESUMES.map((seed) => existingById.get(seed.id) ?? seed);
  return { ...docs, resumes: [...seeded, ...extras] };
}

function normalize(d: Partial<Docs>): Docs {
  return { resumes: d.resumes ?? [], covers: d.covers ?? [], resignations: d.resignations ?? [] };
}

// Union of two copies by id; the newer edit wins. Used the first time a device syncs and after a
// save conflict, so nothing either side has is lost. Demo resumes prefer the server copy, because a
// fresh device stamps them with "now".
function mergeDocs(server: Docs, local: Docs): Docs {
  const pick = <T extends { id: string; updatedAt: number }>(a: T[], b: T[]) => {
    const byId = new Map(a.map((x) => [x.id, x]));
    for (const x of b) {
      const cur = byId.get(x.id);
      if (!cur || (x.updatedAt > cur.updatedAt && !SEED_IDS.has(x.id))) byId.set(x.id, x);
    }
    return [...byId.values()];
  };
  return {
    resumes: pick(server.resumes, local.resumes),
    covers: pick(server.covers, local.covers),
    resignations: pick(server.resignations, local.resignations),
  };
}

function loadDocs(): Docs {
  try {
    const raw = localStorage.getItem(DOCS_KEY) ?? localStorage.getItem("cvw.docs.v1");
    if (!raw) return mergeSeeds({ resumes: [], covers: [], resignations: [] });
    const parsed = JSON.parse(raw) as Docs;
    return mergeSeeds({
      resumes: parsed.resumes ?? [],
      covers: parsed.covers ?? [],
      resignations: parsed.resignations ?? [],
    });
  } catch {
    return mergeSeeds({ resumes: [], covers: [], resignations: [] });
  }
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<Docs>(loadDocs);
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [view, setView] = useState<AppView>({ page: "home" });

  // ---- sync with the hub document store, so the PC and the phone see the same CVs ----
  const cloud = useMemo(() => cloudStore("cv"), []);
  const [sync, setSync] = useState<SyncState>("connecting");
  const [syncError, setSyncError] = useState("");
  const docsRef = useRef(docs);
  docsRef.current = docs;
  const ready = useRef(false); // first pull finished, local edits may be pushed
  const fromServer = useRef(false); // next docs change came from the server, don't send it back
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const failed = (e: unknown) => {
    if (e instanceof CloudUnavailable) {
      setSync("offline");
      setSyncError("");
    } else {
      setSync("error");
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    }
  };

  const pull = async (attempt = 0): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { doc, version } = await cloud.load<Docs>();
      if (!doc || cloud.version === 0 || cloud.pending) {
        const merged = doc ? mergeSeeds(mergeDocs(normalize(doc), docsRef.current)) : docsRef.current;
        if (merged !== docsRef.current) {
          fromServer.current = true;
          setDocs(merged);
        }
        setSync("saving");
        await cloud.save(merged, version);
      } else if (version !== cloud.version) {
        fromServer.current = true;
        setDocs(mergeSeeds(normalize(doc)));
        cloud.accept(version);
      }
      ready.current = true;
      busy.current = false;
      setSync("synced");
      setSyncError("");
    } catch (e) {
      busy.current = false;
      if (e instanceof CloudConflict && attempt < 2) return pull(attempt + 1);
      failed(e);
    }
  };

  const push = async (): Promise<void> => {
    if (busy.current) {
      timer.current = window.setTimeout(() => void push(), 800);
      return;
    }
    busy.current = true;
    setSync("saving");
    try {
      await cloud.save(docsRef.current, cloud.version);
      busy.current = false;
      setSync("synced");
      setSyncError("");
    } catch (e) {
      busy.current = false;
      if (e instanceof CloudConflict) return pull();
      failed(e);
    }
  };

  useEffect(() => {
    void pull();
    const again = () => {
      if (document.visibilityState === "visible") void pull();
    };
    window.addEventListener("focus", again);
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", again);
    return () => {
      window.removeEventListener("focus", again);
      window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", again);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstRender = useRef(true);
  useEffect(() => {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (fromServer.current) {
      fromServer.current = false;
      return;
    }
    cloud.markPending();
    if (!ready.current) return; // the first pull will merge it in
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void push(), 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<Store>(() => {
    const touch = <T extends { updatedAt: number }>(item: T): T => ({
      ...item,
      updatedAt: Date.now(),
    });

    return {
      docs,
      sync,
      syncError,
      settings,
      view,
      setView,
      setSettings: (patch) =>
        setSettingsState((s) => ({
          ...s,
          ...patch,
          ...(patch.apiKey !== undefined ? { apiKey: patch.apiKey.trim().replace(/^Bearer\s+/i, "").replace(/^["']+|["']+$/g, "").replace(/\s+/g, "") } : {}),
          ...(patch.model !== undefined ? { model: patch.model.trim() } : {}),
          ...(patch.baseUrl !== undefined ? { baseUrl: patch.baseUrl.trim() } : {}),
        })),
      upsertResume: (resume) =>
        setDocs((d) => ({
          ...d,
          resumes: d.resumes.some((r) => r.id === resume.id)
            ? d.resumes.map((r) => (r.id === resume.id ? touch(resume) : r))
            : [touch(resume), ...d.resumes],
        })),
      upsertCover: (letter) =>
        setDocs((d) => ({
          ...d,
          covers: d.covers.some((r) => r.id === letter.id)
            ? d.covers.map((r) => (r.id === letter.id ? touch(letter) : r))
            : [touch(letter), ...d.covers],
        })),
      upsertResignation: (letter) =>
        setDocs((d) => ({
          ...d,
          resignations: d.resignations.some((r) => r.id === letter.id)
            ? d.resignations.map((r) => (r.id === letter.id ? touch(letter) : r))
            : [touch(letter), ...d.resignations],
        })),
      remove: (kind, id) =>
        setDocs((d) => {
          if (kind === "resume") return { ...d, resumes: d.resumes.filter((r) => r.id !== id) };
          if (kind === "cover") return { ...d, covers: d.covers.filter((r) => r.id !== id) };
          return { ...d, resignations: d.resignations.filter((r) => r.id !== id) };
        }),
      duplicateResume: (id) => {
        const src = docs.resumes.find((r) => r.id === id);
        if (!src) return;
        const copy = {
          ...structuredClone(src),
          id: crypto.randomUUID(),
          title: `${src.title} copy`,
          updatedAt: Date.now(),
        };
        setDocs((d) => ({ ...d, resumes: [copy, ...d.resumes] }));
        setView({ page: "resume", id: copy.id });
      },
      newResume: () => {
        const resume = createResume();
        setDocs((d) => ({ ...d, resumes: [resume, ...d.resumes] }));
        setView({ page: "resume", id: resume.id });
      },
      newCover: (resumeId) => {
        const letter = createCoverLetter(resumeId ?? docs.resumes[0]?.id ?? "");
        setDocs((d) => ({ ...d, covers: [letter, ...d.covers] }));
        setView({ page: "cover", id: letter.id });
      },
      newResignation: () => {
        const letter = createResignation();
        setDocs((d) => ({ ...d, resignations: [letter, ...d.resignations] }));
        setView({ page: "resignation", id: letter.id });
      },
      loadSample: () => {
        setDocs((d) => mergeSeeds(d));
      },
      reloadMyCvs: () => {
        setDocs((d) => ({
          ...d,
          resumes: [
            ...SEED_RESUMES,
            ...d.resumes.filter((r) => !SEED_IDS.has(r.id) && !RETIRED_SEED_IDS.has(r.id) && !r.title.includes("Maya Ellison")),
          ],
        }));
      },
      importBackup: (json) => {
        const parsed = JSON.parse(json) as Partial<Docs>;
        setDocs({
          resumes: parsed.resumes ?? [],
          covers: parsed.covers ?? [],
          resignations: parsed.resignations ?? [],
        });
      },
      exportBackup: () => JSON.stringify(docs, null, 2),
    };
  }, [docs, settings, view, sync, syncError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Store missing");
  return ctx;
}
