import { StoreProvider, useStore } from "./store";
import { CoverEditor, Dashboard, ResignationEditor, SettingsPage } from "./pages/Home";
import { ResumeEditor } from "./pages/ResumeEditor";
import { UI } from "./i18n";
import { useEffect } from "react";
import "./index.css";

function Header() {
  const { view, setView, settings, setSettings } = useStore();
  const t = UI[settings.uiLang];
  const onDocs = view.page !== "settings";
  return (
    <header className="topbar">
      <button type="button" className="logo" onClick={() => setView({ page: "home" })} aria-label={t.myDocs}>
        <img src="/brand/korot-horizontal.svg" alt={t.brand} width={150} height={52} />
      </button>
      <nav className="topnav">
        <button type="button" className={onDocs ? "active" : ""} onClick={() => setView({ page: "home" })}>
          {t.myDocs}
        </button>
        <button
          type="button"
          className={view.page === "settings" ? "active" : ""}
          onClick={() => setView({ page: "settings" })}
        >
          {t.settings}
        </button>
      </nav>
      <div className="topbar-end">
        <div className="ui-lang" role="group" aria-label="Language">
          <button
            type="button"
            className={settings.uiLang === "he" ? "active" : ""}
            onClick={() => setSettings({ uiLang: "he" })}
            lang="he"
          >
            עברית
          </button>
          <span aria-hidden>/</span>
          <button
            type="button"
            className={settings.uiLang === "en" ? "active" : ""}
            onClick={() => setSettings({ uiLang: "en" })}
            lang="en"
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const { settings } = useStore();
  const dir = settings.uiLang === "he" ? "rtl" : "ltr";
  useEffect(() => {
    document.documentElement.lang = settings.uiLang;
    document.documentElement.dir = dir;
  }, [settings.uiLang, dir]);
  return (
    <div className="app-shell" dir={dir} lang={settings.uiLang}>
      <Header />
      <main className="workspace">
        <Page />
      </main>
    </div>
  );
}

function Page() {
  const { view, docs } = useStore();
  if (view.page === "settings") return <SettingsPage />;
  if (view.page === "resume") {
    const resume = docs.resumes.find((r) => r.id === view.id);
    return resume ? <ResumeEditor key={resume.id} resume={resume} intent={view.intent} /> : <Dashboard />;
  }
  if (view.page === "cover") {
    const letter = docs.covers.find((r) => r.id === view.id);
    return letter ? <CoverEditor letter={letter} /> : <Dashboard />;
  }
  if (view.page === "resignation") {
    const letter = docs.resignations.find((r) => r.id === view.id);
    return letter ? <ResignationEditor letter={letter} /> : <Dashboard />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
