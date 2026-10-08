import React from "react";

/** Tiny, safe Markdown renderer for Claude's answer: ## headings, - bullets, **bold**, *italic*, links. */
const hasArabic = (s: string) => /[؀-ۿ]/.test(s);
const mostlyArabic = (s: string) => (s.match(/[؀-ۿ]/g)?.length ?? 0) > s.replace(/\s/g, "").length * 0.3;

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|(?<![*\w])\*([^*\n]+)\*(?!\w)|_\(([^)]+)\)_|(https:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={k}>{m[2]}</em>);
    else if (m[3]) out.push(<em key={k}>({m[3]})</em>);
    else if (m[4])
      out.push(
        <a key={k} href={m[4]} target="_blank" rel="noopener noreferrer">
          {m[4]}
        </a>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const dir = (s: string) => (mostlyArabic(s) ? "rtl" : undefined);

  const flushPara = () => {
    if (!para.length) return;
    const t = para.join(" ");
    blocks.push(
      <p key={`p${blocks.length}`} className={dir(t)} dir={hasArabic(t) ? "auto" : undefined}>
        {inline(t, `p${blocks.length}`)}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    const allAr = list.every(mostlyArabic);
    blocks.push(
      <ul key={`u${blocks.length}`} className={allAr ? "rtl" : undefined}>
        {list.map((li, j) => (
          <li key={j} dir={hasArabic(li) ? "auto" : undefined}>
            {inline(li, `l${blocks.length}-${j}`)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const l = raw.trim();
    if (!l) {
      flushPara();
      flushList();
      continue;
    }
    const h = l.match(/^#{1,4}\s+(.*)/);
    if (h) {
      flushPara();
      flushList();
      blocks.push(
        <h2 key={`h${blocks.length}`} className={dir(h[1])}>
          {inline(h[1], `h${blocks.length}`)}
        </h2>,
      );
      continue;
    }
    const b = l.match(/^[-*•]\s+(.*)/);
    if (b) {
      flushPara();
      list.push(b[1]);
      continue;
    }
    flushList();
    para.push(l);
  }
  flushPara();
  flushList();
  return <>{blocks}</>;
}
