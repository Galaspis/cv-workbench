import type { ReactNode } from "react";
import { SyncBadge } from "./SyncBadge";
import { useStore } from "../store";
import { Icon } from "./Icon";
import { Menu, useT, type MenuItem } from "./ui";

/** Breadcrumb, optional Content/Design tabs, save state and the Download button. */
export function EditorBar({
  title,
  tabs,
  downloads,
  more,
}: {
  title: string;
  tabs?: ReactNode;
  downloads: MenuItem[];
  more?: MenuItem[];
}) {
  const { setView } = useStore();
  const t = useT();
  return (
    <div className="editor-bar">
      <div className="editor-bar-start">
        <nav className="crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => setView({ page: "home" })}>
            {t.myDocs}
          </button>
          <span aria-hidden>/</span>
          <strong title={title}>{title}</strong>
        </nav>
        {tabs}
      </div>
      <div className="editor-bar-end">
        <SyncBadge />
        <span className="bar-sep" aria-hidden />
        {more?.length ? <Menu items={more} label={t.moreActions} /> : null}
        <Menu items={downloads} label={t.download} className="btn primary download-btn">
          <Icon name="download" size={18} />
          <span>{t.download}</span>
          <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Menu>
      </div>
    </div>
  );
}
