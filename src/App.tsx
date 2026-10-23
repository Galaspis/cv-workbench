import { StoreProvider, useStore } from "./store";
import { CoverEditor, Dashboard, ResignationEditor, SettingsPage } from "./pages/Home";
import { ResumeEditor } from "./pages/ResumeEditor";
import { UI } from "./i18n";
import "./index.css";

function Shell() {
  const { view, setView, settings, setSettings, sync, syncError } = useStore();
  const t = UI[settings.uiLang];
  const he = settings.uiLang === "he";
  const syncLabel = {
    connecting: he ? "מתחבר…" : "Connecting…",
    synced: he ? "נשמר בענן" : "Saved to cloud",
    saving: he ? "שומר…" : "Saving…",
    offline: he ? "שמור במכשיר הזה בלבד" : "Saved on this device only",
    error: syncError || (he ? "שגיאת סנכרון" : "Sync error"),
  }[sync];
  return (
    <div className="app-shell" dir={settings.uiLang === "he" ? "rtl" : "ltr"} lang={settings.uiLang}>
      <nav className="nav">
        <div className="brand">
          <div className="mark" aria-hidden>
            CV
          </div>
          <div>
            <h1>{t.brand}</h1>
            <small>{t.studio}</small>
          </div>
        </div>
        <div className="lang-switch">
          <button
            className={settings.uiLang === "en" ? "active" : ""}
            onClick={() => setSettings({ uiLang: "en" })}
          >
            EN
          </button>
          <button
            className={settings.uiLang === "he" ? "active" : ""}
            onClick={() => setSettings({ uiLang: "he" })}
          >
            עברית
          </button>
        </div>
        <p className={`sync-state ${sync}`} title={syncLabel}>
          {syncLabel}
        </p>
        <button className={view.page === "home" ? "active" : ""} onClick={() => setView({ page: "home" })}>
          {t.documents}
        </button>
        <button className={view.page === "settings" ? "active" : ""} onClick={() => setView({ page: "settings" })}>
          {t.settings}
        </button>
        <div className="spacer" />
        <p className="hint">{t.hint}</p>
      </nav>
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
    return resume ? <ResumeEditor resume={resume} /> : <Dashboard />;
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
