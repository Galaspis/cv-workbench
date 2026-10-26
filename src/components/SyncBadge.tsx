import { useStore } from "../store";
import { UI } from "../i18n";

/** Whether the documents are saved to the cloud, saving, or only on this device. */
export function SyncBadge() {
  const { sync, syncError, settings } = useStore();
  const t = UI[settings.uiLang];
  const label = {
    connecting: t.syncConnecting,
    synced: t.syncSaved,
    saving: t.syncSaving,
    offline: t.syncOffline,
    error: syncError || t.syncError,
  }[sync];
  return (
    <span className={`sync-badge ${sync}`} title={label}>
      <span className="sync-dot" aria-hidden>
        {sync === "synced" ? (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className="sync-label">{label}</span>
    </span>
  );
}
