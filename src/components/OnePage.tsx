import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

function contentBoxHeight(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  return Math.max(0, el.clientHeight - pad);
}

export function OnePage({
  children,
  className,
  dir,
  lang,
  style,
}: {
  children: ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
  lang?: string;
  style?: CSSProperties;
}) {
  const outerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const apply = () => {
      inner.style.zoom = "1";
      inner.style.transform = "none";
      inner.style.width = "100%";
      const available = contentBoxHeight(outer);
      const needed = inner.scrollHeight;
      const scale = needed > 0 ? Math.min(1, available / needed) : 1;
      inner.style.zoom = String(scale);
      outer.dataset.cvScale = String(scale);
    };

    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(inner);
    ro.observe(outer);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  });

  return (
    <article
      ref={outerRef}
      className={`cv-page cv-onepage ${className ?? ""}`}
      dir={dir}
      lang={lang}
      style={style}
    >
      <div ref={innerRef} className="cv-fit-inner">
        {children}
      </div>
    </article>
  );
}
