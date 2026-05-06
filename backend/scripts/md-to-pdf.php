<?php
/**
 * Converte ficheiros Markdown em PDF.
 * Uso:
 *   php scripts/md-to-pdf.php <input.md> <output.pdf> [<title>]
 */

require __DIR__ . "/../vendor/autoload.php";

use League\CommonMark\GithubFlavoredMarkdownConverter;

$inputMd  = $argv[1] ?? null;
$outputPdf = $argv[2] ?? null;
$title    = $argv[3] ?? "Documento";

if (!$inputMd || !$outputPdf || !file_exists($inputMd)) {
    fwrite(STDERR, "Uso: php scripts/md-to-pdf.php <input.md> <output.pdf> [<title>]\n");
    exit(1);
}

$md = file_get_contents($inputMd);

// Markdown → HTML (GFM: tabelas, autolink, etc.)
$converter = new GithubFlavoredMarkdownConverter([
    "allow_unsafe_links" => false,
    "html_input"         => "allow",
]);
$html = (string) $converter->convert($md);

// Wrapper com estilo
$page = <<<HTML
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>{$title}</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11pt; color: #1f2937; line-height: 1.55; }
  h1 { font-size: 22pt; color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin: 0 0 18px; page-break-after: avoid; }
  h2 { font-size: 15pt; color: #1e3a8a; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #c7d2fe; page-break-after: avoid; }
  h3 { font-size: 12pt; color: #1e293b; margin: 18px 0 6px; page-break-after: avoid; }
  h4 { font-size: 11pt; color: #334155; margin: 12px 0 4px; page-break-after: avoid; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px 22px; padding: 0; }
  li { margin-bottom: 4px; }
  code { font-family: 'Courier New', monospace; background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 10pt; color: #be123c; }
  pre { background: #0f172a; color: #e2e8f0; padding: 12px 14px; border-radius: 6px; font-size: 9.5pt; overflow-x: auto; margin: 10px 0; }
  pre code { background: transparent; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0 14px; font-size: 10pt; }
  th { background: #1e40af; color: #fff; padding: 7px 10px; text-align: left; font-weight: 600; }
  td { border-bottom: 1px solid #e5e7eb; padding: 6px 10px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  blockquote { border-left: 3px solid #f59e0b; background: #fefce8; padding: 8px 14px; margin: 10px 0; color: #78350f; font-size: 10.5pt; }
  hr { border: 0; border-top: 1px solid #cbd5e1; margin: 24px 0; }
  a { color: #1d4ed8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { color: #0f172a; }
  /* Não cortar tabelas no meio se possível */
  table, tr, blockquote, pre { page-break-inside: avoid; }
  /* Footer */
  .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #94a3b8; }
</style>
</head>
<body>
{$html}
</body>
</html>
HTML;

$tmpHtml = tempnam(sys_get_temp_dir(), "md2pdf_") . ".html";
file_put_contents($tmpHtml, $page);

// Render com wkhtmltopdf
$cmd = sprintf(
    "wkhtmltopdf --quiet --enable-local-file-access --encoding utf-8 --page-size A4 " .
    "--margin-top 22 --margin-bottom 22 --margin-left 18 --margin-right 18 " .
    "--footer-center 'Educajá  ·  página [page] de [topage]' --footer-font-size 8 --footer-spacing 5 " .
    "%s %s 2>&1",
    escapeshellarg($tmpHtml),
    escapeshellarg($outputPdf)
);

exec($cmd, $output, $code);
unlink($tmpHtml);

if ($code !== 0) {
    fwrite(STDERR, "Erro wkhtmltopdf (code $code):\n" . implode("\n", $output) . "\n");
    exit($code);
}

echo "✓ PDF gerado: $outputPdf (" . number_format(filesize($outputPdf) / 1024, 1) . " KB)\n";
