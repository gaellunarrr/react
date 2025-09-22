// src/templates/exam-pdf.template.ts
type Aspecto = { nombre: string; ponderacion: number };
type Caso = { nombre: string; aspectos: Aspecto[] };

export function examToHtml(exam: any) {
  const temas = (exam.temasGuia || []).map((t: string) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
  const casos = (exam.casos || []).map((c: Caso, i: number) => `
    <section class="case">
      <h3>Caso ${i + 1}: ${escapeHtml(c.nombre)}</h3>
      <table>
        <thead><tr><th>Aspecto</th><th>Ponderación</th></tr></thead>
        <tbody>
          ${c.aspectos.map(a => `
            <tr>
              <td>${escapeHtml(a.nombre)}</td>
              <td>${a.ponderacion}%</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </section>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Examen ${exam._id}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 28px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 18px; margin: 20px 0 8px; }
    h3 { font-size: 16px; margin: 14px 0 8px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 18px; }
    .chip { display:inline-block; padding:2px 8px; border:1px solid #ddd; border-radius:12px; margin-right:6px; font-size:11px; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
    th { background: #f9fafb; text-align: left; }
    .row { margin: 6px 0; }
    .case { page-break-inside: avoid; margin-bottom: 14px; }
  </style>
</head>
<body>
  <h1>Examen</h1>
  <div class="meta">ID: ${escapeHtml(String(exam._id))} &middot; Plaza: ${escapeHtml(String(exam.plazaId))}</div>

  <div class="row"><strong>Modalidad:</strong> ${escapeHtml(exam.modalidad)}</div>
  <div class="row"><strong>Duración (min):</strong> ${exam.duracionMin}</div>
  <div class="row"><strong>Temas guía:</strong> ${temas || '<em>Sin temas</em>'}</div>

  <h2>Casos (${exam.numeroCasos})</h2>
  ${casos}
</body>
</html>`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
