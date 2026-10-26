// קורות icon set (from korot-brand-kit/icons). "tone" uses the two-colour brand version
// (slate + apricot); the default is the one-colour version that follows the text colour.

const MONO = import.meta.glob("../brand/icons/mono/*.svg", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;
const TONE = import.meta.glob("../brand/icons/*.svg", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

export type IconName =
  | "add"
  | "ai-rewrite"
  | "archive"
  | "check"
  | "delete"
  | "document"
  | "download"
  | "duplicate"
  | "edit"
  | "education"
  | "experience"
  | "filter"
  | "font"
  | "language"
  | "layout"
  | "link"
  | "more"
  | "palette"
  | "profile"
  | "search"
  | "skills"
  | "summary"
  | "undo"
  | "upload";

function inner(svg: string | undefined) {
  if (!svg) return "";
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

export function Icon({ name, size = 20, tone, className }: { name: IconName; size?: number; tone?: boolean; className?: string }) {
  const src = tone ? TONE[`../brand/icons/${name}.svg`] : MONO[`../brand/icons/mono/${name}.svg`];
  return (
    <svg
      className={`icon ${className ?? ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: inner(src) }}
    />
  );
}
