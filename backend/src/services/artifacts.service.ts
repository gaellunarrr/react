// src/services/artifacts.service.ts
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import Exam from '../models/Exam';
import { examToHtml } from '../templates/exam-pdf.template';
import { headObject, putObject, presignGet } from './storage.service';

const URL_TTL = parseInt(process.env.ARTIFACT_URL_TTL_SECONDS || '900', 10);

export async function ensureExamArtifacts(examId: string) {
  const exam = await Exam.findById(examId).lean();
  if (!exam) {
    const err: any = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }

  const baseKey = `exams/${examId}/`;
  const xlsxKey = `${baseKey}examen.xlsx`;
  const pdfKey  = `${baseKey}examen.pdf`;

  // XLSX
  const hx = await headObject(xlsxKey);
  if (!hx.exists) {
    const xbuf = await buildExamXlsx(exam);
    await putObject(xlsxKey, xbuf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  const xUrl = await presignGet(xlsxKey, URL_TTL);

  // PDF
  const hp = await headObject(pdfKey);
  if (!hp.exists) {
    const pbuf = await buildExamPdf(exam);
    await putObject(pdfKey, pbuf, 'application/pdf');
  }
  const pUrl = await presignGet(pdfKey, URL_TTL);

  return [
    { type: 'xlsx', key: xlsxKey, url: xUrl },
    { type: 'pdf',  key: pdfKey,  url: pUrl  },
  ];
}

async function buildExamXlsx(exam: any): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Examen');

  ws.addRow(['Modalidad', exam.modalidad ?? '']);
  ws.addRow(['Duración (min)', exam.duracionMin ?? '']);
  ws.addRow(['Temas guía', (exam.temasGuia || []).join(', ')]);
  ws.addRow([]);
  ws.addRow(['Casos', exam.numeroCasos ?? 0]);

  (exam.casos || []).forEach((c: any, i: number) => {
    ws.addRow([]);
    ws.addRow([`Caso ${i + 1}`, c.nombre ?? '']);
    ws.addRow(['Aspecto', 'Ponderación']);
    (c.aspectos || []).forEach((a: any) => ws.addRow([a.nombre ?? '', a.ponderacion ?? '']));
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

async function buildExamPdf(exam: any): Promise<Buffer> {
  // Ajuste de compatibilidad: nada de 'new'. Usamos booleano.
  const headlessEnv = (process.env.PUPPETEER_HEADLESS ?? 'true').toLowerCase();
  const headless = headlessEnv === 'true'; // 'false' para ver el browser localmente
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  const browser = await puppeteer.launch({
    headless,                    // <- aquí el fix
    executablePath,              // opcional: útil en servidores
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=medium'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(examToHtml(exam), { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
