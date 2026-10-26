import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { exportPreviewPdf } from "../lib/export";
import type { UiLang } from "../i18n";
import { useStore } from "../store";
import { Icon } from "./Icon";
import { Menu, useT, type MenuItem } from "./ui";

const PAGE_W = 794;

export function relativeTime(ts: number, lang: UiLang, justNow: string) {
  const diff = (ts - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return justNow;
  const rtf = new Intl.RelativeTimeFormat(lang === "he" ? "he" : "en", { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
    [Infinity, "year"],
  ];
  const sizes: Record<string, number> = { minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
  const [, unit] = steps.find(([limit]) => abs < limit)!;
  return rtf.format(Math.round(diff / sizes[unit]), unit);
}

/** The A4 page scaled to the width of the card. */
function Thumb({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.3);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => el.clientWidth && setZoom(el.clientWidth / PAGE_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);
  return (
    <div className="thumb-page" ref={ref}>
      <div className="thumb-scale" style={{ zoom }}>
        {children}
      </div>
    </div>
  );
}

export function GalleryCard({
  title,
  badge,
  updatedAt,
  onOpen,
  items,
  children,
}: {
  title: string;
  badge: string;
  updatedAt: number;
  onOpen: () => void;
  items: (pdf: () => void) => MenuItem[];
  children: ReactNode;
}) {
  const t = useT();
  const lang = useStore().settings.uiLang;
  const pageRef = useRef<HTMLDivElement>(null);

  const pdf = () => {
    const page = pageRef.current?.querySelector(".cv-page") as HTMLElement | null;
    if (page) void exportPreviewPdf(page, title);
  };

  return (
    <article className="gallery-card">
      <div className="gallery-thumb" ref={pageRef}>
        <button type="button" className="gallery-open" onClick={onOpen} aria-label={`${t.continueEdit}: ${title}`}>
          <Thumb>{children}</Thumb>
        </button>
        <button type="button" className="btn primary continue" onClick={onOpen} tabIndex={-1}>
          <Icon name="edit" size={18} />
          {t.continueEdit}
        </button>
      </div>
      <div className="gallery-meta">
        <h3 title={title}>{title}</h3>
        <Menu items={items(pdf)} label={t.moreActions} />
      </div>
      <p className="gallery-sub">
        <span className="badge">{badge}</span>
        <span>
          {t.edited} {relativeTime(updatedAt, lang, t.justNow)}
        </span>
      </p>
    </article>
  );
}
