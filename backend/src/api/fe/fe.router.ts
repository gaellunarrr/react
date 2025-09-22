import { Router } from 'express';
import ExcelJS from 'exceljs';

const router = Router();

router.post('/generar', async (req, res, next) => {
  try {
    const now = new Date();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('FA');

    ws.addRow(['INEGI - FA']);
    ws.addRow(['Generado', now.toISOString()]);
    ws.addRow([]);
    ws.addRow(['Payload (preview)']);
    ws.addRow([JSON.stringify(req.body || {})]);

    const ab = await wb.xlsx.writeBuffer();
    const buf = Buffer.isBuffer(ab) ? ab : Buffer.from(ab as ArrayBuffer);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="FA_${now.toISOString().slice(0,10)}.xlsx"`);
    return res.send(buf);
  } catch (err) {
    next(err);
  }
});

export default router;
