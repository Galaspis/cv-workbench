import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

const PAGE_W = 794;

// The A4 page scaled down to the width of its column, so it is never cut off (narrow
// windows, phones, right-to-left layouts).
export function PreviewFrame({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const cs = getComputedStyle(frame);
      const inner = frame.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (inner > 0) setZoom(Math.min(1, inner / PAGE_W));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div ref={frameRef} className={`preview-frame ${className ?? ""}`} {...rest}>
      <div className="preview-scale" style={{ zoom }}>
        {children}
      </div>
    </div>
  );
}
