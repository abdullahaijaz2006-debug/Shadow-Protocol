// A tiny, safe text format for tutorial content (no HTML): paragraphs separated by blank lines,
// and inline **bold**, *italic*, `code` and $math$. Pure TypeScript.

export type InlineToken =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "bold"; readonly text: string }
  | { readonly kind: "italic"; readonly text: string }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "math"; readonly text: string };

const PATTERN = /\*\*(.+?)\*\*|`(.+?)`|\$(.+?)\$|\*(.+?)\*/g;

/** Splits one paragraph into styled runs. Unmatched markers are kept as plain text. */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) tokens.push({ kind: "bold", text: match[1] });
    else if (match[2] !== undefined) tokens.push({ kind: "code", text: match[2] });
    else if (match[3] !== undefined) tokens.push({ kind: "math", text: match[3] });
    else tokens.push({ kind: "italic", text: match[4] });
    last = index + match[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", text: text.slice(last) });
  return tokens;
}

/** Paragraphs of a text block (blank-line separated, trimmed, empty ones dropped). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);
}
