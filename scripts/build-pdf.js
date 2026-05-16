#!/usr/bin/env node
/**
 * Converte docs/GUIA_ADMIN_GOLFINHO.md → HTML standalone (com imagens em base64)
 * Output: /tmp/guia-admin-golfinho.html
 *
 * Depois usa-se wkhtmltopdf para gerar o PDF final.
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const DOCS = path.resolve(__dirname, '..', 'docs');
const MD_NAME = process.env.SOURCE_MD || 'GUIA_ADMIN_GOLFINHO.md';
const HTML_NAME = process.env.OUTPUT_HTML || '/tmp/guia-admin-golfinho.html';
const MD = path.join(DOCS, MD_NAME);
const HTML_OUT = HTML_NAME;

let md = fs.readFileSync(MD, 'utf8');

// Strip YAML frontmatter
md = md.replace(/^---[\s\S]*?---\s*\n/, '');

// Inline images as data URIs so wkhtmltopdf renders without network
md = md.replace(/!\[([^\]]*)\]\(img\/([^)]+)\)/g, (_, alt, file) => {
  const p = path.join(DOCS, 'img', file);
  if (!fs.existsSync(p)) return `![${alt}](MISSING: ${file})`;
  const b64 = fs.readFileSync(p).toString('base64');
  return `![${alt}](data:image/png;base64,${b64})`;
});

const body = marked.parse(md, { gfm: true, breaks: false });

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<title>Guia do Administrador — Colégio Golfinho</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1f2937; line-height: 1.55; font-size: 10.5pt; }
  h1 { color: #1e3a8a; font-size: 22pt; border-bottom: 3px solid #1e3a8a; padding-bottom: 6px; margin-top: 0; }
  h2 { color: #1e40af; font-size: 16pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-top: 28px; page-break-after: avoid; }
  h3 { color: #1e40af; font-size: 12.5pt; margin-top: 20px; page-break-after: avoid; }
  h4 { color: #334155; font-size: 11pt; margin-top: 14px; }
  p, li { font-size: 10.5pt; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 9.5pt; color: #be185d; }
  pre { background: #0f172a; color: #f8fafc; padding: 10px 12px; border-radius: 6px; font-size: 9pt; overflow-x: auto; page-break-inside: avoid; }
  pre code { background: transparent; color: inherit; padding: 0; }
  blockquote { border-left: 4px solid #3b82f6; background: #eff6ff; margin: 10px 0; padding: 8px 14px; color: #1e3a8a; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #1e3a8a; color: #fff; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  img { max-width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 4px; margin: 8px 0; page-break-inside: avoid; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  a { color: #1d4ed8; text-decoration: none; }
  ul, ol { padding-left: 22px; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 24px 0; }
  /* keep image+caption together */
  p img + em, p > img { page-break-inside: avoid; }
</style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync(HTML_OUT, html);
console.log(`✓ HTML written: ${HTML_OUT} (${(html.length/1024).toFixed(0)} KB)`);
