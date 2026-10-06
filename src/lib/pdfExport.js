// Export results to PDF using the browser's print engine (handles Sinhala text
// perfectly). A print dialog opens — choose "Save as PDF" as the destination.
const esc = (v) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export function exportResultsPdf(scored, { maxScore, totalQ }) {
  const rows = [...scored].sort((a, b) => b.score - a.score)
  const submitted = rows.filter((r) => r.sub.status === 'submitted').length
  const body = rows
    .map(
      ({ sub, score, rawScore, bonus, answered }, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(sub.name)}</td>
        <td>${esc(sub.school)}</td>
        <td>${esc(sub.grade)}</td>
        <td>${sub.lang === 'en' ? 'EN' : 'SI'}</td>
        <td class="n"><b>${score}</b></td>
        <td class="n">${rawScore}</td>
        <td class="n">${bonus}</td>
        <td class="n">${answered}/${totalQ}</td>
        <td class="n">${sub.violationCount || 0}</td>
        <td>${esc(sub.status)}${sub.autoSubmitted ? ' (auto)' : ''}</td>
      </tr>`
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>DEMETER 26 - Round 2 Results</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: 'Noto Sans Sinhala','Iskoola Pota',Arial,sans-serif; color:#111; font-size:11px; }
  h1 { margin:0 0 2px; font-size:20px; } p { margin:0 0 10px; color:#444; }
  table { width:100%; border-collapse:collapse; }
  th,td { border:1px solid #bbb; padding:4px 6px; text-align:left; vertical-align:top; }
  th { background:#e8eef0; } td.n { text-align:right; }
  tr { page-break-inside:avoid; } thead { display:table-header-group; }
</style></head><body>
<h1>DEMETER 26' — Round 2 Results</h1>
<p>Generated ${new Date().toLocaleString()} · ${rows.length} participants (${submitted} submitted) · Max score ${maxScore}</p>
<table><thead><tr><th>#</th><th>Name</th><th>School</th><th>Grade</th><th>Medium</th><th>Score</th><th>Raw</th><th>Bonus</th><th>Answered</th><th>Violations</th><th>Status</th></tr></thead>
<tbody>${body}</tbody></table></body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()
  const go = () => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => iframe.remove(), 60000)
  }
  setTimeout(go, 300)
}
