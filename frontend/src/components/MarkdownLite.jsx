/**
 * Renderer markdown minimalista (sem dependências).
 * Suporta: # H1, ## H2, ### H3, **bold**, *italic*, listas (1./-), --- HR,
 * `inline code`, parágrafos, links [text](url).
 */
function escape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s) {
  return escape(s)
    .replace(/`([^`]+?)`/g, '<code class="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" class="text-blue-700 hover:underline" target="_blank" rel="noopener">$1</a>');
}

export default function MarkdownLite({ source = "" }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let buf = [];
  let mode = null;

  function flush() {
    if (buf.length === 0) return;
    if (mode === "ul") {
      out.push(`<ul class="list-disc pl-6 my-3 space-y-1 text-slate-700">${buf.map(b => `<li>${inline(b)}</li>`).join("")}</ul>`);
    } else if (mode === "ol") {
      out.push(`<ol class="list-decimal pl-6 my-3 space-y-1 text-slate-700">${buf.map(b => `<li>${inline(b)}</li>`).join("")}</ol>`);
    } else if (mode === "p") {
      out.push(`<p class="my-3 leading-relaxed text-slate-700">${buf.map(b => inline(b)).join("<br/>")}</p>`);
    }
    buf = [];
    mode = null;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === "" || line === "---") {
      flush();
      if (line === "---") out.push('<hr class="my-6 border-slate-200" />');
      continue;
    }

    let m;
    if ((m = line.match(/^### (.+)$/))) { flush(); out.push(`<h3 class="text-lg font-bold text-slate-800 mt-6 mb-2">${inline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^## (.+)$/)))  { flush(); out.push(`<h2 class="text-xl font-extrabold text-slate-900 mt-8 mb-3 pb-1 border-b border-slate-100">${inline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^# (.+)$/)))   { flush(); out.push(`<h1 class="text-3xl font-extrabold text-slate-900 mt-2 mb-4">${inline(m[1])}</h1>`); continue; }

    if ((m = line.match(/^[-*] (.+)$/))) {
      if (mode !== "ul") { flush(); mode = "ul"; }
      buf.push(m[1]);
      continue;
    }
    if ((m = line.match(/^\d+\.\s+(.+)$/))) {
      if (mode !== "ol") { flush(); mode = "ol"; }
      buf.push(m[1]);
      continue;
    }

    if (mode === "p") buf.push(line);
    else { flush(); mode = "p"; buf.push(line); }
  }
  flush();

  return <div className="markdown-lite" dangerouslySetInnerHTML={{ __html: out.join("\n") }} />;
}
