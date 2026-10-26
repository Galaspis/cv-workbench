import { useEffect, useRef, useState, type ReactNode } from "react";
import { UI } from "../i18n";
import { useStore } from "../store";
import { Icon, type IconName } from "./Icon";

export function useT() {
  const { settings } = useStore();
  return UI[settings.uiLang];
}

export function Field({
  label,
  value,
  onChange,
  area,
  placeholder,
  rows,
  max,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  placeholder?: string;
  rows?: number;
  max?: number;
  dir?: "ltr" | "rtl" | "auto";
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {area ? (
        <textarea value={value} rows={rows} placeholder={placeholder} dir={dir} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} placeholder={placeholder} dir={dir} onChange={(e) => onChange(e.target.value)} />
      )}
      {max ? (
        <span className={`field-count ${value.length > max ? "over" : ""}`}>
          {value.length}/{max}
        </span>
      ) : null}
    </label>
  );
}

export type MenuItem = { label: string; icon?: IconName; onClick: () => void; danger?: boolean };

/** A button that opens a small list of actions. Closes on outside click or Escape. */
export function Menu({
  items,
  label,
  icon = "more",
  className,
  children,
  align = "end",
}: {
  items: MenuItem[];
  label: string;
  icon?: IconName;
  className?: string;
  children?: ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className={`menu ${open ? "open" : ""}`} ref={ref}>
      <button
        type="button"
        className={className ?? "icon-btn"}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {children ?? <Icon name={icon} />}
      </button>
      {open ? (
        <div className={`menu-list align-${align}`} role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? "danger" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon ? <Icon name={item.icon} size={18} /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Underlined tabs, as in the brand mockups. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={`tabs ${className ?? ""}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          className={value === o.id ? "active" : ""}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "Suggested wording" box with Replace / Cancel, used for every AI rewrite. */
export function Suggestion({ text, onAccept, onCancel }: { text: string; onAccept: () => void; onCancel: () => void }) {
  const t = useT();
  return (
    <div className="suggestion">
      <p className="suggestion-label">{t.suggested}</p>
      <p className="suggestion-text">{text}</p>
      <div className="suggestion-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          {t.cancel}
        </button>
        <button type="button" className="btn primary" onClick={onAccept}>
          {t.replace}
        </button>
      </div>
    </div>
  );
}
